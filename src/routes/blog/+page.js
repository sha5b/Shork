import { z } from 'zod';
import { db } from '../../lib/database.js';

/**
 * Defines the schema for the blog index page data.
 * The framework uses this to automatically generate TypeScript types for type-safety.
 */
export const schema = z.object({
	posts: z.array(
		z.object({
			slug: z.string(),
			title: z.string()
		})
	)
});

/**
 * Loads the data for the blog index page.
 * @returns {Promise<import('./+page.d.ts').PageData>}
 */
export async function load() {
	const posts = await db.posts.findMany();
	return {
		posts
	};
}
