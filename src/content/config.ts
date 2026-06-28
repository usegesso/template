import { defineCollection, reference, z } from 'astro:content';
import { ARTWORK_STATUSES } from '../lib/status';

/**
 * Content model for an Easel portfolio. All of these collections are edited by
 * the artist through the custom Easel editor at /admin (src/admin) — never by
 * hand. The editor writes exactly the fields these Zod schemas validate, so what
 * it commits is always what the build can read.
 */

const statusEnum = z.enum(ARTWORK_STATUSES);

// One .md per artwork. Frontmatter = metadata, body = optional description.
const artworks = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      image: image(),
      // Optional extra shots (details, process, other angles) shown on the piece's
      // own page. The primary `image` above stays the cover/thumbnail/share image.
      images: z.array(image()).default([]),
      title: z.string(),
      year: z.number().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      status: statusEnum.default('available'),
      // Price is only meaningful / shown when status is "available".
      price: z.string().optional(),
      // Optional external "buy" link (Stripe Payment Link, Gumroad, Etsy, Big
      // Cartel, …). When the piece is available and this is set, the work page
      // shows a Buy button; otherwise an Inquire button. Only acts when the
      // site's `sellEnabled` setting is on. Easel never handles money itself.
      buyLink: z.string().url().optional(),
      // Optional purchase options — sizes, print editions, or tiers. Each carries its
      // own price and (optional) external checkout link, so a piece can offer e.g.
      // "A3 print — $40" and "Original — $1,800" side by side. When set (and selling is
      // on), the work page lists these instead of the single price/buyLink above. An
      // option with no link falls back to the inquiry flow. Easel never handles money.
      options: z
        .array(
          z.object({
            label: z.string(),
            price: z.string().optional(),
            buyLink: z.string().url().optional(),
            // e.g. "Edition of 25" or "3 of 25".
            edition: z.string().optional(),
            soldOut: z.boolean().default(false),
          }),
        )
        .default([]),
      // Required for SEO + accessibility; prompted in the CMS.
      alt: z.string(),
      // Optional time-based media: a YouTube or Vimeo URL. The still image above is
      // the thumbnail/poster; the embed plays on the artwork's own page.
      video: z.string().url().optional(),
      // Optional audio: a SoundCloud track URL, a Bandcamp EmbeddedPlayer URL, or a
      // direct audio file URL (.mp3/.ogg/.wav/.m4a). Plays on the artwork's own page,
      // so sound artists and musicians can present a piece. The still image stays the
      // cover/thumbnail. Off unless set.
      audio: z.string().url().optional(),
      // Optional series tag — references a `collections` entry by slug.
      collection: reference('collections').optional(),
      // Manual sort, set by drag-reorder in the CMS.
      order: z.number().default(0),
      featured: z.boolean().default(false),
      // Marks an image cloaked with Glaze/Nightshade. When set, the site serves the
      // original file untouched (no resizing/re-encoding through astro:assets), so
      // the protection survives. Off by default — normal pieces stay optimized.
      protected: z.boolean().default(false),
    }),
});

// Series / bodies of work.
const seriesCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // The entry id (filename) is the slug; `slug` is reserved by Astro for
      // content collections, so we don't declare it here.
      description: z.string().optional(),
      // A short tagline shown under the title on the series page (e.g. "Oil, 2023").
      lede: z.string().optional(),
      cover: image().optional(),
      // Full-bleed intro header (cover/title/lede span the page) instead of the
      // standard centered heading. Off by default, so existing series are unchanged.
      storyLayout: z.boolean().default(false),
      order: z.number().default(0),
    }),
});

// Static pages (about, contact, cv, press). Body is markdown; structured fields
// live in frontmatter so the CMS can present friendly widgets.
const pages = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // about
      portrait: image().optional(),
      statement: z.string().optional(),
      // contact
      intro: z.string().optional(),
      email: z.string().email().optional(),
      formEnabled: z.boolean().default(true),
      // cv — repeatable structured groups
      cv: z
        .array(
          z.object({
            heading: z.string(),
            items: z
              .array(
                z.object({
                  year: z.string().optional(),
                  text: z.string(),
                })
              )
              .default([]),
          })
        )
        .optional(),
      // press — items
      press: z
        .array(
          z.object({
            outlet: z.string(),
            title: z.string(),
            url: z.string().url().optional(),
            date: z.string().optional(),
            excerpt: z.string().optional(),
          })
        )
        .optional(),
    }),
});

