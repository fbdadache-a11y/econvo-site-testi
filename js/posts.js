/* ==========================================================================
   ECONOVO — posts.js  (نسخة مُصلَحة كاملة)
   ========================================================================== */

'use strict';

const POSTS_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET    = 'post-images';

/* ══════════════════════════════════════════════════════
   TOKEN HELPERS
   ══════════════════════════════════════════════════════ */

function getToken() {
    return localStorage.getItem('econovo-token') || null;
}

/* ══════════════════════════════════════════════════════
   REST HELPERS
   ══════════════════════════════════════════════════════ */

function authHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'apikey':        POSTS_KEY,
        'Authorization': 'Bearer ' + token,   // ← token فقط، لا نستخدم POSTS_KEY كـ fallback
        'Prefer':        'return=representation',
    };
}

function storageHeaders(token) {
    return {
        'apikey':        POSTS_KEY,
        'Authorization': 'Bearer ' + token,
    };
}

async function pgGet(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('GET ' + path + ' → ' + r.status + ': ' + txt);
    }
    return r.json();
}

async function pgPost(path, body, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method:  'POST',
        headers: authHeaders(token),
        body:    JSON.stringify(body),
    });

    const txt = await r.text();

    if (!r.ok) {
        throw new Error('POST ' + path + ' → ' + r.status + ': ' + txt);
    }

    // BUGFIX: مع Prefer:return=representation، Supabase يرجع array
    // إذا كانت فارغة [] → RLS منع الإدخال بصمت دون خطأ
    let parsed;
    try { parsed = JSON.parse(txt); } catch(_) { parsed = null; }

    if (Array.isArray(parsed) && parsed.length === 0) {
        throw new Error('Insert blocked — check RLS policies or missing user_id (path: ' + path + ')');
    }

    return parsed;
}

async function pgDelete(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method:  'DELETE',
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('DELETE ' + path + ' → ' + r.status + ': ' + txt);
    }
}

/* ══════════════════════════════════════════════════════
   IMAGE UPLOAD
   ══════════════════════════════════════════════════════ */

async function uploadImage(file, token) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const name = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    const path = 'public/' + name;

    const r = await fetch(POSTS_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
        method:  'POST',
        headers: {
            ...storageHeaders(token),
            'Content-Type':  file.type || 'image/jpeg',
            'Cache-Control': 'max-age=3600',   // BUGFIX: كان '3600' بدون max-age=
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
   UTILITIES
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
    return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}

function toast(msg, type = 'ok') {
    let el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        el.style.cssText = [
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px)',
            'padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:600',
            'z-index:9999;opacity:0;transition:opacity .25s,transform .25s',
            'pointer-events:none;max-width:360px;text-align:center',
        ].join(';');
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
    }, 3500);
}

/* ══════════════════════════════════════════════════════
   RENDER — post card
   ══════════════════════════════════════════════════════ */

function renderPost(post, currentUserId) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';

    const imgHtml = post.image_url
        ? '<div class="post-img-wrap"><img src="' + escHtml(post.image_url) + '" alt="Post image" class="post-img" loading="lazy"></div>'
        : '';

    const deleteBtn = isOwner
        ? '<button class="post-delete-btn" data-id="' + post.id + '" aria-label="Delete post" title="Delete post">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
          '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>' +
          '</svg></button>'
        : '';

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;
    card.innerHTML =
        '<div class="post-header">' +
            '<div class="post-avatar">' + initials(authorName) + '</div>' +
            '<div class="post-meta">' +
                '<span class="post-author">' + escHtml(authorName) + '</span>' +
                '<span class="post-time">'   + timeAgo(post.created_at) + '</span>' +
            '</div>' +
            deleteBtn +
        '</div>' +
        '<p class="post-body">' + escHtml(post.content) + '</p>' +
        imgHtml +
        '<div class="post-footer">' +
            '<button class="post-comment-toggle" data-id="' + post.id + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                '<span class="comment-count-label" data-id="' + post.id + '">Comments</span>' +
            '</button>' +
        '</div>' +
        '<div class="post-comments" id="comments-' + post.id + '" style="display:none;">' +
            '<div class="comments-list" id="comments-list-' + post.id + '"><div class="comments-loading">Loading…</div></div>' +
            '<form class="comment-form" data-post-id="' + post.id + '">' +
                '<input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">' +
                '<button type="submit" class="comment-submit">Post</button>' +
            '</form>' +
        '</div>';

    return card;
}

