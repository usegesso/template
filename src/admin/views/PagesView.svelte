<script lang="ts">
  import type { GitHub } from '../lib/github';
  import type { AboutPage, ContactPage, CvPage, PressPage } from '../lib/content';
  import {
    loadAbout, saveAbout, loadContact, saveContact,
    loadCv, saveCv, loadPress, savePress,
  } from '../lib/store';

  let { gh, notify }: { gh: GitHub; notify: (m: string, k?: 'info' | 'error') => void } = $props();

  type Tab = 'about' | 'contact' | 'cv' | 'press';
  let tab = $state<Tab>('about');
  let loading = $state(true);
  let saving = $state(false);

  let about = $state<AboutPage>({ title: 'About', body: '' });
  let contact = $state<ContactPage>({ title: 'Contact', formEnabled: true, body: '' });
  let cv = $state<CvPage>({ title: 'CV', cv: [] });
  let press = $state<PressPage>({ title: 'Press', press: [] });

  async function load() {
    loading = true;
    try {
      [about, contact, cv, press] = await Promise.all([
        loadAbout(gh), loadContact(gh), loadCv(gh), loadPress(gh),
      ]);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load pages.', 'error');
    }
    loading = false;
  }
  load();

  async function save() {
    saving = true;
    try {
      if (tab === 'about') await saveAbout(gh, $state.snapshot(about));
      else if (tab === 'contact') await saveContact(gh, $state.snapshot(contact));
      else if (tab === 'cv') await saveCv(gh, $state.snapshot(cv) as CvPage);
      else await savePress(gh, $state.snapshot(press) as PressPage);
      notify('Saved. Your site will update shortly.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
    saving = false;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
    { id: 'cv', label: 'CV' },
    { id: 'press', label: 'Press' },
  ];
</script>

<div class="ez-view__head">
  <h2>Pages</h2>
  {#if !loading}
    <button class="ez-btn ez-btn--primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  {/if}
</div>

<div class="ez-tabs">
  {#each TABS as t (t.id)}
    <button class="ez-tab" class:ez-tab--on={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
  {/each}
</div>

{#if loading}
  <p class="ez-help">Loading…</p>
{:else if tab === 'about'}
  <label class="ez-field"><span class="ez-label">One-line intro</span>
    <input class="ez-input" bind:value={about.statement} placeholder="Painter working between Lisbon and Berlin" /></label>
  <label class="ez-field"><span class="ez-label">Your bio</span>
    <textarea class="ez-input" rows="8" bind:value={about.body}></textarea></label>
{:else if tab === 'contact'}
  <label class="ez-field"><span class="ez-label">Intro</span>
    <input class="ez-input" bind:value={contact.intro} placeholder="I'd love to hear from you" /></label>
  <label class="ez-field"><span class="ez-label">Your email</span>
    <input class="ez-input" bind:value={contact.email} placeholder="you@example.com" /></label>
  <label class="ez-field ez-field--check">
    <input type="checkbox" bind:checked={contact.formEnabled} />
    <span>Show a contact form so visitors can message me</span></label>
{:else if tab === 'cv'}
  {#each cv.cv as section, si (si)}
    <div class="ez-block">
      <div class="ez-block__head">
        <input class="ez-input" bind:value={section.heading} placeholder="Section, e.g. Exhibitions" />
        <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => (cv.cv = cv.cv.filter((_, i) => i !== si))}>Remove</button>
      </div>
      {#each section.items as item, ii (ii)}
        <div class="ez-row">
          <input class="ez-input" style="max-width:7rem" bind:value={item.year} placeholder="Year" />
          <input class="ez-input" bind:value={item.text} placeholder="Detail" />
          <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => (section.items = section.items.filter((_, i) => i !== ii))}>×</button>
        </div>
      {/each}
      <button class="ez-btn ez-btn--sm" onclick={() => (section.items = [...section.items, { year: '', text: '' }])}>Add entry</button>
    </div>
  {/each}
  <button class="ez-btn" onclick={() => (cv.cv = [...cv.cv, { heading: '', items: [] }])}>Add section</button>
{:else}
  {#each press.press as item, pi (pi)}
    <div class="ez-block">
      <div class="ez-block__head">
        <input class="ez-input" bind:value={item.outlet} placeholder="Publication" />
        <button class="ez-btn ez-btn--sm ez-btn--ghost" onclick={() => (press.press = press.press.filter((_, i) => i !== pi))}>Remove</button>
      </div>
      <input class="ez-input" bind:value={item.title} placeholder="Headline" />
      <div class="ez-row">
        <input class="ez-input" bind:value={item.url} placeholder="Link (optional)" />
        <input class="ez-input" style="max-width:9rem" bind:value={item.date} placeholder="Date" />
      </div>
      <textarea class="ez-input" rows="2" bind:value={item.excerpt} placeholder="Quote (optional)"></textarea>
    </div>
  {/each}
  <button class="ez-btn" onclick={() => (press.press = [...press.press, { outlet: '', title: '' }])}>Add mention</button>
{/if}
