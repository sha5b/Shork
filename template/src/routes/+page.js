import { z } from 'zod';

/**
 * Defines the schema for the index page data.
 * The framework uses this to automatically generate TypeScript types for type-safety.
 */
export const schema = z.object({
  // Define page data schema here
});

/**
 * Loads the data for the index page.
 * @returns {Promise<import('./+page.d.ts').PageData>}
 */
export async function load() {
	return {};
}
