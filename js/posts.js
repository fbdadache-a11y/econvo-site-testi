/* ==========================================================================
   ECONOVO — posts.js (Standalone JS for External CSS)
   Features: Real Avatars, Multi-Image Gallery, Lightbox, Secure Supabase RLS
   ========================================================================== */
'use strict';

const POSTS_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET    = 'post-images';

const REACTIONS = [
    { emoji: '👍', label: 'Like'     },
    { emoji: '🔥', label: 'Fire'     },
    { emoji: '💡', label: 'Idea'     },
    { emoji: '🎉', label: 'Congrats' },
    { emoji: '❤️', label: 'Love'     },
    { emoji: '🤝', label: 'Support'  },
];

const EMOJI_PALETTE = [
    '😀','😂','🥲','😎','🤩','😍','🥳','😅',
    '👋','👍','🙌','🤝','💪','🙏','✌️','🫡',
    '🔥','💡','🚀','🎯','📈','💰','🏆','⚡',
    '🎉','🥂','🎊','✨','💫','🌟','💎','🔑',
    '❤️','🧡','💚','💙','🫶','💯','👀','🤔',
];

// Lightbox State
let currentLightboxImages = [];
let currentLightboxIndex  = 0;

/* ══════════════════════════════════════════════════════
   REST API HELPERS
   ══════════════════════════════════════════════════════ */
function readHeaders(token) {
    return {
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
    };
}

function writeHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
        'Prefer': 'return=minimal',
    };
}

async function pgGet(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        headers: readHeaders(token),
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('GET ' + path + ' → ' + r.status + ': ' + txt);
    }
    return r.json();
}

async function pgInsert(table, body, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + table, {
        method: 'POST',
        headers: writeHeaders(token),
        body: JSON.stringify(body),
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('INSERT ' + table + ' → ' + r.status + ': ' + txt);
    }
}

async function pgDelete(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'DELETE',
        headers: writeHeaders(token),
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('DELETE ' + path + ' → ' + r.status + ': ' + txt);
    }
}

/* ══════════════════════════════════════════════════════
   STORAGE UPLOAD
   ══════════════════════════════════════════════════════ */
async function uploadImage(file, token) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safe = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    const path = 'public/' + safe;

    const r = await fetch(POSTS_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: {
            'apikey': POSTS_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': file.type || 'image/jpeg',
            'Cache-Control': '3600',
            'x-upsert': 'false',
        },
        body: file,
    });

    if (!r.ok) {
        const txt = await r.text();
        throw new Error('Storage upload → ' + r.status + ': ' + txt);
    }

    return POSTS_URL + '/storage/v1/object/public/' + BUCKET + '/' + path;
}

/* ══════════════════════════════════════════════════════
   UTILITIES & AVATAR GENERATOR
   ══════════════════════════════════════════════════════ */
function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(name) {
    if (!name) return '??';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}

function renderAvatarHTML(avatarUrl, name, cssClass) {
    const cls = cssClass || 'post-avatar';
    const ini = initials(name);
    if (avatarUrl) {
        return '<div class="' + cls + '">'
             + '<img src="' + escHtml(avatarUrl) + '" alt="' + escHtml(name) + '" onerror="this.onerror=null; this.parentElement.innerHTML=\'' + ini + '\';">'
             + '</div>';
    }
    return '<div class="' + cls + '">' + ini + '</div>';
}

function toast(msg, type) {
    let el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'posts-toast ' + (type === 'err' ? 'toast-error' : 'toast-success');
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3500);
}

/* ══════════════════════════════════════════════════════
   EMOJI PICKER
   ══════════════════════════════════════════════════════ */
function buildEmojiPicker(onPick) {
    const popup = document.createElement('div');
    popup.className = 'emoji-picker-popup';
    EMOJI_PALETTE.forEach(em => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-picker-btn';
        btn.textContent = em;
        btn.addEventListener('click', e => { e.stopPropagation(); onPick(em); });
        popup.appendChild(btn);
    });
    return popup;
}

/* ══════════════════════════════════════════════════════
   LIGHTBOX MODAL
   ══════════════════════════════════════════════════════ */
