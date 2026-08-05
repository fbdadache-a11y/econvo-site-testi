/* ==========================================================================
   ECONOVO — composer.js
   Rich text composer:
   - تنسيق ديسكورد: **bold** *italic* __underline__ ~~strike~~ `code` > quote
   - bidi-stable: كل سطر يختار اتجاهه تلقائياً بدلاً من قفز النص
   - شريط أدوات تنسيق مرئي فوق منطقة الكتابة
   - دالة parseMarkdown() تحوّل النص إلى HTML آمن عند العرض
   ========================================================================== */

'use strict';

/* ══════════════════════════════════════════════════════════════
   MARKDOWN → HTML  (safe subset, no XSS)
   ══════════════════════════════════════════════════════════════ */

function escH(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/**
 * Converts a plain-text string with Discord-style markup into safe HTML.
 * Supported:
 *   **bold**  *italic*  __underline__  ~~strikethrough~~
 *   `inline code`  ```code block```  > blockquote  ||spoiler||
 */
window.parseMarkdown = function parseMarkdown(text) {
    if (!text) return '';

    /* ── 1. حماية كتل الكود أولاً (قبل أي معالجة) ── */
    const codeBlocks = [];
    const inlineCodes = [];

    // كتل كود متعددة الأسطر ```lang\n...\n```
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = codeBlocks.length;
        const langAttr = lang ? ` data-lang="${escH(lang)}"` : '';
        codeBlocks.push(
            `<pre class="md-codeblock-wrap"${langAttr}><code class="md-codeblock">${escH(code.replace(/^\n|\n$/g, ''))}</code></pre>`
        );
        return `\x00CODE_BLOCK_${idx}\x00`;
    });

    // كود داخل السطر `code`
    text = text.replace(/`([^`\n]+?)`/g, (_, code) => {
        const idx = inlineCodes.length;
        inlineCodes.push(`<code class="md-code">${escH(code)}</code>`);
        return `\x00INLINE_CODE_${idx}\x00`;
    });

    /* ── 2. معالجة سطر بسطر ── */
    const lines = text.split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        /* فاصل أفقي --- */
        if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            out.push('<hr class="md-hr">');
            i++; continue;
        }

        /* عناوين # ## ### #### */
        const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = processInline(headingMatch[2]);
            const sizes = ['1.35rem','1.15rem','1rem','.9rem'];
            const weights = ['800','700','700','600'];
            out.push(
                `<div class="md-heading md-h${level}" style="font-size:${sizes[level-1]};font-weight:${weights[level-1]};` +
                `margin:${level===1?'14px':'10px'} 0 6px;letter-spacing:-.02em;color:var(--text);` +
                `line-height:1.3;unicode-bidi:plaintext;">${content}</div>`
            );
            i++; continue;
        }

        /* اقتباس > */
        if (/^>\s?/.test(line)) {
            const quoteLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^>\s?/, ''));
                i++;
            }
            const quoteContent = quoteLines.map(l => processInline(l)).join('<br>');
            out.push(`<blockquote class="md-quote">${quoteContent}</blockquote>`);
            continue;
        }

        /* جدول | col | col | */
        if (/^\|.+\|/.test(line) && i + 1 < lines.length && /^\|[\s\-|:]+\|/.test(lines[i+1])) {
            const headers = parseTableRow(line);
            i += 2; // تخطي سطر الفاصل
            const rows = [];
            while (i < lines.length && /^\|.+\|/.test(lines[i])) {
                rows.push(parseTableRow(lines[i]));
                i++;
            }
            const thead = `<tr>${headers.map(h => `<th class="md-th">${processInline(h)}</th>`).join('')}</tr>`;
            const tbody = rows.map(row =>
                `<tr>${row.map(cell => `<td class="md-td">${processInline(cell)}</td>`).join('')}</tr>`
            ).join('');
            out.push(`<div class="md-table-wrap"><table class="md-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`);
            continue;
        }

        /* قائمة نقطية - أو * */
        if (/^(\s*)[-*]\s+/.test(line)) {
            const listItems = [];
            const baseIndent = line.match(/^(\s*)/)[1].length;
            while (i < lines.length && /^(\s*)[-*]\s+/.test(lines[i])) {
                const itemLine = lines[i];
                const indent   = itemLine.match(/^(\s*)/)[1].length;
                const content  = itemLine.replace(/^\s*[-*]\s+/, '');

                // checkbox - [x] أو - [ ]
                const checkMatch = content.match(/^\[(x| )\]\s*(.*)/i);
                if (checkMatch) {
                    const checked = checkMatch[1].toLowerCase() === 'x';
                    listItems.push(
                        `<li class="md-li md-li-check" style="margin-left:${(indent - baseIndent) * 16}px">` +
                        `<span class="md-checkbox${checked ? ' checked' : ''}">${checked ? '✓' : ''}</span>` +
                        `<span class="${checked ? 'md-checked-text' : ''}">${processInline(checkMatch[2])}</span></li>`
                    );
                } else {
                    listItems.push(
                        `<li class="md-li" style="margin-left:${(indent - baseIndent) * 16}px">` +
                        `${processInline(content)}</li>`
                    );
                }
                i++;
            }
            out.push(`<ul class="md-ul">${listItems.join('')}</ul>`);
            continue;
        }

        /* قائمة مرقمة 1. 2. */
        if (/^\d+\.\s+/.test(line)) {
            const listItems = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                const content = lines[i].replace(/^\d+\.\s+/, '');
                listItems.push(`<li class="md-li">${processInline(content)}</li>`);
                i++;
            }
            out.push(`<ol class="md-ol">${listItems.join('')}</ol>`);
            continue;
        }

        /* سطر فارغ */
        if (line.trim() === '') {
            out.push('<div class="md-spacer"></div>');
            i++; continue;
        }

        /* سطر عادي */
        out.push(`<div class="md-p" style="unicode-bidi:plaintext;">${processInline(line)}</div>`);
        i++;
    }

    /* ── 3. استعادة كتل الكود ── */
    let result = out.join('');
    codeBlocks.forEach((block, idx) => {
        result = result.replace(`\x00CODE_BLOCK_${idx}\x00`, block);
    });
    inlineCodes.forEach((code, idx) => {
        result = result.replace(`\x00INLINE_CODE_${idx}\x00`, code);
    });

    return result;
};

