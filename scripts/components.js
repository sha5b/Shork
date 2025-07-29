import fs from 'fs-extra';
import path from 'path';

const componentsDir = path.resolve(process.cwd(), 'src/lib/components');
const componentCache = new Map();

/**
 * Recursively processes component tags in HTML content.
 * @param {string} html - The HTML content to process.
 * @returns {Promise<{html: string, css: string}>}
 */
export async function processComponents(html) {
    const componentRegex = /<Component:(\w+)\s*([^>]*?)(?:\/>|>(.*?)<\/Component:\w+>)/gs;
    let processedHtml = html;
    let accumulatedCss = '';
    const matches = [...html.matchAll(componentRegex)];

    if (matches.length === 0) {
        return { html, css: '' };
    }

    for (const match of matches) {
        const [fullTag, componentName, attrsString, slotContent = ''] = match;

        // 1. Get component content from cache or file
        let componentData = componentCache.get(componentName);
        if (!componentData) {
            const componentPath = path.join(componentsDir, `${componentName}.html`);
            if (!(await fs.pathExists(componentPath))) {
                console.warn(`Component not found: ${componentName}`);
                continue;
            }
            const rawContent = await fs.readFile(componentPath, 'utf-8');
            const styleRegex = /<style>([\s\S]*?)<\/style>/;
            const styleMatch = rawContent.match(styleRegex);
            const componentCss = styleMatch ? styleMatch[1] : '';
            const componentHtml = rawContent.replace(styleRegex, '').trim();
            componentData = { html: componentHtml, css: componentCss };
            componentCache.set(componentName, componentData);
        }

        accumulatedCss += componentData.css;

        // 2. Parse attributes into a props object
        const props = {};
        const attrsRegex = /(\w+)=\"([^\"]*)\"/g;
        let attrMatch;
        while ((attrMatch = attrsRegex.exec(attrsString)) !== null) {
            props[attrMatch[1]] = attrMatch[2];
        }

        // 3. Replace placeholders in the component's HTML
        let finalHtml = componentData.html;
        for (const [key, value] of Object.entries(props)) {
            finalHtml = finalHtml.replace(new RegExp(`\{\{\s*props.${key}\s*\}\}`, 'g'), value);
        }
        finalHtml = finalHtml.replace(/\{\{\s*slot\s*\}\}/g, slotContent);

        // 4. Recursively process components within the inserted content
        const recursiveResult = await processComponents(finalHtml);
        accumulatedCss += recursiveResult.css;

        // 5. Replace the original component tag
        processedHtml = processedHtml.replace(fullTag, recursiveResult.html);
    }

    return { html: processedHtml, css: accumulatedCss };
}
