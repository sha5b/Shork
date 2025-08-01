import { pathToFileURL } from 'url';

const importCache = new Map();

/**
 * Imports a module with caching to avoid re-importing on every build.
 * @param {string} modulePath - The absolute path to the module.
 * @returns {Promise<any>}
 */
export async function importWithCache(modulePath) {
    const url = pathToFileURL(modulePath).href;
    // Use a consistent cache key. Adding a timestamp would invalidate the cache on every run.
    const cacheKey = `${url}`;
    if (importCache.has(cacheKey)) {
        return importCache.get(cacheKey);
    }
    const module = await import(cacheKey);
    importCache.set(cacheKey, module);
    return module;
}
