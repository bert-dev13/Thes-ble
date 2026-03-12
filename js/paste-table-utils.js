/**
 * Paste Table Utils — Parse table data from Word, Excel, Google Docs, or plain tabular text.
 * Used by Profile Analyzer and Likert Analyzer for "Paste Table Data" feature.
 * Strips formatting; returns only cell values as rows of columns.
 */
(function (global) {
  'use strict';

  var PROFILE_HEADERS = ['no', 'no.', 'particulars', 'frequency', 'f', 'percentage', '%', 'rank'];
  var LIKERT_HEADERS = ['no', 'no.', 'particulars', 'weighted mean', 'w.m.', 'wm', 'qualitative description', 'q.d.', 'qd', 'rank'];
  var PROFILE_TWO_GROUP_HEADERS = ['particulars', 'school heads', 'teachers', 'heads', 'f', 'percentage', '%', 'rank'];
  var LIKERT_TWO_GROUP_HEADERS = ['particulars', 'school heads', 'teachers', 'w.m.', 'wm', 'q.d.', 'qd', 'rank'];
  var LIKERT_TTEST_HEADERS = ['particulars', 't-value', 't-critical', 'p-value', 'decision', 'description'];

  /**
   * Get plain text from HTML (strip tags, normalize whitespace).
   * @param {string} html
   * @returns {string}
   */
  function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse HTML table from clipboard (Word/Excel/Google Docs often paste as table).
   * @param {string} html
   * @returns {string[][]} rows of cell values (trimmed)
   */
  function parseHtmlTable(html) {
    var rows = [];
    if (!html || typeof html !== 'string') return rows;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var table = doc.querySelector('table');
      if (!table) return rows;
      var trs = table.querySelectorAll('tr');
      for (var i = 0; i < trs.length; i++) {
        var cells = [];
        var ths = trs[i].querySelectorAll('th');
        var tds = trs[i].querySelectorAll('td');
        for (var j = 0; j < ths.length; j++) {
          cells.push(htmlToPlainText(ths[j].innerHTML).trim());
        }
        for (var j = 0; j < tds.length; j++) {
          cells.push(htmlToPlainText(tds[j].innerHTML).trim());
        }
        if (cells.length) rows.push(cells);
      }
    } catch (e) {
      // ignore
    }
    return rows;
  }

  /**
   * Parse plain text: lines = rows, tabs or multiple spaces = column separators.
   * @param {string} text
   * @returns {string[][]}
   */
  function parsePlainTable(text) {
    var rows = [];
    if (!text || typeof text !== 'string') return rows;
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      // Split by tab first (Excel/Sheets), then fallback to 2+ spaces
      var cells = line.indexOf('\t') !== -1
        ? line.split(/\t/)
        : line.split(/\s{2,}/);
      var trimmed = cells.map(function (c) { return c.trim(); });
      if (trimmed.some(function (c) { return c.length > 0; })) {
        rows.push(trimmed);
      }
    }
    return rows;
  }

  /**
   * Normalize rows so every row has the same number of columns (pad with empty string).
   * Ensures consistent structure for mapping regardless of source (Word, Excel, PDF text).
   * @param {string[][]} rows
   * @returns {string[][]}
   */
  function normalizeRowLengths(rows) {
    if (!rows || !rows.length) return rows || [];
    var maxCols = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].length > maxCols) maxCols = rows[i].length;
    }
    if (maxCols === 0) return rows;
    return rows.map(function (row) {
      var r = row || [];
      while (r.length < maxCols) r.push('');
      return r;
    });
  }

  /**
   * Parse clipboard content into rows of cells. Prefer HTML if present (Word/Excel).
   * Normalizes row lengths so all rows have the same column count.
   * @param {DataTransfer} clipboardData
   * @returns {{ rows: string[][], source: 'html'|'plain', rowCount: number, colCount: number }}
   */
  function parseClipboardToRows(clipboardData) {
    var empty = { rows: [], source: 'plain', rowCount: 0, colCount: 0 };
    if (!clipboardData) return empty;
    var html = clipboardData.getData('text/html');
    var rows = [];
    var source = 'plain';
    if (html && html.trim()) {
      rows = parseHtmlTable(html);
      if (rows.length > 0) source = 'html';
    }
    if (rows.length === 0) {
      var plain = clipboardData.getData('text/plain');
      rows = parsePlainTable(plain);
    }
    rows = normalizeRowLengths(rows);
    var rowCount = rows.length;
    var colCount = rows[0] ? rows[0].length : 0;
    return { rows: rows, source: source, rowCount: rowCount, colCount: colCount };
  }

  /**
   * Check if a row looks like a header row (known column names).
   * @param {string[]} cells
   * @param {'profile'|'likert'|'profile-twogroup'|'likert-twogroup'|'likert-ttest'} analyzerType
   * @returns {boolean}
   */
  function isHeaderRow(cells, analyzerType) {
    if (!cells || !cells.length) return false;
    var set = PROFILE_HEADERS;
    if (analyzerType === 'likert') set = LIKERT_HEADERS;
    else if (analyzerType === 'profile-twogroup') set = PROFILE_TWO_GROUP_HEADERS;
    else if (analyzerType === 'likert-twogroup') set = LIKERT_TWO_GROUP_HEADERS;
    else if (analyzerType === 'likert-ttest') set = LIKERT_TTEST_HEADERS;
    var matchCount = 0;
    for (var i = 0; i < cells.length; i++) {
      var lower = (cells[i] || '').toLowerCase().trim();
      if (!lower) continue;
      if (set.some(function (h) { return lower === h || lower.indexOf(h) === 0 || h.indexOf(lower) === 0; })) {
        matchCount++;
      }
    }
    return matchCount >= 2;
  }

  /**
   * Map pasted rows to Profile structure: Particulars, Frequency, Percentage, Rank.
   * Partial rows allowed; extra columns ignored.
   * @param {string[][]} rows - after optional header skip
   * @param {boolean} skipHeader - whether first row was already skipped
   * @returns {{ particulars: string[], frequency: (string|number)[], percentage: string[], rank: string[] }|null}
   */
  function mapToProfileRows(rows, skipHeader) {
    if (!rows || !rows.length) return null;
    var particulars = [];
    var frequency = [];
    var percentage = [];
    var rank = [];
    var extras = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      // Support pasted tables that include a leading "No." column
      var startIdx = 0;
      var first = c[0] != null ? String(c[0]).trim() : '';
      var second = c[1] != null ? String(c[1]).trim() : '';
      if (first !== '' && /^\d+$/.test(first) && second !== '') startIdx = 1;

      particulars.push((c[startIdx] != null ? String(c[startIdx]).trim() : '') || '');
      frequency.push(c[startIdx + 1] != null && String(c[startIdx + 1]).trim() !== '' ? String(c[startIdx + 1]).trim() : '');
      percentage.push(c[startIdx + 2] != null ? String(c[startIdx + 2]).trim() : '');
      rank.push(c[startIdx + 3] != null ? String(c[startIdx + 3]).trim() : '');
      extras.push(c.slice(startIdx + 4).map(function (x) { return x != null ? String(x).trim() : ''; }));
    }
    return { particulars: particulars, frequency: frequency, percentage: percentage, rank: rank, extras: extras };
  }

  /**
   * Map pasted rows to Likert structure: Particulars, Weighted Mean, Q.D., Rank.
   * @param {string[][]} rows
   * @param {boolean} skipHeader
   * @returns {{ particulars: string[], wm: string[], qd: string[], rank: string[] }|null}
   */
  function mapToLikertRows(rows, skipHeader) {
    if (!rows || !rows.length) return null;
    var particulars = [];
    var wm = [];
    var qd = [];
    var rank = [];
    var extras = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      var startIdx = 0;
      var first = c[0] != null ? String(c[0]).trim() : '';
      var second = c[1] != null ? String(c[1]).trim() : '';
      if (first !== '' && /^\d+$/.test(first) && second !== '') startIdx = 1;

      particulars.push((c[startIdx] != null ? String(c[startIdx]).trim() : '') || '');
      wm.push(c[startIdx + 1] != null ? String(c[startIdx + 1]).trim() : '');
      qd.push(c[startIdx + 2] != null ? String(c[startIdx + 2]).trim() : '');
      rank.push(c[startIdx + 3] != null ? String(c[startIdx + 3]).trim() : '');
      extras.push(c.slice(startIdx + 4).map(function (x) { return x != null ? String(x).trim() : ''; }));
    }
    return { particulars: particulars, wm: wm, qd: qd, rank: rank, extras: extras };
  }

  /**
   * Validate pasted data for Profile: at least one column (Particulars); dynamic column count (1–12).
   * @param {string[][]} rows
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateProfilePaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'No table data detected. Copy a table from Word, Excel, or PDF and paste again.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 12) {
      return { valid: false, message: 'The pasted table format could not be used. Expect 1–12 columns (e.g. Particulars, Frequency, %, Rank).' };
    }
    return { valid: true };
  }

  /**
   * Validate pasted data for Likert: at least one column; dynamic column count (1–12).
   * @param {string[][]} rows
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateLikertPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'No table data detected. Copy a table from Word, Excel, or PDF and paste again.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 12) {
      return { valid: false, message: 'The pasted table format could not be used. Expect 1–12 columns (e.g. Particulars, W.M., Q.D., Rank).' };
    }
    return { valid: true };
  }

  /**
   * Map pasted rows to Profile two-group: Particulars, School Heads (f, %, Rank), Teachers (f, %, Rank).
   * Columns: 0=Particulars, 1=Heads f, 2=Heads %, 3=Heads Rank, 4=Teachers f, 5=Teachers %, 6=Teachers Rank.
   * Accept 3 cols (Particulars, H f, T f) or 7.
   */
  function mapToProfileTwoGroupRows(rows) {
    if (!rows || !rows.length) return null;
    var particulars = [];
    var headsF = [];
    var headsPct = [];
    var teachersF = [];
    var teachersPct = [];

    for (var i = 0; i < rows.length; i++) {
      var c = rows[i] || [];
      var cols = c.length;

      // Column 0: Particulars (always string, may be empty)
      particulars.push((c[0] != null ? String(c[0]).trim() : '') || '');

      // Column 1: School Heads frequency
      var hF = c[1] != null && String(c[1]).trim() !== '' ? String(c[1]).trim() : '';
      var hPct = '';
      var tF = '';
      var tPct = '';

      if (cols >= 5) {
        // 5+ columns: 0=Particulars, 1=Heads f, 2=Heads %, 3=Teachers f, 4=Teachers %
        hPct = c[2] != null ? String(c[2]).trim() : '';
        tF = c[3] != null && String(c[3]).trim() !== '' ? String(c[3]).trim() : '';
        tPct = c[4] != null ? String(c[4]).trim() : '';
      } else if (cols === 4) {
        // 4 columns: 0=Particulars, 1=Heads f, 2=Heads %, 3=Teachers f (Teachers % intentionally blank)
        hPct = c[2] != null ? String(c[2]).trim() : '';
        tF = c[3] != null && String(c[3]).trim() !== '' ? String(c[3]).trim() : '';
      } else if (cols === 3) {
        // 3 columns: 0=Particulars, 1=Heads f, 2=Teachers f (no percentages provided)
        tF = c[2] != null && String(c[2]).trim() !== '' ? String(c[2]).trim() : '';
      } else if (cols <= 2) {
        // 1–2 columns: only Particulars and optional Heads f; Teachers group remains blank
        // hPct, tF, and tPct stay as empty strings
      }

      headsF.push(hF);
      headsPct.push(hPct);
      teachersF.push(tF);
      teachersPct.push(tPct);
    }

    return {
      particulars: particulars,
      headsF: headsF,
      headsPct: headsPct,
      teachersF: teachersF,
      teachersPct: teachersPct
    };
  }

  /**
   * Validate Profile two-group paste: 2–12 columns (Particulars + at least one value column).
   */
  function validateProfileTwoGroupPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'No table data detected. Copy a table from Word, Excel, or PDF and paste again.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 2 || colCount > 12) {
      return { valid: false, message: 'The pasted table format could not be used. Expect 2+ columns (e.g. Particulars, School Heads, Teachers).' };
    }
    return { valid: true };
  }

  /**
   * Map pasted rows to Likert two-group: Particulars, SH W.M., SH Q.D., SH Rank, T W.M., T Q.D., T Rank.
   * Supports 2–8 columns:
   * - 8 cols: No., Particulars, SH W.M., SH Q.D., SH Rank, T W.M., T Q.D., T Rank (first column skipped)
   * - 7 cols: Particulars, SH W.M., SH Q.D., SH Rank, T W.M., T Q.D., T Rank
   * - 3 cols: Particulars, SH W.M., T W.M.
   * - 2 cols: Particulars, W.M. (used for both School Heads and Teachers)
   */
  function mapToLikertTwoGroupRows(rows) {
    if (!rows || !rows.length) return null;
    var colCount = rows[0] ? rows[0].length : 0;
    var hasNoCol = colCount === 8;
    var off = hasNoCol ? 1 : 0;
    var particulars = [], shWm = [], shQd = [], shRank = [], tWm = [], tQd = [], tRank = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      particulars.push((c[0 + off] != null ? String(c[0 + off]).trim() : '') || '');
      if (colCount === 1) {
        shWm.push('');
        shQd.push('');
        shRank.push('');
        tWm.push('');
        tQd.push('');
        tRank.push('');
      } else if (colCount >= 7) {
        shWm.push(c[1 + off] != null ? String(c[1 + off]).trim() : '');
        shQd.push(c[2 + off] != null ? String(c[2 + off]).trim() : '');
        shRank.push(c[3 + off] != null ? String(c[3 + off]).trim() : '');
        tWm.push(c[4 + off] != null ? String(c[4 + off]).trim() : '');
        tQd.push(c[5 + off] != null ? String(c[5 + off]).trim() : '');
        tRank.push(c[6 + off] != null ? String(c[6 + off]).trim() : '');
      } else if (colCount === 3 || (colCount === 4 && !hasNoCol)) {
        var shVal = c[1 + off] != null ? String(c[1 + off]).trim() : '';
        var tVal = c[2 + off] != null ? String(c[2 + off]).trim() : '';
        shWm.push(shVal);
        shQd.push('');
        shRank.push('');
        tWm.push(tVal);
        tQd.push('');
        tRank.push('');
      } else if (colCount === 2) {
        var wmVal = c[1 + off] != null ? String(c[1 + off]).trim() : '';
        shWm.push(wmVal);
        shQd.push('');
        shRank.push('');
        tWm.push(wmVal);
        tQd.push('');
        tRank.push('');
      } else if (colCount === 5 || colCount === 6) {
        shWm.push(c[1 + off] != null ? String(c[1 + off]).trim() : '');
        shQd.push(colCount >= 6 ? (c[2 + off] != null ? String(c[2 + off]).trim() : '') : '');
        shRank.push('');
        tWm.push(c[3 + off] != null ? String(c[3 + off]).trim() : '');
        tQd.push(colCount >= 6 && c[4 + off] != null ? String(c[4 + off]).trim() : '');
        tRank.push('');
      } else {
        shWm.push('');
        shQd.push('');
        shRank.push('');
        tWm.push('');
        tQd.push('');
        tRank.push('');
      }
    }
    return { particulars: particulars, shWm: shWm, shQd: shQd, shRank: shRank, tWm: tWm, tQd: tQd, tRank: tRank };
  }

  function validateLikertTwoGroupPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'No table data detected. Copy a table from Word, Excel, or PDF and paste again.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 12) {
      return { valid: false, message: 'The pasted table format could not be used. Expect 1–12 columns.' };
    }
    return { valid: true };
  }

  /**
   * Map pasted rows to Likert t-test: Particulars/label, t-value, t-critical, p-value, Decision, Description.
   */
  function mapToLikertTTestRows(rows) {
    if (!rows || !rows.length) return null;
    var label = [], tValue = [], tCritical = [], pValue = [], decision = [], description = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      label.push((c[0] != null ? String(c[0]).trim() : '') || '');
      tValue.push(c[1] != null ? String(c[1]).trim() : '');
      tCritical.push(c[2] != null ? String(c[2]).trim() : '');
      pValue.push(c[3] != null ? String(c[3]).trim() : '');
      decision.push(c[4] != null ? String(c[4]).trim() : '');
      description.push(c[5] != null ? String(c[5]).trim() : '');
    }
    return { label: label, tValue: tValue, tCritical: tCritical, pValue: pValue, decision: decision, description: description };
  }

  function validateLikertTTestPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'No table data detected. Copy a table from Word, Excel, or PDF and paste again.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 10) {
      return { valid: false, message: 'The pasted table format could not be used. Expect 1–10 columns (e.g. Label, t-value, p-value).' };
    }
    return { valid: true };
  }

  global.PasteTableUtils = {
    parseClipboardToRows: parseClipboardToRows,
    normalizeRowLengths: normalizeRowLengths,
    parsePlainTable: parsePlainTable,
    parseHtmlTable: parseHtmlTable,
    isHeaderRow: isHeaderRow,
    mapToProfileRows: mapToProfileRows,
    mapToLikertRows: mapToLikertRows,
    validateProfilePaste: validateProfilePaste,
    validateLikertPaste: validateLikertPaste,
    mapToProfileTwoGroupRows: mapToProfileTwoGroupRows,
    validateProfileTwoGroupPaste: validateProfileTwoGroupPaste,
    mapToLikertTwoGroupRows: mapToLikertTwoGroupRows,
    validateLikertTwoGroupPaste: validateLikertTwoGroupPaste,
    mapToLikertTTestRows: mapToLikertTTestRows,
    validateLikertTTestPaste: validateLikertTTestPaste
  };
})(typeof window !== 'undefined' ? window : this);
