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
│   ├── dashboard.html          # Member portal (auth-gated)
│   ├── login.html              # Login page
│   └── join.html               # Registration / sign-up page
├── css/
│   ├── style.css               # Design tokens, reset, dark mode
│   ├── components.css          # Navbar, buttons, cards, badges, modals
│   ├── sections.css            # Hero, stats, journey, team, events, footer
│   ├── posts.css               # Feed, composer, reactions, comments, groups
│   └── responsive.css          # Tablet + mobile breakpoints
├── js/
│   ├── main.js                 # Navbar scroll, mobile menu, dark mode toggle
│   ├── language.js             # Loads content-{lang}.json and renders sections
│   ├── posts.js                # Posts feed, reactions, comments, image upload
│   ├── icons.js                # Group icon registry (Lucide SVGs by key name)
│   ├── animations.js           # GSAP hero entrance + scroll reveal
│   ├── auth.js                 # Auth helpers
│   └── faq.js                  # FAQ accordion
├── data/
│   ├── content-en.json         # All English copy (edit here, not the HTML)
│   └── content-ar.json         # All Arabic copy
├── assets/
│   ├── images/                 # Place real photos here
│   └── icons/                  # Place custom icons here
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

### v3.0 — Live announcements & events (current)

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
