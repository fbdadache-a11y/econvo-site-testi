/* ==========================================================================
   ECONOVO — animations.js
   Brand-tuned motion system. Every animation earns its place:
   - Hero: orchestrated entrance (brand first impression)
   - Stat counters: numerical reveal (trust + weight)
   - Grids: staggered cascade (discovery rhythm)
   - Timeline: spine draw + node pop (sequential narrative)
   - Scroll sections: lift + fade (editorial pacing)

   CRITICAL: Never hide elements without a guaranteed show path.
   CSS handles initial hidden state; JS only adds visible state.
   ========================================================================== */

(function () {
    'use strict';

    var SAFETY_MS = 900;
    var safetyTimer = setTimeout(revealAll, SAFETY_MS);

    function revealAll() {
        document.querySelectorAll('.will-reveal').forEach(function(el) {
            el.classList.add('revealed');
        });
        document.querySelectorAll('.reveal, .reveal-fade').forEach(function(el) {
            el.classList.add('active');
        });
        document.querySelectorAll('.timeline-item').forEach(function(el) {
            el.classList.add('in');
        });
        var timeline = document.querySelector('.timeline');
        if (timeline) timeline.classList.add('animate-spine');
    }

    document.addEventListener('DOMContentLoaded', function() {
        clearTimeout(safetyTimer);
        heroEntrance();
        initReveal();
        safetyTimer = setTimeout(revealAll, SAFETY_MS + 500);
    });

    document.addEventListener('econovo:rendered', function() {
        clearTimeout(safetyTimer);
        initReveal();
        observeGrids();
        observeTimeline();
        safetyTimer = setTimeout(revealAll, SAFETY_MS + 500);
    });

    /* ══════════════════════════════════════
       HERO ENTRANCE — orchestrated sequence
       Staggered reveal: rule → eyebrow → h1 → p → tags → actions → visual
       ══════════════════════════════════════ */
    function heroEntrance() {
        var sequence = [
            '.hero-rule',
            '.hero-content .eyebrow',
            '.hero-content h1',
            '.hero-content > p',
            '.hero-content .hero-tags',
            '.hero-content .hero-actions',
            '.hero-visual',
        ];

        var baseDelay = 80;
        var step = 90;

        sequence.forEach(function(sel, i) {
            var el = document.querySelector(sel);
            if (!el) return;

            el.classList.add('will-reveal');

            setTimeout(function() {
                el.classList.add('revealed');
                // Special: animate hero-rule width via class
                if (sel === '.hero-rule') el.classList.add('revealed');
                // Special: trigger em underline draw
                if (sel === '.hero-content h1') {
                    setTimeout(function() {
                        var content = document.querySelector('.hero-content');
                        if (content) content.classList.add('animate-done');
                    }, 400);
                }
            }, baseDelay + (i * step));
        });
    }

    /* ══════════════════════════════════════
       SECTION REVEAL — fade + lift
       ══════════════════════════════════════ */
    function initReveal() {
        var els = document.querySelectorAll('.reveal:not(.active), .reveal-fade:not(.active)');
        if (!('IntersectionObserver' in window)) {
            els.forEach(function(el) { el.classList.add('active'); });
            return;
        }
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.07, rootMargin: '0px 0px -48px 0px' });

        els.forEach(function(el) { obs.observe(el); });
    }

    /* ══════════════════════════════════════
       GRID STAGGER — cascading card entrance
       Each child lifts and fades in with 55ms offset
       ══════════════════════════════════════ */
    var GRIDS = [
        '#statsRow',
        '#whyGrid',
        '#pillarsGrid',
        '#teamGrid',
        '#eventsGrid',
        '#faqWrapper'
    ];

    function observeGrids() {
        GRIDS.forEach(function(sel) {
            var container = document.querySelector(sel);
            if (!container || container.dataset.revealed === 'true' || !container.children.length) return;

            if (!('IntersectionObserver' in window)) {
                animateGrid(container);
                if (sel === '#statsRow') animateCounters();
                return;
            }

            var obs = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (!entry.isIntersecting) return;
                    container.dataset.revealed = 'true';
                    animateGrid(container);
                    if (sel === '#statsRow') setTimeout(animateCounters, 180);
                    obs.disconnect();
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -56px 0px' });

            obs.observe(container);
        });
    }

    function animateGrid(container) {
        var children = Array.from(container.children);
        children.forEach(function(c, i) {
            c.classList.add('will-reveal');
            setTimeout(function() {
                c.classList.add('revealed');
            }, i * 65);
        });
    }

    /* ══════════════════════════════════════
       TIMELINE — spine draw + sequential item entrance
       ══════════════════════════════════════ */
    function observeTimeline() {
        var timeline = document.querySelector('.timeline');
        if (!timeline || timeline.dataset.observed) return;
        timeline.dataset.observed = '1';

        if (!('IntersectionObserver' in window)) {
            timeline.classList.add('animate-spine');
            revealTimelineItems(timeline);
            return;
        }

        // Spine draw trigger
        var spineObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                timeline.classList.add('animate-spine');
                spineObs.disconnect();
            });
        }, { threshold: 0.05 });
        spineObs.observe(timeline);

        // Individual item reveal
        var items = timeline.querySelectorAll('.timeline-item');
        if (!items.length) return;

        var itemObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                itemObs.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        items.forEach(function(item) {
            itemObs.observe(item);
        });
    }

    function revealTimelineItems(timeline) {
        var items = timeline.querySelectorAll('.timeline-item');
        items.forEach(function(item, i) {
            setTimeout(function() { item.classList.add('in'); }, i * 120);
        });
    }

    /* ══════════════════════════════════════
       STAT COUNTERS — eased number roll
       Cubic ease-out: fast start, slow finish (weight of the number)
       ══════════════════════════════════════ */
    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(function(el) {
            var raw   = el.getAttribute('data-raw') || el.textContent;
            var match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;

            var target = parseInt(match[1], 10);
            var suffix = match[2] || '';
            var dur    = 1400;
            var start  = performance.now();

            (function tick(now) {
                var p = Math.min((now - start) / dur, 1);
                // Cubic ease-out
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(eased * target) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            })(start);
        });
    }

})();
