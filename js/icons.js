/* ==========================================================================
   ECONOVO — icons.js
   مكتبة أيقونات Lucide لاستخدامها في المجموعات (بدل الإيموجي).
   كل أيقونة تنتمي لفئة (category)، وكل فئة لها لون واحد ثابت —
   أيقونات الفئة نفسها تتشارك اللون، والفئات المختلفة تتمايز بصريًا.
   ========================================================================== */
'use strict';

/* الألوان محسوبة لتُقرأ بوضوح فوق --sage-dim في الوضعين الفاتح والداكن.
   كل فئة = لون واحد. أضف أيقونات جديدة لفئة موجودة وستأخذ لونها تلقائيًا. */
const ICON_CATEGORIES = {
    finance:   { label: 'Finance',   color: '#1d7a52' }, // أخضر
    tech:      { label: 'Tech',      color: '#2563a8' }, // أزرق
    creative:  { label: 'Creative',  color: '#b8562f' }, // برتقالي محروق
    knowledge: { label: 'Knowledge', color: '#6a4bb0' }, // بنفسجي
    science:   { label: 'Science',   color: '#0e8a8a' }, // فيروزي
    growth:    { label: 'Growth',    color: '#c2932a' }, // ذهبي
};

/* كل مدخل: key (يُخزَّن في groups.icon_key) → category + Lucide SVG paths
   (viewBox 0 0 24 24، نفس نمط بقية أيقونات الموقع). */
const ICON_LIBRARY = {
    /* — Finance — */
    'credit-card':  { category: 'finance', paths: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' },
    'wallet':        { category: 'finance', paths: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' },
    'coins':         { category: 'finance', paths: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>' },
    'trending-up':   { category: 'finance', paths: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
    'landmark':      { category: 'finance', paths: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>' },

    /* — Tech — */
    'rocket':        { category: 'tech', paths: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
    'cpu':           { category: 'tech', paths: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>' },
    'code-2':        { category: 'tech', paths: '<polyline points="18 6 22 10 18 14"/><polyline points="6 18 2 14 6 10"/><line x1="14" y1="4" x2="10" y2="20"/>' },
    'terminal':      { category: 'tech', paths: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>' },
    'server':        { category: 'tech', paths: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>' },

    /* — Creative — */
    'palette':       { category: 'creative', paths: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' },
    'brush':         { category: 'creative', paths: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>' },
    'music':         { category: 'creative', paths: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
    'camera':        { category: 'creative', paths: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>' },
    'film':          { category: 'creative', paths: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>' },

    /* — Knowledge — */
    'book-open':     { category: 'knowledge', paths: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    'graduation-cap':{ category: 'knowledge', paths: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
    'library':       { category: 'knowledge', paths: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>' },
    'lightbulb':     { category: 'knowledge', paths: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8a4.65 4.65 0 0 0 1.5 3.5c.76.76 1.23 1.52 1.41 2.5"/>' },
    'newspaper':     { category: 'knowledge', paths: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>' },

    /* — Science — */
    'brain-circuit': { category: 'science', paths: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="20" cy="8" r="0.5"/>' },
    'microscope':    { category: 'science', paths: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>' },
    'flask-conical': { category: 'science', paths: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>' },
    'globe':         { category: 'science', paths: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
    'atom':          { category: 'science', paths: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>' },

    /* — Growth — */
    'target':        { category: 'growth', paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
    'trophy':        { category: 'growth', paths: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>' },
    'zap':           { category: 'growth', paths: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    'flag':          { category: 'growth', paths: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
    'compass':       { category: 'growth', paths: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>' },
};

/* الإصدار الافتراضي عند عدم توفر icon_key مطابق (مجموعات قديمة أُنشئت
   بإيموجي قبل هذا التحديث، أو أي قيمة غير متوقعة قادمة من قاعدة البيانات). */
const ICON_FALLBACK_KEY = 'compass';

function iconMeta(key) {
    return ICON_LIBRARY[key] || ICON_LIBRARY[ICON_FALLBACK_KEY];
}

function categoryColor(categoryKey) {
    return (ICON_CATEGORIES[categoryKey] || {}).color || '#8FB8A6';
}

/* يبني السطر الكامل (خلفية مصبوغة بلون الفئة + svg) بحجم قابل للتخصيص.
   sizePx: قياس الحاوية (المربع)، iconPx: قياس الـ svg الداخلي. */
function renderGroupIcon(iconKey, sizePx, iconPx) {
    const meta = iconMeta(iconKey);
    const color = categoryColor(meta.category);
    return `<div class="group-icon-box" style="width:${sizePx}px;height:${sizePx}px;background:${color}1f;color:${color};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" width="${iconPx}" height="${iconPx}">
            ${meta.paths}
        </svg>
    </div>`;
}

window.EconovoIcons = {
    ICON_CATEGORIES,
    ICON_LIBRARY,
    iconMeta,
    categoryColor,
    renderGroupIcon,
};
