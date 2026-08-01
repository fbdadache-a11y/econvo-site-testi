# Econovo Club — Website v2.0

A restructured, multi-file version of the Econovo site, built for GitHub Pages.

## Structure

```
econovo-site/
├── index.html          # Homepage — one-page site (this is the v2.0 deliverable)
├── pages/               # Reserved for additional pages (about, activities, team, join, contact) — not built yet, see "Next steps"
├── css/
│   ├── style.css        # Design tokens (colors, type, spacing), reset, dark mode
│   ├── components.css   # Navbar, buttons, cards, badges, FAQ, mobile menu
│   ├── sections.css     # Hero, trust bar, stats, journey, team, events, footer
│   └── responsive.css   # Tablet + mobile breakpoints
├── js/
│   ├── main.js          # Navbar scroll state, mobile menu, dark mode toggle
│   ├── language.js      # Loads content-{lang}.json and renders every section
│   ├── faq.js            # FAQ accordion (delegated, survives re-render)
│   └── animations.js    # Hero entrance (GSAP) + scroll reveal (IntersectionObserver)
├── data/
│   ├── content-en.json  # ALL English copy — edit this, not the HTML
│   └── content-ar.json  # ALL Arabic copy
└── assets/               # Put real photos here (assets/images/, assets/icons/)
```

## How content editing works

Almost no text lives in `index.html`. Sections like Stats, Why Econovo, Focus
Areas, the Journey timeline, Team, Events and FAQ are **rendered from JSON**
by `js/language.js`. To change copy, add a team member, or post a new event:

1. Open `data/content-en.json` (and the matching entry in `content-ar.json`).
2. Edit the relevant array, e.g. add an object to `events.items`.
3. Save. No HTML/CSS/JS knowledge needed.

The `team.members` list currently has placeholder names
(`— Add Name —` / `— أضف الاسم —`) — replace those with real names once the
board is confirmed. Avatars are auto-generated initials; swap in real photos
later by editing `renderTeam()` in `js/language.js` to use an `<img>` when a
member object has a `photo` field.

## Running it locally

Because content is loaded with `fetch()`, opening `index.html` directly from
disk (`file://`) will fail (CORS). Serve it locally instead:

```bash
cd econovo-site
python3 -m http.server 8000
# then open http://localhost:8000
```

On GitHub Pages this just works, since files are served over `https://`.

## v2.1 — mobile UX & motion pass

- **Real team roster** is in `data/content-en.json` / `content-ar.json` →
  `team.members`: President (Dadache Fouad), Vice President (Houssem
  Yettou), and two Team Leads (Abdelilah, Rahal Akram El Mokhtar). Avatar
  initials are now generated from each person's **name**, not their role.
- **Dark mode now uses the brand book's actual second color** — `#1F1F1F`
  ("Obsidian Black") as the true-black page ground, with brand-green
  (`#0E2A24`) cards floating on top for real depth, instead of an invented shade.
- **Scroll progress bar** — a thin sage line under the navbar tracking
  read position (the "ledger" motif, functional not decorative).
- **Batched grid reveals** — card grids (Why, Focus Areas, Journey, Team,
  Events, FAQ) now cascade in together via GSAP when the grid enters view,
  instead of each card fading in independently.
- **Stats count up** once, the first time the stats row is visible.
- **FAQ accordion** now animates real height via GSAP (previously a fixed
  `max-height` guess that could clip long answers).
- **Hero parallax** — a small scroll-linked drift on the hero visual
  (GSAP ScrollTrigger), separate from its constant idle float so the two
  don't fight.
- **Trust bar is now a ticker** (auto-scrolling, pauses under
  `prefers-reduced-motion`) — the one deliberate "signature" motion on the
  page, chosen because a scrolling tape fits an economics/fintech club.
- **Mobile-specific**: safe-area padding on the floating Join button (won't
  sit under the iOS home indicator), the button hides itself while the
  hero or CTA section is on screen (no duplicate CTAs), tap states
  (`:active` scale) replace hover on all buttons/cards, `theme-color` meta
  syncs with the dark-mode toggle so the browser chrome matches, and an
  Apple touch icon is set for "Add to Home Screen".

## Design notes

- **Palette & type kept from the original brand book** (Obsidian `#0E2A24`,
  Silver Sage `#8FB8A6`, Chalk `#F4F7F2`) — it was already a deliberate,
  non-generic choice (forest green reads "growth," not the usual
  cream-and-terracotta AI-template look). Host Grotesk + IBM Plex Sans
  Arabic are unchanged for the same reason.
- **Added IBM Plex Mono** for stats, timeline numbers, and the eyebrow
  labels — a small "ledger" motif appropriate for an economics/fintech
  club, used sparingly so it reads as a detail, not a theme.
- **Numbered timeline steps are kept** because the Journey section is a
  real, ordered process — that's the one place numbering is earned.
- **Animation is intentionally restrained**: one orchestrated hero
  entrance (GSAP) plus a single scroll-reveal mechanism reused everywhere
  else. No particle/3D background (Vanta.js, particles.js) — for an
  academic club that leads with "you don't need to be an expert," a busy
  animated background works against the tone. Easy to add later in
  `js/animations.js` if you change your mind.
- **Icons**: Lucide (CDN) for all utility/UI icons; hand-drawn SVG kept
  only for the Instagram/Facebook marks, since those need to stay
  recognizable brand shapes.
- Dark mode, reduced-motion support, and visible keyboard focus are all
  built in.

## Next steps (not built in this pass)

The `pages/` folder is reserved for:
- `about.html` — longer club story
- `activities.html` — full activities/workshops archive
- `team.html` — full team bios and photos
- `join.html` — a real membership form (currently the site links out to a
  Google Form)
- `contact.html`

Say the word and these can be built next, reusing the same
`css/`, `js/`, and `data/` files so the site stays consistent.
