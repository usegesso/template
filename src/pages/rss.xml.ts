import rss from '@astrojs/rss';
import { getCollection, getEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { withBase } from '../lib/href';

// RSS feed for the News collection, so visitors can follow along in a reader.
// Mirrors src/pages/news/index.astro: published (non-draft) posts, newest first.
// Item links go through withBase() so GitHub Pages subpaths resolve, and
// `context.site` (the `site` set in astro.config.mjs) absolutizes them.
export async function GET(context: APIContext) {
  const settings = (await getEntry('site', 'settings'))!.data;

  const slugify = (id: string) => id.replace(/\.md$/, '');
  const toDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const posts = (await getCollection('posts'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));

  return rss({
    title: `${settings.siteTitle} — News`,
    // `||` (not `??`) so an empty-string tagline/description falls through to the default.
    description: settings.tagline || settings.metaDescription || `Updates from ${settings.siteTitle}`,
    // astro.config.mjs always sets `site`; the literal mirrors its local fallback.
    site: context.site ?? 'https://example.netlify.app',
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: toDate(p.data.date),
      description: p.data.excerpt,
      link: withBase(`/news/${slugify(p.id)}/`),
    })),
  });
}
