import { z } from 'zod';

// A shared schema for a single post, can be reused
const PostSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

// Defines the shape of the data returned by the load function for the blog index.
// It expects an object with a 'posts' key, which is an array of posts.
export const schema = z.object({
  posts: z.array(PostSchema),
});
