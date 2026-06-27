<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { resolveAssetPath, type Artwork, type Series } from '../lib/content';
  import { loadArtworks, deleteArtwork, reorderArtworks, bulkAddArtworksDetailed, type BulkDraft } from '../lib/store';
  import { useShell } from '../lib/shell.svelte';
  import ArtworkForm from './ArtworkForm.svelte';

  // A staged piece waiting to be published, with EXIF-prefilled, editable details.
  type QueueItem = { file: File; url: string; title: string; year?: number; medium?: string; alt: string };

  let {
    gh,
    seriesList = [],
    notify,
  }: {
    gh: GitHub;
    seriesList: Series[];
    notify: (msg: string, kind?: 'info' | 'error') => void;
  } = $props();

  const shell = useShell();

  let items = $state<Artwork[]>([]);
  let loading = $state(true);
  let editing = $state<Artwork | null>(null);
  let adding = $state(false);
  let orderDirty = $state(false);
  let bulkBusy = $state(false);
  let bulkInput = $state<HTMLInputElement | null>(null);
  // Bulk staging queue (multi-file add with per-item edit + reorder before publish).
  let queue = $state<QueueItem[]>([]);
  let reading = $state(false);

  // --- pointer-based drag reordering ---
  let dragId = $state<string | null>(null);
  let ptr = $state({ x: 0, y: 0 });
  let grab = { x: 0, y: 0 };
  let cloneSize = $state({ w: 0, h: 0 });
  let downId: string | null = null;
  let downAt = { x: 0, y: 0 };
  let started = false;

  const STATUS_LABEL: Record<string, string> = {
    available: 'Available', sold: 'Sold', inquire: 'Ask me', nfs: 'Not for sale',
  };

  async function refresh() {
    loading = true;
    try {
      items = await loadArtworks(gh);
      orderDirty = false;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load artwork.', 'error');
    }
    loading = false;
  }
  refresh();

  function thumb(a: Artwork): string {
    return a.image ? gh.rawUrl(resolveAssetPath('src/content/artworks', a.image)) : '';
  }

  const dragged = $derived(items.find((a) => a.id === dragId) ?? null);

  function onPointerDown(e: PointerEvent, a: Artwork) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return; // let buttons work
    downId = a.id;
    downAt = { x: e.clientX, y: e.clientY };
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    grab = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    cloneSize = { w: rect.width, h: rect.height };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onMove(e: PointerEvent) {
    if (!downId) return;
    if (!started) {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6) return;
      started = true;
      dragId = downId;
      document.body.style.userSelect = 'none';
    }
    ptr = { x: e.clientX, y: e.clientY };
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overId = el?.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (overId && overId !== dragId) {
      const from = items.findIndex((x) => x.id === dragId);
      const to = items.findIndex((x) => x.id === overId);
      if (from > -1 && to > -1) {
        const next = [...items];
        const [m] = next.splice(from, 1);
        next.splice(to, 0, m);
        items = next;
        orderDirty = true;
      }
    }
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.style.userSelect = '';
    started = false;
    downId = null;
    dragId = null;
  }

  async function saveOrder(): Promise<boolean> {
    try {
      await reorderArtworks(gh, $state.snapshot(items) as Artwork[]);
      orderDirty = false;
      shell.markCommitted();
      notify('Order saved. Your site will update shortly.');
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save order.', 'error');
      return false;
    }
  }

  // While there's an unsaved reorder, the section-bar Save persists it; navigating
  // away prompts via the shared guard. Discard reloads the on-disk order.
  $effect(() => {
    if (!orderDirty) return;
    return shell.register({ isDirty: () => orderDirty, save: saveOrder, discard: refresh });
  });

  async function remove(a: Artwork) {
    if (!confirm(`Delete “${a.title}”? This can't be undone.`)) return;
    try {
      await deleteArtwork(gh, a);
      shell.markCommitted();
      notify('Artwork deleted.');
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  }

  function onFormDone(changed: boolean) {
    editing = null;
    adding = false;
    if (changed) {
      shell.markCommitted();
      refresh();
    }
  }

  // Title from a filename: "blue_study-02.jpg" → "Blue Study 02".
  function titleFromName(name: string): string {
    return (
      name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled'
    );
  }

  // Read EXIF/IPTC client-side to pre-fill what we can (year from the date taken,
  // a caption/title from embedded metadata). Best-effort: anything missing just
  // falls back to the filename, and a read error never blocks the upload.
  async function readMeta(file: File): Promise<{ title?: string; year?: number; alt?: string }> {
    try {
      const exifr = (await import('exifr')).default as any;
      const tags = await exifr.parse(file, { tiff: true, exif: true, iptc: true, xmp: true });
      if (!tags) return {};
      const date = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate;
      const year = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getFullYear() : undefined;
      const title = (tags.ObjectName || tags.title || tags.Headline || '').toString().trim() || undefined;
      const alt = (tags.ImageDescription || tags.Caption || tags.description || tags['Caption-Abstract'] || '')
        .toString()
        .trim() || undefined;
      return { title, year, alt };
    } catch {
      return {};
    }
  }

  async function onBulkPick(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // allow re-picking the same files
    if (!files.length) return;
    reading = true;
    const staged: QueueItem[] = [];
    for (const file of files) {
      const meta = await readMeta(file);
      staged.push({
        file,
        url: URL.createObjectURL(file),
        title: meta.title || titleFromName(file.name),
        year: meta.year,
        medium: undefined,
        alt: meta.alt || '',
      });
    }
    queue = [...queue, ...staged];
    reading = false;
  }

  function moveQueue(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= queue.length) return;
    const next = [...queue];
    [next[i], next[j]] = [next[j], next[i]];
    queue = next;
  }
  function removeQueue(i: number) {
    URL.revokeObjectURL(queue[i].url);
    queue = queue.filter((_, idx) => idx !== i);
  }
  function cancelQueue() {
    queue.forEach((q) => URL.revokeObjectURL(q.url));
    queue = [];
  }

  async function publishQueue() {
    if (!queue.length) return;
    bulkBusy = true;
    try {
      const drafts: BulkDraft[] = queue.map((q) => ({
        file: q.file,
        title: q.title,
        alt: q.alt,
        year: q.year,
        medium: q.medium,
      }));
      const n = await bulkAddArtworksDetailed(gh, drafts);
      shell.markCommitted();
      notify(`Added ${n} piece${n === 1 ? '' : 's'}. Your site will update shortly.`);
      cancelQueue();
      await refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add those photos.', 'error');
    }
    bulkBusy = false;
  }
