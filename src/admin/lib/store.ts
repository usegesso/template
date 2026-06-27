/**
 * High-level content operations for the Easel editor: load and save artworks,
 * series, pages, and settings through the GitHub client. Each save is one commit.
 */
import { GitHub, fileToBase64, type FileChange } from './github';
import {
  PATHS,
  parseFrontmatter,
  toMarkdown,
  toJson,
  slugify,
  type Artwork,
  type Series,
  type Post,
  type Exhibition,
  type Testimonial,
  type AboutPage,
  type ContactPage,
  type CvPage,
  type PressPage,
  type Settings,
} from './content';

const ARTWORK_IMG_REL = '../../assets/artworks';
const ARTWORK_IMG_DIR = `${PATHS.assets}/artworks`;

// ---------- Artworks ----------

export async function loadArtworks(gh: GitHub): Promise<Artwork[]> {
  const entries = (await gh.listDir(PATHS.artworks)).filter((e) => e.name.endsWith('.md'));
  const items = await Promise.all(
    entries.map(async (e) => {
      const file = await gh.getFile(e.path);
      const { data, body } = parseFrontmatter(file?.text ?? '');
      const art: Artwork = {
        id: e.name.replace(/\.md$/, ''),
        image: data.image ?? '',
        images: Array.isArray(data.images) ? data.images : [],
        title: data.title ?? 'Untitled',
        year: data.year,
        medium: data.medium,
        dimensions: data.dimensions,
        status: data.status ?? 'available',
        price: data.price,
        buyLink: data.buyLink,
        alt: data.alt ?? '',
        collection: data.collection,
        video: data.video,
        order: typeof data.order === 'number' ? data.order : 0,
        featured: !!data.featured,
        body,
      };
      return art;
    }),
  );
  return items.sort((a, b) => a.order - b.order);
}

function artworkToMd(a: Artwork): string {
  return toMarkdown(
    {
      image: a.image,
      images: a.images?.length ? a.images : undefined,
      title: a.title,
      year: a.year,
      medium: a.medium,
      dimensions: a.dimensions,
      status: a.status,
      price: a.status === 'available' ? a.price : undefined,
      buyLink: a.status === 'available' ? a.buyLink : undefined,
      alt: a.alt,
      collection: a.collection,
      video: a.video,
      order: a.order,
      featured: a.featured,
    },
    a.body,
  );
}

/** An ordered gallery entry: either an already-saved path or a freshly chosen file. */
export type GalleryItem = { path?: string; file?: File };

/**
 * Save one artwork. `imageFile` (if set) replaces the cover; `gallery` is the
 * ordered list of extra shots — existing ones keep their path, newly chosen files
 * are uploaded. Cover + every new gallery image + the .md go in ONE commit, so the
 * site rebuilds once.
 */
export async function saveArtwork(
  gh: GitHub,
  art: Artwork,
  imageFile: File | null,
  gallery: GalleryItem[],
  isNew: boolean,
): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.artworks, slugify(art.title)) : art.id;
  const changes: FileChange[] = [];

  const upload = async (file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fname = `${id}-${shortStamp()}.${ext}`; // shortStamp() is random, so it's unique per call
    changes.push({ path: `${ARTWORK_IMG_DIR}/${fname}`, content: await fileToBase64(file), encoding: 'base64' });
    return `${ARTWORK_IMG_REL}/${fname}`;
  };

  if (imageFile) art.image = await upload(imageFile);

  // Resolve the gallery in order: keep existing paths, upload new files.
  const images: string[] = [];
  for (const item of gallery) {
    if (item.file) images.push(await upload(item.file));
    else if (item.path) images.push(item.path);
  }
  art.images = images;

  changes.push({ path: `${PATHS.artworks}/${id}.md`, content: artworkToMd({ ...art, id }) });
  await gh.commit(changes, `${isNew ? 'Add' : 'Update'} artwork: ${art.title}`);
  return id;
}

export async function deleteArtwork(gh: GitHub, art: Artwork): Promise<void> {
  await gh.commit([{ path: `${PATHS.artworks}/${art.id}.md`, remove: true }], `Remove artwork: ${art.title}`);
}

/** Filename → a friendly title: "blue_study-02.jpg" → "Blue Study 02". */
function titleFromFilename(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled'
  );
}

/**
 * Add many photos at once in a SINGLE commit (so the site rebuilds once, not N
 * times). Each becomes a draft artwork titled from its filename, ready for the
 * artist to flesh out. The biggest day-2 friction is adding work one-at-a-time;
 * this removes it. Returns how many were added.
 */
