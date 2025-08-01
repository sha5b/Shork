/**
 * @typedef {object} Post
 * @property {string} slug
 * @property {string} title
 * @property {string} content
 */

/** @type {Post[]} */
const posts = [
    { 
        slug: 'first-post', 
        title: 'My First Blog Post',
        content: 'This is the exciting content of my very first post!'
    },
    { 
        slug: 'second-post', 
        title: 'A Follow-up Post',
        content: 'Here is some more wisdom for you all.'
    },
    { 
        slug: 'a-post-with-a-longer-slug', 
        title: 'The Art of Long Slugs',
        content: 'Sometimes, a longer slug is necessary to convey the full meaning.'
    },
];

export const db = {
    posts: {
        findMany: async () => {
            return posts;
        },
        /**
         * @param {{ where: { slug: string } }} params
         */
        findUnique: async ({ where }) => {
            return posts.find(p => p.slug === where.slug);
        }
    }
};
