/* ==========================================================================
   ECONOVO — animations.js  (Anthropic-style: calm, purposeful)
   Hero fades in on load. Sections and card grids fade in on scroll.
   No floating, no bounce, no translateY cascades.
   Stats count up once — the only "active" animation, kept because it
   communicates real data rather than just decorating space.
   ========================================================================== */

(function () {
    'use strict';

    const GRID_SELECTORS = ['#statsRow','#whyGrid','#pillarsGrid','#timeline','#teamGrid','#eventsGrid','#faqWrapper'];
    let revealObserver;

    document.addEventListener('DOMContentLoaded', () => {
        heroFadeIn();
        initReveal();
    });

    // Grids rendered by language.js after DOMContentLoaded
    document.addEventListener('econovo:rendered', () => {
        GRID_SELECTORS.forEach(observeGrid);
        initReveal(); // re-observe any new .reveal elements
    });

    /* ── Hero: simple staggered opacity only ── */
    function heroFadeIn() {
        const items = [
            '.hero-content .eyebrow',
            '.hero-content h1',
            '.hero-content p',
            '.hero-content .hero-tags',
            '.hero-content .hero-actions',
            '.hero-visual',
        ].map(s => document.querySelector(s)).filter(Boolean);

        items.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transition = `opacity .55s ease ${i * .08 + .05}s`;
            // requestAnimationFrame lets the browser paint the hidden state first
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.style.opacity = '1';
            }));
        });
    }

    /* ── .reveal sections: fade in on scroll ── */
    function initReveal() {
        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                });
            }, { threshold: .1, rootMargin: '0px 0px -48px 0px' });
        }
        document.querySelectorAll('.reveal:not(.active)').forEach(el => revealObserver.observe(el));
    }

    /* ── Card grids: staggered fade in ── */
    function observeGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || container.dataset.revealed === 'true' || !container.children.length) return;

        const children = Array.from(container.children);
        children.forEach(c => { c.style.opacity = '0'; });

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                container.dataset.revealed = 'true';
                children.forEach((c, i) => {
                    c.style.transition = `opacity .4s ease ${i * .06}s`;
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        c.style.opacity = '1';
                    }));
                });
                if (selector === '#statsRow') animateCounters();
                obs.disconnect();
            });
        }, { threshold: .08, rootMargin: '0px 0px -60px 0px' });

        obs.observe(container);
    }

    /* ── Stat counters ── */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw   = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;
            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';
            const start  = performance.now();
            const dur    = 1200;
            (function tick(now) {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
                el.textContent = Math.round(eased * target) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            })(start);
        });
    }
})();
