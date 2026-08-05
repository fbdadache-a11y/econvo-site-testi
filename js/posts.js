/* ==========================================================================
   ECONOVO — posts.js  (v5 — edit post + threaded replies + link previews
                             + group image/reaction parity)
   ========================================================================== */

'use strict';

const POSTS_URL     = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY     = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET        = 'post-images';
const GROUP_BUCKET  = 'group-post-images';
const AVATAR_BUCKET = 'avatars';
const MAX_IMAGES    = 50;

/* ══════════════════════════════════════════════════════════════
   REACTIONS — Lucide SVG icons
   ══════════════════════════════════════════════════════════════ */
const REACTIONS = [
    {
        key:   'like',
        label: 'Like',
        icon:  '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
    },
    {
        key:   'helpful',
        label: 'Haha',
        icon:  '<circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-12 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    },
    {
        key:   'smart',
        label: 'Love',
        icon:  '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    },
    {
        key:   'relatable',
        label: 'Relatable',
        icon:  '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    },
    {
        key:   'fire',
        label: 'Fire',
        icon:  '<path d="M12 2c0 0-5.5 5-5.5 10a5.5 5.5 0 0 0 11 0c0-2.5-1.5-5-1.5-5s-1 3-3 4c0 0 1-4-1-9z"/><path d="M10 15c0 1.1.9 2 2 2s2-.9 2-2-2-3-2-3-2 1.9-2 3z"/>',
    },
];

/* ── REST helpers ── */
function authHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
        'Prefer': 'return=representation',
    };
}
function storageHeaders(token) {
    return { 'apikey': POSTS_KEY, 'Authorization': 'Bearer ' + (token || POSTS_KEY) };
}
async function pgGet(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
async function pgPost(path, body, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'POST', headers: authHeaders(token), body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
async function pgPatch(path, body, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
async function pgDelete(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'DELETE', headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) throw new Error(await r.text());
}

/* ── Storage ── */
async function uploadImage(file, token, bucket) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `public/${name}`;
    const r = await fetch(`${POSTS_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: { ...storageHeaders(token), 'Content-Type': file.type || 'image/jpeg', 'Cache-Control': 'max-age=3600' },
        body: file,
    });
    if (!r.ok) throw new Error('Upload failed: ' + await r.text());
    return `${POSTS_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/* ── Helpers ── */
function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(name) {
    if (!name) return '??';
    return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>');
}

function toast(msg, type = 'ok') {
    let el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;max-width:340px;text-align:center';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'ok' ? 'rgba(14,42,36,.92)' : 'rgba(180,50,50,.92)';
    el.style.color = '#fff';
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3200);
}

/* ── Avatar helper ── */
function makeAvatar(avatarUrl, name, className) {
    const wrap = document.createElement('div');
    wrap.className = className || 'post-avatar';
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = name || 'avatar';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
        img.onerror = () => { img.remove(); wrap.textContent = initials(name); };
        wrap.appendChild(img);
    } else {
        wrap.textContent = initials(name);
    }
    return wrap;
}

/* ── Image gallery ── */
function renderImageGallery(images) {
    if (!images || !images.length) return '';
    const count = images.length;
    const cls   = count === 1 ? 'gallery-single' : count === 2 ? 'gallery-two' : count === 3 ? 'gallery-three' : 'gallery-four';
    const imgs  = images.map((url, i) =>
        `<div class="gallery-cell" data-index="${i}">
            <img src="${escHtml(url)}" alt="Post image ${i+1}" class="gallery-img" loading="lazy">
            ${i === 3 && count > 4 ? `<div class="gallery-more-overlay">+${count - 4}</div>` : ''}
         </div>`
    ).slice(0, 4).join('');
    return `<div class="post-gallery ${cls}" data-images='${JSON.stringify(images)}'>${imgs}</div>`;
}

/* ══════════════════════════════════════════════════════════════
   LINK PREVIEW
   ══════════════════════════════════════════════════════════════ */

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;

function extractFirstUrl(text) {
    if (!text) return null;
    const m = text.match(URL_REGEX);
    return m ? m[0] : null;
}

/* Fetch OG metadata via allorigins proxy (no server needed) */
async function fetchLinkPreview(url) {
    // Check Supabase cache first
    try {
        const rows = await pgGet(`link_previews?url=eq.${encodeURIComponent(url)}&select=title,description,image,site_name`, null);
        if (rows.length && rows[0].title) return rows[0];
    } catch(_) {}

    // Fetch via allorigins proxy
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const r = await fetch(proxyUrl);
        if (!r.ok) return null;
        const data = await r.json();
        const html = data.contents || '';

        const getMeta = (prop) => {
            const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
            const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i');
            return (html.match(re) || html.match(re2) || [])[1] || null;
        };
        const getTitle = () => {
            const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            return m ? m[1].trim() : null;
        };

        const preview = {
            title:       getMeta('og:title') || getMeta('twitter:title') || getTitle(),
            description: getMeta('og:description') || getMeta('twitter:description') || getMeta('description'),
            image:       getMeta('og:image') || getMeta('twitter:image'),
            site_name:   getMeta('og:site_name') || new URL(url).hostname.replace('www.',''),
        };

        if (preview.title) {
            // Cache in Supabase (best-effort, no token needed for INSERT with RLS anon)
            try {
                await fetch(POSTS_URL + '/rest/v1/link_previews', {
                    method: 'POST',
                    headers: { ...authHeaders(null), 'Prefer': 'resolution=merge-duplicates' },
                    body: JSON.stringify({ url, ...preview, fetched_at: new Date().toISOString() }),
                });
            } catch(_) {}
        }
        return preview;
    } catch(_) {
        return null;
    }
}

function renderLinkPreview(preview, url) {
    if (!preview || !preview.title) return '';
    const hostname = (() => { try { return new URL(url).hostname.replace('www.',''); } catch(_){ return ''; } })();
    return `
        <a class="link-preview-card" href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">
            ${preview.image ? `<div class="lp-img-wrap"><img class="lp-img" src="${escHtml(preview.image)}" alt="" loading="lazy" onerror="this.closest('.lp-img-wrap').remove()"></div>` : ''}
            <div class="lp-body">
                <div class="lp-site">${escHtml(preview.site_name || hostname)}</div>
                <div class="lp-title">${escHtml(preview.title)}</div>
                ${preview.description ? `<div class="lp-desc">${escHtml(preview.description.slice(0, 160))}${preview.description.length > 160 ? '…' : ''}</div>` : ''}
            </div>
        </a>`;
}

/* Attach link preview async to a card element */
async function attachLinkPreview(content, containerEl) {
    const url = extractFirstUrl(content);
    if (!url) return;
    const preview = await fetchLinkPreview(url);
    if (!preview || !preview.title) return;
    const lpEl = document.createElement('div');
    lpEl.className = 'link-preview-wrap';
    lpEl.innerHTML = renderLinkPreview(preview, url);
    containerEl.appendChild(lpEl);
}

/* ── Lightbox ── */
function openLightbox(images, startIndex) {
    document.getElementById('post-lightbox')?.remove();

    let current     = ((startIndex || 0) + images.length) % images.length;
    let touchStartX = 0, touchStartY = 0, isDragging = false;

    const overlay   = document.createElement('div');
    overlay.id      = 'post-lightbox';
    const glassBack = document.createElement('div');
    glassBack.className = 'lb-glass-back';
    const stage     = document.createElement('div');
    stage.className = 'lb-stage';
    const imgEl     = document.createElement('img');
    imgEl.className = 'lb-img';
    imgEl.draggable = false;
    const counter   = document.createElement('div');
    counter.className = 'lb-counter';
    const thumbStrip = document.createElement('div');
    thumbStrip.className = 'lb-thumbs';
    const btnClose  = document.createElement('button');
    btnClose.className = 'lb-btn lb-close';
    btnClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const btnPrev   = document.createElement('button');
    btnPrev.className = 'lb-btn lb-prev';
    btnPrev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>';
    const btnNext   = document.createElement('button');
    btnNext.className = 'lb-btn lb-next';
    btnNext.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>';

    function show(i, animated) {
        const prev = current;
        current = ((i % images.length) + images.length) % images.length;
        if (animated && prev !== current) {
            const dir = current > prev ? 1 : -1;
            imgEl.style.transition = 'none';
            imgEl.style.transform  = `translateX(${dir * 55}px)`;
            imgEl.style.opacity    = '0';
            requestAnimationFrame(() => {
                imgEl.style.transition = 'transform .28s cubic-bezier(.16,1,.3,1), opacity .22s ease';
                imgEl.style.transform  = 'translateX(0)';
                imgEl.style.opacity    = '1';
            });
        } else {
            imgEl.style.transition = 'none';
            imgEl.style.transform  = 'translateX(0)';
            imgEl.style.opacity    = '1';
        }
        imgEl.src = images[current];
        glassBack.style.backgroundImage = `url(${images[current]})`;
        counter.textContent = images.length > 1 ? `${current + 1} / ${images.length}` : '';
        thumbStrip.querySelectorAll('.lb-thumb').forEach((t, idx) =>
            t.classList.toggle('active', idx === current)
        );
        btnPrev.style.display = images.length > 1 ? '' : 'none';
        btnNext.style.display = images.length > 1 ? '' : 'none';
    }

    function close() {
        overlay.style.opacity   = '0';
        overlay.style.transform = 'scale(.97)';
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        setTimeout(() => overlay.remove(), 220);
    }

    function onKey(e) {
        if (e.key === 'Escape')     close();
        if (e.key === 'ArrowRight') show(current + 1, true);
        if (e.key === 'ArrowLeft')  show(current - 1, true);
    }
    document.addEventListener('keydown', onKey);

    stage.addEventListener('pointerdown', e => {
        touchStartX = e.clientX; touchStartY = e.clientY; isDragging = true;
        stage.setPointerCapture(e.pointerId);
    }, { passive: true });
    stage.addEventListener('pointermove', e => {
        if (!isDragging) return;
        imgEl.style.transition = 'none';
        imgEl.style.transform  = `translateX(${(e.clientX - touchStartX) * 0.4}px)`;
    }, { passive: true });
    stage.addEventListener('pointerup', e => {
        if (!isDragging) return;
        isDragging = false;
        const dx = e.clientX - touchStartX;
        const dy = Math.abs(e.clientY - touchStartY);
        imgEl.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
        imgEl.style.transform  = 'translateX(0)';
        if (Math.abs(dx) > 48 && dy < 80) show(dx < 0 ? current + 1 : current - 1, true);
    }, { passive: true });

    if (images.length > 1) {
        images.forEach((url, i) => {
            const t = document.createElement('button');
            t.className = 'lb-thumb';
            t.style.backgroundImage = `url(${url})`;
            t.onclick = () => show(i, true);
            thumbStrip.appendChild(t);
        });
    }

    btnClose.onclick = close;
    btnPrev.onclick  = () => show(current - 1, true);
    btnNext.onclick  = () => show(current + 1, true);
    stage.appendChild(imgEl);
    overlay.append(glassBack, btnClose, stage, counter, thumbStrip, btnPrev, btnNext);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.style.opacity   = '0';
    overlay.style.transform = 'scale(.96)';
    requestAnimationFrame(() => {
        overlay.style.transition = 'opacity .22s ease, transform .22s cubic-bezier(.16,1,.3,1)';
        overlay.style.opacity    = '1';
        overlay.style.transform  = 'scale(1)';
    });

    show(current, false);
}

/* ══════════════════════════════════════════════════════════════
   REACTIONS
   ══════════════════════════════════════════════════════════════ */

async function loadReactions(postId, token, currentUserId, reactionBarEl, opts = {}) {
    const table = opts.table || 'reactions';
    try {
        const rows = await pgGet(
            `${table}?post_id=eq.${postId}&select=emoji,user_id`,
            token
        );
        const agg = {};
        rows.forEach(r => {
            if (!agg[r.emoji]) agg[r.emoji] = { count: 0, userReacted: false };
            agg[r.emoji].count++;
            if (r.user_id === currentUserId) agg[r.emoji].userReacted = true;
        });
        renderReactionBar(postId, agg, token, currentUserId, reactionBarEl, opts);
    } catch(e) {
        console.error('loadReactions:', e);
    }
}

function renderReactionBar(postId, agg, token, currentUserId, barEl, opts = {}) {
    const table = opts.table || 'reactions';
    barEl.innerHTML = '';

    REACTIONS.forEach(reaction => {
        const { key, label, icon } = reaction;
        const data = agg[key] || { count: 0, userReacted: false };

        const btn = document.createElement('button');
        btn.className = 'reaction-btn' + (data.userReacted ? ' active' : '');
        btn.dataset.key = key;
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', data.userReacted ? 'true' : 'false');

        btn.innerHTML = `
            <svg class="reaction-icon" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round"
                 width="16" height="16" aria-hidden="true">
                ${icon}
            </svg>
            ${data.count > 0 ? `<span class="reaction-count">${data.count}</span>` : ''}
        `;

        btn.addEventListener('click', async () => {
            const isActive = btn.classList.contains('active');
            const countEl  = btn.querySelector('.reaction-count');
            let count = parseInt(countEl?.textContent || '0');

            if (isActive) {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
                count = Math.max(0, count - 1);
                if (count === 0) countEl?.remove();
                else if (countEl) countEl.textContent = count;
                try {
                    await pgDelete(
                        `${table}?post_id=eq.${postId}&user_id=eq.${currentUserId}&emoji=eq.${encodeURIComponent(key)}`,
                        token
                    );
                } catch(_) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    toast('Could not remove reaction.', 'err');
                }
            } else {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                btn.animate(
                    [{ transform:'scale(1)' }, { transform:'scale(1.35)' }, { transform:'scale(1)' }],
                    { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' }
                );
                count++;
                if (!countEl) {
                    const s = document.createElement('span');
                    s.className = 'reaction-count';
                    s.textContent = count;
                    btn.appendChild(s);
                } else countEl.textContent = count;
                try {
                    await pgPost(table, { post_id: postId, user_id: currentUserId, emoji: key }, token);
                } catch(_) {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                    toast('Could not add reaction.', 'err');
                }
            }
        });

        barEl.appendChild(btn);
    });
}

/* ══════════════════════════════════════════════════════════════
   INLINE EDIT — shared between home & group posts
   ══════════════════════════════════════════════════════════════ */

function openEditModal(postId, currentContent, token, onSave, opts = {}) {
    document.getElementById('post-edit-modal')?.remove();
    const table = opts.table || 'posts';

    const overlay = document.createElement('div');
    overlay.id = 'post-edit-modal';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:8000;
        display:flex;align-items:center;justify-content:center;padding:20px;
        animation:editFadeIn .15s ease;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
        background:var(--bg-raised,#fff);border:1px solid var(--line);
        border-radius:16px;padding:22px;width:100%;max-width:520px;
        box-shadow:0 20px 60px rgba(0,0,0,.25);
    `;

    box.innerHTML = `
        <div style="font-size:.9rem;font-weight:700;margin-bottom:12px;color:var(--text);">Edit Post</div>
        <textarea id="edit-post-ta" style="width:100%;border:1px solid var(--line);border-radius:10px;
            padding:10px 14px;font-family:var(--font,inherit);font-size:.9rem;color:var(--text);
            background:var(--bg-muted,#f5f5f5);resize:vertical;min-height:90px;outline:none;
            line-height:1.6;transition:border-color .15s;" maxlength="1000">${currentContent || ''}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
            <span style="font-size:.72rem;color:var(--text-muted);" id="edit-char-count">${(currentContent||'').length} / 1000</span>
            <div style="display:flex;gap:8px;">
                <button id="edit-cancel-btn" style="padding:8px 16px;border:1px solid var(--line);
                    border-radius:8px;font-size:.83rem;font-weight:600;color:var(--text-soft);
                    background:none;cursor:pointer;">Cancel</button>
                <button id="edit-save-btn" style="padding:8px 18px;background:var(--obsidian,#0e2a24);
                    color:#fff;border:none;border-radius:8px;font-size:.83rem;font-weight:700;
                    cursor:pointer;transition:background .15s;">Save</button>
            </div>
        </div>
        <div id="edit-error" style="display:none;font-size:.78rem;color:#c84444;margin-top:6px;"></div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const ta    = box.querySelector('#edit-post-ta');
    const ccEl  = box.querySelector('#edit-char-count');
    const errEl = box.querySelector('#edit-error');

    ta.focus();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.addEventListener('input', () => { ccEl.textContent = ta.value.length + ' / 1000'; });
    ta.addEventListener('focus', () => { ta.style.borderColor = 'var(--sage,#8fb8a6)'; });
    ta.addEventListener('blur',  () => { ta.style.borderColor = 'var(--line)'; });

    function close() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 150);
    }

    box.querySelector('#edit-cancel-btn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    box.querySelector('#edit-save-btn').addEventListener('click', async () => {
        const newContent = ta.value.trim();
        if (!newContent) { errEl.textContent = 'Post cannot be empty.'; errEl.style.display = 'block'; return; }
        const saveBtn = box.querySelector('#edit-save-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

        try {
            await pgPatch(
                `${table}?id=eq.${postId}`,
                { content: newContent, edited_at: new Date().toISOString() },
                token
            );
            close();
            onSave(newContent);
            toast('Post updated ✓');
        } catch(e) {
            errEl.textContent = 'Could not save. Please try again.';
            errEl.style.display = 'block';
            saveBtn.disabled = false; saveBtn.textContent = 'Save';
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   RENDER POST CARD
   ══════════════════════════════════════════════════════════════ */

function renderPost(post, currentUserId, opts = {}) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';
    const avatarUrl  = post.avatar_url  || null;

    const imageUrls = (post.images && post.images.length)
        ? post.images
        : (post.image_url ? [post.image_url] : []);

    /* ── Owner action menu (edit + delete) ── */
    const ownerMenu = isOwner ? `
        <div class="post-owner-menu" style="position:relative;">
            <button class="post-menu-btn" aria-label="Post options" title="Options"
                style="background:none;border:none;cursor:pointer;color:var(--text-muted);
                       padding:6px;border-radius:8px;display:flex;align-items:center;
                       transition:background .15s,color .15s;"
                onmouseover="this.style.background='var(--bg-muted,#f0f0f0)'"
                onmouseout="this.style.background='none'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                </svg>
            </button>
            <div class="post-menu-dropdown" style="display:none;position:fixed;
                background:var(--bg-raised,#fff);border:1px solid var(--line);border-radius:10px;
                padding:5px;min-width:130px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:9999;">
                <button class="post-edit-btn menu-item-btn" data-id="${post.id}"
                    style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;
                           border:none;background:none;cursor:pointer;font-size:.82rem;
                           color:var(--text-soft);border-radius:7px;font-family:var(--font,inherit);
                           transition:background .12s,color .12s;"
                    onmouseover="this.style.background='var(--sage-dim,#e8f4ed)';this.style.color='var(--text)'"
                    onmouseout="this.style.background='none';this.style.color='var(--text-soft)'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button class="post-delete-btn menu-item-btn" data-id="${post.id}"
                    style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;
                           border:none;background:none;cursor:pointer;font-size:.82rem;
                           color:#c84444;border-radius:7px;font-family:var(--font,inherit);
                           transition:background .12s;"
                    onmouseover="this.style.background='rgba(200,60,60,.08)'"
                    onmouseout="this.style.background='none'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>` : '';

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar-wrap"></div>
            <div class="post-meta">
                <span class="post-author">${escHtml(authorName)}</span>
                <span class="post-time">${timeAgo(post.created_at)}${post.edited_at ? ' <span class="post-edited-tag">· edited</span>' : ''}</span>
            </div>
            ${ownerMenu}
        </div>
${post.content ? `<p class="post-body md-post-body" data-post-body="${escHtml(post.id)}">${typeof window.parseMarkdown === 'function' ? window.parseMarkdown(post.content) : escHtml(post.content)}</p>` : ''}
        ${renderImageGallery(imageUrls)}
        <div class="link-preview-zone" id="lp-${post.id}"></div>
        <div class="post-footer">
            <div class="reaction-row" id="reactions-${post.id}"></div>
            <button class="post-comment-toggle" data-id="${post.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="comment-count-label" data-id="${post.id}">Comments</span>
            </button>
        </div>
        <div class="post-comments" id="comments-${post.id}" style="display:none;">
            <div class="comments-list" id="comments-list-${post.id}">
                <div class="comments-loading">Loading…</div>
            </div>
            <div class="comment-form-row">
                <div class="comment-composer-avatar"></div>
                <form class="comment-form" data-post-id="${post.id}">
                    <input class="comment-input" type="text" placeholder="Write a comment…"
                           maxlength="400" required autocomplete="off">
                    <button type="submit" class="comment-submit" aria-label="Send comment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                             width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;

    /* Avatar */
    card.querySelector('.post-avatar-wrap').appendChild(makeAvatar(avatarUrl, authorName, 'post-avatar'));

    /* Gallery → lightbox */
    if (imageUrls.length) {
        const gallery = card.querySelector('.post-gallery');
        if (gallery) {
            gallery.addEventListener('click', e => {
                const cell = e.target.closest('.gallery-cell');
                if (!cell) return;
                openLightbox(imageUrls, parseInt(cell.dataset.index) || 0);
            });
        }
    }

    /* Link preview (async) */
    if (post.content) {
        const lpZone = card.querySelector(`#lp-${post.id}`);
        if (lpZone) attachLinkPreview(post.content, lpZone);
    }

    /* Owner menu toggle */
    if (isOwner) {
        const menuBtn  = card.querySelector('.post-menu-btn');
        const dropdown = card.querySelector('.post-menu-dropdown');
        if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.style.display === 'block';
                dropdown.style.display = isOpen ? 'none' : 'block';
            });
            document.addEventListener('click', () => { dropdown.style.display = 'none'; }, { capture: true, once: false });
        }
    }

    return card;
}

/* ── Render comment (with optional reply support) ── */
function renderComment(c, opts = {}) {
    const isReply    = !!c.parent_id;
    const isOwner    = opts.currentUserId && c.user_id === opts.currentUserId;
    const div = document.createElement('div');
    div.className = 'comment-item' + (isReply ? ' comment-reply' : '');
    div.dataset.commentId = c.id;
    if (isReply) div.dataset.parentId = c.parent_id;

    const avatarEl = makeAvatar(c.avatar_url || null, c.author_name || 'Member', 'comment-avatar');
    div.innerHTML = `
        <div class="comment-bubble">
            <span class="comment-author">${escHtml(c.author_name || 'Member')}</span>
            <span class="comment-body">${escHtml(c.content)}</span>
            <span class="comment-time">${timeAgo(c.created_at)}</span>
            <div class="comment-actions">
           <button class="comment-reply-btn" ...>...</button>
           ${opts.currentUserId && c.user_id === opts.currentUserId ? `
           <button class="comment-del-btn"
                   data-comment-id="${c.id}"
                   data-table="${opts.table || 'comments'}"
                   aria-label="Delete comment">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    width="10" height="10">
                   <polyline points="3 6 5 6 21 6"/>
                   <path d="M19 6l-1 14H6L5 6"/>
               </svg>
               Delete
           </button>` : ''}
       </div>
    `;
    div.insertBefore(avatarEl, div.firstChild);
    return div;
}

/* ── Build inline reply form ── */
function buildReplyForm(commentId, authorName, postId, token, currentUserId, listEl, avatarUrl) {
    const wrap = document.createElement('div');
    wrap.className = 'reply-form-inner';
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:8px;';
    wrap.innerHTML = `
        <div class="comment-avatar" style="width:24px;height:24px;min-width:24px;font-size:.58rem;"></div>
        <form class="reply-form-el" style="display:flex;gap:5px;flex:1;align-items:center;">
            <input class="comment-input" type="text"
                   placeholder="Reply to ${escHtml(authorName)}…" maxlength="400"
                   autocomplete="off" style="font-size:.82rem;padding:6px 12px;">
            <button type="submit" class="comment-submit" aria-label="Send reply"
                    style="width:28px;height:28px;min-width:28px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                     width="12" height="12" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            </button>
        </form>
    `;

    const avEl = wrap.querySelector('.comment-avatar');
    if (avatarUrl) {
        avEl.innerHTML = `<img src="${escHtml(avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
    } else {
        avEl.textContent = initials(currentUserId || '??');
    }

    wrap.querySelector('.reply-form-el').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = wrap.querySelector('input');
        const text  = input.value.trim();
        if (!text) return;
        const submitBtn = wrap.querySelector('button[type=submit]');
        submitBtn.disabled = true;

        // Optimistic render
        const optimistic = renderComment({
            id: 'opt-' + Date.now(),
            post_id: postId,
            parent_id: commentId,
            content: text,
            created_at: new Date().toISOString(),
            author_name: '',
            avatar_url: avatarUrl || null,
            user_id: currentUserId,
        }, { currentUserId });

        // Place it right after the parent comment
        const parentEl = listEl.querySelector(`[data-comment-id="${commentId}"]`);
        if (parentEl && parentEl.nextSibling) {
            listEl.insertBefore(optimistic, parentEl.nextSibling);
        } else if (parentEl) {
            parentEl.after(optimistic);
        } else {
            listEl.appendChild(optimistic);
        }
        optimistic.style.opacity = '0';
        optimistic.style.transition = 'opacity .25s';
        requestAnimationFrame(() => { optimistic.style.opacity = '1'; });

        input.value = '';
        // Hide reply form
        const rfWrap = wrap.closest('.reply-form-wrap');
        if (rfWrap) rfWrap.style.display = 'none';

        try {
            await pgPost('comments', {
                post_id: postId,
                user_id: currentUserId,
                parent_id: commentId,
                content: text,
            }, token);
            // Reload to replace optimistic with real data
            await loadComments(postId, token, currentUserId);
        } catch {
            toast('Could not post reply.', 'err');
            optimistic.remove();
        } finally {
            submitBtn.disabled = false;
        }
    });

    return wrap;
}

/* ── Load comments ── */
async function loadComments(postId, token, currentUserId) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            `comments?post_id=eq.${postId}&order=created_at.asc&select=id,content,created_at,user_id,parent_id,profiles(full_name,avatar_url)`,
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
            return;
        }

        /* ── Flat list sorted with replies indented after their parent ── */
        const byId   = {};
        const roots  = [];
        rows.forEach(c => {
            byId[c.id] = { ...c, children: [] };
        });
        rows.forEach(c => {
            if (c.parent_id && byId[c.parent_id]) byId[c.parent_id].children.push(c.id);
            else roots.push(c.id);
        });

        function appendComment(cId, depth) {
            const c    = byId[cId];
            const node = renderComment({
                ...c,
                author_name: c.profiles?.full_name || 'Member',
                avatar_url:  c.profiles?.avatar_url || null,
            }, { currentUserId });

            // Indent replies
            if (depth > 0) node.style.marginLeft = Math.min(depth * 28, 56) + 'px';

            listEl.appendChild(node);

            // Attach reply-btn listener
            const replyBtn = node.querySelector('.comment-reply-btn');
            const rfWrap   = node.querySelector('.reply-form-wrap');
            if (replyBtn && rfWrap) {
                replyBtn.addEventListener('click', () => {
                    if (rfWrap.style.display === 'block') {
                        rfWrap.style.display = 'none';
                    } else {
                        rfWrap.innerHTML = '';
                        // Fetch current user avatar from profiles for the reply composer
                        const avatarUrl = null; // best-effort; will be filled on next loadComments
                        rfWrap.appendChild(buildReplyForm(c.id, c.profiles?.full_name || 'Member', postId, token, currentUserId, listEl, avatarUrl));
                        rfWrap.style.display = 'block';
                        rfWrap.querySelector('input')?.focus();
                    }
                });
            }

            c.children.forEach(childId => appendComment(childId, depth + 1));
        }

        roots.forEach(id => appendComment(id, 0));

        // Update count
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) {
            const n = rows.length;
            countEl.textContent = n + (n === 1 ? ' Comment' : ' Comments');
        }
    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
        console.error('loadComments:', e);
    }
}

/* ── Load posts ── */
async function loadPosts(container, token, currentUserId) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading posts…</div>';
    try {
        const [rows, allImages] = await Promise.all([
            pgGet('posts?order=created_at.desc&select=id,content,image_url,created_at,edited_at,user_id,full_name,profiles(full_name,avatar_url)', token),
            pgGet('post_images?select=post_id,url,position&order=position.asc', token).catch(() => []),
        ]);

        const imagesByPost = {};
        allImages.forEach(img => {
            if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
            imagesByPost[img.post_id].push(img.url);
        });

        container.innerHTML = '';

        if (!rows.length) {
            container.innerHTML = `<div class="posts-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                     width="40" height="40" style="opacity:.25;margin:0 auto 12px">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No posts yet. Be the first to share something!</p>
            </div>`;
            return;
        }

        rows.forEach(row => {
            const card = renderPost({
                ...row,
                author_name: row.profiles?.full_name || row.full_name || 'Member',
                avatar_url:  row.profiles?.avatar_url || null,
                images:      imagesByPost[row.id] || [],
            }, currentUserId);

            attachPostEvents(card, row, token, currentUserId);

            const reactionBarEl = card.querySelector(`#reactions-${row.id}`);
            if (reactionBarEl) loadReactions(row.id, token, currentUserId, reactionBarEl);

            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div class="posts-empty" style="border-color:rgba(200,80,80,.3);">
            <p style="color:#c94444;">Could not load posts. Please refresh.</p>
        </div>`;
        console.error('loadPosts:', e);
    }
}

/* ── Delete post ── */
async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
        await pgDelete(`posts?id=eq.${postId}`, token);
        onRemoteDeletePost(postId);
        toast('Post deleted.');
    } catch (err) {
        toast('Could not delete post.', 'err');
    }
}

/* ── Create post ── */
async function handleCreatePost(form, feedContainer, token, currentUserId) {
    const textarea    = form.querySelector('#post-content');
    const submitBtn   = form.querySelector('#post-submit-btn');
    const alertEl     = form.querySelector('#post-alert');
    const charEl      = form.querySelector('#post-char-count');
    const content     = textarea.value.trim();
    const pickedFiles = window._pickedPostFiles || [];

    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && !pickedFiles.length) {
        if (alertEl) { alertEl.textContent = 'Write something or add an image before posting.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        let authorName = 'Member';
        try {
            const u = JSON.parse(localStorage.getItem('econovo-user') || '{}');
            const m = u.user_metadata || {};
            authorName = m.full_name || ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || u.email || 'Member';
        } catch(_) {}

        const [newPost] = await pgPost('posts', {
            user_id: currentUserId, content: content || '', image_url: null, full_name: authorName,
        }, token);

        if (pickedFiles.length) {
            const urls = await Promise.all(pickedFiles.map(f => uploadImage(f, token, BUCKET)));
            await fetch(`${POSTS_URL}/rest/v1/posts?id=eq.${newPost.id}`, {
                method: 'PATCH', headers: authHeaders(token),
                body: JSON.stringify({ image_url: urls[0] }),
            });
            await Promise.all(urls.map((url, i) =>
                pgPost('post_images', { post_id: newPost.id, user_id: currentUserId, url, position: i }, token)
            ));
        }

        textarea.value = '';
        if (charEl) charEl.textContent = '0 / 1000';
        window._pickedPostFiles = [];
        renderPickedPreviews(form);
        toast('Post published! 🎉');

        try {
            const rows = await pgGet(
                `posts?id=eq.${newPost.id}&select=id,content,image_url,created_at,edited_at,user_id,full_name,profiles(full_name,avatar_url)`,
                token
            );
            if (rows.length) {
                const imgRows = pickedFiles.length
                    ? await pgGet(`post_images?post_id=eq.${newPost.id}&select=url,position&order=position.asc`, token).catch(() => [])
                    : [];
                const row  = rows[0];
                const card = renderPost({
                    ...row,
                    author_name: row.profiles?.full_name || row.full_name || authorName,
                    avatar_url:  row.profiles?.avatar_url || null,
                    images:      imgRows.map(r => r.url),
                }, currentUserId);

                card.style.cssText += ';opacity:0;transform:translateY(-20px);transition:opacity .4s ease,transform .4s cubic-bezier(.16,1,.3,1)';
                const first = feedContainer.querySelector('.post-card');
                if (first) feedContainer.insertBefore(card, first);
                else        feedContainer.prepend(card);
                requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
                attachPostEvents(card, row, token, currentUserId);
                const reactionBarEl = card.querySelector(`#reactions-${row.id}`);
                if (reactionBarEl) loadReactions(row.id, token, currentUserId, reactionBarEl);
            }
        } catch(e) { console.warn('self-post prepend failed:', e); }

    } catch (err) {
        if (alertEl) { alertEl.textContent = 'Failed to post. Please try again.'; alertEl.style.display = 'block'; }
        console.error('handleCreatePost:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publish`;
    }
}

/* ── Multi-image picker previews ── */
function renderPickedPreviews(form) {
    const files = window._pickedPostFiles || [];
    let previewRow = form.querySelector('#post-previews-row');
    if (!previewRow) {
        previewRow = document.createElement('div');
        previewRow.id = 'post-previews-row';
        previewRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0';
        const toolbar = form.querySelector('.create-post-toolbar');
        if (toolbar) toolbar.insertAdjacentElement('beforebegin', previewRow);
    }
    previewRow.innerHTML = '';
    files.forEach((file, i) => {
        const url  = URL.createObjectURL(file);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--line-mid)';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover';
        const rm = document.createElement('button');
        rm.type = 'button'; rm.innerHTML = '&times;';
        rm.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,.55);border:none;color:#fff;border-radius:50%;width:18px;height:18px;line-height:17px;text-align:center;cursor:pointer;font-size:.8rem;padding:0';
        rm.onclick = () => { window._pickedPostFiles.splice(i, 1); renderPickedPreviews(form); };
        wrap.append(img, rm);
        previewRow.appendChild(wrap);
    });
    const imgBtn = form.querySelector('#post-image-btn');
    if (imgBtn) {
        let badge = imgBtn.querySelector('.img-btn-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'img-btn-badge';
            badge.style.cssText = 'position:absolute;top:-5px;right:-5px;background:var(--sage);color:var(--obsidian);border-radius:999px;font-size:.65rem;font-weight:700;padding:1px 5px;pointer-events:none';
            imgBtn.style.position = 'relative';
            imgBtn.appendChild(badge);
        }
        badge.textContent = files.length || '';
        badge.style.display = files.length ? 'block' : 'none';
    }
}

