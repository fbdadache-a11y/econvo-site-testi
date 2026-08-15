/* ==========================================================================
   ECONOVO — composer.js
   Rich text composer + Full Discord/Markdown parser
   ========================================================================== */

'use strict';

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

function escMd(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function parseTableRow(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function processInline(text) {
    if (!text) return '';
    let t = text;

    // روابط [text](url)
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');

    // روابط مباشرة
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

/* ══════════════════════════════════════════════════════════════
   MARKDOWN → HTML  (full Discord-style support)
   ══════════════════════════════════════════════════════════════ */

window.parseMarkdown = function parseMarkdown(text) {
    if (!text) return '';

    /* ── 1. حماية كتل الكود أولاً ── */
    const codeBlocks  = [];
    const inlineCodes = [];

    // كتل كود متعددة الأسطر ```lang\n...\n```
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx      = codeBlocks.length;
        const langAttr = lang ? ` data-lang="${escMd(lang)}"` : '';
        codeBlocks.push(
            `<pre class="md-codeblock-wrap"${langAttr}><code class="md-codeblock">${escMd(code.replace(/^\n|\n$/g,''))}</code></pre>`
        );
        return `\x00CODE_BLOCK_${idx}\x00`;
    });

    // كود داخل السطر `code`
    text = text.replace(/`([^`\n]+?)`/g, (_, code) => {
        const idx = inlineCodes.length;
        inlineCodes.push(`<code class="md-code">${escMd(code)}</code>`);
        return `\x00INLINE_CODE_${idx}\x00`;
    });

    /* ── 2. معالجة سطر بسطر ── */
    const lines = text.split('\n');
    const out   = [];
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
            const level   = headingMatch[1].length;
            const content = processInline(headingMatch[2]);
            const sizes   = ['1.35rem','1.15rem','1rem','.9rem'];
            const weights = ['800','700','700','600'];
            const margins = ['14px 0 6px','10px 0 5px','8px 0 4px','6px 0 3px'];
            out.push(
                `<div class="md-heading md-h${level}" style="font-size:${sizes[level-1]};` +
                `font-weight:${weights[level-1]};margin:${margins[level-1]};` +
                `letter-spacing:-.02em;color:var(--text);line-height:1.3;unicode-bidi:plaintext;">` +
                `${content}</div>`
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
            i += 2;
            const rows = [];
            while (i < lines.length && /^\|.+\|/.test(lines[i])) {
                rows.push(parseTableRow(lines[i]));
                i++;
            }
            const thead = `<tr>${headers.map(h => `<th class="md-th">${processInline(h)}</th>`).join('')}</tr>`;
            const tbody = rows.map(row =>
                `<tr>${row.map(cell => `<td class="md-td">${processInline(cell)}</td>`).join('')}</tr>`
            ).join('');
            out.push(
                `<div class="md-table-wrap"><table class="md-table">` +
                `<thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`
            );
            continue;
        }

        /* قائمة نقطية - أو * مع دعم checkbox */
        if (/^(\s*)[-*]\s+/.test(line)) {
            const listItems  = [];
            const baseIndent = (line.match(/^(\s*)/) || ['',''])[1].length;
            while (i < lines.length && /^(\s*)[-*]\s+/.test(lines[i])) {
                const itemLine = lines[i];
                const indent   = (itemLine.match(/^(\s*)/) || ['',''])[1].length;
                const content  = itemLine.replace(/^\s*[-*]\s+/, '');
                const checkMatch = content.match(/^\[(x| )\]\s*(.*)/i);

                if (checkMatch) {
                    const checked = checkMatch[1].toLowerCase() === 'x';
                    listItems.push(
                        `<li class="md-li md-li-check" style="margin-left:${(indent-baseIndent)*16}px">` +
                        `<span class="md-checkbox${checked?' checked':''}">${checked?'✓':''}</span>` +
                        `<span class="${checked?'md-checked-text':''}">${processInline(checkMatch[2])}</span></li>`
                    );
                } else {
                    listItems.push(
                        `<li class="md-li" style="margin-left:${(indent-baseIndent)*16}px">` +
                        `<span class="md-bullet">•</span><span>${processInline(content)}</span></li>`
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
                listItems.push(`<li class="md-li md-li-ol">${processInline(content)}</li>`);
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
