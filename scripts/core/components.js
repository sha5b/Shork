import fs from 'fs-extra';
import path from 'path';
import { parse } from 'node-html-parser';
import config from '../../shork.config.js';

const componentCache = new Map();

/**
 * Recursively processes component tags in HTML content.
 * @param {string} html - The HTML content to process.
 * @returns {Promise<{html: string, css: string, js: string}>}
 */
export async function processComponents(html) {
    const root = parse(html);
    const componentNodes = root.querySelectorAll('*').filter(n => n.tagName.toLowerCase().startsWith('shork-'));

    if (componentNodes.length === 0) {
        return { html, css: '', js: '' };
    }

    let accumulatedCss = '';
    let accumulatedJs = '';

    for (const node of componentNodes) {
        const tagName = node.tagName.toLowerCase();
        const componentName = tagName.slice('shork-'.length).charAt(0).toUpperCase() + tagName.slice('shork-'.length + 1);
        if (!componentName) continue;

        // 1. Get component content from cache or file
        let componentData = componentCache.get(componentName);
        if (!componentData) {
            const componentPath = path.join(config.componentsDir, `${componentName}.html`);
            if (!(await fs.pathExists(componentPath))) {
                console.warn(`Component not found: ${componentName}`);
                node.remove();
                continue;
            }
            const rawContent = await fs.readFile(componentPath, 'utf-8');
            const componentRoot = parse(rawContent);

            // Extract and remove style
            const styleNode = componentRoot.querySelector('style');
            const componentCss = styleNode ? styleNode.innerHTML : '';
            if (styleNode) styleNode.remove();

            // Extract and remove script
            const scriptNode = componentRoot.querySelector('script');
            const componentJs = scriptNode ? scriptNode.innerHTML : '';
            if (scriptNode) scriptNode.remove();

            componentData = {
                html: componentRoot.innerHTML.trim(),
                css: componentCss,
                js: componentJs
            };
            componentCache.set(componentName, componentData);
        }

        const componentId = `shork-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // 2. Scope CSS
        if (componentData.css) {
            // A more robust regex that targets selectors outside of curly braces.
            // This prevents the scoping attribute from being added to CSS properties.
            const scopedCss = componentData.css.replace(/(^|\s*)([^{}\s][^{}]*?)(?=\s*\{)/g, (match, prefix, selector) => {
                // Don't scope @-rules like @keyframes or @media
                if (selector.trim().startsWith('@')) {
                    return match;
                }
                const scopedSelector = selector.split(',').map(part => `[data-shork-id="${componentId}"] ${part.trim()}`).join(', ');
                return `${prefix}${scopedSelector}`;
            });
            accumulatedCss += scopedCss;
        }

        // 3. Get props from attributes
        const props = { ...node.attributes };

        // 4. Handle slot content by recursively processing it first
        const slotContent = node.innerHTML || '';
        const recursiveResult = await processComponents(slotContent);
        accumulatedCss += recursiveResult.css;
        accumulatedJs += recursiveResult.js;

        // 5. Replace placeholders in the component's HTML
        let finalHtml = componentData.html;
        for (const [key, value] of Object.entries(props)) {
            finalHtml = finalHtml.replace(new RegExp(`\\{\\{\\s*props.${key}\\s*\\}\\}`, 'g'), value);
        }
        finalHtml = finalHtml.replace(/\{\{\s*slot\s*\}\}/g, recursiveResult.html);

        // 6. Add component ID and prepare for hydration
        const componentWrapper = parse(`<div data-shork-id="${componentId}">${finalHtml}</div>`);

        // 7. Add component script to the accumulated JS
        if (componentData.js) {
            const scriptContent = `
// Component: ${componentName}
((id) => {
    window.Shork = window.Shork || {};
    window.Shork._componentFunctions = window.Shork._componentFunctions || {};
    window.Shork._componentFunctions[id] = (() => {
        ${componentData.js}
    })();
})('${componentId}');
`;
            accumulatedJs += scriptContent;
        }

        // 8. Replace the original component tag with the processed HTML
        node.replaceWith(componentWrapper.toString());
    }

    return { html: root.toString(), css: accumulatedCss, js: accumulatedJs };
}
