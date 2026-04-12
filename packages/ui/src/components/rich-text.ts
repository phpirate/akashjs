/**
 * Rich Text Editor components for AkashJS.
 *
 * - RichTextEditor — WYSIWYG editor with toolbar (uses execCommand, no deps)
 * - ContentEditable — simple editable text with cursor preservation
 *
 * RichTextEditor features:
 * - Toolbar: Bold, Italic, Underline, Strikethrough, Headings (h1-h6),
 *   Blockquote, Ordered/Bullet lists, Link
 * - Output: HTML or Markdown (built-in conversion)
 * - Signal-based value/onChange binding
 * - Disabled/readonly states
 * - Placeholder text
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K)
 * - Plain-text paste option
 *
 * ContentEditable features:
 * - Plain text contenteditable with cursor preservation
 * - Conditional editing (editable prop)
 * - Plain-text paste
 * - Enter key behavior config
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

// ============================================================================
// HTML ↔ Markdown conversion (lightweight, no dependencies)
// ============================================================================

/** Convert HTML to Markdown (covers bold, italic, underline, strike, headings, lists, links, blockquote) */
function htmlToMarkdown(html: string): string {
  let md = html;
  // Block elements first
  md = md.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => '\n' + '#'.repeat(parseInt(level)) + ' ' + stripTags(text) + '\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (_, text) => '\n> ' + stripTags(text).replace(/\n/g, '\n> ') + '\n');
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, items) => {
    let i = 0;
    return '\n' + items.replace(/<li[^>]*>(.*?)<\/li>/gi, (_: string, text: string) => `${++i}. ${stripTags(text)}\n`);
  });
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, items) =>
    '\n' + items.replace(/<li[^>]*>(.*?)<\/li>/gi, (_: string, text: string) => `- ${stripTags(text)}\n`)
  );
  // Inline
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>'); // no standard MD for underline
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  md = md.replace(/<[^>]+>/g, ''); // strip remaining tags
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

