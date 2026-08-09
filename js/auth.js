// ============================================================
//  Econovo — Supabase Auth Helper
//  Single source of truth for session persistence. Every page
//  (login.html, join.html, dashboard.html, admin.html) must go
//  through this file — no page should touch localStorage or
//  call supaFetch directly for auth concerns.
// ============================================================
'use strict';

const SUPABASE_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';

// ── low-level fetch wrapper ──────────────────────────────────
// Auth endpoints (/auth/v1/token, /auth/v1/signup, /auth/v1/recover)
// only ever need the apikey header — never a Bearer token, since the
// publishable key is not a user JWT and sending it as Bearer breaks
// any RLS policy that reads auth.uid(). REST calls that need the
// signed-in user's identity must pass their own Authorization header
// explicitly (see getMyProfile below) using a real access_token.
async function supaFetch(path, options = {}) {
    const url = SUPABASE_URL + path;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            ...(options.headers || {}),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Request failed');
    return data;
}

// ── Auth API ─────────────────────────────────────────────────
const Auth = {
    async signUp({ email, password, firstName, lastName, extra = {} }) {
        const data = await supaFetch('/auth/v1/signup', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: (firstName + ' ' + lastName).trim(),
                    ...extra,
                },
            }),
        });
        if (data.access_token) Auth._save(data);
        return data;
    },

    async signIn({ email, password }) {
        const data = await supaFetch('/auth/v1/token?grant_type=password', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.access_token) Auth._save(data);
        return data;
    },

    async signOut() {
        const token = Auth.getToken();
        if (token) {
            await supaFetch('/auth/v1/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
            }).catch(() => {});
        }
        Auth._clear();
    },

    async sendPasswordReset(email) {
        return supaFetch('/auth/v1/recover', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    // ── Session refresh ───────────────────────────────────────
    // Supabase access tokens expire (typically after 1 hour). Without
    // this, a member gets signed out the moment their token expires —
    // which looks exactly like "the site doesn't remember me" even
    // though the refresh_token Supabase issued is still perfectly
    // valid for weeks. getValidToken() is what every other function
    // in this file (and every page) should call instead of getToken()
    // directly whenever the token is about to be sent to the server.
    async refreshSession() {
        const refresh = localStorage.getItem('econovo-refresh');
        if (!refresh) return false;
        try {
            const data = await supaFetch('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refresh }),
            });
            if (data.access_token) { Auth._save(data); return true; }
        } catch (_) { /* refresh token itself expired or was revoked */ }
        Auth._clear();
        return false;
    },

    async getValidToken() {
        const expires = localStorage.getItem('econovo-expires');
        const now = Math.floor(Date.now() / 1000);
        // Refresh 5 minutes early so a request never races an expiry
        // that happens mid-flight.
        if (expires && now >= (parseInt(expires, 10) - 300)) {
            const ok = await Auth.refreshSession();
            if (!ok) return null;
        }
        return localStorage.getItem('econovo-token');
    },

    // ── Profile / approval status ───────────────────────────────
    // Fetches the caller's own `profiles` row (id, role, status, ...).
    // Used right after sign-in to decide: dashboard vs "pending approval"
    // screen vs admin.html, and again on every dashboard/admin page load
    // since RLS can change server-side at any time (e.g. an admin rejects
    // someone mid-session).
    async getMyProfile() {
        const token = await Auth.getValidToken();
        const user  = Auth.getUser();
        if (!token || !user) return null;

        const rows = await supaFetch(
            `/rest/v1/profiles?id=eq.${user.id}&select=id,full_name,first_name,last_name,role,status,avatar_url,major,year`,
            { headers: { 'Authorization': 'Bearer ' + token } }
        );
        return Array.isArray(rows) ? (rows[0] || null) : null;
    },

    // Convenience checks used by page guards below.
    async isApproved() {
        const p = await Auth.getMyProfile();
        return !!p && p.status === 'approved';
    },

    async isAdmin() {
        const p = await Auth.getMyProfile();
        return !!p && p.role === 'admin' && p.status === 'approved';
    },

    // ── Page guards ──────────────────────────────────────────────
    // Call at the top of dashboard.html / admin.html. Redirects and
    // returns null if the visitor doesn't belong on that page; otherwise
    // resolves with the profile row so the page can render immediately
    // without a second fetch.
    //
    //   const me = await EconovoAuth.requireApproved();
    //   if (!me) return;   // already redirected
    //
    async requireApproved() {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'login.html';
            return null;
        }
        const token = await Auth.getValidToken();
        if (!token) {
            // refresh failed — the session is genuinely gone
            window.location.href = 'login.html';
            return null;
        }
        const profile = await Auth.getMyProfile().catch(() => null);
        if (!profile) {
            Auth._clear();
            window.location.href = 'login.html';
            return null;
        }
        if (profile.status === 'pending') {
            window.location.href = 'pending.html';
            return null;
        }
        if (profile.status === 'rejected') {
            Auth._clear();
            window.location.href = 'login.html?rejected=1';
            return null;
        }
        return profile;
    },

    async requireAdmin() {
        const profile = await Auth.requireApproved();
        if (!profile) return null;
        if (profile.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }
        return profile;
    },

    // ── Local read helpers (synchronous — do not imply the token
    //    is still valid; use getValidToken() before any network call) ──
    getUser() {
        try { return JSON.parse(localStorage.getItem('econovo-user') || 'null'); } catch { return null; }
    },

    getToken() {
        return localStorage.getItem('econovo-token') || null;
    },

    isLoggedIn() {
        return !!Auth.getToken() && !!Auth.getUser();
    },

    // ── Internal: persist / clear the full session ────────────────
    _save(data) {
        if (data.access_token)  localStorage.setItem('econovo-token',   data.access_token);
        if (data.refresh_token) localStorage.setItem('econovo-refresh', data.refresh_token);
        if (data.expires_at)    localStorage.setItem('econovo-expires', String(data.expires_at));
        if (data.user)          localStorage.setItem('econovo-user',    JSON.stringify(data.user));
    },

    _clear() {
        ['econovo-token', 'econovo-refresh', 'econovo-expires', 'econovo-user']
            .forEach(k => localStorage.removeItem(k));
    },
};

window.EconovoAuth = Auth;
