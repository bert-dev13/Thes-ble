/**
 * Thesis Interpretation Assistant — Shared Interpretation Utilities
 * Used by profile.js, likert.js, summary.js for consistent academic style.
 * - getVariedOpener(): selects opening phrase from pool, avoids consecutive repeats (localStorage).
 * - buildImplications(context, includeImplications): returns two implication sentences.
 */

(function (global) {
  'use strict';

  /** Opening phrases for interpretations (formal thesis style). */
  var OPENER_POOL = [
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

  /** Transition phrases for second paragraph of two-group tables. */
  var TRANSITION_PHRASES = ['Meanwhile, ', 'On the other hand, ', 'Similarly, ', 'In contrast, '];

  var OPENER_STORAGE_KEY = 'thesisInterpretation_lastOpener';
  var OPENER_INDEX_KEY = 'thesisInterpretation_openerIndex';

  /**
   * Returns an opening phrase from the pool, avoiding consecutive repeats.
   * Stores last used opener in localStorage so navigation still avoids repetition.
   * @returns {string}
   */
  function getVariedOpener() {
    try {
      var last = localStorage.getItem(OPENER_STORAGE_KEY);
      var idxRaw = localStorage.getItem(OPENER_INDEX_KEY);
      var idx = idxRaw !== null ? parseInt(idxRaw, 10) || 0 : 0;

      var candidates = OPENER_POOL.slice();
      if (last && candidates.indexOf(last) >= 0 && candidates.length > 1) {
        candidates = candidates.filter(function (p) { return p !== last; });
      }

      var chosen = candidates[idx % candidates.length];
      var newIdx = (OPENER_POOL.indexOf(chosen) + 1) % OPENER_POOL.length;

      localStorage.setItem(OPENER_STORAGE_KEY, chosen);
      localStorage.setItem(OPENER_INDEX_KEY, String(newIdx));
      return chosen;
    } catch (e) {
      return OPENER_POOL[0];
    }
  }

  /**
   * Returns two short implication sentences based on context type.
   * @param {string} context - One of: 'profile' | 'likert' | 'executive' | 'ttest' | 'findings' | 'conclusions'
   * @returns {{ first: string, second: string }}
   */
  function buildImplications(context) {
    var templates = {
      profile: {
        first: 'This indicates that the respondent sample is characterized by a concentration in these categories.',
        second: 'This further implies that the demographic profile reflects the composition of the study population.'
      },
      likert: {
        first: 'This indicates that respondents consistently rate the indicators within the dominant qualitative description as evident in practice.',
        second: 'This further implies that the assessed construct is strongly reflected across the measured indicators based on the overall evaluation.'
      },
      executive: {
        first: 'This indicates that the leading domain or factor contributes most to the overall assessment.',
        second: 'This further implies that the summary reflects the aggregate perception across the measured dimensions.'
      },
      ttest: {
        first: 'This indicates that the statistical result informs the interpretation of group comparisons.',
        second: 'This further implies that the findings should be considered in light of the test outcome.'
      },
      findings: {
        first: 'This indicates that the data support the reported pattern or assessment.',
        second: 'This further implies that the findings align with the overall theme of the study.'
      },
      conclusions: {
        first: 'This indicates that the conclusions drawn are supported by the data presented.',
        second: 'This further implies that the study findings provide a coherent basis for the stated conclusions.'
      }
    };

    var t = templates[context] || templates.findings;
    return { first: t.first, second: t.second };
  }

  /**
   * Scale dictionary: Q.D. acronym → full text for interpretation only.
   * Tables keep acronyms (Q.D. column: VH, H, MS, etc.); interpretation paragraphs use full words.
   * Rule: Tables → acronyms. Interpretation → full words.
   * @param {string} abbr - Abbreviation (e.g. VH, H, MS, FR)
   * @returns {string} Full text (e.g. Very High, High, Moderately Serious, Fully Realized)
   */
  var QUALITATIVE_DESCRIPTION_MAP = {
    VH: 'Very High',
    H: 'High',
    FR: 'Fully Realized',
    MR: 'Moderately Realized',
    R: 'Realized',
    SR: 'Slightly Realized',
    NR: 'Not Realized',
    VE: 'Very Effective',
    E: 'Effective',
    ME: 'Moderately Effective',
    SE: 'Slightly Effective',
    NE: 'Not Effective',
    S: 'Serious',
    MS: 'Moderately Serious',
    SS: 'Slightly Serious',
    O: 'Outstanding',
    OFTEN: 'Often',
    VO: 'Very Often',
    VS: 'Very Satisfactory',
    SF: 'Satisfactory',
    MRS: 'Moderately Satisfactory',
    SSS: 'Slightly Satisfactory',
    OUTSTANDING: 'Outstanding',
    VERYHIGH: 'Very High',
    VERYEFFECTIVE: 'Very Effective',
    FULLYREALIZED: 'Fully Realized',
    MODERATELYREALIZED: 'Moderately Realized',
    MODERATELYSERIOUS: 'Moderately Serious',
    SLIGHTLYSERIOUS: 'Slightly Serious',
    VERYOFTEN: 'Very Often',
    VERYSATISFACTORY: 'Very Satisfactory'
  };

  function expandQualitativeDescription(abbr) {
    if (abbr == null || abbr === '') return abbr === '' ? '' : '—';
    var s = String(abbr).trim();
    if (!s || s === '—') return s || '—';
    var raw = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
    var key = raw.replace(/\s+/g, '').toUpperCase();
    if (!key) return s;
    var mapped = QUALITATIVE_DESCRIPTION_MAP[key];
    if (mapped) return mapped;
    if (raw.length > 5) return raw;
    return s;
  }

  /** Alias for expandQualitativeDescription: convertQD(abbreviation) → full text for interpretation. */
  function convertQD(abbreviation) {
    return expandQualitativeDescription(abbreviation);
  }

  /**
   * Format indicator text for interpretation: capitalize first letter if lowercase,
   * normalize acronyms (PMDAS, GMDAS, GCF, LCM) to uppercase.
   * @param {string} indicator - Raw indicator text
   * @returns {string}
   */
  function formatIndicatorForInterpretation(indicator) {
    if (!indicator || typeof indicator !== 'string') return indicator || '';
    var s = indicator.trim();
    if (!s) return s;
    if (s.charAt(0) === s.charAt(0).toLowerCase() && /[a-z]/.test(s.charAt(0))) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    s = s.replace(/\bpmdas\b/gi, 'PMDAS');
    s = s.replace(/\bgmdas\b/gi, 'GMDAS');
    s = s.replace(/\bgcf\b/gi, 'GCF');
    s = s.replace(/\blcm\b/gi, 'LCM');
    return s;
  }

  /**
   * Strip "Table 10." etc. from title and format for AWM sentence.
   * Returns e.g. "the level of abilities of Grade 3 pupils in Science in terms of curiosity".
   * Does not include "Table X." in output. Preserves proper noun capitalization (Grade N, Science, etc.).
   */
  function formatThemeForInterpretation(title) {
    if (!title || typeof title !== 'string') return 'the theme';
    var s = title.trim().replace(/^Table\s+\d+\.\s*/i, '').trim();
    if (!s) return 'the theme';
    s = s.toLowerCase();
    s = s.replace(/\bgrade\s+(\d+|k)\b/gi, function (m, n) { return 'Grade ' + (n.toUpperCase() === 'K' ? 'K' : n); });
    s = s.replace(/\bscience\b/g, 'Science');
    s = s.replace(/\bmathematics\b/g, 'Mathematics');
    s = s.replace(/\benglish\b/g, 'English');
    s = s.replace(/\bfilipino\b/g, 'Filipino');
    return s.indexOf('the ') === 0 ? s : 'the ' + s;
  }

  global.ThesisInterpretationUtils = {
    getVariedOpener: getVariedOpener,
    buildImplications: buildImplications,
    expandQualitativeDescription: expandQualitativeDescription,
    convertQD: convertQD,
    formatThemeForInterpretation: formatThemeForInterpretation,
    formatIndicatorForInterpretation: formatIndicatorForInterpretation,
    QUALITATIVE_DESCRIPTION_MAP: QUALITATIVE_DESCRIPTION_MAP,
    OPENER_POOL: OPENER_POOL,
    TRANSITION_PHRASES: TRANSITION_PHRASES
  };
})(typeof window !== 'undefined' ? window : this);