function openLightbox(images, startIndex) {
    currentLightboxImages = images;
    currentLightboxIndex  = startIndex;

    let modal = document.getElementById('post-lightbox');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'post-lightbox';
        modal.className = 'post-lightbox-modal';
        modal.innerHTML = 
            '<button id="lb-close" class="lb-close-btn">&times;</button>'
          + '<button id="lb-prev" class="lb-nav-btn lb-prev-btn">&#10094;</button>'
          + '<img id="lb-img" class="lb-image" alt="">'
          + '<button id="lb-next" class="lb-nav-btn lb-next-btn">&#10095;</button>';
        
        document.body.appendChild(modal);

        modal.querySelector('#lb-close').addEventListener('click', closeLightbox);
        modal.querySelector('#lb-prev').addEventListener('click', () => updateLightbox(-1));
        modal.querySelector('#lb-next').addEventListener('click', () => updateLightbox(1));
        modal.addEventListener('click', e => { if (e.target === modal) closeLightbox(); });

        document.addEventListener('keydown', handleLbKeydown);
    }
    modal.classList.add('active');
    renderLightboxImage();
}

function renderLightboxImage() {
    const modal = document.getElementById('post-lightbox');
    if (!modal) return;
    const img  = modal.querySelector('#lb-img');
    const prev = modal.querySelector('#lb-prev');
    const next = modal.querySelector('#lb-next');

    img.src = currentLightboxImages[currentLightboxIndex];
    prev.style.display = currentLightboxImages.length > 1 ? 'block' : 'none';
    next.style.display = currentLightboxImages.length > 1 ? 'block' : 'none';
}

function updateLightbox(dir) {
    currentLightboxIndex = (currentLightboxIndex + dir + currentLightboxImages.length) % currentLightboxImages.length;
    renderLightboxImage();
}

function closeLightbox() {
    const modal = document.getElementById('post-lightbox');
    if (modal) modal.classList.remove('active');
}

function handleLbKeydown(e) {
    const modal = document.getElementById('post-lightbox');
    if (!modal || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') updateLightbox(-1);
    if (e.key === 'ArrowRight') updateLightbox(1);
}

/* ══════════════════════════════════════════════════════
   MULTI-IMAGE GALLERY BUILDER
   ══════════════════════════════════════════════════════ */
function buildGalleryHTML(images) {
    if (!images || !images.length) return '';
    
    const count = images.length;
    let gridClass = 'gallery-single';
    if (count === 2) gridClass = 'gallery-two';
    else if (count === 3) gridClass = 'gallery-three';
    else if (count >= 4) gridClass = 'gallery-four';

    const displayImages = images.slice(0, 4);
    const extraCount    = count - 4;

    let cellsHtml = displayImages.map((src, i) => {
        const isLastAndMore = (i === 3 && extraCount > 0);
        const overlay = isLastAndMore ? '<div class="gallery-more-overlay">+' + extraCount + '</div>' : '';
        return '<div class="gallery-cell" data-index="' + i + '">'
             + '<img src="' + escHtml(src) + '" class="gallery-img" loading="lazy" alt="">'
             + overlay
             + '</div>';
    }).join('');

    return '<div class="post-gallery ' + gridClass + '">' + cellsHtml + '</div>';
}

/* ══════════════════════════════════════════════════════
   REACTIONS
   ══════════════════════════════════════════════════════ */
async function loadReactionsForCard(postId, btns, token, currentUserId) {
    try {
        const rows = await pgGet(
            'reactions?post_id=eq.' + postId + '&select=emoji,user_id',
            token
        );
        const counts = {};
        const mine   = new Set();
        rows.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
            if (r.user_id === currentUserId) mine.add(r.emoji);
        });
        btns.forEach(btn => {
            const emoji  = btn.dataset.emoji;
            const count  = counts[emoji] || 0;
            const active = mine.has(emoji);
            btn.className = 'reaction-btn' + (active ? ' active' : '');
            btn.innerHTML  = '<span class="reaction-emoji">' + emoji + '</span>'
                + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
            btn.addEventListener('click', () => toggleReaction(postId, emoji, btn, token, currentUserId));
        });
    } catch (_) {
        btns.forEach(btn => {
            btn.addEventListener('click', () => toggleReaction(postId, btn.dataset.emoji, btn, token, currentUserId));
        });
    }
}

