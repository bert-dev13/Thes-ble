/* Projects page */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var modalState = {
    mode: 'new', // 'new' | 'edit'
    editingId: null,
    activeTab: 'profile',
    draftName: '',
    draftProfile: [],
    draftLikert: []
  };

  function cloneCols(cols) {
    if (!Array.isArray(cols)) return [];
    return cols.map(function (c) {
      return { key: String(c.key || '').trim(), label: String(c.label || '').trim() };
    }).filter(function (c) { return c.key && c.label; });
  }

  function defaultCols(type) {
    var rpm = window.ResearchProjectManager;
    var defaults = rpm && rpm.loadProjects ? rpm.loadProjects() : [];
    // pull defaults from rp1 which always exists now
    var rp1 = defaults.find ? defaults.find(function (p) { return p.id === 'rp1'; }) : null;
    if (!rp1) {
      for (var i = 0; i < defaults.length; i++) if (defaults[i].id === 'rp1') { rp1 = defaults[i]; break; }
    }
    var cols = rp1 && rp1.columns ? (type === 'likert' ? rp1.columns.likert : rp1.columns.profile) : [];
    return cloneCols(cols);
  }

  function renderList() {
    var rpm = window.ResearchProjectManager;
    var list = $('ppm-project-list');
    if (!rpm || !list) return;
    var projects = rpm.loadProjects();
    var selected = localStorage.getItem('selectedResearchProject') || '';
    list.innerHTML = '';

    projects.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'ppm-table__row';
      row.innerHTML =
        '<div class="ppm-table__cell ppm-table__cell--name">' +
          '<div style="font-weight:700;">' + escapeHtml(p.name) + '</div>' +
          '<div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.15rem;">ID: ' + escapeHtml(p.id) + (p.id === selected ? ' • Selected' : '') + '</div>' +
        '</div>' +
        '<div class="ppm-table__cell ppm-table__cell--actions">' +
          '<button type="button" class="btn btn--secondary btn--sm" data-ppm-edit="' + escapeAttr(p.id) + '">Edit</button>' +
          '<button type="button" class="btn btn--danger btn--sm" data-ppm-delete="' + escapeAttr(p.id) + '">Delete</button>' +
        '</div>';
      list.appendChild(row);
    });

    list.querySelectorAll('[data-ppm-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ppm-edit');
        startEdit(id);
      });
    });
    list.querySelectorAll('[data-ppm-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ppm-delete');
        var ok = window.confirm('Are you sure you want to delete this research project?');
        if (!ok) return;
        var res = rpm.deleteProject(id);
        if (!res.ok && res.reason === 'last') {
          window.alert('You must keep at least one research project.');
          return;
        }
        renderList();
      });
    });
  }

  function startNew() {
    // Open modal for creating a project (with columns)
    openProjectModalNew();
  }

  function startEdit(projectId) {
    var rpm = window.ResearchProjectManager;
    var projects = rpm.loadProjects();
    var p = projects.find ? projects.find(function (x) { return x.id === projectId; }) : null;
    if (!p) {
      for (var i = 0; i < projects.length; i++) if (projects[i].id === projectId) { p = projects[i]; break; }
    }
    if (!p) return;
    openProjectModalEdit(p);
  }

  function openProjectModalNew() {
    modalState.mode = 'new';
    modalState.editingId = null;
    modalState.activeTab = 'profile';
    modalState.draftName = '';
    modalState.draftProfile = defaultCols('profile');
    modalState.draftLikert = defaultCols('likert');
    var title = $('ppm-modal-title');
    if (title) title.textContent = 'New Project';
    var name = $('ppm-modal-project-name');
    if (name) name.value = '';
    setModalTabUi();
    renderModalCols();
    renderModalPreview();
    openModal();
    if (name) name.focus();
  }

  function openProjectModalEdit(project) {
    modalState.mode = 'edit';
    modalState.editingId = project.id;
    modalState.activeTab = 'profile';
    modalState.draftName = project.name;
    modalState.draftProfile = cloneCols((project.columns && project.columns.profile) || defaultCols('profile'));
    modalState.draftLikert = cloneCols((project.columns && project.columns.likert) || defaultCols('likert'));
    var title = $('ppm-modal-title');
    if (title) title.textContent = 'Edit Project';
    var name = $('ppm-modal-project-name');
    if (name) name.value = project.name;
    setModalTabUi();
    renderModalCols();
    renderModalPreview();
    openModal();
  }

  function openModal() {
    var m = $('ppm-project-modal');
    if (m) m.hidden = false;
  }
  function closeModal() {
    var m = $('ppm-project-modal');
    if (m) m.hidden = true;
  }

  function getModalActiveCols() {
    return modalState.activeTab === 'likert' ? modalState.draftLikert : modalState.draftProfile;
  }
  function setModalActiveCols(next) {
    if (modalState.activeTab === 'likert') modalState.draftLikert = next;
    else modalState.draftProfile = next;
  }

  function setModalTabUi() {
    document.querySelectorAll('[data-ppm-modal-tab]').forEach(function (btn) {
      var tab = btn.getAttribute('data-ppm-modal-tab');
      var active = tab === modalState.activeTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderModalCols() {
    var wrap = $('ppm-modal-cols');
    if (!wrap) return;
    var cols = getModalActiveCols();
    wrap.innerHTML = '';

    // header row
    var head = document.createElement('div');
    head.className = 'ppm-cols__head';
    head.innerHTML =
      '<div>Column Name</div>' +
      '<div>Key</div>' +
      '<div style="text-align:right;">Actions</div>';
    wrap.appendChild(head);

    cols.forEach(function (c, idx) {
      var row = document.createElement('div');
      row.className = 'ppm-col--compact';
      row.innerHTML =
        '<input type="text" class="ppm-input" value="' + escapeAttr(c.label) + '" data-ppm-m-col-label aria-label="Column name" />' +
        '<input type="text" class="ppm-input ppm-col__key" value="' + escapeAttr(c.key) + '" data-ppm-m-col-key aria-label="Column key" />' +
        '<div class="ppm-col__actions" style="justify-content:flex-end;">' +
          '<button type="button" class="ppm-icon-btn" title="Move up" aria-label="Move up" data-ppm-m-up>↑</button>' +
          '<button type="button" class="ppm-icon-btn" title="Move down" aria-label="Move down" data-ppm-m-down>↓</button>' +
          '<button type="button" class="ppm-icon-btn ppm-icon-btn--danger" title="Delete" aria-label="Delete" data-ppm-m-del>🗑</button>' +
        '</div>';
      var input = row.querySelector('[data-ppm-m-col-label]');
      var keyInput = row.querySelector('[data-ppm-m-col-key]');
      var up = row.querySelector('[data-ppm-m-up]');
      var down = row.querySelector('[data-ppm-m-down]');
      var del = row.querySelector('[data-ppm-m-del]');

      if (input) input.addEventListener('input', function () {
        var next = cols.slice().map(function (x) { return { key: x.key, label: x.label }; });
        next[idx].label = (input.value || '').trim();
        setModalActiveCols(next);
        renderModalPreview();
      });
      if (keyInput) keyInput.addEventListener('input', function () {
        var next = cols.slice().map(function (x) { return { key: x.key, label: x.label }; });
        next[idx].key = (keyInput.value || '').trim();
        setModalActiveCols(next);
        renderModalPreview();
      });
      if (up) up.addEventListener('click', function () {
        if (idx <= 0) return;
        var next = cols.slice();
        var tmp = next[idx - 1]; next[idx - 1] = next[idx]; next[idx] = tmp;
        setModalActiveCols(next);
        renderModalCols(); renderModalPreview();
      });
      if (down) down.addEventListener('click', function () {
        if (idx >= cols.length - 1) return;
        var next = cols.slice();
        var tmp = next[idx + 1]; next[idx + 1] = next[idx]; next[idx] = tmp;
        setModalActiveCols(next);
        renderModalCols(); renderModalPreview();
      });
      if (del) del.addEventListener('click', function () {
        if (cols.length <= 1) return;
        var next = cols.slice();
        next.splice(idx, 1);
        setModalActiveCols(next);
        renderModalCols(); renderModalPreview();
      });

      wrap.appendChild(row);
    });
  }

  function renderModalPreview() {
    var wrap = $('ppm-modal-preview');
    if (!wrap) return;
    var cols = getModalActiveCols().filter(function (c) { return c && c.key !== 'remove'; });
    if (!cols.length) { wrap.innerHTML = ''; return; }
    var gridCols = Math.min(6, Math.max(2, cols.length));
    wrap.innerHTML =
      '<div class="ppm-preview__grid" style="grid-template-columns: repeat(' + gridCols + ', minmax(0, 1fr));">' +
      cols.slice(0, 18).map(function (c) {
        return '<div class="ppm-preview__cell">' + escapeHtml(c.label) + '</div>';
      }).join('') +
      '</div>';
  }

  function modalAddColumn() {
    var cols = getModalActiveCols().slice();
    cols.push({ key: createColumnKey(cols), label: 'New Column' });
    setModalActiveCols(cols);
    renderModalCols();
    renderModalPreview();
  }

  function modalSave() {
    var rpm = window.ResearchProjectManager;
    var nameEl = $('ppm-modal-project-name');
    var name = (nameEl && nameEl.value ? nameEl.value : '').trim();
    if (!name) return;

    if (modalState.mode === 'new') {
      var res = rpm.addProject(name);
      if (!res.ok) return;
      rpm.upsertProjectColumns(res.id, 'profile', modalState.draftProfile);
      rpm.upsertProjectColumns(res.id, 'likert', modalState.draftLikert);
      closeModal();
      renderList();
      return;
    }

    if (modalState.mode === 'edit' && modalState.editingId) {
      rpm.editProject(modalState.editingId, name);
      rpm.upsertProjectColumns(modalState.editingId, 'profile', modalState.draftProfile);
      rpm.upsertProjectColumns(modalState.editingId, 'likert', modalState.draftLikert);
      closeModal();
      renderList();
    }
  }

  function createColumnKey(existing) {
    var base = 'col_' + Date.now().toString(36);
    var key = base;
    var seen = {};
    (existing || []).forEach(function (c) { if (c && c.key) seen[c.key] = true; });
    var n = 1;
    while (seen[key]) { n++; key = base + '_' + n; }
    return key;
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

  function bind() {
    var add = $('ppm-add-project');

    if (add) add.addEventListener('click', startNew);

    // Modal bindings
    var modalClose = $('ppm-modal-close');
    var modalCancel = $('ppm-modal-cancel');
    var modalBackdrop = $('ppm-modal-backdrop');
    var modalAddColBtn = $('ppm-modal-add-col');
    var modalSaveBtn = $('ppm-modal-save');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (modalAddColBtn) modalAddColBtn.addEventListener('click', modalAddColumn);
    if (modalSaveBtn) modalSaveBtn.addEventListener('click', modalSave);
    document.querySelectorAll('[data-ppm-modal-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        modalState.activeTab = btn.getAttribute('data-ppm-modal-tab') || 'profile';
        setModalTabUi();
        renderModalCols();
        renderModalPreview();
      });
    });
    var modalName = $('ppm-modal-project-name');
    if (modalName) modalName.addEventListener('input', function () {
      modalState.draftName = (modalName.value || '').trim();
    });
    document.addEventListener('keydown', function (e) {
      if (e && e.key === 'Escape') {
        var m = $('ppm-project-modal');
        if (m && !m.hidden) closeModal();
      }
    });

    // simple hamburger for this page
    var hamburger = $('hamburger');
    var dropdown = $('nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    window.addEventListener('storage', function (e) {
      if (!e || (e.key !== 'researchProjects' && e.key !== 'selectedResearchProject')) return;
      renderList();
    });
  }

  function init() {
    if (!window.ResearchProjectManager) return;
    window.ResearchProjectManager.renderProjectDropdowns();
    renderList();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

