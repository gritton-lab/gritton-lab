// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  /*
   * The original WordPress site published these URLs, and the earlier Astro
   * build still served them. The canonical routes are now /projects and
   * /people, so the old paths redirect rather than 404 for anyone arriving
   * from a bookmark, an email signature, or a search result.
   */
  redirects: {
    '/research-projects': '/projects',
    '/research-projects/[slug]': '/projects/[slug]',
    '/lab-team': '/people',
    '/lab-team/[slug]': '/people/[slug]',
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
