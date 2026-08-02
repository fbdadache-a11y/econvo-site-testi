/* ==========================================================================
   ECONOVO — posts.js  v3
   Fixes:
   1. NEVER send user_id in POST body — RLS sets it from JWT automatically
   2. reactions table is optional — errors are silently swallowed
   3. comments POST also omits user_id (RLS handles it)
   4. uploadImage uses PUT not POST (Supabase Storage requires PUT for new files)
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
function authHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
        'Prefer': 'return=representation',
    };
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
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

async function pgDelete(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'DELETE',
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) throw new Error(await r.text());
}

/* ══════════════════════════════════════════════════════
   IMAGE UPLOAD — FIX: use PUT (required by Supabase Storage)
   and do NOT include user_id anywhere
   ══════════════════════════════════════════════════════ */
async function uploadImage(file, token) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const name = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    const path = 'public/' + name;

    const r = await fetch(POSTS_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'PUT',                        // ← PUT not POST
        headers: {
            'apikey': POSTS_KEY,
            'Authorization': 'Bearer ' + (token || POSTS_KEY),
            'Content-Type': file.type || 'image/jpeg',
            'Cache-Control': 'max-age=3600',
            'x-upsert': 'true',               // allow overwrite if collision
        },
        body: file,
    });

    if (!r.ok) {
        const txt = await r.text();
        throw new Error('Image upload failed: ' + txt);
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
    return name.trim().split(' ').slice(0, 2).map(function(w){ return w[0]; }).join('').toUpperCase();
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;')
        .replace(/\n/g, '<br>');
}

function toast(msg, type) {
    type = type || 'ok';
    var el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        el.style.cssText = [
            'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px)',
            'padding:10px 22px;border-radius:24px;font-size:.85rem;font-weight:600',
            'z-index:9999;opacity:0;transition:opacity .25s,transform .25s',
            'pointer-events:none;max-width:340px;text-align:center',
        ].join(';');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'ok' ? 'rgba(14,42,36,.92)' : 'rgba(180,50,50,.92)';
    el.style.color = '#fff';
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._timer);
    el._timer = setTimeout(function() {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3200);
}

/* ══════════════════════════════════════════════════════
   EMOJI PICKER
   ══════════════════════════════════════════════════════ */
function buildEmojiPicker(onPick) {
    var popup = document.createElement('div');
    popup.className = 'emoji-picker-popup';
    EMOJI_PALETTE.forEach(function(em) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-picker-btn';
        btn.textContent = em;
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            onPick(em);
        });
        popup.appendChild(btn);
    });
    return popup;
}

/* ══════════════════════════════════════════════════════
   REACTIONS — optional feature, fails silently
   ══════════════════════════════════════════════════════ */
async function loadReactions(postId, token, currentUserId) {
    try {
        var rows = await pgGet(
            'reactions?post_id=eq.' + postId + '&select=emoji,user_id',
            token
        );
        var counts = {};
        var myEmojis = new Set();
        rows.forEach(function(r) {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
            if (r.user_id === currentUserId) myEmojis.add(r.emoji);
        });
        return { counts: counts, myEmojis: myEmojis };
    } catch (_) {
        // reactions table may not exist — that's OK
        return { counts: {}, myEmojis: new Set() };
    }
}

async function toggleReaction(postId, emoji, btn, token, currentUserId) {
    var isActive = btn.classList.contains('active');
    var countEl  = btn.querySelector('.reaction-count');
    var count    = parseInt(countEl ? countEl.textContent : '0', 10) || 0;

    if (isActive) {
        btn.classList.remove('active');
        var newCount = Math.max(0, count - 1);
        btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
            + (newCount > 0 ? '<span class="reaction-count">' + newCount + '</span>' : '');
        try {
            await pgDelete(
                'reactions?post_id=eq.' + postId
                + '&user_id=eq.' + currentUserId
                + '&emoji=eq.' + encodeURIComponent(emoji),
                token
            );
        } catch (_) {
            // revert
            btn.classList.add('active');
            btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
                + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
        }
    } else {
        btn.classList.add('active');
        var addedCount = count + 1;
        btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
            + '<span class="reaction-count">' + addedCount + '</span>';
        try {
            // FIX: do NOT send user_id — RLS sets it from JWT
            await pgPost('reactions', { post_id: postId, emoji: emoji }, token);
        } catch (_) {
            // revert
            btn.classList.remove('active');
            btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
                + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
        }
    }
}

