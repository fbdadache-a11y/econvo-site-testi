/* ==========================================================================
   ECONOVO — animations.js
   One orchestrated hero entrance + a subtle scroll parallax (GSAP), a single
   fade-in for standalone sections (IntersectionObserver), and a batched
   stagger reveal for every JS-rendered card grid — each grid animates in
   as one cascade instead of card-by-card randomness. Stats count up once,
   the first time the row is visible. Everything degrades gracefully if
   GSAP fails to load (e.g. offline) via plain CSS transitions.
   ========================================================================== */

(function () {
    'use strict';

    const GRID_SELECTORS = ['#statsRow', '#whyGrid', '#pillarsGrid', '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'];
    let singleObserver;

    document.addEventListener('DOMContentLoaded', () => {
        if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        heroEntrance();
        idleFloat();
        heroParallax();
        initSingleReveal();
    });

    // Grids are empty until language.js fetches JSON and renders them
    document.addEventListener('econovo:rendered', () => {
        GRID_SELECTORS.forEach(sel => revealGrid(sel));
        initSingleReveal();
    });

    /* ---------------- Hero ---------------- */

    function heroEntrance() {
        const items = [
            '.hero-content .eyebrow',
            '.hero-content h1',
            '.hero-content p',
            '.hero-content .hero-tags',
            '.hero-content .hero-actions',
            '.hero-visual'
        ].map(sel => document.querySelector(sel)).filter(Boolean);
        if (!items.length) return;

        if (window.gsap) {
            gsap.set(items, { opacity: 0, y: 24 });
            gsap.to(items, { opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power3.out', delay: .15 });
        } else {
            items.forEach((el, i) => {
                el.style.transition = `opacity .6s ease ${i * .1}s, transform .6s ease ${i * .1}s`;
                requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
            });
        }
    }

    function idleFloat() {
        if (!window.gsap) return;
        gsap.to('.floating-badge', { y: -10, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.floating-tag', { y: -8, rotate: -2, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: .3 });
        gsap.to('.hero-img-container', { y: -8, duration: 3.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }

    // A small, restrained parallax on the whole visual column — not the
    // same element as the idle float above, so the two transforms don't fight.
    function heroParallax() {
        if (!window.gsap || !window.ScrollTrigger || !document.querySelector('.hero-visual')) return;
        gsap.to('.hero-visual', {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    /* ---------------- Single-element fade-in (.reveal sections) ---------------- */

    function initSingleReveal() {
        if (!singleObserver) {
            singleObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animateSingle(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
        }
        document.querySelectorAll('.reveal:not(.active)').forEach(el => singleObserver.observe(el));
    }

    function animateSingle(el) {
        el.classList.add('active');
        if (window.gsap) gsap.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' });
    }

    /* ---------------- Batched grid stagger ---------------- */

    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || container.dataset.revealed === 'true' || !container.children.length) return;

        const children = Array.from(container.children);
        if (window.gsap) gsap.set(children, { opacity: 0, y: 26 });
        else children.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(26px)'; });

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                container.dataset.revealed = 'true';
                castCascade(children);
                if (selector === '#statsRow') animateCounters();
                obs.disconnect();
            });
        }, { threshold: .1, rootMargin: '0px 0px -80px 0px' });

        obs.observe(container);
    }

    function castCascade(children) {
        if (window.gsap) {
            gsap.to(children, { opacity: 1, y: 0, duration: .6, stagger: .08, ease: 'power2.out' });
        } else {
            children.forEach((c, i) => {
                c.style.transition = `opacity .5s ease ${i * .06}s, transform .5s ease ${i * .06}s`;
                requestAnimationFrame(() => { c.style.opacity = '1'; c.style.transform = 'none'; });
            });
        }
    }

    /* ---------------- Stat counters (ledger-style count up) ---------------- */

    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/); // leading digits + optional suffix ("%", etc). Skips "∞".
            if (!match) return;
            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (window.gsap) {
                const counter = { val: 0 };
                gsap.to(counter, {
                    val: target, duration: 1.3, ease: 'power1.out',
                    onUpdate: () => { el.textContent = Math.round(counter.val) + suffix; },
                    onComplete: () => { el.textContent = target + suffix; }
                });
            } else {
                el.textContent = target + suffix;
            }
        });
    }
})();
