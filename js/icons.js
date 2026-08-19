/* ==========================================================================
   ECONOVO — icons.js  v2
   مكتبة أيقونات Lucide + رسوم توضيحية SVG للمجموعات.
   - أيقونات Lucide: 60+ أيقونة موزعة على 9 فئات (ضعف النسخة السابقة)
   - كل فئة لها لون واحد ثابت يظهر على الأيقونة وعلى الرسم التوضيحي
   - كل مجموعة تحصل على thumbnail SVG (line-art) مشتقّ من أيقونتها
   ========================================================================== */
'use strict';

/* ── الألوان ── كل فئة = لون واحد، محسوب ليُقرأ على --sage-dim داكناً وفاتحاً */
const ICON_CATEGORIES = {
    finance:     { label: 'Finance',     color: '#1d7a52' },
    tech:        { label: 'Tech',        color: '#2563a8' },
    creative:    { label: 'Creative',    color: '#b8562f' },
    knowledge:   { label: 'Knowledge',   color: '#6a4bb0' },
    science:     { label: 'Science',     color: '#0e8a8a' },
    growth:      { label: 'Growth',      color: '#c2932a' },
    society:     { label: 'Society',     color: '#b03a6a' },
    environment: { label: 'Environment', color: '#3a7d44' },
    health:      { label: 'Health',      color: '#c04040' },
};

/* ══════════════════════════════════════════════════════════════
   ICON_LIBRARY — 60+ أيقونة Lucide
   key يُخزَّن في groups.icon_key ولا يتغير أبداً
   ══════════════════════════════════════════════════════════════ */
