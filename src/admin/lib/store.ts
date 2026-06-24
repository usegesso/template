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
        title: data.title ?? 'Untitled',
        year: data.year,
        medium: data.medium,
        dimensions: data.dimensions,
        status: data.status ?? 'available',
        price: data.price,
        alt: data.alt ?? '',
        collection: data.collection,
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
      title: a.title,
      year: a.year,
      medium: a.medium,
      dimensions: a.dimensions,
      status: a.status,
      price: a.status === 'available' ? a.price : undefined,
      alt: a.alt,
      collection: a.collection,
      order: a.order,
      featured: a.featured,
    },
    a.body,
  );
}

/** Save one artwork (optionally with a freshly chosen image file). One commit. */
export async function saveArtwork(
  gh: GitHub,
  art: Artwork,
  imageFile: File | null,
  isNew: boolean,
): Promise<string> {
  const id = isNew ? await uniqueId(gh, PATHS.artworks, slugify(art.title)) : art.id;
  const changes: FileChange[] = [];

  if (imageFile) {
    const ext = (imageFile.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fname = `${id}-${shortStamp()}.${ext}`;
    art.image = `${ARTWORK_IMG_REL}/${fname}`;
    changes.push({
      path: `${ARTWORK_IMG_DIR}/${fname}`,
      content: await fileToBase64(imageFile),
      encoding: 'base64',
    });
  }

  changes.push({ path: `${PATHS.artworks}/${id}.md`, content: artworkToMd({ ...art, id }) });
  await gh.commit(changes, `${isNew ? 'Add' : 'Update'} artwork: ${art.title}`);
  return id;
}

export async function deleteArtwork(gh: GitHub, art: Artwork): Promise<void> {
  await gh.commit([{ path: `${PATHS.artworks}/${art.id}.md`, remove: true }], `Remove artwork: ${art.title}`);
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
    customDomain: data.customDomain,
    analyticsSnippet: data.analyticsSnippet,
  };
}

export async function saveSettings(gh: GitHub, s: Settings): Promise<void> {
  await gh.commit([{ path: PATHS.settings, content: toJson(s) }], 'Update site settings');
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
