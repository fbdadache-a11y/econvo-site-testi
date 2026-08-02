/* ==========================================================================
   ECONOVO — posts.js  (Social Feed v2)
   Modern feed: post cards, emoji reactions, avatar-bubbled comments,
   emoji picker in composer, all wired to Supabase via raw REST/PostgREST.
   ========================================================================== */

'use strict';

/* ══════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════ */
const POSTS_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET    = 'post-images';

/* Emoji reactions available */
const REACTIONS = [
  { emoji: '👍', label: 'Like'     },
  { emoji: '🔥', label: 'Fire'     },
  { emoji: '💡', label: 'Idea'     },
  { emoji: '🎉', label: 'Congrats' },
  { emoji: '❤️', label: 'Love'     },
  { emoji: '🤝', label: 'Support'  },
];

/* Emoji palette for the composer */
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

/* ══════════════════════════════════════════════════════
   IMAGE UPLOAD
   ══════════════════════════════════════════════════════ */
async function uploadImage(file, token) {
    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `public/${name}`;
    const r = await fetch(`${POSTS_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...storageHeaders(token), 'Content-Type': file.type || 'image/jpeg', 'Cache-Control': 'max-age=3600' },
        body: file,
    });
    if (!r.ok) throw new Error('Image upload failed: ' + await r.text());
    return `${POSTS_URL}/storage/v1/object/public/${BUCKET}/${path}`;
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
            'padding:10px 22px;border-radius:24px;font-size:.85rem;font-weight:600',
            'z-index:9999;opacity:0;transition:opacity .25s,transform .25s',
            'pointer-events:none;max-width:340px;text-align:center;',
            'backdrop-filter:blur(8px);',
        ].join(';');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'ok' ? 'rgba(14,42,36,.92)' : 'rgba(180,50,50,.92)';
    el.style.color = '#fff';
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3200);
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
        btn.title = em;
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPick(em); });
        popup.appendChild(btn);
    });
    return popup;
}

/* ══════════════════════════════════════════════════════
   REACTIONS — load & render
   ══════════════════════════════════════════════════════ */
async function loadReactions(postId, token, currentUserId) {
    try {
        const rows = await pgGet(
            `reactions?post_id=eq.${postId}&select=emoji,user_id`,
            token
        );
        // Group by emoji
        const counts = {};
        const myEmojis = new Set();
        rows.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
            if (r.user_id === currentUserId) myEmojis.add(r.emoji);
        });
        return { counts, myEmojis };
    } catch (_) {
        return { counts: {}, myEmojis: new Set() };
    }
}

function renderReactionRow(postId, counts, myEmojis, token, currentUserId) {
    const row = document.createElement('div');
    row.className = 'reaction-row';
    row.id = `reaction-row-${postId}`;

    REACTIONS.forEach(({ emoji, label }) => {
        const count = counts[emoji] || 0;
        const active = myEmojis.has(emoji);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reaction-btn' + (active ? ' active' : '');
        btn.title = label;
        btn.dataset.emoji = emoji;
        btn.innerHTML = `<span class="reaction-emoji">${emoji}</span>`
            + (count > 0 ? `<span class="reaction-count">${count}</span>` : '');

        btn.addEventListener('click', () => toggleReaction(postId, emoji, btn, token, currentUserId, row));
        row.appendChild(btn);
    });

    return row;
}

async function toggleReaction(postId, emoji, btn, token, currentUserId, row) {
    const isActive = btn.classList.contains('active');
    // Optimistic UI
    const countEl = btn.querySelector('.reaction-count');
    let count = parseInt(countEl?.textContent || '0', 10);

    if (isActive) {
        // Remove reaction
        btn.classList.remove('active');
        count = Math.max(0, count - 1);
        if (count === 0) {
            btn.innerHTML = `<span class="reaction-emoji">${emoji}</span>`;
        } else {
            btn.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">${count}</span>`;
        }
        try {
            await pgDelete(
                `reactions?post_id=eq.${postId}&user_id=eq.${currentUserId}&emoji=eq.${encodeURIComponent(emoji)}`,
                token
            );
        } catch (_) {
            // Revert optimistic update
            btn.classList.add('active');
            btn.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">${count + 1}</span>`;
        }
    } else {
        // Add reaction
        btn.classList.add('active');
        count = count + 1;
        btn.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">${count}</span>`;
        try {
            await pgPost('reactions', {
                post_id: postId,
                user_id: currentUserId,
                emoji: emoji,
            }, token);
        } catch (_) {
            // Revert
            btn.classList.remove('active');
            const newCount = count - 1;
            btn.innerHTML = newCount > 0
                ? `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">${newCount}</span>`
                : `<span class="reaction-emoji">${emoji}</span>`;
        }
    }
}

/* ══════════════════════════════════════════════════════
   COMMENTS
   ══════════════════════════════════════════════════════ */
