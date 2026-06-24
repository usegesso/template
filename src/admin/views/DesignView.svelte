<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { Settings } from '../lib/content';
  import { loadSettings, saveSettings } from '../lib/store';
  import {
    PRESETS, SUGGESTED_FONTS, resolveDesign, type DesignTokens,
  } from '../../lib/design';
  import LivePreview from './LivePreview.svelte';

  let { gh, notify }: { gh: GitHub; notify: (m: string, k?: 'info' | 'error') => void } = $props();

  let s = $state<Settings | null>(null);
  let d = $state<DesignTokens>(resolveDesign(undefined));
  let loading = $state(true);
  let saving = $state(false);

  async function load() {
    loading = true;
    try {
      s = await loadSettings(gh);
      d = resolveDesign(s.design);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load.', 'error');
    }
    loading = false;
  }
  load();

  function applyPreset(id: string) {
    d = resolveDesign({ preset: id });
  }

  function surprise() {
    const ids = Object.keys(PRESETS);
    const pick = ids[Math.floor(Math.random() * ids.length)];
    const base = resolveDesign({ preset: pick });
    const hue = Math.floor(Math.random() * 360);
    base.color.accent = `hsl(${hue} 70% 45%)`;
    base.shape.radius = [0, 0, 6, 16][Math.floor(Math.random() * 4)];
    base.nav.layout = Math.random() > 0.5 ? 'side' : 'top';
    // type=color needs hex; convert via a canvas-free quick hsl→hex.
    base.color.accent = hslToHex(hue, 70, 45);
    d = base;
    notify(`Surprise: a ${PRESETS[pick].label} riff.`);
  }

  function hslToHex(h: number, sPct: number, lPct: number): string {
    const sN = sPct / 100, lN = lPct / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sN * Math.min(lN, 1 - lN);
    const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
  }

  async function save() {
    if (!s) return;
    saving = true;
    try {
      s.design = $state.snapshot(d) as Record<string, any>;
      await saveSettings(gh, $state.snapshot(s) as Settings);
      notify('Design saved. Your site will update shortly.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
    saving = false;
  }

  const COLORS: { key: keyof DesignTokens['color']; label: string }[] = [
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'muted', label: 'Muted text' },
    { key: 'accent', label: 'Accent' },
    { key: 'accent2', label: 'Second accent' },
    { key: 'border', label: 'Lines / borders' },
  ];
  const WEIGHTS = [300, 400, 500, 600, 700, 800];
</script>

{#if loading}
  <p class="ez-help">Loading…</p>
{:else}
  <div class="ez-view__head">
    <div><h2>Design</h2><p class="ez-help">Change anything — the preview updates as you go.</p></div>
    <div class="ez-view__actions">
      <button class="ez-btn" onclick={surprise}>Surprise me</button>
      <button class="ez-btn ez-btn--primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </div>

  <div class="ez-design">
    <div class="ez-design__controls">
      <section class="ez-block">
        <strong>Theme</strong>
        <p class="ez-help">A starting point. Tweak anything below.</p>
        <div class="ez-presets">
          {#each Object.keys(PRESETS) as id (id)}
            <button class="ez-preset" class:ez-preset--on={d.preset === id} onclick={() => applyPreset(id)}>{PRESETS[id].label}</button>
          {/each}
        </div>
      </section>

      <section class="ez-block">
        <strong>Colors</strong>
        <div class="ez-colorgrid">
          {#each COLORS as c (c.key)}
            <label class="ez-color"><input type="color" bind:value={d.color[c.key]} /><span>{c.label}</span></label>
          {/each}
        </div>
      </section>

      <section class="ez-block">
        <strong>Type</strong>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Heading font</span>
            <input class="ez-input" list="fh" bind:value={d.type.headingFont} /></label>
          <label class="ez-field"><span class="ez-label">Body font</span>
            <input class="ez-input" list="fb" bind:value={d.type.bodyFont} /></label>
        </div>
        <datalist id="fh">{#each SUGGESTED_FONTS.heading as f}<option value={f}></option>{/each}</datalist>
        <datalist id="fb">{#each SUGGESTED_FONTS.body as f}<option value={f}></option>{/each}</datalist>
        <p class="ez-help">Pick a suggested font or type any Google Fonts name.</p>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Heading weight</span>
            <select class="ez-input" bind:value={d.type.headingWeight}>{#each WEIGHTS as w}<option value={w}>{w}</option>{/each}</select></label>
          <label class="ez-field"><span class="ez-label">Body weight</span>
            <select class="ez-input" bind:value={d.type.bodyWeight}>{#each WEIGHTS as w}<option value={w}>{w}</option>{/each}</select></label>
        </div>
        <label class="ez-field"><span class="ez-label">Text size — {d.type.baseSize}px</span>
          <input type="range" min="14" max="22" step="1" bind:value={d.type.baseSize} /></label>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Headings</span>
            <select class="ez-input" bind:value={d.type.headingTransform}>
              <option value="none">Normal</option><option value="uppercase">UPPERCASE</option></select></label>
          <label class="ez-field"><span class="ez-label">Letter spacing — {d.type.letterSpacing}em</span>
            <input type="range" min="-0.05" max="0.1" step="0.01" bind:value={d.type.letterSpacing} /></label>
        </div>
      </section>

      <section class="ez-block">
        <strong>Shape &amp; feel</strong>
        <label class="ez-field"><span class="ez-label">Corner roundness — {d.shape.radius}px</span>
          <input type="range" min="0" max="28" step="1" bind:value={d.shape.radius} /></label>
        <label class="ez-field"><span class="ez-label">Line thickness — {d.shape.borderWidth}px</span>
          <input type="range" min="0" max="4" step="1" bind:value={d.shape.borderWidth} /></label>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Shadows</span>
            <select class="ez-input" bind:value={d.shape.shadows}>
              <option value="none">None</option><option value="hard">Hard</option><option value="soft">Soft</option></select></label>
          <label class="ez-field"><span class="ez-label">Spacing</span>
            <select class="ez-input" bind:value={d.density}>
              <option value="compact">Compact</option><option value="normal">Normal</option><option value="airy">Airy</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Animation</span>
            <select class="ez-input" bind:value={d.motion}>
              <option value="smooth">Smooth</option><option value="rigid">Snappy</option><option value="none">None</option></select></label>
          <label class="ez-field"><span class="ez-label">Background</span>
            <select class="ez-input" bind:value={d.background.type}>
              <option value="solid">Solid color</option><option value="texture">Subtle texture</option><option value="none">Plain white</option></select></label>
        </div>
      </section>

      <section class="ez-block">
        <strong>Header &amp; pages</strong>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Navigation</span>
            <select class="ez-input" bind:value={d.nav.layout}>
              <option value="side">Name beside links</option><option value="top">Name above links</option></select></label>
          <label class="ez-field"><span class="ez-label">Logo</span>
            <select class="ez-input" bind:value={d.logo.mode}>
              <option value="none">Just my name</option><option value="image">Upload a logo</option></select></label>
        </div>
        {#if d.logo.mode === 'image'}
          <label class="ez-field"><span class="ez-label">Logo image path</span>
            <input class="ez-input" bind:value={d.logo.image} placeholder="/assets/site/logo.png" /></label>
        {/if}
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.hero.enabled} /><span>Show an intro (name + tagline) above my work</span></label>
        <p class="ez-help" style="margin-top:.5rem">Pages to show in the menu</p>
        <div class="ez-row">
          <label class="ez-field--check"><input type="checkbox" bind:checked={d.pages.about} /><span>About</span></label>
          <label class="ez-field--check"><input type="checkbox" bind:checked={d.pages.contact} /><span>Contact</span></label>
          <label class="ez-field--check"><input type="checkbox" bind:checked={d.pages.cv} /><span>CV</span></label>
          <label class="ez-field--check"><input type="checkbox" bind:checked={d.pages.press} /><span>Press</span></label>
        </div>
      </section>
    </div>

    <div class="ez-design__preview">
      <LivePreview design={d} />
    </div>
  </div>
{/if}