async function loadReactionsForCard(postId, btns, token, currentUserId) {
    var res = await loadReactions(postId, token, currentUserId);
    btns.forEach(function(btn) {
        var emoji  = btn.dataset.emoji;
        var count  = res.counts[emoji] || 0;
        var active = res.myEmojis.has(emoji);
        btn.className = 'reaction-btn' + (active ? ' active' : '');
        btn.innerHTML = '<span class="reaction-emoji">' + emoji + '</span>'
            + (count > 0 ? '<span class="reaction-count">' + count + '</span>' : '');
        btn.addEventListener('click', function() {
            toggleReaction(postId, emoji, btn, token, currentUserId);
        });
    });
}

/* ══════════════════════════════════════════════════════
   COMMENTS
   ══════════════════════════════════════════════════════ */
async function loadComments(postId, token, userInitials) {
    var listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    try {
        var rows = await pgGet(
            'comments?post_id=eq.' + postId
            + '&order=created_at.asc'
            + '&select=id,content,created_at,user_id,profiles(full_name)',
            token
        );
        listEl.innerHTML = '';
        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
        } else {
            rows.forEach(function(c) {
                var authorName = (c.profiles && c.profiles.full_name) || 'Member';
                var ini = initials(authorName);
                var div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = '<div class="comment-avatar">' + ini + '</div>'
                    + '<div class="comment-bubble">'
                    +   '<span class="comment-author">' + escHtml(authorName) + '</span>'
                    +   '<span class="comment-body">' + escHtml(c.content) + '</span>'
                    +   '<span class="comment-time">' + timeAgo(c.created_at) + '</span>'
                    + '</div>';
                listEl.appendChild(div);
            });
        }
        var countEl = document.querySelector('.comment-count-label[data-id="' + postId + '"]');
        if (countEl) {
            countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');
        }
    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c84444;">Could not load comments.</p>';
        console.error('loadComments:', e);
    }
}

/* ══════════════════════════════════════════════════════
   RENDER — single post card
   ══════════════════════════════════════════════════════ */
