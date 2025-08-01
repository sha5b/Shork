import { describe, it, expect } from 'vitest';
import { parse } from 'node-html-parser';
import { processComponents } from '../core/components.js';

describe('processComponents', () => {
    it('should process a simple component without props or slots', async () => {
        const inputHtml = `<shork-counter></shork-counter>`;
        const { html } = await processComponents(inputHtml);
        expect(html).toContain('<div class="counter">');
    });

    it('should handle props correctly', async () => {
        const inputHtml = `<shork-card title="My Title"></shork-card>`;
        const { html } = await processComponents(inputHtml);
        expect(html).toContain('<h3>My Title</h3>');
    });

    it('should handle slot content', async () => {
        const inputHtml = `<shork-card title="With Slot"><p>Slot content</p></shork-card>`;
        const { html } = await processComponents(inputHtml);
        const root = parse(html);
        const cardContent = root.querySelector('.card-content');
        expect(cardContent).not.toBeNull();
        expect(cardContent.innerHTML.trim()).toBe('<p>Slot content</p>');
    });

    it('should extract and accumulate CSS from components', async () => {
        const inputHtml = `<shork-card title="Test"></shork-card>`;
        const { css } = await processComponents(inputHtml);
        expect(css).toContain('.card');
    });

    it('should handle nested components', async () => {
        const inputHtml = `<shork-card title="Nested"><shork-counter></shork-counter></shork-card>`;
        const { html } = await processComponents(inputHtml);
        expect(html).toContain('<h3>Nested</h3>');
        expect(html).toContain('<div class="counter">');
    });

    it('should return original HTML if no components are found', async () => {
        const inputHtml = `<div><p>Just a regular div</p></div>`;
        const { html, css } = await processComponents(inputHtml);
        expect(html).toBe(inputHtml);
        expect(css).toBe('');
    });
});
