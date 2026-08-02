/* ==========================================================================
   ECONOVO — posts.js
   Social feed: create posts, upload images, display with author names,
   add/view comments, delete own posts. All DOM-driven, zero page refresh.
   Uses Supabase JS Client v2 via CDN ESM (loaded in dashboard.html).
   ========================================================================== */

'use strict';

/* ══════════════════════════════════════════════════════
   CONFIG — mirrors dashboard SUPABASE_URL / KEY
   ══════════════════════════════════════════════════════ */
const POSTS_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET    = 'post-images';

/* ══════════════════════════════════════════════════════
   LOW-LEVEL REST HELPERS (Supabase REST API v1)
   We use raw fetch + PostgREST because the Supabase JS v2
   CDN bundle requires ES modules; to keep everything in
   plain <script> tags (matching the rest of the project)
   we replicate the same calls manually.
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
    return {
        'apikey': POSTS_KEY,
        'Authorization': 'Bearer ' + (token || POSTS_KEY),
    };
}

/** GET from PostgREST */
async function pgGet(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

/** POST to PostgREST */
async function pgPost(path, body, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

/** DELETE from PostgREST */
async function pgDelete(path, token) {
    const r = await fetch(POSTS_URL + '/rest/v1/' + path, {
        method: 'DELETE',
        headers: { ...authHeaders(token), 'Prefer': '' },
    });
    if (!r.ok) throw new Error(await r.text());
}

/* ══════════════════════════════════════════════════════
   IMAGE UPLOAD → Supabase Storage
   ══════════════════════════════════════════════════════ */

async function uploadImage(file, token) {
    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `public/${name}`;

    const r = await fetch(`${POSTS_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
            ...storageHeaders(token),
            'Content-Type': file.type || 'image/jpeg',
            'Cache-Control': '3600',
        },
        body: file,
    });

    if (!r.ok) {
        const txt = await r.text();
        throw new Error('Image upload failed: ' + txt);
    }

    // Return public URL
    return `${POSTS_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/* ══════════════════════════════════════════════════════
   DATE FORMATTER
   ══════════════════════════════════════════════════════ */
function timeAgo(iso) {
    const now   = Date.now();
    const then  = new Date(iso).getTime();
    const diff  = Math.floor((now - then) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400)return Math.floor(diff / 3600) + 'h ago';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ══════════════════════════════════════════════════════
   AVATAR INITIALS
   ══════════════════════════════════════════════════════ */
function initials(name) {
    if (!name) return '??';
    return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ══════════════════════════════════════════════════════
   RENDER — single post card
   ══════════════════════════════════════════════════════ */
function renderPost(post, currentUserId) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';
    const ini        = initials(authorName);

    const imgHtml = post.image_url
        ? `<div class="post-img-wrap">
               <img src="${escHtml(post.image_url)}" alt="Post image" class="post-img" loading="lazy">
           </div>`
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
        <p class="post-body">${escHtml(post.content)}</p>
        ${imgHtml}
        <div class="post-footer">
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
            <form class="comment-form" data-post-id="${post.id}">
                <input class="comment-input" type="text" placeholder="Write a comment…" maxlength="400" required autocomplete="off">
                <button type="submit" class="comment-submit">Post</button>
            </form>
        </div>
    `;

    return card;
}

/* ══════════════════════════════════════════════════════
   RENDER — single comment
   ══════════════════════════════════════════════════════ */
function renderComment(c) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
        <span class="comment-author">${escHtml(c.author_name || 'Member')}</span>
        <span class="comment-body">${escHtml(c.content)}</span>
        <span class="comment-time">${timeAgo(c.created_at)}</span>
    `;
    return div;
}

/* ══════════════════════════════════════════════════════
   ESCAPE HTML
   ══════════════════════════════════════════════════════ */
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');
}

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ══════════════════════════════════════════════════════ */
function toast(msg, type = 'ok') {
    let el = document.getElementById('posts-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posts-toast';
        el.style.cssText = [
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px)',
            'padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:600',
            'z-index:9999;opacity:0;transition:opacity .25s,transform .25s',
            'pointer-events:none;max-width:340px;text-align:center',
        ].join(';');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'ok'
        ? 'rgba(14,42,36,.92)'
        : 'rgba(180,50,50,.92)';
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
   LOAD COMMENTS for a post
   ══════════════════════════════════════════════════════ */
async function loadComments(postId, token) {
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;

    try {
        // Fetch comments with author name from profiles via select
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
            listEl.appendChild(renderComment({ ...c, author_name: authorName }));
        });

        // Update count label
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');

    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
        console.error('loadComments:', e);
    }
}

/* ══════════════════════════════════════════════════════
   LOAD POSTS — main feed
   ══════════════════════════════════════════════════════ */
async function loadPosts(container, token, currentUserId) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading posts…</div>';

    try {
        // JOIN posts with profiles to get author full_name
        const rows = await pgGet(
            'posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name)',
            token
        );

        container.innerHTML = '';

        if (!rows.length) {
            container.innerHTML = `
                <div class="posts-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.25;margin:0 auto 12px">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No posts yet. Be the first to share something with the club!</p>
                </div>`;
            return;
        }

        rows.forEach(row => {
            const authorName = row.profiles?.full_name || 'Member';
            const card = renderPost({ ...row, author_name: authorName }, currentUserId);

            // Delete button handler
            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', () => deletePost(row.id, card, token));
            }

            // Toggle comments
            const toggleBtn = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('.post-comments');
            let loaded = false;
            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) {
                    loaded = true;
                    loadComments(row.id, token);
                }
            });

            // Comment form submit
            const form = card.querySelector('.comment-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = form.querySelector('.comment-input');
                const text  = input.value.trim();
                if (!text) return;

                const submitBtn = form.querySelector('.comment-submit');
                submitBtn.disabled = true;
                submitBtn.textContent = '…';

                try {
                    await pgPost('comments', {
                        post_id: row.id,
                        content: text,
                    }, token);

                    input.value = '';
                    // Reload comments to show the new one (with author name)
                    await loadComments(row.id, token);
                } catch (err) {
                    toast('Could not post comment. Please try again.', 'err');
                    console.error(err);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Post';
                }
            });

            container.appendChild(card);
        });

    } catch (e) {
        container.innerHTML = `<div class="posts-empty" style="border-color:rgba(200,80,80,.3);">
            <p style="color:#c94444;">Could not load posts. Please refresh.</p>
        </div>`;
        console.error('loadPosts:', e);
    }
}

