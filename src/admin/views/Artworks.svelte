<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { resolveAssetPath, type Artwork, type Series } from '../lib/content';
  import { loadArtworks, deleteArtwork, reorderArtworks } from '../lib/store';
  import ArtworkForm from './ArtworkForm.svelte';

  let {
    gh,
    seriesList = [],
    notify,
  }: {
    gh: GitHub;
    seriesList: Series[];
    notify: (msg: string, kind?: 'info' | 'error') => void;
  } = $props();

  let items = $state<Artwork[]>([]);
  let loading = $state(true);
  let editing = $state<Artwork | null>(null);
  let adding = $state(false);
  let orderDirty = $state(false);
  let dragIndex = $state<number | null>(null);

  const STATUS_LABEL: Record<string, string> = {
    available: 'Available',
    sold: 'Sold',
    inquire: 'Ask me',
    nfs: 'Not for sale',
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

  function onDragStart(i: number) {
    dragIndex = i;
  }
  function onDrop(i: number) {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    items = next;
    dragIndex = null;
    orderDirty = true;
  }

  async function saveOrder() {
    try {
      await reorderArtworks(gh, $state.snapshot(items) as Artwork[]);
      orderDirty = false;
      notify('Order saved. Your site will update shortly.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save order.', 'error');
    }
  }

  async function remove(a: Artwork) {
    if (!confirm(`Delete “${a.title}”? This can't be undone.`)) return;
    try {
      await deleteArtwork(gh, a);
      notify('Artwork deleted.');
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  }

  function onFormDone(changed: boolean) {
    editing = null;
    adding = false;
    if (changed) refresh();
  }
</script>

{#if adding || editing}
  <ArtworkForm {gh} art={editing} {seriesList} onDone={onFormDone} {notify} />
{:else}
  <div class="ez-view__head">
    <div>
      <h2>Your artwork</h2>
      <p class="ez-help">Drag pieces to reorder how they appear on your homepage.</p>
    </div>
    <div class="ez-view__actions">
      {#if orderDirty}
        <button class="ez-btn ez-btn--accent" onclick={saveOrder}>Save order</button>
      {/if}
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
      {#each items as a, i (a.id)}
        <div
          class="ez-tile"
          draggable="true"
          ondragstart={() => onDragStart(i)}
          ondragover={(e) => e.preventDefault()}
          ondrop={() => onDrop(i)}
        >
          <div class="ez-tile__img">
            {#if thumb(a)}<img src={thumb(a)} alt={a.alt} loading="lazy" />{/if}
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
  {/if}
{/if}