</script>

{#if adding || editing}
  <ArtworkForm {gh} art={editing} {seriesList} onDone={onFormDone} {notify} />
{:else if queue.length}
  <div class="ez-view__head">
    <div>
      <h2>Review {queue.length} photo{queue.length === 1 ? '' : 's'}</h2>
      <p class="ez-help">Edit the details, drop ones you don't want, then publish them all at once.</p>
    </div>
    <div class="ez-view__actions">
      <button class="ez-btn ez-btn--ghost" onclick={cancelQueue} disabled={bulkBusy}>Cancel</button>
      <button class="ez-btn ez-btn--primary" onclick={publishQueue} disabled={bulkBusy}>
        {bulkBusy ? 'Publishing…' : `Publish ${queue.length} piece${queue.length === 1 ? '' : 's'}`}
      </button>
    </div>
  </div>
  <ul class="ez-queue">
    {#each queue as q, i (q.url)}
      <li class="ez-queue__row">
        <img class="ez-queue__thumb" src={q.url} alt="" />
        <div class="ez-queue__fields">
          <input class="ez-input" bind:value={q.title} placeholder="Title" aria-label="Title" />
          <div class="ez-queue__meta">
            <input class="ez-input" type="number" bind:value={q.year} placeholder="Year" aria-label="Year" />
            <input class="ez-input" bind:value={q.medium} placeholder="Medium (e.g. Oil on canvas)" aria-label="Medium" />
          </div>
          <input class="ez-input" bind:value={q.alt} placeholder="Describe the image (for screen readers and search)" aria-label="Alt text" />
        </div>
        <div class="ez-queue__ctrls">
          <button class="ez-btn ez-btn--sm" onclick={() => moveQueue(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
          <button class="ez-btn ez-btn--sm" onclick={() => moveQueue(i, 1)} disabled={i === queue.length - 1} aria-label="Move down">↓</button>
          <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => removeQueue(i)} aria-label="Remove">×</button>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <div class="ez-view__head">
    <div>
      <h2>Your artwork</h2>
      <p class="ez-help">Drag pieces to reorder how they appear on your homepage.</p>
    </div>
    <div class="ez-view__actions">
      <input
        type="file"
        accept="image/*"
        multiple
        class="ez-visually-hidden"
        bind:this={bulkInput}
        onchange={onBulkPick}
      />
      <button class="ez-btn ez-btn--ghost" onclick={() => bulkInput?.click()} disabled={reading}>
        {reading ? 'Reading…' : 'Add many photos'}
      </button>
      <button class="ez-btn ez-btn--primary" onclick={() => (adding = true)}>Add artwork</button>
    </div>
  </div>

  {#if loading}
    <p class="ez-help">Loading your work…</p>
  {:else if items.length === 0}
    <div class="ez-empty">
      <p>No artwork yet.</p>
      <button class="ez-btn ez-btn--primary" onclick={() => (adding = true)}>Add your first piece</button>
    </div>
  {:else}
    <div class="ez-grid">
      {#each items as a (a.id)}
        <div
          class="ez-tile"
          class:ez-tile--ghost={dragId === a.id}
          data-id={a.id}
          onpointerdown={(e) => onPointerDown(e, a)}
        >
          <div class="ez-tile__img">
            {#if thumb(a)}<img src={thumb(a)} alt={a.alt} draggable="false" loading="lazy" />{/if}
            <span class="ez-pill ez-pill--{a.status}">{STATUS_LABEL[a.status]}</span>
          </div>
          <div class="ez-tile__meta">
            <strong>{a.title}</strong>
            <span class="ez-help">{a.year ?? ''}</span>
          </div>
          <div class="ez-tile__actions">
            <button class="ez-btn ez-btn--sm" onclick={() => (editing = a)}>Edit</button>
            <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => remove(a)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>

    {#if dragged}
      <div
        class="ez-drag-clone"
        style="left:{ptr.x - grab.x}px; top:{ptr.y - grab.y}px; width:{cloneSize.w}px;"
      >
        <div class="ez-tile__img">
          {#if thumb(dragged)}<img src={thumb(dragged)} alt="" draggable="false" />{/if}
          <span class="ez-pill ez-pill--{dragged.status}">{STATUS_LABEL[dragged.status]}</span>
        </div>
        <div class="ez-tile__meta"><strong>{dragged.title}</strong></div>
      </div>
    {/if}
  {/if}
{/if}

<style>
  .ez-queue { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  .ez-queue__row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    padding: 0.75rem;
    border: var(--ez-border-width) solid var(--ez-border);
    border-radius: var(--ez-radius);
    background: var(--ez-white);
  }
  .ez-queue__thumb {
    width: 84px;
    height: 84px;
    object-fit: cover;
    border-radius: calc(var(--ez-radius) * 0.6);
    flex: 0 0 auto;
  }
  .ez-queue__fields { flex: 1 1 auto; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  .ez-queue__meta { display: flex; gap: 0.5rem; }
  .ez-queue__meta :global(input:first-child) { max-width: 7rem; }
  .ez-queue__ctrls { display: flex; flex-direction: column; gap: 0.35rem; flex: 0 0 auto; }
</style>
