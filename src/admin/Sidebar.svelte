<script lang="ts">
  import EaselMark from './EaselMark.svelte';

  export type NavId = 'home' | 'work' | 'pages' | 'design' | 'settings' | 'history' | 'updates';

  let {
    view,
    nav,
    login,
    demo = false,
    siteUrl = '/',
    open = $bindable(false),
    onSignOut,
  }: {
    view: NavId;
    nav: (id: NavId) => void;
    login: string;
    demo?: boolean;
    siteUrl?: string;
    open?: boolean;
    onSignOut: () => void;
  } = $props();

  // Geometric, label-paired nav. Sub-sections live inside each view as tabs, so
  // there are only five destinations here.
  const ITEMS: { id: NavId; label: string; hint: string }[] = [
    { id: 'home', label: 'Home', hint: 'Overview' },
    { id: 'work', label: 'Work', hint: 'Artwork & series' },
    { id: 'pages', label: 'Pages', hint: 'About, contact, news…' },
    { id: 'design', label: 'Design', hint: 'How your site looks' },
    { id: 'settings', label: 'Settings', hint: 'Domain, SEO, advanced' },
    { id: 'history', label: 'History', hint: 'Roll back to an earlier version' },
    { id: 'updates', label: 'Updates', hint: 'Refresh your site’s template' },
  ];
</script>

<!-- Scrim sits under the drawer on mobile; click to close. -->
<button
  class="ez-scrim"
  class:ez-scrim--on={open}
  aria-label="Close menu"
  tabindex={open ? 0 : -1}
  onclick={() => (open = false)}
></button>

<aside class="ez-side" class:ez-side--open={open}>
  <div class="ez-side__brand">
    <EaselMark size={30} />
    <strong>easel</strong>
  </div>

  <nav class="ez-side__nav" aria-label="Sections">
    {#each ITEMS as item (item.id)}
      <button
        class="ez-sidebtn"
        class:ez-sidebtn--on={view === item.id}
        aria-current={view === item.id ? 'page' : undefined}
        onclick={() => nav(item.id)}
      >
        <span class="ez-sidebtn__label">{item.label}</span>
        <span class="ez-sidebtn__hint">{item.hint}</span>
      </button>
    {/each}
  </nav>

  <div class="ez-side__foot">
    <a class="ez-btn ez-btn--sm ez-btn--outline ez-side__view" href={siteUrl} target="_blank" rel="noopener">
      View site ↗
    </a>
    {#if !demo}
      <div class="ez-side__account">
        <span class="ez-who" title={login}>@{login}</span>
        <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={onSignOut}>Sign out</button>
      </div>
    {:else}
      <span class="ez-who">Demo mode</span>
    {/if}
  </div>
</aside>