// News / updates — a lightweight reverse-chronological feed. Gives visitors a
// reason to return and the site fresh content for SEO, without a full blog CMS.
const posts = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // ISO date string (YYYY-MM-DD); used for sort + display.
      date: z.string(),
      excerpt: z.string().optional(),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

// Exhibitions / shows — a structured list of upcoming and past shows. Lightweight
// frontmatter only (no markdown body); the public page groups them by date.
const exhibitions = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    venue: z.string().optional(),
    location: z.string().optional(),
    // ISO date strings (YYYY-MM-DD). startDate drives sort + upcoming/past grouping.
    startDate: z.string(),
    endDate: z.string().optional(),
    url: z.string().url().optional(),
    description: z.string().optional(),
    // Solo vs group, used to split the auto-generated CV exhibitions section.
    // Unset entries fall under a single "Exhibitions" heading.
    kind: z.enum(['solo', 'group']).optional(),
    draft: z.boolean().default(false),
  }),
});

// Testimonials / praise — short quotes about the artist or their work. Frontmatter
// only (no body); shown as a section on the About page when any exist.
const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    quote: z.string(),
    author: z.string(),
    // Who they are / where it ran (e.g. "Collector", "Frieze").
    role: z.string().optional(),
    order: z.number().default(0),
  }),
});

const socialLink = z.object({
  label: z.string(),
  url: z.string().url(),
});

// One row on the optional /links "link in bio" page.
const bioLink = z.object({
  label: z.string(),
  url: z.string().url(),
  // Optional leading emoji/icon (e.g. "🛒", "📷").
  icon: z.string().optional(),
  // Optional thumbnail image (a served path, e.g. /assets/links-shop.png). Shows
  // a small picture on the button instead of (or beside) the emoji.
  thumbnail: z.string().optional(),
  // Featured links get a larger, accented button so one link can stand out.
  // Off by default, so existing /links pages look the same until the artist opts in.
  featured: z.boolean().default(false),
});

