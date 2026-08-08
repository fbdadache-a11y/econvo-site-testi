/* ==========================================================================
   ECONOVO — admin.js
   Powers pages/admin.html: member approval queue, member directory,
   announcements CRUD, events CRUD, activity log.

   Depends on: js/auth.js (window.EconovoAuth)
   Talks directly to Supabase REST (PostgREST) — no framework.
   ========================================================================== */

(function () {
    'use strict';

    const SUPABASE_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';

    let ME    = null;   // { id, full_name, role, status, ... }
    let TOKEN = null;

    /* ── low-level REST helper ─────────────────────────────────── */
    async function api(path, options = {}) {
        const res = await fetch(SUPABASE_URL + path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + TOKEN,
                ...(options.headers || {}),
            },
        });
        if (res.status === 204) return null;
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && (data.message || data.error_description)) || 'Request failed');
        return data;
    }

    /* ── toast ──────────────────────────────────────────────────── */
    function toast(msg, kind = 'ok') {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.style.background = kind === 'ok' ? '#0E2A24' : '#c94444';
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(el._t);
        el._t = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(12px)';
        }, 2600);
    }

    function escH(str) {
        const d = document.createElement('div');
        d.textContent = str == null ? '' : String(str);
        return d.innerHTML;
    }

    function initials(name) {
        if (!name) return '?';
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
    }

    function timeAgo(iso) {
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    /* ── audit log writer — best-effort, never blocks the UI ────── */
    async function logAction(action, targetId, targetTable, notes) {
        try {
            await api('/rest/v1/admin_actions', {
                method: 'POST',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    actor_id: ME.id, action, target_id: targetId,
                    target_table: targetTable, notes: notes || null
                }),
            });
        } catch (e) { /* logging failure should never break the moderation action */ }
    }

    /* ══════════════════════════════════════════════════════════════
       GATE — confirm the visitor is an approved admin before
       rendering anything. Reuses EconovoAuth.requireAdmin(), which
       already redirects non-admins to dashboard.html / login.html.
    ══════════════════════════════════════════════════════════════ */
    async function boot() {
        if (!window.EconovoAuth) {
            document.getElementById('gate').innerHTML =
                '<div class="gate-title">Auth module missing</div><div class="gate-sub">js/auth.js failed to load.</div>';
            return;
        }

        TOKEN = EconovoAuth.getToken();
        const profile = await EconovoAuth.requireAdmin(); // redirects if not admin
        if (!profile) return; // already navigated away

        ME = profile;

        document.getElementById('gate').style.display = 'none';
        document.getElementById('adminApp').style.display = 'block';
        document.getElementById('whoName').textContent = ME.full_name || 'Admin';
        document.getElementById('whoAv').textContent = initials(ME.full_name);

        if (window.lucide) window.lucide.createIcons();

        initNav();
        loadPending();
        loadMembers();
        loadAnnouncements();
        loadEvents();
        loadLog();
        bindComposers();
    }

    /* ── sidebar navigation ─────────────────────────────────────── */
    function initNav() {
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
                link.classList.add('active');
                document.getElementById('view-' + link.dataset.view)?.classList.add('active');
            });
        });
    }

    /* ══════════════════════════════════════════════════════════════
       PENDING MEMBERS
    ══════════════════════════════════════════════════════════════ */
    async function loadPending() {
        const box = document.getElementById('pendingList');
        try {
            const rows = await api('/rest/v1/pending_members?select=*');
            const badge = document.getElementById('pendingBadge');
            badge.textContent = rows.length;
            badge.classList.toggle('zero', rows.length === 0);

            if (!rows.length) {
                box.innerHTML = '<div class="admin-empty">No pending sign-ups. New members will appear here.</div>';
                return;
            }

            box.innerHTML = rows.map(m => `
                <div class="member-card" data-id="${m.id}">
                    <div class="member-av">${m.avatar_url ? `<img src="${escH(m.avatar_url)}" alt="">` : initials(m.full_name)}</div>
                    <div class="member-info">
                        <div class="member-name">${escH(m.full_name || 'Unnamed')}</div>
                        <div class="member-email">${escH(m.email || '')}</div>
                        <div class="member-meta">${m.major ? escH(m.major) + ' · ' : ''}${m.year ? escH(m.year) + ' · ' : ''}Applied ${timeAgo(m.created_at)}</div>
                    </div>
                    <div class="member-actions">
                        <button class="btn-approve" data-action="approve" data-id="${m.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                            Approve
                        </button>
                        <button class="btn-reject" data-action="reject" data-id="${m.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            Reject
                        </button>
                    </div>
                </div>
            `).join('');

            box.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => handlePendingAction(btn.dataset.id, btn.dataset.action, btn));
            });
        } catch (e) {
            box.innerHTML = `<div class="admin-empty">Couldn't load pending members: ${escH(e.message)}</div>`;
        }
    }

    async function handlePendingAction(id, action, btn) {
        const card = btn.closest('.member-card');
        card.style.opacity = '.5';
        card.style.pointerEvents = 'none';

        const status = action === 'approve' ? 'approved' : 'rejected';
        try {
            await api(`/rest/v1/profiles?id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    status,
                    approved_by: ME.id,
                    approved_at: new Date().toISOString(),
                }),
            });
            await logAction(action === 'approve' ? 'approve_member' : 'reject_member', id, 'profiles');
            toast(action === 'approve' ? 'Member approved' : 'Member rejected', 'ok');
            card.style.transition = 'opacity .25s, transform .25s';
            card.style.transform = 'translateX(20px)';
            setTimeout(() => { loadPending(); loadMembers(); loadLog(); }, 220);
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
            card.style.opacity = '1';
            card.style.pointerEvents = '';
        }
    }

    /* ══════════════════════════════════════════════════════════════
       ALL MEMBERS
    ══════════════════════════════════════════════════════════════ */
    async function loadMembers() {
        const box = document.getElementById('membersList');
        const statsBox = document.getElementById('memberStats');
        try {
            const rows = await api('/rest/v1/profiles?select=id,full_name,role,status,major,year,avatar_url,created_at&order=created_at.desc');

            const total    = rows.length;
            const approved = rows.filter(r => r.status === 'approved').length;
            const admins   = rows.filter(r => r.role === 'admin').length;
            const pending  = rows.filter(r => r.status === 'pending').length;

            statsBox.innerHTML = `
                <div class="admin-stat-card"><div class="admin-stat-num">${total}</div><div class="admin-stat-lbl">Total</div></div>
                <div class="admin-stat-card"><div class="admin-stat-num">${approved}</div><div class="admin-stat-lbl">Approved</div></div>
                <div class="admin-stat-card"><div class="admin-stat-num">${pending}</div><div class="admin-stat-lbl">Pending</div></div>
                <div class="admin-stat-card"><div class="admin-stat-num">${admins}</div><div class="admin-stat-lbl">Admins</div></div>
            `;

            if (!rows.length) {
                box.innerHTML = '<div class="admin-empty">No members yet.</div>';
                return;
            }

            box.innerHTML = rows.map(m => `
                <div class="member-card" data-id="${m.id}">
                    <div class="member-av">${m.avatar_url ? `<img src="${escH(m.avatar_url)}" alt="">` : initials(m.full_name)}</div>
                    <div class="member-info">
                        <div class="member-name">${escH(m.full_name || 'Unnamed')}
                            <span class="role-pill ${m.role}">${m.role}</span>
                        </div>
                        <div class="member-meta">${m.major ? escH(m.major) + ' · ' : ''}${m.year ? escH(m.year) + ' · ' : ''}Joined ${timeAgo(m.created_at)} · <strong style="color:var(--text-soft)">${m.status}</strong></div>
                    </div>
                    ${m.id !== ME.id ? `
                    <div class="member-actions">
                        ${m.role === 'admin'
                            ? `<button class="icon-action-btn" data-action="demote" data-id="${m.id}" title="Remove admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 8l-5 5M17 8l5 5"/></svg></button>`
                            : `<button class="icon-action-btn" data-action="promote" data-id="${m.id}" title="Make admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"/></svg></button>`
                        }
                    </div>` : '<span style="font-size:.72rem;color:var(--text-muted);flex-shrink:0">You</span>'}
                </div>
            `).join('');

            box.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => handleRoleAction(btn.dataset.id, btn.dataset.action));
            });
        } catch (e) {
            box.innerHTML = `<div class="admin-empty">Couldn't load members: ${escH(e.message)}</div>`;
        }
    }

    async function handleRoleAction(id, action) {
        const role = action === 'promote' ? 'admin' : 'member';
        if (action === 'promote' && !confirm('Grant this member full admin access?')) return;
        if (action === 'demote'  && !confirm('Remove admin access from this member?')) return;

        try {
            await api(`/rest/v1/profiles?id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ role }),
            });
            await logAction(action === 'promote' ? 'promote_admin' : 'demote_admin', id, 'profiles');
            toast(action === 'promote' ? 'Promoted to admin' : 'Admin access removed', 'ok');
            loadMembers();
            loadLog();
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
        }
    }

    /* ══════════════════════════════════════════════════════════════
       ANNOUNCEMENTS — CRUD
    ══════════════════════════════════════════════════════════════ */
    async function loadAnnouncements() {
        const box = document.getElementById('annList');
        try {
            const rows = await api('/rest/v1/announcements?select=*&order=created_at.desc');
            if (!rows.length) {
                box.innerHTML = '<div class="admin-empty">No announcements yet. Publish one above.</div>';
                return;
            }
            box.innerHTML = rows.map(a => `
                <div class="admin-list-item" data-id="${a.id}">
                    <span class="status-pill ${a.published ? 'published' : 'draft'}">${a.published ? 'Live' : 'Draft'}</span>
                    <div class="admin-list-body">
                        <div class="admin-list-title">${escH(a.title)}</div>
                        <div class="admin-list-meta">${a.date_label ? escH(a.date_label) + ' · ' : ''}${timeAgo(a.created_at)}</div>
                        <div class="admin-list-text">${escH(a.body)}</div>
                    </div>
                    <div class="admin-list-actions">
                        <button class="icon-action-btn" data-action="toggle-ann" data-id="${a.id}" data-pub="${a.published}" title="${a.published ? 'Unpublish' : 'Publish'}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${a.published
                                ? '<path d="m15 18-6-6 6-6"/>'
                                : '<path d="M20 6 9 17l-5-5"/>'}</svg>
                        </button>
                        <button class="icon-action-btn danger" data-action="delete-ann" data-id="${a.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');

            box.querySelectorAll('[data-action="toggle-ann"]').forEach(btn => {
                btn.addEventListener('click', () => toggleAnnouncement(btn.dataset.id, btn.dataset.pub === 'true'));
            });
            box.querySelectorAll('[data-action="delete-ann"]').forEach(btn => {
                btn.addEventListener('click', () => deleteRow('announcements', btn.dataset.id, loadAnnouncements));
            });
        } catch (e) {
            box.innerHTML = `<div class="admin-empty">Couldn't load announcements: ${escH(e.message)}</div>`;
        }
    }

    async function toggleAnnouncement(id, currentlyPublished) {
        try {
            await api(`/rest/v1/announcements?id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ published: !currentlyPublished }),
            });
            toast(!currentlyPublished ? 'Announcement published' : 'Moved to draft', 'ok');
            loadAnnouncements();
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
        }
    }

    function bindComposers() {
        document.getElementById('btnPublishAnn')?.addEventListener('click', publishAnnouncement);
        document.getElementById('btnPublishEv')?.addEventListener('click', publishEvent);
    }

    async function publishAnnouncement() {
        const title = document.getElementById('annTitle').value.trim();
        const body  = document.getElementById('annBody').value.trim();
        const dateLabel = document.getElementById('annDateLabel').value.trim();
        const published = document.getElementById('annPublished').value === 'true';
        const btn = document.getElementById('btnPublishAnn');

        if (!title || !body) { toast('Title and body are required', 'err'); return; }

        btn.disabled = true;
        try {
            await api('/rest/v1/announcements', {
                method: 'POST',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    title, body,
                    date_label: dateLabel || null,
                    published,
                    created_by: ME.id,
                }),
            });
            await logAction('publish_announcement', null, 'announcements', title);
            toast('Announcement published', 'ok');
            document.getElementById('annTitle').value = '';
            document.getElementById('annBody').value = '';
            document.getElementById('annDateLabel').value = '';
            loadAnnouncements();
            loadLog();
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
        } finally {
            btn.disabled = false;
        }
    }

    /* ══════════════════════════════════════════════════════════════
       EVENTS — CRUD
    ══════════════════════════════════════════════════════════════ */
    async function loadEvents() {
        const box = document.getElementById('evList');
        try {
            const rows = await api('/rest/v1/events?select=*&order=event_date.desc');
            if (!rows.length) {
                box.innerHTML = '<div class="admin-empty">No events yet. Publish one above.</div>';
                return;
            }
            box.innerHTML = rows.map(ev => {
                const d = new Date(ev.event_date);
                const isPast = d.getTime() < Date.now();
                return `
                <div class="admin-list-item" data-id="${ev.id}">
                    <span class="status-pill ${isPast ? 'draft' : 'published'}">${isPast ? 'Past' : 'Upcoming'}</span>
                    <div class="admin-list-body">
                        <div class="admin-list-title">${escH(ev.title)}</div>
                        <div class="admin-list-meta">${d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${ev.tag ? ' · ' + escH(ev.tag) : ''}</div>
                        <div class="admin-list-text">${escH(ev.description || '')}</div>
                    </div>
                    <div class="admin-list-actions">
                        <button class="icon-action-btn danger" data-action="delete-ev" data-id="${ev.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
                        </button>
                    </div>
                </div>`;
            }).join('');

            box.querySelectorAll('[data-action="delete-ev"]').forEach(btn => {
                btn.addEventListener('click', () => deleteRow('events', btn.dataset.id, loadEvents));
            });
        } catch (e) {
            box.innerHTML = `<div class="admin-empty">Couldn't load events: ${escH(e.message)}</div>`;
        }
    }

    async function publishEvent() {
        const title = document.getElementById('evTitle').value.trim();
        const desc  = document.getElementById('evDesc').value.trim();
        const dateVal = document.getElementById('evDate').value;
        const tag = document.getElementById('evTag').value.trim();
        const btn = document.getElementById('btnPublishEv');

        if (!title || !dateVal) { toast('Title and date are required', 'err'); return; }

        const d = new Date(dateVal);
        const monthShort = d.toLocaleString(undefined, { month: 'short' });
        const dayNum = String(d.getDate());

        btn.disabled = true;
        try {
            await api('/rest/v1/events', {
                method: 'POST',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    title, description: desc || null,
                    event_date: d.toISOString(),
                    month_short: monthShort, day_num: dayNum,
                    tag: tag || null,
                    created_by: ME.id,
                }),
            });
            await logAction('publish_event', null, 'events', title);
            toast('Event published', 'ok');
            document.getElementById('evTitle').value = '';
            document.getElementById('evDesc').value = '';
            document.getElementById('evDate').value = '';
            document.getElementById('evTag').value = '';
            loadEvents();
            loadLog();
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
        } finally {
            btn.disabled = false;
        }
    }

    /* ── shared delete helper ──────────────────────────────────── */
    async function deleteRow(table, id, reload) {
        if (!confirm('Delete this permanently? This cannot be undone.')) return;
        try {
            await api(`/rest/v1/${table}?id=eq.${id}`, {
                method: 'DELETE',
                headers: { 'Prefer': 'return=minimal' },
            });
            await logAction('delete_' + table.slice(0, -1), id, table);
            toast('Deleted', 'ok');
            reload();
            loadLog();
        } catch (e) {
            toast('Failed: ' + e.message, 'err');
        }
    }

    /* ══════════════════════════════════════════════════════════════
       ACTIVITY LOG
    ══════════════════════════════════════════════════════════════ */
    async function loadLog() {
        const box = document.getElementById('logList');
        try {
            const rows = await api('/rest/v1/admin_actions?select=*,profiles!admin_actions_actor_id_fkey(full_name)&order=created_at.desc&limit=50');
            if (!rows || !rows.length) {
                box.innerHTML = '<div class="admin-empty">No actions logged yet.</div>';
                return;
            }
            box.innerHTML = rows.map(r => `
                <div class="admin-list-item">
                    <div class="admin-list-body">
                        <div class="admin-list-title">${escH(actionLabel(r.action))}</div>
                        <div class="admin-list-meta">${escH(r.profiles?.full_name || 'Unknown admin')} · ${timeAgo(r.created_at)}</div>
                        ${r.notes ? `<div class="admin-list-text">${escH(r.notes)}</div>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            /* admin_actions table may not have the FK named exactly this —
               degrade gracefully rather than showing an error to the admin */
            try {
                const rows = await api('/rest/v1/admin_actions?select=*&order=created_at.desc&limit=50');
                box.innerHTML = rows.length ? rows.map(r => `
                    <div class="admin-list-item">
                        <div class="admin-list-body">
                            <div class="admin-list-title">${escH(actionLabel(r.action))}</div>
                            <div class="admin-list-meta">${timeAgo(r.created_at)}</div>
                            ${r.notes ? `<div class="admin-list-text">${escH(r.notes)}</div>` : ''}
                        </div>
                    </div>
                `).join('') : '<div class="admin-empty">No actions logged yet.</div>';
            } catch (e2) {
                box.innerHTML = '<div class="admin-empty">Activity log unavailable.</div>';
            }
        }
    }

    function actionLabel(action) {
        const map = {
            approve_member: 'Approved a member',
            reject_member: 'Rejected a member',
            promote_admin: 'Promoted a member to admin',
            demote_admin: 'Removed admin access',
            publish_announcement: 'Published an announcement',
            publish_event: 'Published an event',
            delete_announcement: 'Deleted an announcement',
            delete_event: 'Deleted an event',
        };
        return map[action] || action;
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
