/**
 * Gesso design-token system. Artist sites render entirely from these tokens, so a
 * "theme" is just a bundle of values. The site reads `settings.design`, falls back
 * to DEFAULT_DESIGN (Bauhaus), and maps everything onto the --ez-* CSS variables the
 * components already use — so adding themes needs no component changes.
 */

export interface DesignTokens {
  preset: string;
  color: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    border: string;
    /** Optional overrides; default to accent / text per design at resolve time. */
    link?: string;
    heading?: string;
  };
  type: {
    headingFont: string;
    bodyFont: string;
    headingWeight: number;
    bodyWeight: number;
    baseSize: number; // px on :root
    headingTransform: 'none' | 'uppercase';
    letterSpacing: number; // em on headings
  };
  shape: {
    radius: number; // px
    borderWidth: number; // px
    shadows: 'none' | 'hard' | 'soft';
  };
  density: 'compact' | 'normal' | 'airy';
  /** Gallery / wide-page max width (home, work, series gallery). */
  contentWidth: 'narrow' | 'normal' | 'wide';
  /** Text-page reading measure (about, cv, contact, shop, …). Scales all three
      prose tiers together so text pages stay a consistent, adjustable width. */
  readingWidth: 'comfortable' | 'relaxed' | 'spacious';
  motion: 'smooth' | 'rigid' | 'none';
  nav: { layout: 'side' | 'top' };
  /** Which page is the landing route at '/': the work gallery or the about intro. */
  home: { landing: 'work' | 'about' };
  logo: { mode: 'none' | 'text' | 'image'; image?: string };
  background: { type: 'solid' | 'texture' | 'none' };
  thumb: { fit: 'cover' | 'contain'; hover: 'none' | 'zoom' | 'lift' };
  gallery: {
    layout: 'grid' | 'masonry' | 'cinematic' | 'fullbleed';
    /** Target size of each piece; columns auto-fit to the window. */
    size: 'small' | 'medium' | 'large';
    gutter: 'tight' | 'normal' | 'loose' | 'none';
    caption: 'below' | 'hover' | 'hidden';
    /** Bordered card vs a bare image sitting directly on the page. */
    cardStyle: 'card' | 'bare';
    /** How much a caption shows: everything, or just the title. */
    captionDetail: 'full' | 'minimal';
    featureFirst: boolean;
    /** In the even grid, let landscape pieces span two columns. */
    adaptiveSpans: boolean;
    /** What a thumbnail click does: open the lightbox, or go to its own page. */
    click: 'lightbox' | 'page';
    /** Show filter chips on the home gallery (by series + availability). */
    filters: boolean;
  };
  lightbox: { transition: 'fade' | 'slide'; zoom: boolean };
  hero: { enabled: boolean; align: 'left' | 'center'; size: 'small' | 'large' };
  footer: { socials: boolean; credit: boolean; text?: string };
  favicon: { mode: 'initials' | 'image'; image?: string };
  pages: { about: boolean; contact: boolean; cv: boolean; press: boolean; exhibitions: boolean; news: boolean; available: boolean; presskit: boolean; commissions: boolean; shop: boolean; projects: boolean; stockists: boolean };
}

export const DEFAULT_DESIGN: DesignTokens = {
  preset: 'bauhaus',
  color: {
    background: '#f5f1e6',
    surface: '#ffffff',
    text: '#16181d',
    muted: '#57564f',
    accent: '#1235d6',
    accent2: '#e8132b',
    border: '#16181d',
  },
  type: {
    headingFont: 'Jost',
    bodyFont: 'Hanken Grotesk',
    headingWeight: 700,
    bodyWeight: 400,
    baseSize: 17,
    headingTransform: 'none',
    letterSpacing: -0.01,
  },
  shape: { radius: 0, borderWidth: 2, shadows: 'hard' },
  density: 'normal',
  contentWidth: 'normal',
  readingWidth: 'relaxed',
  motion: 'smooth',
  nav: { layout: 'side' },
  home: { landing: 'work' },
  logo: { mode: 'none' },
  background: { type: 'solid' },
  thumb: { fit: 'contain', hover: 'zoom' },
  gallery: { layout: 'masonry', size: 'medium', gutter: 'normal', caption: 'below', cardStyle: 'card', captionDetail: 'full', featureFirst: false, adaptiveSpans: false, click: 'lightbox', filters: false },
  lightbox: { transition: 'fade', zoom: false },
  hero: { enabled: false, align: 'left', size: 'small' },
  footer: { socials: true, credit: true },
  favicon: { mode: 'initials' },
  pages: { about: true, contact: true, cv: true, press: true, exhibitions: false, news: false, available: false, presskit: false, commissions: false, shop: false, projects: false, stockists: false },
};

