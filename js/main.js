/* ==========================================================================
   ECONOVO — main.js  v2.0
   Navbar state, mobile menu, dark mode toggle, footer year, auth session sync.
   ========================================================================== */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        initYear();
        initNavbarScroll();
        initScrollProgress();
        initMobileMenu();
        initThemeToggle();
        await initAuthCheck();   // async — waits for silent token refresh if needed
        if (window.lucide) window.lucide.createIcons();
    });

    function initYear() {
        const el = document.getElementById('currentYear');
        if (el) el.textContent = new Date().getFullYear();
    }

    // --------------------------------------------------------------------------
    // Auth Session Sync
    // Uses Auth.ensureSession() which handles token refresh automatically.
    // If the access_token is expired but refresh_token is valid, it silently
    // gets a new access_token before deciding the user's login state.
    // --------------------------------------------------------------------------
    async function initAuthCheck() {
        const Auth = window.EconovoAuth;
        if (!Auth) return;

        const isValid = await Auth.ensureSession();

        if (!isValid) return; // not logged in or session dead

        // Session is valid — update nav buttons
        const joinBtns = document.querySelectorAll('#nav-join-btn, .btn-join');
        joinBtns.forEach(btn => {
            btn.textContent = 'Dashboard';
            btn.setAttribute('href', 'dashboard.html');
        });
    }

    function initNavbarScroll() {
        const nav = document.getElementById('navbar');
        if (!nav) return;
        const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function initScrollProgress() {
        const bar = document.getElementById('scrollProgress');
        if (!bar) return;
        let ticking = false;
        const update = () => {
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - doc.clientHeight;
            const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
            bar.style.width = pct + '%';
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        update();
    }

    function initMobileMenu() {
        const openBtn  = document.getElementById('navToggle');
        const closeBtn = document.getElementById('mobileMenuClose');
        const menu     = document.getElementById('mobileMenu');
        const overlay  = document.getElementById('mobileMenuOverlay');
        if (!openBtn || !menu || !overlay) return;

        const open  = () => { menu.classList.add('open');    overlay.classList.add('open');    document.body.style.overflow = 'hidden'; };
        const close = () => { menu.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };

        openBtn.addEventListener('click', open);
        closeBtn && closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', close);
        menu.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', close));
    }

    function initThemeToggle() {
        const btns        = document.querySelectorAll('.js-theme-toggle');
        const root        = document.documentElement;
        const stored      = localStorage.getItem('econovo-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(stored || (prefersDark ? 'dark' : 'light'));

        if (!btns.length) return;
        btns.forEach(btn => btn.addEventListener('click', () => {
            // The toggle button is a simple light/dark switch — it only
            // ever lands on those two. Members who picked one of the 12
            // named palettes (Nord, Dracula, ...) do so from the
            // Dashboard's Profile → Appearance grid, not from here.
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('econovo-theme', next);
        }));

        function applyTheme(theme) {
            // Any non-"light" theme — dark, or one of the 12 named
            // palettes from themes.css — needs the attribute set so its
            // [data-theme="…"] block in themes.css/style.css applies.
            // Only bare "light" (or nothing) means "no attribute".
            if (theme && theme !== 'light') root.setAttribute('data-theme', theme);
            else root.removeAttribute('data-theme');
            document.querySelectorAll('.js-theme-icon').forEach(icon => {
                icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            });
            if (window.lucide) window.lucide.createIcons();
            const meta = document.getElementById('themeColorMeta');
            if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || (theme === 'dark' ? '#1F1F1F' : '#F4F7F2'));
        }
    }
})();
