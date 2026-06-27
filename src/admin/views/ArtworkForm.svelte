<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { resolveAssetPath, type Artwork, type Series } from '../lib/content';
  import { saveArtwork } from '../lib/store';
  import { useShell } from '../lib/shell.svelte';

  let {
    gh,
    art = null,
    seriesList = [],
    onDone,
    notify,
  }: {
    gh: GitHub;
    art: Artwork | null;
    seriesList: Series[];
    onDone: (changed: boolean) => void;
    notify: (msg: string, kind?: 'info' | 'error') => void;
  } = $props();

  const shell = useShell();
  const isNew = art === null;
  const blank: Artwork = {
    id: '',
    image: '',
    title: '',
    status: 'available',
    alt: '',
    order: 0,
    featured: false,
    body: '',
  };
  // Local editable copy.
  let form = $state<Artwork>({ ...blank, ...(art ?? {}) });
  let imageFile = $state<File | null>(null);
  let imagePreview = $state<string>('');
  let saving = $state(false);

  // Extra "gallery" images (details / other angles). Each item is either an existing
  // saved path or a freshly chosen File; new files upload on save.
  let galleryItems = $state<{ path?: string; file?: File; url: string }[]>(
    (art?.images ?? []).map((path) => ({ path, url: gh.rawUrl(resolveAssetPath('src/content/artworks', path)) })),
  );
  const galleryBaseline = (art?.images ?? []).join('|');
  const galleryDirty = () => galleryItems.map((g) => g.path ?? '@new').join('|') !== galleryBaseline;

  if (art?.image) {
    imagePreview = gh.rawUrl(resolveAssetPath('src/content/artworks', art.image));
  }

  const formBaseline = JSON.stringify($state.snapshot(form));
  const isDirty = () => imageFile !== null || galleryDirty() || JSON.stringify($state.snapshot(form)) !== formBaseline;

  // Take part in the unsaved-changes guard. Silent: this form has its own footer.
  $effect(() =>
    shell.register({ isDirty, save, discard: () => onDone(false), silent: true }),
  );

  function onPickImage(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    imageFile = file;
    if (file) imagePreview = URL.createObjectURL(file);
  }

  function onPickGallery(e: Event) {
    const input = e.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      galleryItems = [...galleryItems, { file, url: URL.createObjectURL(file) }];
    }
    input.value = ''; // let the same file be re-picked later
  }
  function moveGallery(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= galleryItems.length) return;
    const next = [...galleryItems];
    [next[i], next[j]] = [next[j], next[i]];
    galleryItems = next;
  }
  function removeGallery(i: number) {
    galleryItems = galleryItems.filter((_, idx) => idx !== i);
  }

  async function save(): Promise<boolean> {
    if (!form.title.trim()) { notify('Please add a title.', 'error'); return false; }
    if (!form.alt.trim()) { notify('Please add a photo description.', 'error'); return false; }
    if (isNew && !imageFile) { notify('Please choose a photo.', 'error'); return false; }
    saving = true;
    try {
      await saveArtwork(gh, $state.snapshot(form), imageFile, galleryItems.map((g) => ({ path: g.path, file: g.file })), isNew);
      notify('Saved. Your site will update in a minute or two.');
      onDone(true);
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
      saving = false;
      return false;
    }
  }
</script>

