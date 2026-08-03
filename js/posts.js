/* ==========================================================================
   ECONOVO — posts.js  (v2 — multi-image + avatars)
   ========================================================================== */

'use strict';

const POSTS_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const POSTS_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';
const BUCKET         = 'post-images';
const AVATAR_BUCKET  = 'avatars';
const MAX_IMAGES     = 4;   // max photos per post

/* ── REST helpers ────────────────────────────────────────────── */

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

/* ── Image upload ────────────────────────────────────────────── */

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

/* ── Helpers ─────────────────────────────────────────────────── */

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
        el = document.createElement('div'); el.id = 'posts-toast';
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;max-width:340px;text-align:center';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'ok' ? 'rgba(14,42,36,.92)' : 'rgba(180,50,50,.92)';
    el.style.color = '#fff';
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(-50%) translateY(20px)'; }, 3200);
}

/* ── Avatar element helper ───────────────────────────────────── */

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

/* ── Image gallery renderer ──────────────────────────────────── */

function renderImageGallery(images) {
    // images: array of URL strings
    if (!images || !images.length) return '';
    const count = images.length;
    const cls   = count === 1 ? 'gallery-single' : count === 2 ? 'gallery-two' : count === 3 ? 'gallery-three' : 'gallery-four';
    const imgs  = images.map((url, i) =>
        `<div class="gallery-cell ${i >= 3 && count > 4 ? 'gallery-cell-more' : ''}" data-index="${i}">
            <img src="${escHtml(url)}" alt="Post image ${i+1}" class="gallery-img" loading="lazy">
            ${i === 3 && count > 4 ? `<div class="gallery-more-overlay">+${count - 4}</div>` : ''}
         </div>`
    ).slice(0, 4).join('');
    return `<div class="post-gallery ${cls}" data-images='${JSON.stringify(images)}'>${imgs}</div>`;
}

/* ── Lightbox ────────────────────────────────────────────────── */

function openLightbox(images, startIndex) {
    let current = startIndex || 0;

    const overlay = document.createElement('div');
    overlay.id = 'post-lightbox';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';

    const img = document.createElement('img');
    img.style.cssText = 'max-width:92vw;max-height:78vh;object-fit:contain;border-radius:8px';

    const counter = document.createElement('div');
    counter.style.cssText = 'color:rgba(255,255,255,.6);font-size:.82rem;letter-spacing:.05em';

    function show(i) {
        current = (i + images.length) % images.length;
        img.src = images[current];
        counter.textContent = `${current + 1} / ${images.length}`;
    }

    const btnClose = document.createElement('button');
    btnClose.innerHTML = '&times;';
    btnClose.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;line-height:1;opacity:.7';
    btnClose.onclick = () => overlay.remove();

    const btnPrev = document.createElement('button');
    btnPrev.innerHTML = '&#8592;';
    btnPrev.style.cssText = 'position:absolute;left:16px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;opacity:.7';
    btnPrev.onclick = () => show(current - 1);

    const btnNext = document.createElement('button');
    btnNext.innerHTML = '&#8594;';
    btnNext.style.cssText = 'position:absolute;right:16px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;opacity:.7';
    btnNext.onclick = () => show(current + 1);

    overlay.append(btnClose, img, counter);
    if (images.length > 1) overlay.append(btnPrev, btnNext);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
        if (e.key === 'ArrowRight') show(current + 1);
        if (e.key === 'ArrowLeft')  show(current - 1);
    });

    document.body.appendChild(overlay);
    show(current);
}

/* ── Render single post card ─────────────────────────────────── */