async function loadComments(postId, token, currentUserInitials) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;

    try {
        const rows = await pgGet(
            `comments?post_id=eq.${postId}&order=created_at.asc&select=id,content,created_at,user_id,profiles(full_name)`,
            token
        );

        listEl.innerHTML = '';

        if (!rows.length) {
            listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
            return;
        }

        rows.forEach(c => {
            const authorName = c.profiles?.full_name || 'Member';
            const ini = initials(authorName);
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-avatar">${ini}</div>
                <div class="comment-bubble">
                    <span class="comment-author">${escHtml(authorName)}</span>
                    <span class="comment-body">${escHtml(c.content)}</span>
                    <span class="comment-time">${timeAgo(c.created_at)}</span>
                </div>`;
            listEl.appendChild(div);
        });

        // Update count label
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');

    } catch (_) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
    }
}

/* ══════════════════════════════════════════════════════
   RENDER — single post card
   ══════════════════════════════════════════════════════ */
function renderPost(post, currentUserId) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';
    const ini        = initials(authorName);

    const imgHtml = post.image_url
        ? `<div class="post-img-wrap"><img src="${escHtml(post.image_url)}" alt="Post image" class="post-img" loading="lazy"></div>`
        : '';

    const deleteBtn = isOwner
        ? `<button class="post-delete-btn" data-id="${post.id}" aria-label="Delete post" title="Delete post">
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
            <div class="post-avatar">${ini}</div>
            <div class="post-meta">
                <span class="post-author">${escHtml(authorName)}</span>
                <span class="post-time">${timeAgo(post.created_at)}</span>
            </div>
            ${deleteBtn}
        </div>
        ${post.content ? `<p class="post-body">${escHtml(post.content)}</p>` : ''}
        ${imgHtml}
        <div class="post-footer" id="post-footer-${post.id}">
            <div class="reaction-row" id="reaction-row-${post.id}">
                ${REACTIONS.map(r => `
                    <button type="button" class="reaction-btn" title="${r.label}" data-emoji="${r.emoji}">
                        <span class="reaction-emoji">${r.emoji}</span>
                    </button>`).join('')}
            </div>
            <button class="post-comment-toggle" data-id="${post.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="comment-count-label" data-id="${post.id}">Comment</span>
            </button>
        </div>
        <div class="post-comments" id="comments-${post.id}" style="display:none;">
            <div class="comments-list" id="comments-list-${post.id}">
                <div class="comments-loading">Loading…</div>
            </div>
            <form class="comment-form" data-post-id="${post.id}">
                <div class="comment-form-avatar" id="cmt-avatar-${post.id}"></div>
                <input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">
                <button type="submit" class="comment-submit" title="Send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </form>
        </div>`;

    return card;
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS — main feed
   ══════════════════════════════════════════════════════ */
async function loadPosts(container, token, currentUserId, userInitials) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading feed…</div>';

    try {
        const rows = await pgGet(
            'posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name)',
            token
        );

        container.innerHTML = '';

        if (!rows.length) {
            container.innerHTML = `
                <div class="posts-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.2;margin:0 auto 12px;display:block">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No posts yet. Be the first to share something!</p>
                </div>`;
            return;
        }

        for (const row of rows) {
            const authorName = row.profiles?.full_name || 'Member';
            const card = renderPost({ ...row, author_name: authorName }, currentUserId);
            container.appendChild(card);

            // Set comment form avatar initials
            const cmtAvatar = card.querySelector(`#cmt-avatar-${row.id}`);
            if (cmtAvatar) cmtAvatar.textContent = userInitials || '??';

            // Wire delete button
            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

            // Wire reactions
            const reactionBtns = card.querySelectorAll('.reaction-btn');
            // Load real counts async
            loadReactionsForCard(row.id, reactionBtns, token, currentUserId);

            // Wire comment toggle
            const toggleBtn = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('.post-comments');
            let loaded = false;
            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) { loaded = true; loadComments(row.id, token, userInitials); }
            });

            // Wire comment form
            const form = card.querySelector('.comment-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = form.querySelector('.comment-input');
                const text  = input.value.trim();
                if (!text) return;
                const submitBtn = form.querySelector('.comment-submit');
                submitBtn.disabled = true;
                try {
                    await pgPost('comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
                    input.value = '';
                    loaded = true;
                    await loadComments(row.id, token, userInitials);
                } catch (_) {
                    toast('Could not post comment.', 'err');
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }

    } catch (e) {
        container.innerHTML = `<div class="posts-empty" style="border-color:rgba(200,80,80,.3);">
            <p style="color:#c94444;">Could not load posts. Please refresh.</p>
        </div>`;
        console.error('loadPosts:', e);
    }
}

async function loadReactionsForCard(postId, btns, token, currentUserId) {
    const { counts, myEmojis } = await loadReactions(postId, token, currentUserId);
    btns.forEach(btn => {
        const emoji = btn.dataset.emoji;
        const count = counts[emoji] || 0;
        const active = myEmojis.has(emoji);
        btn.className = 'reaction-btn' + (active ? ' active' : '');
        btn.innerHTML = `<span class="reaction-emoji">${emoji}</span>`
            + (count > 0 ? `<span class="reaction-count">${count}</span>` : '');
        btn.addEventListener('click', () => toggleReaction(postId, emoji, btn, token, currentUserId, btn.parentElement));
    });
}

