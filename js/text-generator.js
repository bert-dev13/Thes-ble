/**
 * Thesis Interpretation Assistant — Text Variation Engine
 * Deterministic variation for Regenerate Interpretation.
 * - variantIndex per context (localStorage)
 * - 20 variations per context before repeat
 * - Synonym sets and sentence patterns
 * - Duplicate prevention (last 20 outputs)
 */

(function (global) {
  'use strict';

  var NUM_VARIATIONS = 20;

  /** Opening phrases for first paragraphs (20 variants). */
  var OPENER_POOL = [
    'In terms of ', 'Regarding ', 'Considering ', 'Across ', 'Concerning ',
    'Relative to ', 'Pertaining to ', 'With reference to ', 'In relation to ', 'As to ',
    'With respect to ', 'With regard to ', 'In connection with ', 'In the context of ',
    'Focusing on ', 'With attention to ', 'In view of ', 'In light of ',
    'As regards ', 'Touching on '
  ];

  var SHOWS_SYNONYMS = ['shows', 'reveals', 'indicates', 'reflects', 'demonstrates', 'displays', 'illustrates', 'evidences', 'points to', 'suggests', 'manifests', 'expresses', 'conveys', 'exhibits', 'unveils', 'highlights', 'underscores', 'attests to', 'corroborates', 'substantiates'];
  var MAJORITY_SYNONYMS = ['majority', 'largest proportion', 'greater share', 'dominant category', 'prevailing category', 'leading segment', 'primary group', 'main body', 'bulk of respondents', 'preponderance', 'predominant share', 'foremost category', 'chief proportion', 'principal segment', 'core group', 'central category', 'key demographic', 'main contingent', 'primary contingent', 'dominant share'];
  var INDICATES_LEADS = ['This indicates that', 'This suggests that', 'This implies that', 'This demonstrates that', 'This reveals that', 'This reflects that', 'This points to the fact that', 'This conveys that', 'This attests to the fact that', 'This underscores that', 'This illustrates that', 'This evidences that', 'This manifests that', 'This shows that', 'This highlights that', 'This corroborates that', 'This substantiates that', 'This supports that', 'This confirms that', 'This establishes that'];
  var FURTHER_LEADS = ['This further implies that', 'This further suggests that', 'This further indicates that', 'This further demonstrates that', 'This further reveals that', 'This further reflects that', 'This additionally suggests that', 'This moreover implies that', 'This likewise indicates that', 'This correspondingly suggests that', 'This in turn implies that', 'This consequently indicates that', 'This thus suggests that', 'This accordingly implies that', 'This therefore indicates that', 'This hence suggests that', 'This thereby implies that', 'This subsequently indicates that', 'This then suggests that', 'This further conveys that'];
  var TIE_PHRASES = ['both categories', 'the categories share the same frequency', 'the categories are tied', 'the two categories are equal', 'an equal distribution between categories', 'a tie between the categories', 'the categories rank equally', 'the categories show identical frequencies', 'the categories are equivalent', 'the categories share identical rankings', 'the categories are evenly matched', 'the categories have equal standing', 'the categories are on par', 'the categories exhibit parity', 'the categories demonstrate equivalence', 'the categories have matching frequencies', 'the categories are deadlocked', 'the categories reflect equal representation', 'the categories are comparable', 'the categories hold equal positions'];
  var HAD_VERBS = ['had', 'recorded', 'showed', 'accounted for', 'displayed', 'registered', 'exhibited', 'attained', 'reported', 'presented', 'manifested', 'demonstrated', 'reflected', 'represented', 'indicated', 'revealed', 'achieved', 'attained', 'posted', 'documented'];
  var CONTRIBUTED_PHRASES = ['was contributed by', 'was accounted for by', 'came from', 'stemmed from', 'originated from', 'was attributable to', 'resulted from', 'was derived from', 'arose from', 'flowed from', 'emanated from', 'proceeded from', 'was driven by', 'was influenced by', 'was linked to', 'was associated with', 'was tied to', 'was credited to', 'was traced to', 'was sourced from'];
  var ASSESSED_AS = ['assessed as', 'described as', 'rated as', 'evaluated as', 'characterized as', 'perceived as', 'viewed as', 'interpreted as', 'designated as', 'classified as', 'regarded as', 'judged as', 'considered as', 'deemed as', 'labeled as', 'termed as', 'identified as', 'recognized as', 'acknowledged as', 'categorized as'];
  var INCLUDE_VERBS = ['include', 'comprise', 'consist of', 'encompass', 'incorporate', 'contain', 'embrace', 'enfold', 'take in', 'cover', 'span', 'embody', 'involve', 'entail', 'feature', 'comprehend', 'constitute', 'make up', 'aggregate', 'aggregate'];
  var SIGNIFIES_VERBS = ['signifies', 'indicates', 'reflects', 'reveals', 'demonstrates', 'denotes', 'conveys', 'suggests', 'implies', 'points to', 'evidences', 'attests to', 'manifests', 'illustrates', 'underscores', 'highlights', 'corroborates', 'substantiates', 'reinforces', 'validates'];

  var STORAGE_PREFIX = 'thesisVariant_';
  var LAST_OPENER_PREFIX = 'thesisLastOpener_';
  var RECENT_OUTPUTS_PREFIX = 'thesisRecent_';
  var MAX_RECENT = NUM_VARIATIONS;
  var MAX_RETRIES = NUM_VARIATIONS * 2;

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
    var slot = Math.abs(variantIndex) % NUM_VARIATIONS;
    var idx = slot % OPENER_POOL.length;
    var chosen = OPENER_POOL[idx];
    if (lastOpener && OPENER_POOL.indexOf(lastOpener) >= 0 && OPENER_POOL.length > 1) {
      var others = OPENER_POOL.filter(function (p) { return p !== lastOpener; });
      chosen = others[slot % others.length];
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
    var slot = Math.abs(variantIndex) % NUM_VARIATIONS;
    return arr[slot % arr.length];
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

  /** RP2 prewritten opener equivalents — 20 options for Likert interpretation. */
  var RP2_SH_OPENER_POOL = [
    'Relative to the ', 'In terms of the ', 'With reference to the ', 'Considering the ',
    'Regarding the ', 'Pertaining to the ', 'Concerning the ', 'As to the ',
    'In relation to the ', 'From the data presented on the ', 'With respect to the ',
    'With regard to the ', 'In connection with the ', 'In the context of the ',
    'Focusing on the ', 'With attention to the ', 'In view of the ', 'In light of the ',
    'As regards the ', 'Touching on the '
  ];

  /** Patterns that start prewritten sh (before "level of abilities" or "extent of constraints") */
  var RP2_OPENER_PATTERNS = RP2_SH_OPENER_POOL.slice();

  var MEANWHILE_SYNONYMS = [
    'Meanwhile', 'On the other hand', 'Similarly', 'In contrast', 'By comparison',
    'Correspondingly', 'Likewise', 'Conversely', 'Alternatively', 'Additionally',
    'Furthermore', 'Moreover', 'In parallel', 'In tandem', 'By the same token',
    'In like manner', 'Equally', 'Concurrently', 'In turn', 'In addition'
  ];

  var DENOTES_VERBS = [
    'indicates', 'suggests', 'implies', 'denotes', 'reflects', 'shows', 'reveals',
    'demonstrates', 'conveys', 'evidences', 'attests to', 'manifests', 'illustrates',
    'underscores', 'highlights', 'corroborates', 'substantiates', 'validates',
    'reinforces', 'confirms'
  ];

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
      var openIdx = (vi % NUM_VARIATIONS) % RP2_SH_OPENER_POOL.length;
      var newOpener = RP2_SH_OPENER_POOL[openIdx];
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
    var verbIndex = (vi % NUM_VARIATIONS) % verbs.length;
    shText = shText.replace(/\bindicates that\b/gi, verbs[verbIndex] + ' that');
    tText = tText.replace(/\bindicates that\b/gi, verbs[verbIndex] + ' that');
    shText = shText.replace(/\bdenotes that\b/gi, verbs[(verbIndex + 1) % verbs.length] + ' that');
    tText = tText.replace(/\bdenotes that\b/gi, verbs[(verbIndex + 1) % verbs.length] + ' that');
    var descVariants = ['described as', 'interpreted as', 'rated as', 'assessed as', 'evaluated as', 'characterized as', 'perceived as', 'viewed as', 'designated as', 'regarded as', 'judged as', 'considered as', 'deemed as', 'labeled as', 'termed as', 'identified as', 'recognized as', 'acknowledged as', 'categorized as', 'classified as'];
    var descChoice = descVariants[(vi % NUM_VARIATIONS) % descVariants.length];
    shText = shText.replace(/\b(described as|interpreted as|rated as)\b/gi, descChoice);
    tText = tText.replace(/\b(described as|interpreted as|rated as)\b/gi, descChoice);

    return (shText + ' ' + tText).trim();
  }

  /**
   * Detect table type from table structure (columns/rows).
   * Use this to automatically choose the correct interpretation format.
   * @param {Object} tableData - Table config or data with rows
   * @param {'profile'|'likert'} [analyzerContext] - Which analyzer the data comes from (optional; infers from structure if omitted)
   * @returns {'single-profile'|'two-group-profile'|'single-likert'|'two-group-likert'|'ttest'}
   */
  function detectTableType(tableData, analyzerContext) {
    if (!tableData) return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';
    var rows = tableData.rows || tableData.indicators || [];
    if (!rows.length) return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';

    var first = rows[0];
    if (!first || typeof first !== 'object') return analyzerContext === 'profile' ? 'single-profile' : 'single-likert';

    // T-test: check for statistical comparison fields (highest priority)
    var hasTTestFields = function (r) {
      var tVal = r.tValue != null ? String(r.tValue).trim() : '';
      var tCrit = r.tCritical != null ? String(r.tCritical).trim() : '';
      var pVal = r.pValue != null ? String(r.pValue).trim() : '';
      var dec = r.decision != null ? String(r.decision).trim() : '';
      var desc = r.description != null ? String(r.description).trim() : '';
      return tVal !== '' || tCrit !== '' || pVal !== '' || dec !== '' || desc !== '';
    };
    if (tableData.type === 'tTest' || hasTTestFields(first)) return 'ttest';

    // Profile: rows with heads/teachers (two groups) or frequency/f
    if (first.heads && first.teachers) return 'two-group-profile';
    if (first.frequency != null || first.f != null) return 'single-profile';

    // Likert: rows with sh/t (two groups) or wm/weightedMean
    if (first.sh && first.t) return 'two-group-likert';
    if (first.weightedMean != null || first.wm != null ||
        (first.indicator && (first.qualitativeDescription != null || first.qd != null))) return 'single-likert';

    if (analyzerContext === 'profile') return 'single-profile';
    if (analyzerContext === 'likert') return 'single-likert';
    return 'single-likert';
  }

  /**
   * Generate T-test interpretation from table data.
   * Format: varied opening phrase + significant/no significant + t-value, t-critical, p-value, decision + implications.
   * @param {Object} tableData - Table with rows containing tValue, tCritical, pValue, decision, description
   * @param {Object} [options] - { tableTitle, theme, includeImplications, variantIndex }
   * @returns {string}
   */
  function generateTTestInterpretation(tableData, options) {
    if (!tableData) return '';
    var rows = tableData.rows || [];
    var row = rows[0] || rows.find(function (r) {
      var t = r.tValue != null ? String(r.tValue).trim() : '';
      return t !== '';
    });
    if (!row) return '';

    var tValStr = (row.tValue != null ? String(row.tValue) : '').trim();
    var tCritStr = (row.tCritical != null ? String(row.tCritical) : '').trim();
    var pValStr = (row.pValue != null ? String(row.pValue) : '').trim();
    var decision = (row.decision != null ? String(row.decision) : '').trim().toLowerCase();

    var themeRaw = (options && options.theme) || (options && options.tableTitle) || tableData.tableTitle || tableData.title || 'the variable';
    var UtilsTheme = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var themeLower = (UtilsTheme && UtilsTheme.formatThemeForInterpretation)
      ? UtilsTheme.formatThemeForInterpretation(themeRaw) : themeRaw.toLowerCase().replace(/^table \d+\.\s*/i, '');

    var vi = (options && typeof options.variantIndex === 'number') ? options.variantIndex : 0;
    var includeImplications = options && options.includeImplications !== false;

    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var impl = Utils && includeImplications ? Utils.buildImplications('ttest') : { first: '', second: '' };

    var tVal = parseFloat(String(tValStr).replace(/[^0-9.-]/g, ''));
    var tCrit = parseFloat(String(tCritStr).replace(/[^0-9.-]/g, ''));
    var isRejected = decision.indexOf('reject') !== -1 || decision.indexOf('significant') !== -1;
    if (!isNaN(tVal) && !isNaN(tCrit)) isRejected = Math.abs(tVal) > tCrit;

    var text;
    if (isRejected) {
      text = 'The T-test results reveal a significant difference between the perceptions of school heads and teachers regarding ' + themeLower + '.';
      text += ' The computed t-value of ' + (tValStr || '—') + (tCritStr ? ' exceeded the t-critical value of ' + tCritStr : '');
      if (pValStr) text += ', the p-value was ' + pValStr;
      text += ', and the null hypothesis was rejected.';
    } else {
      text = 'The T-test results reveal no significant difference between the perceptions of school heads and teachers regarding ' + themeLower + '.';
      text += ' The computed t-value of ' + (tValStr || '—') + (tCritStr ? ' did not exceed the t-critical value of ' + tCritStr : '');
      if (pValStr) text += ', the p-value was ' + pValStr;
      text += ', and the null hypothesis was accepted.';
    }

    if (includeImplications && impl.first) text += ' ' + impl.first;
    if (includeImplications && impl.second) text += ' ' + impl.second;

    return text.trim();
  }

  /** Transition phrases for second paragraph of two-group tables (20 variants). */
  var TRANSITION_PHRASES = MEANWHILE_SYNONYMS;

  function getTransitionForVariant(variantIndex) {
    var slot = Math.abs(variantIndex || 0) % NUM_VARIATIONS;
    return TRANSITION_PHRASES[slot % TRANSITION_PHRASES.length];
  }

  global.ThesisTextGenerator = {
    detectTableType: detectTableType,
    generateTTestInterpretation: generateTTestInterpretation,
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
    NUM_VARIATIONS: NUM_VARIATIONS,
    MAX_RECENT: MAX_RECENT,
    MAX_RETRIES: MAX_RETRIES
  };
})(typeof window !== 'undefined' ? window : this);
