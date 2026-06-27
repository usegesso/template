// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import aiProtect from './src/lib/ai-protect-integration.mjs';

// Static portfolio site. The host rebuilds on every editor commit to `main`. The
// custom Easel editor SPA lives at /admin (Svelte island).
export default defineConfig({
  // Drives canonical URLs, OG tags, and the sitemap. The host injects `URL` at
  // build time — the site's primary address (a custom domain once the artist sets
  // one, otherwise the assigned host subdomain) — so every artist site emits
  // correct absolute URLs without any provisioning-time patch. The literal
  // fallback only applies to local builds outside a host.
  site: process.env.URL ?? 'https://example.netlify.app',
  // Subpath the site is served from. Empty for Netlify and custom domains (served
  // at the root); on GitHub Pages without a custom domain the site lives under
  // /<repo>, and the Pages deploy workflow passes BASE_PATH=/<repo>. Internal links
  // go through withBase() (src/lib/href.ts) so they pick this up.
  base: process.env.BASE_PATH || undefined,
  output: 'static',
  integrations: [sitemap(), svelte(), aiProtect()],
  image: {
    // astro:assets uses Sharp at build time to emit responsive, modern formats.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
