// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

// Static portfolio site. The artist's custom domain (if set) should be wired in
// here via `site`. Netlify rebuilds on every editor commit to `main`. The custom
// Easel editor SPA lives at /admin (Svelte island).
export default defineConfig({
  // TODO(provisioning): replace with the artist's custom domain or Netlify URL.
  site: 'https://example.netlify.app',
  output: 'static',
  integrations: [sitemap(), svelte()],
  image: {
    // astro:assets uses Sharp at build time to emit responsive, modern formats.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