/**
 * A recursively-optional design — lets a preset or override set just the nested
 * fields it cares about (e.g. `gallery: { layout: 'grid' }`) without spelling out
 * the whole sub-object. `mergeOver` fills the rest from the base.
 */
export type DesignOverride = {
  [K in keyof DesignTokens]?: DesignTokens[K] extends object
    ? Partial<DesignTokens[K]>
    : DesignTokens[K];
};

/** Deep-merge a partial design over a base token bundle. */
function mergeOver(base: DesignTokens, partial: DesignOverride | undefined): DesignTokens {
  const d = (partial ?? {}) as DesignOverride;
  return {
    ...base,
    ...d,
    preset: d.preset ?? base.preset,
    color: { ...base.color, ...(d.color ?? {}) },
    type: { ...base.type, ...(d.type ?? {}) },
    shape: { ...base.shape, ...(d.shape ?? {}) },
    nav: { ...base.nav, ...(d.nav ?? {}) },
    home: { ...base.home, ...(d.home ?? {}) },
    logo: { ...base.logo, ...(d.logo ?? {}) },
    background: { ...base.background, ...(d.background ?? {}) },
    thumb: { ...base.thumb, ...(d.thumb ?? {}) },
    gallery: { ...base.gallery, ...(d.gallery ?? {}) },
    lightbox: { ...base.lightbox, ...(d.lightbox ?? {}) },
    hero: { ...base.hero, ...(d.hero ?? {}) },
    footer: { ...base.footer, ...(d.footer ?? {}) },
    favicon: { ...base.favicon, ...(d.favicon ?? {}) },
    pages: { ...base.pages, ...(d.pages ?? {}) },
  };
}

/** Merge a partial design over the Bauhaus defaults (used to build presets). */
export function withDefaults(partial: DesignOverride | undefined): DesignTokens {
  return mergeOver(DEFAULT_DESIGN, partial);
}

/**
 * Resolve stored `settings.design` into a full token set: start from the named
 * preset's bundle (or Bauhaus), then layer any granular overrides on top. So
 * `{ preset: 'editorial' }` themes the whole site, and tweaks just add fields.
 */
export function resolveDesign(partial: DesignOverride | undefined): DesignTokens {
  const base = (partial?.preset && PRESETS[partial.preset]?.design) || DEFAULT_DESIGN;
  const r = mergeOver(base, partial);
  // Materialize link/heading so they default to this design's accent/text.
  if (!r.color.link) r.color.link = r.color.accent;
  if (!r.color.heading) r.color.heading = r.color.text;
  return r;
}

const DENSITY_GAP = { compact: '1rem', normal: '1.5rem', airy: '2.5rem' };
const GUTTER = { tight: '0.75rem', normal: '1.5rem', loose: '2.5rem', none: '0' };
const CONTENT_WIDTH = { narrow: '880px', normal: '1200px', wide: '1500px' };
// Reading measures for text pages. Three tiers scale together from `readingWidth`
// so every text page snaps to one shared, adjustable rhythm (no per-page magic px).
const PROSE_NARROW = { comfortable: '480px', relaxed: '540px', spacious: '600px' };
const PROSE = { comfortable: '640px', relaxed: '760px', spacious: '900px' };
const PROSE_WIDE = { comfortable: '860px', relaxed: '980px', spacious: '1100px' };
// Target min width per piece; the grid fits as many columns as the window allows.
const ITEM_MIN = { small: '200px', medium: '290px', large: '400px' };
const SHADOW = {
  none: 'none',
  hard: 'var(--ez-border-width) var(--ez-border-width) 0 var(--ez-ink)',
  soft: '0 6px 24px rgba(0,0,0,0.12)',
};

