/**
 * Thesis Interpretation Assistant — Likert Analyzer
 * Vanilla JS: manual table title, opening phrase, scale mapping, indicator rows.
 * Computes weighted mean, rank (ties = average-of-positions), qualitative description, AWM.
 * Generates formal academic interpretation paragraph.
 * localStorage: likertTables[], tablesProcessed, interpretationsGenerated, reportsCreated, recentActivity.
 */

(function () {
  'use strict';

  var KEYS = {
    likertTables: 'likertTables',
    tablesProcessed: 'tablesProcessed',
    interpretationsGenerated: 'interpretationsGenerated',
    reportsCreated: 'reportsCreated',
    recentActivity: 'recentActivity',
    likertDataSaved: 'likertDataSaved'
  };
  var MAX_ACTIVITY = 8;

  var OPENINGS = [
    'In terms of ',
    'Regarding ',
    'Considering ',
    'Across ',
    'Focusing on ',
    'Relative to ',
    'Concerning ',
    'Pertaining to ',
    'With reference to ',
    'In relation to ',
    'As to '
  ];
  var openingIndex = 0;

  var DEFAULT_SCALE = [
    { min: 4.21, max: 5.00, label: '' },
    { min: 3.41, max: 4.20, label: '' },
    { min: 2.61, max: 3.40, label: '' },
    { min: 1.81, max: 2.60, label: '' },
    { min: 1.00, max: 1.80, label: '' }
  ];

  var computedData = {
    indicators: [],
    awm: 0,
    awmDesc: '',
    tableTitle: '',
    scaleMapping: []
  };

  function getNumber(key) {
    try {
      var val = localStorage.getItem(key);
      return val !== null ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setNumber(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {}
  }

  function getLikertTables() {
    try {
      var raw = localStorage.getItem(KEYS.likertTables);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function appendActivity(text) {
    try {
      var raw = localStorage.getItem(KEYS.recentActivity);
      var arr = raw ? JSON.parse(raw) : [];
      arr.unshift({ text: text, timestamp: Date.now() });
      localStorage.setItem(KEYS.recentActivity, JSON.stringify(arr.slice(0, MAX_ACTIVITY)));
    } catch (e) {}
  }

  function showToast(message, isError) {
    var container = document.getElementById('la-toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'la-toast' + (isError ? ' la-toast--error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getScaleMapping() {
    var mapping = [];
    for (var v = 5; v >= 1; v--) {
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      var minVal = minEl && minEl.value !== '' ? parseFloat(minEl.value) : null;
      var maxVal = maxEl && maxEl.value !== '' ? parseFloat(maxEl.value) : null;
      var label = labelEl && labelEl.value ? labelEl.value.trim() : '';
      mapping.push({
        min: minVal,
        max: maxVal,
        label: label,
        scaleValue: v
      });
    }
    return mapping;
  }

  function getQualitativeDescription(wm, mapping) {
    if (!mapping || !mapping.length) return '';
    for (var i = 0; i < mapping.length; i++) {
      var m = mapping[i];
      if (m.min != null && m.max != null && wm >= m.min && wm <= m.max && m.label) {
        return m.label;
      }
    }
    return '';
  }

  function resetScale() {
    for (var v = 5; v >= 1; v--) {
      var idx = 5 - v;
      var d = DEFAULT_SCALE[idx];
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      if (minEl) minEl.value = '';
      if (maxEl) maxEl.value = '';
      if (labelEl) labelEl.value = '';
    }
    updateScalePreview();
    onInputChange();
  }

  function updateScalePreview() {
    var list = document.getElementById('la-scale-preview');
    if (!list) return;
    var mapping = getScaleMapping();
    list.innerHTML = '';
    var hasAny = mapping.some(function (m) {
      return (m.min != null || m.max != null) && m.label;
    });
    if (!hasAny) {
      var li = document.createElement('li');
      li.className = 'la-scale-preview-empty';
      li.textContent = 'Define scale mapping above.';
      list.appendChild(li);
      return;
    }
    mapping.forEach(function (m) {
      if (m.min != null && m.max != null && m.label) {
        var li = document.createElement('li');
        li.textContent = m.min + '–' + m.max + ' = ' + m.label;
        list.appendChild(li);
      }
    });
  }

  function addRow() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="la-input la-input--indicator" placeholder="Indicator" data-la-indicator></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c5></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c4></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c3></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c2></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c1></td>' +
      '<td><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
    tbody.appendChild(tr);
    tr.querySelector('[data-la-remove]').addEventListener('click', function () {
      removeRow(tr);
    });
    tr.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', onInputChange);
    });
    onInputChange();
  }

  function removeRow(tr) {
    var tbody = document.getElementById('la-input-tbody');
    if (tbody && tr.parentNode === tbody) {
      tbody.removeChild(tr);
      onInputChange();
    }
  }

  function removeLastRow() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    if (rows.length > 0) {
      removeRow(rows[rows.length - 1]);
    }
  }

  function getInputRows() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return [];
    var rows = [];
    tbody.querySelectorAll('tr').forEach(function (tr) {
      var ind = tr.querySelector('[data-la-indicator]');
      var c5 = tr.querySelector('[data-la-c5]');
      var c4 = tr.querySelector('[data-la-c4]');
      var c3 = tr.querySelector('[data-la-c3]');
      var c2 = tr.querySelector('[data-la-c2]');
      var c1 = tr.querySelector('[data-la-c1]');
      var indicator = (ind && ind.value || '').trim();
      var n5 = parseInt(c5 && c5.value || '0', 10) || 0;
      var n4 = parseInt(c4 && c4.value || '0', 10) || 0;
      var n3 = parseInt(c3 && c3.value || '0', 10) || 0;
      var n2 = parseInt(c2 && c2.value || '0', 10) || 0;
      var n1 = parseInt(c1 && c1.value || '0', 10) || 0;
      if (isNaN(n5) || n5 < 0) n5 = 0;
      if (isNaN(n4) || n4 < 0) n4 = 0;
      if (isNaN(n3) || n3 < 0) n3 = 0;
      if (isNaN(n2) || n2 < 0) n2 = 0;
      if (isNaN(n1) || n1 < 0) n1 = 0;
      rows.push({
        indicator: indicator,
        n5: n5, n4: n4, n3: n3, n2: n2, n1: n1,
        total: n5 + n4 + n3 + n2 + n1
      });
    });
    return rows;
  }

  function validate() {
    var errTitle = document.getElementById('la-table-title-error');
    var errScale = document.getElementById('la-scale-error');
    var errInd = document.getElementById('la-indicators-error');
    var titleEl = document.getElementById('la-table-title');
    if (errTitle) errTitle.textContent = '';
    if (errScale) errScale.textContent = '';
    if (errInd) errInd.textContent = '';
    if (titleEl) titleEl.classList.remove('error');

    var title = (titleEl && titleEl.value || '').trim();
    if (!title) {
      if (errTitle) errTitle.textContent = 'Enter a table title or theme.';
      if (titleEl) titleEl.classList.add('error');
      return false;
    }

    var mapping = getScaleMapping();
    var hasValidScale = mapping.some(function (m) {
      return m.min != null && m.max != null && m.label;
    });
    if (!hasValidScale) {
      if (errScale) errScale.textContent = 'Define at least one scale range and label.';
      return false;
    }

    var rows = getInputRows();
    var validRows = rows.filter(function (r) {
      return r.indicator && r.total > 0;
    });
    if (validRows.length === 0) {
      if (errInd) errInd.textContent = 'Add at least one indicator with valid non-negative counts.';
      return false;
    }
    var hasEmptyIndicator = rows.some(function (r) {
      return r.total > 0 && !r.indicator;
    });
    if (hasEmptyIndicator) {
      if (errInd) errInd.textContent = 'Indicator cannot be empty when counts are entered.';
      return false;
    }
    return true;
  }

  function computeWeightedMean(row) {
    var sum = 5 * row.n5 + 4 * row.n4 + 3 * row.n3 + 2 * row.n2 + 1 * row.n1;
    var total = row.total;
    if (total === 0) return 0;
    return Math.round((sum / total) * 100) / 100;
  }

  function computeRanks(sortedByWm) {
    var i = 0;
    while (i < sortedByWm.length) {
      var j = i;
      while (j < sortedByWm.length && sortedByWm[j].weightedMean === sortedByWm[i].weightedMean) {
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

  function onInputChange() {
    var rows = getInputRows();
    var validCount = rows.filter(function (r) {
      return r.indicator && r.total > 0;
    }).length;
    var liveInd = document.getElementById('la-live-indicators');
    if (liveInd) liveInd.textContent = validCount;

    var computeBtn = document.getElementById('la-compute');
    var saveInputBtn = document.getElementById('la-save-input');
    if (computeBtn) computeBtn.disabled = !validate();
    if (saveInputBtn) saveInputBtn.disabled = true;
  }

  function compute() {
    if (!validate()) return;
    var rows = getInputRows();
    var validRows = rows.filter(function (r) {
      return r.indicator && r.total > 0;
    });
    var mapping = getScaleMapping();

    var results = validRows.map(function (r) {
      var wm = computeWeightedMean(r);
      var qd = getQualitativeDescription(wm, mapping);
      return {
        indicator: r.indicator,
        weightedMean: wm,
        qualitativeDescription: qd,
        total: r.total,
        n5: r.n5, n4: r.n4, n3: r.n3, n2: r.n2, n1: r.n1
      };
    });

    var sorted = results.slice().sort(function (a, b) {
      return b.weightedMean - a.weightedMean;
    });
    computeRanks(sorted);
    var rankMap = {};
    sorted.forEach(function (r) {
      rankMap[r.indicator] = r.rank;
    });
    results.forEach(function (r) {
      r.rank = rankMap[r.indicator];
    });

    var awm = results.length > 0
      ? Math.round(results.reduce(function (s, r) { return s + r.weightedMean; }, 0) / results.length * 100) / 100
      : 0;
    var awmDesc = getQualitativeDescription(awm, mapping);

    computedData = {
      indicators: results,
      awm: awm,
      awmDesc: awmDesc,
      tableTitle: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim(),
      scaleMapping: mapping
    };

    renderOutput(results, awm, awmDesc);
    generateInterpretation();
    updateLiveStats(awm, awmDesc);

    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var saveInputBtn = document.getElementById('la-save-input');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
  }

  function renderOutput(results, awm, awmDesc) {
    var tbody = document.getElementById('la-output-tbody');
    var footer = document.getElementById('la-output-footer');
    var awmVal = document.getElementById('la-awm-value');
    var awmDescEl = document.getElementById('la-awm-desc');
    if (!tbody) return;

    tbody.innerHTML = '';
    results.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(r.indicator) + '</td>' +
        '<td>' + r.weightedMean.toFixed(2) + '</td>' +
        '<td>' + escapeHtml(r.qualitativeDescription) + '</td>' +
        '<td>' + (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) + '</td>' +
        '<td>' + r.total + '</td>';
      tbody.appendChild(tr);
    });

    if (footer) {
      footer.hidden = false;
      if (awmVal) awmVal.textContent = awm.toFixed(2);
      if (awmDescEl) awmDescEl.textContent = awmDesc || '—';
    }
  }

  function generateInterpretation() {
    var data = computedData;
    if (!data.indicators.length) return '';

    var theme = data.tableTitle;
    var opening = OPENINGS[openingIndex % OPENINGS.length];
    openingIndex += 1;

    var sorted = data.indicators.slice().sort(function (a, b) {
      return b.weightedMean - a.weightedMean;
    });

    var prevWm = -1;
    var groups = [];
    sorted.forEach(function (r) {
      if (r.weightedMean === prevWm) {
        groups[groups.length - 1].push(r);
      } else {
        groups.push([r]);
        prevWm = r.weightedMean;
      }
    });

    var parts = [];
    groups.forEach(function (group) {
      var labels = group.map(function (r) { return '"' + r.indicator + '"'; });
      var wm = group[0].weightedMean.toFixed(2);
      if (group.length === 1) {
        parts.push(labels[0] + ' with a weighted mean of ' + wm);
      } else {
        parts.push(labels.join(', ') + ' each with a weighted mean of ' + wm);
      }
    });
    var body = opening + theme + ', ' + parts.join('; ') + '.';

    var awmSentence = buildAwmSentence(data.awm, data.awmDesc, theme);
    var text = body + ' ' + awmSentence;
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = text;
    return text;
  }

  function buildAwmSentence(awm, awmDesc, theme) {
    var themeLower = theme.toLowerCase();
    var awmStr = awm.toFixed(2);
    var desc = awmDesc || '—';
    if (themeLower.indexOf('challenge') !== -1) {
      return 'The average weighted mean of ' + awmStr + ' signifies that respondents view the challenges encountered in ' + theme + ' as ' + desc + '.';
    }
    if (themeLower.indexOf('effect') !== -1) {
      return 'The average weighted mean of ' + awmStr + ' signifies that respondents view the effect of the ' + theme + ' as ' + desc + '.';
    }
    return 'The average weighted mean of ' + awmStr + ' signifies that respondents view the manifestation of the ' + theme + ' as ' + desc + '.';
  }

  function updateLiveStats(awm, awmDesc) {
    var liveAwm = document.getElementById('la-live-awm');
    var liveAwmDesc = document.getElementById('la-live-awm-desc');
    if (liveAwm) liveAwm.textContent = awm != null ? awm.toFixed(2) : '—';
    if (liveAwmDesc) liveAwmDesc.textContent = awmDesc || '—';
  }

  function copyInterpretation() {
    var block = document.getElementById('la-interpretation-block');
    if (!block || !block.textContent.trim()) return;
    navigator.clipboard.writeText(block.textContent).then(function () {
      showToast('Copied!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  function saveToReport() {
    if (!computedData.indicators.length) return;
    var interpretation = document.getElementById('la-interpretation-block');
    var text = interpretation && interpretation.textContent ? interpretation.textContent.trim() : '';

    var tables = getLikertTables();
    tables.push({
      tableTitle: computedData.tableTitle,
      scaleMapping: computedData.scaleMapping,
      indicators: computedData.indicators.map(function (r) {
        return {
          indicator: r.indicator,
          n5: r.n5, n4: r.n4, n3: r.n3, n2: r.n2, n1: r.n1,
          weightedMean: r.weightedMean,
          qualitativeDescription: r.qualitativeDescription,
          rank: r.rank,
          total: r.total
        };
      }),
      awm: computedData.awm,
      awmDesc: computedData.awmDesc,
      interpretation: text,
      createdAt: Date.now()
    });
    try {
      localStorage.setItem(KEYS.likertTables, JSON.stringify(tables));
    } catch (e) {
      showToast('Save failed.', true);
      return;
    }

    setNumber(KEYS.tablesProcessed, getNumber(KEYS.tablesProcessed) + 1);
    setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + 1);
    setNumber(KEYS.reportsCreated, getNumber(KEYS.reportsCreated) + 1);
    localStorage.setItem(KEYS.likertDataSaved, 'true');
    appendActivity('Saved Likert table: ' + (computedData.tableTitle || 'Untitled'));
    updateSessionProgress();
    renderRecentActivity();
    showToast('Saved to report.');
  }

  function updateSessionProgress() {
    var tables = document.getElementById('la-session-tables');
    var interpretations = document.getElementById('la-session-interpretations');
    var reports = document.getElementById('la-session-reports');
    if (tables) tables.textContent = getNumber(KEYS.tablesProcessed);
    if (interpretations) interpretations.textContent = getNumber(KEYS.interpretationsGenerated);
    if (reports) reports.textContent = getNumber(KEYS.reportsCreated);
  }

  function getActivityList() {
    try {
      var raw = localStorage.getItem(KEYS.recentActivity);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, MAX_ACTIVITY) : [];
    } catch (e) {
      return [];
    }
  }

  function formatTime(timestamp) {
    if (timestamp == null) return '';
    var d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderRecentActivity() {
    var list = document.getElementById('la-activity-list');
    if (!list) return;
    var items = getActivityList();
    list.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.className = 'la-activity-empty';
      li.textContent = 'No activity yet.';
      list.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'la-activity-item';
      var text = document.createElement('span');
      text.textContent = item.text || item.message || 'Activity';
      var time = document.createElement('span');
      time.className = 'la-activity-time';
      time.textContent = formatTime(item.timestamp);
      li.appendChild(text);
      li.appendChild(time);
      list.appendChild(li);
    });
  }

  function renderOutputPlaceholder() {
    var tbody = document.getElementById('la-output-tbody');
    var footer = document.getElementById('la-output-footer');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="la-output-empty">Compute to see results.</td></tr>';
    }
    if (footer) footer.hidden = true;
  }

  function clearInputs() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (var i = 0; i < 3; i++) addRow();
    var titleEl = document.getElementById('la-table-title');
    if (titleEl) titleEl.value = '';
    computedData = { indicators: [], awm: 0, awmDesc: '', tableTitle: '', scaleMapping: [] };
    renderOutputPlaceholder();
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var saveInputBtn = document.getElementById('la-save-input');
    if (copyBtn) copyBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveInputBtn) saveInputBtn.disabled = true;
    updateLiveStats(null, null);
    onInputChange();
  }

  function resetSession() {
    try {
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.tablesProcessed);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('reportsCreated');
      localStorage.removeItem('profileDataSaved');
      localStorage.removeItem('summaryDataSaved');
      localStorage.removeItem('reportDataSaved');
      localStorage.removeItem('profileTables');
    } catch (e) {
      console.warn('Reset session: could not clear some keys', e);
    }
    closeResetModal();
    window.location.reload();
  }

  var resetModal = document.getElementById('la-reset-modal');
  var resetBackdrop = document.getElementById('la-reset-backdrop');
  var resetCancel = document.getElementById('la-reset-cancel');
  var resetConfirm = document.getElementById('la-reset-confirm');

  function openResetModal() {
    if (resetModal) {
      resetModal.removeAttribute('hidden');
      if (resetConfirm) resetConfirm.focus();
    }
  }
  function closeResetModal() {
    if (resetModal) resetModal.setAttribute('hidden', '');
  }

  var clearModal = document.getElementById('la-clear-modal');
  var clearBackdrop = document.getElementById('la-clear-backdrop');
  var clearCancel = document.getElementById('la-clear-cancel');
  var clearConfirm = document.getElementById('la-clear-confirm');

  function openClearModal() {
    if (clearModal) {
      clearModal.removeAttribute('hidden');
      if (clearConfirm) clearConfirm.focus();
    }
  }
  function closeClearModal() {
    if (clearModal) clearModal.setAttribute('hidden', '');
  }

  function init() {
    var tbody = document.getElementById('la-input-tbody');
    if (tbody) {
      for (var i = 0; i < 3; i++) addRow();
    }

    var titleEl = document.getElementById('la-table-title');
    if (titleEl) titleEl.addEventListener('input', onInputChange);

    for (var v = 5; v >= 1; v--) {
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      if (minEl) minEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
      if (maxEl) maxEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
      if (labelEl) labelEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
    }

    document.getElementById('la-reset-scale').addEventListener('click', resetScale);
    document.getElementById('la-add-row').addEventListener('click', addRow);
    document.getElementById('la-remove-row').addEventListener('click', removeLastRow);
    document.getElementById('la-compute').addEventListener('click', compute);
    document.getElementById('la-copy-interpretation').addEventListener('click', copyInterpretation);
    document.getElementById('la-save-interpretation').addEventListener('click', saveToReport);
    var saveInputBtn = document.getElementById('la-save-input');
    if (saveInputBtn) saveInputBtn.addEventListener('click', saveToReport);

    document.getElementById('la-clear-inputs').addEventListener('click', openClearModal);
    if (clearConfirm) clearConfirm.addEventListener('click', function () {
      clearInputs();
      closeClearModal();
    });
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    document.getElementById('la-btn-reset').addEventListener('click', openResetModal);
    document.getElementById('la-btn-reset-mobile').addEventListener('click', openResetModal);
    if (resetConfirm) resetConfirm.addEventListener('click', resetSession);
    if (resetCancel) resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);
    if (resetModal) resetModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeResetModal();
    });
    if (clearModal) clearModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeClearModal();
    });

    var hamburger = document.getElementById('la-hamburger');
    var dropdown = document.getElementById('la-nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.la-nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    updateScalePreview();
    updateSessionProgress();
    renderRecentActivity();
    onInputChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