/* ── Avatar upload ── */
async function handleAvatarUpload(file, token, userId, avatarPreviewEl) {
    try {
        const url = await uploadImage(file, token, AVATAR_BUCKET);
        await fetch(`${POSTS_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH', headers: authHeaders(token),
            body: JSON.stringify({ avatar_url: url, updated_at: new Date().toISOString() }),
        });
        if (avatarPreviewEl) {
            avatarPreviewEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
            avatarPreviewEl.appendChild(img);
        }
        toast('Avatar updated! ✓');
        return url;
    } catch (e) {
        toast('Avatar upload failed.', 'err');
        console.error('handleAvatarUpload:', e);
    }
}

/* ══════════════════════════════════════════════════════════════
   REALTIME ENGINE
   ══════════════════════════════════════════════════════════════ */

let _rtSocket   = null;
let _rtRef      = 1;
let _rtToken    = null;
let _rtUserId   = null;
let _rtFeed     = null;
let _rtHbTimer  = null;

const RT_URL = POSTS_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?vsn=1.0.0&apikey=' + POSTS_KEY;

function rtSend(msg) {
    if (_rtSocket && _rtSocket.readyState === WebSocket.OPEN) {
        _rtSocket.send(JSON.stringify(msg));
    }
}

function rtJoinChannel(table) {
    _rtRef++;
    const topic = `realtime:${table}`;
    rtSend({
        topic, event: 'phx_join',
        payload: {
            config: {
                broadcast: { self: false }, presence: { key: '' },
                postgres_changes: [{ event: '*', schema: 'public', table }],
            },
            access_token: _rtToken,
        },
        ref: String(_rtRef), join_ref: String(_rtRef),
    });
}

function initRealtime(token, userId, feedContainer) {
    _rtToken  = token;
    _rtUserId = userId;
    _rtFeed   = feedContainer;

    if (_rtSocket) { _rtSocket.close(); _rtSocket = null; }
    clearInterval(_rtHbTimer);

    const ws = new WebSocket(RT_URL);
    _rtSocket = ws;

    ws.onopen = () => {
        rtJoinChannel('posts');
        rtJoinChannel('comments');
        rtJoinChannel('reactions');
        _rtHbTimer = setInterval(() => {
            _rtRef++;
            rtSend({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(_rtRef) });
        }, 25000);
    };

    ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }

        let type, table, record, old;
        if (msg.event === 'postgres_changes') {
            type   = msg.payload?.type;
            table  = msg.payload?.table;
            record = msg.payload?.record     || {};
            old    = msg.payload?.old_record || {};
        } else if (['INSERT','UPDATE','DELETE'].includes(msg.event)) {
            type   = msg.event;
            table  = msg.topic?.split(':')[2];
            record = msg.payload?.record     || {};
            old    = msg.payload?.old_record || {};
        } else return;

        if (!type || !table) return;

        if (table === 'posts') {
            if (type === 'INSERT') onRemotePost(record);
            if (type === 'DELETE') onRemoteDeletePost(old.id || record.id);
            if (type === 'UPDATE') onRemoteUpdatePost(record);
        }
        if (table === 'comments') {
            if (type === 'INSERT') onRemoteComment(record);
        }
        if (table === 'reactions') {
            if (type === 'INSERT') onRemoteReaction(record, 'add');
            if (type === 'DELETE') onRemoteReaction(old, 'remove');
        }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
        clearInterval(_rtHbTimer);
        setTimeout(() => {
            if (document.visibilityState !== 'hidden') initRealtime(_rtToken, _rtUserId, _rtFeed);
        }, 4000);
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (!_rtSocket || _rtSocket.readyState > 1)) {
            initRealtime(_rtToken, _rtUserId, _rtFeed);
        }
    });
}

async function onRemotePost(record) {
    if (!_rtFeed || record.user_id === _rtUserId) return;
    if (_rtFeed.querySelector(`[data-post-id="${record.id}"]`)) return;

    try {
        const rows = await pgGet(
            `posts?id=eq.${record.id}&select=id,content,image_url,created_at,edited_at,user_id,full_name,profiles(full_name,avatar_url)`,
            _rtToken
        );
        if (!rows.length) return;
        const row     = rows[0];
        const imgRows = await pgGet(`post_images?post_id=eq.${row.id}&select=url,position&order=position.asc`, _rtToken).catch(() => []);

        const card = renderPost({
            ...row,
            author_name: row.profiles?.full_name || row.full_name || 'Member',
            avatar_url:  row.profiles?.avatar_url || null,
            images:      imgRows.map(r => r.url),
        }, _rtUserId);

        card.style.cssText += ';opacity:0;transform:translateY(-20px);transition:opacity .4s ease,transform .4s cubic-bezier(.16,1,.3,1)';
        const first = _rtFeed.querySelector('.post-card');
        if (first) _rtFeed.insertBefore(card, first);
        else _rtFeed.prepend(card);

        requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
        attachPostEvents(card, row, _rtToken, _rtUserId);

        const reactionBarEl = card.querySelector(`#reactions-${row.id}`);
        if (reactionBarEl) loadReactions(row.id, _rtToken, _rtUserId, reactionBarEl);
    } catch(e) { console.warn('onRemotePost fetch failed:', e); }
}

function onRemoteDeletePost(postId) {
    if (!postId) return;
    const card = _rtFeed?.querySelector(`[data-post-id="${postId}"]`);
    if (!card) return;
    card.style.transition = 'opacity .35s ease, transform .35s ease, max-height .4s ease';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(.97)';
    card.style.overflow   = 'hidden';
    card.style.maxHeight  = card.offsetHeight + 'px';
    requestAnimationFrame(() => { card.style.maxHeight = '0'; card.style.marginBottom = '0'; });
    setTimeout(() => card.remove(), 420);
}

function onRemoteUpdatePost(record) {
    if (!record.id) return;
    const card   = _rtFeed?.querySelector(`[data-post-id="${record.id}"]`);
    if (!card) return;
    const bodyEl = card.querySelector(`[data-post-body="${record.id}"]`);
    if (bodyEl && record.content !== undefined) bodyEl.innerHTML = escHtml(record.content);
    const timeEl = card.querySelector('.post-time');
    if (timeEl && record.edited_at) {
        const base = timeAgo(record.created_at || new Date().toISOString());
        timeEl.innerHTML = `${base} <span class="post-edited-tag">· edited</span>`;
    }
}

async function onRemoteComment(record) {
    const postId = record.post_id;
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl || record.user_id === _rtUserId) return;

    try {
        const rows = await pgGet(
            `comments?id=eq.${record.id}&select=id,content,created_at,user_id,parent_id,profiles(full_name,avatar_url)`,
            _rtToken
        );
        if (!rows.length) return;
        const c = rows[0];

        // Reload full thread to preserve ordering
        await loadComments(postId, _rtToken, _rtUserId);
    } catch(e) { console.warn('onRemoteComment failed:', e); }
}