async function toggleReaction(postId, emoji, btn, token, currentUserId) {
    const isActive = btn.classList.contains('active');
    const countEl  = btn.querySelector('.reaction-count');
    const count    = parseInt(countEl ? countEl.textContent : '0', 10) || 0;
    const newCount = isActive ? Math.max(0, count - 1) : count + 1;

    btn.classList.toggle('active', !isActive);
    btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
        + (newCount > 0 ? '<span class="reaction-count">' + newCount + '</span>' : '');

    try {
        if (isActive) {
            await pgDelete(
                'reactions?post_id=eq.' + postId
                + '&user_id=eq.' + currentUserId
                + '&emoji=eq.' + encodeURIComponent(emoji),
                token
            );
        } else {
            await pgInsert('reactions', { post_id: postId, user_id: currentUserId, emoji }, token);
        }
    } catch (_) {
        btn.classList.toggle('active', isActive);
        btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
            + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
    }
}

/* ══════════════════════════════════════════════════════
   COMMENTS
   ══════════════════════════════════════════════════════ */
async function loadComments(postId, token, currentUserAvatar, currentUserName) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            'comments?post_id=eq.' + postId
            + '&order=created_at.asc'
            + '&select=id,content,created_at,user_id,profiles(full_name,avatar_url)',
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
        } else {
            rows.forEach(c => {
                const name   = (c.profiles && c.profiles.full_name) || 'Member';
                const avUrl  = (c.profiles && c.profiles.avatar_url) || null;
                const avHtml = renderAvatarHTML(avUrl, name, 'comment-avatar');

                const div  = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML =
                    avHtml
                    + '<div class="comment-bubble">'
                    +   '<span class="comment-author">' + escHtml(name) + '</span>'
                    +   '<span class="comment-body">'   + escHtml(c.content) + '</span>'
                    +   '<span class="comment-time">'   + timeAgo(c.created_at) + '</span>'
                    + '</div>';
                listEl.appendChild(div);
            });
        }
        const lbl = document.querySelector('.comment-count-label[data-id="' + postId + '"]');
        if (lbl) lbl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');
    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c84444;">Could not load comments.</p>';
        console.error('[posts] loadComments:', e);
    }
}

/* ══════════════════════════════════════════════════════
   RENDER POST CARD
   ══════════════════════════════════════════════════════ */
function renderPost(post, currentUserId, currentUserAvatar, currentUserName) {
    const isOwner  = post.user_id === currentUserId;
    const name     = post.author_name || 'Member';
    const avUrl    = post.author_avatar || null;
    const avHtml   = renderAvatarHTML(avUrl, name, 'post-avatar');

    let images = [];
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        images = post.images;
    } else if (post.image_url) {
        images = [post.image_url];
    }

    const galleryHtml = buildGalleryHTML(images);

    const delBtn = isOwner
        ? '<button class="post-delete-btn" title="Delete">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">'
          + '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>'
          + '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>'
          + '</svg></button>'
        : '';

    const rxHtml = REACTIONS.map(r =>
        '<button type="button" class="reaction-btn" title="' + r.label + '" data-emoji="' + r.emoji + '">'
        + '<span class="reaction-emoji">' + r.emoji + '</span>'
        + '</button>'
    ).join('');

    const cmtAvHtml = renderAvatarHTML(currentUserAvatar, currentUserName, 'comment-form-avatar');

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;
    card.innerHTML =
        '<div class="post-header">'
        +   avHtml
        +   '<div class="post-meta">'
        +     '<span class="post-author">' + escHtml(name) + '</span>'
        +     '<span class="post-time">'   + timeAgo(post.created_at) + '</span>'
        +   '</div>'
        +   delBtn
        + '</div>'
        + (post.content ? '<p class="post-body">' + escHtml(post.content) + '</p>' : '')
        + galleryHtml
        + '<div class="post-footer">'
        +   '<div class="reaction-row">' + rxHtml + '</div>'
        +   '<button class="post-comment-toggle">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">'
        +     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        +     '<span class="comment-count-label" data-id="' + post.id + '">Comment</span>'
        +   '</button>'
        + '</div>'
        + '<div class="post-comments" id="comments-' + post.id + '" style="display:none;">'
        +   '<div class="comments-list" id="comments-list-' + post.id + '"><div class="comments-loading">Loading…</div></div>'
        +   '<form class="comment-form">'
        +     cmtAvHtml
        +     '<input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">'
        +     '<button type="submit" class="comment-submit" title="Send">'
        +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" stroke-linecap="round" stroke-linejoin="round">'
        +       '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
        +       '</svg>'
        +     '</button>'
        +   '</form>'
        + '</div>';

    if (images.length) {
        const galEl = card.querySelector('.post-gallery');
        if (galEl) {
            galEl.addEventListener('click', e => {
                const cell = e.target.closest('.gallery-cell');
                const idx  = cell ? parseInt(cell.dataset.index, 10) : 0;
                openLightbox(images, idx);
            });
        }
    }

    return card;
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS (FEED)
   ══════════════════════════════════════════════════════ */
