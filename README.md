# Econovo Club — Website v3.0

> A university club connecting economics, business, innovation, and practical skills.
> Founded 2026 · Mohamed El Bachir El Ibrahimi University · Bordj Bou Arreridj, Algeria.

---

## What this project is

Econovo's website is a fully hand-coded, multi-page static site with a live Supabase backend. It was designed and built in three deliberate passes — each one layering on the last without breaking what existed. The result is a production-ready club platform: a public-facing homepage, a membership application flow, an authenticated member dashboard, and a real-time community feed — all without a framework.

The visual identity is built on the Brand Book's exact palette: **Obsidian `#0E2A24`** as the primary dark, **Silver Sage `#8FB8A6`** as the single accent, and **Chalk `#F4F7F2`** as the warm page ground. Host Grotesk handles display and UI copy; IBM Plex Mono handles numbers, labels, and data. The combination reads as academic-to-professional — deliberately not the generic cream-and-terracotta AI-template look.

---

## Project structure

```
econovo-redesign/
│
├── index.html                  # Public homepage (single-page, JSON-rendered)
│
├── pages/
│   ├── join.html               # Membership application — 3-step form + Supabase signup
│   ├── login.html              # Member sign-in — email/password + OAuth-ready
│   └── dashboard.html          # Authenticated member area — overview, events,
│                               #   announcements, community feed, profile
│
├── css/
│   ├── style.css               # Design tokens, reset, dark mode, reveal animation system
│   ├── components.css          # Navbar, buttons, cards, mobile menu, FAQ, floating elements
│   ├── sections.css            # All section-level layouts: hero, stats ledger, timeline,
│   │                           #   team, events, CTA, footer — plus community feed styles
│   └── responsive.css          # Tablet (992px) and mobile (768px / 480px) breakpoints
│
├── js/
│   ├── main.js                 # Navbar scroll state, mobile drawer, dark mode, scroll progress
│   ├── language.js             # Loads content-{lang}.json and renders every dynamic section
│   ├── faq.js                  # FAQ accordion (event-delegated, survives re-renders)
│   ├── animations.js           # Hero entrance sequence, IntersectionObserver scroll reveals,
│   │                           #   timeline spine draw, staggered grid cascades, stat counters
│   ├── auth.js                 # Login/logout helpers, session persistence via localStorage
│   └── posts.js                # Community feed — create posts, upload images to Supabase Storage,
│                               #   render feed with author JOIN, add/load comments, delete own posts
│
├── data/
│   ├── content-en.json         # All English copy — stats, why cards, pillars, journey,
│   │                           #   team, events, FAQ, trust bar, hero. Edit here, not in HTML.
│   └── content-ar.json         # Full Arabic mirror — site switches language at runtime,
│                               #   direction flips to RTL, font switches to IBM Plex Sans Arabic
│
└── assets/
    ├── images/                 # Drop real photos here; language.js renders them when a
    │                           #   member object or card has a `photo` field
    └── icons/                  # SVG icons not covered by Lucide CDN
```

---

## Pages in detail

### `index.html` — Homepage

The public face of the club. Everything a prospective member needs to decide to join.

**Sections, top to bottom:**

| Section | Notes |
|---|---|
| **Navbar** | Fixed, transparent → bordered on scroll. Desktop links + dark mode + language toggle + Sign In / Join Now. Auth-aware: replaces Join with member name + dashboard link when a session exists. |
| **Hero** | Two-column: editorial headline left, logo visual right. Orchestrated entrance animation (rule → eyebrow → h1 → body → tags → actions → visual, 90 ms stagger). Floating badge and tag with independent idle float cycles. |
| **Trust bar** | Continuously scrolling marquee of affiliated institutions. Pauses on hover. RTL-aware. |
| **Stats ledger** | Four-cell ruled grid. Numbers count up from zero on first intersection (cubic ease-out). Sage wash fills each cell on hover. |
| **About / Empathy** | Dark obsidian panel with animated dot grid (slow drift, 20 s loop). Signals: "you don't need to be an expert." |
| **Why Econovo** | Four-card grid. Cards lift 2 px on hover; icon tiles rotate and scale. Staggered cascade on scroll entry. |
| **Focus Areas / Pillars** | Same stagger treatment. Four thematic pillars: Economics, Fintech, Innovation, Business. |
| **Journey / Timeline** | Central spine draws in (1.2 s) on intersection. Each node pops with spring easing as the user scrolls through. Collapses to left-aligned list on mobile. |
| **Team** | Auto-generated initials avatars from `team.members` in the JSON. Avatars scale up on hover. Real names: Dadache Fouad (President), Houssem Yettou (Vice President), Abdelilah, Rahal Akram El Mokhtar. |
| **Events & Workshops** | Rendered from `events.items` in the JSON. Add a new event by editing the data file — no HTML touch needed. |
| **FAQ** | Accordion. Arrow rotates with spring easing on open. Smooth height transition. Event-delegated so it survives re-renders. |
| **CTA** | Dark full-bleed panel. Dot grid drifts slightly faster than the About panel to signal urgency. |
| **Footer** | Obsidian `#1F1F1F` background. Two-column links + social buttons (Instagram, Facebook). Buttons slide horizontally on hover. |
| **Mobile** | Floating sticky "Join Now" bar appears below the hero, disappears while CTA is visible. Slide-in drawer menu with staggered link entrances. Safe-area insets for iOS. |

