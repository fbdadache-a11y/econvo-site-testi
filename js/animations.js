/* ==========================================================================
   ECONOVO — animations.js  v3.0
   Design language: editorial precision meets kinetic energy.
   Brand book: Obsidian #0E2A24 · Silver Sage #8FB8A6 · Chalk #F4F7F2

   Signature moves:
   1. Hero headline text-scramble / character reveal (the centrepiece)
   2. Cursor-tracking sage glow in the hero field
   3. Clip-path wipe reveals for sections (not just fade+lift)
   4. Magnetic card tilt with spring physics
   5. Stat counters with number-slot animation
   6. Timeline draw-in line
   7. Trust bar auto-scroller (refined)
   8. Floating badge parallax
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
        '#statsRow','#whyGrid','#pillarsGrid',
        '#timeline','#teamGrid','#eventsGrid','#faqWrapper'
    ];

    let singleObserver;
    const gridObservers = new WeakMap();

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', () => {
        if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        initCursorGlow();
        heroEntrance();
        idleFloat();
        heroParallax();
        initSingleReveal();
        initMagneticCards();
        initTimelineDrawIn();
        initTrustBar();
        body.classList.add('js-ready');
    });

    document.addEventListener('econovo:rendered', () => {
        GRID_SELECTORS.forEach(sel => revealGrid(sel));
        initSingleReveal();
        initTimelineDrawIn();
        initTrustBar();
    });

    const body = document.body;

    /* ══════════════════════════════════════════════
       1. CURSOR GLOW — sage radial follows pointer
    ══════════════════════════════════════════════ */
    function initCursorGlow() {
        const hero = document.querySelector('.hero');
        if (!hero || REDUCED) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

        const glow = document.createElement('div');
        glow.className = 'hero-cursor-glow';
        hero.appendChild(glow);

        let raf, mx = -999, my = -999;
        hero.addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
            if (!raf) raf = requestAnimationFrame(tick);
        });
        hero.addEventListener('pointerleave', () => {
            gsap && gsap.to(glow, { opacity: 0, duration: .6, ease: EASE_S });
        });
        hero.addEventListener('pointerenter', () => {
            gsap && gsap.to(glow, { opacity: 1, duration: .4, ease: EASE_S });
        });

        function tick() {
            raf = null;
            const rect = hero.getBoundingClientRect();
            const x = mx - rect.left, y = my - rect.top;
            glow.style.transform = `translate(${x - 200}px, ${y - 200}px)`;
        }
    }

    /* ══════════════════════════════════════════════
       2. HERO ENTRANCE — scramble headline + clip reveals
    ══════════════════════════════════════════════ */
    function heroEntrance() {
        const rule    = document.querySelector('.hero-rule');
        const eyebrow = document.querySelector('.hero-content .eyebrow');
        const h1      = document.querySelector('.hero-content h1');
        const desc    = document.querySelector('.hero-content > p');
        const tags    = document.querySelector('.hero-tags');
        const actions = document.querySelector('.hero-actions');
        const visual  = document.querySelector('.hero-visual');

        /* Rule grows first */
        if (rule) {
            setTimeout(() => rule.classList.add('revealed'), 200);
        }

        if (REDUCED) {
            [eyebrow, h1, desc, tags, actions, visual].forEach(el => {
                if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
            });
            if (h1) h1.closest('.hero-content')?.classList.add('animate-done');
            return;
        }

        /* Eyebrow slides in */
        if (eyebrow) {
            eyebrow.style.cssText = 'opacity:0;transform:translateY(12px)';
            setTimeout(() => {
                eyebrow.style.transition = `opacity .6s ${EASE}, transform .6s ${EASE}`;
                eyebrow.style.opacity = '1';
                eyebrow.style.transform = 'none';
            }, 300);
        }

        /* H1 text scramble */
        if (h1) {
            const originalHTML = h1.innerHTML;
            const plainText    = h1.textContent;
            h1.style.opacity   = '1'; // keep visible, scramble chars
            scrambleText(h1, plainText, originalHTML, 500);
        }

        /* Desc clip-path wipe from left */
        if (desc) {
            desc.style.cssText = 'clip-path:inset(0 100% 0 0);opacity:1;';
            setTimeout(() => {
                desc.style.transition = `clip-path .75s ${EASE}`;
                desc.style.clipPath   = 'inset(0 0% 0 0)';
            }, 900);
        }

        /* Tags pop in one by one */
        if (tags) {
            Array.from(tags.children).forEach((tag, i) => {
                tag.style.cssText = 'opacity:0;transform:scale(.88) translateY(6px)';
                setTimeout(() => {
                    tag.style.transition = `opacity .4s ${EASE}, transform .45s ${EASE}`;
                    tag.style.opacity    = '1';
                    tag.style.transform  = 'none';
                }, 1100 + i * 80);
            });
        }

        /* Actions slide up */
        if (actions) {
            actions.style.cssText = 'opacity:0;transform:translateY(16px)';
            setTimeout(() => {
                actions.style.transition = `opacity .5s ${EASE}, transform .5s ${EASE}`;
                actions.style.opacity    = '1';
                actions.style.transform  = 'none';
            }, 1350);
        }

        /* Hero visual — scale in from slightly small */
        if (visual) {
            visual.style.cssText = 'opacity:0;transform:scale(.96) translateY(14px)';
            setTimeout(() => {
                visual.style.transition = `opacity .8s ${EASE}, transform .9s ${EASE}`;
                visual.style.opacity    = '1';
                visual.style.transform  = 'none';
            }, 350);
            /* Em underline triggers after visual settles */
            setTimeout(() => {
                h1 && h1.closest('.hero-content')?.classList.add('animate-done');
            }, 1200);
        }
    }

    /* ── Text scramble ── */
    function scrambleText(el, plainText, originalHTML, delay = 0) {
        const chars = CHARS;
        const words = plainText.split('');
        let frame = 0, iterations = 0;
        const maxIter = plainText.length * 3;

        setTimeout(() => {
            const iv = setInterval(() => {
                el.textContent = words
                    .map((char, i) => {
                        if (char === ' ') return ' ';
                        if (i < Math.floor(iterations / 3)) return char;
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');

                iterations++;
                if (iterations >= maxIter) {
                    clearInterval(iv);
                    el.innerHTML = originalHTML; // restore em/spans
                }
            }, 28);
        }, delay);
    }

    /* ══════════════════════════════════════════════
       3. IDLE FLOAT — hero visual badges
    ══════════════════════════════════════════════ */
    function idleFloat() {
        if (!window.gsap || REDUCED) return;
        gsap.to('.floating-badge', {
            y: -10, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut'
        });
        gsap.to('.floating-tag', {
            y: -8, rotate: -2, duration: 2.2, repeat: -1, yoyo: true,
            ease: 'sine.inOut', delay: .3
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
       5. SINGLE REVEAL — clip-path wipe (not just fade)
    ══════════════════════════════════════════════ */
    function initSingleReveal() {
        if (!singleObserver) {
            singleObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animateSingle(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, { threshold: .1, rootMargin: '0px 0px -50px 0px' });
        }
        document.querySelectorAll('.reveal:not(.active)').forEach(el => singleObserver.observe(el));
    }

    function animateSingle(el) {
        el.classList.add('active');
        if (window.gsap && !REDUCED) {
            gsap.fromTo(el,
                { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' },
                { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: .75, ease: EASE_S }
            );
        }
    }

    /* ══════════════════════════════════════════════
       6. BATCHED GRID STAGGER
    ══════════════════════════════════════════════ */
    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || !container.children.length) return;

        const previous = gridObservers.get(container);
        if (previous) previous.disconnect();

        const children = Array.from(container.children);

        if (!REDUCED) {
            if (window.gsap) {
                gsap.set(children, { opacity: 0, y: 32, scale: .97 });
            } else {
                children.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(32px)'; });
            }
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
        }, { threshold: .08, rootMargin: '0px 0px -60px 0px' });

        gridObservers.set(container, obs);
        obs.observe(container);
    }

    function cascade(children) {
        if (REDUCED) {
            children.forEach(c => { c.style.opacity='1'; c.style.transform='none'; });
            return;
        }
        if (window.gsap) {
            gsap.to(children, {
                opacity: 1, y: 0, scale: 1,
                duration: .65, stagger: .07,
                ease: EASE_S
            });
        } else {
            const easeOut = 'cubic-bezier(.16,1,.3,1)';
            children.forEach((c, i) => {
                c.style.transition = `opacity .5s ${easeOut} ${i*.07}s, transform .55s ${easeOut} ${i*.07}s`;
                requestAnimationFrame(() => { c.style.opacity='1'; c.style.transform='none'; });
            });
        }
    }

    /* ══════════════════════════════════════════════
       7. STAT COUNTERS — number slot machine effect
    ══════════════════════════════════════════════ */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw   = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;
            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (window.gsap && !REDUCED) {
                const obj = { v: 0 };
                gsap.to(obj, {
                    v: target, duration: 1.6, ease: 'power1.out',
                    onUpdate() { el.textContent = Math.round(obj.v) + suffix; },
                    onComplete() { el.textContent = target + suffix; }
                });
            } else {
                el.textContent = target + suffix;
            }
        });
    }

    /* ══════════════════════════════════════════════
       8. TIMELINE DRAW-IN LINE
    ══════════════════════════════════════════════ */
    function initTimelineDrawIn() {
        /* Handled inside revealGrid for #timeline */
    }

    function drawTimeline() {
        const line = document.querySelector('.timeline-line');
        if (!line || REDUCED) return;
        line.style.cssText = 'transform-origin:top;transform:scaleY(0);transition:transform 1s cubic-bezier(.16,1,.3,1) .2s;';
        requestAnimationFrame(() => { line.style.transform = 'scaleY(1)'; });
    }

    /* ══════════════════════════════════════════════
       9. MAGNETIC CARD TILT
    ══════════════════════════════════════════════ */
    function initMagneticCards() {
        if (!window.gsap || REDUCED) return;
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

        let active = null;
        const reset = card => gsap.to(card, {
            rotateX: 0, rotateY: 0, y: 0,
            duration: .6, ease: EASE_EL
        });

        document.addEventListener('pointermove', e => {
            const card = e.target.closest('.card:not(.empathy-box)');
            if (card !== active) {
                if (active) reset(active);
                active = card;
            }
            if (!card) return;
            const r  = card.getBoundingClientRect();
            const px = (e.clientX - r.left)  / r.width  - .5;
            const py = (e.clientY - r.top)   / r.height - .5;
            gsap.to(card, {
                rotateX: py * -5, rotateY: px * 5, y: -5,
                duration: .35, ease: EASE_S, transformPerspective: 900
            });
        });

        document.addEventListener('mouseout', e => {
            if (!e.relatedTarget && active) { reset(active); active = null; }
        });
    }

    /* ══════════════════════════════════════════════
       10. TRUST BAR — smooth infinite scroll
    ══════════════════════════════════════════════ */
    function initTrustBar() {
        const track = document.getElementById('trustTrack');
        if (!track || !track.children.length) return;

        /* Stop any existing animation */
        track.style.animation = 'none';
        void track.offsetWidth;

        /* Clone once for seamless loop */
        if (!track.dataset.cloned) {
            const clone = track.innerHTML;
            track.insertAdjacentHTML('beforeend', clone);
            track.dataset.cloned = '1';
        }

        if (REDUCED) return;
        track.style.animation = 'trustScroll 28s linear infinite';

        track.addEventListener('mouseenter', () => {
            track.style.animationPlayState = 'paused';
        });
        track.addEventListener('mouseleave', () => {
            track.style.animationPlayState = 'running';
        });
    }

})();