async function loadPosts(container, token, currentUserId, currentUserAvatar, currentUserName) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading feed…</div>';
    try {
        const rows = await pgGet(
            'posts?order=created_at.desc'
            + '&select=id,content,image_url,images,created_at,user_id,profiles(full_name,avatar_url)',
            token
        );

        container.innerHTML = '';

        if (!rows.length) {
            container.innerHTML = '<div class="posts-empty"><p>No posts yet — be the first to share something!</p></div>';
            return;
        }

        rows.forEach(row => {
            const name   = (row.profiles && row.profiles.full_name) || 'Member';
            const avatar = (row.profiles && row.profiles.avatar_url) || null;
            
            const card = renderPost(
                Object.assign({}, row, { author_name: name, author_avatar: avatar }),
                currentUserId, currentUserAvatar, currentUserName
            );
            container.appendChild(card);

            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

            const rxBtns = Array.from(card.querySelectorAll('.reaction-btn'));
            loadReactionsForCard(row.id, rxBtns, token, currentUserId);

            const toggleBtn  = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('#comments-' + row.id);
            const form       = card.querySelector('.comment-form');
            let loaded = false;

            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) { 
                    loaded = true; 
                    loadComments(row.id, token, currentUserAvatar, currentUserName); 
                }
            });

            form.addEventListener('submit', async e => {
                e.preventDefault();
                const input   = form.querySelector('.comment-input');
                const sendBtn = form.querySelector('.comment-submit');
                const text    = input.value.trim();
                if (!text) return;
                sendBtn.disabled = true;
                try {
                    await pgInsert('comments', {
                        post_id: row.id,
                        user_id: currentUserId,
                        content: text,
                    }, token);
                    input.value = '';
                    loaded = true;
                    await loadComments(row.id, token, currentUserAvatar, currentUserName);
                } catch (err) {
                    toast('Could not post comment.', 'err');
                    console.error('[posts] comment:', err);
                } finally {
                    sendBtn.disabled = false;
                }
            });
        });

    } catch (e) {
        container.innerHTML = '<div class="posts-empty"><p style="color:#c84444;">Could not load posts. Check console for details.</p></div>';
        console.error('[posts] loadPosts:', e);
    }
}

/* ══════════════════════════════════════════════════════
   DELETE
   ══════════════════════════════════════════════════════ */
async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
        await pgDelete('posts?id=eq.' + postId, token);
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity    = '0';
        cardEl.style.transform  = 'translateX(-8px)';
        setTimeout(() => cardEl.remove(), 320);
        toast('Post deleted.');
    } catch (err) {
        toast('Could not delete post.', 'err');
        console.error('[posts] delete:', err);
    }
}

/* ══════════════════════════════════════════════════════
   CREATE POST
   ══════════════════════════════════════════════════════ */
