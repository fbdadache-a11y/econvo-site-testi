/* ==========================================================================
   ECONOVO — animations.js  v4.0
   Design language: editorial precision meets kinetic energy.
   Brand: Obsidian #0E2A24 · Silver Sage #8FB8A6 · Chalk #F4F7F2
   ========================================================================== */

(function () {
    'use strict';

    /* ── Config ── */
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TOUCH   = !window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const CHARS   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

    const GRID_SELECTORS = [
        '#statsRow', '#whyGrid', '#pillarsGrid',
        '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'
    ];

    let singleObserver;
    const gridObservers = new WeakMap();
    let trustBarBound   = false;

    /* ══════════════════════════════════════════════════════
       UTILS
    ══════════════════════════════════════════════════════ */
    function forceVisible(el) {
        if (!el) return;
        el.style.opacity    = '1';
        el.style.transform  = 'none';
        el.style.clipPath   = 'none';
        el.style.visibility = 'visible';
        el.style.filter     = 'none';
    }

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    /* ── GSAP shorthand ── */
    const G = {
        has: () => !!window.gsap,
        from: (el, vars) => G.has() && !REDUCED ? gsap.from(el, vars) : forceVisible(el),
        to:   (el, vars) => G.has() && !REDUCED ? gsap.to(el, vars)   : null,
        tl:   (opts)     => G.has() ? gsap.timeline(opts) : null,
        set:  (el, vars) => G.has() ? gsap.set(el, vars)  : null,
    };

    /* ══════════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
        if (G.has() && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

        heroEntrance();
        initCursorGlow();
        idleFloat();
        heroParallax();
        initScrollReveal();
        GRID_SELECTORS.forEach(revealGrid);
        initStatCounters();
        initTimelineDrawIn();
        initMagneticCards();
        initTrustBar();
        initNavProgress();
        initSectionAccents();

        document.body.classList.add('js-ready');
    });

    /* Re-run after language.js renders content */
    document.addEventListener('econovo:rendered', () => {
        initScrollReveal();
        GRID_SELECTORS.forEach(revealGrid);
        initTimelineDrawIn();
        initTrustBar();
        initSectionAccents();
    });

    /* ══════════════════════════════════════════════════════
       1. HERO ENTRANCE — sequenced, cinematic
    ══════════════════════════════════════════════════════ */
    function heroEntrance() {
        const rule    = $('.hero-rule');
        const eyebrow = $('.hero-content .eyebrow');
        const h1      = $('.hero-content h1');
        const desc    = $('.hero-content > p');
        const tags    = $('.hero-tags');
        const actions = $('.hero-actions');
        const visual  = $('.hero-visual');
        const badge   = $('.floating-badge');

        if (REDUCED) {
            [eyebrow, h1, desc, tags, actions, visual].forEach(forceVisible);
            h1?.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        /* Rule: draws from center outward */
        if (rule) {
            rule.style.transformOrigin = 'center';
            rule.style.transform = 'scaleX(0)';
            rule.style.opacity = '1';
            setTimeout(() => {
                rule.style.transition = 'transform 0.7s cubic-bezier(.16,1,.3,1)';
                rule.style.transform  = 'scaleX(1)';
                setTimeout(() => rule.classList.add('revealed'), 50);
            }, 80);
        }

        if (!G.has()) {
            [eyebrow, h1, desc, tags, actions, visual].forEach(forceVisible);
            h1?.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        const tl = gsap.timeline({
            defaults: { ease: 'expo.out' },
            onComplete: () => h1?.closest('.hero-content')?.classList.add('animate-done')
        });

        /* Eyebrow: slides up + letter spacing expands */
        if (eyebrow) {
            tl.fromTo(eyebrow,
                { opacity: 0, y: 14, letterSpacing: '0.3em' },
                { opacity: 1, y: 0,  letterSpacing: eyebrow.style.letterSpacing || '0.1em',
                  duration: 0.55 },
            0.05);
        }

        /* H1: word-by-word stagger + scramble */
        if (h1) {
            const originalHTML = h1.innerHTML;
            const plainText    = h1.textContent;
            tl.fromTo(h1,
                { opacity: 0 },
                { opacity: 1, duration: 0.2 },
            0.15);
            tl.add(() => scrambleText(h1, plainText, originalHTML), 0.15);
        }

        /* Visual: scale from 0.92 + slight rotation */
        if (visual) {
            tl.fromTo(visual,
                { opacity: 0, scale: 0.88, y: 28, rotationZ: 1.5 },
                { opacity: 1, scale: 1,    y: 0,  rotationZ: 0,
                  duration: 0.9, ease: 'expo.out' },
            0.1);
        }

        /* Desc: wipe left-to-right */
        if (desc) {
            tl.fromTo(desc,
                { opacity: 0, clipPath: 'inset(0 100% 0 0)', y: 6 },
                { opacity: 1, clipPath: 'inset(0 0%   0 0)', y: 0,
                  duration: 0.65, ease: 'expo.out' },
            0.3);
        }

        /* Tags: pop in with spring stagger */
        if (tags?.children.length) {
            tl.fromTo([...tags.children],
                { opacity: 0, scale: 0.7, y: 10 },
                { opacity: 1, scale: 1,   y: 0,
                  duration: 0.4, stagger: 0.055,
                  ease: 'back.out(2)' },
            0.45);
        }

        /* CTA buttons: slide up + subtle blur clear */
        if (actions) {
            tl.fromTo(actions,
                { opacity: 0, y: 18, filter: 'blur(4px)' },
                { opacity: 1, y: 0,  filter: 'blur(0px)',
                  duration: 0.5, ease: 'expo.out' },
            0.52);
        }

        /* Floating badge: bounces in late */
        if (badge) {
            tl.fromTo(badge,
                { opacity: 0, scale: 0, rotation: -12 },
                { opacity: 1, scale: 1, rotation: 0,
                  duration: 0.55, ease: 'back.out(2.2)' },
            0.7);
        }
    }

    /* ── Scramble text ── */
    function scrambleText(el, plainText, originalHTML, delay = 0) {
        const chars = CHARS;
        const letters = plainText.split('');
        let iter = 0;
        const maxIter = plainText.length * 2.2;

        setTimeout(() => {
            const iv = setInterval(() => {
                el.textContent = letters
                    .map((char, i) => {
                        if (char === ' ') return ' ';
                        if (i < Math.floor(iter / 2.2)) return char;
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');
                iter++;
                if (iter >= maxIter) {
                    clearInterval(iv);
                    el.innerHTML = originalHTML;
                }
            }, 22);
        }, delay * 1000);
    }

    /* ══════════════════════════════════════════════════════
       2. CURSOR GLOW — organic sage radial
    ══════════════════════════════════════════════════════ */
    function initCursorGlow() {
        const hero = $('.hero');
        if (!hero || REDUCED || TOUCH) return;
        if (hero.querySelector('.hero-cursor-glow')) return;

        const glow = document.createElement('div');
        glow.className = 'hero-cursor-glow';
        hero.appendChild(glow);

        let raf = null, mx = -999, my = -999;
        let curX = -999, curY = -999;

        hero.addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
            if (!raf) raf = requestAnimationFrame(tick);
        });
        hero.addEventListener('pointerleave', () =>
            G.to(glow, { opacity: 0, duration: 0.5, ease: 'power2.out' })
        );
        hero.addEventListener('pointerenter', () =>
            G.to(glow, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        );

        function tick() {
            raf = null;
            /* Lerp for smooth follow */
            curX += (mx - curX) * 0.12;
            curY += (my - curY) * 0.12;
            const rect = hero.getBoundingClientRect();
            glow.style.transform = `translate(${curX - rect.left - 220}px, ${curY - rect.top - 220}px)`;
            if (Math.abs(mx - curX) > 0.5 || Math.abs(my - curY) > 0.5)
                raf = requestAnimationFrame(tick);
        }
    }

    /* ══════════════════════════════════════════════════════
       3. IDLE FLOAT — organic, varied timing per element
    ══════════════════════════════════════════════════════ */
    function idleFloat() {
        if (!G.has() || REDUCED) return;

        /* Badge: slow bob */
        gsap.to('.floating-badge', {
            y: -12, rotation: 2,
            duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut'
        });

        /* Tags: slightly out of phase */
        gsap.to('.floating-tag', {
            y: -9, rotation: -1.5,
            duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.4
        });

        /* Image container: very subtle, slow */
        gsap.to('.hero-img-container', {
            y: -10, duration: 4.0, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.2
        });

        /* Subtle scale pulse on the hero visual circle/ring if present */
        gsap.to('.hero-ring', {
            scale: 1.03, duration: 2.8, repeat: -1, yoyo: true,
            ease: 'sine.inOut', transformOrigin: 'center'
        });
    }

    /* ══════════════════════════════════════════════════════
       4. HERO PARALLAX — multi-layer depth
    ══════════════════════════════════════════════════════ */
    function heroParallax() {
        if (!G.has() || !window.ScrollTrigger || REDUCED) return;
        if (!$('.hero-visual')) return;

        /* Visual moves slower than scroll = depth */
        gsap.to('.hero-visual', {
            yPercent: 14,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 }
        });

        /* Content moves slightly faster = pulls away from visual */
        gsap.to('.hero-content', {
            yPercent: -6,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 }
        });

        /* Floating elements: exaggerated drift */
        gsap.to('.floating-badge', {
            yPercent: 30,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
        });
        gsap.to('.floating-tag', {
            yPercent: -20,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
        });
    }

    /* ══════════════════════════════════════════════════════
       5. SCROLL REVEAL — unique per element type
    ══════════════════════════════════════════════════════ */
    function initScrollReveal() {
        const targets = $$('.reveal:not(.active)');
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            targets.forEach(revealElement); return;
        }

        if (!singleObserver) {
            singleObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    revealElement(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        }
        targets.forEach(el => singleObserver.observe(el));
    }

    function revealElement(el) {
        el.classList.add('active');
        if (!G.has() || REDUCED) { forceVisible(el); return; }

        /* Headings: mask wipe upward */
        if (el.matches('h2, h3, .section-title, .view-title')) {
            gsap.fromTo(el,
                { opacity: 0, y: 32, clipPath: 'inset(100% 0 0 0)' },
                { opacity: 1, y: 0,  clipPath: 'inset(0% 0 0 0)',
                  duration: 0.7, ease: 'expo.out' }
            );
        /* Eyebrows / labels: expand letter spacing */
        } else if (el.matches('.eyebrow, .section-label, .view-eyebrow, .view-sub')) {
            gsap.fromTo(el,
                { opacity: 0, letterSpacing: '0.5em', y: 8 },
                { opacity: 1, letterSpacing: '',       y: 0,
                  duration: 0.6, ease: 'expo.out' }
            );
        /* Cards: lift from slightly below with blur */
        } else if (el.matches('.card, .ann-card, .event-row, .group-card')) {
            gsap.fromTo(el,
                { opacity: 0, y: 24, scale: 0.97, filter: 'blur(3px)' },
                { opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)',
                  duration: 0.55, ease: 'expo.out' }
            );
        /* Default: clean fade-up */
        } else {
            gsap.fromTo(el,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }
            );
        }
    }

    /* ══════════════════════════════════════════════════════
       6. GRID REVEAL — staggered cascade per grid type
    ══════════════════════════════════════════════════════ */
    function revealGrid(selector) {
        const container = $(selector);
        if (!container || !container.children.length) return;

        const prev = gridObservers.get(container);
        if (prev) prev.disconnect();

        const children = Array.from(container.children);

        if (!('IntersectionObserver' in window)) {
            runCascade(selector, children); return;
        }

        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                runCascade(selector, children);
                obs.disconnect();
                gridObservers.delete(container);
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

        gridObservers.set(container, obs);
        obs.observe(container);
    }

    function runCascade(selector, children) {
        if (REDUCED) { children.forEach(forceVisible); return; }
        if (!G.has()) { children.forEach(forceVisible); return; }

        switch (selector) {

            /* Stats: count up after sliding in */
            case '#statsRow':
                gsap.fromTo(children,
                    { opacity: 0, y: 30, scale: 0.9 },
                    { opacity: 1, y: 0,  scale: 1,
                      duration: 0.55, stagger: 0.08, ease: 'back.out(1.4)',
                      onComplete: animateCounters }
                );
                break;

            /* Why grid: alternating left/right */
            case '#whyGrid':
                children.forEach((el, i) => {
                    gsap.fromTo(el,
                        { opacity: 0, x: i % 2 === 0 ? -30 : 30, y: 16 },
                        { opacity: 1, x: 0, y: 0,
                          duration: 0.6, ease: 'expo.out', delay: i * 0.07 }
                    );
                });
                break;

            /* Pillars: fan out from center */
            case '#pillarsGrid':
                gsap.fromTo(children,
                    { opacity: 0, scale: 0.85, y: 20, rotationZ: (i) => (i - children.length / 2) * 1.5 },
                    { opacity: 1, scale: 1,    y: 0,  rotationZ: 0,
                      duration: 0.5, stagger: 0.06, ease: 'back.out(1.6)' }
                );
                break;

            /* Timeline: each item draws a line then fades content */
            case '#timeline':
                gsap.fromTo(children,
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0,
                      duration: 0.5, stagger: 0.1, ease: 'expo.out',
                      onStart: drawTimeline }
                );
                break;

            /* Team: rise with slight blur */
            case '#teamGrid':
                gsap.fromTo(children,
                    { opacity: 0, y: 28, filter: 'blur(5px)' },
                    { opacity: 1, y: 0,  filter: 'blur(0px)',
                      duration: 0.5, stagger: 0.07, ease: 'expo.out' }
                );
                break;

            /* Events: slide in from right with stagger */
            case '#eventsGrid':
                gsap.fromTo(children,
                    { opacity: 0, x: 24, y: 8 },
                    { opacity: 1, x: 0,  y: 0,
                      duration: 0.45, stagger: 0.075, ease: 'expo.out' }
                );
                break;

            /* FAQ: open like accordion items */
            case '#faqWrapper':
                gsap.fromTo(children,
                    { opacity: 0, y: 14, scaleY: 0.96, transformOrigin: 'top' },
                    { opacity: 1, y: 0,  scaleY: 1,
                      duration: 0.4, stagger: 0.06, ease: 'expo.out' }
                );
                break;

            default:
                gsap.fromTo(children,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'expo.out' }
                );
        }
    }

    /* ══════════════════════════════════════════════════════
       7. STAT COUNTERS — eased count-up with formatting
    ══════════════════════════════════════════════════════ */
    function animateCounters() {
        $$('#statsRow .stat-value').forEach(el => {
            const raw   = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)/);
            if (!match) return;

            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (G.has() && !REDUCED) {
                const obj = { v: 0 };
                gsap.to(obj, {
                    v: target, duration: 1.6, ease: 'power2.out',
                    onUpdate() { el.textContent = Math.round(obj.v) + suffix; },
                    onComplete() { el.textContent = target + suffix; }
                });
            } else {
                el.textContent = target + suffix;
            }
        });
    }

    /* ══════════════════════════════════════════════════════
       8. TIMELINE DRAW-IN — line grows downward
    ══════════════════════════════════════════════════════ */
    function initTimelineDrawIn() {}

    function drawTimeline() {
        const line = $('.timeline-line');
        if (!line || REDUCED) return;

        if (G.has()) {
            gsap.fromTo(line,
                { scaleY: 0, transformOrigin: 'top center' },
                { scaleY: 1, duration: 1.0, ease: 'expo.out', delay: 0.1 }
            );
        } else {
            line.style.cssText = 'transform-origin:top;transform:scaleY(0);' +
                'transition:transform 0.9s cubic-bezier(.16,1,.3,1) .1s;';
            requestAnimationFrame(() => { line.style.transform = 'scaleY(1)'; });
        }
    }

    /* ══════════════════════════════════════════════════════
       9. MAGNETIC CARD TILT — smoother, momentum-based
    ══════════════════════════════════════════════════════ */
    function initMagneticCards() {
        if (!G.has() || REDUCED || TOUCH) return;

        let active = null;

        const reset = card => gsap.to(card, {
            rotateX: 0, rotateY: 0, y: 0, scale: 1,
            filter: 'brightness(1)',
            duration: 0.7, ease: 'elastic.out(1,.5)'
        });

        document.addEventListener('pointermove', e => {
            const card = e.target.closest('.card:not(.empathy-box)');

            if (card !== active) {
                if (active) reset(active);
                active = card;
            }
            if (!card) return;

            const r  = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width  - 0.5;
            const py = (e.clientY - r.top)  / r.height - 0.5;

            /* More tilt + scale up + subtle brighten on hover */
            gsap.to(card, {
                rotateX: py * -7,
                rotateY: px *  7,
                y: -6,
                scale: 1.018,
                filter: 'brightness(1.04)',
                duration: 0.3,
                ease: 'power2.out',
                transformPerspective: 800
            });
        });

        document.addEventListener('pointerleave', e => {
            if (!e.relatedTarget && active) { reset(active); active = null; }
        });
    }

    /* ══════════════════════════════════════════════════════
       10. TRUST BAR — smooth infinite ticker
    ══════════════════════════════════════════════════════ */
    function initTrustBar() {
        const track = document.getElementById('trustTrack');
        if (!track || !track.children.length) return;

        track.style.animation = 'none';
        void track.offsetWidth;

        if (!track.dataset.cloned) {
            track.insertAdjacentHTML('beforeend', track.innerHTML);
            track.dataset.cloned = '1';
        }

        if (REDUCED) return;

        track.style.animation = 'trustScroll 28s linear infinite';

        if (!trustBarBound) {
            track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
            track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
            trustBarBound = true;
        }
    }

    /* ══════════════════════════════════════════════════════
       11. SCROLL PROGRESS BAR — top of viewport
    ══════════════════════════════════════════════════════ */
    function initNavProgress() {
        if (REDUCED) return;

        const bar = document.createElement('div');
        bar.id = 'scroll-progress';
        bar.style.cssText = `
            position:fixed; top:0; left:0; z-index:9999;
            height:2.5px; width:0%; pointer-events:none;
            background: linear-gradient(90deg, var(--obsidian,#0e2a24) 0%, var(--sage,#8fb8a6) 100%);
            transform-origin: left;
            transition: width 80ms linear;
        `;
        document.body.appendChild(bar);

        window.addEventListener('scroll', () => {
            const doc  = document.documentElement;
            const pct  = doc.scrollTop / (doc.scrollHeight - doc.clientHeight) * 100;
            bar.style.width = Math.min(pct, 100) + '%';
        }, { passive: true });
    }

    /* ══════════════════════════════════════════════════════
       12. SECTION ACCENTS — sage line sweeps under headings
    ══════════════════════════════════════════════════════ */
    function initSectionAccents() {
        if (!G.has() || REDUCED) return;
        if (!window.ScrollTrigger) return;

        $$('.section-title, .view-title').forEach(el => {
            if (el.dataset.accentDone) return;
            el.dataset.accentDone = '1';

            /* Inject underline span */
            if (!el.querySelector('.title-accent-line')) {
                const span = document.createElement('span');
                span.className = 'title-accent-line';
                span.style.cssText = `
                    display:block; height:2px; margin-top:6px; border-radius:2px;
                    background:var(--sage,#8fb8a6); transform-origin:left;
                    transform:scaleX(0); will-change:transform;
                `;
                el.appendChild(span);
            }

            const line = el.querySelector('.title-accent-line');
            ScrollTrigger.create({
                trigger: el,
                start: 'top 85%',
                once: true,
                onEnter: () => gsap.to(line, {
                    scaleX: 1, duration: 0.65, ease: 'expo.out', delay: 0.15
                })
            });
        });
    }

    /* ══════════════════════════════════════════════════════
       13. BUTTON RIPPLE — ink spreads from click point
    ══════════════════════════════════════════════════════ */
    document.addEventListener('pointerdown', e => {
        const btn = e.target.closest('.btn, .btn-publish, .btn-save, .btn-join-group, .btn-confirm');
        if (!btn || REDUCED) return;

        const ripple = document.createElement('span');
        const r   = btn.getBoundingClientRect();
        const sz  = Math.max(r.width, r.height) * 2;
        const x   = e.clientX - r.left - sz / 2;
        const y   = e.clientY - r.top  - sz / 2;

        ripple.style.cssText = `
            position:absolute; border-radius:50%; pointer-events:none;
            width:${sz}px; height:${sz}px;
            left:${x}px; top:${y}px;
            background:rgba(255,255,255,0.22);
            transform:scale(0); opacity:1;
            animation:ripple-out 0.55s cubic-bezier(.16,1,.3,1) forwards;
        `;

        if (!btn.style.position || btn.style.position === 'static') {
            btn.style.position = 'relative';
        }
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }, { passive: true });

    /* Inject ripple keyframe once */
    if (!document.getElementById('eco-ripple-style')) {
        const st = document.createElement('style');
        st.id = 'eco-ripple-style';
        st.textContent = `@keyframes ripple-out { to { transform: scale(1); opacity: 0; } }`;
        document.head.appendChild(st);
    }

    /* ══════════════════════════════════════════════════════
       14. ACTIVE NAV LINK INDICATOR — magnetic slide
    ══════════════════════════════════════════════════════ */
    (function initNavIndicator() {
        if (!G.has() || REDUCED) return;

        const nav = $('.top-nav .nav-center, nav .nav-links');
        if (!nav) return;

        /* Create sliding pill */
        const pill = document.createElement('div');
        pill.style.cssText = `
            position:absolute; pointer-events:none; z-index:0;
            background:var(--bg-muted, rgba(14,42,36,.07));
            border-radius:var(--r-md, 8px);
            transition:none;
        `;
        nav.style.position = 'relative';
        nav.insertBefore(pill, nav.firstChild);

        function moveTo(el) {
            if (!el) { gsap.to(pill, { opacity: 0, duration: 0.2 }); return; }
            const nr = nav.getBoundingClientRect();
            const er = el.getBoundingClientRect();
            gsap.to(pill, {
                x: er.left - nr.left, y: er.top - nr.top,
                width: er.width, height: er.height,
                opacity: 1, duration: 0.3, ease: 'expo.out'
            });
        }

        const items = $$('.nav-item', nav);
        items.forEach(item => {
            item.addEventListener('mouseenter', () => moveTo(item));
        });
        nav.addEventListener('mouseleave', () => {
            const active = $('.nav-item.active', nav);
            active ? moveTo(active) : gsap.to(pill, { opacity: 0, duration: 0.25 });
        });

        /* Init on active */
        const initActive = $('.nav-item.active', nav);
        if (initActive) { gsap.set(pill, { opacity: 0 }); }
    })();

})();
