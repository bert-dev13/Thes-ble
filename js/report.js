/**
 * Thesis Interpretation Assistant — Report / Export
 * Vanilla JS: loads profileTables, likertTables, generatedSummaries from localStorage.
 * Renders vertical row sections, export actions, accordions for tables.
 * reportsCreated: incremented when user prints OR downloads (txt/html) — see incrementReportsCreated().
 * recentActivity: limit 8 items.
 */

(function () {
  'use strict';

  var KEYS = {
    profileTables: 'profileTables',
    likertTables: 'likertTables',
    generatedSummaries: 'generatedSummaries',
    recentActivity: 'recentActivity',
    reportsCreated: 'reportsCreated',
    tablesProcessed: 'tablesProcessed',
    respondentsEncoded: 'respondentsEncoded',
    interpretationsGenerated: 'interpretationsGenerated',
    profileDataSaved: 'profileDataSaved',
    likertDataSaved: 'likertDataSaved',
    summaryDataSaved: 'summaryDataSaved',
    reportDataSaved: 'reportDataSaved'
  };
  var MAX_ACTIVITY = 8;

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

  function getGeneratedSummaries() {
    try {
      var raw = localStorage.getItem(KEYS.generatedSummaries);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
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

  /** Increment reportsCreated when user prints or downloads. Documented rule. */
  function incrementReportsCreated() {
    setNumber(KEYS.reportsCreated, getNumber(KEYS.reportsCreated) + 1);
    localStorage.setItem(KEYS.reportDataSaved, 'true');
  }

  function showToast(message, isError) {
    var container = document.getElementById('re-toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 're-toast' + (isError ? ' re-toast--error' : '');
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

  function formatTimestamp(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getLastUpdatedTimestamp() {
    var summaries = getGeneratedSummaries();
    var profile = getProfileTables();
    var likert = getLikertTables();
    var last = 0;
    if (summaries && summaries.updatedAt && summaries.updatedAt > last) last = summaries.updatedAt;
    profile.forEach(function (t) {
      if (t.createdAt && t.createdAt > last) last = t.createdAt;
    });
    likert.forEach(function (t) {
      if (t.createdAt && t.createdAt > last) last = t.createdAt;
    });
    return last || null;
  }

  function getSummarySectionsPresent() {
    var s = getGeneratedSummaries();
    if (!s) return 'None';
    var parts = [];
    if (s.respondentsSummary) parts.push('Respondents Summary');
    if (s.findingsSummary) parts.push('Findings');
    if (s.conclusions) parts.push('Conclusions');
    if (s.recommendations) parts.push('Recommendations');
    return parts.length ? parts.join(', ') : 'None';
  }

  // ---------- Data Overview ----------
  function refreshDataOverview() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var hasData = profile.length > 0 || likert.length > 0 || getGeneratedSummaries();

    var overview = document.getElementById('re-data-overview');
    var emptyState = document.getElementById('re-empty-data');
    if (overview) overview.hidden = !hasData;
    if (emptyState) emptyState.hidden = hasData;

    var profileCount = document.getElementById('re-profile-count');
    var likertCount = document.getElementById('re-likert-count');
    var summarySections = document.getElementById('re-summary-sections');
    var lastUpdated = document.getElementById('re-last-updated');
    if (profileCount) profileCount.textContent = profile.length;
    if (likertCount) likertCount.textContent = likert.length;
    if (summarySections) summarySections.textContent = getSummarySectionsPresent();
    if (lastUpdated) lastUpdated.textContent = formatTimestamp(getLastUpdatedTimestamp());
  }

  // ---------- Render Section Content ----------
  function renderSectionContent(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    if (text && text.trim()) {
      el.textContent = text.trim();
      el.classList.remove('re-section-content--empty');
    } else {
      el.textContent = 'No content saved.';
      el.classList.add('re-section-content--empty');
    }
  }

  function renderAllSections() {
    var s = getGeneratedSummaries();
    renderSectionContent('re-respondents-content', s && s.respondentsSummary);
    renderSectionContent('re-findings-content', s && s.findingsSummary);
    renderSectionContent('re-conclusions-content', s && s.conclusions);
    renderSectionContent('re-recommendations-content', s && s.recommendations);
  }

  // ---------- Compiled Output ----------
  function buildCompiledReport(includeAppendices, includeInterpretations) {
    var s = getGeneratedSummaries();
    var profile = getProfileTables();
    var likert = getLikertTables();
    var parts = [];

    if (s && s.respondentsSummary) parts.push('Summary of Respondents\n\n' + s.respondentsSummary);
    if (s && s.findingsSummary) parts.push('Summary of Findings\n\n' + s.findingsSummary);
    if (s && s.conclusions) parts.push('Conclusions\n\n' + s.conclusions);
    if (s && s.recommendations) parts.push('Recommendations\n\n' + s.recommendations);

    if (includeAppendices && (profile.length > 0 || likert.length > 0)) {
      parts.push('\n---\n\nAPPENDICES\n');
      profile.forEach(function (t) {
        var tableText = (t.tableTitle || 'Profile Table') + '\n';
        tableText += 'Category\tFrequency\tPercentage\tRank\n';
        (t.rows || []).forEach(function (r) {
          tableText += (r.category || '') + '\t' + (r.frequency || '') + '\t' + (r.percentage != null ? r.percentage.toFixed(2) : '') + '\t' + (r.rank || '') + '\n';
        });
        if (t.totals) tableText += 'Total: ' + (t.totals.totalFrequency || '') + '\n';
        if (includeInterpretations && t.interpretation) tableText += '\nInterpretation: ' + t.interpretation + '\n';
        parts.push(tableText);
      });
      likert.forEach(function (t) {
        var tableText = (t.tableTitle || 'Likert Table') + '\n';
        if (t.type === 'twoGroup' && t.rows) {
          tableText += 'Indicator\tSH W.M.\tSH QD\tSH Rank\tT W.M.\tT QD\tT Rank\n';
          (t.rows || []).forEach(function (r) {
            tableText += (r.indicator || '') + '\t' + (r.sh && r.sh.wm != null ? r.sh.wm.toFixed(2) : '') + '\t' + ((r.sh && r.sh.qd) || '') + '\t' + (r.sh && r.sh.rank != null ? (r.sh.rank % 1 === 0 ? r.sh.rank : r.sh.rank.toFixed(1)) : '') + '\t' + (r.t && r.t.wm != null ? r.t.wm.toFixed(2) : '') + '\t' + ((r.t && r.t.qd) || '') + '\t' + (r.t && r.t.rank != null ? (r.t.rank % 1 === 0 ? r.t.rank : r.t.rank.toFixed(1)) : '') + '\n';
          });
          if (t.awm && (t.awm.sh || t.awm.t)) {
            tableText += 'AWM: SH ' + (t.awm.sh && t.awm.sh.value != null ? t.awm.sh.value.toFixed(2) : '—') + ' (' + ((t.awm.sh && t.awm.sh.qd) || '') + '); T ' + (t.awm.t && t.awm.t.value != null ? t.awm.t.value.toFixed(2) : '—') + ' (' + ((t.awm.t && t.awm.t.qd) || '') + ')\n';
          }
        } else if (t.type === 'tTest' && t.rows) {
          tableText += '#\tParticulars\tt-value\tt-critical\tp-value\tDecision\tDescription\n';
          (t.rows || []).forEach(function (r, i) {
            tableText += (i + 1) + '\t' + (r.label || '') + '\t' + (r.tValue || '') + '\t' + (r.tCritical || '') + '\t' + (r.pValue || '') + '\t' + (r.decision || '') + '\t' + (r.description || '') + '\n';
          });
        } else {
          tableText += 'Indicator\tWeighted Mean\tQD\tRank\tTotal\n';
          (t.indicators || []).forEach(function (r) {
            tableText += (r.indicator || '') + '\t' + (r.weightedMean != null ? r.weightedMean.toFixed(2) : '') + '\t' + (r.qualitativeDescription || '') + '\t' + (r.rank != null ? (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) : '') + '\t' + (r.total || '') + '\n';
          });
          if (t.awm != null) tableText += 'AWM: ' + t.awm.toFixed(2) + ' (' + (t.awmDesc || '') + ')\n';
        }
        if (includeInterpretations && t.interpretation) tableText += '\nInterpretation: ' + t.interpretation + '\n';
        parts.push(tableText);
      });
    }

    return parts.join('\n\n');
  }

  function updateCompiledOutput() {
    var includeAppendices = document.getElementById('re-toggle-appendices') && document.getElementById('re-toggle-appendices').checked;
    var includeInterpretations = document.getElementById('re-toggle-interpretations') && document.getElementById('re-toggle-interpretations').checked;
    var text = buildCompiledReport(includeAppendices, includeInterpretations);
    var el = document.getElementById('re-compiled-output');
    if (el) el.value = text || '';
  }

  // ---------- Profile Tables Accordions ----------
  function renderProfileTables() {
    var container = document.getElementById('re-profile-tables-list');
    if (!container) return;
    var profile = getProfileTables();
    container.innerHTML = '';

    if (profile.length === 0) {
      var empty = document.createElement('p');
      empty.className = 're-section-content re-section-content--empty';
      empty.textContent = 'No profile tables saved.';
      container.appendChild(empty);
      return;
    }

    profile.forEach(function (t, idx) {
      var accordion = document.createElement('div');
      accordion.className = 're-accordion';
      accordion.dataset.index = idx;
      accordion.dataset.type = 'profile';

      var header = document.createElement('button');
      header.className = 're-accordion__header';
      header.type = 'button';
      header.innerHTML = '<span>' + escapeHtml(t.tableTitle || 'Untitled') + '</span><span class="re-accordion__toggle" aria-hidden="true">▼</span>';

      var body = document.createElement('div');
      body.className = 're-accordion__body';

      var tableWrap = document.createElement('div');
      tableWrap.className = 're-table-wrap';
      var table = document.createElement('table');
      table.className = 're-table';
      table.innerHTML = '<thead><tr><th>Category</th><th>Frequency</th><th>Percentage</th><th>Rank</th></tr></thead><tbody></tbody>';
      var tbody = table.querySelector('tbody');
      (t.rows || []).forEach(function (r) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escapeHtml(r.category || '') + '</td><td>' + (r.frequency || '') + '</td><td>' + (r.percentage != null ? r.percentage.toFixed(2) : '') + '</td><td>' + (r.rank != null ? (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) : '') + '</td>';
        tbody.appendChild(tr);
      });
      if (t.totals) {
        var footerTr = document.createElement('tr');
        footerTr.innerHTML = '<td><strong>Total</strong></td><td><strong>' + (t.totals.totalFrequency || '') + '</strong></td><td><strong>' + (t.totals.totalPercentage != null ? (typeof t.totals.totalPercentage === 'number' ? t.totals.totalPercentage.toFixed(2) : t.totals.totalPercentage) : '') + '</strong></td><td></td>';
        tbody.appendChild(footerTr);
      }
      tableWrap.appendChild(table);
      body.appendChild(tableWrap);

      if (t.interpretation) {
        var interp = document.createElement('div');
        interp.className = 're-interpretation-block';
        interp.textContent = t.interpretation;
        body.appendChild(interp);
      }

      var actions = document.createElement('div');
      actions.className = 're-accordion__actions';
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 're-btn re-btn--secondary re-btn--sm';
      copyBtn.textContent = 'Copy Table + Interpretation';
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 're-btn re-btn--ghost re-btn--sm';
      removeBtn.textContent = 'Remove This Table';

      copyBtn.addEventListener('click', function () {
        var text = (t.tableTitle || '') + '\n\n';
        (t.rows || []).forEach(function (r) {
          text += (r.category || '') + '\t' + (r.frequency || '') + '\t' + (r.percentage != null ? r.percentage.toFixed(2) : '') + '\t' + (r.rank != null ? r.rank : '') + '\n';
        });
        if (t.interpretation) text += '\n' + t.interpretation;
        navigator.clipboard.writeText(text).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      });

      removeBtn.addEventListener('click', function () {
        pendingRemoveTable = { type: 'profile', index: idx };
        openRemoveTableModal();
      });

      actions.appendChild(copyBtn);
      actions.appendChild(removeBtn);
      body.appendChild(actions);

      header.addEventListener('click', function () {
        accordion.classList.toggle('is-expanded');
      });

      accordion.appendChild(header);
      accordion.appendChild(body);
      container.appendChild(accordion);
    });
  }

  // ---------- Likert Tables Accordions ----------
  function renderLikertTables() {
    var container = document.getElementById('re-likert-tables-list');
    if (!container) return;
    var likert = getLikertTables();
    container.innerHTML = '';

    if (likert.length === 0) {
      var empty = document.createElement('p');
      empty.className = 're-section-content re-section-content--empty';
      empty.textContent = 'No Likert tables saved.';
      container.appendChild(empty);
      return;
    }

    likert.forEach(function (t, idx) {
      var accordion = document.createElement('div');
      accordion.className = 're-accordion';
      accordion.dataset.index = idx;
      accordion.dataset.type = 'likert';

      var header = document.createElement('button');
      header.className = 're-accordion__header';
      header.type = 'button';
      header.innerHTML = '<span>' + escapeHtml(t.tableTitle || 'Untitled') + '</span><span class="re-accordion__toggle" aria-hidden="true">▼</span>';

      var body = document.createElement('div');
      body.className = 're-accordion__body';

      var tableWrap = document.createElement('div');
      tableWrap.className = 're-table-wrap';
      var table = document.createElement('table');
      table.className = 're-table';

      if (t.type === 'twoGroup' && t.rows) {
        table.innerHTML = '<thead><tr><th>Indicator</th><th colspan="3">School Heads</th><th colspan="3">Teachers</th></tr><tr><th></th><th>W.M.</th><th>QD</th><th>Rank</th><th>W.M.</th><th>QD</th><th>Rank</th></tr></thead><tbody></tbody>';
        var tbody = table.querySelector('tbody');
        t.rows.forEach(function (r) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + escapeHtml(r.indicator || '') + '</td><td>' + (r.sh && r.sh.wm != null ? r.sh.wm.toFixed(2) : '') + '</td><td>' + escapeHtml((r.sh && r.sh.qd) || '') + '</td><td>' + (r.sh && r.sh.rank != null ? (r.sh.rank % 1 === 0 ? r.sh.rank : r.sh.rank.toFixed(1)) : '') + '</td><td>' + (r.t && r.t.wm != null ? r.t.wm.toFixed(2) : '') + '</td><td>' + escapeHtml((r.t && r.t.qd) || '') + '</td><td>' + (r.t && r.t.rank != null ? (r.t.rank % 1 === 0 ? r.t.rank : r.t.rank.toFixed(1)) : '') + '</td>';
          tbody.appendChild(tr);
        });
        if (t.awm && (t.awm.sh || t.awm.t)) {
          var footerTr = document.createElement('tr');
          var shVal = t.awm.sh && t.awm.sh.value != null ? t.awm.sh.value.toFixed(2) : '—';
          var tVal = t.awm.t && t.awm.t.value != null ? t.awm.t.value.toFixed(2) : '—';
          footerTr.innerHTML = '<td><strong>AWM</strong></td><td><strong>' + shVal + '</strong></td><td><strong>' + escapeHtml((t.awm.sh && t.awm.sh.qd) || '') + '</strong></td><td></td><td><strong>' + tVal + '</strong></td><td><strong>' + escapeHtml((t.awm.t && t.awm.t.qd) || '') + '</strong></td><td></td>';
          tbody.appendChild(footerTr);
        }
      } else if (t.type === 'tTest' && t.rows) {
        table.innerHTML = '<thead><tr><th>#</th><th>Particulars</th><th>t-value</th><th>t-critical</th><th>p-value</th><th>Decision</th><th>Description</th></tr></thead><tbody></tbody>';
        var tbody = table.querySelector('tbody');
        t.rows.forEach(function (r, i) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + escapeHtml(r.label || '') + '</td><td>' + escapeHtml(String(r.tValue || '')) + '</td><td>' + escapeHtml(String(r.tCritical || '')) + '</td><td>' + escapeHtml(String(r.pValue || '')) + '</td><td>' + escapeHtml(String(r.decision || '')) + '</td><td>' + escapeHtml(String(r.description || '')) + '</td>';
          tbody.appendChild(tr);
        });
      } else {
        table.innerHTML = '<thead><tr><th>Indicator</th><th>Weighted Mean</th><th>QD</th><th>Rank</th><th>Total</th></tr></thead><tbody></tbody>';
        var tbody = table.querySelector('tbody');
        (t.indicators || []).forEach(function (r) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + escapeHtml(r.indicator || '') + '</td><td>' + (r.weightedMean != null ? r.weightedMean.toFixed(2) : '') + '</td><td>' + escapeHtml(r.qualitativeDescription || '') + '</td><td>' + (r.rank != null ? (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) : '') + '</td><td>' + (r.total || '') + '</td>';
          tbody.appendChild(tr);
        });
        if (t.awm != null) {
          var footerTr = document.createElement('tr');
          footerTr.innerHTML = '<td><strong>AWM</strong></td><td><strong>' + t.awm.toFixed(2) + '</strong></td><td><strong>' + escapeHtml(t.awmDesc || '') + '</strong></td><td></td><td></td>';
          tbody.appendChild(footerTr);
        }
      }
      tableWrap.appendChild(table);
      body.appendChild(tableWrap);

      if (t.interpretation) {
        var interp = document.createElement('div');
        interp.className = 're-interpretation-block';
        interp.textContent = t.interpretation;
        body.appendChild(interp);
      }

      var actions = document.createElement('div');
      actions.className = 're-accordion__actions';
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 're-btn re-btn--secondary re-btn--sm';
      copyBtn.textContent = 'Copy Table + Interpretation';
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 're-btn re-btn--ghost re-btn--sm';
      removeBtn.textContent = 'Remove This Table';

      copyBtn.addEventListener('click', function () {
        var text = (t.tableTitle || '') + '\n\n';
        if (t.type === 'twoGroup' && t.rows) {
          text += 'Indicator\tSH W.M.\tSH QD\tSH Rank\tT W.M.\tT QD\tT Rank\n';
          t.rows.forEach(function (r) {
            text += (r.indicator || '') + '\t' + (r.sh && r.sh.wm != null ? r.sh.wm.toFixed(2) : '') + '\t' + ((r.sh && r.sh.qd) || '') + '\t' + (r.sh && r.sh.rank != null ? (r.sh.rank % 1 === 0 ? r.sh.rank : r.sh.rank.toFixed(1)) : '') + '\t' + (r.t && r.t.wm != null ? r.t.wm.toFixed(2) : '') + '\t' + ((r.t && r.t.qd) || '') + '\t' + (r.t && r.t.rank != null ? (r.t.rank % 1 === 0 ? r.t.rank : r.t.rank.toFixed(1)) : '') + '\n';
          });
          if (t.awm && (t.awm.sh || t.awm.t)) {
            text += 'AWM: SH ' + (t.awm.sh && t.awm.sh.value != null ? t.awm.sh.value.toFixed(2) : '—') + ' (' + ((t.awm.sh && t.awm.sh.qd) || '') + '); T ' + (t.awm.t && t.awm.t.value != null ? t.awm.t.value.toFixed(2) : '—') + ' (' + ((t.awm.t && t.awm.t.qd) || '') + ')\n';
          }
        } else if (t.type === 'tTest' && t.rows) {
          text += '#\tParticulars\tt-value\tt-critical\tp-value\tDecision\tDescription\n';
          t.rows.forEach(function (r, i) {
            text += (i + 1) + '\t' + (r.label || '') + '\t' + (r.tValue || '') + '\t' + (r.tCritical || '') + '\t' + (r.pValue || '') + '\t' + (r.decision || '') + '\t' + (r.description || '') + '\n';
          });
        } else {
          (t.indicators || []).forEach(function (r) {
            text += (r.indicator || '') + '\t' + (r.weightedMean != null ? r.weightedMean.toFixed(2) : '') + '\t' + (r.qualitativeDescription || '') + '\t' + (r.rank != null ? (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) : '') + '\t' + (r.total || '') + '\n';
          });
          if (t.awm != null) text += 'AWM: ' + t.awm.toFixed(2) + ' (' + (t.awmDesc || '') + ')\n';
        }
        if (t.interpretation) text += '\n' + t.interpretation;
        navigator.clipboard.writeText(text).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      });

      removeBtn.addEventListener('click', function () {
        pendingRemoveTable = { type: 'likert', index: idx };
        openRemoveTableModal();
      });

      actions.appendChild(copyBtn);
      actions.appendChild(removeBtn);
      body.appendChild(actions);

      header.addEventListener('click', function () {
        accordion.classList.toggle('is-expanded');
      });

      accordion.appendChild(header);
      accordion.appendChild(body);
      container.appendChild(accordion);
    });
  }

  // ---------- Export Actions ----------
  function copyAllText() {
    var text = buildCompiledReport(true, true);
    if (!text.trim()) {
      showToast('No content to copy.', true);
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied all text!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  function printReport() {
    incrementReportsCreated();
    appendActivity('Printed report');
    window.print();
    showToast('Print dialog opened.');
  }

  function downloadTxt() {
    var text = buildCompiledReport(true, true);
    if (!text.trim()) {
      showToast('No content to download.', true);
      return;
    }
    incrementReportsCreated();
    appendActivity('Downloaded report (.txt)');
    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'thesis-report-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloaded .txt');
  }

  // ---------- Clear Report Content ----------
  function clearReportContent() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.removeItem(KEYS.profileDataSaved);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem(KEYS.summaryDataSaved);
    } catch (e) {}
    appendActivity('Cleared report content');
    showToast('Report content cleared.');
    closeClearModal();
    refreshAll();
  }

  // ---------- Remove Section ----------
  var pendingRemoveSection = null;

  function removeSection(sectionKey) {
    var s = getGeneratedSummaries();
    if (!s) return;
    s[sectionKey] = '';
    s.updatedAt = Date.now();
    try {
      localStorage.setItem(KEYS.generatedSummaries, JSON.stringify(s));
      appendActivity('Removed ' + sectionKey + ' from report');
      showToast('Section removed.');
    } catch (e) {
      showToast('Remove failed.', true);
    }
    closeRemoveSectionModal();
    refreshAll();
  }

  // ---------- Remove Table ----------
  var pendingRemoveTable = null;

  function doRemoveTable() {
    if (!pendingRemoveTable) return;
    var type = pendingRemoveTable.type;
    var idx = pendingRemoveTable.index;
    if (type === 'profile') {
      var profile = getProfileTables();
      profile.splice(idx, 1);
      localStorage.setItem(KEYS.profileTables, JSON.stringify(profile));
    } else if (type === 'likert') {
      var likert = getLikertTables();
      likert.splice(idx, 1);
      localStorage.setItem(KEYS.likertTables, JSON.stringify(likert));
    }
    appendActivity('Removed ' + type + ' table');
    showToast('Table removed.');
    closeRemoveTableModal();
    pendingRemoveTable = null;
    refreshAll();
  }

  // ---------- Reset Session ----------
  function resetSession() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.tablesProcessed);
      localStorage.removeItem(KEYS.respondentsEncoded);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.profileDataSaved);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem(KEYS.summaryDataSaved);
      localStorage.removeItem(KEYS.reportDataSaved);
    } catch (e) {
      console.warn('Reset session: could not clear some keys', e);
    }
    closeResetModal();
    window.location.reload();
  }

  // ---------- Modals ----------
  var resetModal = document.getElementById('re-reset-modal');
  var resetBackdrop = document.getElementById('re-reset-backdrop');
  var resetCancel = document.getElementById('re-reset-cancel');
  var resetConfirm = document.getElementById('re-reset-confirm');

  function openResetModal() {
    if (resetModal) {
      resetModal.removeAttribute('hidden');
      if (resetConfirm) resetConfirm.focus();
    }
  }
  function closeResetModal() {
    if (resetModal) resetModal.setAttribute('hidden', '');
  }

  var clearModal = document.getElementById('re-clear-modal');
  var clearBackdrop = document.getElementById('re-clear-backdrop');
  var clearCancel = document.getElementById('re-clear-cancel');
  var clearConfirm = document.getElementById('re-clear-confirm');

  function openClearModal() {
    if (clearModal) {
      clearModal.removeAttribute('hidden');
      if (clearConfirm) clearConfirm.focus();
    }
  }
  function closeClearModal() {
    if (clearModal) clearModal.setAttribute('hidden', '');
  }

  var removeSectionModal = document.getElementById('re-remove-section-modal');
  var removeSectionBackdrop = document.getElementById('re-remove-backdrop');
  var removeSectionCancel = document.getElementById('re-remove-cancel');
  var removeSectionConfirm = document.getElementById('re-remove-confirm');

  function openRemoveSectionModal(sectionKey, label) {
    pendingRemoveSection = sectionKey;
    var title = document.getElementById('re-remove-modal-title');
    var text = document.getElementById('re-remove-modal-text');
    if (title) title.textContent = 'Remove ' + (label || sectionKey) + '?';
    if (text) text.textContent = 'This section will be removed from the report.';
    if (removeSectionModal) {
      removeSectionModal.removeAttribute('hidden');
      if (removeSectionConfirm) removeSectionConfirm.focus();
    }
  }
  function closeRemoveSectionModal() {
    if (removeSectionModal) removeSectionModal.setAttribute('hidden', '');
    pendingRemoveSection = null;
  }

  var removeTableModal = document.getElementById('re-remove-table-modal');
  var removeTableBackdrop = document.getElementById('re-remove-table-backdrop');
  var removeTableCancel = document.getElementById('re-remove-table-cancel');
  var removeTableConfirm = document.getElementById('re-remove-table-confirm');

  function openRemoveTableModal() {
    if (removeTableModal) {
      removeTableModal.removeAttribute('hidden');
      if (removeTableConfirm) removeTableConfirm.focus();
    }
  }
  function closeRemoveTableModal() {
    if (removeTableModal) removeTableModal.setAttribute('hidden', '');
    pendingRemoveTable = null;
  }

  // ---------- Refresh All ----------
  function refreshAll() {
    refreshDataOverview();
    renderAllSections();
    renderProfileTables();
    renderLikertTables();
    updateCompiledOutput();
  }

  // ---------- Init ----------
  function init() {
    refreshAll();

    var toggleAppendices = document.getElementById('re-toggle-appendices');
    var toggleInterpretations = document.getElementById('re-toggle-interpretations');
    if (toggleAppendices) toggleAppendices.addEventListener('change', updateCompiledOutput);
    if (toggleInterpretations) toggleInterpretations.addEventListener('change', updateCompiledOutput);

    document.getElementById('re-copy-all').addEventListener('click', copyAllText);
    document.getElementById('re-print').addEventListener('click', printReport);
    document.getElementById('re-download-txt').addEventListener('click', downloadTxt);
    document.getElementById('re-clear-report').addEventListener('click', openClearModal);

    document.getElementById('re-copy-respondents').addEventListener('click', function () {
      var s = getGeneratedSummaries();
      if (s && s.respondentsSummary) {
        navigator.clipboard.writeText(s.respondentsSummary).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      } else showToast('No content to copy.', true);
    });
    document.getElementById('re-remove-respondents').addEventListener('click', function () {
      openRemoveSectionModal('respondentsSummary', 'Respondents Summary');
    });

    document.getElementById('re-copy-findings').addEventListener('click', function () {
      var s = getGeneratedSummaries();
      if (s && s.findingsSummary) {
        navigator.clipboard.writeText(s.findingsSummary).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      } else showToast('No content to copy.', true);
    });
    document.getElementById('re-remove-findings').addEventListener('click', function () {
      openRemoveSectionModal('findingsSummary', 'Findings');
    });

    document.getElementById('re-copy-conclusions').addEventListener('click', function () {
      var s = getGeneratedSummaries();
      if (s && s.conclusions) {
        navigator.clipboard.writeText(s.conclusions).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      } else showToast('No content to copy.', true);
    });
    document.getElementById('re-remove-conclusions').addEventListener('click', function () {
      openRemoveSectionModal('conclusions', 'Conclusions');
    });

    document.getElementById('re-copy-recommendations').addEventListener('click', function () {
      var s = getGeneratedSummaries();
      if (s && s.recommendations) {
        navigator.clipboard.writeText(s.recommendations).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      } else showToast('No content to copy.', true);
    });
    document.getElementById('re-remove-recommendations').addEventListener('click', function () {
      openRemoveSectionModal('recommendations', 'Recommendations');
    });

    document.getElementById('re-copy-compiled').addEventListener('click', function () {
      var el = document.getElementById('re-compiled-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      } else showToast('No content to copy.', true);
    });

    if (clearConfirm) clearConfirm.addEventListener('click', clearReportContent);
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    if (removeSectionConfirm) removeSectionConfirm.addEventListener('click', function () {
      if (pendingRemoveSection) removeSection(pendingRemoveSection);
    });
    if (removeSectionCancel) removeSectionCancel.addEventListener('click', closeRemoveSectionModal);
    if (removeSectionBackdrop) removeSectionBackdrop.addEventListener('click', closeRemoveSectionModal);

    if (removeTableConfirm) removeTableConfirm.addEventListener('click', doRemoveTable);
    if (removeTableCancel) removeTableCancel.addEventListener('click', closeRemoveTableModal);
    if (removeTableBackdrop) removeTableBackdrop.addEventListener('click', closeRemoveTableModal);

    document.getElementById('re-btn-reset').addEventListener('click', openResetModal);
    document.getElementById('re-btn-reset-mobile').addEventListener('click', openResetModal);
    if (resetConfirm) resetConfirm.addEventListener('click', resetSession);
    if (resetCancel) resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);

    if (resetModal) resetModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeResetModal();
    });
    if (clearModal) clearModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeClearModal();
    });
    if (removeSectionModal) removeSectionModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeRemoveSectionModal();
    });
    if (removeTableModal) removeTableModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeRemoveTableModal();
    });

    var hamburger = document.getElementById('re-hamburger');
    var dropdown = document.getElementById('re-nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.re-nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
