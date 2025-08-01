import { db } from '../../../lib/data/database.js';

export const load = async ({ params }) => {
    const post = await db.posts.findUnique({ where: { slug: params.slug } });
    return { post };
};

export const generateStaticParams = async () => {
    // In a real app, this data would be fetched from a CMS
    const posts = await db.posts.findMany();
    return posts.map(post => ({ slug: post.slug }));
};
