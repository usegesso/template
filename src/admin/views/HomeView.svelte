<script lang="ts">
  import type { GitHub } from '../lib/github';
  import { loadArtworks, loadSeries, loadPosts, loadAbout } from '../lib/store';
  import type { NavId } from '../Sidebar.svelte';

  let {
    gh,
    go,
    siteUrl = '/',
    designEmpty = false,
    onWizard,
  }: {
    gh: GitHub;
    go: (view: NavId, tab?: string) => void;
    siteUrl?: string;
    designEmpty?: boolean;
    onWizard: () => void;
  } = $props();

  let counts = $state<{ art: number; series: number; posts: number } | null>(null);
  let aboutDone = $state(false);
  let dismissed = $state(false);

  async function load() {
    try {
      const [a, s, p, about] = await Promise.all([
        loadArtworks(gh),
        loadSeries(gh),
        loadPosts(gh),
        loadAbout(gh),
      ]);
      counts = { art: a.length, series: s.length, posts: p.length };
      aboutDone = Boolean(about.statement?.trim() || about.body?.trim());
    } catch {
      counts = { art: 0, series: 0, posts: 0 };
      aboutDone = false;
    }
  }
  load();

  // "Getting started" checklist: data-driven done states, auto-hides when every step
  // is complete. A manual dismiss is remembered locally (a UI preference, not content,
  // so it never commits to the repo).
  const DISMISS_KEY = 'ez-getting-started-dismissed';
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === '1';
  } catch {}
  function dismiss() {
    dismissed = true;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  }

  const steps = $derived.by(() =>
    counts === null
      ? []
      : [
          { label: 'Make it yours', help: 'Pick fonts, colours, and a layout — about a minute.', done: !designEmpty, cta: 'Style wizard', run: onWizard },
          { label: 'Add your first piece', help: 'Upload a photo of your work to start your portfolio.', done: counts.art > 0, cta: 'Add artwork', run: () => go('work', 'artwork') },
          { label: 'Write your About', help: 'Tell visitors who you are and what you make.', done: aboutDone, cta: 'Edit About', run: () => go('pages', 'about') },
        ],
  );
  const doneCount = $derived(steps.filter((s) => s.done).length);
  const showChecklist = $derived(counts !== null && !dismissed && doneCount < steps.length);

  const n = (v: number | undefined) => (v === undefined ? '—' : String(v));
</script>

<div class="ez-home">
  {#if showChecklist}
    <section class="ez-gs">
      <div class="ez-gs__head">
        <div>
          <h2 class="ez-home__h ez-gs__title">Getting started</h2>
          <p class="ez-help">{doneCount} of {steps.length} done — finish these and your site's ready to share.</p>
        </div>
        <button class="ez-gs__dismiss" type="button" onclick={dismiss}>Dismiss</button>
      </div>
      <ol class="ez-gs__list">
        {#each steps as step}
          <li class="ez-gs__item" class:is-done={step.done}>
            <span class="ez-gs__check" aria-hidden="true">{step.done ? '✓' : ''}</span>
            <span class="ez-gs__text">
              <strong>{step.label}</strong>
              <span class="ez-help">{step.help}</span>
            </span>
            {#if !step.done}
              <button class="ez-btn ez-btn--accent ez-btn--depth ez-gs__cta" type="button" onclick={step.run}>{step.cta}</button>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  <section>
    <h2 class="ez-home__h">Your site at a glance</h2>
    <div class="ez-statgrid">
      <button class="ez-stat" onclick={() => go('work', 'artwork')}>
        <span class="ez-stat__num">{n(counts?.art)}</span>
        <span class="ez-stat__label">artworks</span>
      </button>
      <button class="ez-stat" onclick={() => go('work', 'series')}>
        <span class="ez-stat__num">{n(counts?.series)}</span>
        <span class="ez-stat__label">series</span>
      </button>
      <button class="ez-stat" onclick={() => go('pages', 'news')}>
        <span class="ez-stat__num">{n(counts?.posts)}</span>
        <span class="ez-stat__label">posts</span>
      </button>
    </div>
  </section>

  <section>
    <h2 class="ez-home__h">Quick actions</h2>
    <div class="ez-quickgrid">
      <button class="ez-quick" onclick={() => go('work', 'artwork')}>
        <span class="ez-shape ez-shape--square"></span>
        <span><strong>Add artwork</strong><span class="ez-help">Upload new work</span></span>
      </button>
      <button class="ez-quick" onclick={() => go('pages', 'news')}>
        <span class="ez-shape ez-shape--circle"></span>
        <span><strong>Write a post</strong><span class="ez-help">Share an update</span></span>
      </button>
      <button class="ez-quick" onclick={() => go('pages', 'about')}>
        <span class="ez-shape ez-shape--triangle"></span>
        <span><strong>Edit your About</strong><span class="ez-help">Tell your story</span></span>
      </button>
      <button class="ez-quick" onclick={() => go('design')}>
        <span class="ez-shape ez-shape--square" style="background:var(--ez-blue)"></span>
        <span><strong>Change your look</strong><span class="ez-help">Fonts & colours</span></span>
      </button>
    </div>
  </section>

  <p class="ez-help">
    Want to see the live result? <a href={siteUrl} target="_blank" rel="noopener">View your site ↗</a>
    Edits go live a minute or so after you save.
  </p>
</div>
