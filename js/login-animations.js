/* ==========================================================================
   ECONOVO — login-animations.js
   Same architecture as pages/dashboard.html's animation layer: Web
   Animations API, zero hard dependencies, respects prefers-reduced-motion,
   and never touches the auth logic in this page's inline <script> or in
   js/auth.js — purely additive entrance choreography + tactile feedback.
   ========================================================================== */

(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const SPRING_SOFT = 'cubic-bezier(0.25, 1, 0.5, 1)';

    function forceVisible(el) {
        if (!el) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
    }

    function animate(el, from, to, opts = {}) {
        if (!el) return null;
        if (REDUCED) { forceVisible(el); return null; }
        return el.animate([from, to], {
            duration: opts.duration || 500,
            delay: opts.delay || 0,
            easing: opts.easing || SPRING,
            fill: 'both',
        });
    }

    document.addEventListener('DOMContentLoaded', () => {

        /* ── Entrance: brand panel then form panel, staggered ──
           Mirrors the dashboard hero's rule → eyebrow → headline
           → visual sequencing: the panel that establishes context
           (brand) enters first, the panel that needs input (form)
           follows immediately after. */
        const panelContent = document.querySelector('.auth-panel-content');
        const panelHero     = document.querySelector('.auth-panel-hero');
        const testimonial    = document.querySelector('.auth-testimonial');
        const formInner       = document.querySelector('.auth-form-inner');

        animate(panelContent, { opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 550, delay: 60 });
        animate(panelHero,    { opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 550, delay: 140 });
        animate(testimonial,  { opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 500, delay: 240 });
        animate(formInner,    { opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 500, delay: 180 });

        /* ── Field-group stagger inside the active form ──
           Each input's label+field enters slightly after the last,
           same cascade rhythm as the dashboard's grid reveal. */
        document.querySelectorAll('.auth-form.active .field-group, .auth-form.active .field-row-inline, .auth-form.active .btn-submit, .auth-form.active .no-account')
            .forEach((el, i) => {
                animate(el,
                    { opacity: 0, transform: 'translateY(10px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                    { duration: 380, delay: 260 + i * 55, easing: SPRING_SOFT }
                );
            });

        /* ── Tab switch: re-run the field stagger for whichever
           form becomes .active, and cross-fade the swap itself ── */
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(form => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!form.classList.contains('active')) return;
                    animate(form, { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 320 });
                    form.querySelectorAll('.field-group, .field-row-inline, .btn-submit, .no-account').forEach((el, i) => {
                        animate(el,
                            { opacity: 0, transform: 'translateY(8px)' },
                            { opacity: 1, transform: 'translateY(0)' },
                            { duration: 320, delay: 60 + i * 45, easing: SPRING_SOFT }
                        );
                    });
                });
            });
            obs.observe(form, { attributes: true });
        });

        /* ── Alert box entrance — same pattern as dashboard toasts ── */
        document.querySelectorAll('.auth-alert').forEach(alert => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!alert.classList.contains('visible')) return;
                    animate(alert,
                        { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                        { opacity: 1, transform: 'translateY(0) scale(1)' },
                        { duration: 260, easing: SPRING }
                    );
                });
            });
            obs.observe(alert, { attributes: true });
        });

        /* ── Field error shake — draws the eye without being loud ── */
        document.querySelectorAll('.field-error').forEach(err => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!err.classList.contains('visible')) return;
                    const input = err.previousElementSibling?.classList.contains('field-input-wrap')
                        ? err.previousElementSibling.querySelector('.field-input')
                        : err.previousElementSibling;
                    if (input && !REDUCED) {
                        input.animate(
                            [
                                { transform: 'translateX(0)' },
                                { transform: 'translateX(-4px)' },
                                { transform: 'translateX(4px)' },
                                { transform: 'translateX(-3px)' },
                                { transform: 'translateX(0)' },
                            ],
                            { duration: 320, easing: 'ease-out' }
                        );
                    }
                });
            });
            obs.observe(err, { attributes: true });
        });

        /* ── Submit button tactile press ── */
        document.querySelectorAll('.btn-submit').forEach(btn => {
            btn.addEventListener('pointerdown', () => {
                if (REDUCED || btn.disabled) return;
                animate(btn, { transform: 'scale(1)' }, { transform: 'scale(0.97)' }, { duration: 100, easing: 'ease-out' });
            });
            btn.addEventListener('pointerup', () => {
                if (REDUCED || btn.disabled) return;
                animate(btn, { transform: 'scale(0.97)' }, { transform: 'scale(1)' }, { duration: 220, easing: SPRING });
            });
        });

        /* ── Checkbox spring pop ── */
        document.querySelectorAll('.checkbox-inline input').forEach(cb => {
            cb.addEventListener('change', () => {
                if (REDUCED || !cb.checked) return;
                const box = cb.nextElementSibling;
                animate(box, { transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { duration: 140, easing: 'ease-out' })
                    ?.finished.then(() => animate(box, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }, { duration: 180, easing: SPRING }));
            });
        });
    });

})();
