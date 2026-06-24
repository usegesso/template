<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { resolveAssetPath, type Artwork, type Series } from '../lib/content';
  import { saveArtwork } from '../lib/store';

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

  if (art?.image) {
    imagePreview = gh.rawUrl(resolveAssetPath('src/content/artworks', art.image));
  }

  function onPickImage(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    imageFile = file;
    if (file) imagePreview = URL.createObjectURL(file);
  }

  async function save() {
    if (!form.title.trim()) return notify('Please add a title.', 'error');
    if (!form.alt.trim()) return notify('Please add a photo description.', 'error');
    if (isNew && !imageFile) return notify('Please choose a photo.', 'error');
    saving = true;
    try {
      await saveArtwork(gh, $state.snapshot(form), imageFile, isNew);
      notify('Saved. Your site will update in a minute or two.');
      onDone(true);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
      saving = false;
    }
  }
</script>

<div class="ez-form">
  <div class="ez-form__head">
    <h2>{isNew ? 'Add artwork' : 'Edit artwork'}</h2>
    <button class="ez-btn ez-btn--ghost" onclick={() => onDone(false)} disabled={saving}>Cancel</button>
  </div>

  <label class="ez-field">
    <span class="ez-label">Photo</span>
    {#if imagePreview}
      <img class="ez-form__preview" src={imagePreview} alt="" />
    {/if}
    <input type="file" accept="image/*" onchange={onPickImage} />
    <span class="ez-help">Big phone photos are fine — Easel resizes them when it builds your site.</span>
  </label>

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

  <label class="ez-field">
    <span class="ez-label">Photo description</span>
    <input class="ez-input" bind:value={form.alt} placeholder="A blue circle on a cream field" />
    <span class="ez-help">A short description of the image, for screen readers and search. Required.</span>
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
