import { defineCollection, reference, z } from 'astro:content';

/**
 * Content model for an Easel portfolio. All of these collections are edited by
 * the artist through the custom Easel editor at /admin (src/admin) — never by
 * hand. The editor writes exactly the fields these Zod schemas validate, so what
 * it commits is always what the build can read.
 */

const statusEnum = z.enum(['available', 'sold', 'inquire', 'nfs']);

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
      // Required for SEO + accessibility; prompted in the CMS.
      alt: z.string(),
      // Optional time-based media: a YouTube or Vimeo URL. The still image above is
      // the thumbnail/poster; the embed plays on the artwork's own page.
      video: z.string().url().optional(),
      // Optional series tag — references a `collections` entry by slug.
      collection: reference('collections').optional(),
      // Manual sort, set by drag-reorder in the CMS.
      order: z.number().default(0),
      featured: z.boolean().default(false),
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
      cover: image().optional(),
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
    draft: z.boolean().default(false),
  }),
});

const socialLink = z.object({
  label: z.string(),
  url: z.string().url(),
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
    // meta
    ogImage: z.string().optional(),
    metaDescription: z.string().optional(),
    socialLinks: z.array(socialLink).default([]),
    // Privacy-friendly analytics: paste a Cloudflare Web Analytics token and we
    // inject the beacon (no cookie banner needed). The raw snippet below stays for
    // power users who want GA/Plausible/etc.
    cfAnalyticsToken: z.string().optional(),
    analyticsSnippet: z.string().optional(),
    // Commerce: when on, available/inquire pieces show a Buy or Inquire button
    // (Buy when the piece carries a buyLink, otherwise a prefilled contact link).
    // Off by default, so existing sites are unchanged until the artist opts in.
    sellEnabled: z.boolean().default(false),
    // Newsletter signup (Netlify Forms). When enabled, a signup block renders.
    newsletterEnabled: z.boolean().default(false),
    newsletterHeading: z.string().optional(),
    newsletterBlurb: z.string().optional(),
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
  site,
};