export async function bulkAddArtworks(gh: GitHub, files: File[]): Promise<number> {
  if (!files.length) return 0;
  const existing = new Set((await gh.listDir(PATHS.artworks)).map((e) => e.name.replace(/\.md$/, '')));
  const startOrder = existing.size;
  const changes: FileChange[] = [];

  let i = 0;
  for (const file of files) {
    const title = titleFromFilename(file.name);
    // Unique id across what's on disk AND what we're adding in this same batch.
    let id = slugify(title);
    if (existing.has(id)) {
      let n = 2;
      while (existing.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    existing.add(id);

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fname = `${id}-${shortStamp()}.${ext}`;
    const art: Artwork = {
      id,
      image: `${ARTWORK_IMG_REL}/${fname}`,
      title,
      status: 'available',
      // Seed alt with the title so the schema's required field is satisfied; the
      // artist should refine it, but a draft shouldn't fail the build.
      alt: title,
      order: startOrder + i,
      featured: false,
      body: '',
    };
    changes.push({ path: `${ARTWORK_IMG_DIR}/${fname}`, content: await fileToBase64(file), encoding: 'base64' });
    changes.push({ path: `${PATHS.artworks}/${id}.md`, content: artworkToMd(art) });
    i++;
  }

  await gh.commit(changes, `Add ${files.length} artwork${files.length > 1 ? 's' : ''}`);
  return files.length;
}

/** Persist a new display order by rewriting each artwork's `order`. One commit. */
export async function reorderArtworks(gh: GitHub, ordered: Artwork[]): Promise<void> {
  const changes: FileChange[] = [];
  ordered.forEach((a, i) => {
    if (a.order !== i) {
      a.order = i;
      changes.push({ path: `${PATHS.artworks}/${a.id}.md`, content: artworkToMd(a) });
    }
  });
  if (changes.length) await gh.commit(changes, 'Reorder artwork');
}

// ---------- Series ----------

export async function loadSeries(gh: GitHub): Promise<Series[]> {
  const entries = (await gh.listDir(PATHS.series)).filter((e) => e.name.endsWith('.md'));
  const items = await Promise.all(
    entries.map(async (e) => {
      const file = await gh.getFile(e.path);
      const { data, body } = parseFrontmatter(file?.text ?? '');
      return {
        id: e.name.replace(/\.md$/, ''),
        title: data.title ?? 'Untitled',
        description: data.description,
        cover: data.cover,
        order: typeof data.order === 'number' ? data.order : 0,
        body,
      } as Series;
    }),
  );
  return items.sort((a, b) => a.order - b.order);
}

export async function saveSeries(gh: GitHub, s: Series, isNew: boolean): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.series, slugify(s.title)) : s.id;
  const md = toMarkdown(
    { title: s.title, description: s.description, cover: s.cover, order: s.order },
    s.body,
  );
  await gh.commit([{ path: `${PATHS.series}/${id}.md`, content: md }], `${isNew ? 'Add' : 'Update'} series: ${s.title}`);
  return id;
}

export async function deleteSeries(gh: GitHub, s: Series): Promise<void> {
  await gh.commit([{ path: `${PATHS.series}/${s.id}.md`, remove: true }], `Remove series: ${s.title}`);
}

// ---------- Posts (news) ----------

export async function loadPosts(gh: GitHub): Promise<Post[]> {
  const entries = (await gh.listDir(PATHS.posts)).filter((e) => e.name.endsWith('.md'));
  const items = await Promise.all(
    entries.map(async (e) => {
      const file = await gh.getFile(e.path);
      const { data, body } = parseFrontmatter(file?.text ?? '');
      return {
        id: e.name.replace(/\.md$/, ''),
        title: data.title ?? 'Untitled',
        date: data.date ?? '',
        excerpt: data.excerpt,
        cover: data.cover,
        draft: !!data.draft,
        body,
      } as Post;
    }),
  );
  // Newest first.
  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function savePost(gh: GitHub, p: Post, isNew: boolean): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.posts, slugify(p.title)) : p.id;
  const md = toMarkdown(
    { title: p.title, date: p.date, excerpt: p.excerpt, cover: p.cover, draft: p.draft },
    p.body,
  );
  await gh.commit([{ path: `${PATHS.posts}/${id}.md`, content: md }], `${isNew ? 'Add' : 'Update'} post: ${p.title}`);
  return id;
}

export async function deletePost(gh: GitHub, p: Post): Promise<void> {
  await gh.commit([{ path: `${PATHS.posts}/${p.id}.md`, remove: true }], `Remove post: ${p.title}`);
}

