import type { APIContext } from 'astro';
import { getEntry } from 'astro:content';

// Known AI training / scraping crawlers. When the artist turns on the AI-scraper
// shield, we ask each of these to stay out. This is a request honored by the
// well-behaved crawlers (the ones that read robots.txt), not an enforced lock.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'CCBot',
  'Google-Extended',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Bytespider',
  'PerplexityBot',
  'Amazonbot',
  'Applebot-Extended',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'FacebookBot',
  'Meta-ExternalAgent',
  'cohere-ai',
  'Timpibot',
  'YouBot',
];

// robots.txt. Always served (so the sitemap is discoverable). When the artist
// enables protectFromAI, we append a Disallow block for known AI crawlers.
export async function GET(context: APIContext) {
  const settings = (await getEntry('site', 'settings'))!.data;
  const sitemap = new URL('sitemap-index.xml', context.site ?? 'https://example.com').href;

  const lines = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`];

  if (settings.protectFromAI) {
    lines.push('');
    lines.push('# This site has opted out of AI training and scraping.');
    for (const bot of AI_BOTS) {
      lines.push(`User-agent: ${bot}`, 'Disallow: /', '');
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
