import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { resolveDesign } from '../../../lib/design';
import { renderShareCard, type CardColors } from '../../../lib/og';

// A 9:16 "story" share card per artwork, built statically — a branded image the
// artist can download and post to an Instagram/TikTok story. The work page links
// to it. (Work pages keep the actual artwork as their OpenGraph link-preview
// image; this is a separate, downloadable asset.)
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

  return (await getCollection('artworks')).map((a) => ({
    params: { slug: strip(a.id) },
    props: {
      title: a.data.title,
      subtitle: [a.data.year, name].filter(Boolean).join(' · '),
      colors,
    },
  }));
}) satisfies GetStaticPaths;

export const GET = async ({ props }: APIContext) => {
  const { title, subtitle, colors } = props as { title: string; subtitle: string; colors: CardColors };
  const png = await renderShareCard({ title, subtitle, colors, format: 'story' });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