/* ══════════════════════════════════════════════════════
   RENDER — comment
   ══════════════════════════════════════════════════════ */

function renderComment(c) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML =
        '<span class="comment-author">' + escHtml(c.author_name || 'Member') + '</span>' +
        '<span class="comment-body">'   + escHtml(c.content) + '</span>' +
        '<span class="comment-time">'   + timeAgo(c.created_at) + '</span>';
    return div;
}

/* ══════════════════════════════════════════════════════
   LOAD COMMENTS
   ══════════════════════════════════════════════════════ */

async function loadComments(postId, token) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            'comments?post_id=eq.' + postId + '&order=created_at.asc&select=id,content,created_at,user_id,profiles(full_name)',
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
            return;
        }
        rows.forEach(c => {
            listEl.appendChild(renderComment({ ...c, author_name: c.profiles?.full_name || 'Member' }));
        });
        const countEl = document.querySelector('.comment-count-label[data-id="' + postId + '"]');
        if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');
    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
        console.error('loadComments:', e);
    }
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS
   ══════════════════════════════════════════════════════ */

async function loadPosts(container, token, currentUserId) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading posts…</div>';
    try {
        const rows = await pgGet(
            'posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name)',
            token
        );
        container.innerHTML = '';
        if (!rows.length) {
            container.innerHTML =
                '<div class="posts-empty">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.25;margin:0 auto 12px">' +
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                '<p>No posts yet. Be the first to share something with the club!</p></div>';
            return;
        }
        rows.forEach(row => {
            const card = renderPost(
                { ...row, author_name: row.profiles?.full_name || 'Member' },
                currentUserId
            );

            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

            const toggleBtn  = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('.post-comments');
            let loaded = false;
            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) { loaded = true; loadComments(row.id, token); }
            });

            const form = card.querySelector('.comment-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input     = form.querySelector('.comment-input');
                const text      = input.value.trim();
                const submitBtn = form.querySelector('.comment-submit');
                if (!text) return;
                submitBtn.disabled = true;
                submitBtn.textContent = '…';
                try {
                    await pgPost('comments', {
                        post_id: row.id,
                        user_id: currentUserId,   // BUGFIX: كان مفقوداً
                        content: text,
                    }, token);
                    input.value = '';
                    await loadComments(row.id, token);
                } catch (err) {
                    toast('Could not post comment: ' + err.message, 'err');
                    console.error(err);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Post';
                }
            });

            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML =
            '<div class="posts-empty" style="border-color:rgba(200,80,80,.3);">' +
            '<p style="color:#c94444;">Could not load posts: ' + e.message + '</p></div>';
        console.error('loadPosts:', e);
    }
}

/* ══════════════════════════════════════════════════════
   DELETE POST
   ══════════════════════════════════════════════════════ */

async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
        await pgDelete('posts?id=eq.' + postId, token);
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateX(-8px)';
        setTimeout(() => cardEl.remove(), 320);
        toast('Post deleted.');
    } catch (err) {
        toast('Could not delete post: ' + err.message, 'err');
        console.error('deletePost:', err);
    }
}

/* ══════════════════════════════════════════════════════
   CREATE POST
   ══════════════════════════════════════════════════════ */

