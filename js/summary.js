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

  var OPENINGS_LEGACY = [
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

  function getVariedOpener() {
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    return Utils ? Utils.getVariedOpener() : OPENINGS_LEGACY[openingIndex % OPENINGS_LEGACY.length];
  }

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

  function autoResizeTextarea(ta) {
    if (!ta || ta.nodeName !== 'TEXTAREA') return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(140, ta.scrollHeight) + 'px';
  }

  function resizeAllOutputs() {
    ['sg-respondents-output', 'sg-findings-output', 'sg-conclusions-output', 'sg-recommendations-output'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) autoResizeTextarea(el);
    });
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

    resizeAllOutputs();
    showToast('Data refreshed. ' + profile.length + ' profile table(s), ' + likert.length + ' Likert table(s) loaded.');
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
  /** Get dominant categories for single-group (frequency) or two-group (heads.f + teachers.f) profile tables. */
  function getHighestCategories(rows, tableType) {
    if (!rows || rows.length === 0) return [];
    var getFreq = function (r) {
      if (tableType === 'twoGroup') {
        var h = (r.heads && r.heads.f) || 0;
        var t = (r.teachers && r.teachers.f) || 0;
        return h + t;
      }
      return r.frequency || 0;
    };
    var maxFreq = Math.max.apply(null, rows.map(getFreq));
    if (maxFreq <= 0) return [];
    return rows.filter(function (r) { return getFreq(r) === maxFreq; }).map(function (r) { return r.category; });
  }

  /** Map table title to slot order (1–8) for required sequence: Age, Gender, Civil Status, Education, Position, Rating, Years Service, In-Service. */
  function getProfileTableSlot(title) {
    if (!title) return 99;
    var t = title.toLowerCase();
    if (t.indexOf('age') !== -1 || t.indexOf('table 2') !== -1) return 1;
    if (t.indexOf('gender') !== -1 || t.indexOf('table 3') !== -1) return 2;
    if (t.indexOf('civil status') !== -1 || t.indexOf('table 4') !== -1) return 3;
    if (t.indexOf('educational attainment') !== -1 || t.indexOf('education') !== -1 || t.indexOf('table 5') !== -1) return 4;
    if (t.indexOf('present position') !== -1 || t.indexOf('position') !== -1 || t.indexOf('table 6') !== -1) return 5;
    if (t.indexOf('performance rating') !== -1 || t.indexOf('rating') !== -1 || t.indexOf('table 7') !== -1) return 6;
    if (t.indexOf('years in service') !== -1 || t.indexOf('years of service') !== -1 || t.indexOf('table 8') !== -1) return 7;
    if (t.indexOf('in-service') !== -1 || t.indexOf('inservice') !== -1 || t.indexOf('table 9') !== -1) return 8;
    return 99;
  }

  /** Get single dominant category (first if tie). No frequencies or percentages. */
  function getDominantCategory(rows, tableType) {
    var cats = getHighestCategories(rows || [], tableType);
    return cats.length > 0 ? cats[0] : '';
  }

  /** Concluding phrases for "This indicates that the respondents are __________." */
  var RESPONDENT_CONCLUSION_PHRASES = [
    'experienced educators actively engaged in professional development',
    'characterized by the demographic and professional profile reflected in the above categories',
    'predominantly experienced professionals with established roles in the field'
  ];

  function generateRespondentsSummaryWithVariant(variantIndex, lastOpener) {
    var profile = getProfileTables();
    if (profile.length === 0) return '';

    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var includeImplication = document.getElementById('sg-toggle-implication') && document.getElementById('sg-toggle-implication').checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var sorted = profile.slice().sort(function (a, b) {
      return getProfileTableSlot(a.tableTitle) - getProfileTableSlot(b.tableTitle);
    });

    var data = {};
    sorted.forEach(function (t) {
      var slot = getProfileTableSlot(t.tableTitle);
      if (slot >= 1 && slot <= 8) {
        var tableType = t.type === 'twoGroup' ? 'twoGroup' : 'singleGroup';
        var cat = getDominantCategory(t.rows, tableType);
        if (cat) data[slot] = cat;
      }
    });

    var age = data[1] || '';
    var gender = data[2] || '';
    var civilStatus = data[3] || '';
    var education = data[4] || '';
    var position = data[5] || '';
    var rating = data[6] || '';
    var yearsService = data[7] || '';
    var inService = data[8] || '';

    var parts = [];
    if (age || gender) {
      var agePart = age ? 'belong to the "' + age + '" age group' : '';
      var genderPart = gender ? 'are "' + gender + '"' : '';
      if (agePart && genderPart) {
        parts.push('Most of the respondents ' + agePart + ' and ' + genderPart + '.');
      } else if (agePart) {
        parts.push('Most of the respondents ' + agePart + '.');
      } else if (genderPart) {
        parts.push('Most of the respondents ' + genderPart + '.');
      }
    }
    if (civilStatus || education || position) {
      var midParts = [];
      if (civilStatus) midParts.push('are "' + civilStatus + '"');
      if (education) midParts.push('have "' + education + '"');
      if (position) midParts.push('occupy the position of "' + position + '"');
      if (midParts.length > 0) {
        var midText = midParts.length === 1 ? midParts[0] : midParts.slice(0, -1).join(', ') + ', and ' + midParts[midParts.length - 1];
        parts.push('The majority ' + midText + '.');
      }
    }
    if (rating || yearsService || inService) {
      var endParts = [];
      if (rating) {
        var article = /^[aeiou]/i.test(rating) ? 'an' : 'a';
        endParts.push('received ' + article + ' "' + rating + '" performance rating');
      }
      if (yearsService) endParts.push('have "' + yearsService + '" years of service');
      if (inService) {
        var inServiceLabel = inService.toLowerCase().indexOf('level') !== -1 ? inService : inService + ' level';
        endParts.push('attended in-service trainings mostly at the "' + inServiceLabel + '"');
      }
      if (endParts.length > 0) {
        var endText = endParts.length === 1 ? endParts[0] : endParts.slice(0, -1).join(', ') + ', and ' + endParts[endParts.length - 1];
        parts.push('Most ' + endText + '.');
      }
    }

    if (parts.length === 0) return '';

    var conclusionPhrase = RESPONDENT_CONCLUSION_PHRASES[vi % RESPONDENT_CONCLUSION_PHRASES.length];
    var text = parts.join(' ') + ' This indicates that the respondents are ' + conclusionPhrase + '.';

    if (includeImplication) {
      var impl = Gen ? Gen.buildImplicationsWithVariant('profile', vi) : (Utils ? Utils.buildImplications('profile') : { first: '', second: '' });
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text;
  }

  function generateRespondentsSummary() {
    var profile = getProfileTables();
    if (profile.length === 0) {
      showToast('No profile data. Save tables from Profile Analyzer first.', true);
      return '';
    }
    return generateRespondentsSummaryWithVariant(0, '');
  }

  function regenerateRespondentsSummary() {
    var profile = getProfileTables();
    if (profile.length === 0) {
      showToast('No profile data. Save tables from Profile Analyzer first.', true);
      return;
    }
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var out = document.getElementById('sg-respondents-output');
    if (!out) return;
    var text;
    if (Gen) {
      var result = Gen.generateWithVariation(generateRespondentsSummaryWithVariant, 'summary_respondents', 'respondents');
      text = result.text;
    } else {
      text = generateRespondentsSummaryWithVariant(0, '');
    }
    out.value = text;
    autoResizeTextarea(out);
    showToast('Interpretation regenerated.');
  }

  // ---------- Section 3: Findings ----------
  function getNextOpening() {
    var o = getVariedOpener();
    if (typeof ThesisInterpretationUtils === 'undefined') openingIndex += 1;
    return o;
  }

  function getTopQualGroupIndicators(indicators, includeNext) {
    if (!indicators || indicators.length === 0) return [];
    var getWm = function (i) { return i.weightedMean != null ? i.weightedMean : (i.wm != null ? i.wm : 0); };
    var getQd = function (i) { return i.qualitativeDescription || i.qd || ''; };
    var sorted = indicators.slice().sort(function (a, b) { return getWm(b) - getWm(a); });
    if (sorted.length === 0) return [];
    var topDesc = getQd(sorted[0]);
    var topGroup = indicators.filter(function (i) { return getQd(i) === topDesc; });
    if (topGroup.length > 0) return topGroup;
    if (includeNext && sorted.length > 1) {
      var nextDesc = getQd(sorted[1]);
      return indicators.filter(function (i) { return getQd(i) === nextDesc; });
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

  function generateFindingsWithVariant(variantIndex, lastOpener) {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) return '';

    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var includeImplication = document.getElementById('sg-toggle-implication') && document.getElementById('sg-toggle-implication').checked;
    var includeNextGroup = document.getElementById('sg-toggle-next-group') && document.getElementById('sg-toggle-next-group').checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var paragraphs = [];
    var openerIdx = 0;

    profile.forEach(function (t) {
      var tableType = t.type === 'twoGroup' ? 'twoGroup' : 'singleGroup';
      var topCats = getHighestCategories(t.rows || [], tableType);
      if (topCats.length === 0) return;
      var opening = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : getNextOpening();
      openerIdx++;
      var quoted = topCats.map(function (c) { return '"' + c + '"'; });
      var subject = (t.tableTitle || 'the variable').toLowerCase();
      var dominantWord = Gen ? Gen.getSynonym('majority', vi + openerIdx) : 'dominant';
      var categoryPhrase = (dominantWord.indexOf('category') !== -1 ? dominantWord : dominantWord + ' category');
      var p = opening + subject + ', the ' + categoryPhrase + ' was ' + (quoted.length === 1 ? quoted[0] : quoted.join(' and ')) + '.';
      if (includeImplication) {
        var impl = Gen ? Gen.buildImplicationsWithVariant('profile', vi + openerIdx) : (Utils ? Utils.buildImplications('profile') : { first: '', second: '' });
        if (impl.first) p += ' ' + impl.first;
        if (impl.second) p += ' ' + impl.second;
      }
      paragraphs.push(p);
    });

    likert.forEach(function (t) {
      var isTwoGroup = t.type === 'twoGroup';
      var isTTest = t.type === 'tTest';
      var indicators = t.indicators || [];
      var topGroup = getTopQualGroupIndicators(indicators, includeNextGroup);
      var opening = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : getNextOpening();
      openerIdx++;
      var theme = (t.tableTitle || 'the theme').toLowerCase();

      if (isTTest) {
        var tTestP = opening + theme + ', the t-test results indicate significant or non-significant differences between the compared groups as reported in the table.';
        if (includeImplication) {
          var implT = Gen ? Gen.buildImplicationsWithVariant('likert', vi + openerIdx) : (Utils ? Utils.buildImplications('likert') : { first: '', second: '' });
          if (implT.first) tTestP += ' ' + implT.first;
          if (implT.second) tTestP += ' ' + implT.second;
        }
        paragraphs.push(tTestP);
      } else if (isTwoGroup && t.awm && (t.awm.sh || t.awm.t)) {
        var shDesc = (t.awm.sh && t.awm.sh.qd) ? t.awm.sh.qd : '';
        var tDesc = (t.awm.t && t.awm.t.qd) ? t.awm.t.qd : '';
        var awmParts = [];
        if (shDesc) awmParts.push('school heads: ' + shDesc);
        if (tDesc) awmParts.push('teachers: ' + tDesc);
        var awmText = awmParts.length > 0 ? awmParts.join('; ') : 'as indicated by the average weighted means';
        var p = opening + theme + ', the overall assessment shows ' + awmText + '. The findings reflect the perceptions of both respondent groups across the measured indicators.';
        if (includeImplication) {
          var impl2 = Gen ? Gen.buildImplicationsWithVariant('likert', vi + openerIdx) : (Utils ? Utils.buildImplications('likert') : { first: '', second: '' });
          if (impl2.first) p += ' ' + impl2.first;
          if (impl2.second) p += ' ' + impl2.second;
        }
        paragraphs.push(p);
      } else if (topGroup.length > 0) {
        var labels = topGroup.map(function (i) { return '"' + i.indicator + '"'; });
        var p = opening + theme + ', the indicators under the dominant qualitative description group were ' + labels.join(', ') + '. ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        if (includeImplication) {
          var impl = Gen ? Gen.buildImplicationsWithVariant('likert', vi + openerIdx) : (Utils ? Utils.buildImplications('likert') : { first: '', second: '' });
          if (impl.first) p += ' ' + impl.first;
          if (impl.second) p += ' ' + impl.second;
        }
        paragraphs.push(p);
      } else {
        var p = opening + theme + ', ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        if (includeImplication) {
          var impl = Gen ? Gen.buildImplicationsWithVariant('likert', vi + openerIdx) : (Utils ? Utils.buildImplications('likert') : { first: '', second: '' });
          if (impl.first) p += ' ' + impl.first;
          if (impl.second) p += ' ' + impl.second;
        }
        paragraphs.push(p);
      }
    });

    return paragraphs.join('\n\n');
  }

  function generateFindings() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return '';
    }
    return generateFindingsWithVariant(0, '');
  }

  function regenerateFindings() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return;
    }
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var out = document.getElementById('sg-findings-output');
    if (!out) return;
    var text;
    if (Gen) {
      var result = Gen.generateWithVariation(generateFindingsWithVariant, 'summary_findings', 'findings');
      text = result.text;
    } else {
      text = generateFindingsWithVariant(0, '');
    }
    out.value = text;
    autoResizeTextarea(out);
    showToast('Interpretation regenerated.');
  }

  // ---------- Section 4: Conclusions ----------
  function generateConclusionsWithVariant(variantIndex, lastOpener) {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) return '';

    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var includeImplication = document.getElementById('sg-toggle-implication') && document.getElementById('sg-toggle-implication').checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var paragraphs = [];
    paragraphs.push('Based on the findings of the study, the following conclusions are made.');

    var openerIdx = 0;

    profile.forEach(function (t, idx) {
      var tableType = t.type === 'twoGroup' ? 'twoGroup' : 'singleGroup';
      var topCats = getHighestCategories(t.rows || [], tableType);
      if (topCats.length === 0) return;
      var theme = t.tableTitle || 'the variable';
      var indicateWord = Gen ? Gen.getSynonym('shows', vi + openerIdx) : 'indicate';
      var opener = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : 'Regarding ';
      openerIdx++;
      var quoted = topCats.map(function (c) { return '"' + c + '"'; });
      var p = opener + theme + ', the data ' + indicateWord + ' a concentration of respondents in ' + (quoted.length === 1 ? quoted[0] : quoted.join(' and ')) + '. The dominant categories reflect the composition of the sample for this variable.';
      if (includeImplication) {
        var impl = Gen ? Gen.buildImplicationsWithVariant('conclusions', vi + idx) : (Utils ? Utils.buildImplications('conclusions') : { first: '', second: '' });
        if (impl.first) p += ' ' + impl.first;
        if (impl.second) p += ' ' + impl.second;
      }
      paragraphs.push(p);
    });

    likert.forEach(function (t, idx) {
      var theme = t.tableTitle || 'the theme';
      var desc;
      if (t.type === 'twoGroup' && t.awm && (t.awm.sh || t.awm.t)) {
        var shDesc = (t.awm.sh && t.awm.sh.qd) ? t.awm.sh.qd : '';
        var tDesc = (t.awm.t && t.awm.t.qd) ? t.awm.t.qd : '';
        var parts = [];
        if (shDesc) parts.push('school heads: ' + shDesc);
        if (tDesc) parts.push('teachers: ' + tDesc);
        desc = parts.length > 0 ? parts.join('; ') : 'as indicated by the average weighted means';
      } else if (t.type === 'tTest') {
        desc = 'the t-test results indicate significant or non-significant differences between the compared groups';
      } else {
        desc = t.awmDesc || 'as indicated by the average weighted mean';
      }
      var opener = Gen ? Gen.getOpenerForVariant(vi + openerIdx, '') : 'Regarding ';
      openerIdx++;
      var p = opener + theme + ', the overall assessment is ' + desc + '. The findings support the conclusion that respondents\' perceptions align with this qualitative description across the measured indicators.';
      if (includeImplication) {
        var impl = Gen ? Gen.buildImplicationsWithVariant('conclusions', vi + idx) : (Utils ? Utils.buildImplications('conclusions') : { first: '', second: '' });
        if (impl.first) p += ' ' + impl.first;
        if (impl.second) p += ' ' + impl.second;
      }
      paragraphs.push(p);
    });

    return paragraphs.join('\n\n');
  }

  function generateConclusions() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return '';
    }
    return generateConclusionsWithVariant(0, '');
  }

  function regenerateConclusions() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return;
    }
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var out = document.getElementById('sg-conclusions-output');
    if (!out) return;
    var text;
    if (Gen) {
      var result = Gen.generateWithVariation(generateConclusionsWithVariant, 'summary_conclusions', 'conclusions');
      text = result.text;
    } else {
      text = generateConclusionsWithVariant(0, '');
    }
    out.value = text;
    autoResizeTextarea(out);
    showToast('Interpretation regenerated.');
  }

  // ---------- Section 5: Recommendations ----------
  function generateRecommendations() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var findingsSummary = document.getElementById('sg-findings-output') && document.getElementById('sg-findings-output').value.trim();
    var conclusionsSummary = document.getElementById('sg-conclusions-output') && document.getElementById('sg-conclusions-output').value.trim();

    var profile = getProfileTables();
    var likert = getLikertTables();
    if (profile.length === 0 && likert.length === 0) {
      showToast('No saved data. Save tables from analyzers first.', true);
      return '';
    }

    var targetEl = document.getElementById('sg-target-audience');
    var target = targetEl && targetEl.value ? targetEl.value.trim() : '';
    var use35 = document.getElementById('sg-toggle-recs-per-theme') && document.getElementById('sg-toggle-recs-per-theme').checked;

    var themes = [];
    profile.forEach(function (t) {
      if (t.tableTitle) themes.push({ type: 'profile', title: t.tableTitle });
    });
    likert.forEach(function (t) {
      if (t.tableTitle) themes.push({ type: t.type === 'tTest' ? 'tTest' : 'likert', title: t.tableTitle });
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
        } else if (theme.type === 'likert' || theme.type === 'tTest') {
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
      if (out && out.value) {
        autoResizeTextarea(out);
        showToast('Summary generated.');
        var regen = document.getElementById('sg-regenerate-respondents');
        if (regen) regen.disabled = false;
      }
    });
    document.getElementById('sg-regenerate-respondents').addEventListener('click', regenerateRespondentsSummary);
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
      if (out && out.value) {
        autoResizeTextarea(out);
        showToast('Findings generated.');
        var regen = document.getElementById('sg-regenerate-findings');
        if (regen) regen.disabled = false;
      }
    });
    document.getElementById('sg-regenerate-findings').addEventListener('click', regenerateFindings);
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
      if (out && out.value) {
        autoResizeTextarea(out);
        showToast('Conclusions generated.');
        var regen = document.getElementById('sg-regenerate-conclusions');
        if (regen) regen.disabled = false;
      }
    });
    document.getElementById('sg-regenerate-conclusions').addEventListener('click', regenerateConclusions);
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
      if (out && out.value) {
        autoResizeTextarea(out);
        showToast('Recommendations generated.');
      }
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
      resizeAllOutputs();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
