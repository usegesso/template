<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { Settings } from '../lib/content';
  import { loadSettings, saveSettings, uploadAsset } from '../lib/store';
  import {
    PRESETS, SUGGESTED_FONTS, resolveDesign, type DesignTokens,
  } from '../../lib/design';
  import { useShell } from '../lib/shell.svelte';
  import LivePreview from './LivePreview.svelte';
  import FontPicker from './FontPicker.svelte';
  import ContrastNotice from './ContrastNotice.svelte';

  let {
    gh,
    notify,
    onWizard,
  }: {
    gh: GitHub;
    notify: (m: string, k?: 'info' | 'error') => void;
    onWizard: () => void;
  } = $props();

  const shell = useShell();

  let s = $state<Settings | null>(null);
  let d = $state<DesignTokens>(resolveDesign(undefined));
  let loading = $state(true);
  let savedJson = $state('');
  let logoPreview = $state('');
  let faviconPreview = $state('');
  let uploading = $state(false);

  async function uploadFor(kind: 'logo' | 'favicon', e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    if (kind === 'logo') logoPreview = objUrl;
    else faviconPreview = objUrl;
    uploading = true;
    try {
      const path = await uploadAsset(gh, file, kind);
      if (kind === 'logo') {
        d.logo.image = path;
        d.logo.mode = 'image';
      } else {
        d.favicon.image = path;
        d.favicon.mode = 'image';
      }
      shell.markCommitted();
      notify(`${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not upload.', 'error');
    }
    uploading = false;
  }

  async function load() {
    loading = true;
    try {
      s = await loadSettings(gh);
      d = resolveDesign(s.design);
      savedJson = JSON.stringify($state.snapshot(d));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load.', 'error');
    }
    loading = false;
  }
  load();

  const isDirty = () => !loading && JSON.stringify($state.snapshot(d)) !== savedJson;

  function discard() {
    if (savedJson) d = JSON.parse(savedJson) as DesignTokens;
  }

  // The section bar drives Save; expose dirty/save/discard to the shell.
  $effect(() => shell.register({ isDirty, save, discard }));

  function surprise() {
    const ids = Object.keys(PRESETS);
    const pick = ids[Math.floor(Math.random() * ids.length)];
    const base = resolveDesign({ preset: pick });
    const hue = Math.floor(Math.random() * 360);
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

  async function save(): Promise<boolean> {
    if (!s) return false;
    try {
      s.design = $state.snapshot(d) as Record<string, any>;
      await saveSettings(gh, $state.snapshot(s) as Settings);
      savedJson = JSON.stringify($state.snapshot(d));
      notify('Design saved. Your site will update shortly.');
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
      return false;
    }
  }

  const COLORS: { key: keyof DesignTokens['color']; label: string }[] = [
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'muted', label: 'Muted text' },
    { key: 'accent', label: 'Accent' },
    { key: 'accent2', label: 'Second accent' },
    { key: 'border', label: 'Lines / borders' },
    { key: 'heading', label: 'Headings' },
    { key: 'link', label: 'Links' },
  ];
  const WEIGHTS = [300, 400, 500, 600, 700, 800];
</script>

{#if loading}
  <p class="ez-help">Loading…</p>
{:else}
  <div class="ez-view__head">
    <p class="ez-help">Change anything — the preview updates as you go. Save when you're happy.</p>
    <div class="ez-view__actions">
      <button class="ez-btn" onclick={surprise}>Surprise me</button>
    </div>
  </div>

  <div class="ez-design">
    <div class="ez-design__controls">
      <section class="ez-block">
        <strong>Start fresh</strong>
        <p class="ez-help">The style wizard walks you through a whole look in about a minute. Or just tweak the details below.</p>
        <button class="ez-btn ez-btn--primary" onclick={onWizard}>Open the style wizard</button>
      </section>

      <section class="ez-block">
        <strong>Colors</strong>
        <div class="ez-colorgrid">
          {#each COLORS as c (c.key)}
            <label class="ez-color"><input type="color" bind:value={d.color[c.key]} /><span>{c.label}</span></label>
          {/each}
        </div>
        <ContrastNotice design={d} />
      </section>

      <section class="ez-block">
        <strong>Type</strong>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Heading font</span>
            <FontPicker value={d.type.headingFont} fonts={SUGGESTED_FONTS.heading} onpick={(f) => (d.type.headingFont = f)} /></label>
          <label class="ez-field"><span class="ez-label">Body font</span>
            <FontPicker value={d.type.bodyFont} fonts={SUGGESTED_FONTS.body} onpick={(f) => (d.type.bodyFont = f)} /></label>
        </div>
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
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Gallery layout</span>
            <select class="ez-input" bind:value={d.gallery.layout}>
              <option value="grid">Even grid</option><option value="masonry">Masonry</option>
              <option value="cinematic">Cinematic (one per row)</option><option value="fullbleed">Full-bleed</option></select></label>
          <label class="ez-field"><span class="ez-label">Piece size</span>
            <select class="ez-input" bind:value={d.gallery.size}>
              <option value="small">Small (more per row)</option><option value="medium">Medium</option><option value="large">Large (fewer per row)</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Thumbnails</span>
            <select class="ez-input" bind:value={d.thumb.fit}>
              <option value="contain">Keep original shape</option><option value="cover">Crop to squares</option></select></label>
          <label class="ez-field"><span class="ez-label">Hover effect</span>
            <select class="ez-input" bind:value={d.thumb.hover}>
              <option value="none">None</option><option value="zoom">Zoom</option><option value="lift">Lift</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Gallery width</span>
            <select class="ez-input" bind:value={d.contentWidth}>
              <option value="narrow">Narrow</option><option value="normal">Normal</option><option value="wide">Wide</option></select></label>
          <label class="ez-field"><span class="ez-label">Reading width</span>
            <select class="ez-input" bind:value={d.readingWidth}>
              <option value="comfortable">Comfortable</option><option value="relaxed">Relaxed</option><option value="spacious">Spacious</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Space between items</span>
            <select class="ez-input" bind:value={d.gallery.gutter}>
              <option value="none">None (seamless)</option><option value="tight">Tight</option><option value="normal">Normal</option><option value="loose">Loose</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Captions</span>
            <select class="ez-input" bind:value={d.gallery.caption}>
              <option value="below">Below each piece</option><option value="hover">On hover</option><option value="hidden">Hidden</option></select></label>
          <label class="ez-field"><span class="ez-label">Lightbox</span>
            <select class="ez-input" bind:value={d.lightbox.transition}>
              <option value="fade">Fade</option><option value="slide">Slide</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Piece style</span>
            <select class="ez-input" bind:value={d.gallery.cardStyle}>
              <option value="card">Framed card</option><option value="bare">Bare image (no frame)</option></select></label>
          <label class="ez-field"><span class="ez-label">Caption detail</span>
            <select class="ez-input" bind:value={d.gallery.captionDetail}>
              <option value="full">Full (title, details, status)</option><option value="minimal">Minimal (title only)</option></select></label>
        </div>
        <label class="ez-field--check"><input type="checkbox" bind:checked={d.lightbox.zoom} />
          <span>Let visitors click to zoom into fine detail</span></label>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Clicking a piece</span>
            <select class="ez-input" bind:value={d.gallery.click}>
              <option value="lightbox">Opens a lightbox</option><option value="page">Opens its own page</option></select>
            <span class="ez-help">Its own page is better for long descriptions, video, and sharing a single piece.</span></label>
        </div>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.gallery.featureFirst} /><span>Feature the first piece (span two columns)</span></label>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.gallery.adaptiveSpans} /><span>Let wide pieces span two columns (even grid only)</span></label>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.gallery.filters} /><span>Show filter chips on the home page (by series &amp; availability)</span></label>
      </section>

      <section class="ez-block">
        <strong>Header</strong>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Navigation</span>
            <select class="ez-input" bind:value={d.nav.layout}>
              <option value="side">Name beside links</option><option value="top">Name above links</option></select></label>
          <label class="ez-field"><span class="ez-label">Logo</span>
            <select class="ez-input" bind:value={d.logo.mode}>
              <option value="none">Just my name</option><option value="image">An image</option></select></label>
        </div>
        <div class="ez-row">
          <label class="ez-field"><span class="ez-label">Homepage shows</span>
            <select class="ez-input" bind:value={d.home.landing}>
              <option value="work">My work gallery</option><option value="about">My about page</option></select>
            <span class="ez-help">“About” makes your intro the landing page; your work moves to its own Work link.</span></label>
        </div>
        {#if d.logo.mode === 'image'}
          <label class="ez-field"><span class="ez-label">Logo image</span>
            {#if logoPreview || d.logo.image}
              <img class="ez-form__preview" style="max-height:48px" src={logoPreview || d.logo.image} alt="" />
            {/if}
            <input type="file" accept="image/*" disabled={uploading} onchange={(e) => uploadFor('logo', e)} />
            <span class="ez-help">Shown in your header instead of your name.</span></label>
        {/if}

        <label class="ez-field"><span class="ez-label">Favicon</span>
          <select class="ez-input" bind:value={d.favicon.mode}>
            <option value="initials">My initials</option><option value="image">An image</option></select>
          <span class="ez-help">The little icon in the browser tab.</span></label>
        {#if d.favicon.mode === 'image'}
          <label class="ez-field">
            {#if faviconPreview || d.favicon.image}
              <img class="ez-form__preview" style="max-height:40px" src={faviconPreview || d.favicon.image} alt="" />
            {/if}
            <input type="file" accept="image/*" disabled={uploading} onchange={(e) => uploadFor('favicon', e)} /></label>
        {/if}
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.hero.enabled} /><span>Show an intro (name + tagline) above my work</span></label>
        {#if d.hero.enabled}
          <div class="ez-row">
            <label class="ez-field"><span class="ez-label">Intro alignment</span>
              <select class="ez-input" bind:value={d.hero.align}>
                <option value="left">Left</option><option value="center">Centered</option></select></label>
            <label class="ez-field"><span class="ez-label">Intro size</span>
              <select class="ez-input" bind:value={d.hero.size}>
                <option value="small">Small</option><option value="large">Large</option></select></label>
          </div>
        {/if}
        <p class="ez-help" style="margin-top:.5rem">Which pages show in your menu now lives under <strong>Pages</strong>.</p>
      </section>

      <section class="ez-block">
        <strong>Footer</strong>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.footer.socials} /><span>Show my social links</span></label>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.footer.credit} /><span>Show the "Made with Gesso" credit</span></label>
        <label class="ez-field"><span class="ez-label">Footer text (optional)</span>
          <input class="ez-input" bind:value={d.footer.text} placeholder="e.g. By appointment only" /></label>
      </section>
    </div>

    <div class="ez-design__preview">
      <LivePreview design={d} content={{ logoText: s?.logoText, siteTitle: s?.siteTitle, tagline: s?.tagline, footerText: d.footer.text, logoImage: d.logo.image }} filler />
    </div>
  </div>
{/if}