// Global settings singleton, stored at src/content/site.json and validated as a
// single-entry data collection.
const site = defineCollection({
  type: 'data',
  schema: z.object({
    // identity
    siteTitle: z.string(),
    tagline: z.string().optional(),
    logoText: z.string(),
    // look
    theme: z.string().default('default'),
    fontPairing: z.string().default('jost-hanken-grotesk'),
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
    // layout (backend — chosen by us, not surfaced in the editor)
    portfolioLayout: z.enum(['grid', 'masonry']).default('grid'),
    columns: z.number().min(1).max(6).default(3),
    // Design tokens (theme). Validated/normalized at render via src/lib/design.ts,
    // so kept permissive here. See planning/customization.md.
    design: z.record(z.any()).optional(),
    // motion
    motionDefault: z.enum(['full', 'reduced']).default('full'),
    // protection
    rightClickProtect: z.boolean().default(false),
    watermark: z.boolean().default(false),
    watermarkText: z.string().optional(),
    // AI-scraper shield. When on, the site serves a robots.txt + ai.txt that ask
    // known AI training crawlers to keep out, adds a noai/noimageai robots meta
    // tag, and stamps a "do not train" rights note into images at build time.
    // Off by default, so existing sites are unchanged until the artist opts in.
    protectFromAI: z.boolean().default(false),
    // meta
    ogImage: z.string().optional(),
    metaDescription: z.string().optional(),
    socialLinks: z.array(socialLink).default([]),
    // Optional "support me" links (Ko-fi, Buy Me a Coffee, Patreon, PayPal.me, …).
    // When any are set, a small support block shows in the footer. Easel never
    // handles the money — these just point to the artist's own page. Off when empty.
    supportLinks: z.array(socialLink).default([]),
    // Optional /links "link in bio" page (a Linktree-style hub to drop in social
    // bios). Unlisted: it never appears in the site menu, only at the /links URL.
    // Off by default, so existing sites are unchanged until the artist turns it on.
    linksEnabled: z.boolean().default(false),
    linksDisplayName: z.string().optional(),
    linksBio: z.string().optional(),
    links: z.array(bioLink).default([]),
    // Optional /commissions page (toggled on via design.pages.commissions). Drives
    // a structured request form, or — in vGen mode — points at the artist's vGen
    // page instead. The page itself stays hidden from the menu until turned on.
    commissionsMode: z.enum(['form', 'vgen']).default('form'),
    commissionsIntro: z.string().optional(),
    commissionsTerms: z.string().optional(),
    commissionsVgenUrl: z.string().url().optional(),
    // Optional /shop page (toggled on via design.pages.shop). Renders a pasted
    // store embed — a Gumroad/Big Cartel/Shopify Buy Button snippet — so the artist
    // sells through their own store without leaving their site. Easel never touches
    // the transaction. Empty until the artist pastes a snippet.
    shopIntro: z.string().optional(),
    shopEmbed: z.string().optional(),
    // When on, the CV page's exhibitions sections are generated from the
    // Exhibitions you've entered (split into solo/group), so the CV stays current
    // without retyping. Off by default, so existing hand-typed CVs are unchanged.
    cvAutoExhibitions: z.boolean().default(false),
    // Client-side search (Pagefind). When on, a search box shows in the header and
    // visitors can search across your work, series, and news. Off by default.
    searchEnabled: z.boolean().default(false),
    // Privacy-friendly analytics: paste a Cloudflare Web Analytics token and we
    // inject the beacon (no cookie banner needed). The raw snippet below stays for
    // power users who want GA/Plausible/etc.
    cfAnalyticsToken: z.string().optional(),
    // Analytics provider preset. Pick one and paste its site id; we inject the
    // right snippet. No visitor data passes through Easel. 'none' (default) and the
    // legacy cfAnalyticsToken/analyticsSnippet keep older sites working untouched.
    analyticsProvider: z
      .enum(['none', 'ga4', 'plausible', 'fathom', 'umami', 'goatcounter', 'simpleanalytics', 'matomo', 'cloudflare'])
      .default('none'),
    analyticsId: z.string().optional(),
    // Self-hosted host URL for providers that need one (Umami, Matomo).
    analyticsHost: z.string().optional(),
    analyticsSnippet: z.string().optional(),
    // Commerce: when on, available/inquire pieces show a Buy or Inquire button
    // (Buy when the piece carries a buyLink, otherwise a prefilled contact link).
    // Off by default, so existing sites are unchanged until the artist opts in.
    sellEnabled: z.boolean().default(false),
    // Newsletter signup. When enabled, a signup block renders on the contact page.
    newsletterEnabled: z.boolean().default(false),
    newsletterHeading: z.string().optional(),
    newsletterBlurb: z.string().optional(),
    // Where signups go. 'netlify' = the built-in form backend (Netlify Forms or
    // FormSubmit). The others post straight to that provider's hosted form using
    // the paste-in action URL, so signups land directly in the artist's list.
    newsletterProvider: z.enum(['netlify', 'buttondown', 'mailchimp', 'convertkit']).default('netlify'),
    newsletterActionUrl: z.string().url().optional(),
    // Ambient placements for the same signup, each off by default. They reuse the
    // newsletter plumbing above, so nothing new to configure: footer shows the
    // signup site-wide; work pages show a "follow new work" prompt under each piece.
    newsletterInFooter: z.boolean().default(false),
    newsletterOnWork: z.boolean().default(false),
    // Power-user escape hatches (the artist's own site).
    customCss: z.string().optional(),
    customCode: z.string().optional(),
  }),
});

export const collections = {
  artworks,
  collections: seriesCollection,
  pages,
  posts,
  exhibitions,
  testimonials,
  site,
};
