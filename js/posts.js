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

/* ── Lightbox — glassmorphism + touch swipe ── */

function openLightbox(images, startIndex) {
    // Remove any existing lightbox
    document.getElementById('post-lightbox')?.remove();

    let current   = (startIndex || 0 + images.length) % images.length;
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging  = false;
    let dragOffsetX = 0;

    /* ── DOM structure ── */
    const overlay = document.createElement('div');
    overlay.id = 'post-lightbox';

    // Blurred glass background
    const glassBack = document.createElement('div');
    glassBack.className = 'lb-glass-back';

    // Image stage (swipeable)
    const stage = document.createElement('div');
    stage.className = 'lb-stage';

    const imgEl = document.createElement('img');
    imgEl.className = 'lb-img';
    imgEl.draggable = false;

    // Thumbnail strip (only when >1 image)
    const thumbStrip = document.createElement('div');
    thumbStrip.className = 'lb-thumbs';

    const counter = document.createElement('div');
    counter.className = 'lb-counter';

    // Arrows
    const btnClose = document.createElement('button');
    btnClose.className = 'lb-btn lb-close';
    btnClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'lb-btn lb-prev';
    btnPrev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><polyline points="15 18 9 12 15 6"/></svg>';

    const btnNext = document.createElement('button');
    btnNext.className = 'lb-btn lb-next';
    btnNext.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><polyline points="9 18 15 12 9 6"/></svg>';

    /* ── Show image i ── */
    function show(i, animated = true) {
        const prev = current;
        current = ((i % images.length) + images.length) % images.length;

        if (animated && prev !== current) {
            const dir = current > prev ? 1 : -1;
            imgEl.style.transition = 'none';
            imgEl.style.transform  = `translateX(${dir * 60}px)`;
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
        updateGlassBackground(images[current]);
        counter.textContent = images.length > 1 ? `${current + 1} / ${images.length}` : '';

        // Update thumb strip
        thumbStrip.querySelectorAll('.lb-thumb').forEach((t, idx) => {
            t.classList.toggle('active', idx === current);
        });

        // Show/hide arrows
        btnPrev.style.display = images.length > 1 ? '' : 'none';
        btnNext.style.display = images.length > 1 ? '' : 'none';
    }

    /* ── Blurred background from current image ── */
    function updateGlassBackground(src) {
        glassBack.style.backgroundImage = `url(${src})`;
    }

    /* ── Close ── */
    function close() {
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(.97)';
        setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 220);
        document.removeEventListener('keydown', onKey);
    }

    /* ── Keyboard ── */
    function onKey(e) {
        if (e.key === 'Escape')      close();
        if (e.key === 'ArrowRight')  show(current + 1);
        if (e.key === 'ArrowLeft')   show(current - 1);
    }

    /* ── Touch / Pointer swipe ── */
    stage.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        touchStartX  = e.clientX;
        touchStartY  = e.clientY;
        isDragging   = true;
        dragOffsetX  = 0;
        stage.setPointerCapture(e.pointerId);
    }, { passive: true });

    stage.addEventListener('pointermove', e => {
        if (!isDragging) return;
        dragOffsetX = e.clientX - touchStartX;
        const dampened = dragOffsetX * 0.4;
        imgEl.style.transition = 'none';
        imgEl.style.transform  = `translateX(${dampened}px)`;
    }, { passive: true });

    stage.addEventListener('pointerup', e => {
        if (!isDragging) return;
        isDragging = false;
        const dx   = e.clientX - touchStartX;
        const dy   = Math.abs(e.clientY - touchStartY);

        imgEl.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1), opacity .2s';
        imgEl.style.transform  = 'translateX(0)';

        if (Math.abs(dx) > 48 && dy < 80) {
            if (dx < 0) show(current + 1);
            else        show(current - 1);
        }
    }, { passive: true });

    /* ── Thumb strip ── */
    if (images.length > 1) {
        images.forEach((url, i) => {
            const t = document.createElement('button');
            t.className = 'lb-thumb';
            t.style.backgroundImage = `url(${url})`;
            t.onclick = () => show(i);
            thumbStrip.appendChild(t);
        });
    }

    /* ── Build overlay ── */
    btnClose.onclick = close;
    btnPrev.onclick  = () => show(current - 1);
    btnNext.onclick  = () => show(current + 1);

    stage.appendChild(imgEl);
    overlay.append(glassBack, btnClose, stage, counter, thumbStrip);
    if (images.length > 1) overlay.append(btnPrev, btnNext);

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Entrance
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

/* ── Load posts — Infinite Scroll ── */

const POSTS_PAGE_SIZE = 10;

/* Attach a card's interactive events */
function attachPostEvents(card, row, token, currentUserId) {
    const reactionBarEl = card.querySelector(`#reactions-${row.id}`);
    if (reactionBarEl) loadReactions(row.id, token, currentUserId, reactionBarEl);

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
        try {
            await pgPost('comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
            input.value = '';
            commentsLoaded = true;
            await loadComments(row.id, token);
        } catch { toast('Could not post comment.', 'err'); }
        finally   { submitBtn.disabled = false; }
    });
}