<div class="ez-form">
  <div class="ez-form__head">
    <h2>{isNew ? 'Add artwork' : 'Edit artwork'}</h2>
    <button class="ez-btn ez-btn--ghost" onclick={() => shell.guard(() => onDone(false))} disabled={saving}>Cancel</button>
  </div>

  <label class="ez-field">
    <span class="ez-label">Photo</span>
    {#if imagePreview}
      <img class="ez-form__preview" src={imagePreview} alt="" />
    {/if}
    <input type="file" accept="image/*" onchange={onPickImage} />
    <span class="ez-help">Big phone photos are fine — Easel resizes them when it builds your site.</span>
  </label>

  <div class="ez-field">
    <span class="ez-label">More photos (optional)</span>
    {#if galleryItems.length}
      <div class="ez-gallery">
        {#each galleryItems as item, i (item.url)}
          <div class="ez-gallery__item">
            <img class="ez-gallery__thumb" src={item.url} alt="" />
            <div class="ez-gallery__ctrls">
              <button type="button" class="ez-btn ez-btn--sm" onclick={() => moveGallery(i, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
              <button type="button" class="ez-btn ez-btn--sm" onclick={() => moveGallery(i, 1)} disabled={i === galleryItems.length - 1} aria-label="Move later">↓</button>
              <button type="button" class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => removeGallery(i)} aria-label="Remove">×</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    <input type="file" accept="image/*" multiple onchange={onPickGallery} />
    <span class="ez-help">Detail shots, other angles, or process photos — shown on this piece's own page.</span>
  </div>

  <label class="ez-field">
    <span class="ez-label">Title</span>
    <input class="ez-input" bind:value={form.title} placeholder="Untitled" />
  </label>

  <div class="ez-row">
    <label class="ez-field">
      <span class="ez-label">Year</span>
      <input class="ez-input" type="number" bind:value={form.year} />
    </label>
    <label class="ez-field">
      <span class="ez-label">Medium</span>
      <input class="ez-input" bind:value={form.medium} placeholder="Oil on canvas" />
    </label>
    <label class="ez-field">
      <span class="ez-label">Size</span>
      <input class="ez-input" bind:value={form.dimensions} placeholder="24 × 30 in" />
    </label>
  </div>

  <div class="ez-row">
    <label class="ez-field">
      <span class="ez-label">Availability</span>
      <select class="ez-input" bind:value={form.status}>
        <option value="available">Available</option>
        <option value="sold">Sold</option>
        <option value="inquire">Ask me</option>
        <option value="nfs">Not for sale</option>
      </select>
    </label>
    {#if form.status === 'available'}
      <label class="ez-field">
        <span class="ez-label">Price</span>
        <input class="ez-input" bind:value={form.price} placeholder="$1,800" />
      </label>
    {/if}
    <label class="ez-field">
      <span class="ez-label">Series</span>
      <select class="ez-input" bind:value={form.collection}>
        <option value={undefined}>None</option>
        {#each seriesList as s (s.id)}
          <option value={s.id}>{s.title}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if form.status === 'available'}
    <label class="ez-field">
      <span class="ez-label">Buy / shop link (optional)</span>
      <input class="ez-input" bind:value={form.buyLink} placeholder="https://… (Stripe, Gumroad, Etsy, Big Cartel)" />
      <span class="ez-help">Paste a checkout link and this piece gets a Buy button. Leave it blank for an Inquire button instead. Turn buttons on under Settings → Selling.</span>
    </label>
  {/if}

  <label class="ez-field">
    <span class="ez-label">Photo description</span>
    <input class="ez-input" bind:value={form.alt} placeholder="A blue circle on a cream field" />
    <span class="ez-help">A short description of the image, for screen readers and search. Required.</span>
  </label>

  <label class="ez-field">
    <span class="ez-label">Video (optional)</span>
    <input class="ez-input" bind:value={form.video} placeholder="https://vimeo.com/… or https://youtube.com/watch?v=…" />
    <span class="ez-help">Paste a YouTube or Vimeo link to add a video on this piece's page. The photo above is the thumbnail.</span>
  </label>

  <label class="ez-field">
    <span class="ez-label">Audio (optional)</span>
    <input class="ez-input" bind:value={form.audio} placeholder="https://soundcloud.com/… or a link to an .mp3" />
    <span class="ez-help">Paste a SoundCloud or Bandcamp link, or a direct link to an audio file, to add a player on this piece's page. Good for music and sound art. The photo above stays the cover.</span>
  </label>

  <label class="ez-field ez-field--check">
    <input type="checkbox" bind:checked={form.featured} />
    <span>Feature this piece at the top of my homepage</span>
  </label>

  <label class="ez-field">
    <span class="ez-label">About this piece</span>
    <textarea class="ez-input" rows="4" bind:value={form.body}></textarea>
    <span class="ez-help">Optional.</span>
  </label>

  <div class="ez-form__actions">
    <button class="ez-btn ez-btn--primary" onclick={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </button>
  </div>
</div>

<style>
  .ez-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ez-space-3);
    margin-bottom: var(--ez-space-3);
  }
  .ez-gallery__item {
    display: flex;
    flex-direction: column;
    gap: var(--ez-space-1);
    width: 96px;
  }
  .ez-gallery__thumb {
    width: 96px;
    height: 96px;
    object-fit: cover;
    border: var(--ez-border-width) solid var(--ez-border);
    background: var(--ez-paper);
  }
  .ez-gallery__ctrls {
    display: flex;
    gap: var(--ez-space-1);
    justify-content: center;
  }
</style>
