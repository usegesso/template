/**
 * Filler grid entries for the editor's live preview.
 *
 * A brand-new artist has no artwork, so the home page renders the first-run block
 * instead of the gallery (see src/pages/index.astro) — leaving the wizard / Design-tab
 * preview with nothing to "lay out". LivePreview.svelte injects these stock-shape +
 * fake-title cards so the gallery layout decisions (grid/masonry, piece size, crop,
 * captions, feature-first) are actually visible. The filler is preview-only and never
 * committed; it vanishes the moment real work exists.
 *
 * The DOM these drive (in LivePreview's injectFiller) mirrors ArtworkCard.astro /
 * StatusPill.astro — keep them in sync if that structure changes.
 */
import { type ArtworkStatus, STATUS_LABELS } from '../../lib/status';

export type FillerStatus = ArtworkStatus;

export interface FillerEntry {
  title: string;
  year: number;
  medium: string;
  status: FillerStatus;
  price?: string;
  /** Thumbnail height ÷ width. Varied so masonry staggers and "Keep original shape"
   *  reads differently from "Crop to squares". */
  ratio: number;
}

/** Status → label (canonical public labels; shared with StatusPill.astro). */
export const FILLER_STATUS_LABELS = STATUS_LABELS;

export const FILLER_ENTRIES: FillerEntry[] = [
  { title: 'Composition in Blue', year: 2024, medium: 'Oil on canvas', status: 'available', price: '$1,800', ratio: 1.25 },
  { title: 'Red Square Study', year: 2024, medium: 'Acrylic on panel', status: 'sold', ratio: 0.8 },
  { title: 'Yellow Triangle', year: 2023, medium: 'Screenprint', status: 'inquire', ratio: 1 },
  { title: 'Quiet Geometry', year: 2023, medium: 'Gouache on paper', status: 'nfs', ratio: 1.4 },
  { title: 'Two Forms Meeting', year: 2022, medium: 'Oil on linen', status: 'available', price: '$2,400', ratio: 0.75 },
  { title: 'Field Notes', year: 2022, medium: 'Mixed media', status: 'available', price: '$960', ratio: 1.1 },
];

const PALETTE = ['#1d4ed8', '#e63946', '#f4c20d']; // Bauhaus blue / red / yellow
const GROUND = '#f7f4ec';

/**
 * A deterministic Bauhaus stock-shape thumbnail as a data-URI SVG (cream ground +
 * circle + rect). `ratio` = height ÷ width. Also used by the demo backend for missing
 * images (demo.ts), so stock-shape generation lives in one place.
 */
export function shapeImage(seed: string, ratio = 1): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const w = 400;
  const ht = Math.round(w * ratio);
  const a = PALETTE[h % 3];
  const b = PALETTE[(h >> 3) % 3];
  const cy = Math.round(ht * 0.4);
  const r = Math.round(Math.min(w, ht) * 0.22);
  const rectXY = Math.round(ht * 0.45);
  const rectSize = Math.round(Math.min(w, ht) * 0.38);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${ht}">` +
    `<rect width="${w}" height="${ht}" fill="${GROUND}"/>` +
    `<circle cx="150" cy="${cy}" r="${r}" fill="${a}"/>` +
    `<rect x="200" y="${rectXY}" width="${rectSize}" height="${rectSize}" fill="${b}"/>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
