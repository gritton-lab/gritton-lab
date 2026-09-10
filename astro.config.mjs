// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  /* Preserve incoming links to the original site routes. */
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
