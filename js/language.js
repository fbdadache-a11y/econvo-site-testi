/* ==========================================================================
   ECONOVO — language.js
   Loads /data/content-{lang}.json and renders every piece of text on the
   page. Editing the club's copy never requires touching HTML: edit the
   JSON files instead.
   ========================================================================== */

(function () {
    'use strict';

    const DATA_PATH = { en: 'data/content-en.json', ar: 'data/content-ar.json' };
    let cache = {};

    document.addEventListener('DOMContentLoaded', async () => {
        const stored = localStorage.getItem('econovo-lang');
        const lang = stored || 'en';
        await setLanguage(lang, /*animate*/ false);

        document.querySelectorAll('.js-lang-toggle').forEach(btn => btn.addEventListener('click', async () => {
            const current = document.documentElement.getAttribute('lang') || 'en';
            await setLanguage(current === 'en' ? 'ar' : 'en', true);
        }));
    });

    async function loadContent(lang) {
        if (cache[lang]) return cache[lang];
        const res = await fetch(DATA_PATH[lang]);
        const json = await res.json();
        cache[lang] = json;
        return json;
    }

    async function setLanguage(lang, animate) {
        const content = await loadContent(lang);
        const root = document.documentElement;

        root.setAttribute('lang', lang);
        root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        document.title = content.meta.title;
        setMeta('description', content.meta.description);
        setMeta('keywords', content.meta.keywords);
        setMeta('og:title', content.meta.title, true);
        setMeta('og:description', content.meta.description, true);

        document.querySelectorAll('.js-lang-toggle').forEach(langBtn => {
            langBtn.textContent = lang === 'en' ? 'العربية' : 'English';
        });

        const doRender = () => {
            renderStaticText(content);
            renderCollections(content);
            if (window.lucide) window.lucide.createIcons();
            document.dispatchEvent(new CustomEvent('econovo:rendered'));
        };

        if (animate) {
            document.body.style.opacity = '0';
            setTimeout(() => { doRender(); document.body.style.opacity = '1'; }, 220);
        } else {
            doRender();
        }

        localStorage.setItem('econovo-lang', lang);
    }

    function setMeta(name, value, isProperty) {
        const attr = isProperty ? 'property' : 'name';
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', value);
    }

    /* Simple key path lookup: "hero.title" -> content.hero.title */
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
        renderTags('#heroTags', content.hero.tags);
        renderTrust(content.trust);
        renderStats(content.stats);
        renderCards('#whyGrid', content.why.items, 'why-card');
        renderCards('#pillarsGrid', content.pillars.items, 'pillar-card');
        renderTimeline(content.journey.steps);
        renderTeam(content.team.members);
        renderEvents(content.events.items);
        renderFAQ(content.faq.items);
    }

    function renderTags(selector, tags) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.innerHTML = tags.map(t => `<span class="hero-tag">${t}</span>`).join('');
    }

    function renderTrust(trust) {
        const label = document.getElementById('trustLabel');
        const track = document.getElementById('trustTrack');
        if (label) label.textContent = trust.label;
        if (!track) return;
        const set = trust.items.map(i => `<span class="trust-item">${i}</span><span class="dot mono">&bull;</span>`).join('');
        track.innerHTML = set + set; // duplicated so translateX(-50%) loops seamlessly
    }

    function renderStats(stats) {
        const wrap = document.getElementById('statsRow');
        if (!wrap) return;
        wrap.innerHTML = stats.map(s => `
            <div class="stat-cell stagger-item">
                <span class="stat-value" data-raw="${s.value}">${s.value}</span>
                <span class="stat-label">${s.label}</span>
            </div>`).join('');
    }

    function renderCards(selector, items, cardClass) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.innerHTML = items.map((item) => `
            <div class="card ${cardClass} stagger-item">
                <div class="icon-tile"><i data-lucide="${item.icon}"></i></div>
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
            </div>`).join('');
    }

    function renderTimeline(steps) {
        const el = document.getElementById('timeline');
        if (!el) return;
        el.innerHTML = steps.map(s => `
            <div class="timeline-item stagger-item">
                <div class="timeline-dot"></div>
                <div class="card timeline-content">
                    <span class="step-num mono">${s.num}</span>
                    <h3 class="mb-16">${s.title}</h3>
                    <p>${s.desc}</p>
                </div>
            </div>`).join('');
    }

    function renderTeam(members) {
        const el = document.getElementById('teamGrid');
        if (!el) return;
        el.innerHTML = members.map((m) => `
            <div class="card team-card stagger-item">
                <div class="avatar-circle">${initials(m.name)}</div>
                <div class="role">${m.role}</div>
                <div class="name">${m.name}</div>
            </div>`).join('');
    }

    function initials(name) {
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '?';
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    function renderEvents(items) {
        const el = document.getElementById('eventsGrid');
        if (!el) return;
        el.innerHTML = items.map((e) => `
            <div class="card event-card stagger-item">
                <div class="eyebrow"><i data-lucide="${e.icon}" style="width:14px;height:14px"></i> ${e.status}</div>
                <h3>${e.title}</h3>
                <p>${e.desc}</p>
                <div class="event-meta">
                    <span>${e.date}</span>
                    <span class="pill pill-open">${e.status}</span>
                </div>
            </div>`).join('');
    }

    function renderFAQ(items) {
        const el = document.getElementById('faqWrapper');
        if (!el) return;
        el.innerHTML = items.map(item => `
            <div class="faq-item stagger-item">
                <button class="faq-question" type="button">
                    <span>${item.q}</span>
                    <svg class="faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div class="faq-answer"><p>${item.a}</p></div>
            </div>`).join('');
        if (window.EconovoFAQ) window.EconovoFAQ.bind();
    }
})();