function renderPost(post, currentUserId) {
    var isOwner    = post.user_id === currentUserId;
    var authorName = post.author_name || 'Member';
    var ini        = initials(authorName);

    var imgHtml = post.image_url
        ? '<div class="post-img-wrap"><img src="' + escHtml(post.image_url) + '" alt="" class="post-img" loading="lazy"></div>'
        : '';

    var deleteBtn = isOwner
        ? '<button class="post-delete-btn" data-id="' + post.id + '" title="Delete post">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">'
          + '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>'
          + '</svg></button>'
        : '';

    var reactionsHtml = REACTIONS.map(function(r) {
        return '<button type="button" class="reaction-btn" title="' + r.label + '" data-emoji="' + r.emoji + '">'
            + '<span class="reaction-emoji">' + r.emoji + '</span>'
            + '</button>';
    }).join('');

    var card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;
    card.innerHTML = ''
        + '<div class="post-header">'
        +   '<div class="post-avatar">' + ini + '</div>'
        +   '<div class="post-meta">'
        +     '<span class="post-author">' + escHtml(authorName) + '</span>'
        +     '<span class="post-time">'   + timeAgo(post.created_at) + '</span>'
        +   '</div>'
        +   deleteBtn
        + '</div>'
        + (post.content ? '<p class="post-body">' + escHtml(post.content) + '</p>' : '')
        + imgHtml
        + '<div class="post-footer">'
        +   '<div class="reaction-row" id="reaction-row-' + post.id + '">' + reactionsHtml + '</div>'
        +   '<button class="post-comment-toggle" data-id="' + post.id + '">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        +     '<span class="comment-count-label" data-id="' + post.id + '">Comment</span>'
        +   '</button>'
        + '</div>'
        + '<div class="post-comments" id="comments-' + post.id + '" style="display:none;">'
        +   '<div class="comments-list" id="comments-list-' + post.id + '"><div class="comments-loading">Loading…</div></div>'
        +   '<form class="comment-form" data-post-id="' + post.id + '">'
        +     '<div class="comment-form-avatar" id="cmt-avatar-' + post.id + '">??</div>'
        +     '<input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">'
        +     '<button type="submit" class="comment-submit" title="Send">'
        +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
        +     '</button>'
        +   '</form>'
        + '</div>';

    return card;
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS
   ══════════════════════════════════════════════════════ */
async function loadPosts(container, token, currentUserId, userInitials) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading feed…</div>';
    try {
        var rows = await pgGet(
            'posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name)',
            token
        );
        container.innerHTML = '';
        if (!rows.length) {
            container.innerHTML = '<div class="posts-empty"><p>No posts yet. Be the first to share something!</p></div>';
            return;
        }
        for (var i = 0; i < rows.length; i++) {
            var row        = rows[i];
            var authorName = (row.profiles && row.profiles.full_name) || 'Member';
            var card       = renderPost(Object.assign({}, row, { author_name: authorName }), currentUserId);
            container.appendChild(card);

            // Set comment avatar
            var cmtAvatar = card.querySelector('#cmt-avatar-' + row.id);
            if (cmtAvatar) cmtAvatar.textContent = userInitials || '??';

            // Delete
            var delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) {
                (function(id, el) {
                    delBtn.addEventListener('click', function() { deletePost(id, el, token); });
                })(row.id, card);
            }

            // Reactions (async, non-blocking)
            var reactionBtns = Array.from(card.querySelectorAll('.reaction-btn'));
            loadReactionsForCard(row.id, reactionBtns, token, currentUserId);

            // Comments toggle
            var toggleBtn   = card.querySelector('.post-comment-toggle');
            var commentsEl  = card.querySelector('#comments-' + row.id);
            var commentForm = card.querySelector('.comment-form');
            var loaded      = false;

            (function(postId, toggleB, commEl, form, uIni) {
                toggleB.addEventListener('click', function() {
                    var open = commEl.style.display === 'block';
                    commEl.style.display = open ? 'none' : 'block';
                    if (!open && !loaded) { loaded = true; loadComments(postId, token, uIni); }
                });
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    var input     = form.querySelector('.comment-input');
                    var submitBtn = form.querySelector('.comment-submit');
                    var text      = input.value.trim();
                    if (!text) return;
                    submitBtn.disabled = true;
                    try {
                        // FIX: do NOT send user_id — RLS injects it from JWT
                        await pgPost('comments', { post_id: postId, content: text }, token);
                        input.value = '';
                        loaded = true;
                        await loadComments(postId, token, uIni);
                    } catch (err) {
                        toast('Could not post comment.', 'err');
                        console.error('comment submit:', err);
                    } finally {
                        submitBtn.disabled = false;
                    }
                });
            })(row.id, toggleBtn, commentsEl, commentForm, userInitials);
        }
    } catch (e) {
        container.innerHTML = '<div class="posts-empty"><p style="color:#c84444;">Could not load posts. Please refresh.</p></div>';
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
        cardEl.style.opacity    = '0';
        cardEl.style.transform  = 'translateX(-8px)';
        setTimeout(function() { cardEl.remove(); }, 320);
        toast('Post deleted.');
    } catch (err) {
        toast('Could not delete post.', 'err');
        console.error('deletePost:', err);
    }
}

/* ══════════════════════════════════════════════════════
   CREATE POST
   ══════════════════════════════════════════════════════ */