async function handleCreatePost(form, feedContainer, token, currentUserId) {
    // BUGFIX: نبحث عن العناصر هنا بعد cloneNode (لا نستخدم variables قديمة)
    const textarea   = form.querySelector('#post-content');
    const submitBtn  = form.querySelector('#post-submit-btn');
    const preview    = form.querySelector('#post-image-preview');
    const imgWrap    = form.querySelector('#create-post-image-wrap');
    const charEl     = form.querySelector('#post-char-count');
    const alertEl    = form.querySelector('#post-alert');
    const imageInput = form.querySelector('#post-image');   // يشير للعنصر الجديد بعد cloneNode

    const content = textarea ? textarea.value.trim() : '';

    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && (!imageInput || !imageInput.files || !imageInput.files[0])) {
        if (alertEl) { alertEl.textContent = 'Write something before posting.'; alertEl.style.display = 'block'; }
        if (textarea) textarea.focus();
        return;
    }

    if (!currentUserId) {
        toast('Session expired. Please log in again.', 'err');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        let imageUrl = null;
        if (imageInput && imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadImage(imageInput.files[0], token);
        }

        await pgPost('posts', {
            user_id:   currentUserId,   // BUGFIX: كان مفقوداً
            content:   content || '',
            image_url: imageUrl,
        }, token);

        // Reset form
        if (textarea)   textarea.value = '';
        if (imageInput) imageInput.value = '';
        if (preview)    { preview.src = ''; preview.style.display = 'none'; }
        if (imgWrap)    imgWrap.style.display = 'none';
        if (charEl)     charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');
        await loadPosts(feedContainer, token, currentUserId);

    } catch (err) {
        // BUGFIX: نعرض الخطأ الحقيقي بدل رسالة عامة
        const msg = err.message.includes('RLS') || err.message.includes('blocked')
            ? 'Permission denied. Please log out and log back in.'
            : 'Failed to post: ' + err.message;
        if (alertEl) { alertEl.textContent = msg; alertEl.style.display = 'block'; }
        toast(msg, 'err');
        console.error('handleCreatePost:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publish Post';
    }
}

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */

window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('create-post-form');

    if (!feedContainer) { console.error('posts: #posts-feed not found'); return; }
    if (!token)         { console.error('posts: no token'); return; }
    if (!currentUserId) { console.error('posts: no currentUserId'); return; }

    // Avatar initials
    try {
        const raw  = localStorage.getItem('econovo-user');
        const meta = raw ? (JSON.parse(raw).user_metadata || {}) : {};
        const name = meta.full_name || meta.first_name || '';
        const el   = document.getElementById('create-post-avatar');
        if (el && name) el.textContent = name.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    } catch(_) {}

    // Load feed
    loadPosts(feedContainer, token, currentUserId);

    if (!createForm) return;

    // BUGFIX: نستبدل #post-image بنسخة جديدة لإزالة أي listener قديم من dashboard.html
    const oldInput = createForm.querySelector('#post-image');
    if (oldInput) {
        const newInput = oldInput.cloneNode(true);
        oldInput.parentNode.replaceChild(newInput, oldInput);
    }

    // الآن نربط كل الـ listeners — كلها تبحث عن العناصر عبر form.querySelector (دائماً محدّث)
    const imgInputEl = () => createForm.querySelector('#post-image');
    const previewEl  = createForm.querySelector('#post-image-preview');
    const imgWrapEl  = createForm.querySelector('#create-post-image-wrap');
    const removeBtn  = createForm.querySelector('#remove-image-btn');
    const textareaEl = createForm.querySelector('#post-content');
    const charElEl   = createForm.querySelector('#post-char-count');

    // Image preview
    const inp = imgInputEl();
    if (inp && previewEl) {
        inp.addEventListener('change', () => {
            const file = inp.files[0];
            if (!file) {
                previewEl.style.display = 'none';
                if (imgWrapEl) imgWrapEl.style.display = 'none';
                return;
            }
            const reader = new FileReader();
            reader.onload = ev => {
                previewEl.src = ev.target.result;
                previewEl.style.display = 'block';
                if (imgWrapEl) imgWrapEl.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    // Remove image
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const i = imgInputEl();
            if (i) i.value = '';
            if (previewEl) { previewEl.src = ''; previewEl.style.display = 'none'; }
            if (imgWrapEl) imgWrapEl.style.display = 'none';
        });
    }

    // Char counter
    if (textareaEl && charElEl) {
        textareaEl.addEventListener('input', () => {
            charElEl.textContent = textareaEl.value.length + ' / 1000';
        });
    }

    // Form submit
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // نجلب token جديد في كل submit للتأكد من عدم انتهاء الجلسة
        const freshToken = localStorage.getItem('econovo-token') || token;
        await handleCreatePost(createForm, feedContainer, freshToken, currentUserId);
    });
};
