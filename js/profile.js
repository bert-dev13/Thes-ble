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
  // Legacy openings kept for backwards compatibility; overridden by table-specific openings.
  var OPENINGS = [];
  var openingIndex = 0;

  var computedRows = [];
  var currentTableTitle = '';
  var currentTableConfig = null;
  var activeProjectId = 'rp1'; // 'rp1' = Research Paper 1, 'rp2' = Research Paper 2
  var currentProject2Table = null;
  var autoPercentTwoGroup = true;
  var computeTable9Percent = false;
  var SAMPLE_FLAG = 'profile-sample';

  // Predefined profile table structures (Tables 2–9)
  var PROFILE_TABLE_CONFIGS = {
    age: {
      id: 'age',
      tableNumber: 2,
      title: 'Table 2. Respondents as to Age',
      opening: 'Age stratification of the respondents shows that ',
      categories: [
        '26\u201330 years old',
        '31\u201335 years old',
        '36\u201340 years old',
        '41\u201345 years old',
        '51\u201355 years old'
      ],
      frequencies: [
        6,
        4,
        2,
        11,
        2
      ]
    },
    gender: {
      id: 'gender',
      tableNumber: 3,
      title: 'Table 3. Respondents as to Gender',
      opening: 'With regard to the gender of respondents, ',
      categories: [
        'Male',
        'Female'
      ],
      frequencies: [
        1,
        24
      ]
    },
    civilStatus: {
      id: 'civilStatus',
      tableNumber: 4,
      title: 'Table 4. Respondents as to Civil Status',
      opening: 'In terms of civil status, ',
      categories: [
        'Single',
        'Married'
      ],
      frequencies: [
        2,
        23
      ]
    },
    education: {
      id: 'education',
      tableNumber: 5,
      title: 'Table 5. Respondents as to Highest Educational Attainment',
      opening: 'With respect to the highest educational attainment, ',
      categories: [
        'Bachelor\u2019s Degree Graduate',
        'MAED Graduate',
        'With MAED Units',
        'EdD/PhD Graduate'
      ],
      frequencies: [
        2,
        8,
        14,
        1
      ]
    },
    position: {
      id: 'position',
      tableNumber: 6,
      title: 'Table 6. Respondents as to Present Position',
      opening: 'As to present position, ',
      categories: [
        'Teacher 1',
        'Teacher 2',
        'Teacher 3'
      ],
      frequencies: [
        2,
        22,
        1
      ]
    },
    rating: {
      id: 'rating',
      tableNumber: 7,
      title: 'Table 7. Respondents as to Latest Performance Rating',
      opening: 'Regarding the latest performance rating, ',
      categories: [
        'Outstanding',
        'Very Satisfactory'
      ],
      frequencies: [
        21,
        4
      ]
    },
    yearsService: {
      id: 'yearsService',
      tableNumber: 8,
      title: 'Table 8. Respondents as to Number of Years in Service',
      opening: 'About the number of years in service, ',
      categories: [
        '1\u20135 years',
        '6\u201310 years',
        '11\u201315 years',
        '16\u201320 years',
        '21\u201325 years',
        '26\u201330 years'
      ],
      frequencies: [
        3,
        9,
        5,
        4,
        3,
        1
      ]
    },
    inServiceTraining: {
      id: 'inServiceTraining',
      tableNumber: 9,
      title: 'Table 9. Respondents as to the Level of In-Service Attended',
      opening: 'Considering the level of in-service training attended, ',
      categories: [
        'International',
        'National',
        'Division',
        'District'
      ],
      frequencies: [
        1,
        3,
        7,
        14
      ]
    }
  };

  // Research Paper 1: Table-specific interpretation format (Tables 2–9)
  var RP1_INTERPRETATION_CONFIG = {
    age: {
      id: 'age',
      title: 'Interpretation for Respondents as to Age',
      opener: 'In terms of the age of the respondents, ',
      openerAlternatives: [
        'In terms of the age of the respondents, ', 'Regarding the age of the respondents, ', 'As to the age of the respondents, '
      ],
      majorityPrefix: 'belong to the ',
      majoritySuffix: ' age group.',
      indicates: 'This indicates that most of the teachers are in their early forties and are likely in the mature stage of their professional careers.',
      implies: 'This further implies that the teaching workforce in the area is composed largely of experienced educators.'
    },
    gender: {
      id: 'gender',
      title: 'Interpretation for Respondents as to Gender',
      opener: 'With regard to the gender of respondents, ',
      openerAlternatives: [
        'With regard to the gender of respondents, ', 'In terms of gender, ', 'Regarding the gender of respondents, '
      ],
      majorityPrefix: 'are ',
      majoritySuffix: '.',
      indicates: 'This indicates that the teaching workforce in the area is predominantly composed of female educators.',
      implies: 'This further implies that classroom instruction and school activities are largely influenced by female teaching professionals.'
    },
    civilStatus: {
      id: 'civilStatus',
      title: 'Interpretation for Respondents as to Civil Status',
      opener: 'Regarding the civil status of the respondents, ',
      openerAlternatives: [
        'Regarding the civil status of the respondents, ', 'In terms of civil status, ', 'As to the civil status of the respondents, '
      ],
      majorityPrefix: 'are ',
      majoritySuffix: '.',
      indicates: 'This indicates that most teachers maintain established family responsibilities alongside their professional roles.',
      implies: 'This further implies that the respondents possess a level of personal stability that contributes to their commitment to their profession.'
    },
    education: {
      id: 'education',
      title: 'Interpretation for Respondents as to Highest Educational Attainment',
      opener: 'About the highest educational attainment of the respondents, ',
      openerAlternatives: [
        'About the highest educational attainment of the respondents, ', 'Regarding the highest educational attainment, ', 'As to the highest educational attainment of the respondents, '
      ],
      majorityPrefix: 'are ',
      majoritySuffix: '.',
      indicates: 'This indicates that many teachers have already begun pursuing graduate studies to enhance their professional competencies.',
      implies: 'This further implies that the teaching workforce is actively engaged in continuing professional development.'
    },
    position: {
      id: 'position',
      title: 'Interpretation for Respondents as to Present Position',
      opener: 'As to the present position of the respondents, ',
      openerAlternatives: [
        'As to the present position of the respondents, ', 'Regarding the present position of the respondents, ', 'About the respondents\' present position, '
      ],
      majorityPrefix: 'are ',
      majoritySuffix: '.',
      indicates: 'This indicates that most teachers have already progressed beyond the entry-level stage of the teaching profession.',
      implies: 'This further implies that the respondents possess sufficient teaching experience and professional growth within the educational system.'
    },
    rating: {
      id: 'rating',
      title: 'Interpretation for Respondents as to Latest Performance Rating',
      opener: 'Concerning the latest performance rating of the respondents, ',
      openerAlternatives: [
        'Concerning the latest performance rating of the respondents, ', 'Regarding the latest performance rating, ', 'As to the latest performance rating of the respondents, '
      ],
      majorityPrefix: 'received ',
      majoritySuffix: ' rating.',
      majorityReceived: true,
      indicates: 'This indicates that most teachers demonstrate high levels of professional competence and dedication in their work.',
      implies: 'This further implies that the teaching workforce maintains a strong commitment to delivering quality instruction.'
    },
    yearsService: {
      id: 'yearsService',
      title: 'Interpretation for Respondents as to Number of Years in Service',
      opener: 'Pertaining to the number of years in service of the respondents, ',
      openerAlternatives: [
        'Pertaining to the number of years in service of the respondents, ', 'Regarding the number of years in service, ', 'As to the number of years in service of the respondents, '
      ],
      majorityPrefix: 'fall under the ',
      majoritySuffix: ' category.',
      indicates: 'This indicates that many teachers are in the early to middle stages of their teaching careers.',
      implies: 'This further implies that the workforce combines developing experience with growing professional competence.'
    },
    inServiceTraining: {
      id: 'inServiceTraining',
      title: 'Interpretation for Respondents as to Level of In-Service Training Attended',
      opener: 'Considering the level of in-service training attended by the respondents, ',
      openerAlternatives: [
        'Considering the level of in-service training attended by the respondents, ', 'Regarding the level of in-service training attended, ', 'As to the level of in-service training attended by the respondents, '
      ],
      majorityPrefix: 'attended ',
      majoritySuffix: '-level training.',
      useAttendedFormat: true,
      indicates: 'This indicates that most professional development activities are conducted at the district level.',
      implies: 'This further implies that teachers frequently participate in locally organized training programs to enhance their teaching practices.'
    }
  };

  // Research Paper 2: School Heads vs Teachers (Tables 2–9)
  var PROJECT2_TABLES = {
    age: {
      id: 'age',
      tableNumber: 2,
      title: 'Table 2. Respondents as to Age',
      rows: [
        { category: '21–25 years old', heads: { f: 0, pct: 0.00 }, teachers: { f: 1, pct: 2.50 } },
        { category: '26–30 years old', heads: { f: 0, pct: 0.00 }, teachers: { f: 5, pct: 12.50 } },
        { category: '31–35 years old', heads: { f: 2, pct: 5.00 }, teachers: { f: 8, pct: 20.00 } },
        { category: '36–40 years old', heads: { f: 3, pct: 7.50 }, teachers: { f: 7, pct: 17.50 } },
        { category: '41–45 years old', heads: { f: 4, pct: 10.00 }, teachers: { f: 5, pct: 12.50 } },
        { category: '46–50 years old', heads: { f: 4, pct: 10.00 }, teachers: { f: 10, pct: 25.00 } },
        { category: '51–55 years old', heads: { f: 20, pct: 50.00 }, teachers: { f: 2, pct: 5.00 } },
        { category: '56–60 years old', heads: { f: 7, pct: 17.50 }, teachers: { f: 2, pct: 5.00 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    gender: {
      id: 'gender',
      tableNumber: 3,
      title: 'Table 3. Respondents as to Gender',
      rows: [
        { category: 'Male', heads: { f: 8, pct: 20.00 }, teachers: { f: 7, pct: 17.50 } },
        { category: 'Female', heads: { f: 32, pct: 80.00 }, teachers: { f: 33, pct: 82.50 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    civilStatus: {
      id: 'civilStatus',
      tableNumber: 4,
      title: 'Table 4. Respondents as to Civil Status',
      rows: [
        { category: 'Single', heads: { f: 0, pct: 0.00 }, teachers: { f: 3, pct: 7.50 } },
        { category: 'Married', heads: { f: 40, pct: 100.00 }, teachers: { f: 35, pct: 87.50 } },
        { category: 'Widowed', heads: { f: 0, pct: 0.00 }, teachers: { f: 2, pct: 5.00 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    education: {
      id: 'education',
      tableNumber: 5,
      title: 'Table 5. Respondents as to Highest Educational Attainment',
      rows: [
        { category: 'Bachelor’s Degree Graduate', heads: { f: 0, pct: 0.00 }, teachers: { f: 9, pct: 22.50 } },
        { category: 'MAEd Graduate', heads: { f: 0, pct: 0.00 }, teachers: { f: 9, pct: 22.50 } },
        { category: 'EdD/PhD Graduate', heads: { f: 24, pct: 60.00 }, teachers: { f: 12, pct: 30.00 } },
        { category: 'With MAEd Units', heads: { f: 13, pct: 32.50 }, teachers: { f: 9, pct: 22.50 } },
        { category: 'With EdD/PhD Units', heads: { f: 3, pct: 7.50 }, teachers: { f: 1, pct: 2.50 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    position: {
      id: 'position',
      tableNumber: 6,
      title: 'Table 6. Respondents as to Present Position',
      rows: [
        { category: 'Principal 1', heads: { f: 17, pct: 42.50 }, teachers: { f: 0, pct: 0.00 } },
        { category: 'Principal 2', heads: { f: 10, pct: 25.00 }, teachers: { f: 0, pct: 0.00 } },
        { category: 'Head Teacher 3', heads: { f: 10, pct: 25.00 }, teachers: { f: 0, pct: 0.00 } },
        { category: 'Head Teacher 1', heads: { f: 3, pct: 7.50 }, teachers: { f: 0, pct: 0.00 } },
        { category: 'Master Teacher 1', heads: { f: 3, pct: 7.50 }, teachers: { f: 2, pct: 5.00 } },
        { category: 'Master Teacher 2', heads: { f: 0, pct: 0.00 }, teachers: { f: 3, pct: 7.50 } },
        { category: 'Teacher 1', heads: { f: 0, pct: 0.00 }, teachers: { f: 3, pct: 7.50 } },
        { category: 'Teacher 2', heads: { f: 0, pct: 0.00 }, teachers: { f: 7, pct: 17.50 } },
        { category: 'Teacher 3', heads: { f: 0, pct: 0.00 }, teachers: { f: 24, pct: 60.00 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    rating: {
      id: 'rating',
      tableNumber: 7,
      title: 'Table 7. Respondents as to Latest Performance Rating',
      rows: [
        { category: 'Outstanding', heads: { f: 40, pct: 100.00 }, teachers: { f: 32, pct: 80.00 } },
        { category: 'Very Satisfactory', heads: { f: 0, pct: 0.00 }, teachers: { f: 8, pct: 20.00 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    yearsService: {
      id: 'yearsService',
      tableNumber: 8,
      title: 'Table 8. Respondents as to Number of Years in Service',
      rows: [
        { category: '1–5 years', heads: { f: 0, pct: 0.00 }, teachers: { f: 3, pct: 7.50 } },
        { category: '6–10 years', heads: { f: 0, pct: 0.00 }, teachers: { f: 11, pct: 27.50 } },
        { category: '11–15 years', heads: { f: 8, pct: 20.00 }, teachers: { f: 10, pct: 25.00 } },
        { category: '16–20 years', heads: { f: 7, pct: 17.50 }, teachers: { f: 6, pct: 15.00 } },
        { category: '21–25 years', heads: { f: 20, pct: 50.00 }, teachers: { f: 7, pct: 17.50 } },
        { category: '26–30 years', heads: { f: 4, pct: 10.00 }, teachers: { f: 0, pct: 0.00 } },
        { category: '31–35 years', heads: { f: 1, pct: 2.50 }, teachers: { f: 3, pct: 7.50 } }
      ],
      totals: { heads: 40, teachers: 40 },
      type: 'twoGroupPercent'
    },
    inServiceTraining: {
      id: 'inServiceTraining',
      tableNumber: 9,
      title: 'Table 9. Respondents as to Level of In-Service Training Attended (Frequency of Mention)',
      rows: [
        { category: 'International Level', heads: { f: 5 }, teachers: { f: 4 } },
        { category: 'National Level', heads: { f: 8 }, teachers: { f: 5 } },
        { category: 'Division Level', heads: { f: 27 }, teachers: { f: 27 } }
      ],
      totals: { heads: 40, teachers: 36 }, // total mentions; percentages optional
      type: 'twoGroupMention'
    }
  };

  // Hardcoded client sample data: Tables 2–9 (legacy loader, not used by dropdown flow)
  var SAMPLE_TABLES = [
    {
      key: 'age',
      defaultTitle: 'Table 2. Age of Respondents',
      subject: 'respondents',
      rows: [
        { category: '26–30', frequency: 6 },
        { category: '31–35', frequency: 4 },
        { category: '36–40', frequency: 2 },
        { category: '41–45', frequency: 11 },
        { category: '51–55', frequency: 2 }
      ]
    },
    {
      key: 'gender',
      defaultTitle: 'Table 3. Gender of Respondents',
      subject: 'respondents',
      rows: [
        { category: 'Male', frequency: 1 },
        { category: 'Female', frequency: 24 }
      ]
    },
    {
      key: 'civilStatus',
      defaultTitle: 'Table 4. Civil Status of Respondents',
      subject: 'respondents',
      rows: [
        { category: 'Single', frequency: 2 },
        { category: 'Married', frequency: 23 }
      ]
    },
    {
      key: 'education',
      defaultTitle: 'Table 5. Highest Educational Attainment of Respondents',
      subject: 'respondents',
      rows: [
        { category: "Bachelor's Degree Graduate", frequency: 2 },
        { category: 'MAED Graduate', frequency: 8 },
        { category: 'With MAED Units', frequency: 14 },
        { category: 'EdD/PhD Graduate', frequency: 1 }
      ]
    },
    {
      key: 'position',
      defaultTitle: 'Table 6. Present Position of Respondents',
      subject: 'respondents',
      rows: [
        { category: 'Teacher 1', frequency: 2 },
        { category: 'Teacher 2', frequency: 22 },
        { category: 'Teacher 3', frequency: 1 }
      ]
    },
    {
      key: 'rating',
      defaultTitle: 'Table 7. Latest Performance Rating of Respondents',
      subject: 'respondents',
      rows: [
        { category: 'Outstanding', frequency: 21 },
        { category: 'Very Satisfactory', frequency: 4 }
      ]
    },
    {
      key: 'yearsService',
      defaultTitle: 'Table 8. Number of Years in Service of Respondents',
      subject: 'respondents',
      rows: [
        { category: '1–5', frequency: 3 },
        { category: '6–10', frequency: 9 },
        { category: '11–15', frequency: 5 },
        { category: '16–20', frequency: 4 },
        { category: '21–25', frequency: 3 },
        { category: '26–30', frequency: 1 }
      ]
    },
    {
      key: 'inServiceTraining',
      defaultTitle: 'Table 9. Level of In-Service Attended by Respondents',
      subject: 'respondents',
      rows: [
        { category: 'International', frequency: 1 },
        { category: 'National', frequency: 3 },
        { category: 'Division', frequency: 7 },
        { category: 'District', frequency: 14 }
      ]
    }
  ];

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

  function updateLoadedSummary() {
    var pill = document.getElementById('pa-loaded-summary');
    var tableSelect = document.getElementById('pa-table-select');
    if (!tableSelect) return;
    var key = tableSelect.value;
    if (!key) {
      if (pill) pill.textContent = activeProjectId === 'rp1' ? 'Manual table' : 'None selected';
      return;
    }
    var cfg = activeProjectId === 'rp2' ? PROJECT2_TABLES[key] : PROFILE_TABLE_CONFIGS[key];
    if (!cfg) {
      if (pill) pill.textContent = 'Unknown table';
      return;
    }
    var count = (cfg.rows ? cfg.rows.length : (cfg.categories ? cfg.categories.length : 0));
    var mode = activeProjectId === 'rp2' ? 'Two groups' : 'Single group';
    var shortName = cfg.title ? cfg.title.replace(/^Table \d+\.\s*Respondents as to\s*(?:the\s*)?/i, '').trim() : key;
    var titlePart = (cfg.tableNumber ? 'Table ' + cfg.tableNumber + ' — ' : '') + (shortName || cfg.title || key);
    if (pill) pill.textContent = titlePart + ' • ' + count + ' categories • ' + mode;
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

  /** Show empty state when no table selected (rp2 or error). */
  function showEmptyState() {
    var emptyEl = document.getElementById('pa-encode-empty');
    var tableCard = document.getElementById('pa-table-card');
    var tbody = document.getElementById('pa-table-tbody');
    var titleEl = document.getElementById('pa-table-title');
    var twoGroupSection = document.getElementById('pa-output-section');
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.classList.remove('pa-manual-hint');
    }
    if (tableCard) tableCard.hidden = true;
    if (twoGroupSection) twoGroupSection.hidden = true;
    if (tbody) tbody.innerHTML = '';
    if (titleEl) {
      titleEl.value = '';
      titleEl.disabled = true;
    }
    currentTableConfig = null;
    currentProject2Table = null;
    currentTableTitle = '';
    computedRows = [];
    renderOutputPlaceholder();
    setInterpretationTabsVisibility(false);
    updateLoadedSummary();
    onInputChange();
  }

  /** Show manual table state: no predefined table selected, user can enter data (rp1 only). */
  function showManualTableState() {
    var emptyEl = document.getElementById('pa-encode-empty');
    var tableCard = document.getElementById('pa-table-card');
    var tbody = document.getElementById('pa-table-tbody');
    var titleEl = document.getElementById('pa-table-title');
    var twoGroupSection = document.getElementById('pa-output-section');
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.classList.add('pa-manual-hint');
      var textEl = emptyEl.querySelector('.pa-encode-empty__text');
      if (textEl) textEl.textContent = 'You may select a predefined table or manually enter your own data.';
    }
    if (tableCard) tableCard.hidden = false;
    if (twoGroupSection) twoGroupSection.hidden = true;
    if (titleEl) {
      titleEl.value = '';
      titleEl.disabled = false;
      titleEl.placeholder = 'e.g. Age stratification of the respondents';
    }
    currentTableConfig = null;
    currentProject2Table = null;
    currentTableTitle = '';
    computedRows = [];
    if (tbody) {
      tbody.innerHTML = '';
      addRow();
      updateProfileRowNumbers();
    }
    renderOutputPlaceholder();
    var totalFreqEl = document.getElementById('pa-total-freq');
    var totalPctEl = document.getElementById('pa-total-pct');
    if (totalFreqEl) totalFreqEl.textContent = '—';
    if (totalPctEl) totalPctEl.textContent = '—';
    setInterpretationTabsVisibility(false);
    updateLoadedSummary();
    onInputChange();
  }

  /** Show table state when a predefined table is selected. */
  function showTableState() {
    var emptyEl = document.getElementById('pa-encode-empty');
    var tableCard = document.getElementById('pa-table-card');
    var titleEl = document.getElementById('pa-table-title');
    if (emptyEl) emptyEl.hidden = true;
    if (tableCard) tableCard.hidden = false;
    if (titleEl) titleEl.disabled = false;
  }

  /** Load table by key. Call on init and when table select changes. */
  function loadSelectedTable(key) {
    if (!key) {
      if (activeProjectId === 'rp1') {
        showManualTableState();
      } else {
        showEmptyState();
      }
      hideTwoGroupSection();
      updateLoadedSummary();
      return;
    }
    if (activeProjectId === 'rp2') {
      var cfg = PROJECT2_TABLES[key];
      if (!cfg) {
        showEmptyState();
        updateLoadedSummary();
        return;
      }
      currentProject2Table = JSON.parse(JSON.stringify(cfg));
      currentTableConfig = null;
      currentTableTitle = cfg.title;
      var titleEl = document.getElementById('pa-table-title');
      if (titleEl) {
        titleEl.value = cfg.title;
        titleEl.disabled = false;
      }
      hideSingleGroupSection();
      showTwoGroupSection();
      renderTwoGroupTable(currentProject2Table, { showComputed: false });
      var copyBtn = document.getElementById('pa-copy-interpretation');
      var saveTableBtn = document.getElementById('pa-save-table');
      var saveTableBtnTwo = document.getElementById('pa-save-table-two');
      var restoreBtnTwo = document.getElementById('pa-restore-original-two');
      if (copyBtn) copyBtn.disabled = false;
      if (saveTableBtn) saveTableBtn.disabled = false;
      if (saveTableBtnTwo) saveTableBtnTwo.disabled = false;
      if (restoreBtnTwo) restoreBtnTwo.disabled = false;
      setInterpretationTabsVisibility(true);
    } else {
      applyProfileTableConfig(key);
      showTableState();
      hideTwoGroupSection();
    }
    updateLoadedSummary();
  }

  function hideSingleGroupSection() {
    var emptyEl = document.getElementById('pa-encode-empty');
    var tableCard = document.getElementById('pa-table-card');
    if (emptyEl) emptyEl.hidden = true;
    if (tableCard) tableCard.hidden = true;
  }

  function hideTwoGroupSection() {
    var section = document.getElementById('pa-output-section');
    if (section) section.hidden = true;
    setInterpretationTabsVisibility(false);
  }

  function showTwoGroupSection() {
    var section = document.getElementById('pa-output-section');
    if (section) section.hidden = false;
  }

  function applyProfileTableConfig(key) {
    var config = PROFILE_TABLE_CONFIGS[key];
    var tbody = document.getElementById('pa-table-tbody');
    var titleEl = document.getElementById('pa-table-title');
    if (!config || !tbody || !titleEl) {
      return;
    }

    currentTableConfig = config;
    currentTableTitle = config.title;
    titleEl.value = config.title;

    // Rebuild input rows based on predefined categories and sample frequencies
    tbody.innerHTML = '';
    config.categories.forEach(function (label, index) {
      var initialFreq = config.frequencies && typeof config.frequencies[index] === 'number'
        ? config.frequencies[index]
        : '';
      var rowRefs = addRow(label, initialFreq);
      if (rowRefs && rowRefs.catInput) {
        rowRefs.catInput.readOnly = true;
        rowRefs.catInput.classList.add('pa-input--readonly');
      }
    });

    // Reset computed state — do not show totals until user clicks Compute
    computedRows = [];
    renderOutputPlaceholder();
    var totalFreqEl = document.getElementById('pa-total-freq');
    var totalPctEl = document.getElementById('pa-total-pct');
    if (totalFreqEl) totalFreqEl.textContent = '—';
    if (totalPctEl) totalPctEl.textContent = '—';
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveTableBtn = document.getElementById('pa-save-table');
    var restoreBtn = document.getElementById('pa-restore-original');
    var computeBtn = document.getElementById('pa-compute');
    if (copyBtn) copyBtn.disabled = true;
    if (saveTableBtn) saveTableBtn.disabled = true;
    if (restoreBtn) restoreBtn.disabled = false;
    updateLoadedSummary();
    onInputChange();
  }

  function updateProfileRowNumbers() {
    var tbody = document.getElementById('pa-table-tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var noCell = rows[i].querySelector('[data-pa-no]');
      if (noCell) noCell.textContent = i + 1;
    }
  }

  function addRow(initialCategory, initialFrequency) {
    var tbody = document.getElementById('pa-table-tbody');
    if (!tbody) return null;
    var tr = document.createElement('tr');
    var tdNo = document.createElement('td');
    tdNo.setAttribute('data-pa-no', '');
    tdNo.textContent = tbody.querySelectorAll('tr').length + 1;
    tr.appendChild(tdNo);
    var tdCat = document.createElement('td');
    var catInput = document.createElement('input');
    catInput.type = 'text';
    catInput.className = 'pa-input pa-input--category';
    catInput.placeholder = 'Category';
    catInput.setAttribute('data-pa-category', '');
    catInput.value = initialCategory || '';
    tdCat.appendChild(catInput);

    var tdFreq = document.createElement('td');
    var freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.className = 'pa-input pa-input--freq';
    freqInput.min = '0';
    freqInput.step = '1';
    freqInput.placeholder = '0';
    freqInput.setAttribute('data-pa-freq', '');
    if (typeof initialFrequency === 'number' && !isNaN(initialFrequency)) {
      freqInput.value = String(initialFrequency);
    }
    tdFreq.appendChild(freqInput);

    var tdPct = document.createElement('td');
    tdPct.setAttribute('data-pa-pct', '');
    tdPct.textContent = '—';

    var tdRank = document.createElement('td');
    tdRank.setAttribute('data-pa-rank', '');
    tdRank.textContent = '—';

    var tdRemove = document.createElement('td');
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'pa-row-remove';
    removeBtn.setAttribute('aria-label', 'Remove row');
    removeBtn.setAttribute('data-pa-remove', '');
    removeBtn.textContent = '×';
    tdRemove.appendChild(removeBtn);

    tr.appendChild(tdCat);
    tr.appendChild(tdFreq);
    tr.appendChild(tdPct);
    tr.appendChild(tdRank);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
    updateProfileRowNumbers();
    removeBtn.addEventListener('click', function () {
      removeRow(tr);
    });
    freqInput.addEventListener('input', onInputChange);
    catInput.addEventListener('input', onInputChange);
    onInputChange();
    return {
      tr: tr,
      catInput: catInput,
      freqInput: freqInput
    };
  }

  function removeRow(tr) {
    var tbody = document.getElementById('pa-table-tbody');
    if (tbody && tr.parentNode === tbody) {
      tbody.removeChild(tr);
      updateProfileRowNumbers();
      onInputChange();
    }
  }

  /**
   * Apply pasted table data to the Profile table (Particulars, Frequency, Percentage, Rank).
   * Only applies when single-group table is visible (rp1).
   */
  function applyPastedProfileData(mapped) {
    var tbody = document.getElementById('pa-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (var i = 0; i < mapped.particulars.length; i++) {
      var cat = mapped.particulars[i] || '';
      var freqVal = mapped.frequency[i];
      var freqNum = freqVal !== '' && freqVal != null ? (parseInt(String(freqVal), 10) || 0) : '';
      var result = addRow(cat, freqNum === '' ? undefined : freqNum);
      if (result && result.tr) {
        var pctCell = result.tr.querySelector('[data-pa-pct]');
        var rankCell = result.tr.querySelector('[data-pa-rank]');
        if (pctCell && mapped.percentage[i]) pctCell.textContent = mapped.percentage[i];
        if (rankCell && mapped.rank[i]) rankCell.textContent = mapped.rank[i];
      }
    }
    updateProfileRowNumbers();
    onInputChange();
  }

  function handleProfilePaste(e) {
    var clipboardData = e.clipboardData;
    if (!clipboardData) return;
    var Utils = typeof PasteTableUtils !== 'undefined' ? PasteTableUtils : null;
    if (!Utils) return;
    var parsed = Utils.parseClipboardToRows(clipboardData);
    if (!parsed.rows.length) return;
    e.preventDefault();
    var rows = parsed.rows;
    var skipHeader = Utils.isHeaderRow(rows[0], 'profile');
    if (skipHeader) rows = rows.slice(1);
    if (!rows.length) return;
    var validation = Utils.validateProfilePaste(rows);
    var errEl = document.getElementById('pa-paste-table-error');
    var pasteZone = document.getElementById('pa-paste-zone');
    if (!validation.valid) {
      if (errEl) errEl.textContent = validation.message || 'Invalid format.';
      return;
    }
    if (errEl) errEl.textContent = '';
    var mapped = Utils.mapToProfileRows(rows, skipHeader);
    if (mapped) {
      applyPastedProfileData(mapped);
      if (pasteZone) {
        pasteZone.textContent = 'Paste here (Ctrl + V)';
        pasteZone.classList.remove('pa-paste-zone--has-content');
      }
      var r = rows.length;
      var c = rows[0] ? rows[0].length : 0;
      showToast('Detected ' + r + ' row' + (r !== 1 ? 's' : '') + ' × ' + c + ' column' + (c !== 1 ? 's' : '') + '. Table updated. You can edit cells and click Compute.');
    }
  }

  function applyPastedProfileTwoGroupData(mapped) {
    if (!mapped) return;
    var rows = [];
    for (var i = 0; i < mapped.particulars.length; i++) {
      var hF = mapped.headsF[i] !== '' ? (parseInt(mapped.headsF[i], 10) || 0) : 0;
      var tF = mapped.teachersF[i] !== '' ? (parseInt(mapped.teachersF[i], 10) || 0) : 0;
      var hPct = mapped.headsPct[i] !== '' ? (parseFloat(mapped.headsPct[i]) || 0) : 0;
      var tPct = mapped.teachersPct[i] !== '' ? (parseFloat(mapped.teachersPct[i]) || 0) : 0;
      rows.push({
        category: mapped.particulars[i] || '',
        heads: { f: hF, pct: hPct },
        teachers: { f: tF, pct: tPct }
      });
    }
    if (!currentProject2Table) {
      currentProject2Table = {
        id: 'pasted',
        title: currentTableTitle || 'Pasted Table',
        rows: rows,
        type: 'twoGroupPercent'
      };
    } else {
      currentProject2Table.rows = rows;
    }
    renderTwoGroupTable(currentProject2Table, { showComputed: false });
    onInputChange();
  }

  function handleProfileTwoGroupPaste(e) {
    var clipboardData = e.clipboardData;
    if (!clipboardData) return;
    var Utils = typeof PasteTableUtils !== 'undefined' ? PasteTableUtils : null;
    if (!Utils) return;
    var parsed = Utils.parseClipboardToRows(clipboardData);
    if (!parsed.rows.length) return;
    e.preventDefault();
    var rows = parsed.rows;
    var skipHeader = Utils.isHeaderRow(rows[0], 'profile-twogroup');
    if (skipHeader) rows = rows.slice(1);
    if (!rows.length) return;
    var validation = Utils.validateProfileTwoGroupPaste(rows);
    var errEl = document.getElementById('pa-paste-table-error-two');
    var pasteZone = document.getElementById('pa-paste-zone-two');
    if (!validation.valid) {
      if (errEl) errEl.textContent = validation.message || 'Invalid format.';
      return;
    }
    if (errEl) errEl.textContent = '';
    var mapped = Utils.mapToProfileTwoGroupRows(rows);
    if (mapped) {
      applyPastedProfileTwoGroupData(mapped);
      if (pasteZone) {
        pasteZone.textContent = 'Paste here (Ctrl + V)';
      }
      var r = rows.length;
      var c = rows[0] ? rows[0].length : 0;
      showToast('Detected ' + r + ' row' + (r !== 1 ? 's' : '') + ' × ' + c + ' column' + (c !== 1 ? 's' : '') + '. Table updated. You can edit cells and click Compute.');
    }
  }

  function getInputRows() {
    var tbody = document.getElementById('pa-table-tbody');
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

  function updateLiveTotals(totalFreq, totalPct) {
    var liveFreq = document.getElementById('pa-live-total-freq');
    var livePct = document.getElementById('pa-live-total-pct');
    if (liveFreq) liveFreq.textContent = totalFreq != null ? totalFreq : '0';
    if (livePct) livePct.textContent = totalPct || '0.00';
  }

  function onInputChange() {
    if (activeProjectId === 'rp1') {
      var rows = getInputRows();
      var total = 0;
      rows.forEach(function (r) { total += r.frequency; });
      updateLiveTotals(total, total > 0 ? '100.00' : '0.00');
      var computeBtn = document.getElementById('pa-compute');
      var saveTableBtn = document.getElementById('pa-save-table');
      if (computeBtn) computeBtn.disabled = !validate();
      if (saveTableBtn) saveTableBtn.disabled = true;
      // When user edits after computation, clear computed values until they click Compute again
      if (computedRows.length > 0) {
        var tbody = document.getElementById('pa-table-tbody');
        if (tbody) {
          tbody.querySelectorAll('tr').forEach(function (tr) {
            var pctEl = tr.querySelector('[data-pa-pct]');
            var rankEl = tr.querySelector('[data-pa-rank]');
            if (pctEl) pctEl.textContent = '—';
            if (rankEl) rankEl.textContent = '—';
          });
        }
        renderOutputPlaceholder();
        computedRows = [];
        var block = document.getElementById('pa-interpretation-block');
        if (block) block.textContent = '';
        var copyBtn = document.getElementById('pa-copy-interpretation');
        var regenBtn = document.getElementById('pa-regenerate-interpretation');
        if (copyBtn) copyBtn.disabled = true;
        if (regenBtn) regenBtn.disabled = true;
      }
    }
  }

  function compute() {
    if (activeProjectId === 'rp2' && currentProject2Table) {
      renderTwoGroupTable(currentProject2Table, { showComputed: true });
      return;
    }
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

    // Compute dense ranks based on frequency (highest = 1)
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

    var tbody = document.getElementById('pa-table-tbody');
    var tfoot = document.getElementById('pa-table-tfoot');
    if (!tbody || !tfoot) return;

    var rowIndex = 0;
    tbody.querySelectorAll('tr').forEach(function (tr) {
      var catEl = tr.querySelector('[data-pa-category]');
      var freqEl = tr.querySelector('[data-pa-freq]');
      var pctEl = tr.querySelector('[data-pa-pct]');
      var rankEl = tr.querySelector('[data-pa-rank]');
      var cat = (catEl && catEl.value || '').trim();
      var freq = parseInt((freqEl && freqEl.value || '0'), 10) || 0;
      if (cat && freq > 0 && rounded[rowIndex]) {
        var r = rounded[rowIndex];
        if (pctEl) pctEl.textContent = r.percentage.toFixed(2);
        if (rankEl) rankEl.textContent = r.rank;
        rowIndex++;
      } else if (pctEl && rankEl) {
        pctEl.textContent = '—';
        rankEl.textContent = '—';
      }
    });

    var totalFreqEl = document.getElementById('pa-total-freq');
    var totalPctEl = document.getElementById('pa-total-pct');
    if (totalFreqEl) totalFreqEl.textContent = total;
    if (totalPctEl) totalPctEl.textContent = '100.00';
    updateLiveTotals(total, '100.00');

    generateInterpretation(rounded, currentTableTitle);
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveTableBtn = document.getElementById('pa-save-table');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveTableBtn) saveTableBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function joinWithAnd(labels) {
    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels[0] + ' and ' + labels[1];
    return labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1];
  }

  /** Format frequency and percentage per thesis spec: "[f] or [p] percent" (no parentheses). */
  function formatFreqPercent(f, p) {
    var pVal = typeof p === 'number' ? p : parseFloat(p) || 0;
    return String(f) + ' or ' + pVal.toFixed(2) + ' percent';
  }

  /**
   * Build a narrative sentence that lists all categories for a given group (school heads / teachers)
   * following the "[f] or [p] percent are ..." pattern. Groups categories by same percentage
   * using "each are X and Y". Used for RP2 Tables 2–9.
   * @param {Array} rows
   * @param {'heads'|'teachers'} groupKey
   * @param {number} totalF
   * @param {string} ofGroup - e.g. " of the school heads" or "" for teachers
   * @returns {string}
   */
  function buildTwoGroupDistributionSentence(rows, groupKey, totalF, ofGroup) {
    if (!rows || !rows.length || !totalF) return '';
    var items = [];
    rows.forEach(function (r) {
      var g = r[groupKey] || {};
      var f = typeof g.f === 'number' ? g.f : 0;
      if (f <= 0) return;
      var pct = typeof g.pct === 'number' ? g.pct : (totalF > 0 ? (f / totalF) * 100 : 0);
      items.push({ f: f, pct: pct, cat: r.category });
    });
    if (!items.length) return '';
    var pctKey = function (x) { return String(x.f) + '_' + x.pct.toFixed(2); };
    var groups = {};
    items.forEach(function (x) {
      var k = pctKey(x);
      if (!groups[k]) groups[k] = [];
      groups[k].push(x);
    });
    var parts = [];
    for (var k in groups) {
      var grp = groups[k];
      var fp = formatFreqPercent(grp[0].f, grp[0].pct);
      var cats = grp.map(function (x) { return x.cat.toLowerCase(); });
      if (grp.length === 1) {
        parts.push(fp + (ofGroup || '') + ' are ' + cats[0]);
      } else {
        parts.push(fp + ' each are ' + joinWithAnd(cats));
      }
    }
    if (parts.length === 1) return parts[0] + '.';
    if (parts.length === 2) return parts[0] + ' while ' + parts[1] + '.';
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1] + '.';
  }

  /**
   * Build distribution sentence for Table 9 (In-Service Training) - count format without percentage.
   * "5 school heads attended international level training, 8 participated in national level training, and 27 attended division level training"
   */
  function buildTwoGroupInServiceSentence(rows, groupKey, groupLabel) {
    if (!rows || !rows.length) return '';
    var parts = [];
    rows.forEach(function (r) {
      var g = r[groupKey] || {};
      var f = typeof g.f === 'number' ? g.f : 0;
      if (f <= 0) return;
      var level = r.category.toLowerCase().replace(/\s+level$/, '');
      if (level === 'international' || level === 'national' || level === 'division' || level === 'district') {
        level = level + ' level';
      }
      var verb = level.indexOf('national') >= 0 ? 'participated in ' : 'attended ';
      parts.push(f + ' ' + groupLabel + ' ' + verb + level + ' training');
    });
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0] + '.';
    if (parts.length === 2) return parts[0] + ', and ' + parts[1] + '.';
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1] + '.';
  }

  /**
   * RP2 Table-specific config (Tables 2–9): section title, intro, "which means", "This implies".
   */
  var RP2_TEACHERS_TRANSITION_ALTERNATIVES = [
    'Meanwhile, for the teachers, ',
    'On the other hand, for the teachers, ',
    'Similarly, for the teachers, ',
    'In contrast, for the teachers, '
  ];

  var RP2_PROFILE_CONFIG = {
    age: {
      sectionTitle: 'Respondents as to Age',
      headsIntro: 'Age stratification reveals that among the school heads, ',
      headsIntroAlternatives: [
        'Age stratification reveals that among the school heads, ',
        'Regarding the age distribution of the school heads, ',
        'As to the age of the school heads, '
      ],
      headsMeans: 'most school leaders are already in a mature and professionally experienced stage of their careers',
      headsImplies: 'leadership positions are commonly occupied by individuals who have accumulated extensive experience in educational administration.',
      teachersMeans: 'many teachers are already in the experienced stage of their teaching careers',
      teachersImplies: 'the teaching workforce is composed of educators who have gained substantial professional experience in classroom instruction.'
    },
    gender: {
      sectionTitle: 'Respondents as to Gender',
      headsIntro: 'With regard to gender, ',
      headsIntroAlternatives: [
        'With regard to gender, ', 'In terms of gender, ', 'Regarding gender, ', 'As to gender, '
      ],
      headsMeans: 'leadership roles in the district are largely held by women',
      headsImplies: 'female educators play a dominant role in school administration and educational leadership in the area.',
      teachersMeans: 'classroom instruction in the district is primarily handled by female educators',
      teachersImplies: 'the teaching profession in the area continues to reflect the common trend of strong female participation.'
    },
    civilStatus: {
      sectionTitle: 'Respondents as to Civil Status',
      headsIntro: 'In terms of civil status, ',
      headsIntroAlternatives: [
        'In terms of civil status, ', 'With regard to civil status, ', 'Regarding civil status, ', 'As to civil status, '
      ],
      headsMeans: 'all members of the leadership group have established family responsibilities',
      headsImplies: 'school leaders manage both professional duties and family roles simultaneously.',
      teachersMeans: 'most teachers belong to family-oriented households',
      teachersImplies: 'many educators maintain a balance between their teaching responsibilities and their family commitments.'
    },
    education: {
      sectionTitle: 'Respondents as to Highest Educational Attainment',
      headsIntro: 'As to the highest educational attainment, ',
      headsIntroAlternatives: [
        'As to the highest educational attainment, ', 'Regarding the highest educational attainment, ', 'With regard to educational attainment, '
      ],
      headsMeans: 'school leaders possess advanced academic qualifications',
      headsImplies: 'the leadership group is academically prepared to manage school programs and educational initiatives effectively.',
      headsMajorityPhrase: 'doctorate degree holders',
      teachersMeans: 'many teachers have pursued advanced studies beyond their undergraduate degrees',
      teachersImplies: 'the teaching workforce values professional development and continuous academic advancement.'
    },
    position: {
      sectionTitle: 'Respondents as to Present Position',
      headsIntro: 'About the respondents\' present position, ',
      headsIntroAlternatives: [
        'About the respondents\' present position, ', 'Regarding the present position of respondents, ', 'As to the respondents\' present position, '
      ],
      headsMeans: 'most school leaders occupy the entry level of the principalship rank',
      headsImplies: 'many administrators are relatively new to the principal position while still performing leadership responsibilities.',
      teachersMeans: 'many teachers have already progressed to higher teaching ranks',
      teachersImplies: 'the teaching group is composed of experienced educators who have advanced through the professional career ladder.'
    },
    rating: {
      sectionTitle: 'Respondents as to Latest Performance Rating',
      headsIntro: 'Regarding the latest performance rating, ',
      headsIntroAlternatives: [
        'Regarding the latest performance rating, ', 'As to the latest performance rating, ', 'With regard to the latest performance rating, '
      ],
      headsMajorityPhrase: 'obtained the highest performance rating',
      headsMeans: 'school administrators demonstrate strong competence in performing their duties',
      headsImplies: 'the leadership group maintains a high level of professional effectiveness in managing school operations.',
      teachersMeans: 'teachers consistently perform their responsibilities at a high level',
      teachersImplies: 'the teaching workforce demonstrates dedication and effectiveness in delivering quality instruction.'
    },
    yearsService: {
      sectionTitle: 'Respondents as to Number of Years in Service',
      headsIntro: 'Pertaining to the number of years in service, ',
      headsIntroAlternatives: [
        'Pertaining to the number of years in service, ', 'Regarding the number of years in service, ', 'As to the number of years in service, '
      ],
      headsMajorityVerb: 'have served for',
      teachersMajorityVerb: 'have served for',
      headsMeans: 'many administrators have long experience in the education sector',
      headsImplies: 'school leadership is composed of individuals with extensive professional service.',
      teachersMeans: 'many teachers are in the middle stage of their professional careers',
      teachersImplies: 'the teaching workforce consists of educators who already possess practical classroom experience while continuing to develop their professional skills.'
    },
    inServiceTraining: {
      sectionTitle: 'Respondents as to Level of In-Service Training Attended',
      headsIntro: 'Considering the level of in-service training attended, ',
      headsIntroAlternatives: [
        'Considering the level of in-service training attended, ', 'Regarding the level of in-service training attended, ', 'As to the level of in-service training attended, '
      ],
      headsMeans: 'professional development activities are commonly organized within the division level',
      headsImplies: 'school leaders continuously improve their competencies through locally conducted training programs.',
      teachersMeans: 'most professional development opportunities are conducted within the division',
      teachersImplies: 'teachers frequently engage in locally organized training activities to improve their instructional practices.',
      useAttendedFormat: true
    }
  };

  /** Build two implication sentences for profile, contextual to dominant category. No "may". */
  function buildProfileImplications(dominantLabels) {
    if (!dominantLabels || dominantLabels.length === 0) return { first: '', second: '' };
    var catPhrase = dominantLabels.length === 1 ? dominantLabels[0] : joinWithAnd(dominantLabels);
    var catLower = catPhrase.toLowerCase();
    var first = 'This indicates that the respondent group is largely composed of ' + catLower + ' participants.';
    var second = 'This further implies that the findings mainly reflect the perspectives of ' + catLower + ' respondents.';
    return { first: first, second: second };
  }

  function buildTwoGroupProfileInterpretation(table, variantIndex, lastOpener) {
    if (!table || !table.rows || !table.rows.length) return '';
    var tableId = table.id || '';
    var cfg = RP2_PROFILE_CONFIG[tableId] || null;
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var includeImplications = true;
    var implEl = document.getElementById('pa-include-implications');
    if (implEl) includeImplications = implEl.checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;
    var sumH = 0, sumT = 0;
    table.rows.forEach(function (r) {
      sumH += (r.heads && r.heads.f) || 0;
      sumT += (r.teachers && r.teachers.f) || 0;
    });
    if (sumH <= 0 && sumT <= 0) return '';

    var distHeads;
    var distTeachers;
    if (cfg && cfg.useAttendedFormat) {
      distHeads = sumH > 0 ? buildTwoGroupInServiceSentence(table.rows, 'heads', 'school heads') : '';
      distTeachers = sumT > 0 ? buildTwoGroupInServiceSentence(table.rows, 'teachers', 'teachers') : '';
    } else {
      var ofHeads = (tableId === 'gender') ? ' of the school heads' : '';
      distHeads = sumH > 0 ? buildTwoGroupDistributionSentence(table.rows, 'heads', sumH, ofHeads) : '';
      distTeachers = sumT > 0 ? buildTwoGroupDistributionSentence(table.rows, 'teachers', sumT, '') : '';
    }

    // Identify dominant categories per group for the "highest proportion" sentence.
    var maxH = 0, domH = [];
    var maxT = 0, domT = [];
    table.rows.forEach(function (r) {
      var fh = (r.heads && r.heads.f) || 0;
      var ft = (r.teachers && r.teachers.f) || 0;
      if (fh > maxH) { maxH = fh; domH = [r.category]; } else if (fh === maxH && fh > 0) domH.push(r.category);
      if (ft > maxT) { maxT = ft; domT = [r.category]; } else if (ft === maxT && ft > 0) domT.push(r.category);
    });

    var domHeadsPhrase = domH.length ? joinWithAnd(domH) : '';
    var domTeachersPhrase = domT.length ? joinWithAnd(domT) : '';
    var headsMeans = cfg && cfg.headsMeans ? cfg.headsMeans : '';
    var headsImplies = cfg && cfg.headsImplies ? cfg.headsImplies : '';
    var teachersMeans = cfg && cfg.teachersMeans ? cfg.teachersMeans : '';
    var teachersImplies = cfg && cfg.teachersImplies ? cfg.teachersImplies : '';
    var headsMajority = '';
    var teachersMajority = '';
    if (cfg && cfg.useAttendedFormat) {
      headsMajority = domHeadsPhrase ? 'The majority of the school heads attended ' + domHeadsPhrase.toLowerCase().replace(/\s+level$/i, '') + ' level training' : '';
      teachersMajority = domTeachersPhrase ? 'The majority of the teachers attended ' + domTeachersPhrase.toLowerCase().replace(/\s+level$/i, '') + ' level training' : '';
    } else if (cfg && cfg.headsMajorityPhrase) {
      headsMajority = 'The majority of the school heads are ' + cfg.headsMajorityPhrase;
      teachersMajority = domTeachersPhrase ? 'The majority of the teachers are ' + domTeachersPhrase.toLowerCase() : '';
    } else if (cfg && cfg.headsMajorityVerb && domHeadsPhrase) {
      headsMajority = 'The majority of the school heads ' + cfg.headsMajorityVerb + ' ' + domHeadsPhrase.toLowerCase();
      teachersMajority = (cfg.teachersMajorityVerb && domTeachersPhrase) ? 'The majority of the teachers ' + cfg.teachersMajorityVerb + ' ' + domTeachersPhrase.toLowerCase() : (domTeachersPhrase ? 'The majority of the teachers are ' + domTeachersPhrase.toLowerCase() : '');
    } else {
      headsMajority = domHeadsPhrase ? 'The majority of the school heads are ' + domHeadsPhrase.toLowerCase() : '';
      teachersMajority = domTeachersPhrase ? 'The majority of the teachers are ' + domTeachersPhrase.toLowerCase() : '';
    }

    var headsIntro = cfg && cfg.headsIntro ? cfg.headsIntro : 'Regarding the respondents, ';
    if (!cfg || !cfg.headsIntro) {
      if (tableId === 'age') {
      headsIntro = 'Age stratification reveals that among the school heads, ';
    } else if (tableId === 'gender') {
      headsIntro = 'The table reveals that among the school heads, ';
    } else if (tableId === 'civilStatus') {
      headsIntro = 'With regards to the civil status, the school heads consist of ';
    } else if (tableId === 'education') {
      headsIntro = 'As to the highest educational attainment, the school heads consist of ';
    } else if (tableId === 'position') {
      headsIntro = 'About the respondents’ present position, the school heads consist of ';
    } else if (tableId === 'rating') {
      headsIntro = 'Regarding the respondents’ latest performance rating, ';
    } else if (tableId === 'yearsService') {
      headsIntro = 'Pertaining to the respondents’ number of years in service, the school heads consist of ';
    } else if (tableId === 'inServiceTraining') {
      headsIntro = 'The table shows that, for the school head group, ';
    } else {
      // Fallback to varied academic opener if a new two-group table is added in the future.
      var opener = Gen
        ? Gen.getOpenerForVariant(vi, lastOpener)
        : (Utils ? Utils.getVariedOpener() : 'Regarding ');
      var subject = (table.title || 'the variable').toLowerCase().replace(/^table \d+\.\s*/i, '');
      headsIntro = opener + subject + ', ';
    }
    } else if (Gen && cfg && cfg.headsIntroAlternatives && cfg.headsIntroAlternatives.length) {
      headsIntro = cfg.headsIntroAlternatives[Math.abs(vi) % cfg.headsIntroAlternatives.length];
    }

    var impliesLead = (Gen && includeImplications) ? (Gen.getSynonym('indicatesLead', vi) || 'This indicates that') : 'This indicates that';
    var teachersTransition = (Gen && includeImplications)
      ? RP2_TEACHERS_TRANSITION_ALTERNATIVES[Math.abs(vi) % RP2_TEACHERS_TRANSITION_ALTERNATIVES.length]
      : 'For the teachers, ';
    var teachersImpliesLead = (Gen && includeImplications) ? (Gen.getSynonym('furtherLead', vi + 1) || 'This further implies that') : 'This implies that';

    var headsParagraph = '';
    if (sumH > 0 && distHeads && headsMajority && includeImplications && headsMeans && headsImplies) {
      headsParagraph = headsIntro + distHeads + ' ' + headsMajority + ' which means that ' + headsMeans + '. ' + impliesLead + ' ' + headsImplies;
    }

    var teachersParagraph = '';
    if (sumT > 0 && distTeachers && teachersMajority && includeImplications && teachersMeans && teachersImplies) {
      teachersParagraph = teachersTransition + distTeachers + ' ' + teachersMajority + ' which means that ' + teachersMeans + '. ' + teachersImpliesLead + ' ' + teachersImplies;
    }

    var paragraphs = [];
    if (headsParagraph) paragraphs.push(headsParagraph.trim());
    if (teachersParagraph) paragraphs.push(teachersParagraph.trim());
    return paragraphs.join('\n\n').trim();
  }

  /**
   * Build majority sentence for RP1 Tables 2–9 using table-specific prefix/suffix.
   */
  function buildR31MajoritySentence(dominantLabels, cfg) {
    var cat = dominantLabels.length === 1
      ? dominantLabels[0]
      : joinWithAnd(dominantLabels);
    var catLower = cat.toLowerCase();
    if (cfg.majorityReceived) {
      var article = /^[aeiou]/.test(catLower) ? 'an ' : 'a ';
      return 'The majority of the respondents received ' + article + catLower + ' rating.';
    }
    if (cfg.useAttendedFormat) {
      return 'The majority of the respondents attended ' + catLower + '-level training.';
    }
    if (cfg.id === 'education' && /^with\s+/i.test(catLower)) {
      return 'The majority of the respondents are those with ' + catLower.replace(/^with\s+/, '') + '.';
    }
    var prefix = cfg.majorityPrefix || 'are ';
    var suffix = cfg.majoritySuffix || '.';
    return 'The majority of the respondents ' + prefix + catLower + suffix;
  }

  function buildInterpretationText(rows, tableTitle, variantIndex, lastOpener, explicitTableKey) {
    if (!rows.length) return '';

    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var includeImplications = true;
    var implEl = document.getElementById('pa-include-implications');
    if (implEl) includeImplications = implEl.checked;

    var effectiveRows = rows.filter(function (r) { return r.frequency > 0; });
    if (!effectiveRows.length) return '';

    var total = effectiveRows.reduce(function (sum, r) { return sum + r.frequency; }, 0);
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var tableKey = explicitTableKey || (currentTableConfig && currentTableConfig.id ? currentTableConfig.id : '');
    var rp1Cfg = tableKey && RP1_INTERPRETATION_CONFIG[tableKey] ? RP1_INTERPRETATION_CONFIG[tableKey] : null;

    if (rp1Cfg) {
      var NUM_V = typeof ThesisTextGenerator !== 'undefined' && ThesisTextGenerator.NUM_VARIATIONS ? ThesisTextGenerator.NUM_VARIATIONS : 20;
      var slot = Math.abs(vi) % NUM_V;
      var opener = rp1Cfg.opener;
      if (rp1Cfg.openerAlternatives) {
        if (rp1Cfg.openerAlternatives.length >= NUM_V) {
          opener = rp1Cfg.openerAlternatives[slot];
        } else if (rp1Cfg.openerAlternatives.length > 0) {
          var PA_LEADS = ['In terms of ', 'Regarding ', 'As to ', 'In relation to ', 'Concerning ', 'Relative to ', 'With reference to ', 'Pertaining to ', 'About the ', 'Considering ', 'Focusing on ', 'With respect to ', 'With regard to ', 'In connection with ', 'In the context of ', 'With attention to ', 'In view of ', 'In light of ', 'As regards ', 'Touching on '];
          var first = rp1Cfg.openerAlternatives[0];
          var stem = first;
          for (var k = 0; k < PA_LEADS.length; k++) {
            if (first.indexOf(PA_LEADS[k]) === 0) {
              stem = first.slice(PA_LEADS[k].length).replace(/\s*,\s*$/, '').trim();
              break;
            }
          }
          opener = PA_LEADS[slot % PA_LEADS.length] + stem + ', ';
        }
      }
      var distParts;
      if (rp1Cfg.useAttendedFormat) {
        distParts = effectiveRows.map(function (r) {
          var n = r.frequency;
          return n === 1
            ? '1 respondent attended ' + r.category.toLowerCase() + ' training'
            : n + ' attended ' + r.category.toLowerCase() + ' training';
        });
      } else {
        distParts = effectiveRows.map(function (r) {
          var pct = (r.frequency / total) * 100;
          return formatFreqPercent(r.frequency, pct) + ' are ' + r.category.toLowerCase();
        });
      }
      var sent1;
      if (distParts.length === 2) {
        sent1 = opener + distParts[0] + ' while ' + distParts[1] + '.';
      } else if (distParts.length >= 3) {
        sent1 = opener + distParts.slice(0, -1).join(', ') + ', and ' + distParts[distParts.length - 1] + '.';
      } else {
        sent1 = opener + distParts[0] + '.';
      }

      var maxFreq = 0;
      effectiveRows.forEach(function (r) {
        if (r.frequency > maxFreq) maxFreq = r.frequency;
      });
      var dominant = effectiveRows.filter(function (r) { return r.frequency === maxFreq; });
      var dominantLabels = dominant.map(function (r) { return r.category; });
      var sent2 = buildR31MajoritySentence(dominantLabels, rp1Cfg);

      var text = sent1 + ' ' + sent2;
      if (includeImplications && rp1Cfg.indicates) {
        var lead1 = Gen ? (Gen.getSynonym('indicatesLead', vi) || 'This indicates that') : 'This indicates that';
        var rest1 = rp1Cfg.indicates.replace(/^This (indicates|suggests|implies) that\s+/i, '');
        text += ' ' + lead1 + ' ' + rest1;
      }
      if (includeImplications && rp1Cfg.implies) {
        var lead2 = Gen ? (Gen.getSynonym('furtherLead', vi + 1) || 'This further implies that') : 'This further implies that';
        var rest2 = rp1Cfg.implies.replace(/^This further (implies|suggests|indicates) that\s+/i, '');
        text += ' ' + lead2 + ' ' + rest2;
      }
      return text.trim();
    }

    var opener = Gen
      ? Gen.getOpenerForVariant(vi, lastOpener)
      : (Utils ? Utils.getVariedOpener() : 'Regarding ');
    var subject = 'the distribution';
    if (tableTitle) {
      var asToMatch = tableTitle.match(/as to\s+(.+?)(?:\s*$|,)/i);
      if (asToMatch) {
        subject = 'the ' + asToMatch[1].toLowerCase().replace(/\.$/, '').trim() + ' of the respondents';
      } else {
        var tblMatch = tableTitle.match(/Table \d+\.\s*(.+)/i);
        var raw = tblMatch ? tblMatch[1] : tableTitle;
        subject = raw.toLowerCase().replace(/\.$/, '').trim();
        if (subject && subject.indexOf('the ') !== 0) subject = 'the ' + subject;
      }
    }
    var opening = opener + subject + ', ';

    var distParts = effectiveRows.map(function (r) {
      var pct = (r.frequency / total) * 100;
      return formatFreqPercent(r.frequency, pct) + ' are ' + r.category.toLowerCase();
    });
    var sent1;
    if (distParts.length === 2) {
      sent1 = opening + distParts[0] + ' while ' + distParts[1] + '.';
    } else if (distParts.length >= 3) {
      sent1 = opening + distParts.slice(0, -1).join(', ') + ', and ' + distParts[distParts.length - 1] + '.';
    } else {
      sent1 = opening + distParts[0] + '.';
    }

    var maxFreq = 0;
    effectiveRows.forEach(function (r) {
      if (r.frequency > maxFreq) maxFreq = r.frequency;
    });
    var dominant = effectiveRows.filter(function (r) { return r.frequency === maxFreq; });
    var dominantLabels = dominant.map(function (r) { return r.category; });
    var sent2 = 'The majority of the respondents are ' + (dominantLabels.length === 1
      ? dominantLabels[0].toLowerCase()
      : joinWithAnd(dominantLabels).toLowerCase()) + '.';

    var text = sent1 + ' ' + sent2;
    if (includeImplications) {
      var impl = buildProfileImplications(dominantLabels);
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text.trim();
  }

  /**
   * Generate interpretation using automatic table type detection.
   * Routes to single-profile or two-group-profile builder based on loaded columns.
   */
  function generateInterpretation(rows, tableTitle) {
    var tableData = currentProject2Table && currentProject2Table.rows && currentProject2Table.rows.length
      ? { rows: currentProject2Table.rows }
      : { rows: rows || [] };
    var detectedType = getDetectedProfileTableType();
    var text = detectedType === 'two-group-profile' && currentProject2Table
      ? buildTwoGroupProfileInterpretation(currentProject2Table)
      : buildInterpretationText(rows || [], tableTitle);
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = text;
    return text;
  }

  /**
   * Detect profile table type from current data.
   * Uses structure: two-group has rows with heads/teachers; single has frequency.
   */
  function getDetectedProfileTableType() {
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    if (Gen && Gen.detectTableType) {
      if (currentProject2Table && currentProject2Table.rows && currentProject2Table.rows.length) {
        return Gen.detectTableType(currentProject2Table, 'profile');
      }
      if (computedRows && computedRows.length) {
        return Gen.detectTableType({ rows: computedRows }, 'profile');
      }
    }
    if (currentProject2Table && currentProject2Table.rows && currentProject2Table.rows[0] && currentProject2Table.rows[0].heads && currentProject2Table.rows[0].teachers) {
      return 'two-group-profile';
    }
    return 'single-profile';
  }

  function regenerateInterpretation() {
    var block = document.getElementById('pa-interpretation-block');
    if (!block) return;

    var tableType = getDetectedProfileTableType();
    var isTwoGroup = tableType === 'two-group-profile';

    try {
      var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
      if (!Gen) {
        if (isTwoGroup && currentProject2Table) {
          block.textContent = buildTwoGroupProfileInterpretation(currentProject2Table) || '';
        } else if (computedRows.length) {
          generateInterpretation(computedRows, currentTableTitle);
        }
        showToast('Interpretation regenerated.');
        return;
      }

      var tableId = (currentTableTitle || (currentProject2Table && currentProject2Table.title) || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      var generator = function (vi, lastOpener) {
        if (isTwoGroup && currentProject2Table) {
          return buildTwoGroupProfileInterpretation(currentProject2Table, vi, lastOpener);
        }
        return buildInterpretationText(computedRows, currentTableTitle, vi, lastOpener);
      };
      var result = Gen.generateWithVariation(generator, 'profile', tableId);
      var text = result && typeof result.text === 'string' ? result.text : '';
      block.textContent = text;
      showToast('Interpretation regenerated.');
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('Regenerate error:', e);
      showToast('Regenerate failed. Please try again.', true);
    }
  }

  /**
   * Copy All: table title + full table (no inputs/buttons) + interpretation as rich HTML for Word.
   * Disabled when nothing is computed; shows message if user clicks before computing.
   * Reads table from the displayed DOM to ensure all visible rows and columns are copied.
   */
  function copyInterpretation() {
    var block = document.getElementById('pa-interpretation-block');
    var interpText = block && block.textContent ? block.textContent.trim() : '';
    if (!interpText) {
      showToast('Please compute and generate the interpretation first before copying.', true);
      return;
    }
    var titleEl = document.getElementById('pa-table-title');
    var tableTitle = (titleEl && titleEl.value) ? titleEl.value.trim() : '';
    var tableHtml = '';
    var tablePlain = '';

    if (activeProjectId === 'rp2' && currentProject2Table && currentProject2Table.rows && currentProject2Table.rows.length) {
      syncTwoGroupFromDom();
      var sumH = 0, sumT = 0;
      currentProject2Table.rows.forEach(function (r) {
        sumH += (r.heads && typeof r.heads.f === 'number') ? r.heads.f : 0;
        sumT += (r.teachers && typeof r.teachers.f === 'number') ? r.teachers.f : 0;
      });
      var rankMapH = computeDenseRanks(currentProject2Table.rows, function (r) { return r.heads && r.heads.f; });
      var rankMapT = computeDenseRanks(currentProject2Table.rows, function (r) { return r.teachers && r.teachers.f; });
      var shPctText = (currentProject2Table.type === 'twoGroupPercent' && sumH > 0) || (computeTable9Percent && sumH > 0) ? '100.00' : '—';
      var tPctText = (currentProject2Table.type === 'twoGroupPercent' && sumT > 0) || (computeTable9Percent && sumT > 0) ? '100.00' : '—';
      tableHtml =
        '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">' +
        '<thead><tr><th style="border: 1px solid #000; text-align: center; width: 2em;">No.</th><th style="border: 1px solid #000; text-align: left;">Particulars</th>' +
        '<th colspan="3" style="border: 1px solid #000; text-align: center;">School Heads</th>' +
        '<th colspan="3" style="border: 1px solid #000; text-align: center;">Teachers</th></tr>' +
        '<tr><th style="border: 1px solid #000;"></th><th style="border: 1px solid #000;"></th>' +
        '<th style="border: 1px solid #000;">f</th><th style="border: 1px solid #000;">Percentage</th><th style="border: 1px solid #000;">Rank</th>' +
        '<th style="border: 1px solid #000;">f</th><th style="border: 1px solid #000;">Percentage</th><th style="border: 1px solid #000;">Rank</th></tr></thead><tbody>';
      tablePlain = 'No.\tParticulars\tSchool Heads (f)\t%\tRank\tTeachers (f)\t%\tRank\n';
      currentProject2Table.rows.forEach(function (row, idx) {
        var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
        var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
        var hPct = row.heads && typeof row.heads.pct === 'number' ? row.heads.pct.toFixed(2) : '';
        var tPct = row.teachers && typeof row.teachers.pct === 'number' ? row.teachers.pct.toFixed(2) : '';
        var hRank = rankMapH[idx] || '';
        var tRank = rankMapT[idx] || '';
        var no = idx + 1;
        tableHtml += '<tr><td style="border: 1px solid #000; text-align: center;">' + no + '</td><td style="border: 1px solid #000;">' + escapeHtml(row.category) + '</td>' +
          '<td style="border: 1px solid #000; text-align: right;">' + hF + '</td><td style="border: 1px solid #000; text-align: right;">' + hPct + '</td><td style="border: 1px solid #000; text-align: center;">' + hRank + '</td>' +
          '<td style="border: 1px solid #000; text-align: right;">' + tF + '</td><td style="border: 1px solid #000; text-align: right;">' + tPct + '</td><td style="border: 1px solid #000; text-align: center;">' + tRank + '</td></tr>';
        tablePlain += no + '\t' + (row.category || '') + '\t' + hF + '\t' + hPct + '\t' + hRank + '\t' + tF + '\t' + tPct + '\t' + tRank + '\n';
      });
      tableHtml += '</tbody><tfoot><tr><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"><strong>TOTAL</strong></td>' +
        '<td style="border: 1px solid #000; text-align: right;"><strong>' + sumH + '</strong></td><td style="border: 1px solid #000;"><strong>' + shPctText + '</strong></td><td style="border: 1px solid #000;"></td>' +
        '<td style="border: 1px solid #000; text-align: right;"><strong>' + sumT + '</strong></td><td style="border: 1px solid #000;"><strong>' + tPctText + '</strong></td><td style="border: 1px solid #000;"></td></tr></tfoot></table>';
      tablePlain += '\tTOTAL\t' + sumH + '\t' + shPctText + '\t\t' + sumT + '\t' + tPctText + '\n';
    } else if (activeProjectId === 'rp1') {
      var tbody = document.getElementById('pa-table-tbody');
      var totalFreqEl = document.getElementById('pa-total-freq');
      var totalPctEl = document.getElementById('pa-total-pct');
      if (!tbody || !tbody.querySelectorAll('tr').length) {
        showToast('Please compute and generate the interpretation first before copying.', true);
        return;
      }
      var rows = [];
      tbody.querySelectorAll('tr').forEach(function (tr) {
        var catEl = tr.querySelector('[data-pa-category]');
        var freqEl = tr.querySelector('[data-pa-freq]');
        var pctEl = tr.querySelector('[data-pa-pct]');
        var rankEl = tr.querySelector('[data-pa-rank]');
        var category = (catEl && catEl.value != null) ? String(catEl.value).trim() : '';
        var freq = (freqEl && freqEl.value != null) ? (parseInt(String(freqEl.value), 10) || 0) : 0;
        var pct = (pctEl && pctEl.textContent != null) ? String(pctEl.textContent).trim() : '—';
        var rank = (rankEl && rankEl.textContent != null) ? String(rankEl.textContent).trim() : '';
        rows.push({ category: category, frequency: freq, percentage: pct, rank: rank });
      });
      var total = totalFreqEl ? (parseInt(totalFreqEl.textContent, 10) || 0) : rows.reduce(function (s, r) { return s + (r.frequency || 0); }, 0);
      var totalPct = (totalPctEl && totalPctEl.textContent) ? totalPctEl.textContent.trim() : '100.00';
      tableHtml =
        '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">' +
        '<thead><tr><th style="border: 1px solid #000; text-align: center; width: 2em;">No.</th><th style="border: 1px solid #000; text-align: left;">Particulars</th>' +
        '<th style="border: 1px solid #000; text-align: right;">Frequency (f)</th>' +
        '<th style="border: 1px solid #000; text-align: right;">Percentage</th>' +
        '<th style="border: 1px solid #000; text-align: center;">Rank</th></tr></thead><tbody>';
      tablePlain = 'No.\tParticulars\tFrequency (f)\tPercentage\tRank\n';
      rows.forEach(function (r, idx) {
        var no = idx + 1;
        tableHtml += '<tr><td style="border: 1px solid #000; text-align: center;">' + no + '</td><td style="border: 1px solid #000;">' + escapeHtml(r.category) + '</td>' +
          '<td style="border: 1px solid #000; text-align: right;">' + r.frequency + '</td>' +
          '<td style="border: 1px solid #000; text-align: right;">' + (r.percentage || '—') + '</td>' +
          '<td style="border: 1px solid #000; text-align: center;">' + (r.rank || '') + '</td></tr>';
        tablePlain += no + '\t' + (r.category || '') + '\t' + (r.frequency || '') + '\t' + (r.percentage || '') + '\t' + (r.rank || '') + '\n';
      });
      tableHtml += '</tbody><tfoot><tr><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"><strong>TOTAL</strong></td>' +
        '<td style="border: 1px solid #000; text-align: right;"><strong>' + total + '</strong></td>' +
        '<td style="border: 1px solid #000; text-align: right;"><strong>' + totalPct + '</strong></td>' +
        '<td style="border: 1px solid #000;"></td></tr></tfoot></table>';
      tablePlain += '\tTOTAL\t' + total + '\t' + totalPct + '\n';
    } else {
      showToast('Please compute and generate the interpretation first before copying.', true);
      return;
    }

    var titleHtml = tableTitle ? '<p style="margin-bottom: 0.5em; font-weight: bold;">' + escapeHtml(tableTitle) + '</p>' : '';
    var interpHtml = '<p style="margin-top: 1em;">' + escapeHtml(interpText).replace(/\n/g, '<br>') + '</p>';
    var fullHtml = titleHtml + tableHtml + interpHtml;
    var fullPlain = (tableTitle ? tableTitle + '\n\n' : '') + tablePlain + '\n' + interpText;

    copyRichToClipboard(fullHtml, fullPlain);
  }

  function copyRichToClipboard(html, plain) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      navigator.clipboard.writeText(plain).then(function () { showToast('Copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
      return;
    }
    var blobHtml = new Blob([html], { type: 'text/html' });
    var blobPlain = new Blob([plain], { type: 'text/plain' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })
    ]).then(function () {
      showToast('Copied! Paste into Word to keep table format.');
    }).catch(function () {
      navigator.clipboard.writeText(plain).then(function () { showToast('Copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
    });
  }

  function saveToReport() {
    var interpretation = document.getElementById('pa-interpretation-block');
    var text = interpretation && interpretation.textContent ? interpretation.textContent.trim() : '';
    var tables = getProfileTables();
    var toSave = null;

    if (activeProjectId === 'rp2' && currentProject2Table) {
      syncTwoGroupFromDom();
      var sumH = 0, sumT = 0;
      currentProject2Table.rows.forEach(function (r) {
        sumH += (r.heads && r.heads.f) || 0;
        sumT += (r.teachers && r.teachers.f) || 0;
      });
      toSave = {
        projectId: activeProjectId || 'rp1',
        tableTitle: currentTableTitle,
        subject: 'respondents',
        type: 'twoGroup',
        rows: currentProject2Table.rows.map(function (r) {
          return {
            category: r.category,
            heads: r.heads ? { f: r.heads.f, pct: r.heads.pct } : {},
            teachers: r.teachers ? { f: r.teachers.f, pct: r.teachers.pct } : {}
          };
        }),
        totals: { heads: sumH, teachers: sumT },
        interpretation: text,
        createdAt: Date.now()
      };
    } else if (computedRows.length) {
      var totalFreq = computedRows.reduce(function (s, r) { return s + r.frequency; }, 0);
      toSave = {
        projectId: activeProjectId || 'rp1',
        tableTitle: currentTableTitle,
        subject: 'respondents',
        type: 'singleGroup',
        rows: computedRows.map(function (r) {
          return { category: r.category, frequency: r.frequency, percentage: r.percentage, rank: r.rank };
        }),
        totals: { totalFrequency: totalFreq, totalPercentage: 100 },
        interpretation: text,
        createdAt: Date.now()
      };
    }
    if (!toSave) return;
    tables.push(toSave);
    try {
      localStorage.setItem(KEYS.profileTables, JSON.stringify(tables));
    } catch (e) {
      showToast('Save failed.', true);
      return;
    }

    var totalRespondents = toSave.totals.totalFrequency || (toSave.totals.heads || 0) + (toSave.totals.teachers || 0);
    setNumber(KEYS.tablesProcessed, getNumber(KEYS.tablesProcessed) + 1);
    setNumber(KEYS.respondentsEncoded, getNumber(KEYS.respondentsEncoded) + totalRespondents);
    setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + 1);
    localStorage.setItem('profileDataSaved', 'true');
    appendActivity('Saved profile table: ' + (currentTableTitle || 'Untitled'));
    updateSessionProgress();
    renderSavedProfileTables();
    showToast('Table saved.');
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
    var totalFreqEl = document.getElementById('pa-total-freq');
    var totalPctEl = document.getElementById('pa-total-pct');
    if (totalFreqEl) totalFreqEl.textContent = '—';
    if (totalPctEl) totalPctEl.textContent = '—';
  }

  function renderTwoGroupOutputPlaceholder() {
    var thead = document.getElementById('pa-output-thead');
    var tbody = document.getElementById('pa-output-tbody');
    var tfoot = document.getElementById('pa-output-tfoot');
    var tableWrap = document.getElementById('pa-two-group-wrap');
    if (tableWrap) tableWrap.classList.remove('pa-thesis-table--two-group');
    if (thead) thead.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';
    if (tbody) tbody.innerHTML = '';
  }

  function computeDenseRanks(rows, getFreq) {
    var sorted = rows.slice().sort(function (a, b) { return (getFreq(b) || 0) - (getFreq(a) || 0); });
    var rank = 1;
    var map = {};
    for (var i = 0; i < sorted.length; i++) {
      if (i > 0 && getFreq(sorted[i]) < getFreq(sorted[i - 1])) rank = i + 1;
      var idx = rows.indexOf(sorted[i]);
      if (idx >= 0) map[idx] = rank;
    }
    return map;
  }

  // ---------- Two-group (School Heads vs Teachers) rendering ----------
  var profileTwoGroupComputed = false;

  function removeTwoGroupRow(rowIndex) {
    if (!currentProject2Table || !currentProject2Table.rows || rowIndex < 0 || rowIndex >= currentProject2Table.rows.length) return;
    currentProject2Table.rows.splice(rowIndex, 1);
    renderTwoGroupTable(currentProject2Table, { showComputed: profileTwoGroupComputed });
    showToast('Row removed.');
  }

  function renderTwoGroupTable(table, opts) {
    opts = opts || {};
    var showComputed = opts.showComputed === true;
    profileTwoGroupComputed = showComputed;

    var thead = document.getElementById('pa-output-thead');
    var tbody = document.getElementById('pa-output-tbody');
    var tfoot = document.getElementById('pa-output-tfoot');
    var tableWrap = document.getElementById('pa-two-group-wrap');
    if (!tbody || !table || !thead || !tfoot) return;

    if (tableWrap) tableWrap.classList.add('pa-thesis-table--two-group');

    thead.innerHTML =
      '<tr class="pa-thesis-table__group-row">' +
        '<th rowspan="2" class="pa-thesis-table__th pa-thesis-table__th--no" scope="col">No.</th>' +
        '<th rowspan="2" class="pa-thesis-table__th pa-thesis-table__th--particulars" scope="col">Particulars</th>' +
        '<th colspan="3" class="pa-thesis-table__th pa-thesis-table__th--group" scope="colgroup">School Heads</th>' +
        '<th colspan="3" class="pa-thesis-table__th pa-thesis-table__th--group" scope="colgroup">Teachers</th>' +
        '<th rowspan="2" class="pa-thesis-table__th pa-thesis-table__th--action" scope="col">Remove</th>' +
      '</tr>' +
      '<tr class="pa-thesis-table__subhead-row">' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--f" scope="col">f</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--pct" scope="col">Percentage</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--rank" scope="col">Rank</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--f" scope="col">f</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--pct" scope="col">Percentage</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--rank" scope="col">Rank</th>' +
      '</tr>';

    tbody.innerHTML = '';
    var sumHeads = 0;
    var sumTeachers = 0;

    table.rows.forEach(function (row) {
      var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
      var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
      sumHeads += hF;
      sumTeachers += tF;
    });

    var rankMapH = showComputed ? computeDenseRanks(table.rows, function (r) { return r.heads && r.heads.f; }) : {};
    var rankMapT = showComputed ? computeDenseRanks(table.rows, function (r) { return r.teachers && r.teachers.f; }) : {};

    table.rows.forEach(function (row, idx) {
      var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
      var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
      var hPct = showComputed && row.heads && typeof row.heads.pct === 'number' ? row.heads.pct.toFixed(2) : '';
      var tPct = showComputed && row.teachers && typeof row.teachers.pct === 'number' ? row.teachers.pct.toFixed(2) : '';
      var hRank = showComputed ? (rankMapH[idx] || '') : '—';
      var tRank = showComputed ? (rankMapT[idx] || '') : '—';
      if (!showComputed) { hPct = '—'; tPct = '—'; }

      var catVal = (row.category != null ? String(row.category) : '');
      var catAttr = escapeHtml(catVal).replace(/"/g, '&quot;');

      var tr = document.createElement('tr');
      tr.setAttribute('data-pa-two-row', String(idx));
      tr.innerHTML =
        '<td class="pa-thesis-table__td pa-thesis-table__td--no">' + (idx + 1) + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--particulars"><input type="text" class="pa-thesis-input pa-thesis-input--category" data-pa-category value="' + catAttr + '" placeholder="Particulars"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--f"><input type="number" class="pa-thesis-input" step="1" min="0" data-pa-h-f value="' + hF + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--pct"><input type="text" class="pa-thesis-input" readonly data-pa-h-pct value="' + (hPct || '—') + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--rank">' + (hRank || '—') + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--f"><input type="number" class="pa-thesis-input" step="1" min="0" data-pa-t-f value="' + tF + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--pct"><input type="text" class="pa-thesis-input" readonly data-pa-t-pct value="' + (tPct || '—') + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--rank">' + (tRank || '—') + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--action"><button type="button" class="pa-row-remove" aria-label="Remove row" data-pa-two-remove>×</button></td>';
      tbody.appendChild(tr);
      var removeBtn = tr.querySelector('[data-pa-two-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          removeTwoGroupRow(idx);
        });
      }
    });

    if (showComputed && autoPercentTwoGroup && table.type === 'twoGroupPercent' && (sumHeads > 0 || sumTeachers > 0)) {
      table.rows.forEach(function (row, idx) {
        var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
        var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
        var hPctVal = sumHeads > 0 ? Math.round((hF / sumHeads) * 10000) / 100 : 0;
        var tPctVal = sumTeachers > 0 ? Math.round((tF / sumTeachers) * 10000) / 100 : 0;
        row.heads.pct = hPctVal;
        row.teachers.pct = tPctVal;
        var tr = tbody.querySelector('tr[data-pa-two-row="' + idx + '"]');
        if (tr) {
          var hPctInput = tr.querySelector('[data-pa-h-pct]');
          var tPctInput = tr.querySelector('[data-pa-t-pct]');
          if (hPctInput) hPctInput.value = hPctVal.toFixed(2);
          if (tPctInput) tPctInput.value = tPctVal.toFixed(2);
        }
      });
    } else if (showComputed && table.type === 'twoGroupMention' && computeTable9Percent && (sumHeads > 0 || sumTeachers > 0)) {
      table.rows.forEach(function (row, idx) {
        var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
        var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
        var hPctVal = sumHeads > 0 ? Math.round((hF / sumHeads) * 10000) / 100 : 0;
        var tPctVal = sumTeachers > 0 ? Math.round((tF / sumTeachers) * 10000) / 100 : 0;
        row.heads.pct = hPctVal;
        row.teachers.pct = tPctVal;
        var tr = tbody.querySelector('tr[data-pa-two-row="' + idx + '"]');
        if (tr) {
          var hPctInput = tr.querySelector('[data-pa-h-pct]');
          var tPctInput = tr.querySelector('[data-pa-t-pct]');
          if (hPctInput) hPctInput.value = hPctVal.toFixed(2);
          if (tPctInput) tPctInput.value = tPctVal.toFixed(2);
        }
      });
    }

    var totalHeadsF = showComputed ? String(sumHeads) : '—';
    var totalTeachersF = showComputed ? String(sumTeachers) : '—';
    var shPctText = showComputed && ((table.type === 'twoGroupPercent' && sumHeads > 0) || (computeTable9Percent && sumHeads > 0)) ? '100.00' : '—';
    var tPctText = showComputed && ((table.type === 'twoGroupPercent' && sumTeachers > 0) || (computeTable9Percent && sumTeachers > 0)) ? '100.00' : '—';

    tfoot.innerHTML =
      '<tr class="pa-thesis-table__footer-row">' +
        '<td class="pa-thesis-table__footer-value"></td>' +
        '<td class="pa-thesis-table__footer-label"><strong>TOTAL</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-heads-f">' + totalHeadsF + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-heads-pct">' + shPctText + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-teachers-f">' + totalTeachersF + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-teachers-pct">' + tPctText + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
      '</tr>';

    updateLiveTotals(sumHeads + sumTeachers, showComputed ? '100.00' : '—');
    bindTwoGroupInputListeners();

    var interpText = showComputed ? buildTwoGroupProfileInterpretation(table) : '';
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = interpText;
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveTableBtn = document.getElementById('pa-save-table');
    var saveTableBtnTwo = document.getElementById('pa-save-table-two');
    var restoreBtnTwo = document.getElementById('pa-restore-original-two');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = !interpText;
    if (saveTableBtn) saveTableBtn.disabled = !interpText;
    if (saveTableBtnTwo) saveTableBtnTwo.disabled = !interpText;
    if (restoreBtnTwo) restoreBtnTwo.disabled = false;
    if (regenBtn) regenBtn.disabled = !interpText;
  }

  function syncTwoGroupFromDom() {
    if (!currentProject2Table || !currentProject2Table.rows) return;
    var tbody = document.getElementById('pa-output-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(function (tr, idx) {
      var row = currentProject2Table.rows[idx];
      if (!row) return;
      var catInp = tr.querySelector('[data-pa-category]');
      var hFInp = tr.querySelector('[data-pa-h-f]');
      var tFInp = tr.querySelector('[data-pa-t-f]');
      if (catInp && catInp.value != null) row.category = (catInp.value || '').trim();
      row.heads = row.heads || {};
      row.teachers = row.teachers || {};
      row.heads.f = hFInp ? (parseInt(hFInp.value || '0', 10) || 0) : (row.heads.f || 0);
      row.teachers.f = tFInp ? (parseInt(tFInp.value || '0', 10) || 0) : (row.teachers.f || 0);
    });
  }

  function bindTwoGroupInputListeners() {
    var tbody = document.getElementById('pa-output-tbody');
    if (!tbody || !currentProject2Table) return;
    tbody.querySelectorAll('input[data-pa-h-f], input[data-pa-t-f], input[data-pa-category]').forEach(function (inp) {
      inp.removeEventListener('input', onTwoGroupInputChange);
      inp.addEventListener('input', onTwoGroupInputChange);
    });
  }
  function onTwoGroupInputChange() {
    if (!currentProject2Table) return;
    var tbody = document.getElementById('pa-output-tbody');
    if (!tbody) return;
    syncTwoGroupFromDom();
    var sumHeads = 0, sumTeachers = 0;
    currentProject2Table.rows.forEach(function (row) {
      sumHeads += (row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0);
      sumTeachers += (row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0);
    });
    if (profileTwoGroupComputed) {
      profileTwoGroupComputed = false;
      tbody.querySelectorAll('tr').forEach(function (tr) {
        var hPctInp = tr.querySelector('[data-pa-h-pct]');
        var tPctInp = tr.querySelector('[data-pa-t-pct]');
        var rankCells = tr.querySelectorAll('.pa-thesis-table__td--rank');
        if (hPctInp) hPctInp.value = '—';
        if (tPctInp) tPctInp.value = '—';
        if (rankCells && rankCells.length >= 2) {
          rankCells[0].textContent = '—';
          rankCells[1].textContent = '—';
        }
      });
      var fSingle = document.getElementById('pa-total-heads-f');
      var fTeachers = document.getElementById('pa-total-teachers-f');
      var totalHeadsPct = document.getElementById('pa-total-heads-pct');
      var totalTeachersPct = document.getElementById('pa-total-teachers-pct');
      if (fSingle) fSingle.textContent = '—';
      if (fTeachers) fTeachers.textContent = '—';
      if (totalHeadsPct) totalHeadsPct.textContent = '—';
      if (totalTeachersPct) totalTeachersPct.textContent = '—';
      var block = document.getElementById('pa-interpretation-block');
      if (block) block.textContent = '';
      var copyBtn = document.getElementById('pa-copy-interpretation');
      var saveTableBtn = document.getElementById('pa-save-table');
      var saveTableBtnTwo = document.getElementById('pa-save-table-two');
      var regenBtn = document.getElementById('pa-regenerate-interpretation');
      if (copyBtn) copyBtn.disabled = true;
      if (saveTableBtn) saveTableBtn.disabled = true;
      if (saveTableBtnTwo) saveTableBtnTwo.disabled = true;
      if (regenBtn) regenBtn.disabled = true;
    }
    updateLiveTotals(sumHeads + sumTeachers, profileTwoGroupComputed ? '100.00' : '—');
  }

  function clearInputs() {
    var selectEl = document.getElementById('pa-table-select');
    var projectSelect = document.getElementById('pa-project-select');
    if (selectEl) selectEl.value = '';
    if (projectSelect) projectSelect.value = 'rp1';
    activeProjectId = 'rp1';
    showEmptyState();
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveTableBtn = document.getElementById('pa-save-table');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    var restoreBtn = document.getElementById('pa-restore-original');
    var computeBtn = document.getElementById('pa-compute');
    if (copyBtn) copyBtn.disabled = true;
    if (saveTableBtn) saveTableBtn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;
    if (restoreBtn) restoreBtn.disabled = true;
    if (computeBtn) computeBtn.disabled = true;
    setInterpretationTabsVisibility(false);
    onInputChange();
  }

  // ---------- Sample tables: build from hardcoded data ----------
  function buildProfileTableFromSample(sample) {
    var total = 0;
    sample.rows.forEach(function (r) {
      total += r.frequency;
    });
    if (total === 0) return null;

    var rows = sample.rows.map(function (r) {
      return {
        category: r.category,
        frequency: r.frequency,
        percentage: Math.round((r.frequency / total) * 10000) / 100
      };
    });

    var sorted = rows.slice().sort(function (a, b) {
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
    rows.forEach(function (r) {
      r.rank = rankMap[r.category];
    });

    var interpretation = buildInterpretationText(sorted, sample.defaultTitle, 0, null, sample.key);

    return {
      projectId: activeProjectId || 'rp1',
      tableTitle: sample.defaultTitle,
      subject: sample.subject || 'respondents',
      rows: rows,
      totals: {
        totalFrequency: total,
        totalPercentage: 100
      },
      interpretation: interpretation,
      createdAt: Date.now(),
      isSample: true,
      sampleKey: sample.key,
      sampleFlag: SAMPLE_FLAG
    };
  }

  function getSampleTablesFromStorage() {
    return getProfileTables().filter(function (t) {
      return t && t.isSample && t.sampleFlag === SAMPLE_FLAG;
    });
  }

  function loadSampleTables() {
    var existingSample = getSampleTablesFromStorage();
    if (existingSample.length > 0) {
      showToast('Sample records already loaded. Use "Clear Loaded Sample" to remove them.', true);
      return;
    }

    var profile = getProfileTables();
    var built = [];
    SAMPLE_TABLES.forEach(function (sample) {
      var obj = buildProfileTableFromSample(sample);
      if (obj) built.push(obj);
    });
    if (!built.length) {
      showToast('Could not load sample records.', true);
      return;
    }

    var newTables = profile.concat(built);
    try {
      localStorage.setItem(KEYS.profileTables, JSON.stringify(newTables));
    } catch (e) {
      showToast('Save failed. Storage not available.', true);
      return;
    }

    var addedTables = built.length;
    var addedRespondents = built.reduce(function (sum, t) {
      return sum + (t.totals && t.totals.totalFrequency ? t.totals.totalFrequency : 0);
    }, 0);

    setNumber(KEYS.tablesProcessed, getNumber(KEYS.tablesProcessed) + addedTables);
    setNumber(KEYS.respondentsEncoded, getNumber(KEYS.respondentsEncoded) + addedRespondents);
    setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + addedTables);
    localStorage.setItem('profileDataSaved', 'true');

    appendActivity('Loaded sample profile tables (Tables 2–9).');
    updateSessionProgress();
    renderSavedProfileTables();
    showToast('Sample records loaded as stacked cards.');
  }

  function adjustCountersForRemovedTables(removedTables) {
    if (!removedTables || !removedTables.length) return;
    var removedCount = removedTables.length;
    var removedRespondents = removedTables.reduce(function (sum, t) {
      return sum + (t.totals && t.totals.totalFrequency ? t.totals.totalFrequency : 0);
    }, 0);

    var tablesProcessed = getNumber(KEYS.tablesProcessed) - removedCount;
    var respondents = getNumber(KEYS.respondentsEncoded) - removedRespondents;
    var interpretations = getNumber(KEYS.interpretationsGenerated) - removedCount;

    setNumber(KEYS.tablesProcessed, tablesProcessed < 0 ? 0 : tablesProcessed);
    setNumber(KEYS.respondentsEncoded, respondents < 0 ? 0 : respondents);
    setNumber(KEYS.interpretationsGenerated, interpretations < 0 ? 0 : interpretations);
  }

  function clearLoadedSampleTables() {
    var all = getProfileTables();
    if (!all.length) {
      closeClearSampleModal();
      showToast('No sample tables to clear.');
      return;
    }

    var remaining = [];
    var removed = [];
    all.forEach(function (t) {
      if (t && t.isSample && t.sampleFlag === SAMPLE_FLAG) {
        removed.push(t);
      } else {
        remaining.push(t);
      }
    });

    if (!removed.length) {
      closeClearSampleModal();
      showToast('No sample tables to clear.');
      return;
    }

    try {
      localStorage.setItem(KEYS.profileTables, JSON.stringify(remaining));
    } catch (e) {
      showToast('Clear failed.', true);
      return;
    }

    adjustCountersForRemovedTables(removed);
    if (remaining.length === 0) {
      localStorage.removeItem('profileDataSaved');
    }

    appendActivity('Cleared loaded sample profile tables (Tables 2–9).');
    updateSessionProgress();
    renderSavedProfileTables();
    closeClearSampleModal();
    showToast('Sample records cleared.');
  }

  // ---------- Saved profile tables stacked cards ----------
  function renderSavedProfileTables() {
    var container = document.getElementById('pa-saved-list');
    var empty = document.getElementById('pa-saved-empty');
    if (!container) return;

    // Hide legacy auto-loaded sample tables from this page
    var tables = getProfileTables().filter(function (t) {
      return !(t && t.isSample && t.sampleFlag === SAMPLE_FLAG);
    });

    container.innerHTML = '';

    if (!tables.length) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    tables.forEach(function (t, idx) {
      var card = document.createElement('article');
      card.className = 'pa-saved-card';

      var header = document.createElement('div');
      header.className = 'pa-saved-card__header';

      var label = document.createElement('div');
      label.className = 'pa-saved-card__label';
      label.textContent = (t.isSample && t.sampleFlag === SAMPLE_FLAG) ? 'Sample Profile Table' : 'Profile Table';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'pa-input pa-saved-title-input';
      titleInput.value = t.tableTitle || 'Untitled';
      titleInput.addEventListener('change', function () {
        var newTitle = titleInput.value.trim();
        var arr = getProfileTables();
        if (!arr[idx]) return;
        arr[idx].tableTitle = newTitle;
        try {
          localStorage.setItem(KEYS.profileTables, JSON.stringify(arr));
          appendActivity('Renamed profile table: ' + (newTitle || 'Untitled'));
        } catch (e) {
          showToast('Rename failed.', true);
        }
      });

      var meta = document.createElement('div');
      meta.className = 'pa-saved-card__meta';
      var metaItems = [];
      if (t.totals) {
        if (t.type === 'twoGroup' && (t.totals.heads != null || t.totals.teachers != null)) {
          metaItems.push('SH: ' + (t.totals.heads || 0) + ' / T: ' + (t.totals.teachers || 0));
        } else if (t.totals.totalFrequency != null) {
          metaItems.push('n = ' + t.totals.totalFrequency);
        }
      }
      if (t.isSample && t.sampleFlag === SAMPLE_FLAG) {
        metaItems.push('Loaded: Tables 2–9 sample');
      }
      if (t.createdAt) {
        var d = new Date(t.createdAt);
        if (!isNaN(d.getTime())) {
          metaItems.push('Created ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
      }
      meta.textContent = metaItems.join(' • ');

      header.appendChild(label);
      header.appendChild(titleInput);
      if (metaItems.length) header.appendChild(meta);

      var tableWrap = document.createElement('div');
      tableWrap.className = 'pa-saved-table-wrap';
      var table = document.createElement('table');
      table.className = 'pa-saved-table';
      var isTwoGroup = t.type === 'twoGroup';
      if (isTwoGroup) {
        table.innerHTML = '<thead><tr><th>Category</th><th>SH f</th><th>SH Percentage</th><th>T f</th><th>T Percentage</th></tr></thead><tbody></tbody>';
      } else {
        table.innerHTML = '<thead><tr><th>Category</th><th>f</th><th>Percentage</th><th>Rank</th></tr></thead><tbody></tbody>';
      }
      var tbody = table.querySelector('tbody');

      (t.rows || []).forEach(function (r) {
        var tr = document.createElement('tr');
        if (isTwoGroup) {
          var hPct = (r.heads && r.heads.pct != null) ? (typeof r.heads.pct === 'number' ? r.heads.pct.toFixed(2) : r.heads.pct) : '';
          var tPct = (r.teachers && r.teachers.pct != null) ? (typeof r.teachers.pct === 'number' ? r.teachers.pct.toFixed(2) : r.teachers.pct) : '';
          tr.innerHTML =
            '<td>' + (r.category || '') + '</td>' +
            '<td>' + (r.heads && r.heads.f != null ? r.heads.f : '') + '</td>' +
            '<td>' + hPct + '</td>' +
            '<td>' + (r.teachers && r.teachers.f != null ? r.teachers.f : '') + '</td>' +
            '<td>' + tPct + '</td>';
        } else {
          var pctText = (r.percentage != null) ? (typeof r.percentage === 'number' ? r.percentage.toFixed(2) : r.percentage) : '';
          tr.innerHTML =
            '<td>' + (r.category || '') + '</td>' +
            '<td>' + (r.frequency != null ? r.frequency : '') + '</td>' +
            '<td>' + pctText + '</td>' +
            '<td>' + (r.rank != null ? r.rank : '') + '</td>';
        }
        tbody.appendChild(tr);
      });

      if (t.totals) {
        var trTotal = document.createElement('tr');
        if (isTwoGroup) {
          trTotal.innerHTML =
            '<td><strong>Total</strong></td>' +
            '<td><strong>' + (t.totals.heads != null ? t.totals.heads : '') + '</strong></td>' +
            '<td><strong>100.00</strong></td>' +
            '<td><strong>' + (t.totals.teachers != null ? t.totals.teachers : '') + '</strong></td>' +
            '<td><strong>100.00</strong></td>';
        } else {
          var pctTotalText = (t.totals.totalPercentage != null) ? (typeof t.totals.totalPercentage === 'number' ? t.totals.totalPercentage.toFixed(2) : t.totals.totalPercentage) : '';
          trTotal.innerHTML =
            '<td><strong>Total</strong></td>' +
            '<td><strong>' + (t.totals.totalFrequency != null ? t.totals.totalFrequency : '') + '</strong></td>' +
            '<td><strong>' + pctTotalText + '</strong></td>' +
            '<td></td>';
        }
        tbody.appendChild(trTotal);
      }

      tableWrap.appendChild(table);

      var interpretation = document.createElement('div');
      interpretation.className = 'pa-saved-interpretation';
      interpretation.textContent = t.interpretation || 'No interpretation stored for this table.';

      var actions = document.createElement('div');
      actions.className = 'pa-saved-actions';

      var btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.className = 'pa-btn pa-btn--secondary pa-btn--sm';
      btnCopy.textContent = 'Copy';
      btnCopy.addEventListener('click', function () {
        var text = (t.tableTitle || '') + '\n\n';
        (t.rows || []).forEach(function (r) {
          var pct = r.percentage != null ? (typeof r.percentage === 'number' ? r.percentage.toFixed(2) : r.percentage) : '';
          text += (r.category || '') + '\t' + (r.frequency != null ? r.frequency : '') + '\t' + pct + '\t' + (r.rank != null ? r.rank : '') + '\n';
        });
        if (t.interpretation) text += '\n' + t.interpretation;
        navigator.clipboard.writeText(text).then(function () {
          showToast('Copied!');
        }).catch(function () {
          showToast('Copy failed.', true);
        });
      });

      var btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'pa-btn pa-btn--ghost pa-btn--sm';
      btnEdit.textContent = 'Edit';
      btnEdit.addEventListener('click', function () {
        activeProjectId = 'rp1';
        var projectSelect = document.getElementById('pa-project-select');
        if (projectSelect) projectSelect.value = 'rp1';
        var inputSingle = document.getElementById('pa-input-single-group');
        if (inputSingle) inputSingle.hidden = false;
        setGroupToggleVisibility();
        setInterpretationTabsVisibility(false);
        loadTableIntoInputs(t);
      });

      var btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'pa-btn pa-btn--ghost pa-btn--sm';
      btnRemove.textContent = 'Remove';
      btnRemove.addEventListener('click', function () {
        var arr = getProfileTables();
        if (!arr[idx]) return;
        var removed = arr.splice(idx, 1);
        try {
          localStorage.setItem(KEYS.profileTables, JSON.stringify(arr));
        } catch (e) {
          showToast('Remove failed.', true);
          return;
        }
        adjustCountersForRemovedTables(removed);
        if (arr.length === 0) {
          localStorage.removeItem('profileDataSaved');
        }
        appendActivity('Removed profile table: ' + (t.tableTitle || 'Untitled'));
        updateSessionProgress();
        renderSavedProfileTables();
        showToast('Table removed.');
      });

      actions.appendChild(btnCopy);
      actions.appendChild(btnEdit);
      actions.appendChild(btnRemove);

      card.appendChild(header);
      card.appendChild(tableWrap);
      card.appendChild(interpretation);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function loadTableIntoInputs(table) {
    var tbody = document.getElementById('pa-table-tbody');
    var titleEl = document.getElementById('pa-table-title');
    if (!tbody || !titleEl) return;
    if (table.type === 'twoGroup') {
      showToast('Two-group tables cannot be edited in single-group mode.', true);
      return;
    }

    tbody.innerHTML = '';
    (table.rows || []).forEach(function (r) {
      addRow(r.category || '', typeof r.frequency === 'number' ? r.frequency : 0);
    });
    if (!table.rows || !table.rows.length) {
      for (var i = 0; i < 3; i++) addRow();
    }
    titleEl.value = table.tableTitle || '';
    computedRows = (table.rows || []).map(function (r) {
      return {
        category: r.category,
        frequency: r.frequency,
        percentage: typeof r.percentage === 'number' ? r.percentage : (r.percentage != null ? parseFloat(r.percentage) : 0),
        rank: r.rank
      };
    });
    currentTableTitle = titleEl.value || '';

    onInputChange();
    showToast('Loaded table into editor. You can recompute and save a revised version.');
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

  var clearSampleModal = document.getElementById('pa-clear-sample-modal');
  var clearSampleBackdrop = document.getElementById('pa-clear-sample-backdrop');
  var clearSampleCancel = document.getElementById('pa-clear-sample-cancel');
  var clearSampleConfirm = document.getElementById('pa-clear-sample-confirm');

  function openClearSampleModal() {
    if (clearSampleModal) {
      clearSampleModal.removeAttribute('hidden');
      if (clearSampleConfirm) clearSampleConfirm.focus();
    }
  }
  function closeClearSampleModal() {
    if (clearSampleModal) clearSampleModal.setAttribute('hidden', '');
  }

  function setGroupToggleVisibility() {
    var wrap = document.getElementById('pa-group-toggle-wrap');
    if (wrap) wrap.hidden = activeProjectId === 'rp2';
  }

  function setInterpretationTabsVisibility(show) {
    var tabs = document.getElementById('pa-interp-tabs');
    if (tabs) tabs.hidden = !show;
  }

  function toggleInterpretationExpand() {
    var block = document.getElementById('pa-interpretation-block');
    var btn = document.getElementById('pa-interpretation-toggle');
    if (!block || !btn) return;
    var isCollapsed = block.classList.toggle('is-collapsed');
    var span = btn.querySelector('span');
    var polyline = btn.querySelector('svg polyline');
    if (span) span.textContent = isCollapsed ? 'Expand' : 'Collapse';
    btn.setAttribute('aria-expanded', !isCollapsed);
    if (polyline) polyline.setAttribute('points', isCollapsed ? '6 9 12 15 18 9' : '18 15 12 9 6 15');
  }

  function setRowDensity(mode) {
    var table = document.getElementById('pa-unified-table');
    if (!table) return;
    if (mode === 'compact') table.classList.add('pa-table--compact');
    else table.classList.remove('pa-table--compact');
  }

  function restoreOriginalValues() {
    var key = document.getElementById('pa-table-select') && document.getElementById('pa-table-select').value;
    if (!key) return;
    if (activeProjectId === 'rp2' && currentProject2Table) {
      currentProject2Table = JSON.parse(JSON.stringify(PROJECT2_TABLES[key]));
      renderTwoGroupTable(currentProject2Table, { showComputed: false });
      showToast('Original values restored.');
    } else if (currentTableConfig) {
      applyProfileTableConfig(key);
      showToast('Original values restored.');
    }
  }

  function init() {
    activeProjectId = 'rp1';
    showEmptyState();

    var projectSelect = document.getElementById('pa-project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', function () {
        activeProjectId = this.value || 'rp1';
        var tableSelect = document.getElementById('pa-table-select');
        if (tableSelect) {
          tableSelect.value = '';
          showEmptyState();
        }
        setGroupToggleVisibility();
        updateLoadedSummary();
      });
    }

    var implToggle = document.getElementById('pa-include-implications');
    if (implToggle) {
      implToggle.addEventListener('change', function () {
        var detected = getDetectedProfileTableType();
        if (detected === 'two-group-profile' && currentProject2Table) {
          var text = buildTwoGroupProfileInterpretation(currentProject2Table);
          var block = document.getElementById('pa-interpretation-block');
          if (block) block.textContent = text;
        } else if (computedRows.length) {
          generateInterpretation(computedRows, currentTableTitle);
        }
      });
    }

    var tableSelect = document.getElementById('pa-table-select');
    if (tableSelect) {
      tableSelect.addEventListener('change', function () {
        var key = this.value;
        loadSelectedTable(key);
      });
    }

    var titleEl = document.getElementById('pa-table-title');
    if (titleEl) titleEl.addEventListener('input', onInputChange);

    var addRowBtn = document.getElementById('pa-add-row');
    if (addRowBtn) addRowBtn.addEventListener('click', function () { addRow(); });

    var pasteZone = document.getElementById('pa-paste-zone');
    var tableWrap = document.getElementById('pa-table-wrap');
    if (pasteZone) {
      pasteZone.addEventListener('paste', handleProfilePaste);
      pasteZone.addEventListener('focus', function () {
        var errEl = document.getElementById('pa-paste-table-error');
        if (errEl) errEl.textContent = '';
      });
    }
    if (tableWrap) {
      tableWrap.addEventListener('paste', handleProfilePaste);
    }

    var pasteZoneTwo = document.getElementById('pa-paste-zone-two');
    var twoGroupWrap = document.getElementById('pa-two-group-wrap');
    if (pasteZoneTwo) {
      pasteZoneTwo.addEventListener('paste', handleProfileTwoGroupPaste);
      pasteZoneTwo.addEventListener('focus', function () {
        var errEl = document.getElementById('pa-paste-table-error-two');
        if (errEl) errEl.textContent = '';
      });
    }
    if (twoGroupWrap) {
      twoGroupWrap.addEventListener('paste', handleProfileTwoGroupPaste);
    }

    var computeBtn = document.getElementById('pa-compute');
    if (computeBtn) computeBtn.addEventListener('click', compute);
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (regenBtn) regenBtn.addEventListener('click', regenerateInterpretation);
    var copyBtn = document.getElementById('pa-copy-interpretation');
    if (copyBtn) copyBtn.addEventListener('click', copyInterpretation);
    var saveTableBtn = document.getElementById('pa-save-table');
    if (saveTableBtn) saveTableBtn.addEventListener('click', saveToReport);

    var clearInputsBtn = document.getElementById('pa-clear-inputs');
    if (clearInputsBtn) clearInputsBtn.addEventListener('click', openClearModal);
    var clearInputsBtnTwo = document.getElementById('pa-clear-inputs-two');
    if (clearInputsBtnTwo) clearInputsBtnTwo.addEventListener('click', openClearModal);
    if (clearConfirm) clearConfirm.addEventListener('click', function () { clearInputs(); closeClearModal(); });
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    var restoreBtn = document.getElementById('pa-restore-original');
    if (restoreBtn) restoreBtn.addEventListener('click', restoreOriginalValues);
    var addRowBtnTwo = document.getElementById('pa-add-row-two');
    if (addRowBtnTwo) addRowBtnTwo.addEventListener('click', function () {
      if (currentProject2Table && currentProject2Table.rows) {
        currentProject2Table.rows.push({
          category: '',
          heads: { f: 0, pct: 0 },
          teachers: { f: 0, pct: 0 }
        });
        renderTwoGroupTable(currentProject2Table, { showComputed: false });
        showToast('Row added.');
      }
    });
    var computeBtnTwo = document.getElementById('pa-compute-two');
    if (computeBtnTwo) computeBtnTwo.addEventListener('click', function () {
      if (currentProject2Table) {
        syncTwoGroupFromDom();
        renderTwoGroupTable(currentProject2Table, { showComputed: true });
        showToast('Table updated.');
      }
    });
    var restoreBtnTwo = document.getElementById('pa-restore-original-two');
    if (restoreBtnTwo) restoreBtnTwo.addEventListener('click', restoreOriginalValues);
    var saveTableBtnTwo = document.getElementById('pa-save-table-two');
    if (saveTableBtnTwo) saveTableBtnTwo.addEventListener('click', saveToReport);

    var interpToggle = document.getElementById('pa-interpretation-toggle');
    if (interpToggle) interpToggle.addEventListener('click', toggleInterpretationExpand);

    var interpTabs = document.getElementById('pa-interp-tabs');
    if (interpTabs) {
      interpTabs.querySelectorAll('[data-interp-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-interp-tab');
          interpTabs.querySelectorAll('.pa-qd-toggle__btn').forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
          // TODO: switch interpretation block content per tab when we have per-group interpretation
        });
      });
    }


    var btnLoadSample = document.getElementById('pa-load-sample');
    var btnClearSample = document.getElementById('pa-clear-sample');
    if (btnLoadSample) btnLoadSample.addEventListener('click', loadSampleTables);
    if (btnClearSample) btnClearSample.addEventListener('click', openClearSampleModal);
    if (clearSampleConfirm) clearSampleConfirm.addEventListener('click', clearLoadedSampleTables);
    if (clearSampleCancel) clearSampleCancel.addEventListener('click', closeClearSampleModal);
    if (clearSampleBackdrop) clearSampleBackdrop.addEventListener('click', closeClearSampleModal);

    var resetBtn = document.getElementById('pa-btn-reset');
    var resetBtnMobile = document.getElementById('pa-btn-reset-mobile');
    if (resetBtn) resetBtn.addEventListener('click', openResetModal);
    if (resetBtnMobile) resetBtnMobile.addEventListener('click', openResetModal);
    if (resetConfirm) resetConfirm.addEventListener('click', resetSession);
    if (resetCancel) resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);
    if (resetModal) resetModal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeResetModal(); });
    if (clearModal) clearModal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeClearModal(); });
    if (clearSampleModal) clearSampleModal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeClearSampleModal(); });

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

    setInterpretationTabsVisibility(false);
    updateSessionProgress();
    renderSavedProfileTables();

    // Load table only if user has already selected one (e.g. after refresh)
    var tableSelectInit = document.getElementById('pa-table-select');
    if (tableSelectInit) {
      var key = tableSelectInit.value || '';
      loadSelectedTable(key);
    }

    onInputChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
