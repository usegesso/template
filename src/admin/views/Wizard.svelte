<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { Settings } from '../lib/content';
  import { loadSettings, saveSettings } from '../lib/store';
  import { DISCIPLINES, applyDiscipline, SUGGESTED_FONTS, resolveDesign, type DesignTokens } from '../../lib/design';
  import LivePreview from './LivePreview.svelte';
  import FontPicker from './FontPicker.svelte';
  import ContrastNotice from './ContrastNotice.svelte';
  import PresetGallery from './PresetGallery.svelte';
  import GessoMark from '../GessoMark.svelte';
  import { crossfade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const [send, receive] = crossfade({ duration: 220, easing: quintOut });

  let {
    gh,
    notify,
    onClose,
  }: {
    gh: GitHub;
    notify: (m: string, k?: 'info' | 'error') => void;
    onClose: (saved: boolean) => void;
  } = $props();

  let s = $state<Settings | null>(null);
  let d = $state<DesignTokens>(resolveDesign(undefined));
  let previewD = $state<DesignTokens | null>(null);
  let step = $state(0);
  let saving = $state(false);

  loadSettings(gh).then((res) => {
    s = res;
    if (res.design) d = resolveDesign(res.design);
  });

  const STEPS = ['You', 'Craft', 'Vibe', 'Type', 'Colors', 'Layout', 'Done'];

  let craft = $state('');
  let penEdited = $state(false);

  function onName() {
    if (s && !penEdited) s.logoText = s.siteTitle;
  }

  function pickCraft(id: string) {
    craft = id;
    // Craft seeds layout + default pages only; the current styling is preserved.
    d = applyDiscipline(d, id);
  }

  function next() { if (step < STEPS.length - 1) step += 1; previewD = null; }
  function back() { if (step > 0) step -= 1; previewD = null; }

  async function finish() {
    if (!s) return;
    saving = true;
    try {
      s.design = $state.snapshot(d) as Record<string, any>;
      await saveSettings(gh, $state.snapshot(s) as Settings);
      notify('Your style is set. Your site will update shortly.');
      onClose(true);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
      saving = false;
    }
  }

  const WEIGHTS = [400, 500, 600, 700, 800];
</script>

<div class="ez-wiz">
  <header class="ez-wiz__head">
    <div class="ez-wiz__brand"><GessoMark size={28} /><strong>gesso</strong><span class="ez-help">Let's set up your style</span></div>
    <ol class="ez-wiz__steps">
      {#each STEPS as label, i (label)}
        <li class:ez-wiz__step--on={i === step} class:ez-wiz__step--done={i < step}>
          {#if i === step}
            <span class="ez-wiz__hl" in:receive={{ key: 'wiz-hl' }} out:send={{ key: 'wiz-hl' }}></span>
          {/if}
          <span class="ez-wiz__step-label">{label}</span>
        </li>
      {/each}
    </ol>
    <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => onClose(false)}>Skip for now</button>
  </header>

  <div class="ez-wiz__body">
    <div class="ez-wiz__panel">
      {#if step === 0}
        <h1>First, the basics.</h1>
        <p class="ez-help">This names your site. You can change it any time.</p>
        {#if s}
          <label class="ez-field"><span class="ez-label">Your name</span>
            <input class="ez-input" bind:value={s.siteTitle} oninput={onName} placeholder="e.g. Alex Rivera" /></label>
          <label class="ez-field"><span class="ez-label">Go by a different name?</span>
            <input class="ez-input" bind:value={s.logoText} oninput={() => (penEdited = true)} placeholder="Pen name, brand, or studio (optional)" />
            <span class="ez-help">Shown as your site's title. Leave blank to use your name.</span></label>
        {/if}
      {:else if step === 1}
        <h1>What do you make?</h1>
        <p class="ez-help">We'll set up a layout and the pages your work tends to need — your colors and type come next.</p>
        <div class="ez-wiz__grid">
          {#each DISCIPLINES as c (c.id)}
            <button class="ez-wiz__card" class:ez-wiz__card--on={craft === c.id} onclick={() => pickCraft(c.id)}>
              <span class="ez-wiz__card-title">{c.label}</span>
            </button>
          {/each}
        </div>
      {:else if step === 2}
        <h1>What's the vibe?</h1>
        <p class="ez-help">Hover any style to try it on. Click to keep it. You can fine-tune everything next.</p>
        <PresetGallery
          design={d}
          onConfirm={(next) => (d = next)}
          onPreview={(p) => (previewD = p)}
        />
      {:else if step === 3}
        <h1>Choose your type</h1>
        <label class="ez-field"><span class="ez-label">Heading font</span>
          <FontPicker value={d.type.headingFont} fonts={SUGGESTED_FONTS.heading} onpick={(f) => (d.type.headingFont = f)} /></label>
        <label class="ez-field"><span class="ez-label">Body font</span>
          <FontPicker value={d.type.bodyFont} fonts={SUGGESTED_FONTS.body} onpick={(f) => (d.type.bodyFont = f)} /></label>
        <p class="ez-help">Each option shows in its own typeface. Pick by sight.</p>
        <label class="ez-field"><span class="ez-label">Heading weight</span>
          <select class="ez-input" bind:value={d.type.headingWeight}>{#each WEIGHTS as w}<option value={w}>{w}</option>{/each}</select></label>
        <label class="ez-field"><span class="ez-label">Text size — {d.type.baseSize}px</span>
          <input type="range" min="14" max="22" step="1" bind:value={d.type.baseSize} /></label>
      {:else if step === 4}
        <h1>Set your colors</h1>
        <p class="ez-help">The essentials. More slots live in the Design tab later.</p>
        <div class="ez-colorgrid">
          <label class="ez-color"><input type="color" bind:value={d.color.background} /><span>Background</span></label>
          <label class="ez-color"><input type="color" bind:value={d.color.text} /><span>Text</span></label>
          <label class="ez-color"><input type="color" bind:value={d.color.accent} /><span>Accent</span></label>
          <label class="ez-color"><input type="color" bind:value={d.color.accent2} /><span>Second accent</span></label>
          <label class="ez-color"><input type="color" bind:value={d.color.border} /><span>Lines</span></label>
        </div>
        <ContrastNotice design={d} />
      {:else if step === 5}
        <h1>Lay it out</h1>
        <label class="ez-field"><span class="ez-label">Navigation</span>
          <select class="ez-input" bind:value={d.nav.layout}>
            <option value="side">Name beside the menu</option><option value="top">Name above the menu</option></select></label>
        <label class="ez-field"><span class="ez-label">Gallery layout</span>
          <select class="ez-input" bind:value={d.gallery.layout}>
            <option value="grid">Even grid</option><option value="masonry">Masonry (varied heights)</option></select></label>
        <label class="ez-field"><span class="ez-label">Piece size</span>
          <select class="ez-input" bind:value={d.gallery.size}>
            <option value="small">Small (more per row)</option><option value="medium">Medium</option><option value="large">Large (fewer per row)</option></select></label>
        <label class="ez-field"><span class="ez-label">Thumbnails</span>
          <select class="ez-input" bind:value={d.thumb.fit}>
            <option value="contain">Keep original shape</option><option value="cover">Crop to squares</option></select></label>
        <label class="ez-field"><span class="ez-label">Captions</span>
          <select class="ez-input" bind:value={d.gallery.caption}>
            <option value="below">Below each piece</option><option value="hover">On hover</option><option value="hidden">Hidden</option></select></label>
        <label class="ez-field"><span class="ez-label">Gallery width</span>
          <select class="ez-input" bind:value={d.contentWidth}>
            <option value="narrow">Narrow</option><option value="normal">Normal</option><option value="wide">Wide</option></select></label>
        <label class="ez-field"><span class="ez-label">Reading width</span>
          <select class="ez-input" bind:value={d.readingWidth}>
            <option value="comfortable">Comfortable</option><option value="relaxed">Relaxed</option><option value="spacious">Spacious</option></select></label>
        <label class="ez-field ez-field--check"><input type="checkbox" bind:checked={d.hero.enabled} /><span>Show an intro (name + tagline) above my work</span></label>
        {#if d.hero.enabled && s}
          <label class="ez-field"><span class="ez-label">Your name</span>
            <input class="ez-input" bind:value={s.siteTitle} oninput={onName} placeholder="Lina Marsh" /></label>
          <label class="ez-field"><span class="ez-label">Tagline</span>
            <input class="ez-input" bind:value={s.tagline} placeholder="Paintings and works on paper" /></label>
        {/if}
      {:else}
        <h1>Looks great.</h1>
        <p>Your site is ready to wear this style. You can fine-tune every detail any time in the <strong>Design</strong> tab.</p>
        <button class="ez-btn ez-btn--primary ez-btn--lg" onclick={finish} disabled={saving}>{saving ? 'Saving…' : 'Finish & save'}</button>
      {/if}
    </div>

    <div class="ez-wiz__preview">
      <LivePreview design={step === 2 && previewD ? previewD : d} content={{ logoText: s?.logoText, siteTitle: s?.siteTitle, tagline: s?.tagline, footerText: d.footer.text }} filler />
    </div>
  </div>

  <footer class="ez-wiz__foot">
    <button class="ez-btn" onclick={back} disabled={step === 0}>Back</button>
    {#if step < STEPS.length - 1}
      <button class="ez-btn ez-btn--primary" onclick={next}>Next</button>
    {/if}
  </footer>
</div>
