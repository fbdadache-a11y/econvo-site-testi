/* ==========================================================================
   ECONOVO — animations.js
   Hero entrance + scroll parallax, single-element fade-ins, and a batched
   stagger reveal for every JS-rendered card grid.
   ========================================================================== */

(function () {
    'use strict';

    const GRID_SELECTORS = ['#statsRow', '#whyGrid', '#pillarsGrid', '#timeline', '#teamGrid', '#eventsGrid', '#faqWrapper'];
    const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';   
    const EASE_SOFT = 'power2.out';

    let singleObserver;
    const gridObservers = new WeakMap(); 

    document.addEventListener('DOMContentLoaded', () => {
        if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        heroEntrance();
        idleFloat();
        heroParallax();
        initSingleReveal();
        initMagneticCards();
    });

    document.addEventListener('econovo:rendered', () => {
        GRID_SELECTORS.forEach(sel => revealGrid(sel));
        initSingleReveal();
    });

    function heroEntrance() {
        const items = [
            '.hero-content .eyebrow',
            '.hero-content h1',
            '.hero-content p',
            '.hero-content .hero-tags',
            '.hero-content .hero-actions',
            '.hero-visual'
        ].map(sel => document.querySelector(sel)).filter(Boolean);
        if (!items.length) return;

        if (window.gsap) {
            gsap.set(items, { opacity: 0, y: 26 });
            gsap.to(items, { opacity: 1, y: 0, duration: .9, stagger: .11, ease: EASE_SOFT, delay: .15 });
        } else {
            items.forEach((el, i) => {
                el.style.transition = `opacity .6s ${EASE_OUT} ${i * .1}s, transform .6s ${EASE_OUT} ${i * .1}s`;
                requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
            });
        }
    }

    function idleFloat() {
        if (!window.gsap) return;
        gsap.to('.floating-badge', { y: -10, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.floating-tag', { y: -8, rotate: -2, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: .3 });
        gsap.to('.hero-img-container', { y: -8, duration: 3.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        
        // التحريك الخاص بالرسومات الأيزومترية المضافة
        gsap.to('.iso-img', { 
            y: -12, 
            duration: 3.2, 
            repeat: -1, 
            yoyo: true, 
            ease: 'sine.inOut',
            stagger: 0.2
        });
    }

    function heroParallax() {
        if (!window.gsap || !window.ScrollTrigger || !document.querySelector('.hero-visual')) return;
        gsap.to('.hero-visual', {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    function initSingleReveal() {
        if (!singleObserver) {
            singleObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animateSingle(entry.target);
                    singleObserver.unobserve(entry.target);
                });
            }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
        }
        document.querySelectorAll('.reveal:not(.active)').forEach(el => singleObserver.observe(el));
    }

    function animateSingle(el) {
        el.classList.add('active');
        if (window.gsap) gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: EASE_SOFT });
    }

    function revealGrid(selector) {
        const container = document.querySelector(selector);
        if (!container || !container.children.length) return;

        const previous = gridObservers.get(container);
        if (previous) previous.disconnect();

        const children = Array.from(container.children);
        if (window.gsap) gsap.set(children, { opacity: 0, y: 28 });
        else children.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(28px)'; });

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                castCascade(children);
                if (selector === '#statsRow') animateCounters();
                obs.disconnect();
                gridObservers.delete(container);
            });
        }, { threshold: .1, rootMargin: '0px 0px -80px 0px' });

        gridObservers.set(container, obs);
        obs.observe(container);
    }

    function castCascade(children) {
        if (window.gsap) {
            gsap.to(children, { opacity: 1, y: 0, duration: .65, stagger: .07, ease: EASE_SOFT });
        } else {
            children.forEach((c, i) => {
                c.style.transition = `opacity .5s ${EASE_OUT} ${i * .06}s, transform .5s ${EASE_OUT} ${i * .06}s`;
                requestAnimationFrame(() => { c.style.opacity = '1'; c.style.transform = 'none'; });
            });
        }
    }

    function animateCounters() {
        document.querySelectorAll('#statsRow .stat-value').forEach(el => {
            const raw = el.getAttribute('data-raw') || el.textContent;
            const match = raw.match(/^(\d+)(.*)$/);
            if (!match) return;
            const target = parseInt(match[1], 10);
            const suffix = match[2] || '';

            if (window.gsap) {
                const counter = { val: 0 };
                gsap.to(counter, {
                    val: target, duration: 1.4, ease: 'power1.out',
                    onUpdate: () => { el.textContent = Math.round(counter.val) + suffix; },
                    onComplete: () => { el.textContent = target + suffix; }
                });
            } else {
                el.textContent = target + suffix;
            }
        });
    }

    function initMagneticCards() {
        if (!window.gsap) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let activeCard = null;
        const resetTilt = (card) => gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: .6, ease: 'elastic.out(1, .5)' });

        document.addEventListener('pointermove', (e) => {
            const card = e.target.closest('.card:not(.empathy-box)');
            if (card !== activeCard) {
                if (activeCard) resetTilt(activeCard);
                activeCard = card;
            }
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - .5;
            const py = (e.clientY - rect.top) / rect.height - .5;
            gsap.to(card, { rotateX: py * -4, rotateY: px * 4, y: -6, duration: .4, ease: 'power2.out', transformPerspective: 800 });
        });

        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget && activeCard) { resetTilt(activeCard); activeCard = null; }
        });
    }
})();
