import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { pathToFileURL, fileURLToPath } from 'url';
import ejs from 'ejs';
import lint from 'ejs-lint';
import { z } from 'zod';
import * as esbuild from 'esbuild';
import { transform as transformCss } from 'lightningcss';
import { processComponents } from './components.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {string} */
const srcDir = path.resolve(__dirname, '../src');
/** @type {string} */
const distDir = path.resolve(__dirname, '../dist');
const staticDir = path.resolve(__dirname, '../static');

const importCache = new Map();

/**
 * Imports a module with caching.
 * @param {string} modulePath - The path to the module.
 * @returns {Promise<any>}
 */
async function importWithCache(modulePath) {
    const url = pathToFileURL(modulePath).href;
    const cacheKey = `${url}`; // No timestamp for schemas
    if (importCache.has(cacheKey)) {
        return importCache.get(cacheKey);
    }
    const module = await import(cacheKey);
    importCache.set(cacheKey, module);
    return module;
}

/** @type {string} */
const componentsDir = path.join(srcDir, 'lib', 'components');

/**
 * Main build function.
 * @returns {Promise<void>}
 */
async function build() {
    console.log('Starting build...');

    try {
        // 1. Clean and create the dist directory
        await fs.emptyDir(distDir);

        // 2. Copy static assets and bundle JS
        await fs.copy(staticDir, distDir);
        await esbuild.build({
            entryPoints: [path.join(srcDir, 'lib', 'runtime.js')],
            outfile: path.join(distDir, 'main.js'),
            bundle: true,
            minify: true,
            sourcemap: 'inline',
        });
        console.log('✓ Static assets copied and JS bundled');

        // 3. Build route manifest
        const manifest = await buildRouteManifest();
        await fs.writeJson(path.join(distDir, 'manifest.json'), manifest, { spaces: 2 });
        console.log('✓ Route manifest generated');

        // 4. Build all static pages
        await buildPages(manifest);
        console.log('✓ All pages built');

        console.log('\nBuild complete! Output is in the /dist directory.');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

/**
 * Builds the route manifest from the `src/routes` directory.
 * @returns {Promise<{routes: import('../src/lib/types.js').Route[]}>}
 */
async function buildRouteManifest() {
    const routesDir = path.join(srcDir, 'routes');
    const pageFiles = await glob('**/+page.html', { cwd: routesDir });
    const manifest = { routes: [] };

    for (const pageFile of pageFiles) {
        const dir = path.dirname(pageFile);
        const routePath = dir === '.' ? '/' : `/${dir.replace(/\\/g, '/')}`;

        const paramKeys = [];
        const regexPath = routePath.replace(/\/\[([^\]]+)\]/g, (_, key) => {
            paramKeys.push(key);
            return '/([^/]+)';
        });

        const layoutPath = await findLayout(dir, routesDir);
        const pageJsPath = path.join(routesDir, dir, '+page.js');
        const schemaPath = path.join(routesDir, dir, '+schema.js');

        manifest.routes.push({
            path: routePath,
            regex: `^${regexPath}$`,
            paramKeys,
            page: path.join(routesDir, pageFile),
            layout: layoutPath,
            js: (await fs.pathExists(pageJsPath)) ? pageJsPath : null,
            schema: (await fs.pathExists(schemaPath)) ? schemaPath : null,
        });
    }

    // Sort routes to prioritize static routes over dynamic ones
    manifest.routes.sort((a, b) => a.paramKeys.length - b.paramKeys.length);

    return manifest;
}

/**
 * Finds the correct layout for a given page directory.
 * @param {string} pageDir
 * @param {string} routesDir
 * @returns {Promise<string>}
 */
async function findLayout(pageDir, routesDir) {
    let currentDir = pageDir;
    while (true) {
        const layoutPath = path.join(routesDir, currentDir, '+layout.html');
        if (await fs.pathExists(layoutPath)) {
            return layoutPath;
        }
        if (path.resolve(routesDir, currentDir) === routesDir) {
            throw new Error(`Could not find a layout for ${pageDir}`);
        }
        currentDir = path.dirname(currentDir);
    }
}

/**
 * Builds all static pages from the manifest.
 * @param {{routes: import('../src/lib/types.js').Route[]}} manifest
 * @returns {Promise<void>}
 */
async function buildPages(manifest) {
    const appTemplatePath = path.join(srcDir, 'app.html');
    const appTemplate = await fs.readFile(appTemplatePath, 'utf-8');

    // Load global data once
    const globalDataPath = path.join(srcDir, 'data.js');
    const globalData = (await fs.pathExists(globalDataPath)) ? (await importWithCache(globalDataPath)).default : {};

    for (const route of manifest.routes) {
        // Check for dynamic routes that need getStaticPaths
        if (route.paramKeys.length > 0) {
            if (!route.js || !(await fs.pathExists(route.js))) {
                console.warn(`Skipping dynamic route: ${route.path} (no +page.js file found)`);
                continue;
            }
            const pageModule = await importWithCache(route.js);
            if (!pageModule.getStaticPaths) {
                console.warn(`Skipping dynamic route: ${route.path} (no getStaticPaths export found)`);
                continue;
            }

            const paths = await pageModule.getStaticPaths();
            for (const { params, props } of paths) {
                await buildPage(route, appTemplate, { params, props, globalData });
            }
        } else {
            // Handle static routes
            await buildPage(route, appTemplate, { params: {}, props: {}, globalData });
        }
    }
}

/**
 * Builds a single page.
 * @param {import('../src/lib/types.js').Route} route
 * @param {string} appTemplate
 * @param {{params: Record<string, string>, props: Record<string, any>, globalData: Record<string, any>}} [options]
 * @returns {Promise<void>}
 */
async function buildPage(route, appTemplate, options) {
    const { params = {}, props = {}, globalData = {} } = options || {};
    const routePath = route.paramKeys.reduce((p, key) => p.replace(`[${key}]`, params[key]), route.path);

    console.log(`+ Building page: ${routePath}`);

    const rawPageContent = await fs.readFile(route.page, 'utf-8');
    const rawLayoutContent = await fs.readFile(route.layout, 'utf-8');

    const { html: processedPage, css: pageCss } = await preprocessHtml(rawPageContent);
    const { html: processedLayout, css: layoutCss } = await preprocessHtml(rawLayoutContent);

    const combinedCss = layoutCss + '\n' + pageCss;

    // 4. Load data and validate schema
    let pageData = { page: { params }, showExtra: route.path === '/', ...globalData, ...props };
    if (route.js && await fs.pathExists(route.js)) {
        const module = await importWithCache(route.js);
        if (module.load && typeof module.load === 'function') {
            const loadedData = await module.load({ params });

            // Validate loaded data against schema if it exists
            const schemaPath = route.js.replace('+page.js', '+schema.js');
            if (await fs.pathExists(schemaPath)) {
                try {
                    const schemaModule = await importWithCache(schemaPath);
                    if (schemaModule.schema) {
                        console.log(`  \u2514 Validating data for: ${routePath}`);
                        schemaModule.schema.parse(loadedData);
                    }
                } catch (error) {
                    console.error(`\n\u274c Schema validation failed for ${routePath}`);
                    if (error instanceof z.ZodError) {
                        console.error(error.issues.map(e => `  - Path: ${e.path.join('.')} | Message: ${e.message}`).join('\n'));
                    } else {
                        console.error(error);
                    }
                    process.exit(1);
                }
            }

            // Spread loaded data into the page data
            pageData = { ...pageData, ...loadedData };
        }
    }

    // 2. Validate data against schema if it exists
    if (route.schema) {
        try {
            const schemaModule = await importWithCache(route.schema);
            if (schemaModule.schema) {
                schemaModule.schema.parse(pageData);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error(`❌ Data validation failed for ${route.path}`);
                console.error(error.flatten());
            } else {
                console.error(`An unexpected error occurred during schema validation for ${route.path}`);
                console.error(error);
            }
            throw new Error(`Schema validation failed for ${route.path}`);
        }
    }

    // 5. Lint templates
    const lintOptions = { await: true, ...pageData };
    const pageLintError = lint(processedPage, lintOptions);
    if (pageLintError) {
        console.error(`EJS Lint Error in ${route.page}:`);
        throw pageLintError;
    }
    const layoutLintError = lint(processedLayout, { body: '', ...lintOptions });
    if (layoutLintError) {
        console.error(`EJS Lint Error in ${route.layout}:`);
        throw layoutLintError;
    }

        let pageRender;
        try {
            const renderData = { props: {}, ...pageData };
            pageRender = await ejs.render(processedPage, renderData, { async: true, root: componentsDir, filename: route.page });
        } catch (error) {
            console.error(`\n❌ EJS render error in page: ${route.page}`);
            // Avoid circular references when stringifying data
            const safeData = JSON.parse(JSON.stringify(pageData, (key, value) => 
                (key === 'props' && typeof value === 'object' && value !== null) ? Object.keys(value) : value
            ));
            console.error(`  Data available: ${JSON.stringify(safeData, null, 2)}`);
            throw error;
        }

        // Render the layout with the page content as the body
        let layoutRender;
        try {
            const layoutData = { body: pageRender, ...pageData };
            layoutRender = await ejs.render(processedLayout, layoutData, { async: true, root: componentsDir, filename: route.layout });
        } catch (error) {
            console.error(`\n❌ EJS render error in layout: ${route.layout}`);
            throw error;
        }

        // Minify the combined CSS
        const { code: minifiedCss } = transformCss({
            filename: 'style.css', // virtual filename
            code: Buffer.from(combinedCss),
            minify: true,
            sourceMap: false,
        });

        const headContent = `<style>${minifiedCss.toString()}</style>`;
        const finalHtml = appTemplate.replace('%body%', layoutRender).replace('%head%', headContent);

        const outputPath = path.join(distDir, routePath === '/' ? 'index.html' : path.join(routePath.slice(1), 'index.html'));
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, finalHtml);
}

