<script lang="ts">
  import { onMount } from 'svelte';
  import { GitHub } from './lib/github';
  import type { Series } from './lib/content';
  import { loadSeries, loadSettings } from './lib/store';
  import { getToken, setToken, clearToken, signIn } from './lib/auth';
  import { makeDemoClient } from './lib/demo';
  import { createShell, provideShell } from './lib/shell.svelte';
  import Sidebar, { type NavId } from './Sidebar.svelte';
  import EaselMark from './EaselMark.svelte';
  import StatusChip from './views/StatusChip.svelte';
  import UnsavedDialog from './views/UnsavedDialog.svelte';
  import HomeView from './views/HomeView.svelte';
  import WorkView from './views/WorkView.svelte';
  import PagesView from './views/PagesView.svelte';
  import DesignView from './views/DesignView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import HistoryView from './views/HistoryView.svelte';
  import UpdatesView from './views/UpdatesView.svelte';
  import Wizard from './views/Wizard.svelte';

  type Status = 'loading' | 'signin' | 'ready' | 'error' | 'unconfigured';

  let status = $state<Status>('loading');
  let view = $state<NavId>('home');
  let pendingTab = $state<string | null>(null);
  let gh = $state<GitHub | null>(null);
  let login = $state('');
  let seriesList = $state<Series[]>([]);
  let errorMsg = $state('');
  let authBaseUrl = $state('');
  let siteUrl = $state('/');
  let designEmpty = $state(false);

  let demo = $state(false);
  let wizard = $state(false);
  let navOpen = $state(false);
  let isNarrow = $state(false);
  let mobileBypass = $state(false);
  let toast = $state<{ msg: string; kind: 'info' | 'error' } | null>(null);
  let toastTimer: number | undefined;
  function notify(msg: string, kind: 'info' | 'error' = 'info') {
    toast = { msg, kind };
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast = null), 5000);
  }

  // The shared editor shell (save/dirty/guard/publish-status). Created once and
  // provided to every section view via context.
  const shell = createShell(notify, { demo: false });
  provideShell(shell);

  let config: {
    repo: string;
    branch: string;
    authBaseUrl: string;
    easelVersion?: string;
    host?: string;
  } | null = null;

  onMount(async () => {
    const mq = window.matchMedia('(max-width: 820px)');
    isNarrow = mq.matches;
    mq.addEventListener('change', (e) => (isNarrow = e.matches));
    mobileBypass = localStorage.getItem('easel_mobile_ok') === '1';

    try {
      const res = await fetch('/admin/config.json', { cache: 'no-store' });
      config = await res.json();
    } catch {
      config = null;
    }

    const wantsDemo =
      new URLSearchParams(location.search).has('demo') ||
      ['localhost', '127.0.0.1'].includes(location.hostname);
    const unconfigured = !config || !config.repo || config.repo.includes('REPLACED_AT_PROVISION');

    // Demo mode: explore the whole UI with sample data, no sign-in, no repo.
    if (wantsDemo && unconfigured) {
      demo = true;
      shell.demoTiming();
      gh = makeDemoClient();
      login = 'demo-artist';
      try {
        seriesList = await loadSeries(gh);
      } catch {
        seriesList = [];
      }
      await checkDesign(gh);
      status = 'ready';
      return;
    }

    if (!config) {
      status = 'error';
      errorMsg = 'Could not load editor configuration.';
      return;
    }
    if (unconfigured) {
      status = 'unconfigured';
      return;
    }
    authBaseUrl = config.authBaseUrl;
    const token = getToken();
    if (token) await start(token);
    else status = 'signin';
  });

  async function checkDesign(client: GitHub) {
    try {
      const st = await loadSettings(client);
      designEmpty = !st.design || Object.keys(st.design).length === 0;
      // First-time setup: open the style wizard if no design has been chosen — but
      // not on a phone, where the full-screen wizard is cramped. Mobile users land on
      // the editor and can add work; design is best done later on a computer.
      if (designEmpty && !isNarrow) wizard = true;
    } catch {
      /* ignore — wizard can be opened from Design later */
    }
  }

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
    // The status chip now tracks the real deploy: poll GitHub's build status for
    // whatever commit the editor last pushed. Falls back to a timer where the host
    // reports nothing (see GitHub.deployState).
    shell.setProbe(() =>
      client.lastCommitSha
        ? client.deployState(client.lastCommitSha)
        : Promise.resolve('unknown' as const),
    );
    try {
      seriesList = await loadSeries(client);
    } catch {
      seriesList = [];
    }
    await checkDesign(client);
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

  // Navigation always runs through the shell's unsaved-changes guard.
  function go(target: NavId, tab: string | null = null) {
    shell.guard(() => {
      view = target;
      pendingTab = tab;
      navOpen = false;
    });
  }

  function finishWizard() {
    wizard = false;
    designEmpty = false;
    view = 'home';
  }

  function bypassMobile() {
    localStorage.setItem('easel_mobile_ok', '1');
    mobileBypass = true;
  }

  // Warn on hard close/refresh while there are unsaved edits.
  $effect(() => {
    if (!shell.dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  const TITLES: Record<NavId, string> = {
    home: 'Home',
    work: 'Your work',
    pages: 'Pages',
    design: 'Design',
    settings: 'Settings',
    history: 'History',
    updates: 'Updates',
  };
</script>

<div class="ez-admin">
  {#if isNarrow && !mobileBypass}
    <div class="ez-mobilegate">
      <div class="ez-mobilegate__card">
        <h1>Editing on your phone</h1>
        <p>
          You can add photos, update your pages, and publish right here. For
          fine-tuning your design — fonts, colours, and layout — a computer gives
          you more room to work.
        </p>
        <button class="ez-btn ez-btn--primary ez-btn--lg" onclick={bypassMobile}>Start editing</button>
        <button class="ez-mobilegate__bypass" onclick={() => (location.href = siteUrl)}>Go to my site instead</button>
      </div>
    </div>
  {:else if status === 'ready' && wizard && gh && !isNarrow}
    <Wizard {gh} {notify} onClose={finishWizard} />
  {:else if status === 'ready' && gh}
    <div class="ez-shell" class:ez-shell--navopen={navOpen}>
      <Sidebar {view} nav={(id) => go(id)} {login} {demo} {siteUrl} bind:open={navOpen} onSignOut={signOut} />

      <div class="ez-shell__main">
        <header class="ez-mobilebar">
          <button class="ez-hamburger" aria-label="Open menu" onclick={() => (navOpen = true)}>
            <span></span><span></span><span></span>
          </button>
          <div class="ez-mobilebar__brand"><EaselMark size={24} /><strong>easel</strong></div>
          <StatusChip />
        </header>

        {#if demo}
          <div class="ez-demobar">Demo mode — explore freely. Changes here aren't saved anywhere.</div>
        {/if}

        <div class="ez-sectionbar">
          <h1>{TITLES[view]}</h1>
          <div class="ez-sectionbar__right">
            <span class="ez-sectionbar__chip"><StatusChip /></span>
            {#if shell.canSave}
              <button
                class="ez-btn ez-btn--primary ez-btn--depth"
                onclick={shell.save}
                disabled={!shell.dirty || shell.saving}
              >{shell.saving ? 'Saving…' : 'Save'}</button>
            {/if}
          </div>
        </div>

        <main class="ez-main" class:ez-main--wide={view === 'design'} id="ez-main">
          {#if view === 'home'}
            <HomeView {gh} {go} {siteUrl} {designEmpty} onWizard={() => (wizard = true)} />
          {:else if view === 'work'}
            <WorkView {gh} {seriesList} onSeriesChange={refreshSeries} initialTab={pendingTab} />
          {:else if view === 'pages'}
            <PagesView {gh} {notify} initialTab={pendingTab} />
          {:else if view === 'design'}
            <DesignView {gh} {notify} onWizard={() => (wizard = true)} />
          {:else if view === 'settings'}
            <SettingsView {gh} {notify} host={config?.host} repo={config?.repo} />
          {:else if view === 'history'}
            <HistoryView {gh} {notify} />
          {:else if view === 'updates'}
            <UpdatesView {gh} {notify} currentVersion={config?.easelVersion ?? null} />
          {/if}
        </main>
      </div>
    </div>
  {:else}
    <header class="ez-topbar ez-topbar--bare">
      <div class="ez-brand"><EaselMark size={28} /><strong>easel</strong></div>
    </header>
    <main class="ez-main">
      {#if status === 'loading'}
        <p class="ez-help">Loading…</p>
      {:else if status === 'signin'}
        <div class="ez-signin">
          <h1>Welcome back</h1>
          <p>Sign in with the GitHub account you used to set up your site. That's all you need — no passwords to remember here.</p>
          <button class="ez-btn ez-btn--primary ez-btn--lg ez-btn--depth" onclick={doSignIn}>Sign in with GitHub</button>
        </div>
      {:else if status === 'unconfigured'}
        <div class="ez-signin">
          <h1>Editor not set up yet</h1>
          <p>This editor becomes active once your site is created through Easel. If you just signed up, give it a minute and refresh.</p>
        </div>
      {:else if status === 'error'}
        <div class="ez-signin"><h1>Something went wrong</h1><p>{errorMsg}</p></div>
      {/if}
    </main>
  {/if}

  {#if shell.hasPendingNav}
    <UnsavedDialog />
  {/if}

  {#if toast}
    <div class="ez-toast ez-toast--{toast.kind}" role="status">{toast.msg}</div>
  {/if}
</div>