async function handleCreatePost(form, feedContainer, token, currentUserId, userInitials) {
    var textarea   = form.querySelector('#post-content');
    var imageInput = form.querySelector('#post-image');
    var submitBtn  = form.querySelector('#post-submit-btn');
    var preview    = form.querySelector('#post-image-preview');
    var charEl     = form.querySelector('#post-char-count');
    var alertEl    = form.querySelector('#post-alert');
    var imgWrap    = form.querySelector('#create-post-image-wrap');

    var content = textarea.value.trim();
    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && !(imageInput.files && imageInput.files[0])) {
        if (alertEl) { alertEl.textContent = 'Write something before posting.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        var imageUrl = null;
        if (imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadImage(imageInput.files[0], token);
        }

        // FIX: do NOT send user_id — Supabase injects it from the JWT via RLS
        await pgPost('posts', {
            content:   content || '',
            image_url: imageUrl,
        }, token);

        textarea.value = '';
        imageInput.value = '';
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (imgWrap) imgWrap.style.display = 'none';
        if (charEl)  charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');
        await loadPosts(feedContainer, token, currentUserId, userInitials);

    } catch (err) {
        if (alertEl) { alertEl.textContent = 'Failed to post: ' + err.message; alertEl.style.display = 'block'; }
        console.error('handleCreatePost:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publish';
    }
}

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
window.initPostsFeed = function(token, currentUserId) {
    var feedContainer = document.getElementById('posts-feed');
    var createForm    = document.getElementById('create-post-form');
    if (!feedContainer) return;

    // Resolve initials
    var userInitials = '??';
    try {
        var userRaw = localStorage.getItem('econovo-user');
        var userObj = userRaw ? JSON.parse(userRaw) : {};
        var meta    = userObj.user_metadata || {};
        var name    = meta.full_name
            || ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim()
            || userObj.email || '';
        if (name) {
            userInitials = name.trim().split(' ').slice(0, 2).map(function(w){ return w[0]; }).join('').toUpperCase();
        }
        var avatarEl = document.getElementById('create-post-avatar');
        if (avatarEl) avatarEl.textContent = userInitials;
    } catch (_) {}

    loadPosts(feedContainer, token, currentUserId, userInitials);

    if (!createForm) return;

    /* ── Emoji picker ── */
    var emojiTrigger = createForm.querySelector('#emoji-trigger-btn');
    var emojiPopup   = null;
    if (emojiTrigger) {
        emojiTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; return; }
            var ta = createForm.querySelector('#post-content');
            emojiPopup = buildEmojiPicker(function(em) {
                var pos = ta.selectionStart || ta.value.length;
                ta.value = ta.value.slice(0, pos) + em + ta.value.slice(pos);
                ta.focus();
                var ce = createForm.querySelector('#post-char-count');
                if (ce) ce.textContent = ta.value.length + ' / 1000';
                emojiPopup.remove(); emojiPopup = null;
            });
            var btnRect  = emojiTrigger.getBoundingClientRect();
            var formRect = createForm.getBoundingClientRect();
            createForm.style.position = 'relative';
            emojiPopup.style.position = 'absolute';
            emojiPopup.style.bottom   = (formRect.bottom - btnRect.top + 6) + 'px';
            emojiPopup.style.left     = (btnRect.left - formRect.left) + 'px';
            createForm.appendChild(emojiPopup);
        });
        document.addEventListener('click', function() {
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; }
        });
    }

    /* ── Image preview ── */
    var imgWrap   = createForm.querySelector('#create-post-image-wrap');
    var preview   = createForm.querySelector('#post-image-preview');
    var removeBtn = createForm.querySelector('#remove-image-btn');
    var fileInput = createForm.querySelector('#post-image');

    if (fileInput && preview) {
        fileInput.addEventListener('change', function() {
            var file = fileInput.files[0];
            if (!file) { if (imgWrap) imgWrap.style.display = 'none'; return; }
            var reader = new FileReader();
            reader.onload = function(ev) {
                preview.src = ev.target.result;
                preview.style.display = 'block';
                if (imgWrap) imgWrap.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            if (fileInput) fileInput.value = '';
            if (preview)   { preview.src = ''; preview.style.display = 'none'; }
            if (imgWrap)   imgWrap.style.display = 'none';
        });
    }

    /* ── Char counter ── */
    var textarea = createForm.querySelector('#post-content');
    var charEl   = createForm.querySelector('#post-char-count');
    if (textarea && charEl) {
        textarea.addEventListener('input', function() {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    /* ── Submit ── */
    createForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleCreatePost(createForm, feedContainer, token, currentUserId, userInitials);
    });
};
