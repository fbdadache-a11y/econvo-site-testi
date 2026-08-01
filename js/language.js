/* ==========================================================================
   ECONOVO — language.js  (resilient rewrite)
   - Wraps fetch in try/catch so a 404 or network error never crashes the page
   - stagger-item gets .in class via CSS animation fallback if JS is slow
   - Dispatches econovo:rendered after every successful render
   ========================================================================== */

(function () {
    'use strict';

    // Try multiple path patterns for GitHub Pages compatibility
    function getDataPath(lang) {
        const paths = [
            'data/content-' + lang + '.json',
            './data/content-' + lang + '.json',
        ];
        return paths;
    }

    let cache = {};

    document.addEventListener('DOMContentLoaded', async () => {
        // Mark body as JS-active (cancels the CSS nuclear fallback)
        document.body.classList.add('js-ready');

        const stored = localStorage.getItem('econovo-lang');
        const lang = stored || 'en';

        // Apply theme before any fetch (instant, no flicker)
        applyTheme();

        await setLanguage(lang, false);

        document.querySelectorAll('.js-lang-toggle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const current = document.documentElement.getAttribute('lang') || 'en';
                await setLanguage(current === 'en' ? 'ar' : 'en', true);
            });
        });
    });

    function applyTheme() {
        const stored = localStorage.getItem('econovo-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored || (prefersDark ? 'dark' : 'light');
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
    }

    async function loadContent(lang) {
        if (cache[lang]) return cache[lang];

        const paths = getDataPath(lang);
        let lastErr;

        for (const path of paths) {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                cache[lang] = json;
                return json;
            } catch (e) {
                lastErr = e;
            }
        }

        // All paths failed — return null, caller handles gracefully
        console.warn('[Econovo] Could not load content for lang:', lang, lastErr);
        return null;
    }

    async function setLanguage(lang, animate) {
        const content = await loadContent(lang);
        const root = document.documentElement;

        root.setAttribute('lang', lang);
        root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        document.querySelectorAll('.js-lang-toggle').forEach(b => {
            b.textContent = lang === 'en' ? 'العربية' : 'English';
        });

        if (!content) {
            // Content failed to load: reveal everything so the page isn't blank
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
            document.querySelectorAll('.stagger-item').forEach(el => el.classList.add('in'));
            document.dispatchEvent(new CustomEvent('econovo:rendered'));
            return;
        }

        const doRender = () => {
            if (content.meta) {
                document.title = content.meta.title || document.title;
                setMeta('description', content.meta.description);
            }

            renderStaticText(content);
            renderCollections(content);

            if (window.lucide) window.lucide.createIcons();
            document.dispatchEvent(new CustomEvent('econovo:rendered'));
        };

        if (animate) {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity .2s ease';
            setTimeout(() => {
                doRender();
                document.body.style.opacity = '1';
            }, 200);
        } else {
            doRender();
        }

        localStorage.setItem('econovo-lang', lang);
    }

    function setMeta(name, value) {
        if (!value) return;
        let el = document.querySelector('meta[name="' + name + '"]');
        if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
        el.setAttribute('content', value);
    }

    function get(obj, path) {
        return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
    }

    function renderStaticText(content) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const value = get(content, el.getAttribute('data-i18n'));
            if (value == null) return;
            if (el.hasAttribute('data-i18n-html')) el.innerHTML = value;
            else el.textContent = value;
        });
    }

    function renderCollections(content) {
        safe(() => renderTags('#heroTags', content.hero && content.hero.tags));
        safe(() => renderTrust(content.trust));
        safe(() => renderStats(content.stats));
        safe(() => renderCards('#whyGrid', content.why && content.why.items, 'why-card'));
        safe(() => renderCards('#pillarsGrid', content.pillars && content.pillars.items, 'pillar-card'));
        safe(() => renderTimeline(content.journey && content.journey.steps));
        safe(() => renderTeam(content.team && content.team.members));
        safe(() => renderEvents(content.events && content.events.items));
        safe(() => renderFAQ(content.faq && content.faq.items));
    }

    function safe(fn) { try { fn(); } catch(e) { console.warn('[Econovo] render error', e); } }

    function renderTags(selector, tags) {
        const el = document.querySelector(selector);
        if (!el || !tags) return;
        el.innerHTML = tags.map(t => '<span class="hero-tag">' + t + '</span>').join('');
    }

    function renderTrust(trust) {
        if (!trust) return;
        const label = document.getElementById('trustLabel');
        const track = document.getElementById('trustTrack');
        if (label) label.textContent = trust.label;
        if (!track) return;
        const set = trust.items.map(i => '<span class="trust-item">' + i + '</span><span class="dot mono">&bull;</span>').join('');
        track.innerHTML = set + set;
    }

    function renderStats(stats) {
        const wrap = document.getElementById('statsRow');
        if (!wrap || !stats) return;
        wrap.innerHTML = stats.map(s =>
            '<div class="stat-cell stagger-item">' +
            '<span class="stat-value" data-raw="' + s.value + '">' + s.value + '</span>' +
            '<span class="stat-label">' + s.label + '</span>' +
            '</div>'
        ).join('');
    }

    function renderCards(selector, items, cardClass) {
        const el = document.querySelector(selector);
        if (!el || !items) return;
        el.innerHTML = items.map(item =>
            '<div class="card ' + cardClass + ' stagger-item">' +
            '<div class="icon-tile"><i data-lucide="' + item.icon + '"></i></div>' +
            '<h3>' + item.title + '</h3>' +
            '<p>' + item.desc + '</p>' +
            '</div>'
        ).join('');
    }

    function renderTimeline(steps) {
        const el = document.getElementById('timeline');
        if (!el || !steps) return;
        el.innerHTML = steps.map(s =>
            '<div class="timeline-item stagger-item">' +
            '<div class="timeline-dot"></div>' +
            '<div class="card timeline-content">' +
            '<span class="step-num mono">' + s.num + '</span>' +
            '<h3 class="mb-16">' + s.title + '</h3>' +
            '<p>' + s.desc + '</p>' +
            '</div></div>'
        ).join('');
    }

    function renderTeam(members) {
        const el = document.getElementById('teamGrid');
        if (!el || !members) return;
        el.innerHTML = members.map(m =>
            '<div class="card team-card stagger-item">' +
            '<div class="avatar-circle">' + initials(m.name) + '</div>' +
            '<div class="role">' + m.role + '</div>' +
            '<div class="name">' + m.name + '</div>' +
            '</div>'
        ).join('');
    }

    function initials(name) {
        const w = (name || '').trim().split(/\s+/).filter(Boolean);
        if (!w.length) return '?';
        if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
        return (w[0][0] + w[1][0]).toUpperCase();
    }

    function renderEvents(items) {
        const el = document.getElementById('eventsGrid');
        if (!el || !items) return;
        el.innerHTML = items.map(e =>
            '<div class="card event-card stagger-item">' +
            '<div class="eyebrow"><i data-lucide="' + e.icon + '" style="width:14px;height:14px"></i> ' + e.status + '</div>' +
            '<h3>' + e.title + '</h3>' +
            '<p>' + e.desc + '</p>' +
            '<div class="event-meta"><span>' + e.date + '</span>' +
            '<span class="pill pill-open">' + e.status + '</span></div>' +
            '</div>'
        ).join('');
    }

    function renderFAQ(items) {
        const el = document.getElementById('faqWrapper');
        if (!el || !items) return;
        el.innerHTML = items.map(item =>
            '<div class="faq-item stagger-item">' +
            '<button class="faq-question" type="button"><span>' + item.q + '</span>' +
            '<svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
            '</button>' +
            '<div class="faq-answer"><p>' + item.a + '</p></div>' +
            '</div>'
        ).join('');
        if (window.EconovoFAQ) window.EconovoFAQ.bind();
    }
})();
