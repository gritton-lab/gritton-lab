import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Every field here is editable from the CMS at /admin.
 *
 * Image fields are plain strings holding a site-root path such as
 * `/images/uploads/oliver-qu.jpeg`, not Astro `image()` assets: the CMS media
 * library lives in `public/images/uploads`, and editors must be able to upload
 * a photo and pick it without touching code.
 */

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    // Drives which section of the Lab Team page a person appears in.
    group: z.enum(['pi', 'grad', 'undergrad', 'staff', 'alumni']),
    role: z.string(),
    program: z.string().optional(),
    photo: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    lab: z.string().optional(),
    office: z.string().optional(),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    education: z.array(z.string()).default([]),
    order: z.number().default(99),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    // One string, so author lists keep their `*` co-author markers as written.
    authors: z.string(),
    year: z.number(),
    title: z.string(),
    journal: z.string(),
    url: z.string().optional(),
    note: z.string().optional(),
    // Ordering within a year (lower first); years always sort newest-first.
    order: z.number().default(99),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    // Optional YouTube or Vimeo link; rendered as an embedded player.
    video: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    order: z.number().default(99),
  }),
});

// Fixed page content (home hero, positions, contact, site settings) lives in
// `src/data/*.json` and is imported directly by the pages that use it; the CMS
// edits those as a "file collection".

export const collections = { team, publications, news, projects };
