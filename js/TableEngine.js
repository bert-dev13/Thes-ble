/**
 * Thesis Interpretation Assistant — Unified Table Engine
 * Shared logic for Profile, Likert, and Summary:
 * - Rank computation (average-of-positions for ties)
 * - Q.D. (Qualitative Description) mapping from scale
 * - AWM (Average Weighted Mean) computation
 * - Standard scale definitions
 * Used by profile.js, likert.js, summary.js for consistent behavior.
 */
(function (global) {
  'use strict';

  var DEFAULT_QD_SCALE = [
    { min: 4.50, max: 5.00, label: 'Very High' },
    { min: 3.50, max: 4.49, label: 'High' },
    { min: 2.50, max: 3.49, label: 'Moderate' },
    { min: 1.50, max: 2.49, label: 'Low' },
    { min: 1.00, max: 1.49, label: 'Very Low' }
  ];

  // Example scale per spec: 4.50–5.00=VO, 3.50–4.49=O, 2.50–3.49=S, 1.50–2.49=SD, 1.00–1.49=N
  var LIKERT_5_FREQUENCY_SCALE = [
    { min: 4.50, max: 5.00, label: 'Very Often' },
    { min: 3.50, max: 4.49, label: 'Often' },
    { min: 2.50, max: 3.49, label: 'Sometimes' },
    { min: 1.50, max: 2.49, label: 'Seldom' },
    { min: 1.00, max: 1.49, label: 'Never' }
  ];

  /**
   * Compute ranks using average-of-positions for ties.
   * Sorted by value descending (highest = rank 1).
   * @param {Array} sortedByWm - Rows sorted by weightedMean descending, each gets .rank
   */
  function computeRanks(sortedByWm) {
    if (!sortedByWm || !sortedByWm.length) return sortedByWm;
    var i = 0;
    while (i < sortedByWm.length) {
      var j = i;
      var key = typeof sortedByWm[i].weightedMean !== 'undefined' ? 'weightedMean' : 'frequency';
      var val = sortedByWm[i][key];
      while (j < sortedByWm.length && sortedByWm[j][key] === val) {
        j++;
      }
      var avgRank = (i + 1 + j) / 2;
      for (var k = i; k < j; k++) {
        sortedByWm[k].rank = avgRank;
      }
      i = j;
    }
    return sortedByWm;
  }

  /**
   * Compute dense ranks for profile (frequency-based, highest = 1).
   * @param {Array} rows - Each row has frequency
   * @param {Function} getFreq - fn(row) returns frequency
   */
  function computeDenseRanks(rows, getFreq) {
    if (!rows || !rows.length) return {};
    var sorted = rows.slice().sort(function (a, b) {
      var fa = typeof getFreq === 'function' ? getFreq(a) : a.frequency;
      var fb = typeof getFreq === 'function' ? getFreq(b) : b.frequency;
      return (fb || 0) - (fa || 0);
    });
    var rankMap = {};
    var rank = 1;
    for (var i = 0; i < sorted.length; i++) {
      if (i > 0 && (typeof getFreq === 'function' ? getFreq(sorted[i]) : sorted[i].frequency) < (typeof getFreq === 'function' ? getFreq(sorted[i - 1]) : sorted[i - 1].frequency)) {
        rank = i + 1;
      }
      var idx = rows.indexOf(sorted[i]);
      if (idx >= 0) rankMap[idx] = rank;
    }
    return rankMap;
  }

  /**
   * Map weighted mean to qualitative description from scale.
   * @param {number} wm - Weighted mean value
   * @param {Array} mapping - [{ min, max, label }, ...]
   * @returns {string} Q.D. label
   */
  function getQualitativeDescription(wm, mapping) {
    if (wm == null || isNaN(wm)) return '';
    var list = mapping && mapping.length ? mapping : DEFAULT_QD_SCALE;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.min != null && m.max != null && wm >= m.min && wm <= m.max && m.label) {
        return String(m.label).trim();
      }
    }
    for (var j = 0; j < DEFAULT_QD_SCALE.length; j++) {
      var d = DEFAULT_QD_SCALE[j];
      if (wm >= d.min && wm <= d.max) return d.label;
    }
    return '';
  }

  /**
   * Compute AWM from rows (average of weightedMean).
   * @param {Array} rows - Each has .weightedMean
   * @returns {number} Rounded to 2 decimals
   */
  function computeAWM(rows) {
    if (!rows || !rows.length) return 0;
    var sum = rows.reduce(function (s, r) {
      var wm = r.weightedMean != null ? r.weightedMean : r.wm;
      return s + (typeof wm === 'number' && !isNaN(wm) ? wm : 0);
    }, 0);
    return Math.round((sum / rows.length) * 100) / 100;
  }

  /**
   * Validate row has valid numeric W.M.
   */
  function isValidWMRow(row) {
    var wm = row.weightedMean != null ? row.weightedMean : row.wm;
    return typeof wm === 'number' && !isNaN(wm) && wm > 0;
  }

  /**
   * Filter rows that have particulars and valid W.M.
   */
  function filterValidLikertRows(rows) {
    if (!rows || !rows.length) return [];
    return rows.filter(function (r) {
      var ind = r.indicator || r.particulars;
      var wm = r.weightedMean != null ? r.weightedMean : r.wm;
      return (ind && String(ind).trim()) && (typeof wm === 'number' && !isNaN(wm));
    });
  }

  global.TableEngine = {
    computeRanks: computeRanks,
    computeDenseRanks: computeDenseRanks,
    getQualitativeDescription: getQualitativeDescription,
    computeAWM: computeAWM,
    isValidWMRow: isValidWMRow,
    filterValidLikertRows: filterValidLikertRows,
    DEFAULT_QD_SCALE: DEFAULT_QD_SCALE,
    LIKERT_5_FREQUENCY_SCALE: LIKERT_5_FREQUENCY_SCALE
  };
})(typeof window !== 'undefined' ? window : this);
