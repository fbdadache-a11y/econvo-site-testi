# Econovo Club — Website

A full-stack club portal for the Econovo economics club, built on plain
HTML/CSS/JS (no framework) with Supabase as the backend. Deployable to
GitHub Pages or any static host.
 .
---

## Project structure

```
econovo-fixed/
├── index.html                  # Public landing page (homepage)
├── pages/
│   ├── dashboard.html          # Member portal (approved members only)
│   ├── admin.html              # Admin control room (admin role only)
│   ├── pending.html            # "Awaiting approval" screen for new sign-ups
│   ├── login.html              # Login page
│   ├── join.html               # Registration / sign-up page
│   └── share-editor.html       # Standalone "share post as image" editor (own tab)
├── css/
│   ├── style.css               # Design tokens, reset, dark mode
│   ├── themes.css              # 12 palettes (Nord, Dracula, Catppuccin, etc.)
│   ├── components.css          # Navbar, buttons, cards, badges, modals
│   ├── sections.css            # Hero, stats, journey, team, events, footer
│   ├── posts.css               # Feed, composer, reactions, comments, groups, markdown rendering
│   ├── animations-supplement.css
│   └── responsive.css          # Tablet + mobile breakpoints
├── js/
│   ├── main.js                 # Navbar scroll, mobile menu, dark mode toggle
│   ├── language.js             # Loads content-{lang}.json and renders sections
│   ├── posts.js                # Posts feed, reactions, comments, image upload
│   ├── composer.js             # Discord-style Markdown parser (parseMarkdown)
│   ├── share-editor.js         # Logic for pages/share-editor.html
│   ├── icons.js                # Group icon registry (Lucide SVGs by key name)
│   ├── animations.js            # Dashboard scroll-driven + WAAPI entrance/reveal
│   ├── login-animations.js      # Same system, scoped to pages/login.html
│   ├── join-animations.js       # Same system, scoped to pages/join.html
│   ├── auth.js                 # Auth helpers + approval-status page guards
│   ├── admin.js                # Admin control room logic
│   └── faq.js                  # FAQ accordion
├── data/
│   ├── content-en.json         # All English copy (edit here, not the HTML)
│   └── content-ar.json         # All Arabic copy
├── groups_migration.sql        # Creates groups + group_members tables in Supabase
└── reactions_migration.sql     # Creates reactions table in Supabase
```

---

## Supabase database schema

### Tables used by the portal

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id`, `full_name`, `avatar_url`, `first_name`, `last_name`, `major`, `year` | Linked to `auth.users` |
| `posts` | `id`, `content`, `image_url`, `user_id`, `full_name`, `created_at` | Supports multiple images (stored as JSON array in `image_url`) |
| `comments` | `id`, `post_id`, `content`, `user_id`, `created_at` | Joined with `profiles` for author name + avatar |
| `reactions` | `id`, `post_id`, `user_id`, `emoji`, `created_at` | One reaction per emoji per user per post (unique constraint) |
| `groups` | `id`, `name`, `description`, `icon_key`, `created_by`, `created_at` | `icon_key` maps to Lucide icon in `js/icons.js` |
| `group_members` | `group_id`, `user_id`, `joined_at` | Join table; composite PK prevents duplicate joins |
| `group_posts` | `id`, `group_id`, `content`, `user_id`, `created_at` | Joined with `profiles` |
| `announcements` | `id`, `title`, `body`, `date_label`, `published`, `created_at` | `published = false` hides a row without deleting it |
| `events` | `id`, `title`, `description`, `event_date`, `month_short`, `day_num`, `tag`, `created_at` | Past events are auto-hidden by the dashboard |

### Running migrations

Two SQL files are included for the tables that needed explicit setup:

```bash
# In Supabase → SQL Editor → New Query:
# 1. Paste and run groups_migration.sql  (creates groups + group_members + RLS + seed data)
# 2. Paste and run reactions_migration.sql  (creates reactions + RLS)
```

The remaining tables (`posts`, `comments`, `profiles`, `announcements`, `events`,
`group_posts`) should be created manually in the Supabase Table Editor to match
the columns listed above, with RLS policies allowing authenticated users to read
and write their own rows.

---

## Running locally

Content and data are loaded with `fetch()`, so opening `index.html` from disk
(`file://`) will fail with a CORS error. Serve it over HTTP instead:

```bash
cd econovo-fixed
python3 -m http.server 8000
# open http://localhost:8000
```

