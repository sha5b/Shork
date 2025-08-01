import { z } from 'zod';

// Defines the shape of a single blog post object
const PostSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

// Defines the shape of the data returned by the load function.
// It expects an object with a 'post' key.
export const schema = z.object({
  post: PostSchema,
});
