/**
 * Thesis Interpretation Assistant — Dashboard
 * Vanilla JS: loads session counters from localStorage, renders recent activity,
 * workflow step states, and handles Reset Session confirmation modal.
 *
 * Integration: Other pages (Profile Analyzer, Likert Analyzer, etc.) can update
 * the dashboard by writing to localStorage:
 *   - tablesProcessed, respondentsEncoded, interpretationsGenerated, reportsCreated (numbers)
 *   - recentActivity: JSON array of { text: "Description", timestamp: Date.now() }, max 10 items
 *   - profileDataSaved, likertDataSaved, summaryDataSaved, reportDataSaved ("true") for workflow checkmarks
 */

(function () {
  'use strict';

  // ---------- Storage keys (shared with other pages) ----------
  var KEYS = {
    tablesProcessed: 'tablesProcessed',
    respondentsEncoded: 'respondentsEncoded',
    interpretationsGenerated: 'interpretationsGenerated',
    reportsCreated: 'reportsCreated',
    recentActivity: 'recentActivity',
    profileDataSaved: 'profileDataSaved',
    likertDataSaved: 'likertDataSaved',
    summaryDataSaved: 'summaryDataSaved',
    reportDataSaved: 'reportDataSaved'
  };

  var MAX_ACTIVITY = 10;

  // ---------- Helpers: read from localStorage ----------
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

  function hasProfileData() {
    return getNumber(KEYS.tablesProcessed) > 0 || localStorage.getItem(KEYS.profileDataSaved) === 'true';
  }
  function hasLikertData() {
    return getNumber(KEYS.interpretationsGenerated) > 0 || localStorage.getItem(KEYS.likertDataSaved) === 'true';
  }
  function hasSummaryData() {
    return localStorage.getItem(KEYS.summaryDataSaved) === 'true';
  }
  function hasReportData() {
    return getNumber(KEYS.reportsCreated) > 0 || localStorage.getItem(KEYS.reportDataSaved) === 'true';
  }

  // ---------- Update KPI cards ----------
  function updateKpis() {
    var tables = document.getElementById('kpi-tables');
    var respondents = document.getElementById('kpi-respondents');
    var interpretations = document.getElementById('kpi-interpretations');
    var reports = document.getElementById('kpi-reports');
    if (tables) tables.textContent = getNumber(KEYS.tablesProcessed);
    if (respondents) respondents.textContent = getNumber(KEYS.respondentsEncoded);
    if (interpretations) interpretations.textContent = getNumber(KEYS.interpretationsGenerated);
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
      localStorage.removeItem(KEYS.tablesProcessed);
      localStorage.removeItem(KEYS.respondentsEncoded);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.profileDataSaved);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem(KEYS.summaryDataSaved);
      localStorage.removeItem(KEYS.reportDataSaved);
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

  // ---------- Init on DOM ready ----------
  function init() {
    updateKpis();
    updateWorkflowSteps();
    renderRecentActivity();
    initModal();
    initHamburger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