function onRemoteReaction(record, action) {
    const postId = record.post_id;
    const key    = record.emoji;
    if (!postId || !key || record.user_id === _rtUserId) return;

    const barEl = document.getElementById('reactions-' + postId);
    if (!barEl) return;
    const btn   = barEl.querySelector(`.reaction-btn[data-key="${key}"]`);
    if (!btn) return;

    let countEl = btn.querySelector('.reaction-count');
    let count   = parseInt(countEl?.textContent || '0');

    if (action === 'add') {
        count++;
        if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'reaction-count';
            btn.appendChild(countEl);
        }
        countEl.textContent = count;
        btn.animate(
            [{ transform:'scale(1)' }, { transform:'scale(1.2)' }, { transform:'scale(1)' }],
            { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        );
    } else {
        count = Math.max(0, count - 1);
        if (count === 0) countEl?.remove();
        else if (countEl) countEl.textContent = count;
    }
}

/* ── attachPostEvents ── */
function attachPostEvents(card, row, token, currentUserId) {
    /* Menu toggle — single delegated click on the dropdown items */
    const menuDropdown = card.querySelector('.post-menu-dropdown');
    if (menuDropdown) {
        // Close when clicking outside
        const closeMenu = (e) => {
            if (!card.contains(e.target)) menuDropdown.style.display = 'none';
        };
        document.addEventListener('click', closeMenu);
    }

    /* Edit */
    const editBtn = card.querySelector('.post-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menuDropdown) menuDropdown.style.display = 'none';
            const bodyEl = card.querySelector(`[data-post-body="${row.id}"]`);
            const current = bodyEl ? bodyEl.innerText : (row.content || '');
            openEditModal(row.id, current, token, (newContent) => {
                if (bodyEl) bodyEl.innerHTML = escHtml(newContent);
                const timeEl = card.querySelector('.post-time');
                if (timeEl) timeEl.innerHTML = timeAgo(row.created_at) + ' <span class="post-edited-tag">· edited</span>';
                // Refresh link preview
                const lpZone = card.querySelector(`#lp-${row.id}`);
                if (lpZone) { lpZone.innerHTML = ''; attachLinkPreview(newContent, lpZone); }
            });
        });
    }

    /* Delete */
    const delBtn = card.querySelector('.post-delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menuDropdown) menuDropdown.style.display = 'none';
            deletePost(row.id, card, token);
        });
    }

    /* Comments toggle */
    const toggleBtn  = card.querySelector('.post-comment-toggle');
    const commentsEl = card.querySelector('.post-comments');
    let commentsLoaded = false;
    toggleBtn?.addEventListener('click', () => {
        const open = commentsEl.style.display === 'block';
        commentsEl.style.display = open ? 'none' : 'block';
        if (!open && !commentsLoaded) { commentsLoaded = true; loadComments(row.id, token, currentUserId); }
    });

    /* Comment form */
    const form = card.querySelector('.comment-form');
    form?.addEventListener('submit', async e => {
        e.preventDefault();
        const input     = form.querySelector('.comment-input');
        const text      = input.value.trim();
        if (!text) return;
        const submitBtn = form.querySelector('.comment-submit');
        submitBtn.disabled = true;

        const listEl = document.getElementById('comments-list-' + row.id);
        if (listEl) {
            let userRaw = {};
            try { userRaw = JSON.parse(localStorage.getItem('econovo-user') || '{}'); } catch {}
            const meta = userRaw.user_metadata || {};
            const name = meta.full_name || ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim() || 'Me';
            const optimistic = renderComment({
                id: 'opt-' + Date.now(),
                content: text, created_at: new Date().toISOString(),
                author_name: name, avatar_url: null, user_id: currentUserId,
            }, { currentUserId });
            optimistic.style.opacity = '0';
            optimistic.style.transition = 'opacity .25s ease';
            const empty = listEl.querySelector('.no-comments');
            if (empty) empty.remove();
            commentsLoaded = true;
            listEl.appendChild(optimistic);
            requestAnimationFrame(() => { optimistic.style.opacity = '1'; });
        }

        input.value = '';
        const countEl = document.querySelector(`.comment-count-label[data-id="${row.id}"]`);
        if (countEl && listEl) {
            const n = listEl.querySelectorAll('.comment-item').length;
            countEl.textContent = n + (n === 1 ? ' Comment' : ' Comments');
        }

        try {
            await pgPost('comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
            await loadComments(row.id, token, currentUserId);
        } catch {
            toast('Could not post comment.', 'err');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   GROUP FEED — Full parity with home feed
   (images + reactions + edit + threaded replies + link previews)
   ══════════════════════════════════════════════════════════════ */

window.initGroupFeed = function(group, token, currentUserId, feedEl, composerWrapEl, options = {}) {
    /* ── Picked files state for this group composer ── */
    window._pickedGroupFiles = window._pickedGroupFiles || [];

    /* ── Composer HTML ── */
    composerWrapEl.innerHTML = `
        <div class="composer-card" style="margin-bottom:16px;">
            <div class="composer-top">
                <div class="composer-av" id="group-composer-av"></div>
                <textarea class="composer-input" id="group-post-content"
                          placeholder="Share something in ${group.name}…"
                          rows="2" maxlength="1000" dir="auto"></textarea>
            </div>
            <div id="group-post-previews" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0;"></div>
            <div id="group-post-alert" style="display:none;font-size:.82rem;color:#c84444;padding:4px 0;"></div>
            <div class="composer-footer create-post-toolbar">
                <span class="char-count-sm" id="group-char-count">0 / 1000</span>
                <div class="composer-actions">
                    <label class="composer-btn" id="group-image-btn" for="group-post-image" title="Add images" style="position:relative;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        Images
                        <input type="file" id="group-post-image" accept="image/*" multiple style="display:none;">
                    </label>
                    <button class="btn-publish" id="group-post-btn" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                             stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Publish
                    </button>
                </div>
            </div>
        </div>
    `;

    /* Fill composer avatar */
    const compAv = composerWrapEl.querySelector('#group-composer-av');
    if (compAv && options.avatarUrl) {
        const img = document.createElement('img');
        img.src = options.avatarUrl;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
        compAv.appendChild(img);
    } else if (compAv) {
        compAv.textContent = initials(options.userName || '');
    }

    /* Char counter */
    composerWrapEl.querySelector('#group-post-content').addEventListener('input', function() {
        composerWrapEl.querySelector('#group-char-count').textContent = this.value.length + ' / 1000';
    });

    /* Image picker */
    const imgInput = composerWrapEl.querySelector('#group-post-image');
    if (imgInput) {
        imgInput.addEventListener('change', () => {
            const incoming  = Array.from(imgInput.files || []);
            const remaining = MAX_IMAGES - (window._pickedGroupFiles?.length || 0);
            if (incoming.length > remaining) toast(`Max ${MAX_IMAGES} images.`, 'err');
            incoming.slice(0, remaining).forEach(f => window._pickedGroupFiles.push(f));
            imgInput.value = '';
            renderGroupPreviews(composerWrapEl);
        });
    }

    /* Publish group post */
    composerWrapEl.querySelector('#group-post-btn').addEventListener('click', async () => {
        const ta      = composerWrapEl.querySelector('#group-post-content');
        const alertEl = composerWrapEl.querySelector('#group-post-alert');
        const text    = ta.value.trim();
        const files   = window._pickedGroupFiles || [];
        if (!text && !files.length) { ta.focus(); return; }

        const btn = composerWrapEl.querySelector('#group-post-btn');
        btn.disabled = true; alertEl.style.display = 'none';

        try {
            const [newPost] = await pgPost('group_posts', {
                group_id: group.id, user_id: currentUserId, content: text || '',
            }, token);

            if (files.length) {
                const urls = await Promise.all(files.map(f => uploadImage(f, token, GROUP_BUCKET)));
                await Promise.all(urls.map((url, i) =>
                    pgPost('group_post_images', { post_id: newPost.id, user_id: currentUserId, url, position: i }, token)
                ));
            }

            ta.value = '';
            composerWrapEl.querySelector('#group-char-count').textContent = '0 / 1000';
            window._pickedGroupFiles = [];
            renderGroupPreviews(composerWrapEl);
            toast(`Posted to ${group.name}! 🎉`);
            await loadGroupPosts();
        } catch(e) {
            alertEl.textContent = 'Could not post. Please try again.';
            alertEl.style.display = 'block';
            console.error('group post:', e);
        } finally {
            btn.disabled = false;
        }
    });

    /* ── Render group image previews ── */
    function renderGroupPreviews(wrap) {
        const files = window._pickedGroupFiles || [];
        const row = wrap.querySelector('#group-post-previews');
        if (!row) return;
        row.innerHTML = '';
        files.forEach((file, i) => {
            const url  = URL.createObjectURL(file);
            const el   = document.createElement('div');
            el.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--line-mid)';
            const img = document.createElement('img');
            img.src = url; img.style.cssText = 'width:100%;height:100%;object-fit:cover';
            const rm = document.createElement('button');
            rm.type = 'button'; rm.innerHTML = '&times;';
            rm.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,.55);border:none;color:#fff;border-radius:50%;width:18px;height:18px;line-height:17px;text-align:center;cursor:pointer;font-size:.8rem;padding:0';
            rm.onclick = () => { window._pickedGroupFiles.splice(i, 1); renderGroupPreviews(wrap); };
            el.append(img, rm); row.appendChild(el);
        });
        const badge = composerWrapEl.querySelector('#group-image-btn .img-btn-badge') || (() => {
            const b = document.createElement('span');
            b.className = 'img-btn-badge';
            b.style.cssText = 'position:absolute;top:-5px;right:-5px;background:var(--sage);color:var(--obsidian);border-radius:999px;font-size:.65rem;font-weight:700;padding:1px 5px;pointer-events:none';
            composerWrapEl.querySelector('#group-image-btn')?.appendChild(b);
            return b;
        })();
        if (badge) { badge.textContent = files.length || ''; badge.style.display = files.length ? 'block' : 'none'; }
    }

    /* ── Load & render group posts ── */
    async function loadGroupPosts() {
        feedEl.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading…</div>';
        try {
            const [rows, allImages] = await Promise.all([
                pgGet(`group_posts?group_id=eq.${group.id}&order=created_at.desc&select=id,content,created_at,edited_at,user_id,profiles(full_name,avatar_url)`, token),
                pgGet(`group_post_images?select=post_id,url,position&order=position.asc`, token).catch(() => []),
            ]);

            const imagesByPost = {};
            allImages.forEach(img => {
                if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
                imagesByPost[img.post_id].push(img.url);
            });

            feedEl.innerHTML = '';
            if (!rows.length) {
                feedEl.innerHTML = '<div class="posts-empty">No posts yet. Start the conversation!</div>';
                return;
            }

            rows.forEach(row => {
                const card = renderGroupPostCard(row, imagesByPost[row.id] || [], currentUserId, token, group);
                feedEl.appendChild(card);
            });
        } catch(e) {
            feedEl.innerHTML = '<div class="posts-empty" style="border-color:rgba(200,80,80,.3);"><p style="color:#c94444;">Could not load posts. Please refresh.</p></div>';
            console.error('loadGroupPosts:', e);
        }
    }

    loadGroupPosts();
};

/* ── Render a group post card (identical UX to home posts) ── */
function renderGroupPostCard(row, images, currentUserId, token, group) {
    const authorName = row.profiles?.full_name || 'Member';
    const avatarUrl  = row.profiles?.avatar_url || null;
    const isOwner    = row.user_id === currentUserId;

    const ownerMenu = isOwner ? `
        <div class="post-owner-menu" style="position:relative;">
            <button class="post-menu-btn" aria-label="Post options"
                style="background:none;border:none;cursor:pointer;color:var(--text-muted);
                       padding:6px;border-radius:8px;display:flex;align-items:center;
                       transition:background .15s,color .15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                </svg>
            </button>
<div class="post-menu-dropdown" style="display:none;position:fixed;
                background:var(--bg-raised,#fff);border:1px solid var(--line);border-radius:10px;
                padding:5px;min-width:130px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:9999;">
                <button class="gpost-edit-btn menu-item-btn" data-id="${row.id}"
                    style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;
                           border:none;background:none;cursor:pointer;font-size:.82rem;
                           color:var(--text-soft);border-radius:7px;font-family:var(--font,inherit);
                           transition:background .12s,color .12s;"
                    onmouseover="this.style.background='var(--sage-dim,#e8f4ed)';this.style.color='var(--text)'"
                    onmouseout="this.style.background='none';this.style.color='var(--text-soft)'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button class="gpost-del-btn menu-item-btn" data-id="${row.id}"
                    style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;
                           border:none;background:none;cursor:pointer;font-size:.82rem;
                           color:#c84444;border-radius:7px;font-family:var(--font,inherit);
                           transition:background .12s;"
                    onmouseover="this.style.background='rgba(200,60,60,.08)'"
                    onmouseout="this.style.background='none'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>` : '';

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.gPostId = row.id;
    card.style.marginBottom = '14px';

    card.innerHTML = `
        <div class="post-header">
            <div class="gp-av-wrap"></div>
            <div class="post-meta">
                <span class="post-author">${escHtml(authorName)}</span>
                <span class="post-time">${timeAgo(row.created_at)}${row.edited_at ? ' <span class="post-edited-tag">· edited</span>' : ''}</span>
            </div>
            ${ownerMenu}
        </div>
${row.content ? `<p class="post-body md-post-body" data-gpost-body="${escHtml(row.id)}" dir="auto">${typeof window.parseMarkdown === 'function' ? window.parseMarkdown(row.content) : escHtml(row.content)}</p>` : ''}        ${renderImageGallery(images)}
        <div class="link-preview-zone" id="glp-${row.id}"></div>
        <div class="post-footer">
            <div class="reaction-row" id="greactions-${row.id}"></div>
            <button class="post-comment-toggle" data-gid="${row.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="gcomment-count-label" data-gid="${row.id}">Comments</span>
            </button>
        </div>
        <div class="post-comments" id="gcomments-${row.id}" style="display:none;">
            <div class="comments-list" id="gcomments-list-${row.id}">
                <div class="comments-loading">Loading…</div>
            </div>
            <div class="comment-form-row">
                <div class="comment-composer-avatar"></div>
                <form class="gcomment-form" data-gpost-id="${row.id}">
                    <input class="comment-input" type="text" placeholder="Write a comment…"
                           maxlength="400" required autocomplete="off">
                    <button type="submit" class="comment-submit" aria-label="Send">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                             width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;

    /* Avatar */
    const avWrap = card.querySelector('.gp-av-wrap');
    avWrap.appendChild(makeAvatar(avatarUrl, authorName, 'post-avatar'));

    /* Gallery → lightbox */
    if (images.length) {
        const gallery = card.querySelector('.post-gallery');
        if (gallery) {
            gallery.addEventListener('click', e => {
                const cell = e.target.closest('.gallery-cell');
                if (!cell) return;
                openLightbox(images, parseInt(cell.dataset.index) || 0);
            });
        }
    }

    /* Link preview */
    if (row.content) {
        const lpZone = card.querySelector(`#glp-${row.id}`);
        if (lpZone) attachLinkPreview(row.content, lpZone);
    }

    /* Reactions (group_reactions table) */
    const reactionBarEl = card.querySelector(`#greactions-${row.id}`);
    if (reactionBarEl) loadReactions(row.id, token, currentUserId, reactionBarEl, { table: 'group_reactions' });

    /* Owner menu */
const menuBtn  = card.querySelector('.post-menu-btn');
    const dropdown = card.querySelector('.post-menu-dropdown');
    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            if (!isOpen) {
                const rect = menuBtn.getBoundingClientRect();
                dropdown.style.top   = (rect.bottom + 6) + 'px';
                dropdown.style.right = (window.innerWidth - rect.right) + 'px';
            }
            dropdown.style.display = isOpen ? 'none' : 'block';
        });
        document.addEventListener('click', () => { dropdown.style.display = 'none'; });
       }

    /* Edit */
    const editBtn = card.querySelector('.gpost-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown) dropdown.style.display = 'none';
            const bodyEl  = card.querySelector(`[data-gpost-body="${row.id}"]`);
            const current = bodyEl ? bodyEl.innerText : (row.content || '');
            openEditModal(row.id, current, token, (newContent) => {
                if (bodyEl) bodyEl.innerHTML = escHtml(newContent);
                const timeEl = card.querySelector('.post-time');
                if (timeEl) timeEl.innerHTML = timeAgo(row.created_at) + ' <span class="post-edited-tag">· edited</span>';
                const lpZone = card.querySelector(`#glp-${row.id}`);
                if (lpZone) { lpZone.innerHTML = ''; attachLinkPreview(newContent, lpZone); }
            }, { table: 'group_posts' });
        });
    }

    /* Delete */
    const delBtn = card.querySelector('.gpost-del-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (dropdown) dropdown.style.display = 'none';
            if (!confirm('Delete this post?')) return;
            try {
                await pgDelete(`group_posts?id=eq.${row.id}`, token);
                card.style.opacity = '0'; card.style.transition = 'opacity .3s';
                setTimeout(() => card.remove(), 320);
                toast('Post deleted.');
            } catch(_) { toast('Could not delete.', 'err'); }
        });
    }

    /* Comments toggle */
    const toggleBtn  = card.querySelector('.post-comment-toggle');
    const commentsEl = card.querySelector(`#gcomments-${row.id}`);
    let   gCommentsLoaded = false;

    toggleBtn?.addEventListener('click', () => {
        const open = commentsEl.style.display === 'block';
        commentsEl.style.display = open ? 'none' : 'block';
        if (!open && !gCommentsLoaded) {
            gCommentsLoaded = true;
            loadGroupComments(row.id, token, currentUserId);
        }
    });

    /* Comment form */
    const cForm = card.querySelector('.gcomment-form');
    cForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const input = cForm.querySelector('.comment-input');
        const text  = input.value.trim();
        if (!text) return;
        const subBtn = cForm.querySelector('.comment-submit');
        subBtn.disabled = true;

        const listEl = document.getElementById('gcomments-list-' + row.id);
        if (listEl) {
            let userRaw = {};
            try { userRaw = JSON.parse(localStorage.getItem('econovo-user') || '{}'); } catch {}
            const meta = userRaw.user_metadata || {};
            const name = meta.full_name || ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim() || 'Me';
            const opt = renderComment({ id: 'opt-' + Date.now(), content: text, created_at: new Date().toISOString(), author_name: name, avatar_url: null, user_id: currentUserId }, { currentUserId });
            opt.style.opacity = '0'; opt.style.transition = 'opacity .25s';
            const empty = listEl.querySelector('.no-comments');
            if (empty) empty.remove();
            listEl.appendChild(opt);
            requestAnimationFrame(() => { opt.style.opacity = '1'; });
        }

        input.value = '';
        try {
            await pgPost('group_comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
            await loadGroupComments(row.id, token, currentUserId);
        } catch {
            toast('Could not post comment.', 'err');
        } finally {
            subBtn.disabled = false;
        }
    });

    return card;
}