/**
 * Pre-processes HTML to convert custom component tags to EJS includes and extract styles.
 * @param {string} content
 * @returns {Promise<{html: string, css: string}>}
 */
export async function preprocessHtml(content) {
    // 1. Process all components recursively.
    // This resolves all <Component:...> tags, props, and slots, and extracts their CSS.
    const { html: componentProcessedHtml, css: componentCss } = await processComponents(content);

    let processedHtml = componentProcessedHtml;
    let accumulatedCss = componentCss;

    // 2. Extract any remaining top-level styles from the page itself.
    const styleRegex = /<style>([\s\S]*?)<\/style>/g;
    processedHtml = processedHtml.replace(styleRegex, (match, css) => {
        accumulatedCss += css;
        return ''; // Remove the style tag from the HTML
    });

    // 3. Convert all custom template tags to EJS tags.
    // IMPORTANT: This happens *after* components are processed.

    // Convert {{#each ... as ...}} and {{/each}} to EJS tags
    processedHtml = processedHtml.replace(/\{\{\s*#each\s+(.*?)\s+as\s+(.*?)\s*\}\}/g, (_, list, item) => `<% ${list.trim()}.forEach((${item.trim()}) => { %>`);
    processedHtml = processedHtml.replace(/\{\{\s*\/each\s*\}\}/g, '<% }); %>');

    // Convert {{#if ...}} and {{/if}} to EJS tags for control flow
    processedHtml = processedHtml.replace(/\{\{\s*#if\s+(.*?)\s*\}\}/g, (_, condition) => `<% if (${condition.trim()}) { %>`);
    processedHtml = processedHtml.replace(/\{\{\s*\/if\s*\}\}/g, '<% } %>');

    // Convert {{...}} to EJS tags for expressions (must be last)
    processedHtml = processedHtml.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expression) => `<%- ${expression.trim()} %>`);

    return { html: processedHtml, css: accumulatedCss };
}

build();