// ---------- Exhibitions (shows) ----------

export async function loadExhibitions(gh: GitHub): Promise<Exhibition[]> {
  const entries = (await gh.listDir(PATHS.exhibitions)).filter((e) => e.name.endsWith('.md'));
  const items = await Promise.all(
    entries.map(async (e) => {
      const file = await gh.getFile(e.path);
      const { data } = parseFrontmatter(file?.text ?? '');
      return {
        id: e.name.replace(/\.md$/, ''),
        title: data.title ?? 'Untitled',
        venue: data.venue,
        location: data.location,
        startDate: data.startDate ?? '',
        endDate: data.endDate,
        url: data.url,
        description: data.description,
        draft: !!data.draft,
      } as Exhibition;
    }),
  );
  // Most recent / soonest first by start date.
  return items.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export async function saveExhibition(gh: GitHub, x: Exhibition, isNew: boolean): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.exhibitions, slugify(x.title)) : x.id;
  const md = toMarkdown(
    {
      title: x.title,
      venue: x.venue,
      location: x.location,
      startDate: x.startDate,
      endDate: x.endDate,
      url: x.url,
      description: x.description,
      draft: x.draft,
    },
    '',
  );
  await gh.commit([{ path: `${PATHS.exhibitions}/${id}.md`, content: md }], `${isNew ? 'Add' : 'Update'} exhibition: ${x.title}`);
  return id;
}

export async function deleteExhibition(gh: GitHub, x: Exhibition): Promise<void> {
  await gh.commit([{ path: `${PATHS.exhibitions}/${x.id}.md`, remove: true }], `Remove exhibition: ${x.title}`);
}

// ---------- Testimonials (praise) ----------

export async function loadTestimonials(gh: GitHub): Promise<Testimonial[]> {
  const entries = (await gh.listDir(PATHS.testimonials)).filter((e) => e.name.endsWith('.md'));
  const items = await Promise.all(
    entries.map(async (e) => {
      const file = await gh.getFile(e.path);
      const { data } = parseFrontmatter(file?.text ?? '');
      return {
        id: e.name.replace(/\.md$/, ''),
        quote: data.quote ?? '',
        author: data.author ?? '',
        role: data.role,
        order: typeof data.order === 'number' ? data.order : 0,
      } as Testimonial;
    }),
  );
  return items.sort((a, b) => a.order - b.order);
}

export async function saveTestimonial(gh: GitHub, t: Testimonial, isNew: boolean): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.testimonials, slugify(t.author || t.quote.slice(0, 24))) : t.id;
  const md = toMarkdown(
    { quote: t.quote, author: t.author, role: t.role, order: t.order },
    '',
  );
  await gh.commit([{ path: `${PATHS.testimonials}/${id}.md`, content: md }], `${isNew ? 'Add' : 'Update'} testimonial: ${t.author}`);
  return id;
}

export async function deleteTestimonial(gh: GitHub, t: Testimonial): Promise<void> {
  await gh.commit([{ path: `${PATHS.testimonials}/${t.id}.md`, remove: true }], `Remove testimonial: ${t.author}`);
}

// ---------- Pages ----------

async function loadPage(gh: GitHub, name: string): Promise<{ data: Record<string, any>; body: string }> {
  const file = await gh.getFile(`${PATHS.pages}/${name}.md`);
  return parseFrontmatter(file?.text ?? '');
}

export async function loadAbout(gh: GitHub): Promise<AboutPage> {
  const { data, body } = await loadPage(gh, 'about');
  return { title: data.title ?? 'About', portrait: data.portrait, statement: data.statement, body };
}
export async function loadContact(gh: GitHub): Promise<ContactPage> {
  const { data, body } = await loadPage(gh, 'contact');
  return { title: data.title ?? 'Contact', intro: data.intro, email: data.email, formEnabled: data.formEnabled !== false, body };
}
export async function loadCv(gh: GitHub): Promise<CvPage> {
  const { data } = await loadPage(gh, 'cv');
  return { title: data.title ?? 'CV', cv: Array.isArray(data.cv) ? data.cv : [] };
}
export async function loadPress(gh: GitHub): Promise<PressPage> {
  const { data } = await loadPage(gh, 'press');
  return { title: data.title ?? 'Press', press: Array.isArray(data.press) ? data.press : [] };
}

