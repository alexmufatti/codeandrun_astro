import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    seoDescription: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    featuredImageAlt: z.string().optional(),
    car_week: z.string().optional(),
    car_km: z.string().optional(),
    car_race: z.boolean().default(false),
    training_types: z.string().optional(),
    training_feelings: z.string().optional(),
    places: z.string().optional(),
    wpId: z.number().optional(),
  }),
});

export const collections = { posts };
