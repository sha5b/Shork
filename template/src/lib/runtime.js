import * as stores from './stores.js';

/**
 * A map of action names to functions.
 * @type {Object.<string, () => void>}
 */
const actions = {
    increment: () => stores.count.update(n => n + 1),
    decrement: () => stores.count.update(n => n - 1),
};

/**
 * Initializes the reactive parts of the application within a given container.
 * @param {HTMLElement} container The element to scan for reactive attributes.
 */
export function init(container) {
    // Handle subscriptions
    const subscribers = container.querySelectorAll('[data-subscribe]');
    subscribers.forEach(el => {
        if (el instanceof HTMLElement) {
            const storeName = el.dataset.subscribe;
            if (storeName && storeName in stores) {
                /** @type {import('./store.js').Writable<any>} */
                const store = stores[/** @type {keyof typeof stores} */(storeName)];
                store.subscribe(value => {
                    el.textContent = String(value);
                });
            }
        }
    });

    // Handle clicks
    const clickHandlers = container.querySelectorAll('[data-onclick]');
    clickHandlers.forEach(el => {
        if (el instanceof HTMLElement) {
            const actionName = el.dataset.onclick;
            if (actionName && actionName in actions) {
                el.addEventListener('click', () => actions[/** @type {keyof typeof actions} */(actionName)]());
            }
        }
    });
}
