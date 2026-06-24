<script lang="ts">
  import { designVars, designClasses, motionAttr, googleFontsHref, type DesignTokens } from '../../lib/design';

  let { design }: { design: DesignTokens } = $props();

  let iframe: HTMLIFrameElement;
  let loaded = $state(false);
  let viewport = $state<'desktop' | 'mobile'>('desktop');

  // Re-theme the live site inside the iframe by writing the same CSS variables +
  // structural classes the real build uses. No rebuild — instant preview.
  function apply() {
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const html = doc.documentElement;
    html.style.cssText = designVars(design);
    html.className = designClasses(design);
    html.setAttribute('data-motion', motionAttr(design));
    let link = doc.getElementById('ez-preview-fonts') as HTMLLinkElement | null;
    if (!link) {
      link = doc.createElement('link');
      link.id = 'ez-preview-fonts';
      link.rel = 'stylesheet';
      doc.head.appendChild(link);
    }
    link.href = googleFontsHref(design);
  }

  // Reapply whenever any token changes (deep — Svelte tracks nested access).
  $effect(() => {
    JSON.stringify(design); // touch all fields so the effect re-runs on any change
    if (loaded) apply();
  });
</script>

<div class="ez-preview">
  <div class="ez-preview__bar">
    <span class="ez-help">Live preview</span>
    <div class="ez-preview__vp">
      <button class="ez-btn ez-btn--sm" class:ez-btn--primary={viewport === 'desktop'} onclick={() => (viewport = 'desktop')}>Desktop</button>
      <button class="ez-btn ez-btn--sm" class:ez-btn--primary={viewport === 'mobile'} onclick={() => (viewport = 'mobile')}>Mobile</button>
    </div>
  </div>
  <div class="ez-preview__stage" class:ez-preview__stage--mobile={viewport === 'mobile'}>
    <iframe
      bind:this={iframe}
      src="/"
      title="Live preview of your site"
      onload={() => {
        loaded = true;
        apply();
      }}
    ></iframe>
  </div>
</div>