/* ── Load group comments (threaded, same logic as home) ── */
async function loadGroupComments(postId, token, currentUserId) {
    const listEl = document.getElementById('gcomments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            `group_comments?post_id=eq.${postId}&order=created_at.asc&select=id,content,created_at,user_id,parent_id,profiles(full_name,avatar_url)`,
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
            return;
        }

        const byId = {}; const roots = [];
        rows.forEach(c => { byId[c.id] = { ...c, children: [] }; });
        rows.forEach(c => {
            if (c.parent_id && byId[c.parent_id]) byId[c.parent_id].children.push(c.id);
            else roots.push(c.id);
        });

        function appendC(cId, depth) {
            const c    = byId[cId];
            const node = renderComment({
                ...c,
                author_name: c.profiles?.full_name || 'Member',
                avatar_url:  c.profiles?.avatar_url || null,
            }, { currentUserId });
            if (depth > 0) node.style.marginLeft = Math.min(depth * 28, 56) + 'px';
            listEl.appendChild(node);

            const replyBtn = node.querySelector('.comment-reply-btn');
            const rfWrap   = node.querySelector('.reply-form-wrap');
            if (replyBtn && rfWrap) {
                replyBtn.addEventListener('click', () => {
                    if (rfWrap.style.display === 'block') { rfWrap.style.display = 'none'; return; }
                    rfWrap.innerHTML = '';

                    // Build reply form for group_comments
                    const wrap = document.createElement('div');
                    wrap.className = 'reply-form-inner';
                    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:8px;';
                    wrap.innerHTML = `
                        <div class="comment-avatar" style="width:24px;height:24px;min-width:24px;font-size:.58rem;"></div>
                        <form style="display:flex;gap:5px;flex:1;align-items:center;">
                            <input class="comment-input" type="text"
                                   placeholder="Reply to ${escHtml(c.profiles?.full_name || 'Member')}…"
                                   maxlength="400" autocomplete="off" style="font-size:.82rem;padding:6px 12px;">
                            <button type="submit" class="comment-submit" style="width:28px;height:28px;min-width:28px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                                     width="12" height="12" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </form>
                    `;
                    wrap.querySelector('form').addEventListener('submit', async (ev) => {
                        ev.preventDefault();
                        const input = wrap.querySelector('input');
                        const text  = input.value.trim();
                        if (!text) return;
                        const sb = wrap.querySelector('button'); sb.disabled = true;
                        input.value = '';
                        rfWrap.style.display = 'none';
                        try {
                            await pgPost('group_comments', { post_id: postId, user_id: currentUserId, parent_id: c.id, content: text }, token);
                            await loadGroupComments(postId, token, currentUserId);
                        } catch { toast('Could not post reply.', 'err'); sb.disabled = false; }
                    });
                    rfWrap.appendChild(wrap);
                    rfWrap.style.display = 'block';
                    rfWrap.querySelector('input')?.focus();
                });
            }
            c.children.forEach(childId => appendC(childId, depth + 1));
        }
        roots.forEach(id => appendC(id, 0));

        const countEl = document.querySelector(`.gcomment-count-label[data-gid="${postId}"]`);
        if (countEl) { const n = rows.length; countEl.textContent = n + (n === 1 ? ' Comment' : ' Comments'); }
    } catch(e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
        console.error('loadGroupComments:', e);
    }
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */

