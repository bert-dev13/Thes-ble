/**
 * Thesis Interpretation Assistant — Profile Analyzer
 * Vanilla JS: manual table title + context, dynamic category rows,
 * compute totals/percentages/ranks, interpretation generator,
 * localStorage (profileTables with tableTitle, subject, rows, totals, interpretation, createdAt).
 *
 * Ranking: Highest frequency = rank 1. Ties share the same rank.
 * After ties we use dense ranking: next distinct frequency gets the next rank (e.g. 10,10,5 → 1,1,2).
 */

(function () {
  'use strict';

  var KEYS = {
    tablesProcessed: 'tablesProcessed',
    respondentsEncoded: 'respondentsEncoded',
    interpretationsGenerated: 'interpretationsGenerated',
    recentActivity: 'recentActivity',
    profileTables: 'profileTables'
  };
  var MAX_ACTIVITY = 8;
  var OPENINGS = [
    'In terms of ',
    'With regard to ',
    'Regarding ',
    'As reflected in ',
    'Based on the data presented, ',
    'From the table, '
  ];
  var openingIndex = 0;

  var computedRows = [];
  var currentTableTitle = '';

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

  function getProfileTables() {
    try {
      var raw = localStorage.getItem(KEYS.profileTables);
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

  function getTableTitle() {
    var el = document.getElementById('pa-table-title');
    return el ? (el.value || '').trim() : '';
  }

  function showToast(message, isError) {
    var container = document.getElementById('pa-toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'pa-toast' + (isError ? ' pa-toast--error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  function addRow() {
    var tbody = document.getElementById('pa-input-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="pa-input pa-input--category" placeholder="Category" data-pa-category></td>' +
      '<td><input type="number" class="pa-input pa-input--freq" min="0" step="1" value="" placeholder="0" data-pa-freq></td>' +
      '<td><button type="button" class="pa-row-remove" aria-label="Remove row" data-pa-remove>×</button></td>';
    tbody.appendChild(tr);
    tr.querySelector('[data-pa-remove]').addEventListener('click', function () {
      removeRow(tr);
    });
    tr.querySelector('[data-pa-freq]').addEventListener('input', onInputChange);
    tr.querySelector('[data-pa-category]').addEventListener('input', onInputChange);
    onInputChange();
  }

  function removeRow(tr) {
    var tbody = document.getElementById('pa-input-tbody');
    if (tbody && tr.parentNode === tbody) {
      tbody.removeChild(tr);
      onInputChange();
    }
  }

  function getInputRows() {
    var tbody = document.getElementById('pa-input-tbody');
    if (!tbody) return [];
    var rows = [];
    tbody.querySelectorAll('tr').forEach(function (tr) {
      var cat = tr.querySelector('[data-pa-category]');
      var freq = tr.querySelector('[data-pa-freq]');
      var category = (cat && cat.value || '').trim();
      var rawFreq = (freq && freq.value || '').trim();
      var freqNum = rawFreq === '' ? 0 : (parseInt(rawFreq, 10));
      if (isNaN(freqNum) || freqNum < 0) freqNum = 0;
      rows.push({ category: category, frequency: freqNum, element: tr });
    });
    return rows;
  }

  function validate() {
    var errTitle = document.getElementById('pa-table-title-error');
    var errTable = document.getElementById('pa-table-error');
    var titleEl = document.getElementById('pa-table-title');
    if (errTitle) errTitle.textContent = '';
    if (errTable) errTable.textContent = '';
    if (titleEl) titleEl.classList.remove('error');

    var title = getTableTitle();
    if (!title) {
      if (errTitle) errTitle.textContent = 'Enter a table title or variable name.';
      if (titleEl) titleEl.classList.add('error');
      return false;
    }

    var rows = getInputRows();
    var hasValid = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].category && rows[i].frequency > 0) {
        hasValid = true;
        break;
      }
    }
    if (!hasValid) {
      if (errTable) errTable.textContent = 'Add at least one row with a category and frequency greater than 0.';
      return false;
    }
    if (errTable) errTable.textContent = '';
    return true;
  }

  function onInputChange() {
    var rows = getInputRows();
    var total = 0;
    rows.forEach(function (r) {
      total += r.frequency;
    });
    var liveFreq = document.getElementById('pa-live-total-freq');
    var livePct = document.getElementById('pa-live-total-pct');
    if (liveFreq) liveFreq.textContent = total;
    if (livePct) livePct.textContent = total > 0 ? '100.00%' : '0.00%';

    var computeBtn = document.getElementById('pa-compute');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (computeBtn) computeBtn.disabled = !validate();
    if (saveInputBtn) saveInputBtn.disabled = true;
  }

  function compute() {
    if (!validate()) return;
    var rows = getInputRows();
    var data = [];
    var total = 0;
    rows.forEach(function (r) {
      if (r.category && r.frequency > 0) {
        data.push({ category: r.category, frequency: r.frequency });
        total += r.frequency;
      }
    });
    if (total === 0) return;

    var rounded = data.map(function (r) {
      return {
        category: r.category,
        frequency: r.frequency,
        percentage: Math.round((r.frequency / total) * 10000) / 100
      };
    });

    var sorted = rounded.slice().sort(function (a, b) {
      return b.frequency - a.frequency;
    });
    var rank = 1;
    for (var i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].frequency < sorted[i - 1].frequency) {
        rank = i + 1;
      }
      sorted[i].rank = rank;
    }
    var rankMap = {};
    sorted.forEach(function (r) {
      rankMap[r.category] = r.rank;
    });
    rounded.forEach(function (r) {
      r.rank = rankMap[r.category];
    });

    computedRows = rounded;
    currentTableTitle = getTableTitle();

    var tbody = document.getElementById('pa-output-tbody');
    var footer = document.getElementById('pa-output-footer');
    var totalFreqEl = document.getElementById('pa-total-freq');
    var totalPctEl = document.getElementById('pa-total-pct');
    if (!tbody) return;

    tbody.innerHTML = '';
    rounded.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(r.category) + '</td>' +
        '<td>' + r.frequency + '</td>' +
        '<td>' + r.percentage.toFixed(2) + '%</td>' +
        '<td>' + r.rank + '</td>';
      tbody.appendChild(tr);
    });

    if (footer) {
      footer.hidden = false;
      if (totalFreqEl) totalFreqEl.textContent = total;
      if (totalPctEl) totalPctEl.textContent = '100.00';
    }

    generateInterpretation(rounded, currentTableTitle);
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function generateInterpretation(rows, tableTitle) {
    if (!rows.length) return '';
    var total = rows.reduce(function (sum, r) { return sum + r.frequency; }, 0);
    var opening = OPENINGS[openingIndex % OPENINGS.length];
    openingIndex += 1;

    var intro = (tableTitle || 'the data').toLowerCase() + ' of respondents';
    var prevFreq = -1;
    var sameFreqGroups = [];
    rows.forEach(function (r) {
      if (r.frequency === prevFreq) {
        sameFreqGroups[sameFreqGroups.length - 1].push(r);
      } else {
        sameFreqGroups.push([r]);
        prevFreq = r.frequency;
      }
    });

    var sentenceParts = [];
    sameFreqGroups.forEach(function (group) {
      var labels = group.map(function (r) { return '"' + r.category + '"'; });
      var freq = group[0].frequency;
      var pct = (freq / total * 100).toFixed(2);
      if (group.length === 1) {
        sentenceParts.push(labels[0] + ' had ' + freq + ' (' + pct + '%)');
      } else {
        sentenceParts.push(labels.join(' and ') + ' each had ' + freq + ' (' + pct + '%)');
      }
    });
    var body = sentenceParts.join('; ') + '. ';
    var maxFreq = rows.reduce(function (max, r) { return r.frequency > max ? r.frequency : max; }, 0);
    var topCats = rows.filter(function (r) { return r.frequency === maxFreq; }).map(function (r) { return '"' + r.category + '"'; });
    var conclusion = 'The highest was ' + (topCats.length === 1 ? topCats[0] : topCats.join(' and ')) + '.';

    var text = opening + intro + ', ' + body + conclusion;
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = text;
    return text;
  }

  function copyInterpretation() {
    var block = document.getElementById('pa-interpretation-block');
    if (!block || !block.textContent.trim()) return;
    navigator.clipboard.writeText(block.textContent).then(function () {
      showToast('Copied!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  function saveToReport() {
    if (!computedRows.length) return;
    var interpretation = document.getElementById('pa-interpretation-block');
    var text = interpretation && interpretation.textContent ? interpretation.textContent.trim() : '';
    var totalFreq = computedRows.reduce(function (s, r) { return s + r.frequency; }, 0);

    var tables = getProfileTables();
    tables.push({
      tableTitle: currentTableTitle,
      subject: 'respondents',
      rows: computedRows.map(function (r) {
        return {
          category: r.category,
          frequency: r.frequency,
          percentage: r.percentage,
          rank: r.rank
        };
      }),
      totals: {
        totalFrequency: totalFreq,
        totalPercentage: 100
      },
      interpretation: text,
      createdAt: Date.now()
    });
    try {
      localStorage.setItem(KEYS.profileTables, JSON.stringify(tables));
    } catch (e) {
      showToast('Save failed.', true);
      return;
    }

    setNumber(KEYS.tablesProcessed, getNumber(KEYS.tablesProcessed) + 1);
    setNumber(KEYS.respondentsEncoded, getNumber(KEYS.respondentsEncoded) + totalFreq);
    setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + 1);
    localStorage.setItem('profileDataSaved', 'true');
    appendActivity('Saved profile table: ' + (currentTableTitle || 'Untitled'));
    updateSessionProgress();
    showToast('Saved to report.');
  }

  function updateSessionProgress() {
    var tables = document.getElementById('pa-session-tables');
    var respondents = document.getElementById('pa-session-respondents');
    var interpretations = document.getElementById('pa-session-interpretations');
    if (tables) tables.textContent = getNumber(KEYS.tablesProcessed);
    if (respondents) respondents.textContent = getNumber(KEYS.respondentsEncoded);
    if (interpretations) interpretations.textContent = getNumber(KEYS.interpretationsGenerated);
  }

  function renderOutputPlaceholder() {
    var tbody = document.getElementById('pa-output-tbody');
    var footer = document.getElementById('pa-output-footer');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="pa-output-empty">Compute to see results.</td></tr>';
    }
    if (footer) footer.hidden = true;
  }

  function clearInputs() {
    var tbody = document.getElementById('pa-input-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (var i = 0; i < 3; i++) addRow();
    var titleEl = document.getElementById('pa-table-title');
    if (titleEl) titleEl.value = '';
    computedRows = [];
    currentTableTitle = '';
    renderOutputPlaceholder();
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (copyBtn) copyBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveInputBtn) saveInputBtn.disabled = true;
    onInputChange();
  }

  function resetSession() {
    try {
      localStorage.removeItem(KEYS.tablesProcessed);
      localStorage.removeItem(KEYS.respondentsEncoded);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem('profileDataSaved');
    } catch (e) {}
    closeResetModal();
    window.location.reload();
  }

  var resetModal = document.getElementById('pa-reset-modal');
  var resetBackdrop = document.getElementById('pa-reset-backdrop');
  var resetCancel = document.getElementById('pa-reset-cancel');
  var resetConfirm = document.getElementById('pa-reset-confirm');

  function openResetModal() {
    if (resetModal) {
      resetModal.removeAttribute('hidden');
      if (resetConfirm) resetConfirm.focus();
    }
  }
  function closeResetModal() {
    if (resetModal) resetModal.setAttribute('hidden', '');
  }

  var clearModal = document.getElementById('pa-clear-modal');
  var clearBackdrop = document.getElementById('pa-clear-backdrop');
  var clearCancel = document.getElementById('pa-clear-cancel');
  var clearConfirm = document.getElementById('pa-clear-confirm');

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
    var tbody = document.getElementById('pa-input-tbody');
    if (tbody) {
      for (var i = 0; i < 3; i++) addRow();
    }

    var titleEl = document.getElementById('pa-table-title');
    if (titleEl) titleEl.addEventListener('input', onInputChange);

    document.getElementById('pa-add-row').addEventListener('click', addRow);
    document.getElementById('pa-compute').addEventListener('click', compute);
    document.getElementById('pa-copy-interpretation').addEventListener('click', copyInterpretation);
    document.getElementById('pa-save-to-report').addEventListener('click', saveToReport);
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (saveInputBtn) saveInputBtn.addEventListener('click', saveToReport);

    document.getElementById('pa-clear-inputs').addEventListener('click', function () {
      openClearModal();
    });
    clearConfirm.addEventListener('click', function () {
      clearInputs();
      closeClearModal();
    });
    clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    document.getElementById('pa-btn-reset').addEventListener('click', openResetModal);
    document.getElementById('pa-btn-reset-mobile').addEventListener('click', openResetModal);
    resetConfirm.addEventListener('click', resetSession);
    resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);
    resetModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeResetModal();
    });
    clearModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeClearModal();
    });

    var hamburger = document.getElementById('pa-hamburger');
    var dropdown = document.getElementById('pa-nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.pa-nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    updateSessionProgress();
    onInputChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