/** Convert Markdown to HTML (covers same features) */
function escapeHtmlForMd(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  // Step 1: Escape all HTML to prevent XSS
  let html = escapeHtmlForMd(md);

  // Fenced code blocks: ```lang\n...\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${cls}>${code.trimEnd()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Horizontal rules: ---, ***, ___
  html = html.replace(/^([-*_]){3,}\s*$/gm, '<hr>');

  // Block elements
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`);
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables: | A | B |\n|---|---|\n| 1 | 2 |
  html = html.replace(
    /^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_, headerRow, _sep, bodyRows) => {
      const headers = headerRow.split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    },
  );

  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.trim().startsWith('<li>') && !match.includes('<ul>') && !match.includes('<ol>')) return `<ol>${match}</ol>`;
    return match;
  });
  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (!match.includes('<ol>') && !match.includes('<ul>')) return `<ul>${match}</ul>`;
    return match;
  });

  // Inline formatting
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    // Sanitize href — block javascript: and data: URIs
    const lower = href.trim().toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:')) return text;
    return `<a href="${href}">${text}</a>`;
  });

  // Paragraphs — wrap text blocks not already in block elements
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;
  const blockRe = /^<(h[1-6]|blockquote|pre|ul|ol|li|table|thead|tbody|tr|th|td|hr|img)/;

  for (const line of lines) {
    if (!line.trim()) {
      if (inParagraph) { result.push('</p>'); inParagraph = false; }
      continue;
    }
    if (blockRe.test(line)) {
      if (inParagraph) { result.push('</p>'); inParagraph = false; }
      result.push(line);
    } else {
      if (!inParagraph) { result.push('<p>'); inParagraph = true; }
      else { result.push('<br>'); }
      result.push(line);
    }
  }
  if (inParagraph) result.push('</p>');

  return result.join('\n');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

// ============================================================================
// Toolbar definitions
// ============================================================================

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  command: string;
  commandArg?: string;
}

const TOOLBAR_ACTIONS: Record<string, ToolbarAction> = {
  bold: { id: 'bold', label: 'Bold', icon: 'B', shortcut: 'Ctrl+B', command: 'bold' },
  italic: { id: 'italic', label: 'Italic', icon: 'I', shortcut: 'Ctrl+I', command: 'italic' },
  underline: { id: 'underline', label: 'Underline', icon: 'U', shortcut: 'Ctrl+U', command: 'underline' },
  strike: { id: 'strike', label: 'Strikethrough', icon: 'S', shortcut: '', command: 'strikeThrough' },
  h1: { id: 'h1', label: 'Heading 1', icon: 'H1', command: 'formatBlock', commandArg: 'h1' },
  h2: { id: 'h2', label: 'Heading 2', icon: 'H2', command: 'formatBlock', commandArg: 'h2' },
  h3: { id: 'h3', label: 'Heading 3', icon: 'H3', command: 'formatBlock', commandArg: 'h3' },
  h4: { id: 'h4', label: 'Heading 4', icon: 'H4', command: 'formatBlock', commandArg: 'h4' },
  h5: { id: 'h5', label: 'Heading 5', icon: 'H5', command: 'formatBlock', commandArg: 'h5' },
  h6: { id: 'h6', label: 'Heading 6', icon: 'H6', command: 'formatBlock', commandArg: 'h6' },
  paragraph: { id: 'paragraph', label: 'Paragraph', icon: 'P', command: 'formatBlock', commandArg: 'p' },
  blockquote: { id: 'blockquote', label: 'Blockquote', icon: '\u201C', command: 'formatBlock', commandArg: 'blockquote' },
  ordered_list: { id: 'ordered_list', label: 'Numbered List', icon: '1.', command: 'insertOrderedList' },
  bullet_list: { id: 'bullet_list', label: 'Bullet List', icon: '\u2022', command: 'insertUnorderedList' },
  link: { id: 'link', label: 'Link', icon: '\uD83D\uDD17', shortcut: 'Ctrl+K', command: 'createLink' },
};

// ============================================================================
// RichTextEditor
// ============================================================================

export type ToolbarItem = string | '|' | { heading: string[] };

export interface RichTextEditorProps {
  /** HTML content value */
  value?: string;
  /** Change handler — receives HTML or Markdown based on outputFormat */
  onChange?: (content: string) => void;
  /** Toolbar configuration (default: basic formatting) */
  toolbar?: ToolbarItem[];
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only mode */
  readonly?: boolean;
  /** Output format: 'html' (default) or 'markdown' */
  outputFormat?: 'html' | 'markdown';
  /** Min height of editor area (default: '120px') */
  minHeight?: string;
  /** Max height (scrollable, default: none) */
  maxHeight?: string;
  /** Strip formatting on paste */
  pasteAsPlainText?: boolean;
  /** Custom CSS class */
  class?: string;
}

const DEFAULT_TOOLBAR: ToolbarItem[] = [
  'bold', 'italic', 'underline', 'strike', '|',
  'h1', 'h2', 'h3', '|',
  'blockquote', '|',
  'ordered_list', 'bullet_list', '|',
  'link',
];

export const RichTextEditor = defineComponent<RichTextEditorProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const readonly_ = props.readonly ?? false;
    const outputFormat = props.outputFormat ?? 'html';
    const pasteAsPlainText = props.pasteAsPlainText ?? false;
    const toolbar = props.toolbar ?? DEFAULT_TOOLBAR;
    const minHeight = props.minHeight ?? '120px';
    const maxHeight = props.maxHeight;
    const placeholder = props.placeholder ?? '';

    const internalValue = signal(readProp(props.value) ?? '');
    if (typeof props.value === 'function') {
      effect(() => {
        const ext = (props.value as unknown as () => string)();
        internalValue.set(ext ?? '');
      });
    }

    const wrapper = document.createElement('div');
    wrapper.className = props.class ?? '';
    wrapper.style.cssText = `
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: 8px; overflow: hidden;
      font-family: var(--md-sys-typescale-body-large-font, system-ui);
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // --- Toolbar ---
    if (!readonly_) {
      const toolbarEl = document.createElement('div');
      toolbarEl.style.cssText = `
        display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
        background: var(--md-sys-color-surface-container, #f5f5f5);
        align-items: center;
      `;

      function flattenToolbar(items: ToolbarItem[]): (string | '|')[] {
        const result: (string | '|')[] = [];
        for (const item of items) {
          if (typeof item === 'string') {
            result.push(item);
          } else if (typeof item === 'object' && 'heading' in item) {
            for (const h of item.heading) result.push(h);
          }
        }
        return result;
      }

      for (const item of flattenToolbar(toolbar)) {
        if (item === '|') {
          const sep = document.createElement('div');
          sep.style.cssText = 'width: 1px; height: 24px; background: var(--md-sys-color-outline-variant, #c4c7c5); margin: 0 4px;';
          toolbarEl.appendChild(sep);
          continue;
        }

        const action = TOOLBAR_ACTIONS[item];
        if (!action) continue;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = action.label + (action.shortcut ? ` (${action.shortcut})` : '');
        btn.textContent = action.icon;
        btn.style.cssText = `
          border: none; background: none; cursor: pointer;
          width: 32px; height: 32px; border-radius: 4px;
          font-size: ${action.icon.length > 1 ? '12px' : '14px'};
          font-weight: ${item === 'bold' ? '700' : item === 'italic' ? 'normal' : '500'};
          font-style: ${item === 'italic' ? 'italic' : 'normal'};
          text-decoration: ${item === 'underline' ? 'underline' : item === 'strike' ? 'line-through' : 'none'};
          font-family: inherit;
          color: var(--md-sys-color-on-surface, #1d1b20);
          display: flex; align-items: center; justify-content: center;
          transition: background 80ms;
        `;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--md-sys-color-surface-container-highest, #e6e0e9)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = ''; });
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in editor
        btn.addEventListener('click', () => {
          editorEl.focus();
          if (action.command === 'createLink') {
            const url = prompt('Enter URL:');
            if (url) document.execCommand('createLink', false, url);
          } else if (action.commandArg) {
            document.execCommand(action.command, false, action.commandArg);
          } else {
            document.execCommand(action.command, false);
          }
          emitChange();
        });
        toolbarEl.appendChild(btn);
      }

      wrapper.appendChild(toolbarEl);
    }

    // --- Editor area ---
    const editorEl = document.createElement('div');
    editorEl.contentEditable = readonly_ ? 'false' : 'true';
    editorEl.setAttribute('role', 'textbox');
    editorEl.setAttribute('aria-multiline', 'true');
    editorEl.style.cssText = `
      padding: 12px 16px; outline: none;
      min-height: ${minHeight};
      ${maxHeight ? `max-height: ${maxHeight}; overflow-y: auto;` : ''}
      font-size: 14px; line-height: 1.6;
      color: var(--md-sys-color-on-surface, #1d1b20);
      position: relative;
    `;

    // Placeholder
    if (placeholder) {
      editorEl.dataset.placeholder = placeholder;
      if (!editorEl.id) editorEl.id = 'rte-' + Math.random().toString(36).slice(2, 8);
      if (!document.getElementById('akash-rte-placeholder-style')) {
        const style = document.createElement('style');
        style.id = 'akash-rte-placeholder-style';
        style.textContent = `
          [data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: var(--md-sys-color-on-surface-variant, #49454f);
            pointer-events: none;
            font-style: italic;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Set initial content
    effect(() => {
      const val = internalValue();
      if (editorEl.innerHTML !== val && document.activeElement !== editorEl) {
        editorEl.innerHTML = val;
      }
    });

    function emitChange() {
      const html = editorEl.innerHTML;
      internalValue.set(html);
      if (outputFormat === 'markdown') {
        props.onChange?.(htmlToMarkdown(html));
      } else {
        props.onChange?.(html);
      }
    }

    editorEl.addEventListener('input', emitChange);

    // Plain-text paste
    if (pasteAsPlainText) {
      editorEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') ?? '';
        document.execCommand('insertText', false, text);
      });
    }

    // Keyboard shortcuts
    editorEl.addEventListener('keydown', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); document.execCommand('bold'); emitChange(); break;
        case 'i': e.preventDefault(); document.execCommand('italic'); emitChange(); break;
        case 'u': e.preventDefault(); document.execCommand('underline'); emitChange(); break;
        case 'k': {
          e.preventDefault();
          const url = prompt('Enter URL:');
          if (url) { document.execCommand('createLink', false, url); emitChange(); }
          break;
        }
      }
    });

    // Focus styling
    editorEl.addEventListener('focus', () => {
      wrapper.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
      wrapper.style.borderWidth = '2px';
      wrapper.style.margin = '-1px'; // compensate for thicker border
    });
    editorEl.addEventListener('blur', () => {
      wrapper.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      wrapper.style.borderWidth = '1px';
      wrapper.style.margin = '0';
    });

    wrapper.appendChild(editorEl);
    return wrapper;
  };
});

// ============================================================================
// ContentEditable — Simple editable text
// ============================================================================

export interface ContentEditableProps {
  /** Text value */
  value?: string;
  /** Change handler */
  onChange?: (text: string) => void;
  /** Whether editing is enabled (default: true) */
  editable?: boolean;
  /** Preserve cursor position on external value updates */
  preserveCursor?: boolean;
  /** Strip formatting on paste (default: true) */
  pasteAsPlainText?: boolean;
  /** Enter key behavior: 'newline' (default), 'submit', 'prevent' */
  enterBehavior?: 'newline' | 'submit' | 'prevent';
  /** Submit handler (for enterBehavior: 'submit') */
  onSubmit?: (text: string) => void;
  /** Blur handler */
  onBlur?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom CSS class */
  class?: string;
  /** Min height */
  minHeight?: string;
}

export const ContentEditable = defineComponent<ContentEditableProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const editable = readProp(props.editable) ?? true;
    const preserveCursor = props.preserveCursor ?? true;
    const pasteAsPlainText = props.pasteAsPlainText ?? true;
    const enterBehavior = props.enterBehavior ?? 'newline';
    const placeholder = props.placeholder ?? '';

    const internalValue = signal(readProp(props.value) ?? '');
    if (typeof props.value === 'function') {
      effect(() => {
        const ext = (props.value as unknown as () => string)();
        internalValue.set(ext ?? '');
      });
    }

    const el = document.createElement('div');
    el.contentEditable = String(editable);
    el.setAttribute('role', 'textbox');
    if (props.class) el.className = props.class;
    if (placeholder) el.dataset.placeholder = placeholder;
    el.style.cssText = `
      outline: none; padding: 8px 12px;
      font-family: inherit; font-size: 14px; line-height: 1.5;
      min-height: ${props.minHeight ?? '1.5em'};
      white-space: pre-wrap; word-wrap: break-word;
      color: var(--md-sys-color-on-surface, #1d1b20);
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: 4px;
      ${!editable ? 'opacity: 0.7; cursor: default;' : ''}
    `;

    // Placeholder style (reuse RTE style if available)
    if (placeholder && !document.getElementById('akash-rte-placeholder-style')) {
      const style = document.createElement('style');
      style.id = 'akash-rte-placeholder-style';
      style.textContent = `
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: var(--md-sys-color-on-surface-variant, #49454f);
          pointer-events: none;
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }

    // Sync value to DOM
    effect(() => {
      const val = internalValue();
      if (el.textContent !== val && document.activeElement !== el) {
        el.textContent = val;
      } else if (el.textContent !== val && preserveCursor) {
        // Save cursor
        const sel = window.getSelection();
        let cursorOffset = 0;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          cursorOffset = range.startOffset;
        }
        el.textContent = val;
        // Restore cursor
        if (sel && el.firstChild) {
          try {
            const range = document.createRange();
            range.setStart(el.firstChild, Math.min(cursorOffset, el.firstChild.textContent?.length ?? 0));
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch {}
        }
      }
    });

    // React to editable changes
    if (typeof props.editable === 'function') {
      effect(() => {
        const e = (props.editable as unknown as () => boolean)();
        el.contentEditable = String(e ?? true);
        el.style.opacity = e ? '' : '0.7';
        el.style.cursor = e ? '' : 'default';
      });
    }

    el.addEventListener('input', () => {
      const text = el.textContent ?? '';
      internalValue.set(text);
      props.onChange?.(text);
    });

    el.addEventListener('blur', () => {
      props.onBlur?.(el.textContent ?? '');
    });

    // Paste handling
    if (pasteAsPlainText) {
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') ?? '';
        document.execCommand('insertText', false, text);
      });
    }

    // Enter key behavior
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (enterBehavior === 'prevent') {
          e.preventDefault();
        } else if (enterBehavior === 'submit') {
          e.preventDefault();
          props.onSubmit?.(el.textContent ?? '');
        }
        // 'newline' — default browser behavior
      }
    });

    // Focus styling
    el.addEventListener('focus', () => {
      el.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
      el.style.borderWidth = '2px';
      el.style.padding = '7px 11px';
    });
    el.addEventListener('blur', () => {
      el.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      el.style.borderWidth = '1px';
      el.style.padding = '8px 12px';
    });

    return el;
  };
});

// ============================================================================
// Exported conversion utilities
// ============================================================================

export { htmlToMarkdown, markdownToHtml };