On GitHub Pages or any static host this just works over `https://`.

---

## Content editing

Almost no text is hard-coded in `index.html`. All homepage sections
(Stats, Why Econovo, Focus Areas, Journey, Team, Events, FAQ) are
**rendered from JSON** by `js/language.js`. To change copy or add entries:

1. Open `data/content-en.json` (and the matching key in `content-ar.json`).
2. Edit the relevant array (e.g. add an object to `events.items`).
3. Save — no HTML/CSS/JS knowledge needed.

Announcements and events shown inside the **member portal** are managed
entirely in the Supabase database (see tables above). No redeploy needed
to add or update them.

---

## Changelog

### v3.5 — Landing page: broken theming fixed + visual unification with the dashboard (current)

`index.html` hadn't been touched in about a month while the dashboard went
through several rounds of theming/animation work — this pass first fixed
what had actually broken, then unified the one real visual mismatch found.

**Bugs found and fixed:**

1. **`css/themes.css` was never linked in `index.html`.** All 12 palettes
   (Nord, Dracula, Catppuccin, etc.) work everywhere else in the project —
   the landing page silently didn't support any of them. A member who set
   a non-default theme in Profile → Appearance would see it correctly on
   `dashboard.html` but have it quietly ignored on the public homepage.
2. **A stray literal Arabic comment fragment (`← هنا`) was baked directly
   into the `<link>` tag on the animations-supplement.css line** — actual
   corrupted bytes in the file, not a copy-paste artifact from reviewing
   it. Harmless to rendering (browsers ignore trailing garbage after `>`),
   but it broke `grep`/`sed`-based tooling and needed removing regardless.
3. **The anti-flicker theme script only checked `t === 'dark'`** (binary),
   while every other page in the project checks `t && t !== 'light'` to
   support all 12 themes. Updated to match.

**Visual unification (the actual "make it match the dashboard" request):**

Audited every shared design token — colors, shadows, fonts, logo sizing,
navbar treatment — against the dashboard's actual CSS rather than
guessing. Nearly everything was already consistent (same Host Grotesk /
IBM Plex Mono fonts, same Obsidian/Sage color tokens, same frosted-glass
navbar technique with `color-mix()`, same ~30px logo treatment). The one
real, visible mismatch:

- **`css/components.css`** — `.btn` and `.btn-outline` used a
  `border-radius: 2px 2px 10px 10px` ("asymmetric editorial" radius,
  literally labeled as such in the original comment) left over from an
  earlier design pass, unique to the landing page. Every button/pill/card
  on the dashboard uses the plain `var(--r-md)` (8px) token. Unified both
  button classes to `var(--r-md)` — this was the single biggest reason the
  two surfaces didn't read as "the same product" despite sharing a palette.

**Deliberately left alone** (checked against Econovo's actual Brand Book
PDF — Obsidian Black `#0E2A24`, Silver Sage `#8FB8A6`, Chalk White
`#F4F7F2`/`#F6F4F0`, Host Grotesk + IBM Plex Sans Arabic — not a generic
brand-styling skill, which does not apply to this project): a few
hardcoded pixel radius values in `sections.css`/`components.css` (10px,
16px, etc.) that are close to but not exactly on the `--r-sm/md/lg/xl`
scale. These are minor and not visually jarring the way the asymmetric
button radius was; normalizing every single one was judged to be outside
the scope of "unify the identity" and risked introducing regressions for
marginal visual gain.

**Known issue flagged, not fixed (out of scope for a landing-page-only
pass):** `index.html`'s inline auth-aware-UI script reads
`localStorage.getItem('econovo-token')` directly instead of going through
`EconovoAuth.getValidToken()` (the pattern established in `login.html`/
`join.html`/`dashboard.html`). This means the navbar can show a member as
signed in using stale cached data even after their session has actually
expired, until they click through and get redirected to log in again —
the exact class of bug `EconovoAuth.getValidToken()` was built to prevent
elsewhere. `pages/pending.html` was also found to only support
`data-theme="dark"` (binary), not linking `themes.css` at all — same root
cause as bug #1 above, but on a different page.

---

### v3.4 — Standalone share editor page

Replaced v3.3's "click and immediately download" share flow with a proper
editor page — the export image was previously a simplified re-implementation
of a post's look (custom inline styles) rather than the real thing, and
there was no way to adjust anything before downloading.

