/**
 * Thesis Interpretation Assistant — Summary Generator
 * Vanilla JS: generates thesis-ready summaries from saved profileTables and likertTables.
 * Uses vertical row sections only. No grid layouts.
 * localStorage: profileTables, likertTables, generatedSummaries, interpretationsGenerated, recentActivity
 */

(function () {
  'use strict';

  var KEYS = {
    profileTables: 'profileTables',
    likertTables: 'likertTables',
    generatedSummaries: 'generatedSummaries',
    interpretationsGenerated: 'interpretationsGenerated',
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
  function getTableDisplayName(t) {
    return (t && t.tableTitle) ? t.tableTitle.trim() : 'Untitled';
  }

  function getTableTypeLabel(t) {
    if (!t) return 'Profile';
    if (t.type === 'twoGroup') return 'Profile (Two Groups)';
    if (t.type === 'singleGroup') return 'Profile (Single Group)';
    return 'Profile';
  }

  function getLikertTypeLabel(t) {
    if (!t) return 'Likert';
    if (t.type === 'tTest') return 'Likert (T-test)';
    if (t.type === 'twoGroup') return 'Likert (Two Groups)';
    return 'Likert';
  }

  function renderProfileTableList(profile) {
    var list = document.getElementById('sg-profile-list');
    if (!list) return;
    list.innerHTML = '';
    if (!profile || profile.length === 0) {
      var li = document.createElement('li');
      li.className = 'sg-saved-table-list__empty';
      li.textContent = 'No profile tables saved yet.';
      list.appendChild(li);
      return;
    }
    profile.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'sg-saved-table-item';
      var name = document.createElement('span');
      name.className = 'sg-saved-table-item__name';
      name.textContent = getTableDisplayName(t);
      var meta = document.createElement('span');
      meta.className = 'sg-saved-table-item__meta';
      var parts = [getTableTypeLabel(t)];
      if (t.createdAt) parts.push(formatTimestamp(t.createdAt));
      meta.textContent = parts.join(' • ');
      li.appendChild(name);
      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  function renderLikertTableList(likert) {
    var list = document.getElementById('sg-likert-list');
    if (!list) return;
    list.innerHTML = '';
    if (!likert || likert.length === 0) {
      var li = document.createElement('li');
      li.className = 'sg-saved-table-list__empty';
      li.textContent = 'No Likert tables saved yet.';
      list.appendChild(li);
      return;
    }
    likert.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'sg-saved-table-item';
      var name = document.createElement('span');
      name.className = 'sg-saved-table-item__name';
      name.textContent = getTableDisplayName(t);
      var meta = document.createElement('span');
      meta.className = 'sg-saved-table-item__meta';
      var parts = [getLikertTypeLabel(t)];
      if (t.createdAt) parts.push(formatTimestamp(t.createdAt));
      meta.textContent = parts.join(' • ');
      li.appendChild(name);
      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  function refreshDataOverview(suppressToast) {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var hasData = profile.length > 0 || likert.length > 0;

    var overview = document.getElementById('sg-data-overview');
    var emptyState = document.getElementById('sg-empty-data');
    if (overview) overview.hidden = !hasData;
    if (emptyState) emptyState.hidden = hasData;

    var summaryEl = document.getElementById('sg-overview-summary');
    var lastSaved = document.getElementById('sg-last-saved');
    var pc = profile.length;
    var lc = likert.length;
    if (summaryEl) {
      summaryEl.textContent = pc + ' Profile Table' + (pc !== 1 ? 's' : '') + ' • ' + lc + ' Likert Table' + (lc !== 1 ? 's' : '');
    }
    if (lastSaved) lastSaved.textContent = formatTimestamp(getLastSavedTimestamp()) || '—';

    renderProfileTableList(profile);
    renderLikertTableList(likert);

    resizeAllOutputs();
    if (!suppressToast) {
      showToast('Data refreshed. ' + profile.length + ' profile table(s), ' + likert.length + ' Likert table(s) loaded.');
    }
  }

  function clearSavedSummaries() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.setItem(KEYS.summaryDataSaved, 'false');
      localStorage.setItem('profileDataSaved', 'false');
      localStorage.setItem('likertDataSaved', 'false');
    } catch (e) {}
    var outputs = ['sg-respondents-output', 'sg-findings-output', 'sg-conclusions-output', 'sg-recommendations-output'];
    outputs.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    appendActivity('Cleared saved summaries');
    showToast('Saved summaries and data cleared.');
    refreshDataOverview(true);
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

  /** Get dominant category per slot for a specific group (heads or teachers) in two-group profile. */
  function getDominantCategoriesByGroup(rows, groupKey) {
    if (!rows || rows.length === 0) return [];
    var getFreq = function (r) {
      var g = groupKey === 'heads' ? (r.heads && r.heads.f) : (r.teachers && r.teachers.f);
      return g || 0;
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

  /** Build profile paragraph from slot data (age, gender, etc.) for Summary of Findings. */
  function buildProfileParagraphFromSlots(data, groupLabel, opener, includeImplication) {
    var age = data[1] || '';
    var gender = data[2] || '';
    var civilStatus = data[3] || '';
    var education = data[4] || '';
    var position = data[5] || '';
    var rating = data[6] || '';
    var yearsService = data[7] || '';
    var inService = data[8] || '';
    var parts = [];
    var prefix = groupLabel ? groupLabel + ' respondents ' : 'Most of the respondents ';
    if (age || gender) {
      var agePart = age ? 'belong to the "' + age + '" age group' : '';
      var genderPart = gender ? 'are "' + gender + '"' : '';
      if (agePart && genderPart) {
        parts.push(prefix + agePart + ' and ' + genderPart + '.');
      } else if (agePart) {
        parts.push(prefix + agePart + '.');
      } else if (genderPart) {
        parts.push(prefix + genderPart + '.');
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
    var conclusionPhrase = 'characterized by the demographic and professional profile reflected in the above categories.';
    var text = opener + parts.join(' ') + ' This indicates that the respondents are ' + conclusionPhrase + '.';
    if (includeImplication) {
      var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
      var impl = Utils ? Utils.buildImplications('profile') : { first: '', second: '' };
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text;
  }

  /** Check if table is executive summary by title. */
  function isExecutiveSummary(title) {
    return (title || '').toLowerCase().indexOf('executive summary') !== -1;
  }

  /** Check if table is constraint or challenge by title. */
  function isConstraintOrChallenge(title) {
    var t = (title || '').toLowerCase();
    return t.indexOf('constraint') !== -1 || t.indexOf('challenge') !== -1;
  }

  /** Get indicators under highest QD for two-group Likert; if none, use next. Returns { sh: [], t: [] }. */
  function getIndicatorsByTopQdForTwoGroup(rows, includeNext) {
    if (!rows || rows.length === 0) return { sh: [], t: [] };
    var getShWm = function (r) { return r.sh && r.sh.wm != null ? r.sh.wm : 0; };
    var getTWm = function (r) { return r.t && r.t.wm != null ? r.t.wm : 0; };
    var getShQd = function (r) { return (r.sh && r.sh.qd) || ''; };
    var getTQd = function (r) { return (r.t && r.t.qd) || ''; };
    var sortedSh = rows.slice().sort(function (a, b) { return getShWm(b) - getShWm(a); });
    var sortedT = rows.slice().sort(function (a, b) { return getTWm(b) - getTWm(a); });
    var topShQd = sortedSh.length && getShWm(sortedSh[0]) > 0 ? getShQd(sortedSh[0]) : '';
    var topTQd = sortedT.length && getTWm(sortedT[0]) > 0 ? getTQd(sortedT[0]) : '';
    var shGroup = topShQd ? rows.filter(function (r) { return getShQd(r) === topShQd; }) : [];
    var tGroup = topTQd ? rows.filter(function (r) { return getTQd(r) === topTQd; }) : [];
    if (shGroup.length === 0 && includeNext && sortedSh.length > 1) {
      var nextShQd = getShQd(sortedSh[1]);
      shGroup = rows.filter(function (r) { return getShQd(r) === nextShQd; });
    }
    if (tGroup.length === 0 && includeNext && sortedT.length > 1) {
      var nextTQd = getTQd(sortedT[1]);
      tGroup = rows.filter(function (r) { return getTQd(r) === nextTQd; });
    }
    return {
      sh: shGroup.map(function (r) { return { indicator: r.indicator, qd: getShQd(r), wm: getShWm(r) }; }),
      t: tGroup.map(function (r) { return { indicator: r.indicator, qd: getTQd(r), wm: getTWm(r) }; })
    };
  }

  /** Build T-test finding from rows. Compares t-value vs t-critical, determines reject/accept. */
  function buildTTestFinding(rows, tableTitle, opener, includeImplication) {
    if (!rows || rows.length === 0) return '';
    var row = rows[0];
    var tValStr = (row.tValue || '').toString().trim();
    var tCritStr = (row.tCritical || '').toString().trim();
    var decision = (row.decision || '').toString().trim().toLowerCase();
    var theme = (tableTitle || 'the variable').toLowerCase();
    var isRejected = decision.indexOf('reject') !== -1 || decision.indexOf('significant') !== -1;
    var tVal = parseFloat(tValStr.replace(/[^0-9.-]/g, ''));
    var tCrit = parseFloat(tCritStr.replace(/[^0-9.-]/g, ''));
    if (!isNaN(tVal) && !isNaN(tCrit)) {
      isRejected = Math.abs(tVal) > tCrit;
    }
    var p;
    if (isRejected) {
      p = opener + theme + ', the T-test results show a significant difference between the perceptions of school heads and teachers. The computed t-value exceeded the critical value, resulting in the rejection of the null hypothesis. This indicates that the two groups differ significantly in their assessment.';
    } else {
      p = opener + theme + ', the T-test results show no significant difference between the perceptions of school heads and teachers. The computed t-value did not exceed the critical value, and the null hypothesis was accepted. This indicates that the two groups do not differ significantly in their assessment.';
    }
    if (includeImplication) {
      var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
      var impl = Utils ? Utils.buildImplications('ttest') : { first: '', second: '' };
      if (impl.first) p += ' ' + impl.first;
      if (impl.second) p += ' ' + impl.second;
    }
    return p;
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

    var hasTwoGroup = profile.some(function (pt) { return pt.type === 'twoGroup'; });

    if (hasTwoGroup) {
      var dataSh = {};
      var dataT = {};
      sorted.forEach(function (t) {
        if (t.type !== 'twoGroup') return;
        var slot = getProfileTableSlot(t.tableTitle);
        if (slot >= 1 && slot <= 8) {
          var catSh = getDominantCategoriesByGroup(t.rows || [], 'heads');
          var catT = getDominantCategoriesByGroup(t.rows || [], 'teachers');
          if (catSh.length) dataSh[slot] = catSh[0];
          if (catT.length) dataT[slot] = catT[0];
        }
      });
      var conclusionPhrase = RESPONDENT_CONCLUSION_PHRASES[vi % RESPONDENT_CONCLUSION_PHRASES.length];
      var opener = Gen ? Gen.getOpenerForVariant(vi, lastOpener) : getVariedOpener();
      var pSh = buildProfileParagraphFromSlots(dataSh, 'School head', opener, includeImplication);
      var opener2 = Gen ? Gen.getOpenerForVariant(vi + 1, '') : getVariedOpener();
      var pT = buildProfileParagraphFromSlots(dataT, 'Teacher', opener2, includeImplication);
      var result = [];
      if (pSh) result.push(pSh);
      if (pT) result.push(pT);
      return result.join('\n\n');
    }

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
    if (themeLower.indexOf('challenge') !== -1 || themeLower.indexOf('challenges') !== -1) {
      signifies = 'respondents view the challenges encountered as ' + desc + '.';
    } else if (themeLower.indexOf('constraint') !== -1 || themeLower.indexOf('constraints') !== -1) {
      signifies = 'respondents view the constraints experienced as ' + desc + '.';
    } else if (themeLower.indexOf('effect') !== -1) {
      signifies = 'respondents view the effect as ' + desc + '.';
    } else if (themeLower.indexOf('abilit') !== -1 || themeLower.indexOf('manifest') !== -1) {
      signifies = 'respondents perceive the assessed construct as strongly evident, described as ' + desc + '.';
    }
    return 'The average weighted mean, described as ' + desc + ', implies that ' + signifies;
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

    // --- Profile Tables: one combined paragraph per respondent group ---
    var hasTwoGroupProfile = profile.some(function (pt) { return pt.type === 'twoGroup'; });
    var sortedProfile = profile.slice().sort(function (a, b) {
      return getProfileTableSlot(a.tableTitle) - getProfileTableSlot(b.tableTitle);
    });

    if (hasTwoGroupProfile) {
      var dataSh = {};
      var dataT = {};
      sortedProfile.forEach(function (pt) {
        if (pt.type !== 'twoGroup') return;
        var slot = getProfileTableSlot(pt.tableTitle);
        if (slot >= 1 && slot <= 8) {
          var catSh = getDominantCategoriesByGroup(pt.rows || [], 'heads');
          var catT = getDominantCategoriesByGroup(pt.rows || [], 'teachers');
          if (catSh.length) dataSh[slot] = catSh[0];
          if (catT.length) dataT[slot] = catT[0];
        }
      });
      if (Object.keys(dataSh).length > 0 || Object.keys(dataT).length > 0) {
        var openingSh = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : getNextOpening();
        openerIdx++;
        var openingT = Gen ? Gen.getOpenerForVariant(vi + openerIdx, '') : getNextOpening();
        openerIdx++;
        var pSh = buildProfileParagraphFromSlots(dataSh, 'School head', openingSh, includeImplication);
        var pT = buildProfileParagraphFromSlots(dataT, 'Teacher', openingT, includeImplication);
        if (pSh) paragraphs.push(pSh);
        if (pT) paragraphs.push(pT);
      }
    } else {
      var data = {};
      sortedProfile.forEach(function (pt) {
        var slot = getProfileTableSlot(pt.tableTitle);
        if (slot >= 1 && slot <= 8) {
          var cat = getDominantCategory(pt.rows, 'singleGroup');
          if (cat) data[slot] = cat;
        }
      });
      if (Object.keys(data).length > 0) {
        var opening = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : getNextOpening();
        openerIdx++;
        var p = buildProfileParagraphFromSlots(data, '', opening, includeImplication);
        if (p) paragraphs.push(p);
      }
    }

    // --- Likert Tables ---
    likert.forEach(function (t) {
      var isTwoGroup = t.type === 'twoGroup';
      var isTTest = t.type === 'tTest';
      var theme = (t.tableTitle || 'the theme').toLowerCase();
      var opening = Gen ? Gen.getOpenerForVariant(vi + openerIdx, openerIdx === 0 ? lastOpener : '') : getNextOpening();
      openerIdx++;

      if (isTTest) {
        var tTestP = buildTTestFinding(t.rows || [], t.tableTitle, opening, includeImplication);
        if (tTestP) paragraphs.push(tTestP);
        return;
      }

      if (isTwoGroup && t.rows) {
        var execSummary = isExecutiveSummary(t.tableTitle);
        var groups = getIndicatorsByTopQdForTwoGroup(t.rows, includeNextGroup);

        if (execSummary) {
          var shAwm = t.awm && t.awm.sh ? t.awm.sh : {};
          var tAwm = t.awm && t.awm.t ? t.awm.t : {};
          var shDesc = (shAwm.qd || '').trim();
          var tDesc = (tAwm.qd || '').trim();
          var shByQd = {};
          var tByQd = {};
          (t.rows || []).forEach(function (r) {
            var shQd = (r.sh && r.sh.qd) || '';
            var tQd = (r.t && r.t.qd) || '';
            if (shQd) {
              if (!shByQd[shQd]) shByQd[shQd] = [];
              shByQd[shQd].push({ indicator: r.indicator, wm: r.sh && r.sh.wm != null ? r.sh.wm : 0 });
            }
            if (tQd) {
              if (!tByQd[tQd]) tByQd[tQd] = [];
              tByQd[tQd].push({ indicator: r.indicator, wm: r.t && r.t.wm != null ? r.t.wm : 0 });
            }
          });
          var sortByWm = function (a, b) { return b.wm - a.wm; };
          var formatDomainList = function (byQd) {
            var keys = Object.keys(byQd);
            if (keys.length === 0) return '';
            keys.forEach(function (k) { byQd[k].sort(sortByWm); });
            var ordered = keys.slice().sort(function (a, b) {
              var maxA = Math.max.apply(null, byQd[a].map(function (d) { return d.wm; }));
              var maxB = Math.max.apply(null, byQd[b].map(function (d) { return d.wm; }));
              return maxB - maxA;
            });
            var parts = [];
            ordered.forEach(function (qd) {
              var domains = byQd[qd].map(function (d) { return '"' + d.indicator + '"'; });
              if (domains.length) parts.push(domains.join(', ') + ' are rated ' + qd);
            });
            return parts.join(', while ');
          };
          var shDomainText = formatDomainList(shByQd);
          var tDomainText = formatDomainList(tByQd);
          var pSh = opening + theme + ', school head respondents show that ' + (shDomainText || 'the domains reflect the overall assessment') + '. ';
          pSh += 'With an overall average weighted mean described as ' + (shDesc || '—') + ', the findings indicate that school heads perceive the assessed construct as strongly evident across domains.';
          if (includeImplication) {
            var impl = Utils ? Utils.buildImplications('executive') : { first: '', second: '' };
            if (impl.first) pSh += ' ' + impl.first;
          }
          paragraphs.push(pSh);
          openerIdx++;
          var openingT2 = Gen ? Gen.getOpenerForVariant(vi + openerIdx, '') : getNextOpening();
          var pT = openingT2 + theme + ', teacher respondents show that ' + (tDomainText || 'the domains reflect the overall assessment') + '. ';
          pT += 'With an overall average weighted mean described as ' + (tDesc || '—') + ', the findings indicate that teachers perceive the assessed construct across the measured domains.';
          if (includeImplication) {
            var impl2 = Utils ? Utils.buildImplications('executive') : { first: '', second: '' };
            if (impl2.second) pT += ' ' + impl2.second;
          }
          paragraphs.push(pT);
        } else {
          var shIndicators = groups.sh.map(function (i) { return '"' + i.indicator + '"'; });
          var tIndicators = groups.t.map(function (i) { return '"' + i.indicator + '"'; });
          var shQd = groups.sh.length ? groups.sh[0].qd : (t.awm && t.awm.sh ? t.awm.sh.qd : '');
          var tQd = groups.t.length ? groups.t[0].qd : (t.awm && t.awm.t ? t.awm.t.qd : '');
          var shAwmVal = t.awm && t.awm.sh && t.awm.sh.value != null ? t.awm.sh.value : 0;
          var tAwmVal = t.awm && t.awm.t && t.awm.t.value != null ? t.awm.t.value : 0;
          if (shIndicators.length > 0) {
            var pSh = opening + theme + ', school head respondents rated the following indicators as ' + shQd + ': ' + shIndicators.join(', ') + '. ';
            pSh += buildAwmSentence(shAwmVal, shQd, t.tableTitle);
            if (includeImplication) {
              var impl = Utils ? Utils.buildImplications('likert') : { first: '', second: '' };
              if (impl.first) pSh += ' ' + impl.first;
            }
            paragraphs.push(pSh);
            openerIdx++;
          }
          if (tIndicators.length > 0) {
            var openingT2 = Gen ? Gen.getOpenerForVariant(vi + openerIdx, '') : getNextOpening();
            var pT = openingT2 + theme + ', teacher respondents rated the following indicators as ' + tQd + ': ' + tIndicators.join(', ') + '. ';
            pT += buildAwmSentence(tAwmVal, tQd, t.tableTitle);
            if (includeImplication) {
              var impl2 = Utils ? Utils.buildImplications('likert') : { first: '', second: '' };
              if (impl2.second) pT += ' ' + impl2.second;
            }
            paragraphs.push(pT);
          }
          if (shIndicators.length === 0 && tIndicators.length === 0 && (t.awm && (t.awm.sh || t.awm.t))) {
            var awmParts = [];
            if (t.awm.sh) awmParts.push('school heads: ' + (t.awm.sh.qd || '—'));
            if (t.awm.t) awmParts.push('teachers: ' + (t.awm.t.qd || '—'));
            var p = opening + theme + ', the overall assessment shows ' + awmParts.join('; ') + '.';
            if (includeImplication) {
              var impl = Utils ? Utils.buildImplications('likert') : { first: '', second: '' };
              if (impl.first) p += ' ' + impl.first;
            }
            paragraphs.push(p);
          }
        }
        return;
      }

      var indicators = t.indicators || [];
      var topGroup = getTopQualGroupIndicators(indicators, includeNextGroup);
      if (topGroup.length > 0) {
        var labels = topGroup.map(function (i) { return '"' + (i.indicator || i) + '"'; });
        var qd = topGroup[0].qualitativeDescription || topGroup[0].qd || t.awmDesc || '';
        var p = opening + theme + ', respondents rated the following indicators as ' + qd + ': ' + labels.join(', ') + '. ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        if (includeImplication) {
          var impl = Utils ? Utils.buildImplications('likert') : { first: '', second: '' };
          if (impl.first) p += ' ' + impl.first;
          if (impl.second) p += ' ' + impl.second;
        }
        paragraphs.push(p);
      } else {
        var p = opening + theme + ', ';
        p += buildAwmSentence(t.awm, t.awmDesc, t.tableTitle);
        if (includeImplication) {
          var impl = Utils ? Utils.buildImplications('likert') : { first: '', second: '' };
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
  /** Detect themes from findings and conclusions text for recommendation mapping. */
  function detectThemesFromFindingsAndConclusions(findingsText, conclusionsText) {
    var combined = ((findingsText || '') + ' ' + (conclusionsText || '')).toLowerCase();
    var themes = {
      abilities: /abilit(y|ies)|curiosity|creativity|communication|collaboration|manifested|pupils? (demonstrate|perceive)/i.test(combined),
      constraints: /constraint|difficult|struggle|moderately serious|slightly serious|resource|readiness|comprehension|support from the learning environment/i.test(combined),
      challenges: /challenge|instructional|teachers? (encounter|experience)/i.test(combined),
      instructional: /inquiry|instruction|instructional|hands-on|cooperative|strateg(y|ies)|teaching|science (learning|teaching)/i.test(combined),
      resources: /resource|material|equipment|professional development|training/i.test(combined),
      administration: /school head|administrator|supervisor|perception|significant difference|t-test|two groups/i.test(combined),
      profile: /respondent|demographic|age|gender|civil status|educational attainment|position|years in service/i.test(combined),
      parents: /support from|family|parent|learning environment|home/i.test(combined)
    };
    return themes;
  }

  /** Build recommendations from detected themes; each addresses a finding/conclusion and targets a stakeholder. */
  function buildRecommendationsFromThemes(themes, profile, likert) {
    var recs = [];

    if (themes.abilities) {
      recs.push({ stakeholder: 'teachers', text: 'Teachers may continue to implement inquiry-based instructional strategies that strengthen pupils\' curiosity, creativity, communication, and collaboration in Science learning.' });
    }
    if (themes.constraints) {
      recs.push({ stakeholder: 'schools', text: 'Schools may strengthen collaborative learning environments that encourage active participation and teamwork among pupils during science investigations, and address constraints identified in the study.' });
      recs.push({ stakeholder: 'school administrators', text: 'School administrators may provide additional instructional resources and professional development opportunities to support teachers in implementing inquiry-based science activities and addressing learner constraints.' });
    }
    if (themes.challenges) {
      recs.push({ stakeholder: 'teachers', text: 'Teachers may seek professional development and peer support to address the instructional challenges identified in the study, such as motivating unengaged learners and implementing hands-on or experimental tasks effectively.' });
    }
    if (themes.instructional && !themes.abilities) {
      recs.push({ stakeholder: 'teachers', text: 'Teachers may continue to implement and refine instructional strategies that support Science learning, in line with the findings of the study.' });
    }
    if (themes.resources && !themes.constraints) {
      recs.push({ stakeholder: 'school administrators', text: 'School administrators may ensure adequate allocation of instructional materials and equipment to support Science teaching and learning.' });
    }
    if (themes.administration) {
      recs.push({ stakeholder: 'school administrators', text: 'School administrators may strengthen collaborative dialogue between school heads and teachers to align perceptions and support consistent implementation of Science instruction.' });
    }
    if (themes.profile) {
      recs.push({ stakeholder: 'schools', text: 'Schools may design programs and policies that accommodate the demographic and professional profile of the respondents reflected in the study.' });
    }
    if (themes.parents) {
      recs.push({ stakeholder: 'parents', text: 'Parents may be encouraged to support science learning at home and to engage with the school on ways to reinforce curiosity and inquiry outside the classroom.' });
    }

    recs.push({ stakeholder: 'future researchers', text: 'Future researchers may conduct similar studies using larger or different populations to further validate the findings of the present study.' });

    return recs;
  }

  function generateRecommendations() {
    var findingsEl = document.getElementById('sg-findings-output');
    var conclusionsEl = document.getElementById('sg-conclusions-output');
    var findingsSummary = findingsEl && findingsEl.value ? findingsEl.value.trim() : '';
    var conclusionsSummary = conclusionsEl && conclusionsEl.value ? conclusionsEl.value.trim() : '';

    var profile = getProfileTables();
    var likert = getLikertTables();

    if (profile.length === 0 && likert.length === 0 && !findingsSummary && !conclusionsSummary) {
      showToast('Generate findings and conclusions first, or save tables from analyzers.', true);
      return '';
    }

    var themes = detectThemesFromFindingsAndConclusions(findingsSummary, conclusionsSummary);

    if (!themes.abilities && !themes.constraints && !themes.challenges && !themes.instructional && !themes.resources && !themes.administration && !themes.profile) {
      themes = {
        abilities: likert.some(function (t) { return (t.tableTitle || '').toLowerCase().indexOf('abilit') !== -1 || (t.tableTitle || '').toLowerCase().indexOf('manifest') !== -1; }),
        constraints: likert.some(function (t) { return (t.tableTitle || '').toLowerCase().indexOf('constraint') !== -1; }),
        challenges: likert.some(function (t) { return (t.tableTitle || '').toLowerCase().indexOf('challenge') !== -1; }),
        instructional: likert.length > 0,
        resources: true,
        administration: likert.some(function (t) { return t.type === 'twoGroup' || t.type === 'tTest'; }),
        profile: profile.length > 0
      };
    }

    var recList = buildRecommendationsFromThemes(themes, profile, likert);

    var intro = 'Based on the foregoing findings and conclusions of the study, the following are recommended for implementation:';
    var numbered = [];
    recList.forEach(function (r, i) {
      numbered.push((i + 1) + '. ' + r.text);
    });

    return intro + '\n\n' + numbered.join('\n');
  }

  // ---------- Copy helpers ----------
  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /**
   * Copy All: all generated sections (Respondents, Findings, Conclusions, Recommendations)
   * as rich HTML for Word — section headings + paragraphs with readable spacing.
   */
  function copyAll() {
    var parts = [];
    var partsHtml = [];
    var ids = ['sg-respondents-output', 'sg-findings-output', 'sg-conclusions-output', 'sg-recommendations-output'];
    var labels = ['Summary of Respondents', 'Summary of Findings', 'Conclusions', 'Recommendations'];
    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el && el.value.trim()) {
        var text = el.value.trim();
        parts.push(labels[i] + '\n\n' + text);
        partsHtml.push('<h2 style="margin-top: 1em; margin-bottom: 0.5em;">' + escapeHtml(labels[i]) + '</h2><p style="margin: 0 0 0.75em;">' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>');
      }
    });
    if (parts.length === 0) {
      showToast('Please generate the sections first before copying.', true);
      return;
    }
    var plain = parts.join('\n\n---\n\n');
    var html = partsHtml.join('');
    copyRichToClipboard(html, plain);
  }

  function copyRichToClipboard(html, plain) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      navigator.clipboard.writeText(plain).then(function () { showToast('All sections copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
      return;
    }
    var blobHtml = new Blob([html], { type: 'text/html' });
    var blobPlain = new Blob([plain], { type: 'text/plain' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })
    ]).then(function () {
      showToast('Copied! Paste into Word to keep headings and formatting.');
    }).catch(function () {
      navigator.clipboard.writeText(plain).then(function () { showToast('All sections copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
    });
  }

  // ---------- Reset Session (clear all system keys) ----------
  function resetSession() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.generatedSummaries);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.summaryDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('profileDataSaved');
      localStorage.removeItem('likertDataSaved');
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
    refreshDataOverview(true);

    // Update when data changes in another tab (Profile/Likert Analyzer saved)
    window.addEventListener('storage', function (e) {
      if (e.key === KEYS.profileTables || e.key === KEYS.likertTables) {
        refreshDataOverview(true);
      }
    });

    // Update when user returns to this tab (in case they saved in another tab)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        refreshDataOverview(true);
      }
    });

    document.getElementById('sg-refresh-data').addEventListener('click', function () { refreshDataOverview(false); });
    var autoGenAll = document.getElementById('sg-auto-generate-all');
    if (autoGenAll) {
      autoGenAll.addEventListener('click', function () {
        var profile = getProfileTables();
        var likert = getLikertTables();
        if (profile.length === 0 && likert.length === 0) {
          showToast('No saved data. Save tables from analyzers first.', true);
          return;
        }
        var rOut = document.getElementById('sg-respondents-output');
        var fOut = document.getElementById('sg-findings-output');
        var cOut = document.getElementById('sg-conclusions-output');
        var recOut = document.getElementById('sg-recommendations-output');
        if (rOut) { rOut.value = generateRespondentsSummary(); if (rOut.value) { autoResizeTextarea(rOut); var regen = document.getElementById('sg-regenerate-respondents'); if (regen) regen.disabled = false; } }
        if (fOut) { fOut.value = generateFindings(); if (fOut.value) { autoResizeTextarea(fOut); var regenF = document.getElementById('sg-regenerate-findings'); if (regenF) regenF.disabled = false; } }
        if (cOut) { cOut.value = generateConclusions(); if (cOut.value) { autoResizeTextarea(cOut); var regenC = document.getElementById('sg-regenerate-conclusions'); if (regenC) regenC.disabled = false; } }
        if (recOut) { recOut.value = generateRecommendations(); if (recOut.value) autoResizeTextarea(recOut); }
        showToast('All sections generated.');
      });
    }
    var refreshEmpty = document.getElementById('sg-refresh-data-empty');
    if (refreshEmpty) refreshEmpty.addEventListener('click', function () { refreshDataOverview(false); });
    var clearEmpty = document.getElementById('sg-clear-summaries-empty');
    if (clearEmpty) clearEmpty.addEventListener('click', openClearModal);
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
