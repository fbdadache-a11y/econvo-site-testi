/* ==========================================================================
   ECONOVO — faq.js
   Smooth open/close via GSAP height tweens (falls back to an instant toggle
   if GSAP isn't available). Delegated + idempotent so it survives
   language.js re-rendering the FAQ list in a new language.
   ========================================================================== */

(function () {
    'use strict';

    function bind() {
        const wrapper = document.getElementById('faqWrapper');
        if (!wrapper || wrapper.dataset.bound === 'true') return;
        wrapper.dataset.bound = 'true';

        wrapper.addEventListener('click', (e) => {
            const btn = e.target.closest('.faq-question');
            if (!btn) return;
            const item = btn.parentElement;
            const wasActive = item.classList.contains('active');

            wrapper.querySelectorAll('.faq-item.active').forEach(el => { if (el !== item) closeItem(el); });
            wasActive ? closeItem(item) : openItem(item);
        });
    }

    function openItem(item) {
        const answer = item.querySelector('.faq-answer');
        item.classList.add('active');
        if (!window.gsap) return;
        gsap.killTweensOf(answer);
        gsap.set(answer, { height: 'auto' });
        const target = answer.offsetHeight;
        gsap.fromTo(answer, { height: 0 }, { height: target, duration: .4, ease: 'power2.out', onComplete: () => { answer.style.height = 'auto'; } });
    }

    function closeItem(item) {
        const answer = item.querySelector('.faq-answer');
        if (window.gsap) {
            gsap.killTweensOf(answer);
            const current = answer.offsetHeight;
            gsap.fromTo(answer, { height: current }, { height: 0, duration: .3, ease: 'power2.in' });
        }
        item.classList.remove('active');
    }

    document.addEventListener('DOMContentLoaded', bind);
    window.EconovoFAQ = { bind };
})();