---

### `pages/join.html` — Membership Application

A three-step form that creates a Supabase Auth account **and** submits a record to `public.applications` in a single user action.

**Step 1 — Personal:** First name, last name, email, phone, Instagram handle, password (with show/hide toggle), confirm password.

**Step 2 — Academic:** Field of study (select), year of study (select), weekly availability (multi-select toggle pills).

**Step 3 — Interests & Motivation:** Interest checkboxes (Economics, Business, Innovation, FinTech, Projects, Networking), motivation textarea (min 30 chars, live character counter to 400), referral source.

**On submit:**
1. Calls `POST /auth/v1/signup` with email, password, and all metadata in `raw_user_meta_data`.
2. If successful, immediately `POST`s to `public.applications` with `full_name`, `email`, `faculty`, `department`, `academic_year`, `why_join`, `skills`, `availability`, `referral`, `phone`, `instagram`, `status: 'pending'`.
3. Shows animated success state. If the user is already logged in, a banner appears instead of the form.

**Validation:** inline per-field errors with shake-free reveal. Fields clear errors on next keystroke. Step navigation validates only the current step before advancing.

---

### `pages/login.html` — Sign In

Split-panel layout: brand panel left (obsidian gradient, pulsing orbs, animated dot grid), form panel right.

Two-tab interface on the form side:
- **Sign In** — email + password, show/hide toggle, session saved to `localStorage`.
- **Sign Up** — redirects to `join.html` for the full application flow.

On successful login: saves `econovo-token` and `econovo-user` to `localStorage`, then redirects to `dashboard.html`.

---

### `pages/dashboard.html` — Member Dashboard

Authenticated area. Redirects unauthenticated visitors to `login.html` immediately.

**Layout:** fixed top navbar + collapsible sidebar (desktop) / bottom tab bar (mobile).

**Views:**

| View | Content |
|---|---|
| **Overview** | Greeting strip with member name, avatar initials, and join date. Stats ledger (upcoming events, unread announcements, focus areas). Preview of next 2 events and latest 2 announcements with "View all" links. |
| **Events** | Full calendar list. Date stamp (month + day), event title, description, category tag. Rendered from data; can be migrated to a Supabase `events` table. |
| **Announcements** | Bordered cards with left sage rule. Date, title, body. Board-only posts. |
| **Community Feed** | Live Supabase-connected feed — see section below. |
| **Profile** | Editable first name, last name, major, year. Email is read-only (set at signup). Saves to `public.profiles` via REST. Danger zone with sign-out. |

---

## Community Feed — how it works

The feed lives in `js/posts.js` (~500 lines, zero dependencies beyond the browser). It uses raw `fetch()` against the Supabase PostgREST and Storage APIs directly — no Supabase JS SDK required, keeping the bundle size at zero.

### Creating a post

1. User types in the composer textarea (up to 1 000 characters, live counter).
2. Optionally attaches an image. A `FileReader` preview appears inline; an × button removes it.
3. On submit: if an image was chosen, it is uploaded first to the `post-images` Storage bucket under `public/<timestamp>_<random>.ext`. The returned public URL is stored alongside the post.
4. A `POST` to `public.posts` inserts `{ content, image_url, user_id }`. The `user_id` is enforced by the RLS policy — the JWT in the `Authorization` header is the only thing that sets it.
5. The feed reloads from the database immediately. The new post animates in.

