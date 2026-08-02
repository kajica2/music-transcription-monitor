/* ============================================================
   Agentic Music Transcription Monitor — shared app
   Version: 0.2 (theme + nav + copy prompt + render helpers)
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'mtm.theme';
  var root = document.documentElement;

  /* ============================================================
     Theme management
     ============================================================ */
  var toggleBtn = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage may be blocked */ }
    var theme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
    applyTheme(theme);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* no-op */ }
    });
  }

  /* ============================================================
     Date helpers
     ============================================================ */
  var TODAY = new Date();
  var TODAY_ISO = TODAY.toISOString().slice(0, 10);
  var TODAY_HUMAN = TODAY.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  var dateSub = document.getElementById('date-subtitle');
  if (dateSub) dateSub.textContent = TODAY_HUMAN + ' \u00b7 ' + TODAY_ISO;
  var footerDate = document.getElementById('footer-date');
  if (footerDate) footerDate.textContent = TODAY_ISO;

  /* ============================================================
     Nav active state
     ============================================================ */
  var navLinks = document.querySelectorAll('.nav__link');
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('is-active');
    }
  });

  /* ============================================================
     Copy prompt
     ============================================================ */
  function showToast(message) {
    var existing = document.getElementById('mtm-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'mtm-toast';
    t.className = 'toast';
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-visible'); });
    setTimeout(function () {
      t.classList.remove('is-visible');
      setTimeout(function () { t.remove(); }, 240);
    }, 1600);
  }

  function copyToClipboard(text, btn) {
    var done = function () { showToast('Copied prompt to clipboard'); if (btn) { btn.classList.add('btn--copied'); setTimeout(function () { btn.classList.remove('btn--copied'); }, 1400); } };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-target]');
    if (!btn) return;
    var targetId = btn.getAttribute('data-copy-target');
    var el = document.getElementById(targetId);
    if (!el) return;
    var text = el.textContent || el.innerText || '';
    copyToClipboard(text, btn);
  });

  /* ============================================================
     Render helpers (re-used across pages)
     ============================================================ */
  window.MTM = window.MTM || {};
  window.MTM.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class')      node.className = attrs[k];
        else if (k === 'html')  node.innerHTML = attrs[k];
        else if (k === 'text')  node.textContent = attrs[k];
        else if (k === 'style') node.style.cssText = attrs[k];
        else                    node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  };

  window.MTM.pillFor = function (status) {
    var map = {
      pending: { cls: 'pill--pending', label: 'Not run' },
      ok:      { cls: 'pill--ok',      label: 'OK' },
      warn:    { cls: 'pill--warn',    label: 'Watch' },
      err:     { cls: 'pill--err',     label: 'Failed' }
    };
    var cfg = map[status] || map.pending;
    return window.MTM.el('span', { class: 'pill ' + cfg.cls }, cfg.label);
  };

  /* ============================================================
     Search/filter for link lists
     ============================================================ */
  document.addEventListener('input', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('[data-filter-target]')) return;
    var targetId = input.getAttribute('data-filter-target');
    var target = document.getElementById(targetId);
    if (!target) return;
    var q = (input.value || '').toLowerCase();
    var rows = target.querySelectorAll('[data-filter-text]');
    var visible = 0;
    rows.forEach(function (row) {
      var text = (row.getAttribute('data-filter-text') || '').toLowerCase();
      var show = !q || text.indexOf(q) >= 0;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var counter = document.getElementById(targetId + '-count');
    if (counter) counter.textContent = visible + ' of ' + rows.length + ' links';
  });

  /* ============================================================
     Boot
     ============================================================ */
  initTheme();
})();
