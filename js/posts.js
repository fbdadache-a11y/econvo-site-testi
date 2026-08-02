/* ==========================================================================
   ECONOVO — posts.js  v4  (definitive fix)

   ROOT CAUSES fixed here:
   A) RLS policy: WITH CHECK (auth.uid() = user_id)
      → user_id MUST be in INSERT body, equal to the authenticated uid.
      Previous "fix" that removed user_id actually BROKE insertion.

   B) pgPost used 'Prefer: return=representation' which causes Supabase
      to do a SELECT after INSERT — that SELECT hits RLS and can fail
      if the profile join isn't perfect. Changed to 'return=minimal'.

   C) uploadImage: Supabase Storage accepts both POST and PUT for new files,
      but requires the correct Content-Type and no extra Prefer header.

   D) comments INSERT also needs user_id in body (same RLS pattern).

   E) The reactions table likely doesn't exist — fully isolated in try/catch
      so it never blocks the rest of the feed.
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

/* ══════════════════════════════════════════════════════
   REST HELPERS
   ══════════════════════════════════════════════════════ */

/** Headers for PostgREST reads — no Prefer needed */
function readHeaders(token) {
    return {
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
    };
}

/** Headers for PostgREST writes — return=minimal avoids SELECT after INSERT */
function writeHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
        'Prefer': 'return=minimal',
    };
}

/** GET */
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

/** INSERT — returns nothing (204), throws on error */
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
    // 201 or 204 — both are success
}

/** DELETE */
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
   IMAGE UPLOAD
   Supabase Storage: POST to /storage/v1/object/<bucket>/<path>
   Content-Type must match file type.
   Authorization must be a valid user JWT (not anon key).
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
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}

function toast(msg, type) {
    let el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);'
            + 'padding:10px 22px;border-radius:24px;font-size:.85rem;font-weight:600;'
            + 'z-index:9999;opacity:0;transition:opacity .25s,transform .25s;'
            + 'pointer-events:none;max-width:340px;text-align:center;';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = (type === 'err') ? 'rgba(180,50,50,.92)' : 'rgba(14,42,36,.92)';
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
   REACTIONS — fully isolated, never blocks feed
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
        // reactions table may not exist — silently ignore, just wire click handlers
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

    // Optimistic update
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
            // reactions RLS: user_id must equal auth.uid() → include it
            await pgInsert('reactions', { post_id: postId, user_id: currentUserId, emoji }, token);
        }
    } catch (_) {
        // Revert optimistic update on failure
        btn.classList.toggle('active', isActive);
        btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
            + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
    }
}

/* ══════════════════════════════════════════════════════
   COMMENTS — load
   ══════════════════════════════════════════════════════ */
