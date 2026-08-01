// ============================================================
//  Econovo — Supabase Auth Helper
// ============================================================
'use strict';

const SUPABASE_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';

// ── low-level fetch wrapper ──────────────────────────────────
async function supaFetch(path, options = {}) {
    const url = SUPABASE_URL + path;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            ...(options.headers || {}),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Request failed');
    return data;
}

// ── Auth API ─────────────────────────────────────────────────
const Auth = {
    async signUp({ email, password, firstName, lastName }) {
        const data = await supaFetch('/auth/v1/signup', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                data: { first_name: firstName, last_name: lastName, full_name: firstName + ' ' + lastName }
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

    getUser() {
        try { return JSON.parse(localStorage.getItem('econovo-user') || 'null'); } catch { return null; }
    },

    getToken() {
        return localStorage.getItem('econovo-token') || null;
    },

    isLoggedIn() {
        return !!Auth.getToken() && !!Auth.getUser();
    },

    _save(data) {
        if (data.access_token) localStorage.setItem('econovo-token', data.access_token);
        if (data.user) localStorage.setItem('econovo-user', JSON.stringify(data.user));
    },

    _clear() {
        localStorage.removeItem('econovo-token');
        localStorage.removeItem('econovo-user');
    },
};

window.EconovoAuth = Auth;
