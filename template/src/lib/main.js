/** @type {{routes: import('./types.js').Route[]}} */
let manifest = { routes: [] };
import { init } from './runtime.js';

/** @type {HTMLElement} */
const appContainer = document.getElementById('app');
const styleContainer = /** @type {HTMLStyleElement} */ (document.getElementById('page-styles'));

/**
 * The main router function.
 * Fetches the route manifest and sets up navigation.
 */
/**
 * The main router function.
 * Fetches the route manifest and sets up navigation.
 * @returns {Promise<void>}
 */
async function router() {
    try {
        const response = await fetch('/manifest.json');
        manifest = await response.json();
    } catch (e) {
        console.error('Could not fetch route manifest.', e);
        return;
    }

    // Initial page load
    const initialPath = window.location.pathname;
    await loadPage(initialPath);

    // Handle navigation
    document.addEventListener('click', e => {
        if (!(e.target instanceof Element)) return;
        const link = e.target.closest('a');
        if (link && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const path = new URL(link.href).pathname;
            if (path !== window.location.pathname) {
                window.history.pushState({ path }, '', path);
                loadPage(path);
            }
        }
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', e => {
        const path = e.state ? e.state.path : '/';
        loadPage(path);
    });
}

/**
 * Loads and renders a page for a given path.
 * @param {string} path The URL path to load.
 */
/**
 * Loads and renders a page for a given path.
 * @param {string} path The URL path to load.
 * @returns {Promise<void>}
 */
async function loadPage(path) {
    let match;
    const route = manifest.routes.find(r => (match = path.match(new RegExp(r.regex))));

    if (!route) {
        console.error(`404: No route found for ${path}`);
        appContainer.innerHTML = '<h1>404 - Not Found</h1>';
        return;
    }

    const params = {};
    if (route.paramKeys.length > 0 && match) {
        route.paramKeys.forEach((key, index) => {
            params[key] = match[index + 1];
        });
    }

    let pageContent = route.page;
    for (const key in params) {
        const re = new RegExp(`%params.${key}%`, 'g');
        pageContent = pageContent.replace(re, params[key]);
    }

            const updateDom = () => {
        const finalHtml = route.layout.replace('<slot></slot>', pageContent);
        appContainer.innerHTML = finalHtml;
        init(appContainer);
        styleContainer.innerHTML = route.css;
    };

    if (document.startViewTransition) {
        document.startViewTransition(updateDom);
    } else {
        updateDom();
    }
}

router();