- **`pages/share-editor.html`** *(new)* — standalone page, own top bar, own
  theme switch. **Not** wired into the dashboard's sidebar/nav — it only
  opens via a post's share button, in a new tab, matching the "independent
  from the dashboard" request. Loads the exact same stylesheet chain as
  `dashboard.html` (`style.css` → `themes.css` → `components.css` →
  `posts.css`) so the preview card is pixel-identical to a real feed post,
  not a lookalike — any future redesign of `.post-card` in `posts.css`
  automatically applies here too, with zero duplicated CSS.
- **`js/share-editor.js`** *(new)* — reads the post handed off via
  `sessionStorage['econovo-share-payload']` (cleared immediately after
  reading, so a stale tab can't reuse old post data), builds the preview
  using the real `.post-card`/`.post-header`/`.post-avatar`/`.reaction-row`
  markup, and rasterizes it with html2canvas on download. Uses its **own**
  `localStorage` key (`econovo-share-theme`), independent from the
  dashboard's `econovo-theme` — picking a Dracula-themed export shouldn't
  change a member's actual dashboard theme.
- **`js/posts.js`** — `sharePostAsImage()` (the old immediate-export
  function) replaced with `openShareEditor()`, which packages the post's
  content/author/avatar/date/top-3-reactions into sessionStorage and calls
  `window.open('share-editor.html', '_blank')`. Added
  `collectReactionSummary(card)`, which reads reaction counts straight off
  the already-rendered DOM (`.reaction-btn[data-key]` /
  `.reaction-count` — matching `renderReactionBar()`'s actual markup) so the
  editor can show real reactions without a second network request.

**Editor features** (researched against 2026 social-sharing best practices
before building):

| Control | Why |
|---|---|
| **1:1 / 4:5 / Auto aspect ratio** | 4:5 portrait is now Meta's preferred feed ratio for 2026 (more vertical screen space, measurably better reach than square); 1:1 remains the universal safe default across every other platform; Auto for anyone who just wants the card at its natural height. |
| **Show/hide reactions** | Some members may not want reaction counts visible when reposting externally. |
| **Show/hide timestamp** | Same reasoning — optional context, not always wanted. |
| **Show/hide Econovo watermark** | Watermark text upgraded from v3.3's plain "ECONOVO CLUB" to include the club's actual location ("Econovo Club · Bordj Bou Arreridj", pulled from `content-en.json`'s location info) — reinforces local identity when a post is shared outside the club. |
| **Theme picker (all 12 palettes)** | Directly requested — lets a member pick any of the existing themes for the exported image, independent of their dashboard theme. |
| Export at 2x scale | 2026 guidance: export at 2x target dimensions so the platform's server-side re-compression pass doesn't introduce visible banding/softness. |
| PNG output | Preserves crisp text/logo edges — JPEG's compression blurs text, which is most of what's in these cards. |

Checkerboard background behind the export frame in the preview pane makes
it visually obvious "this transparent-ish area is the actual export
boundary" — a pattern borrowed from image editors (Photoshop, Figma) rather
than invented for this project.

---

### v3.3 — Skeleton loaders + share-post-as-image

**Skeleton loaders**

Replaced the plain "Loading…" spinner with animated placeholder cards that
mirror the real `.post-card` layout (avatar, name/time lines, body lines,
reaction pills) so there's no layout jump when real content swaps in.

- **`css/posts.css`** — added `.sk-*` classes and a `skeleton-shimmer`
  keyframe animation (respects `prefers-reduced-motion`, falls back to a
  static dimmed block).
- **`js/posts.js`** — added `renderSkeletonFeed(count)`, wired into both
  `loadPosts()` (home feed) and `loadGroupPosts()` (group feed) in place of
  the old spinner markup. The old `.posts-loading`/`.posts-spinner` CSS was
  left in place (unused now, but harmless) rather than removed, in case
  another part of the codebase not covered by this pass still references it.

**Share post as image**

Added a share icon next to the Comments button on every post (home feed
and group feed) that exports the post as a downloadable PNG — useful for
reposting to Instagram/WhatsApp stories.

- **`pages/dashboard.html`** — added the
  [html2canvas](https://html2canvas.hertzen.com/) CDN script (v1.4.1, via
  cdnjs) loaded after `composer.js`/`twemoji`, before `posts.js`.
- **`js/posts.js`** — added `sharePostAsImage(content, authorName,
  avatarUrl, createdAt, btnEl)`. Deliberately does **not** screenshot the
  live feed card — it builds a separate, clean off-screen export card
  (author, avatar, plain-escaped content, Econovo watermark) and rasterizes
  *that* instead, so buttons/reaction pills/comment toggles never end up in
  the exported image. Avatar images use `crossorigin="anonymous"` +
  `useCORS: true` (required for html2canvas to read pixels from
  Supabase-hosted images) with an `onerror` fallback to initials if the
  image fails to load or is blocked by CORS. Content is intentionally
  rendered as escaped plain text, not through `parseMarkdown()` — the export
  card is meant to look like a clean quote card, not a fully-styled post.
  Added the same button + wiring to group posts for consistency.
- **`css/posts.css`** — added `.post-share-btn` (icon-only circular button,
  mirrors `.post-comment-toggle`'s hover/active states) and a `.is-busy`
  state that reuses the skeleton shimmer animation on the icon while the
  image is being generated.

**Known naming-collision pattern (not a bug, but worth knowing):** both
`js/posts.js` and `pages/dashboard.html`'s inline `<script>` define their
own `toast(msg, type)` function as a bare global. Because `dashboard.html`'s
inline script loads after `posts.js` (non-deferred, runs after all deferred
scripts), its version wins and is the one actually used — `posts.js`'s own
`toast()` (which creates its own `#posts-toast` element if missing) never
runs in practice. This happens to work today because `dashboard.html`'s
version targets `#eco-toast`, which does exist in the page. This is the same
shared-global-name hazard documented in v3.1 for `escH`/`escMd` — flagged
here rather than fixed, since consolidating the two would mean editing
`dashboard.html`'s inline script, and `sharePostAsImage()` in this pass
only *calls* `toast()`, it doesn't define it.

---

### v3.2 — Flat (Twemoji-style) emoji rendering

Native/system emoji render differently on every OS — Android, iOS, and
Windows each ship different artwork for the same Unicode character, so the
same post could look inconsistent across members' devices. Added
[Twemoji](https://github.com/twitter/twemoji) (the same flat emoji set
Discord, Twitter/X, and Slack use) so every member sees identical emoji
regardless of device.

1. **`pages/dashboard.html`** — added the Twemoji CDN script
   (`@twemoji/api` via jsDelivr — the old MaxCDN endpoint documented in
   Twemoji's own README is dead) loaded before `js/composer.js`, so
   `window.twemoji` exists by the time posts render.
2. **`js/composer.js`** — added `applyTwemoji(el)`, a small global helper
   that calls `twemoji.parse()` on a real DOM element (not a raw HTML
   string). DOM-based parsing only walks `#text` nodes and automatically
   skips `<code>`, `<pre>`, and `<script>` content, so emoji-looking
   characters inside a code block are never touched — string-based parsing
   doesn't have that safety and could corrupt HTML attributes. Fails silently
   if the CDN script didn't load (offline, ad-blocker, etc.) — flat emoji is
   a visual nicety, never a hard dependency for a post to render.
3. **`css/posts.css`** — added sizing/baseline-alignment rules for
   `img.twemoji-flat` so the SVG images sit on the text baseline like a
   glyph instead of looking like an oversized inline image.
4. **`js/posts.js`** — wired `applyTwemoji()` into all four places where
   rendered content gets inserted into the DOM: regular post cards, group
   post cards, realtime content updates, and comments.

**Known gap found during this pass (not fixed — flagged for a future pass):**
editing a group post (`js/posts.js`, the `openEditModal` callback around
line ~1831) writes the new content back with `escHtml()` only, skipping
`parseMarkdown()`. A group post loses its Markdown formatting the moment
it's edited, even though the original (unedited) post renders it correctly.

---

### v3.1 — Rich Markdown composer wired up

The team added `js/composer.js` (a full Discord-style Markdown parser —
headings, quotes, tables, checkbox lists, code blocks, spoilers, bold/italic/
strikethrough/underline) and `posts.js` was already written to call
`window.parseMarkdown()` when it exists. **The script tag linking
`composer.js` into `pages/dashboard.html` was missing**, so the parser never
actually ran — every post silently fell back to plain escaped text. Two things were fixed:

1. **`pages/dashboard.html`** — added `<script src="../js/composer.js" defer>`,
   loaded before `posts.js` (order matters: `posts.js` checks for
   `window.parseMarkdown` at render time).
2. **`css/posts.css`** — added ~150 lines of markdown rendering styles.
   Previously only `.md-post-body { white-space: normal }` existed; every
   other class the parser produces (`.md-table`, `.md-codeblock`, `.md-quote`,
   `.md-checkbox`, `.md-spoiler`, `.md-link`, etc.) had zero styling, so even
   with the script linked, output would have rendered as unstyled HTML.
   All new rules use theme tokens (`var(--sage)`, `var(--bg)`, `var(--line)`,
   etc.), so markdown renders correctly across all 12 themes, not just light/dark.
3. **`js/composer.js`** — internal escaping helper renamed from `escH` to
   `escMd`. `pages/dashboard.html`'s own inline script defines a *different*
   `escH` (one that converts `\n` to `<br>`) as a global function; since both
   scripts share the same page (non-module `<script>` tags), the later-loaded
   one would silently overwrite the earlier one. This didn't currently break
   anything by luck of load order, but was one refactor away from corrupting
   code-block rendering (`<br>` tags don't respect `white-space: pre`).
   Renaming to a unique name removes the shared-global-name hazard entirely.

If you write custom scripts that also need HTML-escaping, prefer a
uniquely-named local helper over a bare global `escH`/`esc`/etc. — this
project now has three independent escaping functions across
`composer.js` (`escMd`), `dashboard.html`'s inline script (`escH`), and
`posts.js` (`escHtml`), each correctly scoped, but a fourth added carelessly
could re-introduce the same collision risk.

---

### v3.0 — Live announcements & events

**`pages/dashboard.html`**

- **Announcements loaded from Supabase** — `loadAnnouncements()` replaces the
  hardcoded `ANNOUNCEMENTS` array. Fetches from the `announcements` table
  (`published != false` filter), sorted newest-first. Shows a loading state
  while fetching and an error message on failure.
- **Events loaded from Supabase** — `loadEvents()` replaces the hardcoded
  `EVENTS` array. Fetches from the `events` table sorted by `event_date`,
  automatically hides past events, and derives `month_short` / `day_num`
  from `event_date` when the dedicated columns are not filled.
- **Sidebar widget updated** — `renderWidgetEvents()` now reads from the
  live `EVENTS` cache populated by `loadEvents()`, so the home-tab widget
  always shows real upcoming events (previously showed hardcoded data).
- All three render functions (`renderAnnouncements`, `renderEvents`,
  `renderWidgetEvents`) use `escH()` for safe HTML output.

### v2.2 — Groups, posts feed, reactions, image uploads

**`pages/dashboard.html`**

- **Groups live from Supabase** — `loadGroups()` fetches `groups` +
  `group_members` in parallel. Member counts are real (derived from the
  join table). Join / Leave buttons write directly to `group_members`.
- **Create group modal** — authenticated users can create new groups with a
  custom name, description, and icon (icon picker built from `js/icons.js`).
  The creator is automatically added as the first member.
- **Group feed** — each group card opens an in-dashboard feed (`openGroupFeed`)
  showing group-specific posts fetched from `group_posts`. Members can post
  and delete their own group posts.
- **Sidebar widget for groups** — shows up to 4 groups the current user has
  joined; clicking any pill opens its feed directly.
- **Avatar system** — user initials shown immediately on load; real avatar photo
  loaded async from `profiles.avatar_url` and applied to all avatar slots
  (navbar, sidebar, composer, profile page).
- **Profile page** — editable first name, last name, major, year. Avatar upload
  writes to Supabase Storage (`avatars` bucket) then updates `profiles.avatar_url`.
- **View switching** — sidebar links, top nav, mobile tabs, and dropdown items
  all switch between portal views (Feed, Announcements, Events, Groups, Coffee,
  Speakers, Profile) without a page reload.
- **Toast notifications** — global `toast()` used for success and error feedback
  across all async operations.
- **Sign out** — clears `localStorage` and redirects to `login.html`.

**`js/posts.js`** (v4 — SVG reactions + multi-image + avatars)

- **Posts feed** — `initPostsFeed(token, userId)` loads all posts from Supabase
  (`posts` joined with `profiles`) sorted newest-first and renders them.
- **Create post** — composer supports plain text up to 1000 characters (live
  character counter) plus optional image attachments. Post is written to the
  `posts` table; feed reloads after publish.
- **Multi-image posts** — up to 4 images per post. Images uploaded to Supabase
  Storage, URLs stored as a JSON array in `posts.image_url`. Rendered as a
  responsive gallery with a lightbox viewer (keyboard-navigable, Escape to close).
- **Image preview before posting** — picked images shown as thumbnails in the
  composer; each can be removed individually before publishing.
- **Delete post** — authors can delete their own posts; the card is removed
  immediately without a page reload.
- **Comments** — toggle-able comment section per post. Comments fetched on
  demand, joined with `profiles` for author name and avatar. New comments
  appended live.
- **Emoji reactions** — 6 fixed emoji options (`👍 🔥 ❤️ 💡 🎉 🤔`). Counts
  loaded from the `reactions` table. Clicking an emoji toggles your reaction
  (insert on first click, delete on second). Counts update optimistically.
- **Avatars** — every post and comment shows the author's real avatar photo
  (from `profiles.avatar_url`) with initials fallback. The composer also shows
  the current user's avatar.
- **Avatar upload** (`handleAvatarUpload`) — called from the profile page;
  uploads to the `avatars` Storage bucket and patches `profiles.avatar_url`.

**`groups_migration.sql`**

- Creates `groups` and `group_members` tables with full RLS policies.
- Seeds 4 starter groups (FinTech & Payments, Startups & Founders, AI & Data
  Science, Economics Research) if the table is empty.

**`reactions_migration.sql`**

- Creates `reactions` table with a unique constraint
  (`post_id + user_id + emoji`) and RLS policies for read, insert, and delete.

**`js/icons.js`**

- Registry of Lucide SVG icons keyed by name string (e.g. `"credit-card"`,
  `"rocket"`, `"brain-circuit"`). Used by the group icon picker and group
  cards. `Icons.renderGroupIcon(key, size, strokeWidth)` returns inline SVG.

### v2.1 — Mobile UX & motion pass

**`index.html` / `js/animations.js` / `css/`**

- **Real team roster** in `data/content-en.json` / `content-ar.json` —
  President (Dadache Fouad), Vice President (Houssem Yettou), two Team Leads
  (Abdelilah, Rahal Akram El Mokhtar). Initials generated from name, not role.
- **Dark mode** uses the brand book's `#1F1F1F` (Obsidian Black) as the page
  ground with `#0E2A24` (brand green) cards on top — real depth instead of an
  invented shade.
- **Scroll progress bar** — thin sage line under the navbar tracks read position.
- **Batched grid reveals** — card grids cascade in via GSAP when entering view.
- **Stats count-up** — animates once on first intersection.
- **FAQ accordion** animates real pixel height via GSAP (no clipping on long answers).
- **Hero parallax** — scroll-linked drift via GSAP ScrollTrigger, separate from
  the idle float.
- **Trust bar ticker** — auto-scrolling, pauses under `prefers-reduced-motion`.
- **Mobile specifics** — safe-area padding on floating Join button; button hides
  while hero or CTA is on-screen; `:active` tap states on all interactive
  elements; `theme-color` meta syncs with dark-mode toggle; Apple touch icon set.

### v2.0 — Multi-page restructure

- Split monolithic single file into `index.html` + `pages/` + `css/` + `js/` + `data/`.
- All homepage copy moved to `data/content-en.json` and `data/content-ar.json`;
  `js/language.js` renders every section from JSON.
- `pages/login.html` and `pages/join.html` added for the auth flow.
- `pages/dashboard.html` introduced as the member portal skeleton.
- `js/main.js` handles navbar scroll state, mobile menu, and dark-mode toggle
  shared across all pages.
- IBM Plex Mono added for stats, timeline numbers, and eyebrow labels.

---

## Design system

| Token | Value | Usage |
|---|---|---|
| `--green` | `#0E2A24` | Primary brand / cards |
| `--sage`  | `#8FB8A6` | Accent / interactive |
| `--chalk` | `#F4F7F2` | Light background |
| `--black` | `#1F1F1F` | Dark mode background |

**Typefaces:** Host Grotesk (Latin) + IBM Plex Sans Arabic (Arabic) +
IBM Plex Mono (numbers/labels).

**Icons:** Lucide (CDN) for all UI icons; hand-drawn SVG for Instagram/Facebook
brand marks.

Dark mode, reduced-motion support, and visible keyboard focus are all built in.

---

## Next steps

- `pages/about.html` — longer club story
- `pages/activities.html` — full activities/workshops archive
- `pages/team.html` — full team bios and photos
- Admin panel or Supabase dashboard for managing announcements and events
  without touching the database directly
- Push notifications for new announcements (Supabase Realtime)
- Real-time feed updates via Supabase Realtime subscriptions
