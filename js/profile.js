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
  var usePrewrittenInterpretation = false;
  var autoPercentTwoGroup = true;
  var computeTable9Percent = false;
  var SAMPLE_FLAG = 'profile-sample';

  // Predefined profile table structures (Tables 2–9)
  var PROFILE_TABLE_CONFIGS = {
    age: {
      id: 'age',
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
    var projectSelect = document.getElementById('pa-project-select');
    var tableSelect = document.getElementById('pa-table-select');
    if (!pill || !tableSelect) return;
    var key = tableSelect.value;
    if (!key) {
      pill.textContent = 'None selected';
      return;
    }
    var cfg = activeProjectId === 'rp2' ? PROJECT2_TABLES[key] : PROFILE_TABLE_CONFIGS[key];
    if (!cfg) {
      pill.textContent = 'Unknown table';
      return;
    }
    var count = (cfg.rows ? cfg.rows.length : (cfg.categories ? cfg.categories.length : 0));
    var mode = activeProjectId === 'rp2' ? 'Two groups' : 'Single group';
    var titlePart = (cfg.tableNumber ? 'Table ' + cfg.tableNumber + ' — ' : '') + (cfg.title || key);
    pill.textContent = titlePart + ' • ' + count + ' categories • ' + mode;
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

  function applyProfileTableConfig(key) {
    var config = PROFILE_TABLE_CONFIGS[key];
    var tbody = document.getElementById('pa-input-tbody');
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

    // Reset computed state
    computedRows = [];
    renderOutputPlaceholder();
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (copyBtn) copyBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveInputBtn) saveInputBtn.disabled = true;
    updateLoadedSummary();
    onInputChange();
  }

  function addRow(initialCategory, initialFrequency) {
    var tbody = document.getElementById('pa-input-tbody');
    if (!tbody) return null;
    var tr = document.createElement('tr');
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
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
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
      var saveInputBtn = document.getElementById('pa-save-to-report-input');
      if (computeBtn) computeBtn.disabled = !validate();
      if (saveInputBtn) saveInputBtn.disabled = true;
    }
  }

  function compute() {
    if (activeProjectId === 'rp2' && currentProject2Table) {
      renderTwoGroupTable(currentProject2Table);
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

    var tbody = document.getElementById('pa-output-tbody');
    var tfoot = document.getElementById('pa-output-tfoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    rounded.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="pa-thesis-table__td pa-thesis-table__td--particulars">' + escapeHtml(r.category) + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--f">' + r.frequency + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--pct">' + r.percentage.toFixed(2) + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--rank">' + r.rank + '</td>';
      tbody.appendChild(tr);
    });

    tfoot.innerHTML =
      '<tr class="pa-thesis-table__footer-row">' +
        '<td class="pa-thesis-table__footer-label"><strong>TOTAL</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-freq">' + total + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-pct">100.00</strong></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
      '</tr>';

    updateTotalsStrip(total, '100.00');
    updateLiveTotals(total, '100.00');

    generateInterpretation(rounded, currentTableTitle);
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
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

  function buildTwoGroupProfileInterpretation(table, variantIndex, lastOpener) {
    if (!table || !table.rows || !table.rows.length) return '';
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var includeImplications = true;
    var implEl = document.getElementById('pa-include-implications');
    if (implEl) includeImplications = implEl.checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var opener = Gen
      ? Gen.getOpenerForVariant(vi, lastOpener)
      : (Utils ? Utils.getVariedOpener() : 'Regarding ');
    var subject = (table.title || 'the variable').toLowerCase().replace(/^table \d+\.\s*/i, '');
    var sumH = 0, sumT = 0;
    table.rows.forEach(function (r) {
      sumH += (r.heads && r.heads.f) || 0;
      sumT += (r.teachers && r.teachers.f) || 0;
    });

    var parts = [];
    if (sumH > 0) {
      var maxH = 0, domH = [];
      table.rows.forEach(function (r) {
        var f = (r.heads && r.heads.f) || 0;
        if (f > maxH) { maxH = f; domH = [r]; } else if (f === maxH && f > 0) domH.push(r);
      });
      var hPct = domH.length ? ((domH[0].heads && domH[0].heads.pct) || (maxH / sumH * 100)).toFixed(2) : '0.00';
      var hLabels = domH.map(function (r) { return '"' + r.category + '"'; });
      parts.push('among school heads, ' + (hLabels.length === 1 ? hLabels[0] : joinWithAnd(hLabels)) + ' had the largest share (' + hPct + ' percent)');
    }
    if (sumT > 0) {
      var maxT = 0, domT = [];
      table.rows.forEach(function (r) {
        var f = (r.teachers && r.teachers.f) || 0;
        if (f > maxT) { maxT = f; domT = [r]; } else if (f === maxT && f > 0) domT.push(r);
      });
      var tPct = domT.length ? ((domT[0].teachers && domT[0].teachers.pct) || (maxT / sumT * 100)).toFixed(2) : '0.00';
      var tLabels = domT.map(function (r) { return '"' + r.category + '"'; });
      parts.push('among teachers, ' + (tLabels.length === 1 ? tLabels[0] : joinWithAnd(tLabels)) + ' had the largest share (' + tPct + ' percent)');
    }
    if (!parts.length) return '';

    var reflectWord = Gen ? Gen.getSynonym('shows', vi + 1) : 'reflect';
    var sent1 = opener + subject + ', ' + parts.join('; ') + '.';
    var sent2 = 'The data ' + reflectWord + ' the distribution across both respondent groups.';
    var text = sent1 + ' ' + sent2;
    if (includeImplications) {
      var impl = Gen
        ? Gen.buildImplicationsWithVariant('profile', vi)
        : (Utils ? Utils.buildImplications('profile') : { first: '', second: '' });
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text.trim();
  }

  function buildInterpretationText(rows, tableTitle, variantIndex, lastOpener) {
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

    var opener = Gen
      ? Gen.getOpenerForVariant(vi, lastOpener)
      : (Utils ? Utils.getVariedOpener() : 'Regarding ');
    var subject = 'the distribution';
    if (tableTitle) {
      var match = tableTitle.match(/Table \d+\.\s*(.+)/i);
      subject = match ? match[1].toLowerCase() : tableTitle.toLowerCase().replace(/\.$/, '');
    }
    var opening = opener + subject + ', ';

    var hadVerb = Gen ? Gen.getSynonym('hadVerb', vi) : 'had';
    var contributed = Gen ? Gen.getSynonym('contributed', vi + 1) : 'was contributed by';
    var majorityWord = Gen ? Gen.getSynonym('majority', vi + 2) : 'majority';

    var groups = [];
    var currentGroup = null;
    effectiveRows.forEach(function (r) {
      if (!currentGroup || r.frequency !== currentGroup.frequency) {
        currentGroup = { frequency: r.frequency, rows: [r] };
        groups.push(currentGroup);
      } else {
        currentGroup.rows.push(r);
      }
    });

    var bodyParts = groups.map(function (group) {
      var labels = group.rows.map(function (r) { return r.category; });
      var freq = group.frequency;
      var pct = (freq / total * 100).toFixed(2);
      var labelText = joinWithAnd(labels);
      if (group.rows.length === 1) {
        return labelText + ' ' + hadVerb + ' ' + freq + ' (' + pct + ' percent)';
      }
      var tiePhrase = Gen ? Gen.getSynonym('tiePhrase', vi + group.rows.length) : 'both';
      if (tiePhrase === 'the categories share the same frequency') {
        return labelText + ' share the same frequency of ' + freq + ' (' + pct + ' percent)';
      }
      if (tiePhrase === 'the categories are tied') {
        return labelText + ' are tied at ' + freq + ' (' + pct + ' percent)';
      }
      return labelText + ' each ' + hadVerb + ' ' + freq + ' (' + pct + ' percent)';
    });

    var sent1 = opening + bodyParts.join('; ') + '.';

    var maxFreq = 0;
    effectiveRows.forEach(function (r) {
      if (r.frequency > maxFreq) maxFreq = r.frequency;
    });
    var dominant = effectiveRows.filter(function (r) { return r.frequency === maxFreq; });
    var dominantLabels = dominant.map(function (r) { return '"' + r.category + '"'; });
    var sent2 = '';
    if (dominantLabels.length === 1) {
      sent2 = 'The ' + majorityWord + ' ' + contributed + ' ' + dominantLabels[0] + '.';
    } else if (dominantLabels.length > 1) {
      sent2 = 'The ' + majorityWord + ' was jointly contributed by ' + joinWithAnd(dominantLabels) + '.';
    }

    var text = sent1 + (sent2 ? ' ' + sent2 : '');
    if (includeImplications) {
      var impl = Gen
        ? Gen.buildImplicationsWithVariant('profile', vi)
        : (Utils ? Utils.buildImplications('profile') : { first: '', second: '' });
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text.trim();
  }

  function generateInterpretation(rows, tableTitle) {
    var text = buildInterpretationText(rows, tableTitle);
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = text;
    return text;
  }

  function regenerateInterpretation() {
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    if (!Gen) {
      if (activeProjectId === 'rp2' && currentProject2Table) {
        var t = buildTwoGroupProfileInterpretation(currentProject2Table);
        var block = document.getElementById('pa-interpretation-block');
        if (block) block.textContent = t;
      } else if (computedRows.length) {
        generateInterpretation(computedRows, currentTableTitle);
      }
      return;
    }
    var tableId = (currentTableTitle || (currentProject2Table && currentProject2Table.title) || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    var generator = function (vi, lastOpener) {
      if (activeProjectId === 'rp2' && currentProject2Table) {
        return buildTwoGroupProfileInterpretation(currentProject2Table, vi, lastOpener);
      }
      return buildInterpretationText(computedRows, currentTableTitle, vi, lastOpener);
    };
    var result = Gen.generateWithVariation(generator, 'profile', tableId);
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = result.text;
    showToast('Interpretation regenerated.');
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
    var interpretation = document.getElementById('pa-interpretation-block');
    var text = interpretation && interpretation.textContent ? interpretation.textContent.trim() : '';
    var tables = getProfileTables();
    var toSave = null;

    if (activeProjectId === 'rp2' && currentProject2Table) {
      var sumH = 0, sumT = 0;
      currentProject2Table.rows.forEach(function (r) {
        sumH += (r.heads && r.heads.f) || 0;
        sumT += (r.teachers && r.teachers.f) || 0;
      });
      toSave = {
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
    var thead = document.getElementById('pa-output-thead');
    var tbody = document.getElementById('pa-output-tbody');
    var tfoot = document.getElementById('pa-output-tfoot');
    var tableWrap = document.getElementById('pa-table-wrap');
    if (tableWrap) tableWrap.classList.remove('pa-thesis-table--two-group');
    if (thead) {
      thead.innerHTML =
        '<tr>' +
          '<th class="pa-thesis-table__th pa-thesis-table__th--particulars">Particulars</th>' +
          '<th class="pa-thesis-table__th pa-thesis-table__th--f">f</th>' +
          '<th class="pa-thesis-table__th pa-thesis-table__th--pct">Percentage</th>' +
          '<th class="pa-thesis-table__th pa-thesis-table__th--rank">Rank</th>' +
        '</tr>';
    }
    if (tfoot) {
      tfoot.innerHTML =
        '<tr class="pa-thesis-table__footer-row">' +
          '<td class="pa-thesis-table__footer-label"><strong>TOTAL</strong></td>' +
          '<td class="pa-thesis-table__footer-value"><strong id="pa-total-freq">0</strong></td>' +
          '<td class="pa-thesis-table__footer-value"><strong id="pa-total-pct">100.00</strong></td>' +
          '<td class="pa-thesis-table__footer-value"></td>' +
        '</tr>';
    }
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="pa-output-empty">Select a table and compute to see results.</td></tr>';
    }
    updateTotalsStrip(0, '100.00');
  }

  function updateTotalsStrip(totalFreq, totalPct) {
    var fEl = document.getElementById('pa-totals-freq');
    var pEl = document.getElementById('pa-totals-pct');
    if (fEl) fEl.textContent = totalFreq;
    if (pEl) pEl.textContent = totalPct || '100.00';
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
  function renderTwoGroupTable(table) {
    var thead = document.getElementById('pa-output-thead');
    var tbody = document.getElementById('pa-output-tbody');
    var tfoot = document.getElementById('pa-output-tfoot');
    var tableWrap = document.getElementById('pa-table-wrap');
    if (!tbody || !table || !thead || !tfoot) return;

    if (tableWrap) tableWrap.classList.add('pa-thesis-table--two-group');

    thead.innerHTML =
      '<tr class="pa-thesis-table__group-row">' +
        '<th rowspan="2" class="pa-thesis-table__th pa-thesis-table__th--particulars">Particulars</th>' +
        '<th colspan="3" class="pa-thesis-table__th pa-thesis-table__th--group">School Heads</th>' +
        '<th colspan="3" class="pa-thesis-table__th pa-thesis-table__th--group">Teachers</th>' +
      '</tr>' +
      '<tr class="pa-thesis-table__subhead-row">' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--f">f</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--pct">Percentage</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--rank">Rank</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--f">f</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--pct">Percentage</th>' +
        '<th class="pa-thesis-table__th pa-thesis-table__th--rank">Rank</th>' +
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

    var rankMapH = computeDenseRanks(table.rows, function (r) { return r.heads && r.heads.f; });
    var rankMapT = computeDenseRanks(table.rows, function (r) { return r.teachers && r.teachers.f; });

    table.rows.forEach(function (row, idx) {
      var hF = row.heads && typeof row.heads.f === 'number' ? row.heads.f : 0;
      var tF = row.teachers && typeof row.teachers.f === 'number' ? row.teachers.f : 0;
      var hPct = row.heads && typeof row.heads.pct === 'number' ? row.heads.pct.toFixed(2) : '';
      var tPct = row.teachers && typeof row.teachers.pct === 'number' ? row.teachers.pct.toFixed(2) : '';
      var hRank = rankMapH[idx] || '';
      var tRank = rankMapT[idx] || '';

      var tr = document.createElement('tr');
      tr.setAttribute('data-pa-two-row', String(idx));
      tr.innerHTML =
        '<td class="pa-thesis-table__td pa-thesis-table__td--particulars">' + escapeHtml(row.category) + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--f"><input type="number" class="pa-thesis-input" step="1" min="0" data-pa-h-f value="' + hF + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--pct"><input type="number" class="pa-thesis-input" step="0.01" data-pa-h-pct value="' + hPct + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--rank">' + hRank + '</td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--f"><input type="number" class="pa-thesis-input" step="1" min="0" data-pa-t-f value="' + tF + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--pct"><input type="number" class="pa-thesis-input" step="0.01" data-pa-t-pct value="' + tPct + '"></td>' +
        '<td class="pa-thesis-table__td pa-thesis-table__td--rank">' + tRank + '</td>';
      tbody.appendChild(tr);
    });

    if (autoPercentTwoGroup && table.type === 'twoGroupPercent' && (sumHeads > 0 || sumTeachers > 0)) {
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
    } else if (table.type === 'twoGroupMention' && computeTable9Percent && (sumHeads > 0 || sumTeachers > 0)) {
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

    var shPctText = (table.type === 'twoGroupPercent' && sumHeads > 0) || (computeTable9Percent && sumHeads > 0) ? '100.00' : '—';
    var tPctText = (table.type === 'twoGroupPercent' && sumTeachers > 0) || (computeTable9Percent && sumTeachers > 0) ? '100.00' : '—';

    tfoot.innerHTML =
      '<tr class="pa-thesis-table__footer-row">' +
        '<td class="pa-thesis-table__footer-label"><strong>TOTAL</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-heads-f">' + sumHeads + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong>' + shPctText + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
        '<td class="pa-thesis-table__footer-value"><strong id="pa-total-teachers-f">' + sumTeachers + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"><strong>' + tPctText + '</strong></td>' +
        '<td class="pa-thesis-table__footer-value"></td>' +
      '</tr>';

    updateTotalsStrip(sumHeads + ' / ' + sumTeachers, '100.00');
    updateLiveTotals(sumHeads + sumTeachers, '100.00');
    bindTwoGroupInputListeners();

    var interpText = buildTwoGroupProfileInterpretation(table);
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = interpText;
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = !interpText;
    if (saveBtn) saveBtn.disabled = !interpText;
    if (saveInputBtn) saveInputBtn.disabled = !interpText;
    if (regenBtn) regenBtn.disabled = !interpText;
  }

  function bindTwoGroupInputListeners() {
    var tbody = document.getElementById('pa-output-tbody');
    if (!tbody || !currentProject2Table) return;
    tbody.querySelectorAll('input[data-pa-h-f], input[data-pa-t-f], input[data-pa-h-pct], input[data-pa-t-pct]').forEach(function (inp) {
      inp.removeEventListener('input', onTwoGroupInputChange);
      inp.addEventListener('input', onTwoGroupInputChange);
    });
  }
  function onTwoGroupInputChange() {
    if (!currentProject2Table) return;
    var tbody = document.getElementById('pa-output-tbody');
    if (!tbody) return;
    var sumHeads = 0, sumTeachers = 0;
    tbody.querySelectorAll('tr').forEach(function (tr, idx) {
      var row = currentProject2Table.rows[idx];
      if (!row) return;
      var hF = parseInt(tr.querySelector('[data-pa-h-f]').value || '0', 10) || 0;
      var tF = parseInt(tr.querySelector('[data-pa-t-f]').value || '0', 10) || 0;
      sumHeads += hF;
      sumTeachers += tF;
      row.heads.f = hF;
      row.teachers.f = tF;
    });
    if (autoPercentTwoGroup && currentProject2Table.type === 'twoGroupPercent') {
      tbody.querySelectorAll('tr').forEach(function (tr, idx) {
        var row = currentProject2Table.rows[idx];
        if (!row) return;
        var hPct = sumHeads > 0 ? Math.round((row.heads.f / sumHeads) * 10000) / 100 : 0;
        var tPct = sumTeachers > 0 ? Math.round((row.teachers.f / sumTeachers) * 10000) / 100 : 0;
        row.heads.pct = hPct;
        row.teachers.pct = tPct;
        var hInp = tr.querySelector('[data-pa-h-pct]');
        var tInp = tr.querySelector('[data-pa-t-pct]');
        if (hInp) hInp.value = hPct.toFixed(2);
        if (tInp) tInp.value = tPct.toFixed(2);
      });
    }
    var fSingle = document.getElementById('pa-total-heads-f');
    var fTeachers = document.getElementById('pa-total-teachers-f');
    if (fSingle) fSingle.textContent = sumHeads;
    if (fTeachers) fTeachers.textContent = sumTeachers;
    updateTotalsStrip(sumHeads + ' / ' + sumTeachers, '100.00');
    updateLiveTotals(sumHeads + sumTeachers, '100.00');
  }

  function clearInputs() {
    var tbody = document.getElementById('pa-input-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      for (var i = 0; i < 3; i++) addRow();
    }
    var titleEl = document.getElementById('pa-table-title');
    if (titleEl) titleEl.value = '';
    var selectEl = document.getElementById('pa-table-select');
    if (selectEl) selectEl.value = '';
    currentTableConfig = null;
    currentProject2Table = null;
    computedRows = [];
    currentTableTitle = '';
    renderOutputPlaceholder();
    updateLoadedSummary();
    var block = document.getElementById('pa-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('pa-copy-interpretation');
    var saveBtn = document.getElementById('pa-save-to-report');
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    var restoreBtn = document.getElementById('pa-restore-original');
    var computeBtn = document.getElementById('pa-compute');
    if (copyBtn) copyBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveInputBtn) saveInputBtn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;
    if (restoreBtn) restoreBtn.disabled = true;
    if (computeBtn) computeBtn.disabled = true;
    setInterpretationTabsVisibility(false);
    var inputSingle = document.getElementById('pa-input-single-group');
    if (inputSingle && activeProjectId === 'rp1') inputSingle.hidden = false;
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

    var interpretation = buildInterpretationText(sorted, sample.defaultTitle);

    return {
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

      var btnSaveReport = document.createElement('button');
      btnSaveReport.type = 'button';
      btnSaveReport.className = 'pa-btn pa-btn--ghost pa-btn--sm';
      btnSaveReport.textContent = 'Save to Report';
      btnSaveReport.addEventListener('click', function () {
        showToast('This table is already included in Report / Export.');
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
      actions.appendChild(btnSaveReport);
      actions.appendChild(btnRemove);

      card.appendChild(header);
      card.appendChild(tableWrap);
      card.appendChild(interpretation);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function loadTableIntoInputs(table) {
    var tbody = document.getElementById('pa-input-tbody');
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
    var table = document.getElementById('pa-output-table');
    if (!table) return;
    if (mode === 'compact') table.classList.add('pa-table--compact');
    else table.classList.remove('pa-table--compact');
  }

  function restoreOriginalValues() {
    var key = document.getElementById('pa-table-select') && document.getElementById('pa-table-select').value;
    if (!key) return;
    if (activeProjectId === 'rp2' && currentProject2Table) {
      currentProject2Table = JSON.parse(JSON.stringify(PROJECT2_TABLES[key]));
      renderTwoGroupTable(currentProject2Table);
      showToast('Original values restored.');
    } else if (currentTableConfig) {
      applyProfileTableConfig(key);
      showToast('Original values restored.');
    }
  }

  function init() {
    var tbody = document.getElementById('pa-input-tbody');
    if (tbody) {
      for (var i = 0; i < 3; i++) addRow();
    }

    var projectSelect = document.getElementById('pa-project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', function () {
        activeProjectId = this.value || 'rp1';
        clearInputs();
        setGroupToggleVisibility();
        var inputSingle = document.getElementById('pa-input-single-group');
        if (inputSingle) inputSingle.hidden = activeProjectId === 'rp2';
        setInterpretationTabsVisibility(activeProjectId === 'rp2');
        if (activeProjectId === 'rp2') {
          var tableSelect = document.getElementById('pa-table-select');
          if (tableSelect) {
            tableSelect.value = 'age';
            var cfg = PROJECT2_TABLES['age'];
            if (cfg) {
              currentProject2Table = JSON.parse(JSON.stringify(cfg));
              currentTableConfig = null;
              currentTableTitle = cfg.title;
              var titleEl = document.getElementById('pa-table-title');
              if (titleEl) titleEl.value = cfg.title;
              renderTwoGroupTable(currentProject2Table);
              updateLoadedSummary();
              var computeBtn = document.getElementById('pa-compute');
              var restoreBtn = document.getElementById('pa-restore-original');
              var saveInputBtn = document.getElementById('pa-save-to-report-input');
              if (computeBtn) computeBtn.disabled = false;
              if (restoreBtn) restoreBtn.disabled = false;
              if (saveInputBtn) saveInputBtn.disabled = false;
            }
          }
        }
      });
    }

    var implToggle = document.getElementById('pa-include-implications');
    if (implToggle) {
      implToggle.addEventListener('change', function () {
        if (activeProjectId === 'rp2' && currentProject2Table) {
          var text = buildTwoGroupProfileInterpretation(currentProject2Table);
          var block = document.getElementById('pa-interpretation-block');
          if (block) block.textContent = text;
        } else if (computedRows.length) {
          generateInterpretation(computedRows, currentTableTitle);
        }
      });
    }

    var autoPctEl = document.getElementById('pa-auto-percent');
    if (autoPctEl) autoPctEl.addEventListener('change', function () { autoPercentTwoGroup = this.checked; });
    var t9PctEl = document.getElementById('pa-table9-percent-toggle');
    if (t9PctEl) t9PctEl.addEventListener('change', function () { computeTable9Percent = this.checked; });

    var advToggle = document.getElementById('pa-advanced-toggle');
    var advBody = document.getElementById('pa-advanced-body');
    if (advToggle && advBody) {
      advToggle.addEventListener('click', function () {
        var open = advBody.classList.toggle('is-open');
        advToggle.setAttribute('aria-expanded', open);
      });
    }

    var usePrewrittenEl = document.getElementById('pa-use-prewritten');
    if (usePrewrittenEl) usePrewrittenEl.addEventListener('change', function () { usePrewrittenInterpretation = this.checked; });

    var tableSelect = document.getElementById('pa-table-select');
    if (tableSelect) {
      tableSelect.addEventListener('change', function () {
        var key = this.value;
        if (!key) return;
        updateLoadedSummary();
        if (activeProjectId === 'rp2') {
          var cfg = PROJECT2_TABLES[key];
          if (!cfg) return;
          currentProject2Table = JSON.parse(JSON.stringify(cfg));
          currentTableConfig = null;
          currentTableTitle = cfg.title;
          var titleEl = document.getElementById('pa-table-title');
          if (titleEl) titleEl.value = cfg.title;
          var inputSingle = document.getElementById('pa-input-single-group');
          if (inputSingle) inputSingle.hidden = true;
          setGroupToggleVisibility();
          setInterpretationTabsVisibility(true);
          renderTwoGroupTable(currentProject2Table);
          var computeBtn = document.getElementById('pa-compute');
          var restoreBtn = document.getElementById('pa-restore-original');
          var saveInputBtn = document.getElementById('pa-save-to-report-input');
          if (computeBtn) computeBtn.disabled = false;
          if (restoreBtn) restoreBtn.disabled = false;
          if (saveInputBtn) saveInputBtn.disabled = false;
        } else {
          var inputSingle2 = document.getElementById('pa-input-single-group');
          if (inputSingle2) inputSingle2.hidden = false;
          setGroupToggleVisibility();
          setInterpretationTabsVisibility(false);
          applyProfileTableConfig(key);
        }
      });
    }

    var titleEl = document.getElementById('pa-table-title');
    if (titleEl) titleEl.addEventListener('input', onInputChange);

    var addRowBtn = document.getElementById('pa-add-row');
    if (addRowBtn) addRowBtn.addEventListener('click', function () { addRow(); });
    var computeBtn = document.getElementById('pa-compute');
    if (computeBtn) computeBtn.addEventListener('click', compute);
    var regenBtn = document.getElementById('pa-regenerate-interpretation');
    if (regenBtn) regenBtn.addEventListener('click', regenerateInterpretation);
    var copyBtn = document.getElementById('pa-copy-interpretation');
    if (copyBtn) copyBtn.addEventListener('click', copyInterpretation);
    var saveBtn = document.getElementById('pa-save-to-report');
    if (saveBtn) saveBtn.addEventListener('click', saveToReport);
    var saveInputBtn = document.getElementById('pa-save-to-report-input');
    if (saveInputBtn) saveInputBtn.addEventListener('click', saveToReport);

    var clearInputsBtn = document.getElementById('pa-clear-inputs');
    if (clearInputsBtn) clearInputsBtn.addEventListener('click', openClearModal);
    if (clearConfirm) clearConfirm.addEventListener('click', function () { clearInputs(); closeClearModal(); });
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    var restoreBtn = document.getElementById('pa-restore-original');
    if (restoreBtn) restoreBtn.addEventListener('click', restoreOriginalValues);

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


    var densityBtns = document.querySelectorAll('[data-row-density]');
    densityBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-row-density') || 'comfortable';
        setRowDensity(mode);
        densityBtns.forEach(function (b) { b.classList.remove('pa-chip--active'); });
        btn.classList.add('pa-chip--active');
      });
    });

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

    setGroupToggleVisibility();
    setInterpretationTabsVisibility(false);
    updateSessionProgress();
    renderSavedProfileTables();
    onInputChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
