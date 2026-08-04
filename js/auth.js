// ============================================================
//  Econovo — Supabase Auth Helper  v2.1 (Fixed Persistent Sessions)
// ============================================================
'use strict';

const SUPABASE_URL = 'https://nufftndrdfxtdauowkzr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y9AzlOLE2fohYgJU1cJ9TQ_r6LigVlL';

// ── low-level fetch wrapper ──────────────────────────────────
// FIX: Auth endpoints (/auth/v1/token, /auth/v1/signup, /auth/v1/recover)
// must use apikey only — NOT the SUPABASE_KEY as Bearer (it's not a JWT).
// Bearer token is only used for REST API calls AFTER login.
async function supaFetch(path, options = {}) {
    const url = SUPABASE_URL + path;
    const isAuthEndpoint = path.startsWith('/auth/v1/');

    // For auth endpoints: only send apikey header.
    // For REST endpoints: send apikey + user's real access_token as Bearer.
    const accessToken = localStorage.getItem('econovo-token');
    const authHeader = (!isAuthEndpoint && accessToken)
        ? { 'Authorization': 'Bearer ' + accessToken }
        : {};

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            ...authHeader,
            ...(options.headers || {}),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Request failed');
    return data;
}

// ── Auth API ─────────────────────────────────────────────────
const Auth = {

    // ── Sign Up ──────────────────────────────────────────────
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

    // ── Sign In ──────────────────────────────────────────────
    async signIn({ email, password }) {
        const data = await supaFetch('/auth/v1/token?grant_type=password', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.access_token) Auth._save(data);
        return data;
    },

    // ── Sign Out ─────────────────────────────────────────────
    async signOut() {
        const token = Auth.getToken();
        if (token) {
            await fetch(SUPABASE_URL + '/auth/v1/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + token,
                },
            }).catch(() => {});
        }
        Auth._clear();
        Auth._stopAutoRefresh();
    },

    // ── Password Reset ───────────────────────────────────────
    async sendPasswordReset(email) {
        return supaFetch('/auth/v1/recover', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    // ── Refresh access_token using refresh_token ─────────────
    async refreshSession() {
        const refreshToken = localStorage.getItem('econovo-refresh-token');
        if (!refreshToken) {
            Auth._clear();
            return null;
        }
        try {
            const data = await supaFetch('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (data.access_token) {
                Auth._save(data);
                return data;
            }
            Auth._clear();
            return null;
        } catch (err) {
            console.warn('[Econovo Auth] Refresh failed — clearing session:', err.message);
            Auth._clear();
            return null;
        }
    },

    // ── Ensure valid session on page load ────────────────────
    async ensureSession() {
        const token        = Auth.getToken();
        const refreshToken = localStorage.getItem('econovo-refresh-token');

        if (!token && !refreshToken) return false;

        if (token) {
            try {
                const payload   = JSON.parse(atob(token.split('.')[1]));
                const expiresAt = payload.exp * 1000;
                const now       = Date.now();
                const buffer    = 5 * 60 * 1000; // 5 min buffer

                if (expiresAt - now > buffer) {
                    Auth._scheduleAutoRefresh(expiresAt - now - buffer);
                    return true;
                }
            } catch { /* malformed token — fall through to refresh */ }
        }

        if (refreshToken) {
            const refreshed = await Auth.refreshSession();
            return !!refreshed;
        }

        Auth._clear();
        return false;
    },

    // ── Getters ──────────────────────────────────────────────
    getUser() {
        try { return JSON.parse(localStorage.getItem('econovo-user') || 'null'); } catch { return null; }
    },

    getToken() {
        return localStorage.getItem('econovo-token') || null;
    },

    isLoggedIn() {
        return !!Auth.getToken() && !!Auth.getUser();
    },

    // ── Internal: persist full session ───────────────────────
    _save(data) {
        if (data.access_token)  localStorage.setItem('econovo-token',         data.access_token);
        if (data.refresh_token) localStorage.setItem('econovo-refresh-token', data.refresh_token);
        if (data.user)          localStorage.setItem('econovo-user',          JSON.stringify(data.user));

        if (data.expires_in) {
            const msUntilRefresh = (data.expires_in - 300) * 1000;
            Auth._scheduleAutoRefresh(Math.max(msUntilRefresh, 30_000));
        }
    },

    _clear() {
        localStorage.removeItem('econovo-token');
        localStorage.removeItem('econovo-refresh-token');
        localStorage.removeItem('econovo-user');
        Auth._stopAutoRefresh();
    },

    _refreshTimer: null,

    _scheduleAutoRefresh(msFromNow) {
        Auth._stopAutoRefresh();
        if (msFromNow <= 0) return;
        Auth._refreshTimer = setTimeout(async () => {
            const ok = await Auth.refreshSession();
            if (!ok) console.warn('[Econovo Auth] Silent refresh failed. Session ended.');
        }, msFromNow);
    },

    _stopAutoRefresh() {
        if (Auth._refreshTimer) {
            clearTimeout(Auth._refreshTimer);
            Auth._refreshTimer = null;
        }
    },
};

window.EconovoAuth = Auth;