### Reading the feed

Posts are fetched with a single PostgREST call that JOINs `profiles(full_name)` in the same request:

```
GET /rest/v1/posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name)
```

No N+1 queries. Author names arrive with the posts in one round-trip.

### Comments

Each post card has a "Comments" toggle. On first open, comments are lazy-loaded with the same JOIN pattern:

```
GET /rest/v1/comments?post_id=eq.<id>&order=created_at.asc&select=id,content,created_at,user_id,profiles(full_name)
```

New comments are inserted and the list reloads immediately. No page refresh at any point.

### Deleting a post

A delete button appears only when `post.user_id === currentUserId`. On confirm, a `DELETE` request fires with the member's JWT. The card animates out (opacity → 0, slight X slide, 320 ms) then is removed from the DOM.

---

## Database schema (Supabase)

### `public.profiles`
```sql
id          UUID  PRIMARY KEY  REFERENCES auth.users(id) ON DELETE CASCADE
full_name   TEXT
role        TEXT  DEFAULT 'member'
created_at  TIMESTAMPTZ  DEFAULT now()
```
Auto-populated by a trigger on `auth.users INSERT` — the `full_name` is pulled from `raw_user_meta_data` at signup, so the JOIN in posts and comments works from day one without any extra step.

### `public.posts`
```sql
id          UUID  PRIMARY KEY  DEFAULT gen_random_uuid()
user_id     UUID  NOT NULL     REFERENCES auth.users(id) ON DELETE CASCADE
content     TEXT  NOT NULL
image_url   TEXT
created_at  TIMESTAMPTZ  DEFAULT now()
```

### `public.comments`
```sql
id          UUID  PRIMARY KEY  DEFAULT gen_random_uuid()
post_id     UUID  NOT NULL     REFERENCES public.posts(id) ON DELETE CASCADE
user_id     UUID  NOT NULL     REFERENCES auth.users(id) ON DELETE CASCADE
content     TEXT  NOT NULL
created_at  TIMESTAMPTZ  DEFAULT now()
```

### `public.applications`
```sql
id            BIGINT  GENERATED ALWAYS AS IDENTITY  PRIMARY KEY
user_id       UUID    REFERENCES auth.users(id) ON DELETE CASCADE
full_name     TEXT    NOT NULL
email         TEXT    NOT NULL
faculty       TEXT
department    TEXT
academic_year TEXT
why_join      TEXT
skills        TEXT
status        TEXT    DEFAULT 'Pending'
created_at    TIMESTAMPTZ  DEFAULT now()
```

### Storage — `post-images` bucket
Public bucket. Uploads land at `public/<timestamp>_<random>.<ext>` and are served via the Supabase CDN URL directly in `<img>` tags.

---

## Row Level Security — summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | authenticated (all rows) | own row only | own row only | — |
| `posts` | authenticated (all rows) | own row only | — | own row only |
| `comments` | authenticated (all rows) | own row only | — | own row only |
| `applications` | own row only + service_role | anyone (public form) | — | — |
| `storage.objects` (post-images) | public (no auth) | authenticated only | — | own uploads only |

The complete SQL for policies, the auto-profile trigger, and the storage bucket rules is in `econovo_rls_complete.sql`.

---

## Animation system

All motion is driven by CSS transitions + a custom `IntersectionObserver` layer in `js/animations.js`. No GSAP, no ScrollTrigger — zero dependencies.

**Reveal classes:**

| Class | Behaviour |
|---|---|
| `.reveal` | Fade + 18 px lift. Applied to section headers and full sections. |
| `.will-reveal` | Fade + 14 px lift. Applied programmatically by JS for staggered items. |
| `.reveal-fade` | Fade only. For elements that should not translate. |

**Named animations:**

| Animation | Trigger | Duration |
|---|---|---|
| Hero entrance | DOM ready | 7 elements × 90 ms stagger |
| Stat counters | Grid enters viewport | 1 400 ms cubic ease-out |
| Card stagger | Grid enters viewport | 65 ms offset per child |
| Timeline spine | Container enters viewport | 1 200 ms linear draw |
| Timeline nodes | Each item enters viewport | Spring bounce |
| Floating badges | Always (idle) | 4 s sine loop, half-phase offset |
| Marquee | Always | 32 s linear, pauses on hover |
| Dot grid drift | Always (ambient) | 20 s linear |
| Orb pulse | Always (ambient) | 8 s ease-in-out |

