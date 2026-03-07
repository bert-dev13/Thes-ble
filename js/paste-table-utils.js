/**
 * Paste Table Utils — Parse table data from Word, Excel, Google Docs, or plain tabular text.
 * Used by Profile Analyzer and Likert Analyzer for "Paste Table Data" feature.
 * Strips formatting; returns only cell values as rows of columns.
 */
(function (global) {
  'use strict';

  var PROFILE_HEADERS = ['particulars', 'frequency', 'f', 'percentage', '%', 'rank'];
  var LIKERT_HEADERS = ['particulars', 'weighted mean', 'w.m.', 'wm', 'qualitative description', 'q.d.', 'qd', 'rank'];
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
   * Parse clipboard content into rows of cells. Prefer HTML if present (Word/Excel).
   * @param {DataTransfer} clipboardData
   * @returns {{ rows: string[][], source: 'html'|'plain' }}
   */
  function parseClipboardToRows(clipboardData) {
    if (!clipboardData) return { rows: [], source: 'plain' };
    var html = clipboardData.getData('text/html');
    if (html && html.trim()) {
      var fromHtml = parseHtmlTable(html);
      if (fromHtml.length > 0) return { rows: fromHtml, source: 'html' };
    }
    var plain = clipboardData.getData('text/plain');
    return { rows: parsePlainTable(plain), source: 'plain' };
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
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      particulars.push((c[0] != null ? String(c[0]).trim() : '') || '');
      frequency.push(c[1] != null && String(c[1]).trim() !== '' ? String(c[1]).trim() : '');
      percentage.push(c[2] != null ? String(c[2]).trim() : '');
      rank.push(c[3] != null ? String(c[3]).trim() : '');
    }
    return { particulars: particulars, frequency: frequency, percentage: percentage, rank: rank };
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
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      particulars.push((c[0] != null ? String(c[0]).trim() : '') || '');
      wm.push(c[1] != null ? String(c[1]).trim() : '');
      qd.push(c[2] != null ? String(c[2]).trim() : '');
      rank.push(c[3] != null ? String(c[3]).trim() : '');
    }
    return { particulars: particulars, wm: wm, qd: qd, rank: rank };
  }

  /**
   * Validate pasted data for Profile: at least one column (Particulars); max 4.
   * @param {string[][]} rows
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateProfilePaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 4) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    return { valid: true };
  }

  /**
   * Validate pasted data for Likert: at least one column; max 4.
   * @param {string[][]} rows
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateLikertPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 4) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
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
    var colCount = rows[0] ? rows[0].length : 0;
    var particulars = [], headsF = [], headsPct = [], teachersF = [], teachersPct = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      particulars.push((c[0] != null ? String(c[0]).trim() : '') || '');
      var hF = c[1] != null && String(c[1]).trim() !== '' ? String(c[1]).trim() : '';
      var tF = (colCount >= 5 && c[4] != null && String(c[4]).trim() !== '') ? String(c[4]).trim() : (c[2] != null && String(c[2]).trim() !== '' ? String(c[2]).trim() : '');
      headsF.push(hF);
      headsPct.push(colCount >= 6 && c[2] != null ? String(c[2]).trim() : '');
      teachersF.push(tF);
      teachersPct.push(colCount >= 7 && c[5] != null ? String(c[5]).trim() : '');
    }
    return { particulars: particulars, headsF: headsF, headsPct: headsPct, teachersF: teachersF, teachersPct: teachersPct };
  }

  /**
   * Validate Profile two-group paste: 3 cols (Part, H f, T f) or 7 cols.
   */
  function validateProfileTwoGroupPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 3 || colCount > 7) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    return { valid: true };
  }

  /**
   * Map pasted rows to Likert two-group: Particulars, SH W.M., SH Q.D., SH Rank, T W.M., T Q.D., T Rank.
   */
  function mapToLikertTwoGroupRows(rows) {
    if (!rows || !rows.length) return null;
    var particulars = [], shWm = [], shQd = [], shRank = [], tWm = [], tQd = [], tRank = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      particulars.push((c[0] != null ? String(c[0]).trim() : '') || '');
      shWm.push(c[1] != null ? String(c[1]).trim() : '');
      shQd.push(c[2] != null ? String(c[2]).trim() : '');
      shRank.push(c[3] != null ? String(c[3]).trim() : '');
      tWm.push(c[4] != null ? String(c[4]).trim() : '');
      tQd.push(c[5] != null ? String(c[5]).trim() : '');
      tRank.push(c[6] != null ? String(c[6]).trim() : '');
    }
    return { particulars: particulars, shWm: shWm, shQd: shQd, shRank: shRank, tWm: tWm, tQd: tQd, tRank: tRank };
  }

  function validateLikertTwoGroupPaste(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 7) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
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
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    var colCount = rows[0] ? rows[0].length : 0;
    if (colCount < 1 || colCount > 6) {
      return { valid: false, message: 'The pasted table format does not match the required columns. Please check your copied data.' };
    }
    return { valid: true };
  }

  global.PasteTableUtils = {
    parseClipboardToRows: parseClipboardToRows,
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
