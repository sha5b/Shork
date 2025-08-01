import fs from 'fs-extra';
import path from 'path';
import { parse } from 'node-html-parser';
import config from '../../shork.config.js';

const componentCache = new Map();

/**
 * Recursively processes component tags in HTML content.
 * @param {string} html - The HTML content to process.
 * @returns {Promise<{html: string, css: string}>}
 */
export async function processComponents(html) {
    const root = parse(html);
    const componentNodes = root.querySelectorAll('*').filter(n => n.tagName.toLowerCase().startsWith('shork-'));

    if (componentNodes.length === 0) {
        return { html, css: '' };
    }

    let accumulatedCss = '';

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
            const styleNode = componentRoot.querySelector('style');
            const componentCss = styleNode ? styleNode.innerHTML : '';
            if (styleNode) styleNode.remove();

            componentData = { html: componentRoot.innerHTML.trim(), css: componentCss };
            componentCache.set(componentName, componentData);
        }

        accumulatedCss += componentData.css;

        // 2. Get props from attributes
        const props = { ...node.attributes };

        // 3. Handle slot content by recursively processing it first
        const slotContent = node.innerHTML || '';
        const recursiveResult = await processComponents(slotContent);
        accumulatedCss += recursiveResult.css;

        // 4. Replace placeholders in the component's HTML
        let finalHtml = componentData.html;
        for (const [key, value] of Object.entries(props)) {
            finalHtml = finalHtml.replace(new RegExp(`\\{\\{\\s*props.${key}\\s*\\}\\}`, 'g'), value);
        }
        finalHtml = finalHtml.replace(/\{\{\s*slot\s*\}\}/g, recursiveResult.html);

        // 5. Replace the original component tag with the processed HTML
        node.replaceWith(finalHtml);
    }

    return { html: root.toString(), css: accumulatedCss };
}
