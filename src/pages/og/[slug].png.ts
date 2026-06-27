import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { resolveDesign } from '../../lib/design';
import { renderShareCard, type CardColors } from '../../lib/og';

// One branded share card per shareable page, built statically. Pages reference
// their card via pageImage={withBase('/og/<slug>.png')} (see SEO.astro). Work pages
// deliberately keep the actual artwork as their share image instead of a card.
const strip = (id: string) => id.replace(/\.md$/, '');

export const getStaticPaths = (async () => {
  const settings = (await getEntry('site', 'settings'))!.data;
  const name = settings.logoText || settings.siteTitle;
  const design = resolveDesign(settings.design as any);
  const colors: CardColors = {
    accent: design.color.accent,
    ink: design.color.text,
    paper: design.color.background,
  };

  const card = (slug: string, title: string, subtitle: string) => ({
    params: { slug },
    props: { title, subtitle, colors },
  });

  const cards = [
    card('home', settings.siteTitle, settings.tagline || name),
    card('about', name, settings.tagline || 'Portfolio'),
    card('news', 'News', name),
    card('exhibitions', 'Exhibitions', name),
    card('available', 'Available work', name),
  ];
  for (const s of await getCollection('collections')) {
    cards.push(card(`series-${strip(s.id)}`, s.data.title, name));
  }
  for (const p of (await getCollection('posts')).filter((p) => !p.data.draft)) {
    cards.push(card(`post-${strip(p.id)}`, p.data.title, name));
  }
  return cards;
}) satisfies GetStaticPaths;

export const GET = async ({ props }: APIContext) => {
  const { title, subtitle, colors } = props as { title: string; subtitle: string; colors: CardColors };
  const png = await renderShareCard({ title, subtitle, colors });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
