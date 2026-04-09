// popup.js -- Popup dashboard

(function () {
  'use strict';

  var masterToggle = document.getElementById('masterToggle');
  var toggleContainer = document.getElementById('toggleContainer');
  var searchInput = document.getElementById('searchInput');
  var resetBtn = document.getElementById('resetBtn');
  var importBtn = document.getElementById('importBtn');
  var exportBtn = document.getElementById('exportBtn');
  var importFile = document.getElementById('importFile');
  var toastEl = document.getElementById('toast');
  var activeCountEl = document.getElementById('activeCount');

  var EXPORT_VERSION = 1;
  var toastTimer = null;

  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  var currentPath = null;
  // Per-category collapse preference. Only set by explicit user toggles;
  // initial collapse is decided by page relevance.
  var collapsedCategories = {};

  // ============ Utilities ============

  function groupToggles() {
    var byCat = {};
    for (var id in TOGGLE_META) {
      var meta = TOGGLE_META[id];
      if (!byCat[meta.category]) byCat[meta.category] = [];
      byCat[meta.category].push({ id: id, meta: meta });
    }
    var ordered = [];
    for (var i = 0; i < CATEGORY_ORDER.length; i++) {
      if (byCat[CATEGORY_ORDER[i]]) ordered.push({ name: CATEGORY_ORDER[i], items: byCat[CATEGORY_ORDER[i]] });
    }
    var extras = Object.keys(byCat).filter(function (c) { return CATEGORY_ORDER.indexOf(c) === -1; }).sort();
    for (var j = 0; j < extras.length; j++) {
      ordered.push({ name: extras[j], items: byCat[extras[j]] });
    }
    return ordered;
  }

  function toggleMatchesCurrentPage(meta) {
    if (!currentPath) return false;
    if (!meta.pages) return false;
    for (var i = 0; i < meta.pages.length; i++) {
      var p = meta.pages[i];
      if (p === '*') return true;
      if (currentPath.indexOf(p) === 0) return true;
    }
    return false;
  }

  function categoryHasPageRelevantToggle(items) {
    for (var i = 0; i < items.length; i++) {
      if (toggleMatchesCurrentPage(items[i].meta)) {
        // Don't count global ('*') toggles as "page-specific relevant"
        // -- otherwise every category would highlight.
        if (items[i].meta.pages && items[i].meta.pages.indexOf('*') === -1) return true;
      }
    }
    return false;
  }

  // ============ Build UI ============

  function buildToggles() {
    while (toggleContainer.firstChild) toggleContainer.removeChild(toggleContainer.firstChild);

    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.id = 'emptyState';
    empty.textContent = 'No toggles match your search.';
    toggleContainer.appendChild(empty);

    var groups = groupToggles();
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var categoryEl = document.createElement('div');
      categoryEl.className = 'category';
      categoryEl.setAttribute('data-category', group.name);

      var isActiveCat = categoryHasPageRelevantToggle(group.items);
      if (isActiveCat) categoryEl.classList.add('active');

      // Header
      var header = document.createElement('div');
      header.className = 'category-header';

      var chevron = document.createElement('span');
      chevron.className = 'category-chevron';
      chevron.textContent = '\u25B8';
      header.appendChild(chevron);

      var dot = document.createElement('span');
      dot.className = 'category-active-dot';
      header.appendChild(dot);

      var name = document.createElement('span');
      name.className = 'category-name';
      name.textContent = group.name;
      header.appendChild(name);

      var count = document.createElement('span');
      count.className = 'category-count';
      count.setAttribute('data-cat-count', group.name);
      header.appendChild(count);

      var catSwitch = document.createElement('label');
      catSwitch.className = 'switch';
      catSwitch.setAttribute('data-cat-switch', group.name);
      var catInput = document.createElement('input');
      catInput.type = 'checkbox';
      catInput.setAttribute('data-cat-input', group.name);
      var catSlider = document.createElement('span');
      catSlider.className = 'slider';
      catSwitch.appendChild(catInput);
      catSwitch.appendChild(catSlider);
      catSwitch.addEventListener('click', function (ev) { ev.stopPropagation(); });
      header.appendChild(catSwitch);

      categoryEl.appendChild(header);

      // Body
      var body = document.createElement('div');
      body.className = 'category-body';

      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var row = document.createElement('div');
        row.className = 'toggle-row';
        row.setAttribute('data-toggle-row', item.id);
        if (toggleMatchesCurrentPage(item.meta)) row.classList.add('active-on-page');

        var label = document.createElement('span');
        label.className = 'toggle-label';
        label.textContent = item.meta.label;
        row.appendChild(label);

        var sw = document.createElement('label');
        sw.className = 'switch';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.setAttribute('data-toggle', item.id);
        var sl = document.createElement('span');
        sl.className = 'slider';
        sw.appendChild(cb);
        sw.appendChild(sl);
        row.appendChild(sw);

        body.appendChild(row);
      }

      categoryEl.appendChild(body);

      // Initial collapse state: only expand categories with page-relevant toggles.
      var userPref = collapsedCategories[group.name];
      if (userPref === true) {
        categoryEl.classList.add('collapsed');
      } else if (userPref === false) {
        // User explicitly expanded
      } else {
        if (!isActiveCat) categoryEl.classList.add('collapsed');
      }

      toggleContainer.appendChild(categoryEl);
    }
  }

  // ============ State sync ============

  function readTogglesFromUI() {
    var toggles = {};
    var checkboxes = toggleContainer.querySelectorAll('input[data-toggle]');
    for (var i = 0; i < checkboxes.length; i++) {
      toggles[checkboxes[i].getAttribute('data-toggle')] = checkboxes[i].checked;
    }
    return toggles;
  }

  function updateCategoryHeaders() {
    var groups = groupToggles();
    var totalActive = 0;
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var on = 0;
      for (var i = 0; i < group.items.length; i++) {
        var cb = toggleContainer.querySelector('input[data-toggle="' + group.items[i].id + '"]');
        if (cb && cb.checked) { on++; totalActive++; }
      }
      var total = group.items.length;
      var catInput = toggleContainer.querySelector('input[data-cat-input="' + group.name + '"]');
      var catSwitch = toggleContainer.querySelector('label[data-cat-switch="' + group.name + '"]');
      var catCount = toggleContainer.querySelector('span[data-cat-count="' + group.name + '"]');
      if (catCount) catCount.textContent = on + '/' + total;
      if (catInput && catSwitch) {
        if (on === 0) {
          catInput.checked = false;
          catSwitch.classList.remove('partial');
        } else if (on === total) {
          catInput.checked = true;
          catSwitch.classList.remove('partial');
        } else {
          catInput.checked = false;
          catSwitch.classList.add('partial');
        }
      }
    }
    if (activeCountEl) {
      activeCountEl.textContent = totalActive + ' active';
    }
  }

  function loadState() {
    chrome.storage.sync.get(null, function (data) {
      var state = data && data.masterEnabled !== undefined ? data : DEFAULT_STATE;

      masterToggle.checked = !!state.masterEnabled;
      document.body.classList.toggle('master-off', !state.masterEnabled);

      var mergedToggles = Object.assign({}, DEFAULT_TOGGLES, state.toggles || {});
      var checkboxes = toggleContainer.querySelectorAll('input[data-toggle]');
      for (var j = 0; j < checkboxes.length; j++) {
        var id = checkboxes[j].getAttribute('data-toggle');
        checkboxes[j].checked = !!mergedToggles[id];
      }

      updateCategoryHeaders();
    });
  }

  function saveState() {
    var toggles = readTogglesFromUI();
    chrome.storage.sync.set({
      masterEnabled: masterToggle.checked,
      toggles: toggles
    });
    updateCategoryHeaders();
  }

  // ============ Event handlers ============

  masterToggle.addEventListener('change', function () {
    document.body.classList.toggle('master-off', !masterToggle.checked);
    saveState();
  });

  // Delegated change for individual toggles and category masters.
  toggleContainer.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.getAttribute('data-toggle')) {
      saveState();
      return;
    }
    if (t && t.getAttribute('data-cat-input')) {
      var catName = t.getAttribute('data-cat-input');
      var groups = groupToggles();
      for (var g = 0; g < groups.length; g++) {
        if (groups[g].name !== catName) continue;
        for (var i = 0; i < groups[g].items.length; i++) {
          var cb = toggleContainer.querySelector('input[data-toggle="' + groups[g].items[i].id + '"]');
          if (cb) cb.checked = t.checked;
        }
        break;
      }
      saveState();
    }
  });

  // Category header click -> collapse/expand.
  toggleContainer.addEventListener('click', function (e) {
    var header = e.target.closest && e.target.closest('.category-header');
    if (!header) return;
    // Ignore clicks on the category switch (they have their own handler).
    if (e.target.closest('.switch')) return;
    var category = header.parentElement;
    if (!category || !category.classList.contains('category')) return;
    var catName = category.getAttribute('data-category');
    category.classList.toggle('collapsed');
    collapsedCategories[catName] = category.classList.contains('collapsed');
  });

  // Search filter.
  searchInput.addEventListener('input', function () {
    var q = searchInput.value.trim().toLowerCase();
    var categories = toggleContainer.querySelectorAll('.category');
    var anyVisible = false;
    for (var c = 0; c < categories.length; c++) {
      var cat = categories[c];
      var rows = cat.querySelectorAll('.toggle-row');
      var rowsVisible = 0;
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var lbl = row.querySelector('.toggle-label');
        var text = (lbl ? lbl.textContent : '').toLowerCase();
        var catName = cat.getAttribute('data-category').toLowerCase();
        var match = !q || text.indexOf(q) > -1 || catName.indexOf(q) > -1;
        row.classList.toggle('hidden', !match);
        if (match) rowsVisible++;
      }
      cat.classList.toggle('hidden', rowsVisible === 0);
      if (rowsVisible > 0) {
        anyVisible = true;
        if (q) cat.classList.remove('collapsed');
      }
    }
    var empty = document.getElementById('emptyState');
    if (empty) empty.classList.toggle('show', !anyVisible);
  });

  // Reset -- restore default toggles (master stays as-is).
  resetBtn.addEventListener('click', function () {
    var checkboxes = toggleContainer.querySelectorAll('input[data-toggle]');
    for (var i = 0; i < checkboxes.length; i++) {
      var id = checkboxes[i].getAttribute('data-toggle');
      checkboxes[i].checked = !!DEFAULT_TOGGLES[id];
    }
    saveState();
    showToast('Reset to defaults');
  });

  // Export -- copy current settings as JSON to clipboard.
  exportBtn.addEventListener('click', function () {
    var payload = {
      version: EXPORT_VERSION,
      extension: 'NoiseOut',
      exportedAt: new Date().toISOString(),
      masterEnabled: masterToggle.checked,
      toggles: readTogglesFromUI()
    };
    var json = JSON.stringify(payload, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        showToast('Settings copied to clipboard');
      }, function () {
        showToast('Clipboard blocked — paste from devtools', true);
      });
    } else {
      showToast('Clipboard not available', true);
    }
  });

  // Import -- open the file picker.
  importBtn.addEventListener('click', function () {
    importFile.value = '';
    importFile.click();
  });

  importFile.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var raw = ev.target && ev.target.result;
      if (typeof raw !== 'string') { showToast('Could not read file', true); return; }
      try {
        applyImportedJson(raw);
      } catch (err) {
        showToast('Invalid settings file', true);
      }
    };
    reader.onerror = function () { showToast('Read error', true); };
    reader.readAsText(file);
  });

  // Validate and apply an imported settings JSON string. Only known toggle
  // keys from TOGGLE_META are accepted; unknown keys are silently dropped
  // so a malformed/hostile file can't inject anything.
  function applyImportedJson(raw) {
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { showToast('Invalid JSON', true); return; }
    if (!parsed || typeof parsed !== 'object') { showToast('Invalid settings', true); return; }
    var src = parsed.toggles && typeof parsed.toggles === 'object' ? parsed.toggles : null;
    if (!src) { showToast('No toggles found', true); return; }

    var applied = 0;
    var checkboxes = toggleContainer.querySelectorAll('input[data-toggle]');
    for (var i = 0; i < checkboxes.length; i++) {
      var id = checkboxes[i].getAttribute('data-toggle');
      if (!TOGGLE_META[id]) continue;
      if (Object.prototype.hasOwnProperty.call(src, id)) {
        checkboxes[i].checked = src[id] === true;
        applied++;
      } else {
        // Unknown or missing -- fall back to default.
        checkboxes[i].checked = !!DEFAULT_TOGGLES[id];
      }
    }

    if (typeof parsed.masterEnabled === 'boolean') {
      masterToggle.checked = parsed.masterEnabled;
      document.body.classList.toggle('master-off', !masterToggle.checked);
    }

    saveState();
    showToast('Imported ' + applied + ' toggle' + (applied === 1 ? '' : 's'));
  }

  // ============ Init ============

  function loadCurrentTab(cb) {
    if (!chrome.tabs || !chrome.tabs.query) { cb(null); return; }
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || !tabs.length) { cb(null); return; }
        var url = tabs[0].url || '';
        try {
          var u = new URL(url);
          cb(u.hostname.indexOf('linkedin.com') > -1 ? u.pathname : null);
        } catch (e) { cb(null); }
      });
    } catch (e) { cb(null); }
  }

  loadCurrentTab(function (path) {
    currentPath = path;
    buildToggles();
    loadState();
  });
})();