function renderPost(post, currentUserId) {
    const isOwner    = post.user_id === currentUserId;
    const authorName = post.author_name || 'Member';
    const avatarUrl  = post.avatar_url  || null;

    // Images: prefer post_images array, fallback to image_url
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
                    <button type="submit" class="comment-submit">Post</button>
                </form>
            </div>
        </div>
    `;

    // Inject avatar (real img or initials)
    const avatarWrap = card.querySelector('.post-avatar-wrap');
    avatarWrap.appendChild(makeAvatar(avatarUrl, authorName, 'post-avatar'));

    // Gallery click → lightbox
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

/* ── Render comment ──────────────────────────────────────────── */

function renderComment(c) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    const avatarEl = makeAvatar(c.avatar_url || null, c.author_name || 'Member', 'comment-avatar');
    div.innerHTML = `
        <span class="comment-author">${escHtml(c.author_name || 'Member')}</span>
        <span class="comment-body">${escHtml(c.content)}</span>
        <span class="comment-time">${timeAgo(c.created_at)}</span>
    `;
    div.insertBefore(avatarEl, div.firstChild);
    return div;
}

/* ── Load comments ───────────────────────────────────────────── */

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
            const authorName = c.profiles?.full_name || 'Member';
            const avatarUrl  = c.profiles?.avatar_url || null;
            listEl.appendChild(renderComment({ ...c, author_name: authorName, avatar_url: avatarUrl }));
        });
        const countEl = document.querySelector(`.comment-count-label[data-id="${postId}"]`);
        if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? ' Comment' : ' Comments');
    } catch (e) {
        listEl.innerHTML = '<p class="no-comments" style="color:#c94444;">Could not load comments.</p>';
        console.error('loadComments:', e);
    }
}

/* ── Load posts ──────────────────────────────────────────────── */

async function loadPosts(container, token, currentUserId) {
    container.innerHTML = '<div class="posts-loading"><span class="posts-spinner"></span> Loading posts…</div>';
    try {
        // Fetch posts + author profiles + post images in parallel
        const [rows, allImages] = await Promise.all([
            pgGet('posts?order=created_at.desc&select=id,content,image_url,created_at,user_id,profiles(full_name,avatar_url)', token),
            pgGet('post_images?select=post_id,url,position&order=position.asc', token).catch(() => []),
        ]);

        // Group images by post_id
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
            const authorName = row.profiles?.full_name || 'Member';
            const avatarUrl  = row.profiles?.avatar_url || null;
            const images     = imagesByPost[row.id] || [];

            const card = renderPost({
                ...row,
                author_name: authorName,
                avatar_url:  avatarUrl,
                images,
            }, currentUserId);

            // Delete
            const delBtn = card.querySelector('.post-delete-btn');
            if (delBtn) delBtn.addEventListener('click', () => deletePost(row.id, card, token));

            // Comments toggle
            const toggleBtn  = card.querySelector('.post-comment-toggle');
            const commentsEl = card.querySelector('.post-comments');
            let loaded = false;
            toggleBtn.addEventListener('click', () => {
                const open = commentsEl.style.display === 'block';
                commentsEl.style.display = open ? 'none' : 'block';
                if (!open && !loaded) { loaded = true; loadComments(row.id, token); }
            });

            // Comment submit
            const form = card.querySelector('.comment-form');
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const input     = form.querySelector('.comment-input');
                const text      = input.value.trim();
                if (!text) return;
                const submitBtn = form.querySelector('.comment-submit');
                submitBtn.disabled = true; submitBtn.textContent = '…';
                try {
                    await pgPost('comments', { post_id: row.id, user_id: currentUserId, content: text }, token);
                    input.value = '';
                    loaded = true;
                    await loadComments(row.id, token);
                } catch (err) {
                    toast('Could not post comment.', 'err');
                } finally {
                    submitBtn.disabled = false; submitBtn.textContent = 'Post';
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

/* ── Delete post ─────────────────────────────────────────────── */

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

/* ── Create post ─────────────────────────────────────────────── */

async function handleCreatePost(form, feedContainer, token, currentUserId) {
    const textarea   = form.querySelector('#post-content');
    const submitBtn  = form.querySelector('#post-submit-btn');
    const alertEl    = form.querySelector('#post-alert');
    const charEl     = form.querySelector('#post-char-count');

    const content    = textarea.value.trim();
    const pickedFiles = window._pickedPostFiles || [];   // set by multi-image picker

    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    if (!content && !pickedFiles.length) {
        if (alertEl) { alertEl.textContent = 'Write something or add an image before posting.'; alertEl.style.display = 'block'; }
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Posting…';

    try {
        // 1. Insert post row
        const [newPost] = await pgPost('posts', {
            user_id:   currentUserId,
            content:   content || '',
            image_url: null,    // no longer used as primary; kept for compat
        }, token);

        // 2. Upload images in parallel, then insert into post_images
        if (pickedFiles.length) {
            const urls = await Promise.all(
                pickedFiles.map(f => uploadImage(f, token, BUCKET))
            );
            // Also set image_url to first image for backward compat
            await fetch(`${POSTS_URL}/rest/v1/posts?id=eq.${newPost.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ image_url: urls[0] }),
            });

            await Promise.all(urls.map((url, i) =>
                pgPost('post_images', {
                    post_id:  newPost.id,
                    user_id:  currentUserId,
                    url,
                    position: i,
                }, token)
            ));
        }

        // 3. Reset composer
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