window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('main-composer');

    /* Composer avatar */
    try {
        const userRaw = localStorage.getItem('econovo-user');
        const userObj = userRaw ? JSON.parse(userRaw) : {};
        const meta    = userObj.user_metadata || {};
        const name    = meta.full_name || meta.first_name || userObj.email || '';
        const avatarEl = document.getElementById('composer-av');
        if (avatarEl) {
            pgGet(`profiles?id=eq.${currentUserId}&select=avatar_url`, token)
                .then(rows => {
                    const url = rows[0]?.avatar_url;
                    if (url) {
                        avatarEl.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = url;
                        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
                        img.onerror = () => { img.remove(); avatarEl.textContent = initials(name); };
                        avatarEl.appendChild(img);
                    } else {
                        avatarEl.textContent = initials(name);
                    }
                })
                .catch(() => { avatarEl.textContent = initials(name); });
        }
    } catch(_) {}

    if (!feedContainer) return;
    loadPosts(feedContainer, token, currentUserId);
    initRealtime(token, currentUserId, feedContainer);
    if (!createForm) return;

    /* Multi-image picker */
    window._pickedPostFiles = window._pickedPostFiles || [];
    const imageInput = createForm.querySelector('#post-image');
    if (imageInput) {
        const fresh = imageInput.cloneNode(true);
        fresh.multiple = true; fresh.accept = 'image/*';
        imageInput.parentNode.replaceChild(fresh, imageInput);
        fresh.addEventListener('change', () => {
            const incoming  = Array.from(fresh.files || []);
            const remaining = MAX_IMAGES - (window._pickedPostFiles?.length || 0);
            if (incoming.length > remaining) toast(`Max ${MAX_IMAGES} images per post.`, 'err');
            incoming.slice(0, remaining).forEach(f => window._pickedPostFiles.push(f));
            fresh.value = '';
            renderPickedPreviews(createForm);
        });
    }

    /* Char counter */
    const textarea = createForm.querySelector('#post-content');
    const charEl   = createForm.querySelector('#post-char-count');
    if (textarea && charEl) {
        textarea.addEventListener('input', () => { charEl.textContent = textarea.value.length + `${len} / ∞`; });
    }

    /* Publish */
    const publishBtn = document.getElementById('post-submit-btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            await handleCreatePost(createForm, feedContainer, token, currentUserId);
        });
    }

    /* Profile avatar upload */
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const profileAvatarEl   = document.getElementById('profile-avatar');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', () => {
            const file = avatarUploadInput.files[0];
            if (file) handleAvatarUpload(file, token, currentUserId, profileAvatarEl);
        });
    }
};