/** Map design tokens onto the --ez-* CSS variables, as an inline style string. */
export function designVars(d: DesignTokens): string {
  const v: Record<string, string> = {
    '--ez-paper': d.color.background,
    '--ez-white': d.color.surface,
    '--ez-ink': d.color.text,
    '--ez-stone': d.color.muted,
    '--ez-blue': d.color.accent,
    '--ez-red': d.color.accent2,
    '--ez-yellow': d.color.accent2,
    '--ez-border': d.color.border,
    '--ez-link': d.color.link ?? d.color.accent,
    '--ez-heading': d.color.heading ?? d.color.text,
    // Adaptive pill text — readable on each status background, any theme.
    '--ez-pill-available-text': readableOn(d.color.accent),
    '--ez-pill-sold-text': readableOn(d.color.accent2),
    '--ez-pill-inquire-text': readableOn(mixHex(d.color.accent, d.color.accent2)),
    '--ez-pill-nfs-text': readableOn(d.color.muted),
    '--ez-font-display': `'${d.type.headingFont}', system-ui, sans-serif`,
    '--ez-font-body': `'${d.type.bodyFont}', system-ui, sans-serif`,
    '--ez-heading-weight': String(d.type.headingWeight),
    '--ez-body-weight': String(d.type.bodyWeight),
    '--ez-heading-transform': d.type.headingTransform,
    '--ez-heading-spacing': `${d.type.letterSpacing}em`,
    '--ez-radius': `${d.shape.radius}px`,
    '--ez-border-width': `${d.shape.borderWidth}px`,
    '--ez-shadow': SHADOW[d.shape.shadows],
    '--ez-gap': DENSITY_GAP[d.density],
    '--ez-item-min': ITEM_MIN[d.gallery.size],
    '--ez-gallery-gap': GUTTER[d.gallery.gutter],
    '--ez-content-max': CONTENT_WIDTH[d.contentWidth],
    '--ez-prose-narrow-max': PROSE_NARROW[d.readingWidth],
    '--ez-prose-max': PROSE[d.readingWidth],
    // Never let a text+media page run wider than the gallery width.
    '--ez-prose-wide-max': `min(${PROSE_WIDE[d.readingWidth]}, var(--ez-content-max))`,
  };
  return `font-size:${d.type.baseSize}px;` + Object.entries(v).map(([k, val]) => `${k}:${val}`).join(';');
}

/** Root classes that switch structural variants (so they preview live via CSS). */
export function designClasses(d: DesignTokens): string {
  const pages = ['about', 'contact', 'cv', 'press', 'exhibitions', 'news', 'available', 'presskit', 'commissions', 'shop', 'projects', 'stockists'] as const;
  return [
    `ez-nav-${d.nav.layout}`,
    `ez-thumb-${d.thumb.hover}`,
    `ez-fit-${d.thumb.fit}`,
    `ez-layout-${d.gallery.layout}`,
    `ez-bg-${d.background.type}`,
    `ez-light-${d.lightbox.transition}`,
    d.lightbox.zoom ? 'ez-lbzoom' : '',
    `ez-cap-${d.gallery.caption}`,
    `ez-card-${d.gallery.cardStyle}`,
    `ez-cap-detail-${d.gallery.captionDetail}`,
    `ez-home-${d.home.landing}`,
    `ez-heroalign-${d.hero.align}`,
    `ez-herosize-${d.hero.size}`,
    d.gallery.featureFirst ? 'ez-feature-first' : '',
    d.gallery.adaptiveSpans ? 'ez-adaptive-spans' : '',
    d.shape.shadows === 'none' ? 'ez-flat' : '',
    d.hero.enabled ? 'ez-hero-on' : 'ez-hero-off',
    d.logo.mode === 'image' ? 'ez-logo-image' : 'ez-logo-text',
    d.footer.socials ? '' : 'ez-footer-nosocial',
    d.footer.credit ? '' : 'ez-footer-nocredit',
    ...pages.filter((k) => !d.pages[k]).map((k) => `ez-page-${k}-off`),
  ]
    .filter(Boolean)
    .join(' ');
}

export function motionAttr(d: DesignTokens): 'full' | 'reduced' {
  return d.motion === 'none' ? 'reduced' : 'full';
}

