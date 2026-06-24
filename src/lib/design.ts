/**
 * Easel design-token system. Artist sites render entirely from these tokens, so a
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
  motion: 'smooth' | 'rigid' | 'none';
  nav: { layout: 'side' | 'top' };
  logo: { mode: 'none' | 'text' | 'image'; image?: string };
  background: { type: 'solid' | 'texture' | 'none' };
  thumb: { fit: 'cover' | 'contain'; hover: 'none' | 'zoom' | 'lift' };
  lightbox: { transition: 'fade' | 'slide' };
  hero: { enabled: boolean };
  pages: { about: boolean; contact: boolean; cv: boolean; press: boolean };
}

export const DEFAULT_DESIGN: DesignTokens = {
  preset: 'bauhaus',
  color: {
    background: '#f7f4ec',
    surface: '#ffffff',
    text: '#161616',
    muted: '#6b6b63',
    accent: '#1d4ed8',
    accent2: '#e63946',
    border: '#161616',
  },
  type: {
    headingFont: 'Syne',
    bodyFont: 'Space Grotesk',
    headingWeight: 700,
    bodyWeight: 400,
    baseSize: 17,
    headingTransform: 'none',
    letterSpacing: -0.01,
  },
  shape: { radius: 0, borderWidth: 2, shadows: 'hard' },
  density: 'normal',
  motion: 'smooth',
  nav: { layout: 'side' },
  logo: { mode: 'none' },
  background: { type: 'solid' },
  thumb: { fit: 'cover', hover: 'zoom' },
  lightbox: { transition: 'fade' },
  hero: { enabled: false },
  pages: { about: true, contact: true, cv: true, press: true },
};

/** Deep-merge a partial design over a base token bundle. */
function mergeOver(base: DesignTokens, partial: Partial<DesignTokens> | undefined): DesignTokens {
  const d = (partial ?? {}) as Partial<DesignTokens>;
  return {
    ...base,
    ...d,
    preset: d.preset ?? base.preset,
    color: { ...base.color, ...(d.color ?? {}) },
    type: { ...base.type, ...(d.type ?? {}) },
    shape: { ...base.shape, ...(d.shape ?? {}) },
    nav: { ...base.nav, ...(d.nav ?? {}) },
    logo: { ...base.logo, ...(d.logo ?? {}) },
    background: { ...base.background, ...(d.background ?? {}) },
    thumb: { ...base.thumb, ...(d.thumb ?? {}) },
    lightbox: { ...base.lightbox, ...(d.lightbox ?? {}) },
    hero: { ...base.hero, ...(d.hero ?? {}) },
    pages: { ...base.pages, ...(d.pages ?? {}) },
  };
}

/** Merge a partial design over the Bauhaus defaults (used to build presets). */
export function withDefaults(partial: Partial<DesignTokens> | undefined): DesignTokens {
  return mergeOver(DEFAULT_DESIGN, partial);
}

/**
 * Resolve stored `settings.design` into a full token set: start from the named
 * preset's bundle (or Bauhaus), then layer any granular overrides on top. So
 * `{ preset: 'editorial' }` themes the whole site, and tweaks just add fields.
 */
export function resolveDesign(partial: Partial<DesignTokens> | undefined): DesignTokens {
  const base = (partial?.preset && PRESETS[partial.preset]?.design) || DEFAULT_DESIGN;
  return mergeOver(base, partial);
}

const DENSITY_GAP = { compact: '1rem', normal: '1.5rem', airy: '2.5rem' };
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
    '--ez-border': d.color.border,
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
  };
  return `font-size:${d.type.baseSize}px;` + Object.entries(v).map(([k, val]) => `${k}:${val}`).join(';');
}

/** Root classes that switch structural variants (so they preview live via CSS). */
export function designClasses(d: DesignTokens): string {
  const pages = ['about', 'contact', 'cv', 'press'] as const;
  return [
    `ez-nav-${d.nav.layout}`,
    `ez-thumb-${d.thumb.hover}`,
    `ez-bg-${d.background.type}`,
    `ez-light-${d.lightbox.transition}`,
    d.shape.shadows === 'none' ? 'ez-flat' : '',
    d.hero.enabled ? 'ez-hero-on' : 'ez-hero-off',
    d.logo.mode === 'image' ? 'ez-logo-image' : 'ez-logo-text',
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

/** Curated fonts offered in the editor (all available on Google Fonts). */
export const SUGGESTED_FONTS = {
  heading: ['Syne', 'Archivo', 'Anton', 'Playfair Display', 'Fraunces', 'DM Serif Display', 'Space Grotesk', 'Outfit'],
  body: ['Space Grotesk', 'Inter', 'Work Sans', 'Outfit', 'Libre Baskerville', 'Lora', 'Nunito Sans'],
};

/** Theme presets: each is a bundle layered over the defaults. */
export const PRESETS: Record<string, { label: string; design: DesignTokens }> = {
  bauhaus: { label: 'Bauhaus', design: DEFAULT_DESIGN },
  minimal: {
    label: 'Minimal gallery',
    design: withDefaults({
      preset: 'minimal',
      color: { background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', muted: '#8a8a8a', accent: '#1a1a1a', accent2: '#1a1a1a', border: '#e5e5e5' },
      type: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 500, bodyWeight: 400, baseSize: 16, headingTransform: 'none', letterSpacing: -0.02 },
      shape: { radius: 0, borderWidth: 1, shadows: 'none' },
      density: 'airy',
      thumb: { fit: 'cover', hover: 'none' },
    }),
  },
  editorial: {
    label: 'Editorial',
    design: withDefaults({
      preset: 'editorial',
      color: { background: '#fbfaf7', surface: '#ffffff', text: '#23201c', muted: '#7a7468', accent: '#9a3b2e', accent2: '#9a3b2e', border: '#23201c' },
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
    }),
  },
};
