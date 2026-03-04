/**
 * Thesis Interpretation Assistant — Shared Interpretation Utilities
 * Used by profile.js, likert.js, summary.js for consistent academic style.
 * - getVariedOpener(): selects opening phrase from pool, avoids consecutive repeats (localStorage).
 * - buildImplications(context, includeImplications): returns two implication sentences.
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
        first: 'This indicates that respondents perceive the measured construct as reflected in the qualitative description.',
        second: 'This further implies that the findings align with the overall assessment of the theme.'
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

  global.ThesisInterpretationUtils = {
    getVariedOpener: getVariedOpener,
    buildImplications: buildImplications,
    OPENER_POOL: OPENER_POOL
  };
})(typeof window !== 'undefined' ? window : this);