async function handleCreatePost(form, container, token, currentUserId, currentUserAvatar, currentUserName, selectedFiles) {
    const textarea  = form.querySelector('#post-content');
    const submitBtn = form.querySelector('#post-submit-btn');
    const preview   = form.querySelector('#post-image-preview');
    const imgWrap   = form.querySelector('#create-post-image-wrap');
    const charEl    = form.querySelector('#post-char-count');
    const alertEl   = form.querySelector('#post-alert');

    const content  = textarea.value.trim();
    const hasFiles = selectedFiles && selectedFiles.length > 0;

    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && !hasFiles) {
        if (alertEl) { alertEl.textContent = 'Write something or attach an image.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        let uploadedUrls = [];
        if (hasFiles) {
            const uploads = selectedFiles.slice(0, 4).map(file => uploadImage(file, token));
            uploadedUrls = await Promise.all(uploads);
        }

        const payload = {
            user_id: currentUserId,
            content: content,
            image_url: uploadedUrls[0] || null,
            images: uploadedUrls
        };

        await pgInsert('posts', payload, token);

        textarea.value = '';
        selectedFiles.length = 0;
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (imgWrap) imgWrap.style.display = 'none';
        if (charEl)  charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');
        await loadPosts(container, token, currentUserId, currentUserAvatar, currentUserName);

    } catch (err) {
        const msg = err.message || 'Unknown error';
        if (alertEl) { alertEl.textContent = 'Failed: ' + msg; alertEl.style.display = 'block'; }
        console.error('[posts] createPost:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">'
            + '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
            + '</svg> Publish';
    }
}

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
window.initPostsFeed = async function(token, currentUserId) {
    if (!token || !currentUserId) {
        console.warn('[posts] initPostsFeed called without token or userId');
        return;
    }

    const container = document.getElementById('posts-feed');
    const form      = document.getElementById('create-post-form');
    if (!container) return;

    let currentUserName   = 'Member';
    let currentUserAvatar = null;

    try {
        const p = await pgGet('profiles?id=eq.' + currentUserId + '&select=full_name,avatar_url', token);
        if (p && p[0]) {
            currentUserName   = p[0].full_name || currentUserName;
            currentUserAvatar = p[0].avatar_url || null;
        }
    } catch (_) {
        try {
            const raw  = localStorage.getItem('econovo-user');
            const user = raw ? JSON.parse(raw) : {};
            const meta = user.user_metadata || {};
            currentUserName = meta.full_name || user.email || 'Member';
        } catch (e) {}
    }

    const composerAv = document.getElementById('create-post-avatar');
    if (composerAv) {
        composerAv.innerHTML = renderAvatarHTML(currentUserAvatar, currentUserName, 'create-post-avatar-inner');
    }

    loadPosts(container, token, currentUserId, currentUserAvatar, currentUserName);

    if (!form) return;

    const emojiBtn = form.querySelector('#emoji-trigger-btn');
    let emojiPopup = null;
    if (emojiBtn) {
        emojiBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; return; }
            const ta = form.querySelector('#post-content');
            emojiPopup = buildEmojiPicker(em => {
                const pos = ta.selectionStart || ta.value.length;
                ta.value  = ta.value.slice(0, pos) + em + ta.value.slice(pos);
                ta.focus();
                const ce = form.querySelector('#post-char-count');
                if (ce) ce.textContent = ta.value.length + ' / 1000';
                emojiPopup.remove(); emojiPopup = null;
            });
            form.style.position = 'relative';
            emojiPopup.style.position = 'absolute';
            const br = emojiBtn.getBoundingClientRect();
            const fr = form.getBoundingClientRect();
            emojiPopup.style.bottom = (fr.bottom - br.top + 6) + 'px';
            emojiPopup.style.left   = Math.max(0, br.left - fr.left) + 'px';
            form.appendChild(emojiPopup);
        });
        document.addEventListener('click', () => {
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; }
        });
    }

    const selectedFiles = [];
    const fileInput = form.querySelector('#post-image');
    const preview   = form.querySelector('#post-image-preview');
    const imgWrap   = form.querySelector('#create-post-image-wrap');
    const removeBtn = form.querySelector('#remove-image-btn');

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (!fileInput.files.length) return;
            Array.from(fileInput.files).forEach(f => selectedFiles.push(f));
            if (selectedFiles.length > 4) selectedFiles.length = 4;

            const reader = new FileReader();
            reader.onload = ev => {
                if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
                if (imgWrap) imgWrap.style.display = 'block';
            };
            reader.readAsDataURL(selectedFiles[0]);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            selectedFiles.length = 0;
            if (fileInput) fileInput.value = '';
            if (preview)   { preview.src = ''; preview.style.display = 'none'; }
            if (imgWrap)   imgWrap.style.display = 'none';
        });
    }

    const textarea = form.querySelector('#post-content');
    const charEl   = form.querySelector('#post-char-count');
    if (textarea && charEl) {
        textarea.addEventListener('input', () => {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        await handleCreatePost(form, container, token, currentUserId, currentUserAvatar, currentUserName, selectedFiles);
    });
};
