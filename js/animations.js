/* ==========================================================================
   ECONOVO — animations.js  v3.4.2 (Fixed Reveal + Safe Fallbacks)
   Design language: editorial precision meets kinetic energy.
   Brand book: Obsidian #0E2A24 · Silver Sage #8FB8A6 · Chalk #F4F7F2
   ========================================================================== */

(function () {
    'use strict';

    /* ── Config ── */
    const CHARS   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const EASE    = 'cubic-bezier(.16,1,.3,1)';
    const EASE_S  = 'power2.out';
    const EASE_EL = 'elastic.out(1,.5)';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const GRID_SELECTORS = [
        '#statsRow', '#whyGrid', '#pillarsGrid',
        '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'
    ];

    let singleObserver;
    const gridObservers = new WeakMap();
    let trustBarBound = false;

    /* ── Helpers ── */
    function forceVisible(el) {
        if (!el) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.clipPath = 'none';
        el.style.visibility = 'visible';
    }

    function animateIn(el, from = { opacity: 0, y: 20 }, to = { opacity: 1, y: 0, duration: 0.6, ease: EASE_S }) {
        if (!el) return;

        el.classList.add('active');

        if (window.gsap && !REDUCED) {
            gsap.fromTo(el, from, to);
        } else {
            forceVisible(el);
        }
    }

    function observeOrShow(observer, el, onShow) {
        if (!el) return;

        if (!observer) {
            onShow(el);
            return;
        }

        observer.observe(el);
    }

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', () => {
        if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

        initCursorGlow();
        heroEntrance();
        idleFloat();
        heroParallax();

        initSingleReveal();
        GRID_SELECTORS.forEach(sel => revealGrid(sel));

        initMagneticCards();
        initTimelineDrawIn();
        initTrustBar();

        document.body.classList.add('js-ready');
    });

    document.addEventListener('econovo:rendered', () => {
        initSingleReveal();
        GRID_SELECTORS.forEach(sel => revealGrid(sel));
        initTimelineDrawIn();
        initTrustBar();
    });

    /* ══════════════════════════════════════════════
       1. CURSOR GLOW — sage radial follows pointer
    ══════════════════════════════════════════════ */
    function initCursorGlow() {
        const hero = document.querySelector('.hero');
        if (!hero || REDUCED) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

        if (hero.querySelector('.hero-cursor-glow')) return;

        const glow = document.createElement('div');
        glow.className = 'hero-cursor-glow';
        hero.appendChild(glow);

        let raf = null;
        let mx = -999;
        let my = -999;

        hero.addEventListener('pointermove', e => {
            mx = e.clientX;
            my = e.clientY;
            if (!raf) raf = requestAnimationFrame(tick);
        });

        hero.addEventListener('pointerleave', () => {
            if (window.gsap) gsap.to(glow, { opacity: 0, duration: 0.6, ease: EASE_S });
            else glow.style.opacity = '0';
        });

        hero.addEventListener('pointerenter', () => {
            if (window.gsap) gsap.to(glow, { opacity: 1, duration: 0.4, ease: EASE_S });
            else glow.style.opacity = '1';
        });

        function tick() {
            raf = null;
            const rect = hero.getBoundingClientRect();
            const x = mx - rect.left;
            const y = my - rect.top;
            glow.style.transform = `translate(${x - 200}px, ${y - 200}px)`;
        }
    }

    /* ══════════════════════════════════════════════
       2. HERO ENTRANCE
    ══════════════════════════════════════════════ */
    function heroEntrance() {
        const rule    = document.querySelector('.hero-rule');
        const eyebrow = document.querySelector('.hero-content .eyebrow');
        const h1      = document.querySelector('.hero-content h1');
        const desc    = document.querySelector('.hero-content > p');
        const tags    = document.querySelector('.hero-tags');
        const actions = document.querySelector('.hero-actions');
        const visual  = document.querySelector('.hero-visual');

        if (rule) setTimeout(() => rule.classList.add('revealed'), 50);

        if (REDUCED) {
            [eyebrow, h1, desc, tags, actions, visual].forEach(forceVisible);
            if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        if (window.gsap) {
            const tl = gsap.timeline({
                defaults: { ease: EASE },
                onComplete: () => {
                    if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
                }
            });

            if (eyebrow) {
                tl.fromTo(eyebrow, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0);
            }

            if (h1) {
                const originalHTML = h1.innerHTML;
                const plainText = h1.textContent;
                tl.fromTo(h1, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.08);
                tl.add(() => scrambleText(h1, plainText, originalHTML, 0), 0.08);
            }

            if (visual) {
                tl.fromTo(visual,
                    { opacity: 0, scale: 0.96, y: 14 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.65 },
                    0.15
                );
            }

            if (desc) {
                tl.fromTo(desc,
                    { opacity: 0, y: 12, clipPath: 'inset(0 100% 0 0)' },
                    { opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.6 },
                    0.22
                );
            }

            if (tags && tags.children.length) {
                tl.fromTo(tags.children,
                    { opacity: 0, scale: 0.9, y: 8 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.3, stagger: 0.04 },
                    0.32
                );
            }

            if (actions) {
                tl.fromTo(actions,
                    { opacity: 0, y: 14 },
                    { opacity: 1, y: 0, duration: 0.45 },
                    0.42
                );
            }
        } else {
            [eyebrow, h1, desc, tags, actions, visual].forEach(forceVisible);
            if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
        }
    }

    /* ── Text scramble ── */
    function scrambleText(el, plainText, originalHTML, delay = 0) {
        const chars = CHARS;
        const words = plainText.split('');
        let iterations = 0;
        const maxIter = plainText.length * 2.5;

        setTimeout(() => {
            const iv = setInterval(() => {
                el.textContent = words
                    .map((char, i) => {
                        if (char === ' ') return ' ';
                        if (i < Math.floor(iterations / 2.5)) return char;
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');

                iterations++;
                if (iterations >= maxIter) {
                    clearInterval(iv);
                    el.innerHTML = originalHTML;
                }
            }, 25);
        }, delay);
    }

    /* ══════════════════════════════════════════════
       3. IDLE FLOAT
    ══════════════════════════════════════════════ */
    function idleFloat() {
        if (!window.gsap || REDUCED) return;

        gsap.to('.floating-badge', {
            y: -10, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut'
        });

        gsap.to('.floating-tag', {
            y: -8, rotate: -2, duration: 2.2, repeat: -1, yoyo: true,
            ease: 'sine.inOut', delay: 0.3
        });

        gsap.to('.hero-img-container', {
            y: -8, duration: 3.4, repeat: -1, yoyo: true, ease: 'sine.inOut'
        });
    }

    /* ══════════════════════════════════════════════
       4. HERO PARALLAX
    ══════════════════════════════════════════════ */
    function heroParallax() {
        if (!window.gsap || !window.ScrollTrigger || REDUCED) return;
        if (!document.querySelector('.hero-visual')) return;

        gsap.to('.hero-visual', {
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
       5. SINGLE REVEAL
    ══════════════════════════════════════════════ */
    function initSingleReveal() {
        const targets = Array.from(document.querySelectorAll('.reveal:not(.active)'));
        if (!targets.length) return;

        const supportsIO = 'IntersectionObserver' in window;

        if (!supportsIO) {
            targets.forEach(el => animateSingle(el));
            return;
        }

        if (!singleObserver) {
            singleObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animateSingle(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, {
                threshold: 0,
                rootMargin: '200px 0px 100px 0px'
            });
        }

        targets.forEach(el => singleObserver.observe(el));
    }

    function animateSingle(el) {
        el.classList.add('active');

        if (window.gsap && !REDUCED) {
            gsap.fromTo(el,
                { opacity: 0, y: 20, clipPath: 'inset(0 0 15% 0)' },
                { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.65, ease: EASE_S }
            );
        } else {
            forceVisible(el);
        }
    }

    /* ══════════════════════════════════════════════
       6. GRID REVEAL
    ══════════════════════════════════════════════ */
    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || !container.children.length) return;

        const previous = gridObservers.get(container);
        if (previous) previous.disconnect();

        const children = Array.from(container.children);
        const supportsIO = 'IntersectionObserver' in window;

        if (!supportsIO) {
            cascade(children);
            if (selector === '#statsRow') animateCounters();
            if (selector === '#timeline') drawTimeline();
            return;
        }

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                cascade(children);
                if (selector === '#statsRow') animateCounters();
                if (selector === '#timeline') drawTimeline();

                obs.disconnect();
                gridObservers.delete(container);
            });
        }, {
            threshold: 0,
            rootMargin: '200px 0px 100px 0px'
        });

        gridObservers.set(container, obs);
        obs.observe(container);
    }

    function cascade(children) {
        if (REDUCED) {
            children.forEach(forceVisible);
            return;
        }

        if (window.gsap) {
            gsap.fromTo(children,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: EASE_S }
            );
        } else {
            children.forEach(forceVisible);
        }
    }

    /* ══════════════════════════════════════════════
       7. STAT COUNTERS
    ══════════════════════════════════════════════ */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;

            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (window.gsap && !REDUCED) {
                const obj = { v: 0 };
                gsap.to(obj, {
                    v: target,
                    duration: 1.4,
                    ease: 'power1.out',
                    onUpdate() {
                        el.textContent = Math.round(obj.v) + suffix;
                    },
                    onComplete() {
                        el.textContent = target + suffix;
                    }
                });
            } else {
                el.textContent = target + suffix;
            }
        });
    }

    /* ══════════════════════════════════════════════
       8. TIMELINE DRAW-IN
    ══════════════════════════════════════════════ */
    function initTimelineDrawIn() {}

    function drawTimeline() {
        const line = document.querySelector('.timeline-line');
        if (!line || REDUCED) return;

        line.style.cssText = 'transform-origin:top;transform:scaleY(0);transition:transform 0.8s cubic-bezier(.16,1,.3,1) .1s;';
        requestAnimationFrame(() => {
            line.style.transform = 'scaleY(1)';
        });
    }

    /* ══════════════════════════════════════════════
       9. MAGNETIC CARD TILT
    ══════════════════════════════════════════════ */
    function initMagneticCards() {
        if (!window.gsap || REDUCED) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

        let active = null;

        const reset = card => gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            duration: 0.6,
            ease: EASE_EL
        });

        document.addEventListener('pointermove', e => {
            const card = e.target.closest('.card:not(.empathy-box)');

            if (card !== active) {
                if (active) reset(active);
                active = card;
            }

            if (!card) return;

            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;

            gsap.to(card, {
                rotateX: py * -5,
                rotateY: px * 5,
                y: -5,
                duration: 0.35,
                ease: EASE_S,
                transformPerspective: 900
            });
        });

        document.addEventListener('mouseout', e => {
            if (!e.relatedTarget && active) {
                reset(active);
                active = null;
            }
        });
    }

    /* ══════════════════════════════════════════════
       10. TRUST BAR
    ══════════════════════════════════════════════ */
    function initTrustBar() {
        const track = document.getElementById('trustTrack');
        if (!track || !track.children.length) return;

        track.style.animation = 'none';
        void track.offsetWidth;

        if (!track.dataset.cloned) {
            const clone = track.innerHTML;
            track.insertAdjacentHTML('beforeend', clone);
            track.dataset.cloned = '1';
        }

        if (REDUCED) return;

        track.style.animation = 'trustScroll 28s linear infinite';

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

})();