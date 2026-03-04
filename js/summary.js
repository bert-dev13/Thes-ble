/**
 * Thesis Interpretation Assistant — Summary Generator
 * Vanilla JS: generates thesis-ready summaries from saved profileTables and likertTables.
 * Uses vertical row sections only. No grid layouts.
 * localStorage: profileTables, likertTables, generatedSummaries, interpretationsGenerated, reportsCreated, recentActivity
 */

(function () {
  'use strict';

  var KEYS = {
    profileTables: 'profileTables',
    likertTables: 'likertTables',
    generatedSummaries: 'generatedSummaries',
    interpretationsGenerated: 'interpretationsGenerated',
    reportsCreated: 'reportsCreated',
    recentActivity: 'recentActivity',
    summaryDataSaved: 'summaryDataSaved'
  };
  var MAX_ACTIVITY = 8;

  var FINDINGS_OPENINGS = [
    'In terms of ',
    'Regarding ',
    'Considering ',
    'Across ',
    'Concerning ',
    'Relative to ',
    'Pertaining to ',
    'With reference to ',
    'In relation to ',
    'As to '
  ];
  var openingIndex = 0;

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

  function showToast(message, isError) {
    var container = document.getElementById('sg-toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'sg-toast' + (isError ? ' sg-toast--error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  function formatTimestamp(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getLastSavedTimestamp() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var last = 0;
    profile.forEach(function (t) {
      if (t.createdAt && t.createdAt > last) last = t.createdAt;
    });
    likert.forEach(function (t) {
      if (t.createdAt && t.createdAt > last) last = t.createdAt;
    });
    return last || null;
  }

  // ---------- Section 1: Data Source Preview ----------
  function refreshDataOverview() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var hasData = profile.length > 0 || likert.length > 0;

    var overview = document.getElementById('sg-data-overview');
    var emptyState = document.getElementById('sg-empty-data');
    if (overview) overview.hidden = !hasData;
    if (emptyState) emptyState.hidden = hasData;

    var profileCount = document.getElementById('sg-profile-count');
    var likertCount = document.getElementById('sg-likert-count');
    var lastSaved = document.getElementById('sg-last-saved');
    if (profileCount) profileCount.textContent = profile.length;
    if (likertCount) likertCount.textContent = likert.length;
    if (lastSaved) lastSaved.textContent = formatTimestamp(getLastSavedTimestamp());
  }

  function clearSavedSummaries() {
    try {
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.setItem(KEYS.summaryDataSaved, 'false');
    } catch (e) {}
    var outputs = ['sg-respondents-output', 'sg-findings-output', 'sg-conclusions-output', 'sg-recommendations-output'];
    outputs.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    appendActivity('Cleared saved summaries');
    showToast('Saved summaries cleared.');
    refreshDataOverview();
  }

  // ---------- Section 2: Respondents Summary ----------
  function getHighestCategories(rows) {
    if (!rows || rows.length === 0) return [];
    var maxFreq = Math.max.apply(null, rows.map(function (r) { return r.frequency || 0; }));
    return rows.filter(function (r) { return (r.frequency || 0) === maxFreq; }).map(function (r) { return r.category; });
  }

  function generateRespondentsSummary() {
    var profile = getProfileTables();
    if (profile.length === 0) {
      showToast('No profile data. Save tables from Profile Analyzer first.', true);
      return '';
    }

    var parts = [];
    profile.forEach(function (t) {
      var topCats = getHighestCategories(t.rows);
      if (topCats.length > 0) {
        var quoted = topCats.map(function (c) { return '"' + c + '"'; });
        var subject = (t.tableTitle || 'the variable').toLowerCase();
        parts.push('For ' + subject + ', the dominant category was ' + (quoted.length === 1 ? quoted[0] : quoted.join(' and ')) + '.');
      }
    });

    if (parts.length === 0) return '';

    var body = parts.join(' ');
    var conclusion = 'The respondent profile is characterized by the predominance of these categories across the analyzed dimensions.';
    return body + ' ' + conclusion;
  }

  // ---------- Section 3: Findings ----------
  function getNextOpening() {
    var o = FINDINGS_OPENINGS[openingIndex % FINDINGS_OPENINGS.length];
    openingIndex += 1;
    return o;
  }

  function getTopQualGroupIndicators(indicators, includeNext) {
    if (!indicators || indicators.length === 0) return [];
    var sorted = indicators.slice().sort(function (a, b) { return (b.weightedMean || 0) - (a.weightedMean || 0); });
    var topDesc = sorted[0].qualitativeDescription;
    var topGroup = indicators.filter(function (i) { return i.qualitativeDescription === topDesc; });
    if (topGroup.length > 0) return topGroup;
    if (includeNext && sorted.length > 1) {
      var nextDesc = sorted[1].qualitativeDescription;
      return indicators.filter(function (i) { return i.qualitativeDescription === nextDesc; });
    }
    return [];
  }

  function buildAwmSentence(awm, awmDesc, theme) {
    var desc = awmDesc || '—';
    var themeLower = (theme || '').toLowerCase();
    var signifies = 'respondents view the manifestation of the theme as ' + desc + '.';
    if (themeLower.indexOf('challenge') !== -1) {
      signifies = 'respondents view the challenges encountered as ' + desc + '.';
    } else if (themeLower.indexOf('effect') !== -1) {
      signifies = 'respondents view the effect as ' + desc + '.';
    }
    return 'The average weighted mean is described as "' + desc + '," which signifies that ' + signifies;
  }

  function generateFindings() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return '';
    }

    var includeImplication = document.getElementById('sg-toggle-implication') && document.getElementById('sg-toggle-implication').checked;
    var includeNextGroup = document.getElementById('sg-toggle-next-group') && document.getElementById('sg-toggle-next-group').checked;

    var paragraphs = [];

    profile.forEach(function (t) {
      var topCats = getHighestCategories(t.rows);
      if (topCats.length === 0) return;
      var opening = getNextOpening();
      var quoted = topCats.map(function (c) { return '"' + c + '"'; });
      var subject = (t.tableTitle || 'the variable').toLowerCase();
      var p = opening + subject + ', the highest frequency category was ' + (quoted.length === 1 ? quoted[0] : quoted.join(' and ')) + '.';
      if (includeImplication) {
        p += ' This suggests a predominance of ' + (quoted.length === 1 ? quoted[0] : 'these categories') + ' among respondents.';
      }
      paragraphs.push(p);
    });

    likert.forEach(function (t) {
      var indicators = t.indicators || [];
      var topGroup = getTopQualGroupIndicators(indicators, includeNextGroup);
      var opening = getNextOpening();
      var theme = (t.tableTitle || 'the theme').toLowerCase();

      if (topGroup.length > 0) {
        var labels = topGroup.map(function (i) { return '"' + i.indicator + '"'; });
        var p = opening + theme + ', the indicators under the highest qualitative description group were ' + labels.join(', ') + '. ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        if (includeImplication && t.awmDesc) {
          p += ' This indicates that respondents perceive the theme as ' + t.awmDesc + '.';
        }
        paragraphs.push(p);
      } else {
        var p = opening + theme + ', ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        paragraphs.push(p);
      }
    });

    return paragraphs.join('\n\n');
  }

  // ---------- Section 4: Conclusions ----------
  function generateConclusions() {
    var respondentsSummary = document.getElementById('sg-respondents-output') && document.getElementById('sg-respondents-output').value.trim();
    var findingsSummary = document.getElementById('sg-findings-output') && document.getElementById('sg-findings-output').value.trim();

    if (!respondentsSummary && !findingsSummary) {
      showToast('Generate respondents summary and findings first.', true);
      return '';
    }

    var paragraphs = [];
    paragraphs.push('Based on the findings of the study, the following conclusions are made.');

    if (respondentsSummary) {
      paragraphs.push('With respect to the respondents\' profile, the data indicate a concentration of respondents in specific categories across the analyzed variables. The dominant categories reflect the general demographic and characteristic composition of the sample.');
    }

    var likert = getLikertTables();
    if (likert.length > 0 && findingsSummary) {
      likert.forEach(function (t) {
        var theme = t.tableTitle || 'the theme';
        var desc = t.awmDesc || 'as indicated by the average weighted mean';
        paragraphs.push('Regarding ' + theme + ', the overall assessment is ' + desc + '. The findings support the conclusion that respondents\' perceptions align with this qualitative description across the measured indicators.');
      });
    }

    return paragraphs.join('\n\n');
  }

  // ---------- Section 5: Recommendations ----------
  function generateRecommendations() {
    var findingsSummary = document.getElementById('sg-findings-output') && document.getElementById('sg-findings-output').value.trim();
    var conclusionsSummary = document.getElementById('sg-conclusions-output') && document.getElementById('sg-conclusions-output').value.trim();

    if (!findingsSummary && !conclusionsSummary) {
      showToast('Generate findings and conclusions first.', true);
      return '';
    }

    var targetEl = document.getElementById('sg-target-audience');
    var target = targetEl && targetEl.value ? targetEl.value.trim() : '';
    var use35 = document.getElementById('sg-toggle-recs-per-theme') && document.getElementById('sg-toggle-recs-per-theme').checked;

    var profile = getProfileTables();
    var likert = getLikertTables();
    var themes = [];
    profile.forEach(function (t) {
      if (t.tableTitle) themes.push({ type: 'profile', title: t.tableTitle });
    });
    likert.forEach(function (t) {
      if (t.tableTitle) themes.push({ type: 'likert', title: t.tableTitle });
    });

    if (themes.length === 0) themes.push({ type: 'general', title: 'the study' });

    var intro = 'Based on the foregoing findings and conclusions of the study, the following are recommended for implementation:';
    var recs = [];
    var count = 1;
    var profileRecTemplates = [
      'Develop targeted interventions that address the needs of the predominant respondent category in ',
      'Design programs that accommodate the demographic characteristics reflected in ',
      'Consider the implications of the respondent distribution in '
    ];
    var likertRecTemplates = [
      'Strengthen the areas identified in ',
      'Maintain and reinforce the positive indicators observed in ',
      'Address gaps and build on the findings from ',
      'Implement follow-up measures based on the assessment of '
    ];

    themes.forEach(function (theme) {
      var n = use35 ? 3 + Math.floor(Math.random() * 3) : 3;
      var audience = target ? ' for ' + target : '';
      for (var i = 0; i < n; i++) {
        var rec = '';
        if (theme.type === 'profile') {
          var tpl = profileRecTemplates[i % profileRecTemplates.length];
          rec = tpl + theme.title + audience + '.';
        } else if (theme.type === 'likert') {
          var tpl2 = likertRecTemplates[i % likertRecTemplates.length];
          rec = tpl2 + theme.title + audience + '.';
        } else {
          rec = 'Apply the insights from the findings to inform policy and practice' + audience + '.';
        }
        recs.push(count + '. ' + rec);
        count += 1;
      }
    });

    return intro + '\n\n' + recs.join('\n');
  }

  // ---------- Save / Copy helpers ----------
  function saveSectionToReport(section, content) {
    var summaries = getGeneratedSummaries() || {};
    summaries[section] = content;
    summaries.updatedAt = Date.now();
    try {
      localStorage.setItem(KEYS.generatedSummaries, JSON.stringify(summaries));
      setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + 1);
      localStorage.setItem(KEYS.summaryDataSaved, 'true');
      appendActivity('Saved ' + section + ' to report');
      showToast('Saved to report.');
    } catch (e) {
      showToast('Save failed.', true);
    }
  }

  function saveAllToReport() {
    var respondents = document.getElementById('sg-respondents-output') && document.getElementById('sg-respondents-output').value.trim();
    var findings = document.getElementById('sg-findings-output') && document.getElementById('sg-findings-output').value.trim();
    var conclusions = document.getElementById('sg-conclusions-output') && document.getElementById('sg-conclusions-output').value.trim();
    var recommendations = document.getElementById('sg-recommendations-output') && document.getElementById('sg-recommendations-output').value.trim();

    var summaries = {
      respondentsSummary: respondents,
      findingsSummary: findings,
      conclusions: conclusions,
      recommendations: recommendations,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(KEYS.generatedSummaries, JSON.stringify(summaries));
      setNumber(KEYS.reportsCreated, getNumber(KEYS.reportsCreated) + 1);
      localStorage.setItem(KEYS.summaryDataSaved, 'true');
      appendActivity('Saved all sections to report');
      showToast('All sections saved to report.');
    } catch (e) {
      showToast('Save failed.', true);
    }
  }

  function copyAll() {
    var parts = [];
    var ids = ['sg-respondents-output', 'sg-findings-output', 'sg-conclusions-output', 'sg-recommendations-output'];
    var labels = ['Summary of Respondents', 'Summary of Findings', 'Conclusions', 'Recommendations'];
    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el && el.value.trim()) {
        parts.push(labels[i] + '\n\n' + el.value.trim());
      }
    });
    if (parts.length === 0) {
      showToast('No content to copy.', true);
      return;
    }
    var text = parts.join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(function () {
      showToast('All sections copied!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  // ---------- Reset Session (clear all system keys) ----------
  function resetSession() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.summaryDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('profileDataSaved');
      localStorage.removeItem('likertDataSaved');
      localStorage.removeItem('reportDataSaved');
    } catch (e) {
      console.warn('Reset session: could not clear some keys', e);
    }
    closeResetModal();
    window.location.reload();
  }

  // ---------- Modals ----------
  var resetModal = document.getElementById('sg-reset-modal');
  var resetBackdrop = document.getElementById('sg-reset-backdrop');
  var resetCancel = document.getElementById('sg-reset-cancel');
  var resetConfirm = document.getElementById('sg-reset-confirm');

  function openResetModal() {
    if (resetModal) {
      resetModal.removeAttribute('hidden');
      if (resetConfirm) resetConfirm.focus();
    }
  }
  function closeResetModal() {
    if (resetModal) resetModal.setAttribute('hidden', '');
  }

  var clearModal = document.getElementById('sg-clear-modal');
  var clearBackdrop = document.getElementById('sg-clear-backdrop');
  var clearCancel = document.getElementById('sg-clear-cancel');
  var clearConfirm = document.getElementById('sg-clear-confirm');

  function openClearModal() {
    if (clearModal) {
      clearModal.removeAttribute('hidden');
      if (clearConfirm) clearConfirm.focus();
    }
  }
  function closeClearModal() {
    if (clearModal) clearModal.setAttribute('hidden', '');
  }

  // ---------- Init ----------
  function init() {
    refreshDataOverview();

    document.getElementById('sg-refresh-data').addEventListener('click', refreshDataOverview);
    document.getElementById('sg-clear-summaries').addEventListener('click', openClearModal);
    if (clearConfirm) clearConfirm.addEventListener('click', function () {
      clearSavedSummaries();
      closeClearModal();
    });
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);
    if (clearModal) clearModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeClearModal();
    });

    document.getElementById('sg-generate-respondents').addEventListener('click', function () {
      var out = document.getElementById('sg-respondents-output');
      if (out) out.value = generateRespondentsSummary();
      if (out && out.value) showToast('Summary generated.');
    });
    document.getElementById('sg-copy-respondents').addEventListener('click', function () {
      var el = document.getElementById('sg-respondents-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      }
    });
    document.getElementById('sg-save-respondents').addEventListener('click', function () {
      var el = document.getElementById('sg-respondents-output');
      if (el && el.value) saveSectionToReport('respondentsSummary', el.value);
    });

    document.getElementById('sg-generate-findings').addEventListener('click', function () {
      var out = document.getElementById('sg-findings-output');
      if (out) out.value = generateFindings();
      if (out && out.value) showToast('Findings generated.');
    });
    document.getElementById('sg-copy-findings').addEventListener('click', function () {
      var el = document.getElementById('sg-findings-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      }
    });
    document.getElementById('sg-save-findings').addEventListener('click', function () {
      var el = document.getElementById('sg-findings-output');
      if (el && el.value) saveSectionToReport('findingsSummary', el.value);
    });

    document.getElementById('sg-generate-conclusions').addEventListener('click', function () {
      var out = document.getElementById('sg-conclusions-output');
      if (out) out.value = generateConclusions();
      if (out && out.value) showToast('Conclusions generated.');
    });
    document.getElementById('sg-copy-conclusions').addEventListener('click', function () {
      var el = document.getElementById('sg-conclusions-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      }
    });
    document.getElementById('sg-save-conclusions').addEventListener('click', function () {
      var el = document.getElementById('sg-conclusions-output');
      if (el && el.value) saveSectionToReport('conclusions', el.value);
    });

    document.getElementById('sg-generate-recommendations').addEventListener('click', function () {
      var out = document.getElementById('sg-recommendations-output');
      if (out) out.value = generateRecommendations();
      if (out && out.value) showToast('Recommendations generated.');
    });
    document.getElementById('sg-copy-recommendations').addEventListener('click', function () {
      var el = document.getElementById('sg-recommendations-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(function () { showToast('Copied!'); }).catch(function () { showToast('Copy failed.', true); });
      }
    });
    document.getElementById('sg-save-recommendations').addEventListener('click', function () {
      var el = document.getElementById('sg-recommendations-output');
      if (el && el.value) saveSectionToReport('recommendations', el.value);
    });

    document.getElementById('sg-save-all').addEventListener('click', saveAllToReport);
    document.getElementById('sg-copy-all').addEventListener('click', copyAll);

    document.getElementById('sg-btn-reset').addEventListener('click', openResetModal);
    document.getElementById('sg-btn-reset-mobile').addEventListener('click', openResetModal);
    if (resetConfirm) resetConfirm.addEventListener('click', resetSession);
    if (resetCancel) resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);
    if (resetModal) resetModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeResetModal();
    });

    var hamburger = document.getElementById('sg-hamburger');
    var dropdown = document.getElementById('sg-nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.sg-nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    var saved = getGeneratedSummaries();
    if (saved) {
      var r = document.getElementById('sg-respondents-output');
      var f = document.getElementById('sg-findings-output');
      var c = document.getElementById('sg-conclusions-output');
      var rec = document.getElementById('sg-recommendations-output');
      if (r && saved.respondentsSummary) r.value = saved.respondentsSummary;
      if (f && saved.findingsSummary) f.value = saved.findingsSummary;
      if (c && saved.conclusions) c.value = saved.conclusions;
      if (rec && saved.recommendations) rec.value = saved.recommendations;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
