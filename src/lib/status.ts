/**
 * The artwork sale-status vocabulary, shared by the content schema
 * (content/config.ts), the public StatusPill, and the editor's preview filler so
 * the four statuses and their canonical labels are defined exactly once.
 *
 * Note: the editor's Artworks grid intentionally shows a friendlier 'Ask me' for
 * `inquire`, so it keeps its own label map rather than reusing STATUS_LABELS.
 */
export const ARTWORK_STATUSES = ['available', 'sold', 'inquire', 'nfs'] as const;
export type ArtworkStatus = (typeof ARTWORK_STATUSES)[number];

export const STATUS_LABELS: Record<ArtworkStatus, string> = {
  available: 'Available',
  sold: 'Sold',
  inquire: 'Inquire',
  nfs: 'Not for sale',
};
