/* ==========================================================================
   ECONOVO — animations.js  v4.0
   Architecture: CSS scroll-driven (native) + Web Animations API (fallback)
   + GSAP as progressive enhancement (never a hard dependency).

   Philosophy from taste-SKILL:
   - MOTION_INTENSITY: 5 — purposeful, not cinematic
   - Every animation serves information hierarchy, not decoration
   - prefers-reduced-motion: respected at every layer
   - No single point of failure — works without GSAP
   - White-space is activated, not filled

   Brand: Obsidian #0E2A24 · Silver Sage #8FB8A6 · Chalk #F4F7F2
   ========================================================================== */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────
       CONFIG
    ───────────────────────────────────────────── */
    const REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HAS_GSAP = () => !!window.gsap;
    const FINE_PTR = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

    /* Spring easing — the brand's motion signature */
    const SPRING    = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const SPRING_SOFT = 'cubic-bezier(0.25, 1, 0.5, 1)';
    const EASE_OUT  = 'cubic-bezier(0.33, 1, 0.68, 1)';

    /* Shared options for Web Animations API */
    const BASE_ANIM = { fill: 'both', easing: SPRING };

    /* Characters for scramble (ASCII only — accessibility safe) */
    const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ·';

    let trustBarBound = false;
    let singleObserver = null;
    const gridObservers = new WeakMap();

    /* ─────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────── */
    function forceVisible(el) {
        if (!el) return;
        el.style.opacity       = '1';
        el.style.transform     = 'none';
        el.style.clipPath      = 'none';
        el.style.visibility    = 'visible';
    }

    /* Animate via Web Animations API with GSAP as enhancement */
    function animWAAPI(el, from, to, options = {}) {
        if (!el || REDUCED) { forceVisible(el); return null; }

        const dur = (options.duration || 0.6) * 1000;
        const del = (options.delay    || 0)   * 1000;

        return el.animate(
            [from, to],
            { duration: dur, delay: del, easing: options.easing || SPRING, fill: 'both' }
        );
    }

    /* Stagger a NodeList with WA API */
    function staggerWAAPI(elements, from, to, options = {}) {
        if (!elements || REDUCED) {
            [...elements].forEach(forceVisible);
            return;
        }

        const staggerMs = (options.stagger || 0.06) * 1000;
        const dur       = (options.duration || 0.5) * 1000;
        const baseDelay = (options.delay   || 0)   * 1000;

        [...elements].forEach((el, i) => {
            el.animate(
                [from, to],
                {
                    duration: dur,
                    delay:    baseDelay + i * staggerMs,
                    easing:   options.easing || SPRING,
                    fill:     'both'
                }
            );
        });
    }

    /* ─────────────────────────────────────────────
       INIT
    ───────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        if (HAS_GSAP() && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

        initScrollProgress();
        initNavbarScroll();
        heroEntrance();
        initIdleFloat();
        initHeroParallax();
        initSingleReveal();

        [
            '#statsRow', '#whyGrid', '#pillarsGrid',
            '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'
        ].forEach(revealGrid);

        initCounters();
        initTimelineSpine();
        initMagneticTilt();
        initTrustBar();
        initSectionLines();
        initCursorGlow();

        document.body.classList.add('js-ready');
    });

    document.addEventListener('econovo:rendered', () => {
        initSingleReveal();
        [
            '#statsRow', '#whyGrid', '#pillarsGrid',
            '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'
        ].forEach(revealGrid);
        initCounters();
        initTimelineSpine();
        initTrustBar();
    });

    /* ─────────────────────────────────────────────
       1. SCROLL PROGRESS BAR
       Native — no library needed
    ───────────────────────────────────────────── */
    function initScrollProgress() {
        const bar = document.getElementById('scrollProgress');
        if (!bar) return;

        /* Try CSS scroll-driven animations first (Chrome 115+) */
        if (CSS.supports('animation-timeline', 'scroll()')) {
            bar.style.cssText = `
                animation: scrollProgress 1s linear;
                animation-timeline: scroll();
                animation-fill-mode: both;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes scrollProgress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `;
            document.head.appendChild(style);
            return;
        }

        /* Fallback: rAF-based */
        if (REDUCED) return;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const doc    = document.documentElement;
                const scroll = doc.scrollTop  || document.body.scrollTop;
                const total  = doc.scrollHeight - doc.clientHeight;
                bar.style.width = total > 0 ? (scroll / total * 100) + '%' : '0%';
                ticking = false;
            });
        }, { passive: true });
    }

    /* ─────────────────────────────────────────────
       2. NAVBAR SCROLL STATE
    ───────────────────────────────────────────── */
    function initNavbarScroll() {
        const nav = document.getElementById('navbar');
        if (!nav) return;

        let lastY  = 0;
        let ticking = false;

        function update() {
            const y = window.scrollY;
            nav.classList.toggle('scrolled', y > 20);
            lastY = y;
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    /* ─────────────────────────────────────────────
       3. HERO ENTRANCE
       Orchestrated sequence — each element has a
       semantic role in the timing:
       rule → eyebrow → headline → visual → desc → tags → cta
    ───────────────────────────────────────────── */
    function heroEntrance() {
        const rule    = document.querySelector('.hero-rule');
        const eyebrow = document.querySelector('.hero-content .eyebrow');
        const h1      = document.querySelector('.hero-content h1');
        const desc    = document.querySelector('.hero-content > p');
        const tags    = document.querySelector('.hero-tags');
        const actions = document.querySelector('.hero-actions');
        const visual  = document.querySelector('.hero-visual');

        if (REDUCED) {
            [rule, eyebrow, h1, desc, tags, actions, visual].forEach(el => {
                if (el) forceVisible(el);
            });
            if (rule)    rule.classList.add('revealed');
            if (h1)      h1.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        /* Rule line — draws out first */
        if (rule) {
            setTimeout(() => rule.classList.add('revealed'), 80);
        }

        /* Eyebrow */
        if (eyebrow) {
            animWAAPI(eyebrow,
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0)' },
                { duration: 0.45, delay: 0.1, easing: SPRING }
            );
        }

        /* Headline — clean clip-path wipe, no scramble (accessibility + SEO) */
        if (h1) {
            h1.style.willChange = 'opacity, transform';
            animWAAPI(h1,
                { opacity: 0, transform: 'translateY(16px)' },
                { opacity: 1, transform: 'translateY(0)' },
                { duration: 0.6, delay: 0.18, easing: SPRING }
            )?.finished.then(() => {
                h1.style.willChange = 'auto';
                h1.closest('.hero-content')?.classList.add('animate-done');
            });
        }

        /* Visual panel — comes in simultaneously, slightly behind */
        if (visual) {
            visual.style.willChange = 'opacity, transform';
            animWAAPI(visual,
                { opacity: 0, transform: 'translateY(20px) scale(0.97)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' },
                { duration: 0.7, delay: 0.22, easing: SPRING }
            )?.finished.then(() => {
                visual.style.willChange = 'auto';
            });
        }

        /* Description — wipes in from left */
        if (desc) {
            animWAAPI(desc,
                { opacity: 0, transform: 'translateY(10px)', clipPath: 'inset(0 100% 0 0)' },
                { opacity: 1, transform: 'translateY(0)',    clipPath: 'inset(0 0% 0 0)' },
                { duration: 0.65, delay: 0.30, easing: SPRING_SOFT }
            );
        }

        /* Tags — stagger in */
        if (tags?.children.length) {
            staggerWAAPI(
                tags.children,
                { opacity: 0, transform: 'translateY(8px) scale(0.92)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' },
                { duration: 0.35, delay: 0.42, stagger: 0.06, easing: SPRING }
            );
        }

        /* CTA buttons — final reveal */
        if (actions) {
            animWAAPI(actions,
                { opacity: 0, transform: 'translateY(12px)' },
                { opacity: 1, transform: 'translateY(0)' },
                { duration: 0.5, delay: 0.52, easing: SPRING }
            );
        }
    }

    /* ─────────────────────────────────────────────
       4. IDLE FLOAT — hero elements drift gently
       Only on pointer:fine devices (desktop)
    ───────────────────────────────────────────── */
    function initIdleFloat() {
        if (REDUCED || !FINE_PTR) return;

        /* Use CSS animation — GPU-composited, no JS loop */
        const style = document.createElement('style');
        style.id    = 'eco-float-style';
        style.textContent = `
            @keyframes ecoFloat      { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-9px)} }
            @keyframes ecoFloatTag   { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-7px) rotate(1deg)} }
            @keyframes ecoFloatImg   { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-6px)} }
            .floating-badge          { animation: ecoFloat    3.2s ease-in-out infinite; }
            .floating-tag            { animation: ecoFloatTag 2.8s ease-in-out infinite; animation-delay:-.4s; }
            .hero-img-container      { animation: ecoFloatImg 4.0s ease-in-out infinite; animation-delay:-.8s; }
        `;
        document.head.appendChild(style);
    }

    /* ─────────────────────────────────────────────
       5. HERO PARALLAX
       scroll-driven native, GSAP fallback
    ───────────────────────────────────────────── */
    function initHeroParallax() {
        if (REDUCED) return;
        const visual = document.querySelector('.hero-visual');
        if (!visual) return;

        /* CSS scroll-driven (Chrome 115+) */
        if (CSS.supports('animation-timeline', 'scroll()')) {
            const style = document.createElement('style');
            style.textContent = `
                .hero-visual {
                    animation: heroParallax 1s linear both;
                    animation-timeline: scroll(root);
                    animation-range: 0px 80vh;
                }
                @keyframes heroParallax {
                    from { transform: translateY(0); }
                    to   { transform: translateY(80px); }
                }
            `;
            document.head.appendChild(style);
            return;
        }

        /* GSAP ScrollTrigger fallback */
        if (HAS_GSAP() && window.ScrollTrigger) {
            gsap.to(visual, {
                yPercent: 14,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.hero',
                    start:   'top top',
                    end:     'bottom top',
                    scrub:   1.2
                }
            });
        }
    }

    /* ─────────────────────────────────────────────
       6. SINGLE-ELEMENT REVEAL
       Animates .reveal elements on scroll
    ───────────────────────────────────────────── */
    function initSingleReveal() {
        const targets = Array.from(document.querySelectorAll('.reveal:not(.active)'));
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            targets.forEach(el => activateSingle(el));
            return;
        }

        if (!singleObserver) {
            singleObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    activateSingle(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
        }

        targets.forEach(el => singleObserver.observe(el));
    }

    function activateSingle(el) {
        el.classList.add('active');
        if (REDUCED) { forceVisible(el); }
    }

    /* ─────────────────────────────────────────────
       7. GRID REVEAL — staggered cascade
       Each grid section has its own IO instance.
       Tighter rootMargin — elements enter later,
       which reveals the whitespace intentionally.
    ───────────────────────────────────────────── */
    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || !container.children.length) return;

        const prev = gridObservers.get(container);
        if (prev) prev.disconnect();

        const children = Array.from(container.children);

        if (!('IntersectionObserver' in window)) {
            cascadeIn(children, selector);
            return;
        }

        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                cascadeIn(children, selector);
                obs.disconnect();
                gridObservers.delete(container);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

        gridObservers.set(container, obs);
        obs.observe(container);
    }

    function cascadeIn(children, selector) {
        if (REDUCED) {
            children.forEach(forceVisible);
            return;
        }

        /* Different entrance per section type */
        const isStats    = selector === '#statsRow';
        const isTimeline = selector === '#timeline';
        const isTeam     = selector === '#teamGrid';

        children.forEach((el, i) => {
            el.classList.add('in');

            const delay  = i * (isStats ? 0.08 : isTeam ? 0.07 : 0.065);
            const fromY  = isStats ? 24 : 18;
            const fromX  = isTimeline
                ? (i % 2 === 0 ? -20 : 20)   /* alternate left/right for timeline */
                : 0;

            animWAAPI(el,
                { opacity: 0, transform: `translate(${fromX}px, ${fromY}px) scale(0.97)` },
                { opacity: 1, transform: 'translate(0, 0) scale(1)' },
                { duration: 0.55, delay, easing: SPRING }
            );
        });
    }

    /* ─────────────────────────────────────────────
       8. STAT COUNTERS
       count-up animates once, on first intersection
    ───────────────────────────────────────────── */
    function initCounters() {
        const cells = document.querySelectorAll('#statsRow .stat-value');
        if (!cells.length || REDUCED) return;

        cells.forEach(el => {
            const raw    = el.getAttribute('data-raw') || el.textContent.trim();
            const match  = raw.match(/^(\d[\d,]*)(.*)$/);
            if (!match) return;

            const target = parseInt(match[1].replace(/,/g, ''), 10);
            const suffix = match[2] || '';
            el.setAttribute('data-raw', raw);     /* preserve for re-runs */
            el.textContent = '0' + suffix;

            const io = new IntersectionObserver(entries => {
                if (!entries[0].isIntersecting) return;
                io.disconnect();
                countUp(el, target, suffix);
            }, { threshold: 0.3 });

            io.observe(el);
        });
    }

    function countUp(el, target, suffix) {
        const dur    = 1600; /* ms */
        const start  = performance.now();

        function tick(now) {
            const t  = Math.min((now - start) / dur, 1);
            /* ease-out-expo */
            const e  = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            const v  = Math.round(e * target);
            el.textContent = v.toLocaleString() + suffix;
            if (t < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    /* ─────────────────────────────────────────────
       9. TIMELINE SPINE DRAW
       The vertical line draws in as you scroll —
       activates the whitespace between items.
    ───────────────────────────────────────────── */
    function initTimelineSpine() {
        const timeline = document.querySelector('.timeline');
        if (!timeline || REDUCED) return;

        /* CSS scroll-driven (native, Chrome 115+) */
        if (CSS.supports('animation-timeline', 'scroll()')) {
            const style = document.createElement('style');
            style.textContent = `
                .timeline::before {
                    animation: spineGrow 1s linear both;
                    animation-timeline: view();
                    animation-range: entry 0% cover 60%;
                }
                @keyframes spineGrow {
                    from { height: 0; }
                    to   { height: 100%; }
                }
            `;
            document.head.appendChild(style);
            return;
        }

        /* Fallback: IO-triggered CSS class */
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    timeline.classList.add('animate-spine');
                    io.disconnect();
                }
            });
        }, { threshold: 0.1 });

        io.observe(timeline);
    }

    /* ─────────────────────────────────────────────
       10. MAGNETIC CARD TILT
       3D perspective tilt on card hover.
       Intentionally subtle — max ±6deg.
    ───────────────────────────────────────────── */
    function initMagneticTilt() {
        if (REDUCED || !FINE_PTR) return;

        let activeCard = null;

        function resetCard(card) {
            if (!card) return;
            card.style.transition = `transform 0.6s ${SPRING_SOFT}`;
            card.style.transform  = '';
            card.style.transition = '';
        }

        document.addEventListener('pointermove', e => {
            const card = e.target.closest('.card:not(.empathy-box)');

            if (card !== activeCard) {
                if (activeCard) resetCard(activeCard);
                activeCard = card;
                if (card) card.style.transition = 'none';   /* instant during move */
            }

            if (!card) return;

            const r  = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width  - 0.5;   /* -0.5 → 0.5 */
            const py = (e.clientY - r.top)  / r.height - 0.5;

            const rotX = py * -6;  /* max ±6deg */
            const rotY = px *  6;

            card.style.transform          = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
            card.style.willChange         = 'transform';
        }, { passive: true });

        document.addEventListener('pointerleave', () => {
            if (activeCard) {
                resetCard(activeCard);
                activeCard = null;
            }
        });

        document.addEventListener('pointerup', () => {
            if (activeCard) {
                activeCard.style.transform = `perspective(900px) translateY(-2px) scale(0.98)`;
                setTimeout(() => { if (activeCard) resetCard(activeCard); }, 150);
            }
        });
    }

    /* ─────────────────────────────────────────────
       11. SECTION ENTRANCE LINES
       Each section's first border-top draws in
       as a 2px sage line — activates whitespace
       between sections intentionally.
    ───────────────────────────────────────────── */
    function initSectionLines() {
        if (REDUCED) return;

        /* Only for sections that have a visible top border */
        const targets = document.querySelectorAll(
            '.trust-bar, .stats-section, .empathy-section'
        );

        if (!('IntersectionObserver' in window)) return;

        targets.forEach(el => {
            /* Inject a ::before pseudo-line with a data attribute */
            const line = document.createElement('div');
            line.setAttribute('aria-hidden', 'true');
            line.style.cssText = `
                position:absolute; top:0; left:0;
                height:1.5px; width:0%;
                background: linear-gradient(90deg, transparent, var(--sage) 30%, var(--sage) 70%, transparent);
                z-index:2; pointer-events:none;
                transition: width 1.1s ${SPRING_SOFT} 0.1s;
            `;

            /* Only add if el is position:relative-compatible */
            if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
            el.appendChild(line);

            const io = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        line.style.width = '100%';
                        io.unobserve(el);
                    }
                });
            }, { threshold: 0.05 });

            io.observe(el);
        });
    }

    /* ─────────────────────────────────────────────
       12. CURSOR GLOW — hero follows pointer
    ───────────────────────────────────────────── */
    function initCursorGlow() {
        const hero = document.querySelector('.hero');
        if (!hero || REDUCED || !FINE_PTR) return;
        if (hero.querySelector('.hero-cursor-glow')) return;

        const glow = document.createElement('div');
        glow.className     = 'hero-cursor-glow';
        glow.setAttribute('aria-hidden', 'true');
        hero.appendChild(glow);

        let raf = null;
        let tx  = -999, ty = -999;

        hero.addEventListener('pointermove', e => {
            tx = e.clientX;
            ty = e.clientY;
            if (!raf) raf = requestAnimationFrame(tick);
        }, { passive: true });

        function show(v) {
            glow.animate([{ opacity: glow.style.opacity || 0 }, { opacity: v }],
                { duration: 400, fill: 'both', easing: 'ease' });
        }

        hero.addEventListener('pointerenter', () => show(1));
        hero.addEventListener('pointerleave', () => show(0));

        function tick() {
            raf = null;
            const rect = hero.getBoundingClientRect();
            glow.style.transform = `translate(${tx - rect.left - 200}px, ${ty - rect.top - 200}px)`;
        }
    }

    /* ─────────────────────────────────────────────
       13. TRUST BAR TICKER
    ───────────────────────────────────────────── */
    function initTrustBar() {
        const track = document.getElementById('trustTrack');
        if (!track || !track.children.length) return;

        if (!track.dataset.cloned) {
            const snapshot = track.innerHTML;
            track.insertAdjacentHTML('beforeend', snapshot);
            track.dataset.cloned = '1';
        }

        if (REDUCED) return;

        track.style.animation = 'trustScroll 30s linear infinite';

        if (!trustBarBound) {
            track.addEventListener('mouseenter', () => {
                track.style.animationPlayState = 'paused';
            });
            track.addEventListener('mouseleave', () => {
                track.style.animationPlayState = 'running';
            });
            trustBarBound = true;
        }
    }

    /* ─────────────────────────────────────────────
       14. BUTTON PRESS TACTILE
       Adds a tiny scale-down on :active that CSS
       alone can't reliably handle cross-browser.
    ───────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.btn, .card, .nav-link, .icon-btn').forEach(el => {
            el.addEventListener('pointerdown', () => {
                if (REDUCED) return;
                el.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(0.97)' }],
                    { duration: 100, fill: 'forwards', easing: 'ease' }
                );
            });
            el.addEventListener('pointerup', () => {
                if (REDUCED) return;
                el.animate(
                    [{ transform: 'scale(0.97)' }, { transform: 'scale(1)' }],
                    { duration: 200, fill: 'forwards', easing: SPRING }
                );
            });
            el.addEventListener('pointercancel', () => {
                el.style.transform = '';
            });
        });
    });

})();

/* NOTE for maintainers ───────────────────────────────────────────────────────
   This file has ZERO hard dependencies.
   
   Execution layers:
   1. CSS scroll-driven (native, Chrome 115+, Safari 18+) — zero JS cost
   2. Web Animations API — works in all modern browsers
   3. IntersectionObserver — universal fallback with graceful degradation
   4. GSAP — used only if already loaded (progressive enhancement)
   
   prefers-reduced-motion is respected at every layer.
   No animation blocks content rendering.
   All elements are visible without JS (forceVisible safety net).
─────────────────────────────────────────────────────────────────────────── */