async function loadComments(postId, token, userInitials) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        const rows = await pgGet(
            'comments?post_id=eq.' + postId
            + '&order=created_at.asc'
            + '&select=id,content,created_at,user_id,profiles(full_name)',
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
        } else {
            rows.forEach(c => {
                const name = (c.profiles && c.profiles.full_name) || 'Member';
                const div  = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML =
                    '<div class="comment-avatar">' + initials(name) + '</div>'
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
   RENDER — single post card
   ══════════════════════════════════════════════════════ */
function renderPost(post, currentUserId) {
    const isOwner = post.user_id === currentUserId;
    const name    = post.author_name || 'Member';
    const ini     = initials(name);

    const imgHtml = post.image_url
        ? '<div class="post-img-wrap"><img src="' + escHtml(post.image_url) + '" alt="" class="post-img" loading="lazy"></div>'
        : '';

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

    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;
    card.innerHTML =
        '<div class="post-header">'
        +   '<div class="post-avatar">' + ini + '</div>'
        +   '<div class="post-meta">'
        +     '<span class="post-author">' + escHtml(name) + '</span>'
        +     '<span class="post-time">'   + timeAgo(post.created_at) + '</span>'
        +   '</div>'
        +   delBtn
        + '</div>'
        + (post.content ? '<p class="post-body">' + escHtml(post.content) + '</p>' : '')
        + imgHtml
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
        +     '<div class="comment-form-avatar" id="cmt-av-' + post.id + '">??</div>'
        +     '<input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">'
        +     '<button type="submit" class="comment-submit" title="Send">'
        +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" stroke-linecap="round" stroke-linejoin="round">'
        +       '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
        +       '</svg>'
        +     '</button>'
        +   '</form>'
        + '</div>';

    return card;
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS — main feed
   ══════════════════════════════════════════════════════ */
async function loadPosts(container, token, currentUserId, userInitials) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading feed…</div>';
    try {
        const rows = await pgGet(
            'posts?order=created_at.desc'
            + '&select=id,content,image_url,created_at,user_id,profiles(full_name)',
            token
        );

        container.innerHTML = '';

        if (!rows.length) {
            container.innerHTML = '<div class="posts-empty"><p>No posts yet — be the first to share something!</p></div>';
            return;
        }

        rows.forEach(row => {
            const name = (row.profiles && row.profiles.full_name) || 'Member';
            const card = renderPost(Object.assign({}, row, { author_name: name }), currentUserId);
            container.appendChild(card);

            // Comment avatar initials
            const cmtAv = card.querySelector('#cmt-av-' + row.id);
            if (cmtAv) cmtAv.textContent = userInitials;

            // Delete
            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

            // Reactions (non-blocking)
            const rxBtns = Array.from(card.querySelectorAll('.reaction-btn'));
            loadReactionsForCard(row.id, rxBtns, token, currentUserId);

            // Comments toggle + form
            const toggleBtn  = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('#comments-' + row.id);
            const form       = card.querySelector('.comment-form');
            let loaded = false;

            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) { loaded = true; loadComments(row.id, token, userInitials); }
            });

            form.addEventListener('submit', async e => {
                e.preventDefault();
                const input   = form.querySelector('.comment-input');
                const sendBtn = form.querySelector('.comment-submit');
                const text    = input.value.trim();
                if (!text) return;
                sendBtn.disabled = true;
                try {
                    // ✅ MUST send user_id — RLS: auth.uid() = user_id
                    await pgInsert('comments', {
                        post_id: row.id,
                        user_id: currentUserId,
                        content: text,
                    }, token);
                    input.value = '';
                    loaded = true;
                    await loadComments(row.id, token, userInitials);
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
async function handleCreatePost(form, container, token, currentUserId, userInitials) {
    const textarea  = form.querySelector('#post-content');
    const fileInput = form.querySelector('#post-image');
    const submitBtn = form.querySelector('#post-submit-btn');
    const preview   = form.querySelector('#post-image-preview');
    const imgWrap   = form.querySelector('#create-post-image-wrap');
    const charEl    = form.querySelector('#post-char-count');
    const alertEl   = form.querySelector('#post-alert');

    const content = textarea.value.trim();
    const hasFile = fileInput.files && fileInput.files[0];

    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && !hasFile) {
        if (alertEl) { alertEl.textContent = 'Write something or attach an image.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        let imageUrl = null;
        if (hasFile) {
            imageUrl = await uploadImage(fileInput.files[0], token);
        }

        // ✅ MUST include user_id — RLS policy: auth.uid() = user_id
        await pgInsert('posts', {
            user_id:   currentUserId,
            content:   content,
            image_url: imageUrl,
        }, token);

        // Reset form
        textarea.value   = '';
        fileInput.value  = '';
        if (preview)  { preview.src = ''; preview.style.display = 'none'; }
        if (imgWrap)  imgWrap.style.display = 'none';
        if (charEl)   charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');
        await loadPosts(container, token, currentUserId, userInitials);

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
window.initPostsFeed = function(token, currentUserId) {
    if (!token || !currentUserId) {
        console.warn('[posts] initPostsFeed called without token or userId');
        return;
    }

    const container = document.getElementById('posts-feed');
    const form      = document.getElementById('create-post-form');
    if (!container) return;

    // Resolve user initials for avatars
    let userInitials = '??';
    try {
        const raw  = localStorage.getItem('econovo-user');
        const user = raw ? JSON.parse(raw) : {};
        const meta = user.user_metadata || {};
        const name = meta.full_name
            || ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim()
            || user.email || '';
        if (name) userInitials = initials(name);
        const av = document.getElementById('create-post-avatar');
        if (av) av.textContent = userInitials;
    } catch (_) {}

    // Load feed
    loadPosts(container, token, currentUserId, userInitials);

    if (!form) return;

    // Emoji picker
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
            form.style.position  = 'relative';
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

    // Image preview
    const fileInput = form.querySelector('#post-image');
    const preview   = form.querySelector('#post-image-preview');
    const imgWrap   = form.querySelector('#create-post-image-wrap');
    const removeBtn = form.querySelector('#remove-image-btn');

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) { if (imgWrap) imgWrap.style.display = 'none'; return; }
            const reader = new FileReader();
            reader.onload = ev => {
                if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
                if (imgWrap) imgWrap.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (fileInput) fileInput.value = '';
            if (preview)   { preview.src = ''; preview.style.display = 'none'; }
            if (imgWrap)   imgWrap.style.display = 'none';
        });
    }

    // Char counter
    const textarea = form.querySelector('#post-content');
    const charEl   = form.querySelector('#post-char-count');
    if (textarea && charEl) {
        textarea.addEventListener('input', () => {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    // Submit
    form.addEventListener('submit', async e => {
        e.preventDefault();
        await handleCreatePost(form, container, token, currentUserId, userInitials);
    });
};