/* ══════════════════════════════════════════════════════
   DELETE POST
   ══════════════════════════════════════════════════════ */
async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
        await pgDelete(`posts?id=eq.${postId}`, token);
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateX(-8px)';
        setTimeout(() => cardEl.remove(), 320);
        toast('Post deleted.');
    } catch (_) {
        toast('Could not delete post.', 'err');
    }
}

/* ══════════════════════════════════════════════════════
   CREATE POST
   ══════════════════════════════════════════════════════ */
async function handleCreatePost(form, feedContainer, token, currentUserId, userInitials) {
    const textarea   = form.querySelector('#post-content');
    const imageInput = form.querySelector('#post-image');
    const submitBtn  = form.querySelector('#post-submit-btn');
    const preview    = form.querySelector('#post-image-preview');
    const charEl     = form.querySelector('#post-char-count');
    const alertEl    = form.querySelector('#post-alert');
    const imgWrap    = form.querySelector('#create-post-image-wrap');

    const content = textarea.value.trim();
    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && (!imageInput.files || !imageInput.files[0])) {
        if (alertEl) { alertEl.textContent = 'Write something before posting.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        let imageUrl = null;
        if (imageInput.files && imageInput.files[0]) imageUrl = await uploadImage(imageInput.files[0], token);

        await pgPost('posts', { user_id: currentUserId, content: content || '', image_url: imageUrl }, token);

        textarea.value = '';
        imageInput.value = '';
        if (preview)  { preview.src = ''; preview.style.display = 'none'; }
        if (imgWrap)  imgWrap.style.display = 'none';
        if (charEl)   charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');
        await loadPosts(feedContainer, token, currentUserId, userInitials);

    } catch (_) {
        if (alertEl) { alertEl.textContent = 'Failed to post. Please try again.'; alertEl.style.display = 'block'; }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Publish`;
    }
}

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('create-post-form');
    if (!feedContainer) return;

    // Resolve user display name
    let userInitials = '??';
    try {
        const userRaw = localStorage.getItem('econovo-user');
        const userObj = userRaw ? JSON.parse(userRaw) : {};
        const meta    = userObj.user_metadata || {};
        const name    = meta.full_name || meta.first_name || userObj.email || '';
        if (name) {
            userInitials = name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        }
        const avatarEl = document.getElementById('create-post-avatar');
        if (avatarEl) avatarEl.textContent = userInitials;
    } catch(_) {}

    loadPosts(feedContainer, token, currentUserId, userInitials);

    if (!createForm) return;

    /* ── Emoji picker in composer ── */
    const emojiTrigger = createForm.querySelector('#emoji-trigger-btn');
    let emojiPopup = null;

    if (emojiTrigger) {
        emojiTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; return; }
            const textarea = createForm.querySelector('#post-content');
            emojiPopup = buildEmojiPicker((em) => {
                const pos = textarea.selectionStart || textarea.value.length;
                const val = textarea.value;
                textarea.value = val.slice(0, pos) + em + val.slice(pos);
                textarea.focus();
                // Update char count
                const charEl = createForm.querySelector('#post-char-count');
                if (charEl) charEl.textContent = textarea.value.length + ' / 1000';
                emojiPopup.remove(); emojiPopup = null;
            });
            emojiPopup.style.position = 'absolute';
            emojiTrigger.style.position = 'relative';

            // Position below button
            const btnRect = emojiTrigger.getBoundingClientRect();
            const formRect = createForm.getBoundingClientRect();
            emojiPopup.style.top = (btnRect.bottom - formRect.top + 4) + 'px';
            emojiPopup.style.left = (btnRect.left - formRect.left) + 'px';
            createForm.style.position = 'relative';
            createForm.appendChild(emojiPopup);
        });

        document.addEventListener('click', () => {
            if (emojiPopup) { emojiPopup.remove(); emojiPopup = null; }
        });
    }

    /* ── Image preview ── */
    const imgWrap    = createForm.querySelector('#create-post-image-wrap');
    const preview    = createForm.querySelector('#post-image-preview');
    const removeBtn  = createForm.querySelector('#remove-image-btn');
    const freshInput = createForm.querySelector('#post-image');

    if (freshInput && preview) {
        freshInput.addEventListener('change', () => {
            const file = freshInput.files[0];
            if (!file) { if (imgWrap) imgWrap.style.display = 'none'; return; }
            const reader = new FileReader();
            reader.onload = e2 => {
                preview.src = e2.target.result;
                preview.style.display = 'block';
                if (imgWrap) imgWrap.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const inp = createForm.querySelector('#post-image');
            if (inp) inp.value = '';
            if (preview) { preview.src = ''; preview.style.display = 'none'; }
            if (imgWrap) imgWrap.style.display = 'none';
        });
    }

    /* ── Char counter ── */
    const textarea = createForm.querySelector('#post-content');
    const charEl   = createForm.querySelector('#post-char-count');
    if (textarea && charEl) {
        textarea.addEventListener('input', () => {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    /* ── Form submit ── */
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreatePost(createForm, feedContainer, token, currentUserId, userInitials);
    });
};
