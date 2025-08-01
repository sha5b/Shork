import { db } from '../../../lib/database.js';

export const getStaticPaths = async () => {
    // In a real app, this data would be fetched from a CMS
    const posts = await db.posts.findMany();
    return posts.map(post => ({
        params: { slug: post.slug },
        props: { post }
    }));
};
