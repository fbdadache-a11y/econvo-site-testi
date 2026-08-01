/* ==========================================================================
   ECONOVO — animations.js  (safe, GitHub Pages compatible)
   CRITICAL FIX: Never hide elements in JS without a guaranteed show path.
   Strategy: CSS handles the initial hidden state via .will-reveal class.
   JS only ADDS the visible state — it never sets opacity:0 on its own.
   ========================================================================== */

(function () {
    'use strict';

    // Safety timeout: if everything else fails, reveal all hidden elements
    var SAFETY_MS = 800;
    var safetyTimer = setTimeout(revealAll, SAFETY_MS);

    function revealAll() {
        document.querySelectorAll('.will-reveal').forEach(function(el) {
            el.classList.add('revealed');
        });
        document.querySelectorAll('.reveal').forEach(function(el) {
            el.classList.add('active');
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        clearTimeout(safetyTimer);
        heroFadeIn();
        initReveal();
        // Re-set safety in case econovo:rendered never fires
        safetyTimer = setTimeout(revealAll, SAFETY_MS + 500);
    });

    document.addEventListener('econovo:rendered', function() {
        clearTimeout(safetyTimer);
        initReveal();
        observeGrids();
    });

    /* ── Hero fade-in: CSS class approach (safer than inline style) ── */
    function heroFadeIn() {
        var selectors = [
            '.hero-content .eyebrow',
            '.hero-content h1',
            '.hero-content p',
            '.hero-content .hero-tags',
            '.hero-content .hero-actions',
            '.hero-visual',
        ];
        var delay = 50;
        selectors.forEach(function(sel) {
            var el = document.querySelector(sel);
            if (!el) return;
            el.classList.add('will-reveal');
            setTimeout(function() {
                el.classList.add('revealed');
            }, delay);
            delay += 80;
        });
    }

    /* ── .reveal sections: IntersectionObserver ── */
    function initReveal() {
        var els = document.querySelectorAll('.reveal:not(.active)');
        if (!('IntersectionObserver' in window)) {
            // Fallback for old browsers
            els.forEach(function(el) { el.classList.add('active'); });
            return;
        }
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        els.forEach(function(el) { obs.observe(el); });
    }

    /* ── Card grids: staggered fade ── */
    var GRIDS = ['#statsRow','#whyGrid','#pillarsGrid','#timeline','#teamGrid','#eventsGrid','#faqWrapper'];

    function observeGrids() {
        GRIDS.forEach(function(sel) {
            var container = document.querySelector(sel);
            if (!container || container.dataset.revealed === 'true' || !container.children.length) return;

            if (!('IntersectionObserver' in window)) {
                // Fallback: show immediately
                animateGrid(container);
                return;
            }
            var obs = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (!entry.isIntersecting) return;
                    container.dataset.revealed = 'true';
                    animateGrid(container);
                    if (sel === '#statsRow') animateCounters();
                    obs.disconnect();
                });
            }, { threshold: 0.06, rootMargin: '0px 0px -48px 0px' });
            obs.observe(container);
        });
    }

    function animateGrid(container) {
        var children = Array.from(container.children);
        children.forEach(function(c, i) {
            c.classList.add('will-reveal');
            setTimeout(function() {
                c.classList.add('revealed');
            }, i * 60);
        });
    }

    /* ── Stat counters ── */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(function(el) {
            var raw   = el.getAttribute('data-raw') || el.textContent;
            var match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;
            var target = parseInt(match[1], 10);
            var suffix = match[2] || '';
            var start  = performance.now();
            var dur    = 1100;
            (function tick(now) {
                var p = Math.min((now - start) / dur, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(eased * target) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            })(start);
        });
    }
})();
