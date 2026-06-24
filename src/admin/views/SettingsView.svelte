<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { Settings } from '../lib/content';
  import { loadSettings, saveSettings } from '../lib/store';

  let { gh, notify }: { gh: GitHub; notify: (m: string, k?: 'info' | 'error') => void } = $props();

  let s = $state<Settings>({
    siteTitle: '', logoText: '', theme: 'default', portfolioLayout: 'grid',
    columns: 3, motionDefault: 'full', rightClickProtect: false, watermark: false, socialLinks: [],
  });
  let loading = $state(true);
  let saving = $state(false);

  async function load() {
    loading = true;
    try {
      s = await loadSettings(gh);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load settings.', 'error');
    }
    loading = false;
  }
  load();

  async function save() {
    saving = true;
    try {
      await saveSettings(gh, $state.snapshot(s) as Settings);
      notify('Settings saved. Your site will update shortly.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
    saving = false;
  }

</script>

<div class="ez-view__head">
  <h2>Settings</h2>
  {#if !loading}
    <button class="ez-btn ez-btn--primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  {/if}
</div>

{#if loading}
  <p class="ez-help">Loading…</p>
{:else}
  <p class="ez-help">Looks and themes live in the <strong>Design</strong> tab. This is the practical stuff.</p>

  <label class="ez-field"><span class="ez-label">Site title</span>
    <input class="ez-input" bind:value={s.siteTitle} placeholder="Your name or studio" />
    <span class="ez-help">Shows in the browser tab and search results.</span></label>
  <label class="ez-field"><span class="ez-label">Tagline</span>
    <input class="ez-input" bind:value={s.tagline} placeholder="Paintings and works on paper" /></label>
  <label class="ez-field"><span class="ez-label">Name shown in the header</span>
    <input class="ez-input" bind:value={s.logoText} placeholder="Your name" /></label>

  <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={s.rightClickProtect} />
    <span>Discourage saving my images (right-click)</span></label>
  <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={s.watermark} />
    <span>Watermark my images</span></label>
  {#if s.watermark}
    <label class="ez-field"><span class="ez-label">Watermark text</span>
      <input class="ez-input" bind:value={s.watermarkText} placeholder="© Your Name" /></label>
  {/if}

  <label class="ez-field"><span class="ez-label">Search description</span>
    <textarea class="ez-input" rows="2" bind:value={s.metaDescription}></textarea>
    <span class="ez-help">A sentence describing your site, shown in Google results.</span></label>

  <div class="ez-block">
    <div class="ez-block__head"><strong>Social links</strong>
      <button class="ez-btn ez-btn--sm" onclick={() => (s.socialLinks = [...s.socialLinks, { label: '', url: '' }])}>Add link</button></div>
    {#each s.socialLinks as link, i (i)}
      <div class="ez-row">
        <input class="ez-input" style="max-width:10rem" bind:value={link.label} placeholder="Instagram" />
        <input class="ez-input" bind:value={link.url} placeholder="https://instagram.com/you" />
        <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => (s.socialLinks = s.socialLinks.filter((_, j) => j !== i))}>×</button>
      </div>
    {/each}
  </div>

  <details class="ez-advanced">
    <summary>Advanced</summary>
    <label class="ez-field"><span class="ez-label">Custom domain</span>
      <input class="ez-input" bind:value={s.customDomain} placeholder="your-name.com" /></label>
    <label class="ez-field"><span class="ez-label">Social preview image path</span>
      <input class="ez-input" bind:value={s.ogImage} placeholder="/assets/og-default.jpg" /></label>
    <label class="ez-field"><span class="ez-label">Analytics code</span>
      <textarea class="ez-input" rows="3" bind:value={s.analyticsSnippet}></textarea></label>
  </details>
{/if}
