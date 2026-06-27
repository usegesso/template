/**
 * Normalize a YouTube/Vimeo share URL into an embeddable iframe src. We don't host
 * video (that's outside Easel's "host nothing" model) — artists paste a link and we
 * render the provider's player. Returns null for anything we don't recognize.
 */
export function toEmbedSrc(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');

  // YouTube: watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(embed|shorts)\/([\w-]+)/)?.[2];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID
  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id ?? '') ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === 'player.vimeo.com') {
    return url; // already an embed URL
  }

  return null;
}

/**
 * Resolve an audio URL into something we can render. A direct audio file plays in
 * a native <audio> element; a SoundCloud track URL plays in SoundCloud's widget
 * iframe (the only host whose player src we can derive from a plain URL). Returns
 * null for anything we don't recognize, so the page just skips it.
 */
export function toAudioEmbed(url: string): { kind: 'file'; src: string } | { kind: 'iframe'; src: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  // Direct, self-hosted (or any CDN) audio file.
  if (/\.(mp3|ogg|oga|wav|m4a|aac|flac)(\?.*)?$/i.test(u.pathname)) {
    return { kind: 'file', src: url };
  }

  // SoundCloud: feed the track/set URL to the widget player.
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'soundcloud.com' || host === 'm.soundcloud.com') {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      `https://soundcloud.com${u.pathname}`,
    )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`;
    return { kind: 'iframe', src };
  }

  // Bandcamp: their per-release IDs aren't derivable from a public URL, so we only
  // accept a ready-made EmbeddedPlayer URL (artist copies it from Bandcamp's Share
  // → Embed dialog and pastes it in).
  if (host === 'bandcamp.com' && u.pathname.startsWith('/EmbeddedPlayer')) {
    return { kind: 'iframe', src: url };
  }

  return null;
}
