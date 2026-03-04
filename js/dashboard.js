/**
 * Thesis Interpretation Assistant — Dashboard
 * Vanilla JS: computes session statistics from actual stored data (profileTables, likertTables),
 * renders recent activity, workflow step states, and handles Reset Session confirmation modal.
 *
 * Statistics are derived from stored data so the dashboard always reflects current state.
 */

(function () {
  'use strict';

  // ---------- Storage keys (shared with other pages) ----------
  var KEYS = {
    profileTables: 'profileTables',
    likertTables: 'likertTables',
    reportsCreated: 'reportsCreated',
    recentActivity: 'recentActivity',
    profileDataSaved: 'profileDataSaved',
    likertDataSaved: 'likertDataSaved',
    summaryDataSaved: 'summaryDataSaved',
    reportDataSaved: 'reportDataSaved'
  };

  var MAX_ACTIVITY = 10;
  var SAMPLE_FLAG = 'profile-sample';

  // ---------- Read actual stored data ----------
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

  function getNumber(key) {
    try {
      var val = localStorage.getItem(key);
      return val !== null ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function getActivityList() {
    try {
      var raw = localStorage.getItem(KEYS.recentActivity);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, MAX_ACTIVITY) : [];
    } catch (e) {
      return [];
    }
  }

  // ---------- Compute statistics from stored data ----------
  function getTablesCount() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var profileCount = profile.filter(function (t) {
      return !(t && t.isSample && t.sampleFlag === SAMPLE_FLAG);
    }).length;
    return profileCount + likert.length;
  }

  function getRespondentsCount() {
    var profile = getProfileTables();
    var total = 0;
    profile.forEach(function (t) {
      if (t && t.isSample && t.sampleFlag === SAMPLE_FLAG) return;
      if (t.totals) {
        if (t.totals.totalFrequency != null) {
          total += t.totals.totalFrequency;
        } else if (t.totals.heads != null || t.totals.teachers != null) {
          total += (t.totals.heads || 0) + (t.totals.teachers || 0);
        }
      }
    });
    return total;
  }

  function getInterpretationsCount() {
    var profile = getProfileTables();
    var likert = getLikertTables();
    var count = 0;
    profile.forEach(function (t) {
      if (t && t.isSample && t.sampleFlag === SAMPLE_FLAG) return;
      if (t.interpretation && t.interpretation.trim()) count++;
    });
    likert.forEach(function (t) {
      if (t.interpretation && t.interpretation.trim()) count++;
    });
    return count;
  }

  function hasProfileData() {
    return getProfileTables().length > 0 || localStorage.getItem(KEYS.profileDataSaved) === 'true';
  }
  function hasLikertData() {
    return getLikertTables().length > 0 || localStorage.getItem(KEYS.likertDataSaved) === 'true';
  }
  function hasSummaryData() {
    return localStorage.getItem(KEYS.summaryDataSaved) === 'true';
  }
  function hasReportData() {
    return getNumber(KEYS.reportsCreated) > 0 || localStorage.getItem(KEYS.reportDataSaved) === 'true';
  }

  // ---------- Update KPI cards (from actual stored data) ----------
  function updateKpis() {
    var tables = document.getElementById('kpi-tables');
    var respondents = document.getElementById('kpi-respondents');
    var interpretations = document.getElementById('kpi-interpretations');
    var reports = document.getElementById('kpi-reports');
    if (tables) tables.textContent = getTablesCount();
    if (respondents) respondents.textContent = getRespondentsCount();
    if (interpretations) interpretations.textContent = getInterpretationsCount();
    if (reports) reports.textContent = getNumber(KEYS.reportsCreated);
  }

  // ---------- Update workflow steps (checkmarks) ----------
  function updateWorkflowSteps() {
    var step1 = document.getElementById('workflow-step-1');
    var step2 = document.getElementById('workflow-step-2');
    var step3 = document.getElementById('workflow-step-3');
    var step4 = document.getElementById('workflow-step-4');
    if (step1) step1.classList.toggle('is-done', hasProfileData());
    if (step2) step2.classList.toggle('is-done', hasLikertData());
    if (step3) step3.classList.toggle('is-done', hasSummaryData());
    if (step4) step4.classList.toggle('is-done', hasReportData());
  }

  // ---------- Render recent activity list ----------
  function renderRecentActivity() {
    var listEl = document.getElementById('recent-activity-list');
    var emptyEl = document.getElementById('recent-activity-empty');
    if (!listEl) return;

    var items = getActivityList();
    listEl.innerHTML = '';

    if (items.length === 0) {
      if (emptyEl) {
        var li = document.createElement('li');
        li.className = 'recent-activity__empty';
        li.id = 'recent-activity-empty';
        li.textContent = 'No analysis activity yet.';
        listEl.appendChild(li);
      }
      return;
    }

    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'recent-activity__item';
      var text = document.createElement('span');
      text.className = 'recent-activity__item-text';
      text.textContent = item.text || item.message || 'Activity';
      var time = document.createElement('span');
      time.className = 'recent-activity__item-time';
      time.textContent = formatTime(item.timestamp);
      li.appendChild(text);
      li.appendChild(time);
      listEl.appendChild(li);
    });
  }

  function formatTime(timestamp) {
    if (timestamp == null) return '';
    var d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Reset session: clear storage and reload ----------
  function resetSession() {
    try {
      localStorage.removeItem(KEYS.profileTables);
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.profileDataSaved);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem(KEYS.summaryDataSaved);
      localStorage.removeItem(KEYS.reportDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('interpretationsGenerated');
      localStorage.removeItem('generatedSummaries');
    } catch (e) {
      console.warn('Reset session: could not clear some keys', e);
    }
    closeModal();
    window.location.reload();
  }

  // ---------- Modal ----------
  var modal = document.getElementById('reset-modal');
  var modalBackdrop = document.getElementById('modal-backdrop');
  var modalCancel = document.getElementById('modal-cancel');
  var modalConfirm = document.getElementById('modal-confirm');

  function openModal() {
    if (modal) {
      modal.removeAttribute('hidden');
      modalConfirm && modalConfirm.focus();
    }
  }

  function closeModal() {
    if (modal) modal.setAttribute('hidden', '');
  }

  function initModal() {
    var btnReset = document.getElementById('btn-reset-session');
    var btnResetMobile = document.getElementById('btn-reset-mobile');
    if (btnReset) btnReset.addEventListener('click', openModal);
    if (btnResetMobile) btnResetMobile.addEventListener('click', openModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalConfirm) modalConfirm.addEventListener('click', resetSession);
    modal && modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ---------- Mobile menu ----------
  function initHamburger() {
    var hamburger = document.getElementById('hamburger');
    var dropdown = document.getElementById('nav-dropdown');
    if (!hamburger || !dropdown) return;

    function toggle() {
      var isOpen = dropdown.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', isOpen);
    }

    hamburger.addEventListener('click', toggle);
    dropdown.querySelectorAll('.nav-dropdown__link').forEach(function (link) {
      link.addEventListener('click', function () {
        dropdown.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Refresh when returning to dashboard ----------
  function refreshDashboard() {
    updateKpis();
    updateWorkflowSteps();
    renderRecentActivity();
  }

  // ---------- Init on DOM ready ----------
  function init() {
    refreshDashboard();
    initModal();
    initHamburger();

    // Refresh when user navigates back (e.g. back button) or tab becomes visible
    window.addEventListener('pageshow', refreshDashboard);
    window.addEventListener('focus', refreshDashboard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
