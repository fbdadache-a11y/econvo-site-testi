/* ==========================================================================
   ECONOVO — join-animations.js
   Same architecture as login-animations.js / the dashboard's animation
   layer: Web Animations API, respects prefers-reduced-motion, purely
   additive — never touches the multi-step form logic in join.html's
   inline <script> (showStep, validation, submit).
   ========================================================================== */

(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const SPRING_SOFT = 'cubic-bezier(0.25, 1, 0.5, 1)';
    const SPRING_BOUNCE = 'cubic-bezier(.68,-.4,.27,1.35)';

    function forceVisible(el) {
        if (!el) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
    }

    function animate(el, from, to, opts = {}) {
        if (!el) return null;
        if (REDUCED) { forceVisible(el); return null; }
        return el.animate([from, to], {
            duration: opts.duration || 400,
            delay: opts.delay || 0,
            easing: opts.easing || SPRING,
            fill: 'both',
        });
    }

    document.addEventListener('DOMContentLoaded', () => {

        /* ── Entrance: form panel fades up on load ── */
        const formInner = document.querySelector('.form-inner');
        animate(formInner, { opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }, { duration: 500, delay: 100 });

        /* ── Step-1 field stagger on initial load ── */
        document.querySelectorAll('#step-1.active .field-group, #step-1.active .field-row, #step-1.active .step-nav')
            .forEach((el, i) => {
                animate(el,
                    { opacity: 0, transform: 'translateY(10px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                    { duration: 360, delay: 220 + i * 55, easing: SPRING_SOFT }
                );
            });

        /* ── Step transitions: re-run stagger whenever a .form-step
           becomes .active (showStep() in the inline script just
           toggles the class — we watch for that) ── */
        document.querySelectorAll('.form-step').forEach(step => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!step.classList.contains('active')) return;
                    animate(step, { opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }, { duration: 340 });
                    step.querySelectorAll(':scope > .form-heading-row, :scope > .field-group, :scope > .field-row, :scope > .step-nav')
                        .forEach((el, i) => {
                            animate(el,
                                { opacity: 0, transform: 'translateY(10px)' },
                                { opacity: 1, transform: 'translateY(0)' },
                                { duration: 340, delay: 70 + i * 50, easing: SPRING_SOFT }
                            );
                        });
                });
            });
            obs.observe(step, { attributes: true });
        });

        /* ── Step-dot pop when it becomes active ── */
        document.querySelectorAll('.step-dot-wrap').forEach(dot => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!dot.classList.contains('active')) return;
                    animate(dot.querySelector('.step-dot'),
                        { transform: 'scale(0.7)' },
                        { transform: 'scale(1)' },
                        { duration: 340, easing: SPRING_BOUNCE }
                    );
                });
            });
            obs.observe(dot, { attributes: true });
        });

        /* ── Connector line fill ── */
        document.querySelectorAll('.step-connector').forEach(conn => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!conn.classList.contains('done')) return;
                    animate(conn, { opacity: .3 }, { opacity: 1 }, { duration: 300 });
                });
            });
            obs.observe(conn, { attributes: true });
        });

        /* ── Success screen: icon spring-pop + content fade ── */
        const successScreen = document.getElementById('form-success');
        if (successScreen) {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!successScreen.classList.contains('show')) return;
                    const icon = successScreen.querySelector('.success-icon');
                    animate(icon, { opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }, { duration: 460, easing: SPRING_BOUNCE });
                    ['.success-title', '.success-body', '.success-actions'].forEach((sel, i) => {
                        animate(successScreen.querySelector(sel),
                            { opacity: 0, transform: 'translateY(10px)' },
                            { opacity: 1, transform: 'translateY(0)' },
                            { duration: 380, delay: 180 + i * 90, easing: SPRING_SOFT }
                        );
                    });
                });
            });
            obs.observe(successScreen, { attributes: true });
        }

        /* ── Field error shake ── */
        document.querySelectorAll('.field-error').forEach(err => {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!err.classList.contains('show')) return;
                    let input = err.previousElementSibling;
                    if (input?.classList.contains('field-wrap') || input?.classList.contains('field-footer')) {
                        input = input.querySelector('.field-input, .field-textarea') || input;
                    }
                    if (input && input.animate && !REDUCED) {
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

        /* ── Alert box entrance ── */
        const alertBox = document.getElementById('form-alert');
        if (alertBox) {
            const obs = new MutationObserver(muts => {
                muts.forEach(m => {
                    if (m.attributeName !== 'class') return;
                    if (!alertBox.classList.contains('show')) return;
                    animate(alertBox,
                        { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                        { opacity: 1, transform: 'translateY(0) scale(1)' },
                        { duration: 260, easing: SPRING }
                    );
                });
            });
            obs.observe(alertBox, { attributes: true });
        }

        /* ── Button tactile press ── */
        document.querySelectorAll('.btn-next, .btn-submit-join, .btn-back').forEach(btn => {
            btn.addEventListener('pointerdown', () => {
                if (REDUCED || btn.disabled) return;
                animate(btn, { transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { duration: 100, easing: 'ease-out' });
            });
            btn.addEventListener('pointerup', () => {
                if (REDUCED || btn.disabled) return;
                animate(btn, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }, { duration: 220, easing: SPRING });
            });
        });

        /* ── Toggle pill / checkbox spring pop on select ── */
        document.querySelectorAll('.toggle-pill input, .checkbox-label input').forEach(cb => {
            cb.addEventListener('change', () => {
                if (REDUCED || !cb.checked) return;
                const wrap = cb.closest('.toggle-pill, .checkbox-label');
                animate(wrap, { transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { duration: 130, easing: 'ease-out' })
                    ?.finished.then(() => animate(wrap, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }, { duration: 180, easing: SPRING }));
            });
        });
    });

})();
