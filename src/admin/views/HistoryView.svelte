<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { useShell } from '../lib/shell.svelte';

  let {
    gh,
    notify,
  }: {
    gh: GitHub;
    notify: (msg: string, kind?: 'info' | 'error') => void;
  } = $props();

  const shell = useShell();

  type Snapshot = { sha: string; message: string; date: string };
  let items = $state<Snapshot[]>([]);
  let loading = $state(true);
  let restoringSha = $state<string | null>(null);

  // Turn a commit message into something an artist reads. The editor writes
  // friendly messages already ("Update site settings", "Add artwork: Tide"); this
  // just smooths the few that lead with a verb phrase and hides the very first
  // (current) entry's redundancy.
  function friendly(msg: string): string {
    return msg.replace(/^Merge .*/i, 'Combined changes').trim() || 'Saved changes';
  }

  function when(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
      ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  async function load() {
    loading = true;
    try {
      items = await gh.listCommits(25);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load your history.', 'error');
    }
    loading = false;
  }
  load();

  async function restore(s: Snapshot) {
    const ok = confirm(
      `Roll your site back to how it was on ${when(s.date)}?\n\n` +
        `Your work since then is kept in history, so you can undo this too. ` +
        `This publishes a new version of your site.`,
    );
    if (!ok) return;
    restoringSha = s.sha;
    try {
      const n = await gh.restoreContentTo(s.sha, `Roll back to ${when(s.date)}`);
      shell.markCommitted();
      if (n === 0) {
        notify('That version matches your site already, nothing to change.');
      } else {
        notify('Rolled back. Your site will update shortly.');
        await load();
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not roll back.', 'error');
    }
    restoringSha = null;
  }
</script>

<div class="ez-view__head">
  <div>
    <h2>History</h2>
    <p class="ez-help">Every time you save, Easel keeps a snapshot. Roll back to any earlier one, your later work stays in history, so you can always undo a rollback.</p>
  </div>
</div>

{#if loading}
  <p class="ez-help">Loading your history…</p>
{:else if items.length === 0}
  <div class="ez-empty"><p>No history yet. It fills in as you make changes.</p></div>
{:else}
  <ul class="ez-history">
    {#each items as s, i (s.sha)}
      <li class="ez-history__row">
        <div class="ez-history__info">
          <strong>{friendly(s.message)}</strong>
          <span class="ez-help">{when(s.date)}{i === 0 ? ' · current' : ''}</span>
        </div>
        {#if i !== 0}
          <button class="ez-btn ez-btn--sm" onclick={() => restore(s)} disabled={restoringSha !== null}>
            {restoringSha === s.sha ? 'Rolling back…' : 'Restore'}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .ez-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .ez-history__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: var(--ez-border-width) solid var(--ez-border);
    border-radius: var(--ez-radius);
    background: var(--ez-white);
  }
  .ez-history__info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
</style>