`prefers-reduced-motion: reduce` disables every animation and transition site-wide in a single `@media` block in `style.css`.

---

## Bilingual system

The site is fully bilingual (English / Arabic) at runtime. `js/language.js` handles everything:

1. Reads `data/content-{lang}.json` via `fetch()`.
2. Walks every `[data-i18n="key"]` element and sets its text.
3. Calls render functions for dynamic sections (stats, why-cards, pillars, timeline, team, events, FAQ, trust bar, hero tags).
4. Sets `document.documentElement.lang` and `dir` (`ltr` / `rtl`).
5. Switches `--font` CSS variable to IBM Plex Sans Arabic for RTL.
6. Fires `document.dispatchEvent(new Event('econovo:rendered'))` so `animations.js` can re-observe newly injected elements.

Language preference persists in `localStorage`. The toggle button is in the navbar on desktop and in the mobile drawer.

To update copy in either language: edit the relevant key in `data/content-en.json` or `data/content-ar.json`. No HTML or JS changes needed.

---

## Running locally

Content is loaded with `fetch()`, so opening `index.html` directly from disk (`file://`) will fail due to CORS. Serve it instead:

```bash
cd econovo-redesign
python3 -m http.server 8000
# open http://localhost:8000
```

Or with Node:

```bash
npx serve .
```

On GitHub Pages, Netlify, or Vercel it works as-is — no build step, no bundler.

---

## Deployment

The project is static — no server, no build pipeline. Deploy by pushing the folder to any static host:

- **GitHub Pages:** push to `main`, enable Pages in repo settings, set source to root.
- **Netlify:** drag and drop the folder into the Netlify dashboard.
- **Vercel:** `vercel --prod` from the project root.

The Supabase URL and anon key are embedded in the JS files. This is safe for the anon (publishable) key — Supabase's RLS policies are the security layer, not key secrecy. Never embed the `service_role` key in client-side code.

---

## Content editing cheatsheet

| What you want to change | Where to edit |
|---|---|
| Hero headline / body text | `data/content-en.json` → `hero.title` / `hero.desc` |
| Stats numbers | `data/content-en.json` → `stats.items[].value` |
| Add a team member | `data/content-en.json` → `team.members[]` — add `{ role, name }` |
| Add an event | `data/content-en.json` → `events.items[]` |
| Add a FAQ entry | `data/content-en.json` → `faq.items[]` |
| Change Arabic copy | Same paths in `data/content-ar.json` |
| Change accent colour | `css/style.css` → `--sage` |
| Change primary dark | `css/style.css` → `--obsidian` |
| Add post image bucket path | Supabase Dashboard → Storage → post-images |

---

## Design decisions

**Why no framework?** The site's needs — a marketing homepage, a form, an auth flow, and a social feed — are fully expressible in vanilla HTML, CSS, and JS. A framework would add build complexity, dependency maintenance, and bundle weight with no meaningful benefit at this scale.

**Why no Supabase JS SDK?** The SDK is ESM-only and requires a bundler or import maps to use in a plain `<script>` tag. Keeping everything in vanilla `fetch()` means the project runs without any toolchain — `python3 -m http.server` is the entire local setup. The PostgREST and Storage REST APIs are simple enough to call directly.

**Why IBM Plex Mono for numbers?** Monospaced figures in the stat ledger, timeline steps, and eyebrow labels create a typographic tie to accounting and data — a quiet thematic signal appropriate for an economics club. Used sparingly so it reads as a detail, not a theme.

**Why no particle backgrounds or 3D?** Econovo's headline is "you don't need to be an expert to start." A visually aggressive landing page would contradict that. The motion budget is spent on entrances and micro-interactions — things that reward attention rather than demand it.

---

## Club board

| Role | Name |
|---|---|
| President | Dadache Fouad |
| Vice President | Houssem Yettou |
| Team Lead | Abdelilah |
| Team Lead | Rahal Akram El Mokhtar |

---

*Built with HTML, CSS, and Vanilla JS. Backed by Supabase. No build step required.*
