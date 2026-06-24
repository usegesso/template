import { defineCollection, reference, z } from 'astro:content';

/**
 * Content model for an Easel portfolio. All of these collections are edited by
 * the artist through Sveltia CMS at /admin — never by hand. The Zod schemas here
 * mirror public/admin/config.yml so the CMS and the build agree.
 */

const statusEnum = z.enum(['available', 'sold', 'inquire', 'nfs']);

// One .md per artwork. Frontmatter = metadata, body = optional description.
const artworks = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      image: image(),
      title: z.string(),
      year: z.number().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      status: statusEnum.default('available'),
      // Price is only meaningful / shown when status is "available".
      price: z.string().optional(),
      // Required for SEO + accessibility; prompted in the CMS.
      alt: z.string(),
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
    fontPairing: z.string().default('syne-space-grotesk'),
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
    customDomain: z.string().optional(),
    analyticsSnippet: z.string().optional(),
    // Power-user escape hatches (the artist's own site).
    customCss: z.string().optional(),
    customCode: z.string().optional(),
  }),
});

export const collections = {
  artworks,
  collections: seriesCollection,
  pages,
  site,
};