export async function saveAbout(gh: GitHub, p: AboutPage): Promise<void> {
  const md = toMarkdown({ title: p.title, portrait: p.portrait, statement: p.statement }, p.body);
  await gh.commit([{ path: `${PATHS.pages}/about.md`, content: md }], 'Update About page');
}
export async function saveContact(gh: GitHub, p: ContactPage): Promise<void> {
  const md = toMarkdown(
    { title: p.title, intro: p.intro, email: p.email, formEnabled: p.formEnabled },
    p.body,
  );
  await gh.commit([{ path: `${PATHS.pages}/contact.md`, content: md }], 'Update Contact page');
}
export async function saveCv(gh: GitHub, p: CvPage): Promise<void> {
  const md = toMarkdown({ title: p.title, cv: p.cv }, '');
  await gh.commit([{ path: `${PATHS.pages}/cv.md`, content: md }], 'Update CV page');
}
export async function savePress(gh: GitHub, p: PressPage): Promise<void> {
  const md = toMarkdown({ title: p.title, press: p.press }, '');
  await gh.commit([{ path: `${PATHS.pages}/press.md`, content: md }], 'Update Press page');
}

// ---------- Settings ----------

export async function loadSettings(gh: GitHub): Promise<Settings> {
  const file = await gh.getFile(PATHS.settings);
  const data = file ? JSON.parse(file.text) : {};
  return {
    siteTitle: data.siteTitle ?? '',
    tagline: data.tagline,
    logoText: data.logoText ?? '',
    theme: data.theme ?? 'default',
    portfolioLayout: data.portfolioLayout ?? 'grid',
    columns: data.columns ?? 3,
    motionDefault: data.motionDefault ?? 'full',
    rightClickProtect: !!data.rightClickProtect,
    watermark: !!data.watermark,
    watermarkText: data.watermarkText,
    metaDescription: data.metaDescription,
    ogImage: data.ogImage,
    socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
    linksEnabled: !!data.linksEnabled,
    linksDisplayName: data.linksDisplayName,
    linksBio: data.linksBio,
    links: Array.isArray(data.links) ? data.links : [],
    searchEnabled: !!data.searchEnabled,
    cfAnalyticsToken: data.cfAnalyticsToken,
    analyticsSnippet: data.analyticsSnippet,
    sellEnabled: !!data.sellEnabled,
    newsletterEnabled: !!data.newsletterEnabled,
    newsletterHeading: data.newsletterHeading,
    newsletterBlurb: data.newsletterBlurb,
    newsletterProvider: data.newsletterProvider ?? 'netlify',
    newsletterActionUrl: data.newsletterActionUrl,
    customCss: data.customCss,
    customCode: data.customCode,
    design: data.design,
  };
}

export async function saveSettings(gh: GitHub, s: Settings): Promise<void> {
  // Read-merge-write: never drop keys the editor doesn't model. The basic
  // Settings shape omits some schema fields (e.g. fontPairing/headingFont/
  // bodyFont) and may not know about future additions, so we overlay only the
  // *defined* values onto whatever is currently on disk. This also guards the
  // design tokens (owned by the Look UI/wizard) from being clobbered on a plain
  // settings save.
  const existing = await gh.getFile(PATHS.settings);
  let merged: Record<string, any> = {};
  if (existing) {
    try {
      merged = JSON.parse(existing.text);
    } catch {
      /* corrupt/empty — fall back to a fresh object */
    }
  }
  for (const [k, v] of Object.entries(s)) {
    if (v !== undefined) merged[k] = v;
  }
  await gh.commit([{ path: PATHS.settings, content: toJson(merged) }], 'Update site settings');
}

// ---------- Asset uploads (logo, favicon) ----------

/**
 * Commit an uploaded image to public/assets and return its served path (e.g.
 * /assets/logo-ab12cd.png). Stored under public/ so the site can reference it by
 * URL directly (no astro:assets import needed for dynamic identity images).
 */
export async function uploadAsset(gh: GitHub, file: File, baseName: string): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const rel = `assets/${baseName}-${shortStamp()}.${ext}`;
  await gh.commit(
    [{ path: `public/${rel}`, content: await fileToBase64(file), encoding: 'base64' }],
    `Upload ${baseName}`,
  );
  return `/${rel}`;
}

// ---------- helpers ----------

function shortStamp(): string {
  // Avoid Date.now collisions while keeping filenames tidy.
  return Math.random().toString(36).slice(2, 8);
}

async function uniqueId(gh: GitHub, dir: string, base: string): Promise<string> {
  const existing = new Set((await gh.listDir(dir)).map((e) => e.name.replace(/\.md$/, '')));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 50; i++) if (!existing.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${shortStamp()}`;
}
