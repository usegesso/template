# Changelog

All notable changes to the Easel template. The version here matches `version` in
`package.json`; the editor's **Updates** panel reads this file to show artists what a
newer version includes before they choose to update.

Every update is opt-in and non-destructive: your artwork, pages, settings, and style are
always preserved, and new features stay off until you turn them on.

## 0.15.0

- **Sell or take inquiries on pieces.** Turn on "Show Buy / Inquire buttons" under
  Settings, and every available piece gets a button. Add a shop link to a piece (Stripe,
  Gumroad, Etsy, Big Cartel) and it becomes a **Buy** button that sends buyers to your own
  checkout. Leave the link blank and it becomes an **Inquire** button that opens your
  contact form with the piece's title already filled in. Easel never handles the money, it
  just points people to the right place. Off by default, so nothing changes until you turn
  it on.
- **Optional "Available work" page.** Add a single page that lists everything you have for
  sale, with prices and a Buy or Inquire button on each. Turn it on under Design, next to
  your other page options.

## 0.14.0

- **Updates no longer stall publishing on GitHub Pages.** On Pages-hosted sites, running
  an update used to quietly remove the behind-the-scenes file that rebuilds your site, so
  the update committed but your live site never refreshed. Updates now leave that file
  alone. If an earlier update already removed it, this update puts it back and republishes
  your site for you. (Netlify sites were never affected.)

## 0.13.0

- **Your changes show up right away.** After you publish an edit, visitors (and you) could
  sometimes still see the old version until a hard refresh, because browsers and hosts hold
  onto cached pages. Your site now notices when a new version has gone live and refreshes
  itself for you.

## 0.12.0

- **Simpler custom domains.** Settings no longer asks you to type your domain into Easel.
  Your links are relative, so they keep working on whatever address you use. Instead, a
  single button takes you straight to the right place on your host (your repo’s Pages
  settings, or your Netlify domain management) to set it up.
- **Roomier Design.** The Design workspace now uses the full width of your screen, so the
  controls and live preview aren’t cramped or cut off.
- **More consistent editor.** The Work and Pages section tabs now share one style.

## 0.11.0

- **Edit from your phone.** The editor now welcomes you on mobile instead of turning you
  away: add photos, update your pages, and publish right from your phone. Your choice to
  keep editing is remembered, and the full-screen style wizard no longer gets in the way on
  a small screen (designing your site’s look is still easiest on a computer).

## 0.10.0

- **More than one photo per piece.** Add detail shots, other angles, or process photos to
  any artwork under **“More photos.”** They appear on the piece’s own page, and visitors
  can step through them all in a full-screen viewer. Your main photo stays the cover and
  the one used for sharing.

## 0.9.0

- **Show your exhibitions.** A new Exhibitions page lists your upcoming and past shows
  (venue, location, dates, and an optional link), grouped so the next show is always up
  top. Add and edit them under **Pages → Exhibitions**, then turn the page on under
  **Design → Pages**. Off by default, so nothing changes until you add some.

## 0.8.0

- **A friendlier first run.** Your editor’s Home now shows a short “Getting started”
  checklist (style your site, add your first piece, write your About) that ticks each item
  off as you go and disappears once you’re set up (or whenever you dismiss it). It replaces
  the old one-off prompts with a clearer, all-in-one starting point.

## 0.7.0

- **Let visitors filter your gallery.** You can now turn on filter chips for your home
  page so visitors can jump to a series or to just the pieces that are available. Find it
  under **Design → Gallery → “Show filter chips.”** It’s off by default, and the gallery
  works exactly as before until you turn it on.

## 0.6.0

- **Polished link previews when you share your site.** When you (or anyone) shares your
  home page, a series, a news post, or your about page, it now shows a clean branded
  preview card (your title and name on your site’s own colours) instead of a bare link.
  Individual artwork pages still preview with the actual artwork. It’s automatic; nothing
  to set up.

## 0.5.0

- **Download your CV as a PDF.** Your CV page now has a “Download PDF” button that opens
  your browser’s Save-as-PDF, using your site’s own fonts and accent colour, so the
  document looks like the rest of your site. It adds a clean letterhead (your name, and how
  to reach you) and drops the site’s menu and footer from the page. Nothing to set up.

## 0.4.0

- **Followers can subscribe to your News.** Your site now publishes an RSS feed, so
  visitors can follow your updates in a reader and get new posts as you publish them. A
  subtle “RSS” link appears in your footer whenever the News page is turned on. Nothing
  changes if you don’t use News.

## 0.3.1

- **Sign-in that just works.** Fixed the "Sign in with GitHub" pop-up getting stuck on
  "Completing sign-in…" and never finishing in some browsers (notably Firefox and Safari).
  The editor now receives your sign-in reliably and the pop-up closes on its own.

## 0.3.0

- **A site that starts as yours.** New sites now open empty with a friendly prompt to
  add your first piece, instead of shipping placeholder demo artwork you have to clear out.
- **Guided first run.** The style wizard now opens by asking your name (and any brand or
  pen name) and what kind of work you make, then sets you up with a fitting layout.
- **Better defaults.** Galleries now default to a masonry layout that keeps each piece's
  original shape, rather than cropping everything to squares.
- **More distinct styles.** Theme presets now vary their layout and cropping so each one
  feels more like its own template.
- **Smoother wizard.** Fixed the setup wizard so its navigation buttons stay in view, and
  added a heads-up that steers setup to a desktop where it's easier to work.

## 0.2.0

- **Redesigned editor.** The `/admin` editor has a new sidebar layout that groups
  everything into clear sections (Home, Work, Design, Pages, News, and Settings) so
  it's easier to find what you're looking for.
- **Home dashboard.** A new landing view in the editor gives you an at-a-glance starting
  point when you log in.
- **Save & status indicator.** A persistent status chip shows when you have unsaved
  changes and confirms when your work is saved and publishing, with a prompt before you
  navigate away from unsaved edits.
- **Updates panel.** A new **Updates** section lets you pull the latest template
  improvements whenever you choose. It’s always opt-in, and your content is never touched.
- **Refreshed typography.** Updated to the Jost + Hanken Grotesk type pairing for a
  cleaner, bolder look.

## 0.1.0

- The first release of your Easel site.
