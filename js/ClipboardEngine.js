/**
 * Thesis Interpretation Assistant — Unified Clipboard Engine
 * Shared Copy All logic for Profile, Likert, Summary.
 * Ensures complete table (including final AWM/summary row) and interpretation are copied.
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  /**
   * Copy rich HTML + plain text to clipboard (Word-friendly).
   * @param {string} html
   * @param {string} plain
   * @param {Function} showToast - fn(message, isError)
   */
  function copyRichToClipboard(html, plain, showToast) {
    var toast = typeof showToast === 'function' ? showToast : function () {};
    if (!navigator.clipboard || !navigator.clipboard.write) {
      navigator.clipboard.writeText(plain).then(function () { toast('Copied as text.'); }).catch(function () { toast('Copy failed.', true); });
      return;
    }
    var blobHtml = new Blob([html], { type: 'text/html' });
    var blobPlain = new Blob([plain], { type: 'text/plain' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })
    ]).then(function () {
      toast('Copied! Paste into Word to keep table format.');
    }).catch(function () {
      navigator.clipboard.writeText(plain).then(function () { toast('Copied as text.'); }).catch(function () { toast('Copy failed.', true); });
    });
  }

  /**
   * Build full copy payload: title + table (with footer) + interpretation.
   * Caller provides tableHtml/tablePlain that MUST include the AWM/footer row.
   */
  function buildCopyPayload(tableTitle, tableHtml, tablePlain, interpretationText) {
    var titleHtml = tableTitle ? '<p style="margin-bottom: 0.5em; font-weight: bold;">' + escapeHtml(tableTitle) + '</p>' : '';
    var interpHtml = interpretationText ? '<p style="margin-top: 1em;">' + escapeHtml(interpretationText).replace(/\n/g, '<br>') + '</p>' : '';
    var fullHtml = titleHtml + tableHtml + interpHtml;
    var fullPlain = (tableTitle ? tableTitle + '\n\n' : '') + tablePlain + (interpretationText ? '\n' + interpretationText : '');
    return { html: fullHtml, plain: fullPlain };
  }

  global.ClipboardEngine = {
    copyRichToClipboard: copyRichToClipboard,
    buildCopyPayload: buildCopyPayload,
    escapeHtml: escapeHtml
  };
})(typeof window !== 'undefined' ? window : this);