/* Render a batch of rows into the feed */
function appendRows(rows, imagesByPost, container, token, currentUserId) {
    rows.forEach(row => {
        const card = renderPost({
            ...row,
            author_name: row.profiles?.full_name || row.full_name || 'Member',
            avatar_url:  row.profiles?.avatar_url || null,
            images:      imagesByPost[row.id] || [],
        }, currentUserId);

        // Entrance animation
        card.style.opacity   = '0';
        card.style.transform = 'translateY(16px)';
        container.appendChild(card);
        requestAnimationFrame(() => {
            card.style.transition = 'opacity .35s ease, transform .35s cubic-bezier(.16,1,.3,1)';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        });

        attachPostEvents(card, row, token, currentUserId);
    });
}

async function loadPosts(container, token, currentUserId) {
    // Clear old infinite-scroll observer if any
    if (container._infiniteObs) { container._infiniteObs.disconnect(); container._infiniteObs = null; }
    container._feedExhausted = false;
    container._feedOffset    = 0;
    container._feedLoading   = false;
    container._allImages     = null;   // cached images map

    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading posts…</div>';

    try {
        // Load all post_images once — they're small metadata rows
        const allImages = await pgGet('post_images?select=post_id,url,position&order=position.asc', token).catch(() => []);
        const imagesByPost = {};
        allImages.forEach(img => {
            if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
            imagesByPost[img.post_id].push(img.url);
        });
        container._allImages = imagesByPost;

        // First page
        const firstPage = await pgGet(
            `posts?order=created_at.desc&limit=${POSTS_PAGE_SIZE}&offset=0&select=id,content,image_url,created_at,user_id,full_name,profiles(full_name,avatar_url)`,
            token
        );

        container.innerHTML = '';

        if (!firstPage.length) {
            container.innerHTML = `<div class="posts-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.25;margin:0 auto 12px">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No posts yet. Be the first to share something!</p>
            </div>`;
            return;
        }

        appendRows(firstPage, imagesByPost, container, token, currentUserId);
        container._feedOffset = firstPage.length;

        if (firstPage.length < POSTS_PAGE_SIZE) {
            container._feedExhausted = true;
            appendEndMarker(container);
            return;
        }

        // Sentinel element — when visible, load next page
        const sentinel = document.createElement('div');
        sentinel.className = 'feed-sentinel';
        sentinel.innerHTML = '<span class="posts-spinner"></span>';
        container.appendChild(sentinel);

        const obs = new IntersectionObserver(async entries => {
            if (!entries[0].isIntersecting) return;
            if (container._feedLoading || container._feedExhausted) return;

            container._feedLoading = true;
            try {
                const nextPage = await pgGet(
                    `posts?order=created_at.desc&limit=${POSTS_PAGE_SIZE}&offset=${container._feedOffset}&select=id,content,image_url,created_at,user_id,full_name,profiles(full_name,avatar_url)`,
                    token
                );

                if (!nextPage.length) {
                    container._feedExhausted = true;
                    sentinel.remove();
                    appendEndMarker(container);
                    obs.disconnect();
                    return;
                }

                // Insert before sentinel
                const frag = document.createDocumentFragment();
                nextPage.forEach(row => {
                    const card = renderPost({
                        ...row,
                        author_name: row.profiles?.full_name || row.full_name || 'Member',
                        avatar_url:  row.profiles?.avatar_url || null,
                        images:      container._allImages[row.id] || [],
                    }, currentUserId);
                    card.style.opacity   = '0';
                    card.style.transform = 'translateY(16px)';
                    frag.appendChild(card);
                    attachPostEvents(card, row, token, currentUserId);
                });
                container.insertBefore(frag, sentinel);

                // Animate new cards
                container.querySelectorAll('.post-card[style*="opacity: 0"]').forEach(c => {
                    requestAnimationFrame(() => {
                        c.style.transition = 'opacity .35s ease, transform .35s cubic-bezier(.16,1,.3,1)';
                        c.style.opacity    = '1';
                        c.style.transform  = 'translateY(0)';
                    });
                });

                container._feedOffset += nextPage.length;
                if (nextPage.length < POSTS_PAGE_SIZE) {
                    container._feedExhausted = true;
                    sentinel.remove();
                    appendEndMarker(container);
                    obs.disconnect();
                }
            } catch (err) {
                console.error('infinite scroll page load:', err);
                toast('Could not load more posts.', 'err');
            } finally {
                container._feedLoading = false;
            }
        }, { rootMargin: '300px' });

        obs.observe(sentinel);
        container._infiniteObs = obs;

    } catch (e) {
        container.innerHTML = `<div class="posts-empty" style="border-color:rgba(200,80,80,.3);">
            <p style="color:#c94444;">Could not load posts. Please refresh.</p>
        </div>`;
        console.error('loadPosts:', e);
    }
}

function appendEndMarker(container) {
    const end = document.createElement('div');
    end.className = 'feed-end-marker';
    end.textContent = "— You're all caught up —";
    container.appendChild(end);
       }
/* ── Delete post ── */

async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
        await pgDelete(`posts?id=eq.${postId}`, token);
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateX(-8px)';
        setTimeout(() => cardEl.remove(), 320);
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
        await loadPosts(feedContainer, token, currentUserId);

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