/* ── Multi-image picker UI ───────────────────────────────────── */

function renderPickedPreviews(form) {
    const files    = window._pickedPostFiles || [];
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
        const url = URL.createObjectURL(file);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--line-mid)';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover';
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.innerHTML = '&times;';
        rm.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,.55);border:none;color:#fff;border-radius:50%;width:18px;height:18px;line-height:17px;text-align:center;cursor:pointer;font-size:.8rem;padding:0';
        rm.onclick = () => {
            window._pickedPostFiles.splice(i, 1);
            renderPickedPreviews(form);
        };
        wrap.append(img, rm);
        previewRow.appendChild(wrap);
    });
    // Badge on image button
    const imgBtn = form.querySelector('#post-image-btn');
    if (imgBtn) {
        const badge = imgBtn.querySelector('.img-btn-badge') || Object.assign(document.createElement('span'), {
            className: 'img-btn-badge',
            style: 'position:absolute;top:-5px;right:-5px;background:var(--sage);color:var(--obsidian);border-radius:999px;font-size:.65rem;font-weight:700;padding:1px 5px;pointer-events:none',
        });
        if (!imgBtn.contains(badge)) { imgBtn.style.position='relative'; imgBtn.appendChild(badge); }
        badge.textContent = files.length ? files.length : '';
        badge.style.display = files.length ? 'block' : 'none';
    }
}

/* ── Avatar upload (Profile page) ───────────────────────────── */

async function handleAvatarUpload(file, token, userId, avatarPreviewEl) {
    try {
        const url = await uploadImage(file, token, AVATAR_BUCKET);
        // Update profiles table
        await fetch(`${POSTS_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify({ avatar_url: url, updated_at: new Date().toISOString() }),
        });
        // Show preview immediately
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

/* ── INIT ────────────────────────────────────────────────────── */

window.initPostsFeed = function(token, currentUserId) {
    const feedContainer = document.getElementById('posts-feed');
    const createForm    = document.getElementById('create-post-form');

    /* Composer avatar */
    try {
        const userRaw  = localStorage.getItem('econovo-user');
        const userObj  = userRaw ? JSON.parse(userRaw) : {};
        const meta     = userObj.user_metadata || {};
        const name     = meta.full_name || meta.first_name || userObj.email || '';
        const avatarEl = document.getElementById('create-post-avatar');
        if (avatarEl && name) {
            // Try to load real avatar from profiles
            pgGet(`profiles?id=eq.${currentUserId}&select=avatar_url`, token)
                .then(rows => {
                    const url = rows[0]?.avatar_url;
                    if (url && avatarEl) {
                        avatarEl.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = url;
                        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
                        img.onerror = () => { img.remove(); avatarEl.textContent = initials(name); };
                        avatarEl.appendChild(img);
                    } else if (avatarEl) {
                        avatarEl.textContent = initials(name);
                    }
                })
                .catch(() => { if (avatarEl) avatarEl.textContent = initials(name); });
        }
    } catch(_) {}

    if (!feedContainer) return;
    loadPosts(feedContainer, token, currentUserId);
    if (!createForm) return;

    /* Multi-image picker */
    window._pickedPostFiles = window._pickedPostFiles || [];

    const imageInput = createForm.querySelector('#post-image');
    let imgBtn = createForm.querySelector('#post-image-btn');

    // If no dedicated button, use the existing imageInput label
    if (imageInput) {
        // Clone to remove old listeners
        const fresh = imageInput.cloneNode(true);
        fresh.multiple = true;
        fresh.accept   = 'image/*';
        imageInput.parentNode.replaceChild(fresh, imageInput);

        fresh.addEventListener('change', () => {
            const incoming = Array.from(fresh.files || []);
            const remaining = MAX_IMAGES - (window._pickedPostFiles?.length || 0);
            if (incoming.length > remaining) {
                toast(`Max ${MAX_IMAGES} images per post. Only first ${remaining} added.`, 'err');
            }
            incoming.slice(0, remaining).forEach(f => window._pickedPostFiles.push(f));
            fresh.value = ''; // reset so same file can be re-added
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

    /* Submit */
    createForm.addEventListener('submit', async e => {
        e.preventDefault();
        await handleCreatePost(createForm, feedContainer, token, currentUserId);
    });

    /* Profile page — avatar upload */
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const profileAvatarEl   = document.getElementById('profile-avatar');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', () => {
            const file = avatarUploadInput.files[0];
            if (!file) return;
            handleAvatarUpload(file, token, currentUserId, profileAvatarEl);
        });
    }
};
