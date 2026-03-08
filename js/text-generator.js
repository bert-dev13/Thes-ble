/**
 * Thesis Interpretation Assistant — Text Variation Engine
 * Deterministic variation for Regenerate Interpretation.
 * - variantIndex per context (localStorage)
 * - Opener rotation (never consecutive repeat)
 * - Synonym sets and sentence patterns
 * - Duplicate prevention (last 3 outputs)
 */

(function (global) {
  'use strict';

  var OPENER_POOL = [
    'In terms of ',
    'About the ',
    'Regarding ',
    'With regard to ',
    'Considering ',
    'As to ',
    'Pertaining to ',
    'Relative to ',
    'In relation to ',
    'Based on the data presented, ',
    'From the table, ',
    'As reflected in the data, '
  ];

  var SHOWS_SYNONYMS = ['shows', 'reveals', 'indicates', 'reflects', 'demonstrates'];
  var MAJORITY_SYNONYMS = ['majority', 'largest proportion', 'greater share', 'dominant category', 'prevailing category'];
  var INDICATES_LEADS = ['This indicates that', 'This suggests that', 'This implies that'];
  var FURTHER_LEADS = ['This further implies that', 'This further suggests that', 'This further indicates that'];
  var TIE_PHRASES = ['both categories', 'the categories share the same frequency', 'the categories are tied'];
  var HAD_VERBS = ['had', 'recorded', 'showed', 'accounted for'];
  var CONTRIBUTED_PHRASES = ['was contributed by', 'was accounted for by', 'came from'];
  var ASSESSED_AS = ['assessed as', 'described as', 'rated as'];
  var INCLUDE_VERBS = ['include', 'comprise', 'consist of'];
  var SIGNIFIES_VERBS = ['signifies', 'indicates', 'reflects', 'reveals'];

  var STORAGE_PREFIX = 'thesisVariant_';
  var LAST_OPENER_PREFIX = 'thesisLastOpener_';
  var RECENT_OUTPUTS_PREFIX = 'thesisRecent_';
  var MAX_RECENT = 3;
  var MAX_RETRIES = 5;

  function getStorageKey(context, tableId) {
    var id = (tableId || '').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    return STORAGE_PREFIX + context + (id ? '_' + id : '');
  }

  function getVariantIndex(context, tableId) {
    try {
      var key = getStorageKey(context, tableId);
      var raw = localStorage.getItem(key);
      return raw !== null ? parseInt(raw, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function incrementVariantIndex(context, tableId) {
    try {
      var key = getStorageKey(context, tableId);
      var next = getVariantIndex(context, tableId) + 1;
      localStorage.setItem(key, String(next));
      return next;
    } catch (e) {
      return 0;
    }
  }

  function getOpenerForVariant(variantIndex, lastOpener) {
    var idx = Math.abs(variantIndex) % OPENER_POOL.length;
    var chosen = OPENER_POOL[idx];
    if (lastOpener && OPENER_POOL.indexOf(lastOpener) >= 0 && OPENER_POOL.length > 1) {
      var others = OPENER_POOL.filter(function (p) { return p !== lastOpener; });
      chosen = others[Math.abs(variantIndex) % others.length];
    }
    return chosen;
  }

  function getLastOpener(context, tableId) {
    try {
      var key = LAST_OPENER_PREFIX + (context || '') + '_' + (tableId || '');
      return localStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function setLastOpener(context, tableId, opener) {
    try {
      var key = LAST_OPENER_PREFIX + (context || '') + '_' + (tableId || '');
      localStorage.setItem(key, opener || '');
    } catch (e) {}
  }

  function pickFrom(arr, variantIndex) {
    if (!arr || !arr.length) return '';
    return arr[Math.abs(variantIndex) % arr.length];
  }

  function getSynonym(key, variantIndex) {
    var map = {
      shows: SHOWS_SYNONYMS,
      majority: MAJORITY_SYNONYMS,
      indicatesLead: INDICATES_LEADS,
      furtherLead: FURTHER_LEADS,
      tiePhrase: TIE_PHRASES,
      hadVerb: HAD_VERBS,
      contributed: CONTRIBUTED_PHRASES,
      assessedAs: ASSESSED_AS,
      includeVerb: INCLUDE_VERBS,
      signifies: SIGNIFIES_VERBS
    };
    var arr = map[key];
    return arr ? pickFrom(arr, variantIndex) : '';
  }

  function getRecentOutputs(context, tableId) {
    try {
      var key = RECENT_OUTPUTS_PREFIX + (context || '') + '_' + (tableId || '');
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function addRecentOutput(context, tableId, text) {
    if (!text || !text.trim()) return;
    try {
      var key = RECENT_OUTPUTS_PREFIX + (context || '') + '_' + (tableId || '');
      var recent = getRecentOutputs(context, tableId);
      recent.unshift(text.trim());
      recent = recent.slice(0, MAX_RECENT);
      localStorage.setItem(key, JSON.stringify(recent));
    } catch (e) {}
  }

  function isDuplicate(context, tableId, text) {
    var recent = getRecentOutputs(context, tableId);
    var t = (text || '').trim();
    return recent.some(function (r) { return r === t; });
  }

  /**
   * Build implication pair with variation.
   */
  function buildImplicationsWithVariant(context, variantIndex) {
    var base = {
      profile: {
        first: 'the respondent sample is characterized by a concentration in these categories.',
        second: 'the demographic profile reflects the composition of the study population.'
      },
      likert: {
        first: 'respondents consistently rate the indicators within the dominant qualitative description as evident in practice.',
        second: 'the assessed construct is strongly reflected across the measured indicators based on the overall evaluation.'
      },
      executive: {
        first: 'the leading domain or factor contributes most to the overall assessment.',
        second: 'the summary reflects the aggregate perception across the measured dimensions.'
      },
      ttest: {
        first: 'the statistical result informs the interpretation of group comparisons.',
        second: 'the findings should be considered in light of the test outcome.'
      },
      findings: {
        first: 'the data support the reported pattern or assessment.',
        second: 'the findings align with the overall theme of the study.'
      },
      conclusions: {
        first: 'the conclusions drawn are supported by the data presented.',
        second: 'the study findings provide a coherent basis for the stated conclusions.'
      }
    };
    var b = base[context] || base.findings;
    var lead1 = getSynonym('indicatesLead', variantIndex);
    var lead2 = getSynonym('furtherLead', variantIndex + 1);
    return {
      first: (lead1 || 'This indicates that') + ' ' + b.first,
      second: (lead2 || 'This further implies that') + ' ' + b.second
    };
  }

  /**
   * Run generator with duplicate check. Retries up to MAX_RETRIES if output matches recent.
   * @param {Function} generator - function(variantIndex) returns string
   * @param {string} context
   * @param {string} tableId
   * @returns {{ text: string, variantIndex: number }}
   */
  function generateWithVariation(generator, context, tableId) {
    var variantIndex = incrementVariantIndex(context, tableId);
    var lastOpener = getLastOpener(context, tableId);
    var recent = getRecentOutputs(context, tableId);
    var text = '';
    var attempts = 0;

    while (attempts < MAX_RETRIES) {
      text = generator(variantIndex + attempts, lastOpener);
      if (!text || !text.trim()) break;
      if (!recent.some(function (r) { return r === text.trim(); })) break;
      attempts++;
    }

    addRecentOutput(context, tableId, text);
    var opener = extractFirstOpener(text);
    if (opener) setLastOpener(context, tableId, opener);

    return { text: text.trim(), variantIndex: variantIndex };
  }

  function extractFirstOpener(text) {
    if (!text) return '';
    for (var i = 0; i < OPENER_POOL.length; i++) {
      if (text.indexOf(OPENER_POOL[i]) === 0) return OPENER_POOL[i];
    }
    return '';
  }

  /** RP2 prewritten opener equivalents — same meaning, different phrasing */
  var RP2_SH_OPENER_POOL = [
    'Regarding the ',
    'About the ',
    'In terms of the ',
    'With regard to the ',
    'Considering the ',
    'As to the ',
    'Relative to the ',
    'Pertaining to the ',
    'In relation to the ',
    'Concerning the ',
    'With respect to the '
  ];

  /** Patterns that start prewritten sh (before "level of abilities" or "extent of constraints") */
  var RP2_OPENER_PATTERNS = [
    'Regarding the ', 'About the ', 'In terms of the ', 'With regard to the ',
    'Considering the ', 'As to the ', 'Relative to the ', 'Pertaining to the ',
    'In relation to the ', 'Concerning the ', 'With respect to the '
  ];

  var MEANWHILE_SYNONYMS = ['Meanwhile', 'Similarly', 'Likewise', 'In parallel', 'Correspondingly', 'For their part', 'In turn'];

  var DENOTES_VERBS = ['indicates', 'suggests', 'implies', 'denotes', 'reflects', 'shows'];

  /**
   * Apply full-text variation to RP2 prewritten (sh + t).
   * Varies: opener of sh, "Meanwhile" in t, and AWM verbs (indicates/denotes).
   */
  function applyRp2PrewrittenVariation(sh, t, variantIndex) {
    if (!sh || !sh.trim()) return (t || '').trim();
    var vi = Math.abs(variantIndex || 0);
    var shText = sh.trim();
    var tText = (t || '').trim();

    /* 1. Vary the opener of the school heads section */
    var shRest = shText;
    var matchedOpener = '';
    for (var i = 0; i < RP2_OPENER_PATTERNS.length; i++) {
      var p = RP2_OPENER_PATTERNS[i];
      if (shText.indexOf(p) === 0) {
        matchedOpener = p;
        shRest = shText.slice(p.length);
        break;
      }
    }
    if (matchedOpener) {
      var newOpener = RP2_SH_OPENER_POOL[vi % RP2_SH_OPENER_POOL.length];
      shText = newOpener + shRest;
    }

    /* 2. Vary "Meanwhile" in the teachers section */
    if (tText.indexOf('Meanwhile, ') === 0) {
      var transition = pickFrom(MEANWHILE_SYNONYMS, vi);
      tText = transition + ', ' + tText.slice(11);
    } else if (tText.indexOf('Meanwhile ') === 0) {
      var transition = pickFrom(MEANWHILE_SYNONYMS, vi);
      tText = transition + ' ' + tText.slice(10);
    }

    /* 3. Vary "indicates" / "denotes" / "described as" in both sections */
    var verbs = DENOTES_VERBS;
    var verbIndex = vi % verbs.length;
    shText = shText.replace(/\bindicates that\b/gi, verbs[verbIndex] + ' that');
    tText = tText.replace(/\bindicates that\b/gi, verbs[verbIndex] + ' that');
    shText = shText.replace(/\bdenotes that\b/gi, verbs[(verbIndex + 1) % verbs.length] + ' that');
    tText = tText.replace(/\bdenotes that\b/gi, verbs[(verbIndex + 1) % verbs.length] + ' that');
    var descVariants = ['described as', 'interpreted as', 'rated as'];
    var descChoice = descVariants[vi % descVariants.length];
    shText = shText.replace(/\b(described as|interpreted as|rated as)\b/gi, descChoice);
    tText = tText.replace(/\b(described as|interpreted as|rated as)\b/gi, descChoice);

    return (shText + ' ' + tText).trim();
  }

  /**
   * Detect table type from table structure (columns/rows).
   * Use this to automatically choose the correct interpretation format.
   * @param {Object} tableData - Table config or data with rows
   * @param {'profile'|'likert'} analyzerContext - Which analyzer the data comes from
   * @returns {'single-profile'|'two-group-profile'|'single-likert'|'two-group-likert'|'ttest'}
   */
  function detectTableType(tableData, analyzerContext) {
    if (!tableData) return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';
    var rows = tableData.rows || tableData.indicators || [];
    if (!rows.length) return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';

    var first = rows[0];
    if (!first || typeof first !== 'object') return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';

    if (analyzerContext === 'profile') {
      if (first.heads && first.teachers) return 'two-group-profile';
      if (first.frequency != null || first.f != null) return 'single-profile';
      return 'single-profile';
    }

    if (analyzerContext === 'likert') {
      if (tableData.type === 'tTest') return 'ttest';
      if (first.tValue != null || first.tCritical != null || first.pValue != null ||
          (typeof first.tValue === 'string' && first.tValue.trim() !== '') ||
          (typeof first.tCritical === 'string' && first.tCritical.trim() !== '')) return 'ttest';
      if (first.sh && first.t) return 'two-group-likert';
      if (first.weightedMean != null || first.wm != null || (first.indicator && (first.qualitativeDescription != null || first.qd != null))) return 'single-likert';
      return 'single-likert';
    }

    return 'single-likert';
  }

  /** Transition phrases for second paragraph of two-group tables */
  var TRANSITION_PHRASES = ['Meanwhile', 'On the other hand', 'Similarly', 'In contrast'];

  function getTransitionForVariant(variantIndex) {
    return TRANSITION_PHRASES[Math.abs(variantIndex || 0) % TRANSITION_PHRASES.length];
  }

  global.ThesisTextGenerator = {
    detectTableType: detectTableType,
    getTransitionForVariant: getTransitionForVariant,
    TRANSITION_PHRASES: TRANSITION_PHRASES,
    getVariantIndex: getVariantIndex,
    incrementVariantIndex: incrementVariantIndex,
    getOpenerForVariant: getOpenerForVariant,
    getLastOpener: getLastOpener,
    setLastOpener: setLastOpener,
    getSynonym: getSynonym,
    pickFrom: pickFrom,
    buildImplicationsWithVariant: buildImplicationsWithVariant,
    generateWithVariation: generateWithVariation,
    applyRp2PrewrittenVariation: applyRp2PrewrittenVariation,
    isDuplicate: isDuplicate,
    getRecentOutputs: getRecentOutputs,
    OPENER_POOL: OPENER_POOL,
    MAX_RECENT: MAX_RECENT,
    MAX_RETRIES: MAX_RETRIES
  };
})(typeof window !== 'undefined' ? window : this);