/** A Google Fonts stylesheet href covering the chosen heading + body families. */
export function googleFontsHref(d: DesignTokens): string {
  const fams = new Map<string, Set<number>>();
  const add = (name: string, w: number) => {
    const set = fams.get(name) ?? new Set<number>();
    set.add(400);
    set.add(w);
    fams.set(name, set);
  };
  add(d.type.headingFont, d.type.headingWeight);
  add(d.type.bodyFont, d.type.bodyWeight);
  const families = [...fams.entries()]
    .map(([name, weights]) => `family=${name.replace(/ /g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ---------- Contrast (readability) checks ----------

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
  const a = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/** WCAG contrast ratio between two hex colors (1–21). Returns 21 if unparseable. */
export function contrastRatio(fg: string, bg: string): number {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return 21;
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

/** A data-URI SVG favicon: the artist's initials on their accent color. */
export function faviconDataUri(siteTitle: string, accent: string, fg: string): string {
  const initials =
    (siteTitle || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${accent}"/><text x="32" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="${fg}">${initials}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Pick black or white text — whichever is more readable on the given background. */
export function readableOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#161616', bg) ? '#ffffff' : '#161616';
}

/** Average two hex colors (approximates the inquire pill's color-mix). */
function mixHex(a: string, b: string): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const m = ra.map((v, i) => Math.round((v + rb[i]) / 2));
  return '#' + m.map((x) => x.toString(16).padStart(2, '0')).join('');
}

export interface ContrastIssue {
  label: string;
  ratio: number;
  min: number;
}

/** Flag color pairs that may be hard to read. Non-blocking — just a heads-up. */
export function contrastIssues(d: DesignTokens): ContrastIssue[] {
  const c = d.color;
  const checks: { label: string; fg: string; bg: string; min: number }[] = [
    { label: 'Body text on background', fg: c.text, bg: c.background, min: 4.5 },
    { label: 'Body text on cards', fg: c.text, bg: c.surface, min: 4.5 },
    { label: 'Muted text on background', fg: c.muted, bg: c.background, min: 3 },
    { label: 'Accent on background', fg: c.accent, bg: c.background, min: 3 },
    // Pill text is adaptive (readableOn), so this only warns for genuinely muddy accents.
    { label: 'Tag text on accent', fg: readableOn(c.accent), bg: c.accent, min: 3 },
    { label: 'Tag text on second accent', fg: readableOn(c.accent2), bg: c.accent2, min: 3 },
  ];
  return checks
    .map((ch) => ({ label: ch.label, ratio: Math.round(contrastRatio(ch.fg, ch.bg) * 10) / 10, min: ch.min }))
    .filter((ch) => ch.ratio < ch.min);
}

/**
 * One comprehensive, alphabetized font list, offered for both heading and body so
 * every font any preset uses is always pickable. (All on Google Fonts.) If a new
 * preset introduces a font, add it here too.
 */
export const FONTS = [
  'Anton', 'Archivo', 'Atkinson Hyperlegible', 'Bebas Neue', 'Bricolage Grotesque',
  'Cormorant Garamond', 'DM Serif Display', 'EB Garamond', 'Fraunces', 'Hanken Grotesk',
  'IBM Plex Sans', 'Inter', 'Jost', 'Karla', 'Libre Baskerville', 'Libre Franklin',
  'Lora', 'Mulish', 'Nunito Sans', 'Outfit', 'Playfair Display', 'Sora', 'Source Sans 3',
  'Space Grotesk', 'Spectral', 'Syne', 'Work Sans',
];

/** Both pickers use the same full list. */
export const SUGGESTED_FONTS = { heading: FONTS, body: FONTS };

/** A Google Fonts stylesheet covering the whole list — preloaded by the editor. */
export function allFontsHref(): string {
  const families = FONTS.map((name) => `family=${name.replace(/ /g, '+')}:wght@400;700`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Discipline starter templates — the wizard's "what do you make?" question. A
 * craft only seeds *layout* and the *pages* that medium tends to need; it never
 * touches styling (color/type/shape). The look comes entirely from the vibe step.
 */
export const DISCIPLINES: {
  id: string;
  label: string;
  overrides?: DesignOverride;
}[] = [
  { id: 'painter', label: 'Painter', overrides: { gallery: { layout: 'masonry' }, thumb: { fit: 'contain', hover: 'zoom' }, pages: { available: true, commissions: true } } },
  { id: 'photographer', label: 'Photographer', overrides: { gallery: { layout: 'grid' }, thumb: { fit: 'cover', hover: 'zoom' }, pages: { available: true } } },
  { id: 'ceramicist', label: 'Ceramicist / sculptor', overrides: { gallery: { layout: 'masonry' }, thumb: { fit: 'cover', hover: 'lift' }, pages: { available: true, commissions: true, shop: true, stockists: true } } },
  { id: 'illustrator', label: 'Illustrator', overrides: { gallery: { layout: 'masonry' }, thumb: { fit: 'contain', hover: 'zoom' }, pages: { commissions: true, shop: true, stockists: true } } },
  { id: 'designer', label: 'Designer', overrides: { gallery: { layout: 'grid' }, thumb: { fit: 'cover', hover: 'zoom' }, pages: { commissions: true, projects: true } } },
  { id: 'other', label: 'Something else', overrides: {} },
];

/**
 * Apply a craft to an existing design: reset layout + pages to their defaults,
 * then layer the craft's seeds on top — so switching crafts doesn't accumulate,
 * and the current styling is left untouched.
 */
export function applyDiscipline(base: DesignTokens, id: string): DesignTokens {
  const disc = DISCIPLINES.find((d) => d.id === id) ?? DISCIPLINES[0];
  const reset: DesignOverride = {
    gallery: DEFAULT_DESIGN.gallery,
    thumb: DEFAULT_DESIGN.thumb,
    nav: DEFAULT_DESIGN.nav,
    hero: DEFAULT_DESIGN.hero,
    home: DEFAULT_DESIGN.home,
    contentWidth: DEFAULT_DESIGN.contentWidth,
    readingWidth: DEFAULT_DESIGN.readingWidth,
    pages: DEFAULT_DESIGN.pages,
  };
  return mergeOver(mergeOver(base, reset), disc.overrides);
}

/**
 * Apply a vibe to an existing design: take the preset's full look — styling *and*
 * its layout — keeping only the pages the craft step chose (the one thing a vibe
 * shouldn't decide).
 */
export function applyVibe(base: DesignTokens, preset: string): DesignTokens {
  const p = resolveDesign({ preset });
  return { ...p, pages: base.pages };
}

/** Vibes — the wizard's first question + the Design tab gallery. Each maps to a preset. */
export const VIBES: { preset: string; label: string; blurb: string }[] = [
  { preset: 'minimal', label: 'Minimal & quiet', blurb: 'Clean, lots of space' },
  { preset: 'gallerywall', label: 'Gallery wall', blurb: 'Bare grid, title-only tags' },
  { preset: 'seamless', label: 'Seamless', blurb: 'Edge-to-edge, hover captions' },
  { preset: 'salon', label: 'Salon', blurb: 'Wide pieces span two columns' },
  { preset: 'monograph', label: 'Monograph', blurb: 'Your story is the homepage' },
  { preset: 'spotlight', label: 'Spotlight', blurb: 'One dramatic piece per row' },
  { preset: 'editorial', label: 'Editorial', blurb: 'Serif type, gallery feel' },
  { preset: 'classic', label: 'Classic serif', blurb: 'Elegant, timeless' },
  { preset: 'newsprint', label: 'Newsprint', blurb: 'Cream paper, ink type' },
  { preset: 'warm', label: 'Warm studio', blurb: 'Soft, earthy, rounded' },
  { preset: 'clay', label: 'Clay', blurb: 'Handmade and tactile' },
  { preset: 'botanical', label: 'Botanical', blurb: 'Greens and naturals' },
  { preset: 'sunset', label: 'Sunset', blurb: 'Warm corals and amber' },
  { preset: 'ocean', label: 'Ocean', blurb: 'Cool blues and teal' },
  { preset: 'pastel', label: 'Pastel', blurb: 'Soft and gentle' },
  { preset: 'candy', label: 'Candy', blurb: 'Bright and playful' },
  { preset: 'bauhaus', label: 'Playful & geometric', blurb: 'Primaries, hard edges' },
  { preset: 'zine', label: 'Zine', blurb: 'Riso pink + blue' },
  { preset: 'bold', label: 'Bold & graphic', blurb: 'Big type, high impact' },
  { preset: 'noir', label: 'Noir', blurb: 'Stark black & white' },
  { preset: 'brutalist', label: 'Brutalist', blurb: 'Raw, heavy, loud' },
  { preset: 'dark', label: 'Dark & moody', blurb: 'Low-light, dramatic' },
  { preset: 'midnight', label: 'Midnight', blurb: 'Deep blue night' },
  { preset: 'forest', label: 'Forest', blurb: 'Dark, green, calm' },
];

/** Theme presets: each is a bundle layered over the defaults. */
export const PRESETS: Record<string, { label: string; design: DesignTokens }> = {
  bauhaus: { label: 'Bauhaus', design: DEFAULT_DESIGN },
  minimal: {
    label: 'Minimal gallery',
    design: withDefaults({
      preset: 'minimal',
      color: { background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', muted: '#8a8a8a', accent: '#1a1a1a', accent2: '#b0392f', border: '#e5e5e5' },
      type: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 500, bodyWeight: 400, baseSize: 16, headingTransform: 'none', letterSpacing: -0.02 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
      thumb: { fit: 'contain', hover: 'none' },
      gallery: { layout: 'masonry' },
    }),
  },
  editorial: {
    label: 'Editorial',
    design: withDefaults({
      preset: 'editorial',
      color: { background: '#fbfaf7', surface: '#ffffff', text: '#23201c', muted: '#7a7468', accent: '#9a3b2e', accent2: '#2f6f5e', border: '#23201c' },
      type: { headingFont: 'Fraunces', bodyFont: 'Lora', headingWeight: 600, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
    }),
  },
  warm: {
    label: 'Warm studio',
    design: withDefaults({
      preset: 'warm',
      color: { background: '#f3ece2', surface: '#fffdf9', text: '#3e2c20', muted: '#8a7560', accent: '#c97b5a', accent2: '#8a9a5b', border: '#c9b9a6' },
      type: { headingFont: 'DM Serif Display', bodyFont: 'Nunito Sans', headingWeight: 400, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 14, borderWidth: 1, shadows: 'soft' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'lift' },
      gallery: { layout: 'masonry' },
    }),
  },
  dark: {
    label: 'Dark & moody',
    design: withDefaults({
      preset: 'dark',
      color: { background: '#141414', surface: '#1e1e1e', text: '#f2f2f2', muted: '#9a9a9a', accent: '#e6ff3d', accent2: '#ff36c9', border: '#333333' },
      type: { headingFont: 'Space Grotesk', bodyFont: 'Space Grotesk', headingWeight: 700, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: -0.01 },
      shape: { radius: 4, borderWidth: 1, shadows: 'none' },
      density: 'normal',
    }),
  },
  bold: {
    label: 'Bold',
    design: withDefaults({
      preset: 'bold',
      color: { background: '#fefefe', surface: '#ffffff', text: '#0a0a0a', muted: '#6a6a6a', accent: '#2b5bff', accent2: '#0a0a0a', border: '#0a0a0a' },
      type: { headingFont: 'Anton', bodyFont: 'Work Sans', headingWeight: 400, bodyWeight: 400, baseSize: 18, headingTransform: 'uppercase', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 3, shadows: 'hard' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'zoom' },
      gallery: { layout: 'grid', adaptiveSpans: true },
    }),
  },
  noir: {
    label: 'Noir',
    design: withDefaults({
      preset: 'noir',
      color: { background: '#ffffff', surface: '#ffffff', text: '#0a0a0a', muted: '#777777', accent: '#0a0a0a', accent2: '#d11d2a', border: '#0a0a0a' },
      type: { headingFont: 'Archivo', bodyFont: 'Inter', headingWeight: 800, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: -0.02 },
      shape: { radius: 0, borderWidth: 2, shadows: 'none' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'none' },
      gallery: { layout: 'grid', gutter: 'tight', cardStyle: 'bare', captionDetail: 'minimal' },
    }),
  },
  pastel: {
    label: 'Pastel',
    design: withDefaults({
      preset: 'pastel',
      color: { background: '#fbf7fb', surface: '#ffffff', text: '#3a2f4a', muted: '#9a8fb0', accent: '#9b7fd4', accent2: '#e58ab0', border: '#e6dcec' },
      type: { headingFont: 'Outfit', bodyFont: 'Nunito Sans', headingWeight: 600, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 18, borderWidth: 1, shadows: 'soft' },
      density: 'airy',
      thumb: { fit: 'cover', hover: 'lift' },
    }),
  },
  botanical: {
    label: 'Botanical',
    design: withDefaults({
      preset: 'botanical',
      color: { background: '#f4f1e8', surface: '#ffffff', text: '#2e3326', muted: '#7c8268', accent: '#5a7a4a', accent2: '#b07d3a', border: '#cfd0be' },
      type: { headingFont: 'Fraunces', bodyFont: 'Lora', headingWeight: 600, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 6, borderWidth: 1, shadows: 'none' },
      density: 'airy',
    }),
  },
  sunset: {
    label: 'Sunset',
    design: withDefaults({
      preset: 'sunset',
      color: { background: '#fff6ef', surface: '#ffffff', text: '#4a2c2a', muted: '#a07b6f', accent: '#e8683a', accent2: '#f2a93b', border: '#f0d6c4' },
      type: { headingFont: 'DM Serif Display', bodyFont: 'Nunito Sans', headingWeight: 400, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 12, borderWidth: 1, shadows: 'soft' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'zoom' },
    }),
  },
  ocean: {
    label: 'Ocean',
    design: withDefaults({
      preset: 'ocean',
      color: { background: '#f2f8fb', surface: '#ffffff', text: '#14323f', muted: '#6a8a96', accent: '#1287a8', accent2: '#0e5a7a', border: '#cfe2ea' },
      type: { headingFont: 'Outfit', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 10, borderWidth: 1, shadows: 'none' },
      density: 'normal',
    }),
  },
  zine: {
    label: 'Zine',
    design: withDefaults({
      preset: 'zine',
      color: { background: '#fdf3f0', surface: '#ffffff', text: '#1a1a1a', muted: '#8a6f6f', accent: '#ff4d8d', accent2: '#2b4cff', border: '#1a1a1a' },
      type: { headingFont: 'Space Grotesk', bodyFont: 'Space Grotesk', headingWeight: 700, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: -0.01 },
      shape: { radius: 0, borderWidth: 2, shadows: 'none' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'zoom' },
      gallery: { layout: 'grid' },
    }),
  },
  newsprint: {
    label: 'Newsprint',
    design: withDefaults({
      preset: 'newsprint',
      color: { background: '#f4f1e9', surface: '#faf8f2', text: '#1c1a17', muted: '#7a756a', accent: '#1c1a17', accent2: '#8a1f1f', border: '#1c1a17' },
      type: { headingFont: 'Playfair Display', bodyFont: 'Lora', headingWeight: 700, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
    }),
  },
  candy: {
    label: 'Candy',
    design: withDefaults({
      preset: 'candy',
      color: { background: '#fffdf5', surface: '#ffffff', text: '#2a1a3a', muted: '#9a87a8', accent: '#ff5ca8', accent2: '#00c2c7', border: '#2a1a3a' },
      type: { headingFont: 'Outfit', bodyFont: 'Work Sans', headingWeight: 700, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: -0.01 },
      shape: { radius: 20, borderWidth: 2, shadows: 'hard' },
      density: 'normal',
      thumb: { fit: 'cover', hover: 'lift' },
    }),
  },
  midnight: {
    label: 'Midnight',
    design: withDefaults({
      preset: 'midnight',
      color: { background: '#0d1424', surface: '#141d33', text: '#eaf0ff', muted: '#8a96b3', accent: '#5b8cff', accent2: '#c0a3ff', border: '#283250' },
      type: { headingFont: 'Outfit', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: -0.01 },
      shape: { radius: 8, borderWidth: 1, shadows: 'none' },
      density: 'normal',
    }),
  },
  forest: {
    label: 'Forest',
    design: withDefaults({
      preset: 'forest',
      color: { background: '#10160f', surface: '#18211a', text: '#eaf3e6', muted: '#8aa088', accent: '#7fc15e', accent2: '#d9a441', border: '#2a3a2a' },
      type: { headingFont: 'Fraunces', bodyFont: 'Nunito Sans', headingWeight: 600, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 6, borderWidth: 1, shadows: 'none' },
      density: 'normal',
    }),
  },
  clay: {
    label: 'Clay',
    design: withDefaults({
      preset: 'clay',
      color: { background: '#f0e6dd', surface: '#fbf5ef', text: '#3c2a22', muted: '#8a7060', accent: '#c2643f', accent2: '#6a8f86', border: '#d8c4b4' },
      type: { headingFont: 'DM Serif Display', bodyFont: 'Lora', headingWeight: 400, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 14, borderWidth: 1, shadows: 'soft' },
      density: 'airy',
      thumb: { fit: 'cover', hover: 'lift' },
      gallery: { layout: 'masonry' },
    }),
  },
  brutalist: {
    label: 'Brutalist',
    design: withDefaults({
      preset: 'brutalist',
      color: { background: '#e8e8e3', surface: '#ffffff', text: '#111111', muted: '#666660', accent: '#1f1f1f', accent2: '#ff3b00', border: '#111111' },
      type: { headingFont: 'Archivo', bodyFont: 'IBM Plex Sans', headingWeight: 800, bodyWeight: 400, baseSize: 17, headingTransform: 'uppercase', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 3, shadows: 'hard' },
      density: 'compact',
      thumb: { fit: 'cover', hover: 'zoom' },
      gallery: { layout: 'grid', gutter: 'none' },
    }),
  },
  classic: {
    label: 'Classic serif',
    design: withDefaults({
      preset: 'classic',
      color: { background: '#fcfbf9', surface: '#ffffff', text: '#22201d', muted: '#7d7972', accent: '#3a4a5a', accent2: '#9a6a3a', border: '#ddd8cf' },
      type: { headingFont: 'Cormorant Garamond', bodyFont: 'EB Garamond', headingWeight: 600, bodyWeight: 400, baseSize: 19, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 2, borderWidth: 1, shadows: 'none' },
      density: 'airy',
    }),
  },
  // Bare, even grid of square crops with title-only tags — the work carries the page.
  gallerywall: {
    label: 'Gallery wall',
    design: withDefaults({
      preset: 'gallerywall',
      color: { background: '#ffffff', surface: '#ffffff', text: '#171717', muted: '#9b9b9b', accent: '#171717', accent2: '#a33a2f', border: '#ececec' },
      type: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 500, bodyWeight: 400, baseSize: 16, headingTransform: 'none', letterSpacing: -0.01 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
      contentWidth: 'wide',
      nav: { layout: 'top' },
      thumb: { fit: 'cover', hover: 'none' },
      gallery: { layout: 'grid', size: 'medium', gutter: 'tight', caption: 'below', cardStyle: 'bare', captionDetail: 'minimal' },
    }),
  },
  // Edge-to-edge grid, no gaps; details slide up only on hover. Stark and immersive.
  seamless: {
    label: 'Seamless',
    design: withDefaults({
      preset: 'seamless',
      color: { background: '#ffffff', surface: '#ffffff', text: '#0a0a0a', muted: '#737373', accent: '#0a0a0a', accent2: '#ff3b30', border: '#0a0a0a' },
      type: { headingFont: 'Archivo', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400, baseSize: 16, headingTransform: 'none', letterSpacing: -0.02 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'compact',
      contentWidth: 'wide',
      nav: { layout: 'top' },
      thumb: { fit: 'cover', hover: 'none' },
      gallery: { layout: 'grid', size: 'large', gutter: 'none', caption: 'hover', cardStyle: 'bare', captionDetail: 'full' },
    }),
  },
  // Mixed-orientation hang: wide pieces span two columns, portraits sit one across.
  salon: {
    label: 'Salon',
    design: withDefaults({
      preset: 'salon',
      color: { background: '#f7f4ef', surface: '#ffffff', text: '#1f1d1a', muted: '#7c766c', accent: '#3a4a5a', accent2: '#9a3b2e', border: '#1f1d1a' },
      type: { headingFont: 'Fraunces', bodyFont: 'Hanken Grotesk', headingWeight: 500, bodyWeight: 400, baseSize: 17, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'normal',
      thumb: { fit: 'contain', hover: 'lift' },
      gallery: { layout: 'grid', size: 'medium', gutter: 'loose', caption: 'below', captionDetail: 'minimal', adaptiveSpans: true },
    }),
  },
  // Your story leads: the about page is the landing, work lives one click away.
  monograph: {
    label: 'Monograph',
    design: withDefaults({
      preset: 'monograph',
      color: { background: '#faf8f4', surface: '#ffffff', text: '#201d1a', muted: '#7b7568', accent: '#9a3b2e', accent2: '#2f6f5e', border: '#ddd6c9' },
      type: { headingFont: 'Cormorant Garamond', bodyFont: 'EB Garamond', headingWeight: 600, bodyWeight: 400, baseSize: 19, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
      nav: { layout: 'top' },
      home: { landing: 'about' },
      gallery: { layout: 'masonry', caption: 'below' },
    }),
  },
  // One dramatic piece per row, centered in a dark room with a big title up top.
  spotlight: {
    label: 'Spotlight',
    design: withDefaults({
      preset: 'spotlight',
      color: { background: '#101010', surface: '#161616', text: '#f0f0f0', muted: '#8a8a8a', accent: '#e8e2d4', accent2: '#c2643f', border: '#2a2a2a' },
      type: { headingFont: 'Spectral', bodyFont: 'Spectral', headingWeight: 600, bodyWeight: 400, baseSize: 18, headingTransform: 'none', letterSpacing: 0 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'normal',
      thumb: { fit: 'contain', hover: 'none' },
      gallery: { layout: 'cinematic', size: 'large', caption: 'below', captionDetail: 'minimal' },
      hero: { enabled: true, align: 'center', size: 'large' },
    }),
  },
};
