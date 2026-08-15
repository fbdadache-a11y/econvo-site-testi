/* ==========================================================================
   ECONOVO — share-editor.js
   Standalone page (pages/share-editor.html). Reads a post handed off via
   sessionStorage['econovo-share-payload'] (written by js/posts.js's
   openShareEditor()), renders a preview card using the EXACT same
   .post-card/.post-header/.reaction-row markup and CSS classes the real
   feed uses (css/posts.css — no duplicated styling), lets the member pick
   a theme / aspect ratio / which parts to show, then rasterizes the frame
   with html2canvas and triggers a PNG download.

   No Supabase calls anywhere in this file — purely client-side.
   ========================================================================== */

(function () {
    'use strict';

    /* ── same 12-theme list as pages/dashboard.html's Profile → Appearance,
       kept in sync manually since this page intentionally doesn't load
       posts.js/dashboard.html's inline script (standalone by design) ── */
    const THEMES = [
        { id: 'light',         name: 'Econovo Light',  swatch: ['#F4F7F2', '#0E2A24', '#8FB8A6'] },
        { id: 'dark',          name: 'Econovo Dark',   swatch: ['#0f0f0f', '#8FB8A6', '#b8d4c8'] },
        { id: 'nord',          name: 'Nord',           swatch: ['#2e3440', '#88c0d0', '#8fbcbb'] },
        { id: 'rosepine',      name: 'Rosé Pine',      swatch: ['#191724', '#ebbcba', '#f6c177'] },
        { id: 'rosepine-dawn', name: 'Rosé Pine Dawn', swatch: ['#faf4ed', '#286983', '#b4637a'] },
        { id: 'catppuccin',    name: 'Catppuccin',     swatch: ['#1e1e2e', '#cba6f7', '#f5c2e7'] },
        { id: 'dracula',       name: 'Dracula',        swatch: ['#282a36', '#bd93f9', '#ff79c6'] },
        { id: 'gruvbox',       name: 'Gruvbox',        swatch: ['#282828', '#d79921', '#fabd2f'] },
        { id: 'solarized',     name: 'Solarized',      swatch: ['#fdf6e3', '#268bd2', '#2aa198'] },
        { id: 'tokyonight',    name: 'Tokyo Night',    swatch: ['#24283b', '#7aa2f7', '#7dcfff'] },
        { id: 'everforest',    name: 'Everforest',     swatch: ['#2d353b', '#a7c080', '#83c092'] },
        { id: 'ayu',           name: 'Ayu Mirage',     swatch: ['#1f2430', '#ffa759', '#ffd173'] },
        { id: 'onedark',       name: 'One Dark',       swatch: ['#282c34', '#61afef', '#56b6c2'] },
    ];

    /* Same 5 reaction icons as js/posts.js's REACTIONS array — kept
       independent (not imported) since this page deliberately doesn't
       load posts.js. Only the icon path is needed here (read-only
       preview, not interactive), so key/icon is enough. */
    const REACTION_ICONS = {
        like:      '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
        helpful:   '<circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-12 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
        smart:     '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        relatable: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
        fire:      '<path d="M12 2c0 0-5.5 5-5.5 10a5.5 5.5 0 0 0 11 0c0-2.5-1.5-5-1.5-5s-1 3-3 4c0 0 1-4-1-9z"/><path d="M10 15c0 1.1.9 2 2 2s2-.9 2-2-2-3-2-3-2 1.9-2 3z"/>',
    };

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>');
    }

    function initials(name) {
        if (!name) return '??';
        return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    function timeAgo(iso) {
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (diff < 60)    return 'just now';
        if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    function toast(msg, type = 'ok') {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.style.background = type === 'ok' ? 'rgba(14,42,36,.92)' : 'rgba(180,50,50,.92)';
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(el._t);
        el._t = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(12px)';
        }, 2600);
    }

    /* ══════════════════════════════════════════════════════════════
       LOAD PAYLOAD
    ══════════════════════════════════════════════════════════════ */
    let PAYLOAD = null;
    try {
        const raw = sessionStorage.getItem('econovo-share-payload');
        if (raw) {
            PAYLOAD = JSON.parse(raw);
            // Clear immediately so re-opening this tab/URL later (bookmark,
            // browser back-forward cache) doesn't silently reuse stale data
            // for a different post.
            sessionStorage.removeItem('econovo-share-payload');
        }
    } catch (e) {
        console.error('share-editor: failed to read payload', e);
    }

    /* ══════════════════════════════════════════════════════════════
       BUILD PREVIEW CARD — real .post-card markup, same classes
       css/posts.css already styles. Only the parts that make sense
       in a static export are included (no comment form, no owner
       menu, no clickable reaction buttons).
    ══════════════════════════════════════════════════════════════ */
    function buildPreviewCard(payload, opts) {
        const card = document.createElement('article');
        card.className = 'post-card';

        const avatarHtml = payload.avatarUrl
            ? `<img src="${payload.avatarUrl}" crossorigin="anonymous" alt=""
                    style="width:100%;height:100%;object-fit:cover;border-radius:50%"
                    onerror="this.remove(); this.parentElement.textContent = '${escHtml(initials(payload.authorName))}';">`
            : escHtml(initials(payload.authorName));

        const timeHtml = opts.showTime
            ? `<span class="post-time">${timeAgo(payload.createdAt)}</span>`
            : '';

        const reactionsHtml = (opts.showReactions && payload.reactions && payload.reactions.length)
            ? `<div class="reaction-row">${payload.reactions.map(r => `
                <button class="reaction-btn active" data-key="${escHtml(r.key)}" tabindex="-1">
                    <svg class="reaction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        ${REACTION_ICONS[r.key] || ''}
                    </svg>
                    <span class="reaction-count">${r.count}</span>
                </button>`).join('')}</div>`
            : '';

        const watermarkHtml = opts.showWatermark ? `
            <div class="export-watermark">
                <div class="export-watermark-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 3 7v6c0 5 4 9 9 9s9-4 9-9V7l-9-5Z"/></svg>
                </div>
                <span class="export-watermark-text">Econovo Club <span class="loc">· Bordj Bou Arreridj</span></span>
            </div>` : '';

        card.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${avatarHtml}</div>
                <div class="post-meta">
                    <span class="post-author">${escHtml(payload.authorName)}</span>
                    ${timeHtml}
                </div>
            </div>
            <p class="post-body md-post-body">${escHtml(payload.content)}</p>
            ${reactionsHtml}
            ${watermarkHtml}
        `;
        return card;
    }

    /* ══════════════════════════════════════════════════════════════
       CONTROLS STATE
    ══════════════════════════════════════════════════════════════ */
    const state = {
        ratio: 'square',
        showReactions: true,
        showTime: true,
        showWatermark: true,
        theme: localStorage.getItem('econovo-share-theme') || 'light',
    };

    function rerenderPreview() {
        const wrap = document.getElementById('previewCardWrap');
        wrap.innerHTML = '';
        wrap.appendChild(buildPreviewCard(PAYLOAD, state));
        if (typeof window.twemoji !== 'undefined') {
            try { window.twemoji.parse(wrap, { folder: 'svg', ext: '.svg', className: 'twemoji-flat' }); } catch (_) {}
        }
    }

    function applyTheme(t) {
        state.theme = t;
        if (t && t !== 'light') document.documentElement.setAttribute('data-theme', t);
        else document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('econovo-share-theme', t);
        document.querySelectorAll('.theme-swatch').forEach(el => {
            el.classList.toggle('selected', el.dataset.theme === t);
        });
        const meta = document.getElementById('themeColorMeta');
        if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#F4F7F2');
    }

    function buildThemeGrid() {
        const grid = document.getElementById('themeGrid');
        grid.innerHTML = THEMES.map(t => `
            <button class="theme-swatch" type="button" data-theme="${t.id}" aria-label="${t.name}">
                <div class="theme-swatch-preview" style="background:${t.swatch[0]}">
                    <span style="background:${t.swatch[1]}"></span>
                    <span style="background:${t.swatch[2]}"></span>
                </div>
                <div class="theme-swatch-name">${t.name}</div>
            </button>
        `).join('');
        grid.querySelectorAll('.theme-swatch').forEach(btn => {
            btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
        });
        applyTheme(state.theme);
    }

    function bindControls() {
        document.querySelectorAll('#ratioSegmented button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#ratioSegmented button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.ratio = btn.dataset.ratio;
                const frame = document.getElementById('exportFrame');
                frame.className = 'ratio-' + state.ratio;
            });
        });

        document.getElementById('toggleReactions').addEventListener('change', (e) => {
            state.showReactions = e.target.checked;
            rerenderPreview();
        });
        document.getElementById('toggleTime').addEventListener('change', (e) => {
            state.showTime = e.target.checked;
            rerenderPreview();
        });
        document.getElementById('toggleWatermark').addEventListener('change', (e) => {
            state.showWatermark = e.target.checked;
            rerenderPreview();
        });

        document.getElementById('btnClose').addEventListener('click', () => window.close());

        document.getElementById('btnDownload').addEventListener('click', downloadImage);
    }

    /* ══════════════════════════════════════════════════════════════
       EXPORT
    ══════════════════════════════════════════════════════════════ */
    async function downloadImage() {
        const btn = document.getElementById('btnDownload');
        if (typeof window.html2canvas !== 'function') {
            toast('Export library is still loading — try again in a moment.', 'err');
            return;
        }
        btn.classList.add('is-busy');
        btn.disabled = true;

        const frame = document.getElementById('exportFrame');
        try {
            const canvas = await window.html2canvas(frame, {
                backgroundColor: getComputedStyle(frame).backgroundColor,
                scale: 2,          // export at 2x for retina-quality PNGs (2026 platform guidance)
                useCORS: true,     // required to read pixel data from Supabase-hosted avatar images
            });
            const link = document.createElement('a');
            link.download = `econovo-post-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast('Image saved — check your downloads.');
        } catch (e) {
            console.error('downloadImage:', e);
            toast('Could not generate image.', 'err');
        } finally {
            btn.classList.remove('is-busy');
            btn.disabled = false;
        }
    }

    /* ══════════════════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
        if (!PAYLOAD) {
            document.querySelector('.preview-pane').innerHTML = `
                <div class="empty-notice">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>No post selected.<br>Open this page from a post's share button.</p>
                </div>`;
            document.getElementById('btnDownload').disabled = true;
            document.querySelectorAll('.controls-pane input, .controls-pane button:not(#btnClose)').forEach(el => el.disabled = true);
            return;
        }

        buildThemeGrid();
        rerenderPreview();
        bindControls();
    });
})();
