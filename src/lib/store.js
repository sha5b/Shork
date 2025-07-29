/**
 * @template T
 * @typedef {{subscribe: (callback: (value: T) => void) => () => void, set: (newValue: T) => void, update: (updater: (value: T) => T) => void}} Writable
 */

/**
 * Creates a writable store that allows reading and writing values.
 * @template T
 * @param {T} initialState The initial value of the store.
 * @returns {Writable<T>}
 */
export function writable(initialState) {
    let value = initialState;
    const subscribers = new Set();

    /**
     * Sets the value of the store.
     * @param {T} newValue The new value.
     */
    function set(newValue) {
        value = newValue;
        subscribers.forEach(callback => callback(value));
    }

    /**
     * Subscribes to changes in the store's value.
     * @param {(value: T) => void} callback The function to call when the value changes.
     * @returns {() => void} An unsubscribe function.
     */
    function subscribe(callback) {
        subscribers.add(callback);
        callback(value); // Immediately call with current value

        return () => {
            subscribers.delete(callback);
        };
    }

    /**
     * Updates the store's value using an updater function.
     * @param {(value: T) => T} updater A function that takes the current value and returns the new value.
     */
    function update(updater) {
        set(updater(value));
    }

    return { subscribe, set, update };
}
