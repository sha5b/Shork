// @ts-nocheck

/**
 * Initializes all declarative event listeners in the document.
 * Looks for attributes starting with `on:` and attaches the corresponding event listener.
 */
export function initEventHandlers() {
    document.querySelectorAll('[data-shork-id]').forEach(component => {
        if (!(component instanceof HTMLElement)) return;

        const componentId = component.dataset.shorkId;
        if (!componentId) return;

        const elementsWithEvents = [component, ...Array.from(component.querySelectorAll('*'))];

        elementsWithEvents.forEach(element => {
            if (!(element instanceof HTMLElement)) return;

            for (const attr of element.attributes) {
                if (attr.name.startsWith('on:')) {
                    const eventName = attr.name.slice(3);
                    const functionName = attr.value;

                    element.addEventListener(eventName, (event) => {
                        const componentFunctions = window.Shork?._componentFunctions?.[componentId];
                        if (componentFunctions && typeof componentFunctions[functionName] === 'function') {
                            componentFunctions[functionName](event);
                        } else {
                            console.warn(`Function ${functionName} not found on component ${componentId}`);
                        }
                    });
                }
            }
        });
    });
}
