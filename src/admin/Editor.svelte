<script lang="ts">
  import { onMount } from 'svelte';
  import { GitHub } from './lib/github';
  import type { Series } from './lib/content';
  import { loadSeries } from './lib/store';
  import { getToken, setToken, clearToken, signIn } from './lib/auth';
  import Artworks from './views/Artworks.svelte';
  import SeriesView from './views/SeriesView.svelte';
  import PagesView from './views/PagesView.svelte';
  import SettingsView from './views/SettingsView.svelte';

  type Status = 'loading' | 'signin' | 'ready' | 'error' | 'unconfigured';
  type View = 'artworks' | 'series' | 'pages' | 'settings';

  let status = $state<Status>('loading');
  let view = $state<View>('artworks');
  let gh = $state<GitHub | null>(null);
  let login = $state('');
  let seriesList = $state<Series[]>([]);
  let errorMsg = $state('');
  let authBaseUrl = $state('');
  let siteUrl = $state('/');

  let toast = $state<{ msg: string; kind: 'info' | 'error' } | null>(null);
  let toastTimer: number | undefined;
  function notify(msg: string, kind: 'info' | 'error' = 'info') {
    toast = { msg, kind };
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast = null), 5000);
  }

  let config: { repo: string; branch: string; authBaseUrl: string } | null = null;

  onMount(async () => {
    try {
      const res = await fetch('/admin/config.json', { cache: 'no-store' });
      config = await res.json();
    } catch {
      status = 'error';
      errorMsg = 'Could not load editor configuration.';
      return;
    }
    if (!config || !config.repo || config.repo.includes('REPLACED_AT_PROVISION')) {
      status = 'unconfigured';
      return;
    }
    authBaseUrl = config.authBaseUrl;
    const token = getToken();
    if (token) await start(token);
    else status = 'signin';
  });

  async function start(token: string) {
    status = 'loading';
    const [owner, repo] = config!.repo.split('/');
    const client = new GitHub(token, { owner, repo, branch: config!.branch || 'main' });
    try {
      login = await client.getLogin();
    } catch {
      clearToken();
      status = 'signin';
      notify('Your sign-in expired. Please sign in again.', 'error');
      return;
    }
    gh = client;
    try {
      seriesList = await loadSeries(client);
    } catch {
      seriesList = [];
    }
    status = 'ready';
  }

  async function doSignIn() {
    try {
      const token = await signIn(authBaseUrl);
      setToken(token);
      await start(token);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Sign-in failed.', 'error');
    }
  }

  function signOut() {
    clearToken();
    gh = null;
    status = 'signin';
  }

  async function refreshSeries() {
    if (gh) seriesList = await loadSeries(gh);
  }

  const NAV: { id: View; label: string }[] = [
    { id: 'artworks', label: 'Artwork' },
    { id: 'series', label: 'Series' },
    { id: 'pages', label: 'Pages' },
    { id: 'settings', label: 'Settings' },
  ];
</script>

<div class="ez-admin">
  <header class="ez-topbar">
    <div class="ez-brand">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <g stroke="#161616" stroke-width="3" stroke-linecap="square">
          <line x1="14" y1="10" x2="8" y2="60" /><line x1="50" y1="10" x2="56" y2="60" />
          <line x1="32" y1="40" x2="32" y2="60" /><line x1="11" y1="44" x2="53" y2="44" />
        </g>
        <rect x="12" y="8" width="40" height="32" fill="#fff" stroke="#161616" stroke-width="3" />
        <rect x="16" y="20" width="14" height="14" fill="#e63946" />
        <circle cx="42" cy="18" r="7" fill="#1d4ed8" />
        <polygon points="40,34 50,34 45,22" fill="#f4c20d" />
      </svg>
      <strong>Easel</strong>
    </div>
    {#if status === 'ready'}
      <nav class="ez-nav">
        {#each NAV as n (n.id)}
          <button class="ez-navbtn" class:ez-navbtn--on={view === n.id} onclick={() => (view = n.id)}>{n.label}</button>
        {/each}
      </nav>
      <div class="ez-topbar__right">
        <a class="ez-btn ez-btn--sm ez-btn--ghost" href={siteUrl} target="_blank" rel="noopener">View site</a>
        <span class="ez-who">@{login}</span>
        <button class="ez-btn ez-btn--sm" onclick={signOut}>Sign out</button>
      </div>
    {/if}
  </header>

  <main class="ez-main">
    {#if status === 'loading'}
      <p class="ez-help">Loading…</p>
    {:else if status === 'signin'}
      <div class="ez-signin">
        <h1>Welcome back</h1>
        <p>Sign in with the GitHub account you used to set up your site. That's all you need — no passwords to remember here.</p>
        <button class="ez-btn ez-btn--primary ez-btn--lg" onclick={doSignIn}>Sign in with GitHub</button>
      </div>
    {:else if status === 'unconfigured'}
      <div class="ez-signin">
        <h1>Editor not set up yet</h1>
        <p>This editor becomes active once your site is created through Easel. If you just signed up, give it a minute and refresh.</p>
      </div>
    {:else if status === 'error'}
      <div class="ez-signin"><h1>Something went wrong</h1><p>{errorMsg}</p></div>
    {:else if status === 'ready' && gh}
      {#if view === 'artworks'}
        <Artworks {gh} {seriesList} {notify} />
      {:else if view === 'series'}
        <SeriesView {gh} {notify} onChange={refreshSeries} />
      {:else if view === 'pages'}
        <PagesView {gh} {notify} />
      {:else if view === 'settings'}
        <SettingsView {gh} {notify} />
      {/if}
    {/if}
  </main>

  {#if toast}
    <div class="ez-toast ez-toast--{toast.kind}" role="status">{toast.msg}</div>
  {/if}
</div>