const ICON_LIBRARY = {

    /* ── Finance (10) ── */
    'credit-card':   { category: 'finance', paths: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' },
    'wallet':        { category: 'finance', paths: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' },
    'coins':         { category: 'finance', paths: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>' },
    'trending-up':   { category: 'finance', paths: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
    'landmark':      { category: 'finance', paths: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>' },
    'bar-chart-2':   { category: 'finance', paths: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    'pie-chart':     { category: 'finance', paths: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>' },
    'dollar-sign':   { category: 'finance', paths: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    'briefcase':     { category: 'finance', paths: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
    'handshake':     { category: 'finance', paths: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>' },

    /* ── Tech (10) ── */
    'rocket':        { category: 'tech', paths: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
    'cpu':           { category: 'tech', paths: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>' },
    'code-2':        { category: 'tech', paths: '<polyline points="18 6 22 10 18 14"/><polyline points="6 18 2 14 6 10"/><line x1="14" y1="4" x2="10" y2="20"/>' },
    'terminal':      { category: 'tech', paths: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>' },
    'server':        { category: 'tech', paths: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>' },
    'wifi':          { category: 'tech', paths: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>' },
    'bot':           { category: 'tech', paths: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>' },
    'database':      { category: 'tech', paths: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' },
    'cloud':         { category: 'tech', paths: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' },
    'network':       { category: 'tech', paths: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>' },

    /* ── Creative (10) ── */
    'palette':       { category: 'creative', paths: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' },
    'brush':         { category: 'creative', paths: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>' },
    'music':         { category: 'creative', paths: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
    'camera':        { category: 'creative', paths: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>' },
    'film':          { category: 'creative', paths: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>' },
    'pen-tool':      { category: 'creative', paths: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>' },
    'image':         { category: 'creative', paths: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
    'mic':           { category: 'creative', paths: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>' },
    'layout':        { category: 'creative', paths: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>' },
    'feather':       { category: 'creative', paths: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17" y1="15" x2="9" y2="15"/>' },

    /* ── Knowledge (8) ── */
    'book-open':     { category: 'knowledge', paths: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    'graduation-cap':{ category: 'knowledge', paths: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
    'library':       { category: 'knowledge', paths: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>' },
    'lightbulb':     { category: 'knowledge', paths: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8a4.65 4.65 0 0 0 1.5 3.5c.76.76 1.23 1.52 1.41 2.5"/>' },
    'newspaper':     { category: 'knowledge', paths: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>' },
    'scroll':        { category: 'knowledge', paths: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 3H8.5A2.5 2.5 0 0 0 6 5.5V5"/>' },
    'message-square':{ category: 'knowledge', paths: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    'award':         { category: 'knowledge', paths: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>' },

    /* ── Science (8) ── */
    'brain-circuit': { category: 'science', paths: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="20" cy="8" r="0.5"/>' },
    'microscope':    { category: 'science', paths: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>' },
    'flask-conical': { category: 'science', paths: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>' },
    'globe':         { category: 'science', paths: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
    'atom':          { category: 'science', paths: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>' },
    'telescope':     { category: 'science', paths: '<circle cx="13" cy="13" r="2"/><path d="M5.7 5.7l4.6 4.6"/><path d="M2 11.5 10.3 3.2a1 1 0 0 1 1.4 0l3.1 3.1a1 1 0 0 1 0 1.4L6.5 16"/><path d="m14 14 6 6"/>' },
    'dna':           { category: 'science', paths: '<path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15.121 17c.2-.667.39-1.335.574-2"/><path d="m2 9 20-6"/><path d="M9 2C7.5 6.5 7.5 10 9 14c1.5-4 1.5-7.5 0-12Z"/><path d="M15 2c-1.5 4.5-1.5 8 0 12 1.5-4 1.5-7.5 0-12Z"/>' },
    'satellite':     { category: 'science', paths: '<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>' },

    /* ── Growth (8) ── */
    'target':        { category: 'growth', paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
    'trophy':        { category: 'growth', paths: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>' },
    'zap':           { category: 'growth', paths: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    'flag':          { category: 'growth', paths: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
    'compass':       { category: 'growth', paths: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>' },
    'mountain':      { category: 'growth', paths: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>' },
    'flame':         { category: 'growth', paths: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
    'medal':         { category: 'growth', paths: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>' },

    /* ── Society (8) ── */
    'users':         { category: 'society', paths: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    'handshake-2':   { category: 'society', paths: '<path d="M4 8h1"/><path d="M2 12h20"/><path d="M6 12v1.5a2 2 0 0 0 4 0V12"/><path d="M14 12v1.5a2 2 0 0 0 4 0V12"/><path d="M2 8c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v4H2V8Z"/><path d="M19 8h1"/>' },
    'heart':         { category: 'society', paths: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
    'globe-2':       { category: 'society', paths: '<path d="M15 21v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M7 4h1l2 3 2-3h1"/><path d="m11 4 .5 3"/><path d="M12.5 4 13 7"/><circle cx="12" cy="12" r="10"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M12 2v4"/>' },
    'vote':          { category: 'society', paths: '<path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/>' },
    'landmark-2':    { category: 'society', paths: '<path d="M2 22V12.5"/><path d="M22 22V12.5"/><path d="M2 12.5 12 3l10 9.5"/><path d="M5 12.5V22"/><path d="M9 12.5V22"/><path d="M15 12.5V22"/><path d="M19 12.5V22"/><path d="M2 22h20"/>' },
    'leaf':          { category: 'society', paths: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>' },
    'building':      { category: 'society', paths: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>' },

    /* ── Environment (6) ── */
    'tree-pine':     { category: 'environment', paths: '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14"/><path d="m14 8 3 3.3a1 1 0 0 1-.7 1.7H7.7a1 1 0 0 1-.7-1.7L10 8"/><path d="M12 2 8.3 6.3a1.03 1.03 0 0 0 .7 1.7h6a1.03 1.03 0 0 0 .7-1.7L12 2Z"/><path d="M12 22v-3"/>' },
    'sun':           { category: 'environment', paths: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>' },
    'droplets':      { category: 'environment', paths: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>' },
    'wind':          { category: 'environment', paths: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>' },
    'recycle':       { category: 'environment', paths: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-2.755l7.81-13.08a2 2 0 0 1 3.4 0l7.808 13.08a1.83 1.83 0 0 1-1.57 2.755H17"/><path d="M9.5 14H12l2.5 5H9.5l2.5-5Z"/>' },
    'mountain-snow': { category: 'environment', paths: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"/>' },

    /* ── Health (6) ── */
    'activity':      { category: 'health', paths: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
    'stethoscope':   { category: 'health', paths: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15a6 6 0 0 0 6 6"/><circle cx="20" cy="19" r="2"/>' },
    'apple':         { category: 'health', paths: '<path d="M12 20.94c1.5 0 4.5.7 4.5-3.94a4.5 4.5 0 0 0-4.5-4.5 4.5 4.5 0 0 0-4.5 4.5c0 4.64 3 3.94 4.5 3.94z"/><path d="M12 10V2"/><path d="M8 6c0 0 1-2 4-1"/>' },
    'dumbbell':      { category: 'health', paths: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>' },
    'brain':         { category: 'health', paths: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>' },
    'shield-plus':   { category: 'health', paths: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12h6"/><path d="M12 9v6"/>' },
};

/* ══════════════════════════════════════════════════════════════
   GROUP THUMBNAIL ILLUSTRATIONS
   SVG line-art مضمّن كـ string، بيتم تلوينه بلون فئة الأيقونة.
   كل فئة لها رسمة واحدة تمثّل فضاءها بصرياً — بسيطة وخفيفة.
   ══════════════════════════════════════════════════════════════ */
const CATEGORY_ILLUSTRATIONS = {
    finance: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Chart bars -->
            <rect x="20" y="70" width="20" height="35" rx="3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <rect x="50" y="45" width="20" height="60" rx="3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <rect x="80" y="55" width="20" height="50" rx="3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <rect x="110" y="30" width="20" height="75" rx="3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <rect x="140" y="15" width="20" height="90" rx="3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <!-- Trend line -->
            <polyline points="30,65 60,42 90,52 120,28 150,12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-dasharray="5 3" opacity=".6"/>
            <!-- Arrow up -->
            <polyline points="145,12 155,8 159,18" stroke="currentColor" stroke-width="2" fill="none" opacity=".8"/>
            <!-- Baseline -->
            <line x1="10" y1="108" x2="190" y2="108" stroke="currentColor" stroke-width="1.5" opacity=".4"/>
            <!-- Coin -->
            <circle cx="173" cy="38" r="14" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".7"/>
            <text x="173" y="43" text-anchor="middle" font-size="13" fill="currentColor" font-family="serif" opacity=".8">$</text>
        </svg>`,
    tech: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Monitor outline -->
            <rect x="25" y="15" width="110" height="72" rx="5" stroke="currentColor" stroke-width="1.8" fill="none"/>
            <line x1="80" y1="87" x2="80" y2="105" stroke="currentColor" stroke-width="1.8" opacity=".8"/>
            <line x1="55" y1="105" x2="105" y2="105" stroke="currentColor" stroke-width="1.8" opacity=".8"/>
            <!-- Code lines -->
            <line x1="38" y1="32" x2="70" y2="32" stroke="currentColor" stroke-width="2" opacity=".9" stroke-linecap="round"/>
            <line x1="38" y1="44" x2="90" y2="44" stroke="currentColor" stroke-width="2" opacity=".7" stroke-linecap="round"/>
            <line x1="38" y1="56" x2="60" y2="56" stroke="currentColor" stroke-width="2" opacity=".9" stroke-linecap="round"/>
            <line x1="38" y1="68" x2="82" y2="68" stroke="currentColor" stroke-width="2" opacity=".6" stroke-linecap="round"/>
            <!-- Rocket -->
            <path d="M155 85 C155 65 170 50 175 20 C180 50 185 65 175 85" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <path d="M165 82 L155 90 L165 88" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".7"/>
            <path d="M185 82 L195 90 L185 88" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".7"/>
            <circle cx="175" cy="42" r="4" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".8"/>
            <!-- Spark -->
            <circle cx="155" cy="18" r="2" fill="currentColor" opacity=".5"/>
            <circle cx="165" cy="12" r="1.5" fill="currentColor" opacity=".4"/>
            <circle cx="175" cy="9"  r="2" fill="currentColor" opacity=".35"/>
        </svg>`,
    creative: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Canvas -->
            <rect x="50" y="10" width="100" height="80" rx="4" stroke="currentColor" stroke-width="1.8" fill="none"/>
            <!-- Brush strokes -->
            <path d="M65 30 Q80 20 95 35 Q110 50 125 38" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".9"/>
            <path d="M65 55 Q90 45 115 60" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".6"/>
            <path d="M65 75 Q85 68 100 75 Q115 82 130 70" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>
            <!-- Palette dots -->
            <circle cx="25" cy="40" r="6" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".8"/>
            <circle cx="25" cy="60" r="6" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".6"/>
            <circle cx="25" cy="80" r="6" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".4"/>
            <!-- Brush handle -->
            <line x1="25" y1="14" x2="45" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".9"/>
            <path d="M20 14 L30 8 L35 18 L25 20 Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".9"/>
            <!-- Stars -->
            <path d="M168 20 L170 26 L176 28 L170 30 L168 36 L166 30 L160 28 L166 26 Z" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".6"/>
            <circle cx="180" cy="70" r="3" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".5"/>
        </svg>`,
    knowledge: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Book pages -->
            <path d="M100 20 L100 100" stroke="currentColor" stroke-width="1.8" opacity=".8"/>
            <path d="M100 20 C80 18 55 22 35 30 L35 100 C55 94 80 96 100 100" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <path d="M100 20 C120 18 145 22 165 30 L165 100 C145 94 120 96 100 100" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <!-- Left page lines -->
            <line x1="48" y1="45" x2="90" y2="43" stroke="currentColor" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>
            <line x1="48" y1="56" x2="90" y2="55" stroke="currentColor" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>
            <line x1="48" y1="67" x2="85" y2="66" stroke="currentColor" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>
            <line x1="48" y1="78" x2="90" y2="77" stroke="currentColor" stroke-width="1.4" opacity=".4" stroke-linecap="round"/>
            <!-- Right page lines -->
            <line x1="110" y1="43" x2="153" y2="45" stroke="currentColor" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>
            <line x1="110" y1="55" x2="153" y2="56" stroke="currentColor" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>
            <line x1="110" y1="66" x2="148" y2="67" stroke="currentColor" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>
            <!-- Lightbulb -->
            <path d="M182 15 A8 8 0 0 1 188 22 A6 6 0 0 1 185 28 L185 33 L179 33 L179 28 A6 6 0 0 1 176 22 A8 8 0 0 1 182 15Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".8"/>
            <line x1="179" y1="35" x2="185" y2="35" stroke="currentColor" stroke-width="1.5" opacity=".7"/>
            <line x1="180" y1="38" x2="184" y2="38" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
        </svg>`,
    science: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Flask -->
            <path d="M75 15 L75 55 L45 100 L155 100 L125 55 L125 15" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <line x1="65" y1="15" x2="135" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>
            <!-- Liquid surface -->
            <path d="M53 80 Q100 70 147 80" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" opacity=".7"/>
            <!-- Bubbles -->
            <circle cx="80"  cy="88" r="4" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".7"/>
            <circle cx="100" cy="82" r="3" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".6"/>
            <circle cx="120" cy="90" r="5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".7"/>
            <!-- Atom orbit (small, top right) -->
            <circle cx="170" cy="30" r="10" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".6"/>
            <ellipse cx="170" cy="30" rx="18" ry="7" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".5" transform="rotate(50 170 30)"/>
            <ellipse cx="170" cy="30" rx="18" ry="7" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".5" transform="rotate(-50 170 30)"/>
            <circle cx="170" cy="30" r="3" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".8"/>
            <!-- Stars dots -->
            <circle cx="25" cy="25" r="2" fill="currentColor" opacity=".5"/>
            <circle cx="35" cy="40" r="1.5" fill="currentColor" opacity=".4"/>
            <circle cx="20" cy="55" r="2" fill="currentColor" opacity=".35"/>
        </svg>`,
    growth: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Mountain -->
            <path d="M10 105 L70 25 L130 105" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <!-- Snow cap -->
            <path d="M60 40 L70 25 L80 40 Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".8"/>
            <!-- Second mountain -->
            <path d="M80 105 L130 48 L180 105" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".7"/>
            <!-- Snow cap 2 -->
            <path d="M120 62 L130 48 L140 62 Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".7"/>
            <!-- Flag on first peak -->
            <line x1="70" y1="25" x2="70" y2="10" stroke="currentColor" stroke-width="1.6" opacity=".9"/>
            <path d="M70 10 L82 14 L70 18" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".9"/>
            <!-- Target rings top right -->
            <circle cx="175" cy="28" r="14" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".5"/>
            <circle cx="175" cy="28" r="8"  stroke="currentColor" stroke-width="1.3" fill="none" opacity=".6"/>
            <circle cx="175" cy="28" r="3"  stroke="currentColor" stroke-width="1.3" fill="none" opacity=".8"/>
            <!-- Ground line -->
            <line x1="5" y1="108" x2="195" y2="108" stroke="currentColor" stroke-width="1.2" opacity=".3"/>
        </svg>`,
    society: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- People outlines: 3 figures -->
            <!-- Center person -->
            <circle cx="100" cy="30" r="12" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <path d="M78 80 C78 55 122 55 122 80" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <!-- Left person -->
            <circle cx="55" cy="38" r="10" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".7"/>
            <path d="M35 85 C35 63 75 63 75 85" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".7"/>
            <!-- Right person -->
            <circle cx="145" cy="38" r="10" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".7"/>
            <path d="M125 85 C125 63 165 63 165 85" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".7"/>
            <!-- Connection arcs -->
            <path d="M65 55 Q100 45 135 55" stroke="currentColor" stroke-width="1.2" fill="none" stroke-dasharray="4 3" opacity=".5"/>
            <!-- Heart -->
            <path d="M96 104 L100 109 L104 104 A3 3 0 0 0 96 104Z" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".8"/>
        </svg>`,
    environment: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Tree trunk + foliage -->
            <line x1="100" y1="105" x2="100" y2="65" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
            <!-- Branches -->
            <line x1="100" y1="80" x2="80" y2="70" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
            <line x1="100" y1="72" x2="118" y2="62" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
            <!-- Leaf canopy -->
            <ellipse cx="100" cy="45" rx="32" ry="26" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".9"/>
            <ellipse cx="78"  cy="58" rx="18" ry="14" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".65"/>
            <ellipse cx="122" cy="54" rx="18" ry="14" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".65"/>
            <!-- Sun -->
            <circle cx="165" cy="25" r="12" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".8"/>
            <line x1="165" y1="8"  x2="165" y2="4"  stroke="currentColor" stroke-width="1.4" opacity=".7"/>
            <line x1="165" y1="42" x2="165" y2="46" stroke="currentColor" stroke-width="1.4" opacity=".7"/>
            <line x1="148" y1="25" x2="144" y2="25" stroke="currentColor" stroke-width="1.4" opacity=".7"/>
            <line x1="182" y1="25" x2="186" y2="25" stroke="currentColor" stroke-width="1.4" opacity=".7"/>
            <line x1="153" y1="13" x2="150" y2="10" stroke="currentColor" stroke-width="1.4" opacity=".6"/>
            <line x1="177" y1="37" x2="180" y2="40" stroke="currentColor" stroke-width="1.4" opacity=".6"/>
            <!-- Ground & roots -->
            <path d="M75 108 Q100 100 125 108" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".6"/>
            <path d="M90 105 Q85 112 78 115" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".4"/>
            <path d="M110 105 Q115 112 122 115" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".4"/>
            <!-- Small leaves -->
            <circle cx="30"  cy="70" r="5" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".5"/>
            <circle cx="22"  cy="82" r="4" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".4"/>
        </svg>`,
    health: `
        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Heart outline -->
            <path d="M100 95 L35 48 A28 28 0 0 1 100 28 A28 28 0 0 1 165 48 Z" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".85"/>
            <!-- ECG pulse line across heart -->
            <polyline points="55,60 70,60 80,35 90,85 100,60 110,60 120,45 130,60 145,60" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
            <!-- Cross / plus (medical) -->
            <line x1="175" y1="15" x2="175" y2="35" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
            <line x1="165" y1="25" x2="185" y2="25" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
            <!-- Small heartbeat dots -->
            <circle cx="25" cy="40" r="2.5" fill="currentColor" opacity=".4"/>
            <circle cx="20" cy="55" r="2" fill="currentColor" opacity=".35"/>
            <circle cx="28" cy="68" r="2" fill="currentColor" opacity=".3"/>
        </svg>`,
};

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

const ICON_FALLBACK_KEY = 'compass';

function iconMeta(key) {
    return ICON_LIBRARY[key] || ICON_LIBRARY[ICON_FALLBACK_KEY];
}

function categoryColor(categoryKey) {
    return (ICON_CATEGORIES[categoryKey] || {}).color || '#8FB8A6';
}

/* Renders the small icon box used in lists / pickers */
function renderGroupIcon(iconKey, sizePx, iconPx) {
    const meta  = iconMeta(iconKey);
    const color = categoryColor(meta.category);
    return `<div class="group-icon-box" style="width:${sizePx}px;height:${sizePx}px;background:${color}1f;color:${color};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" width="${iconPx}" height="${iconPx}">
            ${meta.paths}
        </svg>
    </div>`;
}

/* ── deterministic per-group gradient ──────────────────────────
   Same seed always produces the same gradient (stable across
   re-renders), but every group gets its own angle/spread/stops
   instead of one flat category color. Stays anchored to the
   category color so the palette still reads as "finance = green
   family", etc. — just no two groups in that family look identical. */
function hashSeed(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
}

/* Shift a hex color's hue-ish balance + lightness slightly, seeded */
function shade(hex, seed, lightenBy, hueShift) {
    const { r, g, b } = hexToRgb(hex);
    const rs = r + hueShift.r + lightenBy;
    const gs = g + hueShift.g + lightenBy;
    const bs = b + hueShift.b + lightenBy;
    return rgbToHex(rs, gs, bs);
}

function groupGradient(iconKey, seedStr) {
    const meta  = iconMeta(iconKey);
    const base  = categoryColor(meta.category);
    const seed  = hashSeed(seedStr || iconKey);

    const angle = 25 + (seed % 130);                       // 25–155deg
    const hueR  = ((seed >> 3) % 41) - 20;                  // -20..20
    const hueG  = ((seed >> 7) % 41) - 20;
    const hueB  = ((seed >> 11) % 41) - 20;

    const stopA = shade(base, seed, 6,  { r: hueR, g: hueG, b: hueB });
    const stopB = shade(base, seed, -18, { r: -hueR, g: -hueB, b: hueG });

    return { angle, stopA, stopB, base };
}

/* Renders the large thumbnail (illustration + icon overlay) for a group card header.
   seedStr should be the group's id (or name as fallback) so the gradient is
   unique per group but stable across re-renders. */
function renderGroupThumbnail(iconKey, widthPx, heightPx, seedStr) {
    const meta  = iconMeta(iconKey);
    const color = categoryColor(meta.category);
    const illus = CATEGORY_ILLUSTRATIONS[meta.category] || CATEGORY_ILLUSTRATIONS.growth;
    const grad  = groupGradient(iconKey, seedStr);

    return `<div class="group-thumbnail" style="
        width:${widthPx}px;height:${heightPx}px;
        background:linear-gradient(${grad.angle}deg, ${grad.stopA}2e, ${grad.stopB}17 55%, ${grad.stopB}05);
        border-bottom:1px solid ${color}22;
        color:${color};
        position:relative;overflow:hidden;display:flex;
        align-items:center;justify-content:center;border-radius:12px 12px 0 0;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;
                    justify-content:center;opacity:.55;">
            ${illus}
        </div>
        <div class="group-icon-box" style="position:relative;z-index:1;
            width:44px;height:44px;background:${color}26;
            border:1.5px solid ${color}4d;backdrop-filter:blur(6px);
            -webkit-backdrop-filter:blur(6px);color:${color};">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                ${meta.paths}
            </svg>
        </div>
    </div>`;
}

window.EconovoIcons = {
    ICON_CATEGORIES,
    ICON_LIBRARY,
    CATEGORY_ILLUSTRATIONS,
    iconMeta,
    categoryColor,
    groupGradient,
    renderGroupIcon,
    renderGroupThumbnail,
};
