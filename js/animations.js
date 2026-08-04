/* ==========================================================================
   ECONOVO — animations.js  v4.0.0 (GSAP-First, Zero Visibility Bugs)
   Design language: editorial precision meets kinetic energy.
   Brand book: Obsidian #0E2A24 · Silver Sage #8FB8A6 · Chalk #F4F7F2

   ARCHITECTURE:
   - ALL scroll reveals use GSAP ScrollTrigger (no IntersectionObserver conflicts)
   - CSS .reveal / .stagger-item / .timeline-item opacity:0 are ONLY initial
     states; GSAP always drives them to visible
   - forceShow() safety net runs after 3s to catch any missed elements
   - No clip-path conflicts: GSAP overrides CSS clip-path atomically
   ========================================================================== */

(function () {
    'use strict';

    /* ── Constants ── */
    const CHARS   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HAS_GSAP = typeof gsap !== 'undefined';
    const HAS_ST   = HAS_GSAP && typeof ScrollTrigger !== 'undefined';

    /* ── Safety net: force all hidden elements visible after 3s ──
       Ensures nothing stays invisible if GSAP/ScrollTrigger misfires  */
    function installSafetyNet() {
        setTimeout(() => {
            const hidden = document.querySelectorAll(
                '.reveal:not(.active), .stagger-item:not(.in), ' +
                '.timeline-item:not(.in), .will-reveal:not(.revealed)'
            );
            hidden.forEach(el => {
                el.style.opacity     = '1';
                el.style.transform   = 'none';
                el.style.clipPath    = 'none';
                el.style.visibility  = 'visible';
                el.classList.add('active', 'in', 'revealed');
            });
        }, 3000);
    }

    /* ── Immediate show for reduced motion ── */
    function showAll() {
        document.querySelectorAll(
            '.reveal, .stagger-item, .timeline-item, .will-reveal, .reveal-fade'
        ).forEach(el => {
            el.style.opacity    = '1';
            el.style.transform  = 'none';
            el.style.clipPath   = 'none';
            el.style.visibility = 'visible';
            el.classList.add('active', 'in', 'revealed');
        });
    }

    /* ═══════════════════════════════════════════════════════
       INIT
    ═══════════════════════════════════════════════════════ */
    function init() {
        if (HAS_GSAP && HAS_ST) {
            gsap.registerPlugin(ScrollTrigger);
        }

        if (REDUCED) {
            showAll();
            initTrustBar();
            document.body.classList.add('js-ready');
            return;
        }

        /* Run all systems */
        initCursorGlow();
        heroEntrance();
        idleFloat();
        heroParallax();
        initRevealSingles();
        initGridReveals();
        initTimelineReveal();
        initMagneticCards();
        initTrustBar();

        document.body.classList.add('js-ready');
        installSafetyNet();
    }

    /* Fire on DOMContentLoaded or immediately if already ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* Re-init hook for dynamically rendered content */
    document.addEventListener('econovo:rendered', () => {
        if (HAS_GSAP && HAS_ST) {
            ScrollTrigger.refresh();
        }
        initRevealSingles();
        initGridReveals();
        initTimelineReveal();
        initTrustBar();
    });


    /* ══════════════════════════════════════════════
       1. CURSOR GLOW
    ══════════════════════════════════════════════ */
    function initCursorGlow() {
        const hero = document.querySelector('.hero');
        if (!hero || !HAS_GSAP) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
        if (hero.querySelector('.hero-cursor-glow')) return;

        const glow = document.createElement('div');
        glow.className = 'hero-cursor-glow';
        hero.appendChild(glow);

        let raf = null, mx = -999, my = -999;

        hero.addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
            if (!raf) raf = requestAnimationFrame(() => {
                raf = null;
                const r = hero.getBoundingClientRect();
                glow.style.transform = `translate(${mx - r.left - 200}px, ${my - r.top - 200}px)`;
            });
        });

        hero.addEventListener('pointerleave', () =>
            gsap.to(glow, { opacity: 0, duration: 0.6, ease: 'power2.out' }));
        hero.addEventListener('pointerenter', () =>
            gsap.to(glow, { opacity: 1, duration: 0.4, ease: 'power2.out' }));
    }


    /* ══════════════════════════════════════════════
       2. HERO ENTRANCE — orchestrated timeline
    ══════════════════════════════════════════════ */
    function heroEntrance() {
        const rule    = document.querySelector('.hero-rule');
        const eyebrow = document.querySelector('.hero-content .eyebrow');
        const h1      = document.querySelector('.hero-content h1');
        const desc    = document.querySelector('.hero-content > p');
        const tags    = document.querySelector('.hero-tags');
        const actions = document.querySelector('.hero-actions');
        const visual  = document.querySelector('.hero-visual');

        /* Animate rule via CSS class (it uses CSS transition width) */
        if (rule) setTimeout(() => rule.classList.add('revealed'), 80);

        if (!HAS_GSAP) {
            [eyebrow, h1, desc, tags, actions, visual].forEach(el => {
                if (!el) return;
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        /* Set initial states explicitly so no CSS conflicts */
        const tl = gsap.timeline({
            defaults: { ease: 'cubic-bezier(.16,1,.3,1)' },
            onComplete: () => {
                if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
            }
        });

        if (eyebrow) {
            gsap.set(eyebrow, { opacity: 0, y: 12 });
            tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.4 }, 0);
        }

        if (h1) {
            gsap.set(h1, { opacity: 0 });
            const originalHTML = h1.innerHTML;
            const plainText    = h1.textContent;
            tl.to(h1, { opacity: 1, duration: 0.3 }, 0.08);
            tl.add(() => scrambleText(h1, plainText, originalHTML), 0.08);
        }

        if (visual) {
            gsap.set(visual, { opacity: 0, scale: 0.96, y: 14 });
            tl.to(visual, { opacity: 1, scale: 1, y: 0, duration: 0.65 }, 0.15);
        }

        if (desc) {
            gsap.set(desc, { opacity: 0, y: 12, clipPath: 'inset(0 100% 0 0)' });
            tl.to(desc, { opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.6 }, 0.22);
        }

        if (tags && tags.children.length) {
            gsap.set(tags.children, { opacity: 0, scale: 0.9, y: 8 });
            tl.to(tags.children, { opacity: 1, scale: 1, y: 0, duration: 0.3, stagger: 0.04 }, 0.32);
        }

        if (actions) {
            gsap.set(actions, { opacity: 0, y: 14 });
            tl.to(actions, { opacity: 1, y: 0, duration: 0.45 }, 0.42);
        }
    }

    /* Text scramble effect */
    function scrambleText(el, plainText, originalHTML) {
        const words = plainText.split('');
        let iter = 0;
        const maxIter = plainText.length * 2.5;
        const iv = setInterval(() => {
            el.textContent = words
                .map((ch, i) => {
                    if (ch === ' ') return ' ';
                    if (i < Math.floor(iter / 2.5)) return ch;
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                }).join('');
            iter++;
            if (iter >= maxIter) {
                clearInterval(iv);
                el.innerHTML = originalHTML;
            }
        }, 25);
    }


    /* ══════════════════════════════════════════════
       3. IDLE FLOAT
    ══════════════════════════════════════════════ */
    function idleFloat() {
        if (!HAS_GSAP) return;

        const badge = document.querySelector('.floating-badge');
        const tag   = document.querySelector('.floating-tag');
        const img   = document.querySelector('.hero-img-container');

        if (badge) gsap.to(badge, { y: -10, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        if (tag)   gsap.to(tag,   { y: -8, rotate: -2, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.3 });
        if (img)   gsap.to(img,   { y: -8, duration: 3.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }


    /* ══════════════════════════════════════════════
       4. HERO PARALLAX
    ══════════════════════════════════════════════ */
    function heroParallax() {
        if (!HAS_GSAP || !HAS_ST) return;
        const visual = document.querySelector('.hero-visual');
        if (!visual) return;

        gsap.to(visual, {
            yPercent: 12,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }


    /* ══════════════════════════════════════════════
       5. SINGLE REVEALS (.reveal elements)
       Uses GSAP ScrollTrigger — no IntersectionObserver
    ══════════════════════════════════════════════ */
    function initRevealSingles() {
        const targets = document.querySelectorAll('.reveal:not(.active)');
        if (!targets.length) return;

        if (!HAS_GSAP) {
            targets.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.style.clipPath = 'none';
                el.classList.add('active');
            });
            return;
        }

        targets.forEach(el => {
            /* Override CSS clip-path initial state with GSAP */
            gsap.set(el, { opacity: 0, y: 20, clipPath: 'inset(0 0 0% 0)' });

            if (!HAS_ST) {
                gsap.to(el, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' });
                el.classList.add('active');
                return;
            }

            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.65,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 95%',   /* fires early so mobile sees it */
                    once: true,
                    onEnter: () => el.classList.add('active')
                }
            });
        });
    }


    /* ══════════════════════════════════════════════
       6. GRID REVEALS — staggered children
    ══════════════════════════════════════════════ */
    const GRID_SELECTORS = [
        '#statsRow', '#whyGrid', '#pillarsGrid',
        '#teamGrid', '#eventsGrid', '#faqWrapper'
    ];

    function initGridReveals() {
        GRID_SELECTORS.forEach(sel => revealGrid(sel));
    }

    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container) return;

        const children = Array.from(container.children).filter(c => c.children || c.textContent);
        if (!children.length) return;

        if (!HAS_GSAP) {
            children.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
            if (selector === '#statsRow') animateCounters();
            return;
        }

        /* Set initial GSAP state (overrides any CSS opacity:0) */
        gsap.set(children, { opacity: 0, y: 24 });

        if (!HAS_ST) {
            gsap.to(children, {
                opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out',
                onComplete: () => { if (selector === '#statsRow') animateCounters(); }
            });
            return;
        }

        gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: container,
                start: 'top 92%',
                once: true
            },
            onComplete: () => {
                if (selector === '#statsRow') animateCounters();
            }
        });
    }


    /* ══════════════════════════════════════════════
       7. STAT COUNTERS
    ══════════════════════════════════════════════ */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw   = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;

            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (!HAS_GSAP) { el.textContent = target + suffix; return; }

            const obj = { v: 0 };
            gsap.to(obj, {
                v: target, duration: 1.4, ease: 'power1.out',
                onUpdate()  { el.textContent = Math.round(obj.v) + suffix; },
                onComplete(){ el.textContent = target + suffix; }
            });
        });
    }


    /* ══════════════════════════════════════════════
       8. TIMELINE REVEAL
       Fixes: .timeline-item has opacity:0 in CSS.
       GSAP ScrollTrigger drives each item + dot to visible,
       and draws the spine line.
    ══════════════════════════════════════════════ */
    function initTimelineReveal() {
        const timeline  = document.querySelector('#timeline');
        if (!timeline) return;

        const items    = Array.from(timeline.querySelectorAll('.timeline-item'));
        const spineLine = timeline.querySelector('.timeline-line') ||
                          /* fallback: use ::before via a proxy div */ null;

        if (!items.length) return;

        if (!HAS_GSAP) {
            items.forEach(el => {
                el.classList.add('in');
                el.style.opacity   = '1';
                el.style.transform = 'none';
            });
            /* Draw spine via CSS class */
            timeline.classList.add('animate-spine');
            return;
        }

        /* Set GSAP initial states — must override CSS opacity:0 */
        gsap.set(items, { opacity: 0, y: 28 });

        items.forEach((item, i) => {
            const dot = item.querySelector('.timeline-dot');
            if (dot) gsap.set(dot, { scale: 0 });

            if (!HAS_ST) {
                gsap.to(item, {
                    opacity: 1, y: 0, duration: 0.6, delay: i * 0.12, ease: 'power2.out',
                    onComplete: () => { item.classList.add('in'); if (dot) gsap.to(dot, { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }); }
                });
                return;
            }

            gsap.to(item, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: item,
                    start: 'top 90%',
                    once: true,
                    onEnter: () => {
                        item.classList.add('in');
                        if (dot) gsap.to(dot, { scale: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.15 });
                    }
                }
            });
        });

        /* Draw the spine line */
        if (HAS_ST) {
            const triggerEl = items[0] || timeline;
            ScrollTrigger.create({
                trigger: triggerEl,
                start: 'top 88%',
                once: true,
                onEnter: () => timeline.classList.add('animate-spine')
            });
        } else {
            timeline.classList.add('animate-spine');
        }

        /* Also handle .timeline-line element if it exists */
        if (spineLine) {
            gsap.set(spineLine, { scaleY: 0, transformOrigin: 'top center' });
            if (HAS_ST) {
                gsap.to(spineLine, {
                    scaleY: 1,
                    duration: 1.0,
                    ease: 'power2.inOut',
                    scrollTrigger: {
                        trigger: timeline,
                        start: 'top 88%',
                        once: true
                    }
                });
            } else {
                gsap.to(spineLine, { scaleY: 1, duration: 1.0, ease: 'power2.inOut' });
            }
        }
    }


    /* ══════════════════════════════════════════════
       9. MAGNETIC CARD TILT (desktop only)
    ══════════════════════════════════════════════ */
    function initMagneticCards() {
        if (!HAS_GSAP) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

        let active = null;
        const reset = card => gsap.to(card, {
            rotateX: 0, rotateY: 0, y: 0,
            duration: 0.6, ease: 'elastic.out(1,.5)'
        });

        document.addEventListener('pointermove', e => {
            const card = e.target.closest('.card:not(.empathy-box)');
            if (card !== active) { if (active) reset(active); active = card; }
            if (!card) return;

            const r  = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width  - 0.5;
            const py = (e.clientY - r.top)  / r.height - 0.5;

            gsap.to(card, {
                rotateX: py * -5, rotateY: px * 5, y: -5,
                duration: 0.35, ease: 'power2.out', transformPerspective: 900
            });
        });

        document.addEventListener('mouseout', e => {
            if (!e.relatedTarget && active) { reset(active); active = null; }
        });
    }


    /* ══════════════════════════════════════════════
       10. TRUST BAR MARQUEE
    ══════════════════════════════════════════════ */
    function initTrustBar() {
        const track = document.getElementById('trustTrack');
        if (!track || !track.children.length) return;

        /* Reset */
        track.style.animation = 'none';
        void track.offsetWidth;

        /* Clone once */
        if (!track.dataset.cloned) {
            track.insertAdjacentHTML('beforeend', track.innerHTML);
            track.dataset.cloned = '1';
        }

        if (REDUCED) return;

        track.style.animation = 'trustScroll 28s linear infinite';

        track.addEventListener('mouseenter', () => {
            track.style.animationPlayState = 'paused';
        }, { once: false });
        track.addEventListener('mouseleave', () => {
            track.style.animationPlayState = 'running';
        }, { once: false });
    }

})();