/* ── معالجة التنسيق داخل السطر ── */
function processInline(text) {
    if (!text) return '';

    // استعادة كتل الكود المحفوظة أولاً
    let t = text;

    // روابط [text](url)
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');

    // روابط مباشرة https://...
    t = t.replace(/(?<!["\(])(https?:\/\/[^\s<>"']+)/g,
        '<a class="md-link" href="$1" target="_blank" rel="noopener">$1</a>');

    // Bold+Italic ***text***
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // **bold**
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // *italic*
    t = t.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

    // __underline__
    t = t.replace(/__(.+?)__/g, '<u>$1</u>');

    // ~~strikethrough~~
    t = t.replace(/~~(.+?)~~/g, '<s>$1</s>');

    // ||spoiler||
    t = t.replace(/\|\|(.+?)\|\|/g,
        '<span class="md-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

    return t;
}

/* ── مساعد تحليل صفوف الجدول ── */
function parseTableRow(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

/* ── هروب HTML آمن ── */
function escH(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}


/* ══════════════════════════════════════════════════════════════
   TOOLBAR DEFINITION
   ══════════════════════════════════════════════════════════════ */

const TOOLBAR_ACTIONS = [
    {
        id: 'bold', label: 'Bold (Ctrl+B)', wrap: ['**','**'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
    },
    {
        id: 'italic', label: 'Italic (Ctrl+I)', wrap: ['*','*'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
    },
    {
        id: 'underline', label: 'Underline (Ctrl+U)', wrap: ['__','__'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
    },
    {
        id: 'strike', label: 'Strikethrough', wrap: ['~~','~~'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
    },
    { id: 'sep' }, // divider
    {
        id: 'code', label: 'Inline code', wrap: ['`','`'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    },
    {
        id: 'quote', label: 'Quote', prefix: '> ',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    },
    {
        id: 'spoiler', label: 'Spoiler', wrap: ['||','||'],
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    },
];

/* ══════════════════════════════════════════════════════════════
   createRichComposer(opts) → { el, getValue, setValue, reset }
   opts: { placeholder, maxLength, onInput, className }
   ══════════════════════════════════════════════════════════════ */

window.createRichComposer = function createRichComposer(opts = {}) {
    const maxLength   = opts.maxLength   || 9999999;
    const placeholder = opts.placeholder || 'Write something…';

    /* ── Wrapper ── */
    const wrap = document.createElement('div');
    wrap.className = 'rte-wrap ' + (opts.className || '');

    /* ── Toolbar ── */
    const toolbar = document.createElement('div');
    toolbar.className = 'rte-toolbar';
    toolbar.setAttribute('aria-label', 'Formatting toolbar');

    TOOLBAR_ACTIONS.forEach(action => {
        if (action.id === 'sep') {
            const sep = document.createElement('span');
            sep.className = 'rte-sep';
            toolbar.appendChild(sep);
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rte-tool-btn';
        btn.title = action.label;
        btn.setAttribute('aria-label', action.label);
        btn.innerHTML = action.icon;
        btn.dataset.action = action.id;
        toolbar.appendChild(btn);
    });

    /* ── Textarea ── */
    const ta = document.createElement('textarea');
    ta.className = 'rte-textarea';
    ta.placeholder = placeholder;
    ta.maxLength = maxLength;
    ta.rows = 3;
    ta.setAttribute('dir', 'auto');          // bidi-stable per-paragraph
    ta.setAttribute('autocomplete', 'off');
    ta.setAttribute('spellcheck', 'true');

    /* ── Char counter ── */
    const charCount = document.createElement('span');
    charCount.className = 'rte-char-count';
    charCount.textContent = `0` ;

    /* ── Assemble ── */
    const footer = document.createElement('div');
    footer.className = 'rte-footer';
    footer.appendChild(charCount);
    wrap.append(toolbar, ta, footer);

    /* ── Toolbar click handler ── */
    toolbar.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.rte-tool-btn');
        if (!btn) return;
        e.preventDefault();   // don't blur the textarea
        const actionId = btn.dataset.action;
        const def = TOOLBAR_ACTIONS.find(a => a.id === actionId);
        if (!def) return;
        applyFormat(ta, def);
        ta.focus();
    });

    /* ── Keyboard shortcuts ── */
    ta.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const shortcuts = { b: 'bold', i: 'italic', u: 'underline' };
            const actionId = shortcuts[e.key.toLowerCase()];
            if (actionId) {
                e.preventDefault();
                const def = TOOLBAR_ACTIONS.find(a => a.id === actionId);
                if (def) applyFormat(ta, def);
            }
        }
        // Tab → 4 spaces (don't lose focus for code blocks)
        if (e.key === 'Tab') {
            e.preventDefault();
            insertAtCursor(ta, '    ');
        }
    });

    /* ── Char count update ── */
    ta.addEventListener('input', () => {
        const len = ta.value.length;
        charCount.textContent = `${len}`;
        if (opts.onInput) opts.onInput(ta.value);
    });

    /* ── Public API ── */
    function getValue() { return ta.value; }
    function setValue(v) {
        ta.value = v || '';
        charCount.textContent = `${ta.value.length}`;
    }
    function reset() { setValue(''); }
    function focus() { ta.focus(); }

    return { el: wrap, textarea: ta, getValue, setValue, reset, focus };
};

/* ── Apply a formatting action to a textarea ── */
function applyFormat(ta, def) {
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const val   = ta.value;
    const sel   = val.slice(start, end);

    if (def.prefix) {
        // Line prefix (e.g. "> " for blockquote)
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const before = val.slice(0, lineStart);
        const after  = val.slice(lineStart);
        const line   = val.slice(lineStart, end);

        const alreadyApplied = line.startsWith(def.prefix);
        let newVal, newCaret;
        if (alreadyApplied) {
            newVal   = before + line.slice(def.prefix.length);
            newCaret = start - def.prefix.length;
        } else {
            newVal   = before + def.prefix + after;
            newCaret = start + def.prefix.length;
        }
        setNativeValue(ta, newVal);
        ta.setSelectionRange(newCaret, newCaret + (end - start));
    } else if (def.wrap) {
        const [open, close] = def.wrap;
        // Toggle: if already wrapped, unwrap
        const wrapped   = val.slice(start - open.length, start) === open &&
                          val.slice(end, end + close.length) === close;
        let newVal, newStart, newEnd;
        if (wrapped) {
            newVal   = val.slice(0, start - open.length) + sel + val.slice(end + close.length);
            newStart = start - open.length;
            newEnd   = newStart + sel.length;
        } else {
            newVal   = val.slice(0, start) + open + sel + close + val.slice(end);
            newStart = start + open.length;
            newEnd   = newStart + sel.length;
        }
        setNativeValue(ta, newVal);
        ta.setSelectionRange(newStart, newEnd);
    }
}

function insertAtCursor(ta, text) {
    const s = ta.selectionStart, e = ta.selectionEnd;
    const v = ta.value;
    setNativeValue(ta, v.slice(0, s) + text + v.slice(e));
    ta.setSelectionRange(s + text.length, s + text.length);
}

/* Triggers React-style synthetic events so frameworks detect the change */
function setNativeValue(el, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