/* ══════════════════════════════════════════════════════
   DELETE POST
   ══════════════════════════════════════════════════════ */
async function deletePost(postId, cardEl, token) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
        await pgDelete(`posts?id=eq.${postId}`, token);
        // Animate out
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateX(-8px)';
        setTimeout(() => cardEl.remove(), 320);
        toast('Post deleted.');
    } catch (err) {
        toast('Could not delete post.', 'err');
        console.error('deletePost:', err);
    }
}

/* ══════════════════════════════════════════════════════
   CREATE POST HANDLER — wired to #create-post-form
   ══════════════════════════════════════════════════════ */
async function handleCreatePost(form, feedContainer, token, currentUserId) {
    const textarea  = form.querySelector('#post-content');
    const imageInput = form.querySelector('#post-image');
    const submitBtn = form.querySelector('#post-submit-btn');
    const preview   = form.querySelector('#post-image-preview');
    const charEl    = form.querySelector('#post-char-count');
    const alertEl   = form.querySelector('#post-alert');

    const content = textarea.value.trim();

    // Clear alert
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

        // Upload image if provided
        if (imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadImage(imageInput.files[0], token);
        }

        // Insert post
        await pgPost('posts', {
            content: content || '',
            image_url: imageUrl,
        }, token);

        // Reset form
        textarea.value = '';
        imageInput.value = '';
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (charEl)  charEl.textContent = '0 / 1000';

        toast('Post published! 🎉');

        // Reload feed
        await loadPosts(feedContainer, token, currentUserId);

    } catch (err) {
        if (alertEl) {
            alertEl.textContent = 'Failed to post. Please try again.';
            alertEl.style.display = 'block';
        }
        console.error('handleCreatePost:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Publish Post`;
    }
}

/* ══════════════════════════════════════════════════════
   INIT — called from dashboard.html after auth check
   ══════════════════════════════════════════════════════ */
window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('create-post-form');
    const imageInput    = createForm && createForm.querySelector('#post-image');
    const preview       = createForm && createForm.querySelector('#post-image-preview');
    const textarea      = createForm && createForm.querySelector('#post-content');
    const charEl        = createForm && createForm.querySelector('#post-char-count');
    const removeImgBtn  = createForm && createForm.querySelector('#remove-image-btn');

    if (!feedContainer) return;

    // Load feed immediately
    loadPosts(feedContainer, token, currentUserId);

    if (!createForm) return;

    // Image preview
    if (imageInput && preview) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (!file) { preview.style.display = 'none'; return; }
            const reader = new FileReader();
            reader.onload = e => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    // Remove image
    if (removeImgBtn && imageInput && preview) {
        removeImgBtn.addEventListener('click', () => {
            imageInput.value = '';
            preview.src = '';
            preview.style.display = 'none';
        });
    }

    // Char counter
    if (textarea && charEl) {
        textarea.addEventListener('input', () => {
            charEl.textContent = textarea.value.length + ' / 1000';
        });
    }

    // Form submit
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreatePost(createForm, feedContainer, token, currentUserId);
    });
};
