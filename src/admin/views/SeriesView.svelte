<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { Series } from '../lib/content';
  import { loadSeries, saveSeries, deleteSeries } from '../lib/store';

  let {
    gh,
    notify,
    onChange,
  }: {
    gh: GitHub;
    notify: (msg: string, kind?: 'info' | 'error') => void;
    onChange: () => void;
  } = $props();

  let items = $state<Series[]>([]);
  let loading = $state(true);
  let editing = $state<Series | null>(null);
  let saving = $state(false);

  const blank = (): Series => ({ id: '', title: '', description: '', order: 0, body: '' });

  async function refresh() {
    loading = true;
    try {
      items = await loadSeries(gh);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load series.', 'error');
    }
    loading = false;
  }
  refresh();

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) return notify('Please add a name.', 'error');
    saving = true;
    try {
      await saveSeries(gh, $state.snapshot(editing) as Series, editing.id === '');
      notify('Series saved.');
      editing = null;
      await refresh();
      onChange();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
    saving = false;
  }

  async function remove(s: Series) {
    if (!confirm(`Delete the “${s.title}” series? Your artwork stays; it's just ungrouped.`)) return;
    try {
      await deleteSeries(gh, s);
      notify('Series deleted.');
      await refresh();
      onChange();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  }
</script>

{#if editing}
  <div class="ez-form">
    <div class="ez-form__head">
      <h2>{editing.id === '' ? 'Add series' : 'Edit series'}</h2>
      <button class="ez-btn ez-btn--ghost" onclick={() => (editing = null)} disabled={saving}>Cancel</button>
    </div>
    <label class="ez-field">
      <span class="ez-label">Name</span>
      <input class="ez-input" bind:value={editing.title} placeholder="Paintings 2024" />
    </label>
    <label class="ez-field">
      <span class="ez-label">Description</span>
      <textarea class="ez-input" rows="3" bind:value={editing.description}></textarea>
    </label>
    <label class="ez-field">
      <span class="ez-label">Order</span>
      <input class="ez-input" type="number" bind:value={editing.order} />
      <span class="ez-help">Lower numbers show first.</span>
    </label>
    <div class="ez-form__actions">
      <button class="ez-btn ez-btn--primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </div>
{:else}
  <div class="ez-view__head">
    <div>
      <h2>Series</h2>
      <p class="ez-help">Group your work into bodies or collections.</p>
    </div>
    <button class="ez-btn ez-btn--primary" onclick={() => (editing = blank())}>Add series</button>
  </div>

  {#if loading}
    <p class="ez-help">Loading…</p>
  {:else if items.length === 0}
    <div class="ez-empty"><p>No series yet.</p></div>
  {:else}
    <ul class="ez-list">
      {#each items as s (s.id)}
        <li class="ez-list__row">
          <div>
            <strong>{s.title}</strong>
            {#if s.description}<span class="ez-help">{s.description}</span>{/if}
          </div>
          <div class="ez-tile__actions">
            <button class="ez-btn ez-btn--sm" onclick={() => (editing = { ...s })}>Edit</button>
            <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => remove(s)}>Delete</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{/if}
