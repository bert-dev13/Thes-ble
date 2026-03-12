/* Research Project Manager (shared across pages)
   - Persists to localStorage
   - Renders project dropdowns (Profile/Likert + any future selects)
   - Provides a small modal UI to add/edit/delete projects
   - Keeps selected project synchronized across pages/tabs
*/

(function () {
  'use strict';

  var STORAGE_KEY_PROJECTS = 'researchProjects';
  var STORAGE_KEY_SELECTED = 'selectedResearchProject';

  function defaultColumns() {
    return {
      profile: [
        { key: 'no', label: 'No.' },
        { key: 'particulars', label: 'Particulars' },
        { key: 'frequency', label: 'Frequency (f)' },
        { key: 'percentage', label: 'Percentage' },
        { key: 'rank', label: 'Rank' },
        { key: 'remove', label: 'Remove' }
      ],
      likert: [
        { key: 'no', label: 'No.' },
        { key: 'particulars', label: 'Particulars' },
        { key: 'wm', label: 'W.M.' },
        { key: 'qd', label: 'Q.D.' },
        { key: 'rank', label: 'Rank' },
        { key: 'remove', label: 'Remove' }
      ]
    };
  }

  function defaultProjects() {
    var base = defaultColumns();
    return [
      { id: 'rp1', name: 'Research Paper 1 — Cooperative Learning (Math G5)', columns: base },
      {
        id: 'rp2',
        name: 'Research Paper 2 — Science 3 (School Heads vs Teachers)',
        columns: {
          profile: [
            { key: 'no', label: 'No.' },
            { key: 'particulars', label: 'Particulars' },
            { key: 'sh_f', label: 'School Heads f' },
            { key: 'sh_pct', label: 'School Heads Percentage' },
            { key: 't_f', label: 'Teachers f' },
            { key: 't_pct', label: 'Teachers Percentage' },
            { key: 'remove', label: 'Remove' }
          ],
          likert: [
            { key: 'no', label: 'No.' },
            { key: 'particulars', label: 'Particulars' },
            { key: 'sh_wm', label: 'School Heads W.M.' },
            { key: 'sh_qd', label: 'School Heads Q.D.' },
            { key: 'sh_rank', label: 'School Heads Rank' },
            { key: 't_wm', label: 'Teachers W.M.' },
            { key: 't_qd', label: 'Teachers Q.D.' },
            { key: 't_rank', label: 'Teachers Rank' },
            { key: 'remove', label: 'Remove' }
          ]
        }
      }
    ];
  }

  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function normalizeColumns(columns) {
    if (!columns || typeof columns !== 'object') return null;
    function normList(arr) {
      if (!Array.isArray(arr)) return [];
      var out = [];
      var seen = {};
      arr.forEach(function (c) {
        if (!c || typeof c !== 'object') return;
        var key = (c.key != null ? String(c.key) : '').trim();
        var label = (c.label != null ? String(c.label) : '').trim();
        if (!key || !label) return;
        if (seen[key]) return;
        seen[key] = true;
        out.push({ key: key, label: label });
      });
      return out;
    }
    return {
      profile: normList(columns.profile),
      likert: normList(columns.likert)
    };
  }

  function normalizeProjects(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p || typeof p !== 'object') continue;
      var id = (p.id != null ? String(p.id) : '').trim();
      var name = (p.name != null ? String(p.name) : '').trim();
      if (!id || !name) continue;
      var cols = normalizeColumns(p.columns) || null;
      out.push({ id: id, name: name, columns: cols });
    }
    // de-dupe by id (first wins)
    var seen = {};
    return out.filter(function (p) {
      if (seen[p.id]) return false;
      seen[p.id] = true;
      return true;
    });
  }

  function loadProjects() {
    var raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    var parsed = normalizeProjects(safeJsonParse(raw, []));
    if (parsed.length) {
      // Backfill missing columns with defaults + ensure default projects exist
      var defaults = defaultProjects();
      var map = {};
      parsed.forEach(function (p) { map[p.id] = p; });

      // Re-add any missing default projects (e.g. user deleted rp1 by accident)
      defaults.forEach(function (d) {
        if (!map[d.id]) map[d.id] = { id: d.id, name: d.name, columns: d.columns };
      });

      var merged = Object.keys(map).map(function (id) { return map[id]; });
      merged = merged.map(function (p) {
        if (p.columns && p.columns.profile && p.columns.profile.length && p.columns.likert && p.columns.likert.length) return p;
        var def = defaults.find(function (d) { return d.id === p.id; });
        return { id: p.id, name: p.name, columns: (def && def.columns) ? def.columns : defaultColumns() };
      });

      // Persist the repair so refreshes are stable
      try { localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(normalizeProjects(merged))); } catch (e) {}
      return normalizeProjects(merged);
    }
    return defaultProjects();
  }

  function saveProjects(projects) {
    var normalized = normalizeProjects(projects);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(normalized));
    return normalized;
  }

  function getProjectById(projectId) {
    var projects = loadProjects();
    var id = String(projectId || '').trim();
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return projects[i];
    }
    return null;
  }

  function getProjectColumns(projectId, type) {
    var p = getProjectById(projectId);
    var t = String(type || '').toLowerCase();
    if (!p || !p.columns) return [];
    return (t === 'likert' ? (p.columns.likert || []) : (p.columns.profile || [])).slice();
  }

  function getSelectedProjectId(projects) {
    var id = (localStorage.getItem(STORAGE_KEY_SELECTED) || '').trim();
    if (!id) return projects[0] ? projects[0].id : '';
    var exists = projects.some(function (p) { return p.id === id; });
    return exists ? id : (projects[0] ? projects[0].id : '');
  }

  function setSelectedProjectId(projectId) {
    localStorage.setItem(STORAGE_KEY_SELECTED, String(projectId || '').trim());
    dispatchProjectEvent('research-project:selected', { selectedProjectId: String(projectId || '').trim() });
  }

  function getSelectedProjectName(projects, selectedId) {
    var match = projects.find ? projects.find(function (p) { return p.id === selectedId; }) : null;
    if (!match) {
      for (var i = 0; i < projects.length; i++) if (projects[i].id === selectedId) { match = projects[i]; break; }
    }
    return match ? match.name : '';
  }

  function dispatchProjectEvent(type, detail) {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail: detail || {} }));
    } catch (e) {
      // IE11 fallback not needed; keep safe for older engines
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(type, true, true, detail || {});
      window.dispatchEvent(ev);
    }
  }

  function getDropdownElements() {
    var els = [];
    // explicit known IDs
    var pa = document.getElementById('pa-project-select');
    var la = document.getElementById('la-project-select');
    if (pa) els.push(pa);
    if (la) els.push(la);
    // generic support
    document.querySelectorAll('select[data-rp-dropdown]').forEach(function (el) { els.push(el); });
    // unique
    return els.filter(function (el, idx) { return els.indexOf(el) === idx; });
  }

  function renderProjectDropdowns() {
    var projects = loadProjects();
    var selectedId = getSelectedProjectId(projects);

    // Keep storage valid
    localStorage.setItem(STORAGE_KEY_SELECTED, selectedId);

    var dropdowns = getDropdownElements();
    dropdowns.forEach(function (select) {
      var previousValue = select.value;
      select.innerHTML = '';
      projects.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });

      // prefer persisted selection, otherwise keep previous if still valid
      var canKeepPrev = previousValue && projects.some(function (p) { return p.id === previousValue; });
      select.value = canKeepPrev ? previousValue : selectedId;

      if (!select.__rpBound) {
        select.addEventListener('change', function () {
          var id = this.value;
          localStorage.setItem(STORAGE_KEY_SELECTED, id);
          dispatchProjectEvent('research-project:selected', { selectedProjectId: id });
          syncSelectedProjectAcrossPages();
        });
        select.__rpBound = true;
      }
    });

    syncSelectedProjectAcrossPages();
  }

  function syncSelectedProjectAcrossPages() {
    var projects = loadProjects();
    var selectedId = getSelectedProjectId(projects);
    var name = getSelectedProjectName(projects, selectedId);

    // Update any selected-name placeholders
    document.querySelectorAll('[data-rp-selected-name]').forEach(function (el) {
      el.textContent = name || '—';
    });

    // Update any selected-id placeholders
    document.querySelectorAll('[data-rp-selected-id]').forEach(function (el) {
      el.textContent = selectedId || '—';
    });

    // Ensure dropdowns reflect current selection
    getDropdownElements().forEach(function (select) {
      if (select && select.value !== selectedId) select.value = selectedId;
    });
  }

  function createProjectId(existing) {
    var base = 'project_' + Date.now().toString(36);
    var id = base;
    var n = 1;
    while (existing.some(function (p) { return p.id === id; })) {
      n++;
      id = base + '_' + n;
    }
    return id;
  }

  function addProject(name) {
    var projects = loadProjects();
    var trimmed = String(name || '').trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    var id = createProjectId(projects);
    projects.push({ id: id, name: trimmed, columns: defaultColumns() });
    saveProjects(projects);
    renderProjectDropdowns();
    setSelectedProjectId(id);
    return { ok: true, id: id };
  }

  function editProject(projectId, newName) {
    var projects = loadProjects();
    var id = String(projectId || '').trim();
    var name = String(newName || '').trim();
    if (!id || !name) return { ok: false };
    var changed = false;
    projects = projects.map(function (p) {
      if (p.id !== id) return p;
      changed = true;
      return { id: p.id, name: name, columns: p.columns || defaultColumns() };
    });
    if (!changed) return { ok: false };
    saveProjects(projects);
    renderProjectDropdowns();
    dispatchProjectEvent('research-project:updated', { projectId: id, name: name });
    return { ok: true };
  }

  function upsertProjectColumns(projectId, type, columns) {
    var projects = loadProjects();
    var id = String(projectId || '').trim();
    var t = String(type || '').toLowerCase();
    if (!id || (t !== 'profile' && t !== 'likert')) return { ok: false };
    var nextCols = normalizeColumns(t === 'profile' ? { profile: columns, likert: [] } : { profile: [], likert: columns });
    if (!nextCols) return { ok: false };

    var changed = false;
    projects = projects.map(function (p) {
      if (p.id !== id) return p;
      changed = true;
      var cols = p.columns || defaultColumns();
      if (t === 'profile') cols.profile = nextCols.profile;
      else cols.likert = nextCols.likert;
      return { id: p.id, name: p.name, columns: cols };
    });
    if (!changed) return { ok: false };
    saveProjects(projects);
    dispatchProjectEvent('research-project:structure-updated', { projectId: id, type: t });
    return { ok: true };
  }

  function deleteProject(projectId) {
    var projects = loadProjects();
    if (projects.length <= 1) return { ok: false, reason: 'last' };
    var id = String(projectId || '').trim();
    var remaining = projects.filter(function (p) { return p.id !== id; });
    if (remaining.length === projects.length) return { ok: false, reason: 'missing' };
    saveProjects(remaining);

    var selected = localStorage.getItem(STORAGE_KEY_SELECTED) || '';
    if (selected === id) {
      localStorage.setItem(STORAGE_KEY_SELECTED, remaining[0] ? remaining[0].id : '');
    }

    renderProjectDropdowns();
    dispatchProjectEvent('research-project:deleted', { projectId: id });
    return { ok: true };
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#96;'); }

  // Cross-tab/page sync
  window.addEventListener('storage', function (e) {
    if (!e || (e.key !== STORAGE_KEY_PROJECTS && e.key !== STORAGE_KEY_SELECTED)) return;
    renderProjectDropdowns();
  });

  // Expose API (requested function names)
  window.ResearchProjectManager = {
    loadProjects: loadProjects,
    saveProjects: saveProjects,
    renderProjectDropdowns: renderProjectDropdowns,
    addProject: addProject,
    editProject: editProject,
    deleteProject: deleteProject,
    getProjectColumns: getProjectColumns,
    upsertProjectColumns: upsertProjectColumns,
    syncSelectedProjectAcrossPages: syncSelectedProjectAcrossPages,
    setSelectedProject: setSelectedProjectId
  };

  // Init on DOM ready
  function init() {
    // Initialize storage if empty
    var projects = loadProjects();
    saveProjects(projects);
    localStorage.setItem(STORAGE_KEY_SELECTED, getSelectedProjectId(projects));
    renderProjectDropdowns();
    syncSelectedProjectAcrossPages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

