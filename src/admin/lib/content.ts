/**
 * Content model + (de)serialization for the Easel editor. Mirrors
 * src/content/config.ts so what the editor writes is exactly what the build reads.
 * Markdown files use YAML frontmatter; settings is plain JSON.
 */
import yaml from 'js-yaml';

export const PATHS = {
  artworks: 'src/content/artworks',
  series: 'src/content/collections',
  pages: 'src/content/pages',
  posts: 'src/content/posts',
  exhibitions: 'src/content/exhibitions',
  testimonials: 'src/content/testimonials',
  settings: 'src/content/site/settings.json',
  assets: 'src/assets',
};

export interface Artwork {
  id: string; // filename stem
  image: string; // frontmatter path, e.g. ../../assets/artworks/foo.jpg
  /** Optional extra shots (frontmatter paths), shown on the piece's own page. */
  images?: string[];
  title: string;
  year?: number;
  medium?: string;
  dimensions?: string;
  status: 'available' | 'sold' | 'inquire' | 'nfs';
  price?: string;
  /** Optional external buy link (Stripe/Gumroad/Etsy/…). Shown as a Buy button
   *  on available pieces when the site's `sellEnabled` setting is on. */
  buyLink?: string;
  alt: string;
  collection?: string; // series id
  /** Optional YouTube/Vimeo URL — plays on the artwork's own page. */
  video?: string;
  order: number;
  featured: boolean;
  body: string;
}

export interface Post {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  excerpt?: string;
  cover?: string;
  draft: boolean;
  body: string;
}

export interface Exhibition {
  id: string;
  title: string;
  venue?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  url?: string;
  description?: string;
  draft: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  order: number;
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  order: number;
  body: string;
}

export interface AboutPage {
  title: string;
  portrait?: string;
  statement?: string;
  body: string;
}
export interface ContactPage {
  title: string;
  intro?: string;
  email?: string;
  formEnabled: boolean;
  body: string;
}
export interface CvSection {
  heading: string;
  items: { year?: string; text: string }[];
}
export interface CvPage {
  title: string;
  cv: CvSection[];
}
export interface PressItem {
  outlet: string;
  title: string;
  url?: string;
  date?: string;
  excerpt?: string;
}
export interface PressPage {
  title: string;
  press: PressItem[];
}

export interface Settings {
  siteTitle: string;
  tagline?: string;
  logoText: string;
  theme: string;
  portfolioLayout: 'grid' | 'masonry';
  columns: number;
  motionDefault: 'full' | 'reduced';
  rightClickProtect: boolean;
  watermark: boolean;
  watermarkText?: string;
  /** AI-scraper shield: robots/ai.txt opt-out + noai meta + image rights tag. Off by default. */
  protectFromAI?: boolean;
  metaDescription?: string;
  ogImage?: string;
  socialLinks: { label: string; url: string }[];
  /** Optional /links "link in bio" page. Unlisted; off until linksEnabled. */
  linksEnabled?: boolean;
  linksDisplayName?: string;
  linksBio?: string;
  links?: { label: string; url: string; icon?: string }[];
  searchEnabled?: boolean;
  cfAnalyticsToken?: string;
  analyticsSnippet?: string;
  sellEnabled?: boolean;
  newsletterEnabled?: boolean;
  newsletterHeading?: string;
  newsletterBlurb?: string;
  newsletterProvider?: 'netlify' | 'buttondown' | 'mailchimp' | 'convertkit';
  newsletterActionUrl?: string;
  customCss?: string;
  customCode?: string;
  /** Design tokens (theme). Opaque to the editor's basic settings; carried through
   *  on save so the Look UI / wizard own it. See src/lib/design.ts. */
  design?: Record<string, any>;
}

/** Split a markdown file into its frontmatter object + body. */
export function parseFrontmatter(text: string): { data: Record<string, any>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text.trim() };
  const data = (yaml.load(match[1]) as Record<string, any>) ?? {};
  return { data, body: (match[2] ?? '').trim() };
}

/** Serialize frontmatter + body back to a markdown file. Drops empty values. */
export function toMarkdown(data: Record<string, any>, body: string): string {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === '') continue;
    clean[k] = v;
  }
  const fm = yaml.dump(clean, { lineWidth: -1, quotingType: '"' }).trimEnd();
  const text = body.trim();
  return `---\n${fm}\n---\n${text ? `\n${text}\n` : '\n'}`;
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

/** A URL-safe slug from a title, for filenames. */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

/** Resolve a frontmatter image path (relative to a content folder) to a repo path. */
export function resolveAssetPath(fromDir: string, rel: string): string {
  const parts = (fromDir + '/' + rel).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}
