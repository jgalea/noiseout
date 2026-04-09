// content.js -- Main content script
// Injects CSS rules and runs JS finders for elements that need DOM walking.

(function () {
  'use strict';

  var STYLE_ID = 'linkedin-focus-styles';
  var BLOCKER_ID = 'linkedin-focus-blocker';
  var HIDE_ATTR = 'data-linkedin-focus-hidden';
  var currentToggles = null;
  var mainObserver = null;
  var rafScheduled = false;

  // Inject a "blocker" style synchronously at document_start so the page
  // stays invisible until init() has applied CSS rules and run the first
  // finder pass. Eliminates the flash of unhidden content. A safety timeout
  // forces a reveal after 800ms in case storage / DOM is slow.
  function installBlocker() {
    if (document.getElementById(BLOCKER_ID)) return;
    var blocker = document.createElement('style');
    blocker.id = BLOCKER_ID;
    blocker.textContent = 'html { visibility: hidden !important; }';
    (document.head || document.documentElement).appendChild(blocker);
    setTimeout(removeBlocker, 800);
  }

  function removeBlocker() {
    var b = document.getElementById(BLOCKER_ID);
    if (b) b.remove();
  }

  // Build CSS text from active toggles. Supports two shapes:
  //   css:      array of selectors -> each becomes `selector { display: none !important; }`
  //   cssRules: array of complete CSS rule strings injected as-is
  function buildCSS(toggles) {
    var rules = [];
    for (var toggleId in toggles) {
      if (!toggles[toggleId]) continue;
      var sel = SELECTORS[toggleId];
      if (!sel) continue;
      if (sel.css) {
        for (var i = 0; i < sel.css.length; i++) {
          rules.push(sel.css[i] + ' { display: none !important; }');
        }
      }
      if (sel.cssRules) {
        for (var k = 0; k < sel.cssRules.length; k++) {
          rules.push(sel.cssRules[k]);
        }
      }
    }
    return rules.join('\n');
  }

  function applyCSS(toggles) {
    var styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = buildCSS(toggles);
  }

  function removeCSS() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  // Run all enabled finders, hide returned elements via inline style.
  // Hides are sticky by default: elements previously hidden by a finder
  // stay hidden even if the finder no longer returns them (so we don't
  // oscillate when our own display:none zeros out an element's rect and
  // makes it "invisible" to the finder on the next pass).
  // A selector can opt into dynamic behaviour by providing `stillValid(el)`
  // -- if present, previously-hidden elements are only kept hidden while
  // that function returns true.
  function runFinders(toggles) {
    for (var toggleId in toggles) {
      if (!toggles[toggleId]) continue;
      var sel = SELECTORS[toggleId];
      if (!sel || typeof sel.find !== 'function') continue;
      var elements;
      try {
        elements = sel.find();
      } catch (e) {
        elements = [];
      }
      elements = elements || [];
      var newSet = new Set(elements);

      // For previously hidden elements not in the new set, consult
      // stillValid() if available. If not, keep them hidden.
      var prevHidden = document.querySelectorAll('[' + HIDE_ATTR + '="' + toggleId + '"]');
      for (var p = 0; p < prevHidden.length; p++) {
        if (newSet.has(prevHidden[p])) continue;
        if (typeof sel.stillValid === 'function') {
          var keep = false;
          try { keep = !!sel.stillValid(prevHidden[p]); } catch (e) { keep = false; }
          if (!keep) {
            prevHidden[p].style.removeProperty('display');
            prevHidden[p].removeAttribute(HIDE_ATTR);
          }
        }
        // else: sticky, leave it hidden
      }

      // Hide new elements.
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        if (!el) continue;
        if (el.getAttribute(HIDE_ATTR) === toggleId) continue;
        el.setAttribute(HIDE_ATTR, toggleId);
        el.style.setProperty('display', 'none', 'important');
      }
    }
  }

  // Unhide all finder-hidden elements (so disabled toggles take effect).
  function unhideAll() {
    var hidden = document.querySelectorAll('[' + HIDE_ATTR + ']');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.removeProperty('display');
      hidden[i].removeAttribute(HIDE_ATTR);
    }
  }

  function applyAll(toggles) {
    currentToggles = toggles;
    applyCSS(toggles);
    unhideAll();
    runFinders(toggles);
  }

  function scheduleRun() {
    if (!currentToggles || rafScheduled) return;
    rafScheduled = true;
    setTimeout(function () {
      rafScheduled = false;
      runFinders(currentToggles);
    }, 0);
  }

  function startObserver() {
    if (mainObserver) return;
    var attach = function () {
      if (!document.body) {
        var wait = new MutationObserver(function () {
          if (document.body) {
            wait.disconnect();
            attach();
          }
        });
        wait.observe(document.documentElement, { childList: true });
        return;
      }
      mainObserver = new MutationObserver(function () {
        scheduleRun();
      });
      mainObserver.observe(document.body, { childList: true, subtree: true });
      // Initial sweep
      scheduleRun();
    };
    attach();
  }

  function stopObserver() {
    if (mainObserver) {
      mainObserver.disconnect();
      mainObserver = null;
    }
    rafScheduled = false;
    unhideAll();
  }

  function init() {
    chrome.storage.sync.get(null, function (data) {
      var state = data.masterEnabled !== undefined ? data : DEFAULT_STATE;
      if (!state.masterEnabled) {
        removeCSS();
        stopObserver();
        removeBlocker();
        currentToggles = null;
        return;
      }
      applyAll(state.toggles);
      startObserver();
      // Reveal the page now that the first finder pass is done.
      removeBlocker();
    });
  }

  var storageChangeTimer = null;
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    if (storageChangeTimer) clearTimeout(storageChangeTimer);
    storageChangeTimer = setTimeout(function () {
      storageChangeTimer = null;
      init();
    }, 50);
  });

  // LinkedIn is an SPA. Content scripts live in an isolated world so we
  // can't monkey-patch the page's history.pushState. Instead poll the
  // pathname. When it changes, re-run finders with a few staggered sweeps
  // so lazy-loaded content gets caught.
  var lastPath = location.pathname;
  function checkUrlChange() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (currentToggles) {
        runFinders(currentToggles);
        setTimeout(function () { if (currentToggles) runFinders(currentToggles); }, 300);
        setTimeout(function () { if (currentToggles) runFinders(currentToggles); }, 1000);
        setTimeout(function () { if (currentToggles) runFinders(currentToggles); }, 2500);
      } else {
        init();
      }
    }
  }
  window.addEventListener('popstate', checkUrlChange);
  setInterval(checkUrlChange, 500);

  // Install the visibility blocker as early as possible to prevent the flash.
  installBlocker();

  if (document.head) {
    init();
  } else {
    var headObserver = new MutationObserver(function () {
      if (document.head) {
        headObserver.disconnect();
        init();
      }
    });
    headObserver.observe(document.documentElement, { childList: true });
  }
})();
