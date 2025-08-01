import * as stores from '../stores/index.js';
import { initEventHandlers } from './hydration.js';

/**
 * Initializes the reactive parts of the application within a given container.
 * @param {HTMLElement} container The element to scan for reactive attributes.
 */
export function init(container) {
    // Handle subscriptions for stores
    const subscribers = container.querySelectorAll('[data-subscribe]');
    subscribers.forEach(el => {
        if (el instanceof HTMLElement) {
            const storeName = el.dataset.subscribe;
            if (storeName && storeName in stores) {
                /** @type {import('../stores/writable.js').Writable<any>} */
                const store = stores[/** @type {keyof typeof stores} */(storeName)];
                store.subscribe(value => {
                    el.textContent = String(value);
                });
            }
        }
    });

    // Initialize all declarative event handlers (e.g., on:click)
    initEventHandlers();
}

// Initial call to setup the application
document.addEventListener('DOMContentLoaded', () => {
    init(document.body);
});
