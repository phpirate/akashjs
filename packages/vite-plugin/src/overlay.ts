/**
 * AkashJS error overlay for development.
 *
 * Injects a styled error panel into the browser when a .akash
 * file has compile errors. Disappears on successful recompile.
 */

export function generateOverlayCode(errors: Array<{ message: string; line?: number; column?: number; code?: string }>, filename: string): string {
  if (errors.length === 0) return '';

  const errorHtml = errors.map(e => {
    const loc = e.line ? ` (line ${e.line}${e.column ? `:${e.column}` : ''})` : '';
    const code = e.code ? `<span style="color:#888">[${e.code}]</span> ` : '';
    return `<div style="margin:8px 0;padding:8px 12px;background:#2a1215;border-radius:6px;border-left:3px solid #f87171">${code}${escapeHtml(e.message)}${loc}</div>`;
  }).join('');

  const shortName = filename.split('/').pop() ?? filename;

  return `
;(function() {
  var id = '__akash_error_overlay__';
  var old = document.getElementById(id);
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = id;
  overlay.innerHTML = \`
    <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);color:#f1f1f1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;padding:32px;overflow:auto;backdrop-filter:blur(4px)">
      <div style="max-width:800px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <span style="font-size:28px">⚠️</span>
          <div>
            <div style="font-size:16px;font-weight:600;color:#f87171">Compile Error</div>
            <div style="color:#999;margin-top:2px">${escapeHtml(shortName)}</div>
          </div>
        </div>
        ${errorHtml}
        <div style="margin-top:20px;color:#666;font-size:11px">Fix the error and save — the overlay will disappear automatically.</div>
      </div>
    </div>
  \`;
  document.body.appendChild(overlay);
})();
`;
}

export function generateOverlayClearCode(): string {
  return `
;(function() {
  var el = document.getElementById('__akash_error_overlay__');
  if (el) el.remove();
})();
`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
