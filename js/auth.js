// ============================================================
//  Econovo — Supabase Auth Helper  v2.0 (Persistent Sessions)
//
//  FIX: access_token expires after 1 hour.
//  Solution: save refresh_token, auto-refresh 5 min before
//  expiry, and on every page load call Auth.ensureSession().
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
            await supaFetch('/auth/v1/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
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
    // Supabase refresh_tokens last weeks/months.
    // This exchanges the stored refresh_token for a fresh access_token.
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
    // Call once on DOMContentLoaded (done in main.js).
    // Returns true if session is valid (or was silently refreshed).
    async ensureSession() {
        const token        = Auth.getToken();
        const refreshToken = localStorage.getItem('econovo-refresh-token');

        if (!token && !refreshToken) return false;

        if (token) {
            try {
                const payload   = JSON.parse(atob(token.split('.')[1]));
                const expiresAt = payload.exp * 1000;     // convert to ms
                const now       = Date.now();
                const buffer    = 5 * 60 * 1000;          // 5 min buffer

                if (expiresAt - now > buffer) {
                    // Token is still fresh — schedule next refresh
                    Auth._scheduleAutoRefresh(expiresAt - now - buffer);
                    return true;
                }
            } catch { /* malformed token — fall through to refresh */ }
        }

        // Token is missing or expired — try refresh_token
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

        // Schedule next silent refresh 5 min before expiry
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

    // ── Internal: background silent refresh ──────────────────
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
