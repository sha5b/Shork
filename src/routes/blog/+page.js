/**
 * Loads the data for the blog index page.
 * @returns {Promise<{posts: {slug: string, title: string}[]}>}
 */
import { db } from '../../lib/database.js';

export async function load() {
    const posts = await db.posts.findMany();
    return {
        posts
    };
}
