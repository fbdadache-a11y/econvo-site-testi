/* ==========================================================================
   ECONOVO — posts.js  (v4 — SVG reactions + multi-image + avatars)
   ========================================================================== */

'use strict';

const POSTS_URL     = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY     = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET        = 'post-images';
const AVATAR_BUCKET = 'avatars';
const MAX_IMAGES    = 50;

/* Emojis available in the composer picker — removed */

/* ══════════════════════════════════════════════════════════════
   REACTIONS — Lucide SVG icons
   key: stored in DB | icon: Lucide SVG paths | label: tooltip

   ملاحظة: مفاتيح key ('like','helpful','smart','relatable','fire')
   ثابتة عمدًا ولا تُغيَّر حتى عند تغيير الأيقونة/التسمية المعروضة،
   لأنها موجودة فعليًا كقيم في عمود reactions.emoji بقاعدة البيانات.
   تغيير المفتاح يفصل التفاعلات القديمة عن عرضها الجديد.
   ══════════════════════════════════════════════════════════════ */
const REACTIONS = [
    {
        key:   'like',
        label: 'Like',
        icon:  '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
    },
    {
        /* كان "Helpful" بأيقونة علامة استفهام — استُبدلت بضحكة (Laugh) بناءً
           على طلب المستخدم. المفتاح key بقي 'helpful' كما هو كي لا تصبح
           التفاعلات المخزَّنة مسبقًا في قاعدة البيانات "يتيمة" بدون أيقونة. */
        key:   'helpful',
        label: 'Haha',
        icon:  '<circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-12 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    },
    {
        /* كان "Smart" بأيقونة شمس — استُبدلت بقلب (Heart). المفتاح key بقي
           'smart' لنفس سبب أعلاه. */
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

/* ── Lightbox ── */

function openLightbox(images, startIndex) {
    document.getElementById('post-lightbox')?.remove();

    let current     = ((startIndex || 0) + images.length) % images.length;
    let touchStartX = 0, touchStartY = 0, isDragging = false;

    /* ── Elements ── */
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

    /* ── Show image i ── */
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

    /* ── Close ── */
    function close() {
        overlay.style.opacity   = '0';
        overlay.style.transform = 'scale(.97)';
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        setTimeout(() => overlay.remove(), 220);
    }

    /* ── Keyboard ── */
    function onKey(e) {
        if (e.key === 'Escape')     close();
        if (e.key === 'ArrowRight') show(current + 1, true);
        if (e.key === 'ArrowLeft')  show(current - 1, true);
    }
    document.addEventListener('keydown', onKey);

    /* ── Touch swipe ── */
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

    /* ── Thumbnails ── */
    if (images.length > 1) {
        images.forEach((url, i) => {
            const t = document.createElement('button');
            t.className = 'lb-thumb';
            t.style.backgroundImage = `url(${url})`;
            t.onclick = () => show(i, true);
            thumbStrip.appendChild(t);
        });
    }

    /* ── Assemble ── */
    btnClose.onclick = close;
    btnPrev.onclick  = () => show(current - 1, true);
    btnNext.onclick  = () => show(current + 1, true);
    stage.appendChild(imgEl);
    overlay.append(glassBack, btnClose, stage, counter, thumbStrip, btnPrev, btnNext);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    /* Entrance */
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

/**
 * Load reactions for a post and render/update the reaction bar.
 * reactions = [{ emoji, count, userReacted }]
 */
async function loadReactions(postId, token, currentUserId, reactionBarEl) {
    try {
        const rows = await pgGet(
            `reactions?post_id=eq.${postId}&select=emoji,user_id`,
            token
        );

        // Aggregate: count per reaction key + did current user react?
        const agg = {};
        rows.forEach(r => {
            if (!agg[r.emoji]) agg[r.emoji] = { count: 0, userReacted: false };
            agg[r.emoji].count++;
            if (r.user_id === currentUserId) agg[r.emoji].userReacted = true;
        });
        // r.emoji now stores the reaction key (e.g. 'like', 'heart'…)

        renderReactionBar(postId, agg, token, currentUserId, reactionBarEl);
    } catch(e) {
        console.error('loadReactions:', e);
    }
}

function renderReactionBar(postId, agg, token, currentUserId, barEl) {
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
            ${data.count > 0
                ? `<span class="reaction-count">${data.count}</span>`
                : ''}
        `;

        btn.addEventListener('click', async () => {
            const isActive = btn.classList.contains('active');
            const countEl  = btn.querySelector('.reaction-count');
            let count = parseInt(countEl?.textContent || '0');

            /* ── Optimistic update ── */
            if (isActive) {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
                count = Math.max(0, count - 1);
                if (count === 0) countEl?.remove();
                else if (countEl) countEl.textContent = count;

                try {
                    await pgDelete(
                        `reactions?post_id=eq.${postId}&user_id=eq.${currentUserId}&emoji=eq.${encodeURIComponent(key)}`,
                        token
                    );
                } catch(_) {
                    /* rollback */
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    toast('Could not remove reaction.', 'err');
                }
            } else {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                /* pop animation */
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
                    await pgPost('reactions', {
                        post_id: postId,
                        user_id: currentUserId,
                        emoji:   key,
                    }, token);
                } catch(_) {
                    /* rollback */
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
/* ══════════════════════════════════════════════════════════════
   RENDER POST CARD
   ══════════════════════════════════════════════════════════════ */

function renderPost(post, currentUserId) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';
    const avatarUrl  = post.avatar_url  || null;

    const imageUrls = (post.images && post.images.length)
        ? post.images
        : (post.image_url ? [post.image_url] : []);

    const deleteBtn = isOwner
        ? `<button class="post-delete-btn" data-id="${post.id}" aria-label="Delete post">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                   <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
               </svg>
           </button>`
        : '';

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar-wrap"></div>
            <div class="post-meta">
                <span class="post-author">${escHtml(authorName)}</span>
                <span class="post-time">${timeAgo(post.created_at)}</span>
            </div>
            ${deleteBtn}
        </div>
        ${post.content ? `<p class="post-body">${escHtml(post.content)}</p>` : ''}
        ${renderImageGallery(imageUrls)}
        <div class="post-footer">
            <div class="reaction-row" id="reactions-${post.id}"></div>
            <button class="post-comment-toggle" data-id="${post.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
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
                    <input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">
                    <button type="submit" class="comment-submit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;

    // Avatar
    card.querySelector('.post-avatar-wrap').appendChild(makeAvatar(avatarUrl, authorName, 'post-avatar'));

    // Gallery → lightbox
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

    return card;
}

/* ── Render comment ── */

function renderComment(c) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    const avatarEl = makeAvatar(c.avatar_url || null, c.author_name || 'Member', 'comment-avatar');
    div.innerHTML = `
        <div class="comment-bubble">
            <span class="comment-author">${escHtml(c.author_name || 'Member')}</span>
            <span class="comment-body">${escHtml(c.content)}</span>
            <span class="comment-time">${timeAgo(c.created_at)}</span>
        </div>
    `;
    div.insertBefore(avatarEl, div.firstChild);
    return div;
}

/* ── Load comments ── */

async function loadComments(postId, token) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            `comments?post_id=eq.${postId}&order=created_at.asc&select=id,content,created_at,user_id,profiles(full_name,avatar_url)`,
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
            return;
        }
        rows.forEach(c => {
            listEl.appendChild(renderComment({
                ...c,
                author_name: c.profiles?.full_name || 'Member',
                avatar_url:  c.profiles?.avatar_url || null,
            }));
        });
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');
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
            pgGet('posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,full_name,profiles(full_name,avatar_url)', token),
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.25;margin:0 auto 12px">
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

            // Reactions bar — load async
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
        // Local removal — realtime handles removal for other users
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
        /* Get full_name from localStorage to store in post */
        let authorName = 'Member';
        try {
            const u = JSON.parse(localStorage.getItem('econovo-user') || '{}');
            const m = u.user_metadata || {};
            authorName = m.full_name || ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || u.email || 'Member';
        } catch(_) {}

        const [newPost] = await pgPost('posts', {
            user_id:   currentUserId,
            content:   content || '',
            image_url: null,
            full_name: authorName,
        }, token);

        if (pickedFiles.length) {
            const urls = await Promise.all(pickedFiles.map(f => uploadImage(f, token, BUCKET)));
            await fetch(`${POSTS_URL}/rest/v1/posts?id=eq.${newPost.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
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

        /* Fetch and prepend OUR own post (realtime skips self-events) */
        try {
            const rows = await pgGet(
                `posts?id=eq.${newPost.id}&select=id,content,image_url,created_at,user_id,full_name,profiles(full_name,avatar_url)`,
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
        rm.type = 'button';
        rm.innerHTML = '&times;';
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

/* ── Avatar upload (profile page) ── */

async function handleAvatarUpload(file, token, userId, avatarPreviewEl) {
    try {
        const url = await uploadImage(file, token, AVATAR_BUCKET);
        await fetch(`${POSTS_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: authHeaders(token),
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
   REALTIME ENGINE — Supabase Realtime WebSocket
   ──────────────────────────────────────────────────────────────
   Uses Supabase Realtime Protocol (phoenix channels over WSS).
   Listens to postgres_changes on:
     • posts      → INSERT (new post from anyone) / DELETE (removed)
     • comments   → INSERT (new comment on any post)
     • reactions  → INSERT / DELETE (reaction added/removed)

   Architecture:
   - One persistent WebSocket per page session
   - Events dispatched to the live DOM — no full reload
   - My own INSERT/DELETE already reflected optimistically,
     so we skip self-events using user_id comparison
   ══════════════════════════════════════════════════════════════ */

let _rtSocket   = null;   // WebSocket instance
let _rtRef      = 1;      // message ref counter
let _rtToken    = null;
let _rtUserId   = null;
let _rtFeed     = null;   // feed container el
let _rtHbTimer  = null;   // heartbeat interval
let _rtChannels = [];     // joined channel names

const RT_URL = POSTS_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?vsn=1.0.0&apikey=' + POSTS_KEY;

function rtSend(msg) {
    if (_rtSocket && _rtSocket.readyState === WebSocket.OPEN) {
        _rtSocket.send(JSON.stringify(msg));
    }
}

function rtJoinChannel(table) {
    _rtRef++;
    // Supabase Realtime v2 channel format
    const topic = `realtime:${table}`;
    rtSend({
        topic,
        event: 'phx_join',
        payload: {
            config: {
                broadcast:     { self: false },
                presence:      { key: '' },
                postgres_changes: [{ event: '*', schema: 'public', table }],
            },
            access_token: _rtToken,
        },
        ref: String(_rtRef),
        join_ref: String(_rtRef),
    });
    _rtChannels.push(topic);
}

function initRealtime(token, userId, feedContainer) {
    _rtToken  = token;
    _rtUserId = userId;
    _rtFeed   = feedContainer;

    // Clean up any existing socket
    if (_rtSocket) { _rtSocket.close(); _rtSocket = null; }
    clearInterval(_rtHbTimer);

    const ws = new WebSocket(RT_URL);
    _rtSocket = ws;

    ws.onopen = () => {
        // Join postgres_changes channels (pass table name)
        rtJoinChannel('posts');
        rtJoinChannel('comments');
        rtJoinChannel('reactions');

        // Heartbeat every 25s (Supabase requires <30s)
        _rtHbTimer = setInterval(() => {
            _rtRef++;
            rtSend({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(_rtRef) });
        }, 25000);
    };

    ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }

        // Supabase Realtime v2 wraps events in phx_reply / broadcast
        // Actual postgres_changes arrive as:
        //   { event: 'postgres_changes', payload: { type: 'INSERT'|'UPDATE'|'DELETE', table, record, old_record } }
        // OR legacy v1:
        //   { event: 'INSERT'|'DELETE'|'UPDATE', topic: 'realtime:public:posts', payload: { record, old_record } }

        let type, table, record, old;

        if (msg.event === 'postgres_changes') {
            // v2 format
            type   = msg.payload?.type;
            table  = msg.payload?.table;
            record = msg.payload?.record      || {};
            old    = msg.payload?.old_record  || {};
        } else if (msg.event === 'INSERT' || msg.event === 'UPDATE' || msg.event === 'DELETE') {
            // v1 legacy format
            type   = msg.event;
            table  = msg.topic?.split(':')[2];
            record = msg.payload?.record      || {};
            old    = msg.payload?.old_record  || {};
        } else {
            return;  // heartbeat reply, join_ok, etc.
        }

        if (!type || !table) return;

        if (table === 'posts') {
            if (type === 'INSERT') onRemotePost(record);
            if (type === 'DELETE') onRemoteDeletePost(old.id || record.id);
        }
        if (table === 'comments') {
            if (type === 'INSERT') onRemoteComment(record);
        }
        if (table === 'reactions') {
            if (type === 'INSERT') onRemoteReaction(record, 'add');
            if (type === 'DELETE') onRemoteReaction(old,    'remove');
        }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
        clearInterval(_rtHbTimer);
        // Auto-reconnect after 4s
        setTimeout(() => {
            if (document.visibilityState !== 'hidden') {
                initRealtime(_rtToken, _rtUserId, _rtFeed);
            }
        }, 4000);
    };

    // Pause/resume on tab visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (!_rtSocket || _rtSocket.readyState > 1)) {
            initRealtime(_rtToken, _rtUserId, _rtFeed);
        }
    });
}

/* ── Handle remote new post ── */
async function onRemotePost(record) {
    if (!_rtFeed) return;
    // Skip if it's our own post (already rendered optimistically)
    if (record.user_id === _rtUserId) return;
    // Skip if card already exists in DOM
    if (_rtFeed.querySelector(`[data-post-id="${record.id}"]`)) return;

    // Fetch full post with profile join
    try {
        const rows = await pgGet(
            `posts?id=eq.${record.id}&select=id,content,image_url,created_at,user_id,full_name,profiles(full_name,avatar_url)`,
            _rtToken
        );
        if (!rows.length) return;
        const row      = rows[0];
        const imgRows  = await pgGet(`post_images?post_id=eq.${row.id}&select=url,position&order=position.asc`, _rtToken).catch(() => []);
        const images   = imgRows.map(r => r.url);

        const card = renderPost({
            ...row,
            author_name: row.profiles?.full_name || row.full_name || 'Member',
            avatar_url:  row.profiles?.avatar_url || null,
            images,
        }, _rtUserId);

        // Slide-in from top
        card.style.cssText += ';opacity:0;transform:translateY(-20px);transition:opacity .4s ease,transform .4s cubic-bezier(.16,1,.3,1)';

        // Insert at top of feed (before first post-card)
        const first = _rtFeed.querySelector('.post-card');
        if (first) _rtFeed.insertBefore(card, first);
        else _rtFeed.prepend(card);

        requestAnimationFrame(() => {
            card.style.opacity   = '1';
            card.style.transform = 'translateY(0)';
        });

        attachPostEvents(card, row, _rtToken, _rtUserId);

        // Load reactions for the new card
        const reactionBarEl = card.querySelector(`#reactions-${row.id}`);
        if (reactionBarEl) loadReactions(row.id, _rtToken, _rtUserId, reactionBarEl);

    } catch(e) { console.warn('onRemotePost fetch failed:', e); }
}

/* ── Handle remote post delete ── */
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

/* ── Handle remote new comment ── */
async function onRemoteComment(record) {
    const postId   = record.post_id;
    const listEl   = document.getElementById('comments-list-' + postId);
    if (!listEl) return;   // comments section not open for this post
    if (record.user_id === _rtUserId) return;  // own comment — already added optimistically

    // Fetch with profile join
    try {
        const rows = await pgGet(
            `comments?id=eq.${record.id}&select=id,content,created_at,user_id,profiles(full_name,avatar_url)`,
            _rtToken
        );
        if (!rows.length) return;
        const c    = rows[0];
        const node = renderComment({
            ...c,
            author_name: c.profiles?.full_name || 'Member',
            avatar_url:  c.profiles?.avatar_url || null,
        });

        node.style.opacity = '0';
        node.style.transform = 'translateY(8px)';
        node.style.transition = 'opacity .3s ease, transform .3s ease';

        // Remove "no comments" placeholder if present
        const empty = listEl.querySelector('.no-comments');
        if (empty) empty.remove();
        listEl.appendChild(node);

        requestAnimationFrame(() => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; });

        // Update comment count label
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) {
            const n = listEl.querySelectorAll('.comment-item').length;
            countEl.textContent = n + (n === 1 ? ' Comment' : ' Comments');
        }
    } catch(e) { console.warn('onRemoteComment fetch failed:', e); }
}

/* ── Handle remote reaction change ── */
function onRemoteReaction(record, action) {
    const postId = record.post_id;
    const key    = record.emoji;
    if (!postId || !key) return;
    if (record.user_id === _rtUserId) return;  // own reaction — already updated optimistically

    const barEl = document.getElementById('reactions-' + postId);
    if (!barEl) return;

    const btn    = barEl.querySelector(`.reaction-btn[data-key="${key}"]`);
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
        // Subtle pulse so other users see the change
        btn.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
            { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        );
    } else {
        count = Math.max(0, count - 1);
        if (count === 0) countEl?.remove();
        else if (countEl) countEl.textContent = count;
    }
}

/* ── attachPostEvents (needed by onRemotePost) ── */
function attachPostEvents(card, row, token, currentUserId) {
    const delBtn = card.querySelector('.post-delete-btn');
    if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

    const toggleBtn    = card.querySelector('.post-comment-toggle');
    const commentsEl   = card.querySelector('.post-comments');
    let commentsLoaded = false;
    toggleBtn?.addEventListener('click', () => {
        const open = commentsEl.style.display === 'block';
        commentsEl.style.display = open ? 'none' : 'block';
        if (!open && !commentsLoaded) { commentsLoaded = true; loadComments(row.id, token); }
    });

    const form = card.querySelector('.comment-form');
    form?.addEventListener('submit', async e => {
        e.preventDefault();
        const input     = form.querySelector('.comment-input');
        const text      = input.value.trim();
        if (!text) return;
        const submitBtn = form.querySelector('.comment-submit');
        submitBtn.disabled = true;

        // Optimistic comment render
        const listEl = document.getElementById('comments-list-' + row.id);
        if (listEl) {
            let userRaw = {};
            try { userRaw = JSON.parse(localStorage.getItem('econovo-user') || '{}'); } catch {}
            const meta = userRaw.user_metadata || {};
            const name = meta.full_name || ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim() || 'Me';
            const avatarUrl = null;  // we don't have it here easily
            const optimistic = renderComment({
                id: 'optimistic-' + Date.now(),
                content: text,
                created_at: new Date().toISOString(),
                author_name: name,
                avatar_url:  avatarUrl,
            });
            optimistic.style.opacity   = '0';
            optimistic.style.transform = 'translateY(8px)';
            optimistic.style.transition = 'opacity .25s ease, transform .25s ease';
            const empty = listEl.querySelector('.no-comments');
            if (empty) empty.remove();
            commentsLoaded = true;
            listEl.appendChild(optimistic);
            requestAnimationFrame(() => { optimistic.style.opacity = '1'; optimistic.style.transform = 'translateY(0)'; });
        }

        input.value = '';
        // Update count label immediately
        const countEl = document.querySelector(`.comment-count-label[data-id="${row.id}"]`);
        if (countEl && listEl) {
            const n = listEl.querySelectorAll('.comment-item').length;
            countEl.textContent = n + (n === 1 ? ' Comment' : ' Comments');
        }

        try {
            await pgPost('comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
            // Reload comments to get the real DB record (replaces optimistic)
            await loadComments(row.id, token);
        } catch {
            toast('Could not post comment.', 'err');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */

window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('main-composer');

    /* Composer avatar — show real photo if available */
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
    initRealtime(token, currentUserId, feedContainer);   // ← start live updates
    if (!createForm) return;

    /* Multi-image picker */
    window._pickedPostFiles = window._pickedPostFiles || [];
    const imageInput = createForm.querySelector('#post-image');
    if (imageInput) {
        const fresh = imageInput.cloneNode(true);
        fresh.multiple = true;
        fresh.accept   = 'image/*';
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
        textarea.addEventListener('input', () => {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    /* Publish button click — composer is a div, not a form */
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
