(function () {
  'use strict';

  var SITES = [
    { id: 'structured-chaos', label: 'Structured Chaos', liveHref: 'https://misssponto.me.uk/', localHref: 'http://localhost:4000' },
    { id: 'box-of-dragons', label: 'Box of Dragons', liveHref: 'https://www.boxofdragons.misssponto.me.uk/', localHref: 'http://boxofdragons.ddev.site' },
    { id: 'knitstitch', label: 'KnitStitch', liveHref: 'https://knitstitch.misssponto.me.uk/', localHref: 'http://localhost:5173' },
    { id: 'jsketcher', label: 'JSketcher', liveHref: 'https://jsketcher.misssponto.me.uk/', localHref: 'http://localhost:3001' }
  ];

  function isLocal() {
    var host = (location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.indexOf('.ddev.site') !== -1;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function activeSiteId(placeholder) {
    var explicit = placeholder && placeholder.getAttribute('data-active');
    if (explicit) return explicit;
    if ((location.hostname || '').indexOf('jsketcher') === 0) return 'jsketcher';
    return '';
  }

  var MENU_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  function renderGlobalBar() {
    var placeholder = document.getElementById('global-bar');
    if (!placeholder || placeholder.classList.contains('global-bar')) return;
    var activeId = activeSiteId(placeholder);
    var local = isLocal();
    var activeLabel = 'Sites';
    var links = SITES.map(function (site) {
      var href = site.id === activeId ? '/' : (local ? site.localHref : site.liveHref);
      var className = 'global-bar-link' + (site.id === activeId ? ' active' : '');
      if (site.id === activeId) activeLabel = site.label;
      return '<a class="' + className + '" href="' + escapeHtml(href) + '">' + escapeHtml(site.label) + '</a>';
    }).join('');

    placeholder.className = 'global-bar';
    placeholder.setAttribute('role', 'navigation');
    placeholder.setAttribute('aria-label', 'Site switcher');
    placeholder.innerHTML = '<div class="shell global-bar-row">' +
      '<button class="global-bar-toggle" type="button" aria-label="Open site menu" aria-expanded="false" aria-controls="global-bar-menu">' +
      MENU_ICON + '</button>' +
      '<span class="global-bar-current">' + escapeHtml(activeLabel) + '</span>' +
      '<nav class="global-bar-menu" id="global-bar-menu" aria-label="Family sites">' + links + '</nav>' +
      '</div>';

    bindGlobalBarToggle(placeholder);
  }

  function bindGlobalBarToggle(placeholder) {
    var button = placeholder.querySelector('.global-bar-toggle');
    if (!button) return;

    function setOpen(open) {
      placeholder.classList.toggle('global-bar--open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close site menu' : 'Open site menu');
    }

    button.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!placeholder.classList.contains('global-bar--open'));
    });
    document.addEventListener('click', function (e) {
      if (!placeholder.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  function navHref(item) {
    if (isLocal() && item.localHref) return item.localHref;
    return item.liveHref || item.href || item.localHref || '#';
  }

  function pathFromHref(href) {
    try {
      return new URL(href, location.origin).pathname;
    } catch (error) {
      return href;
    }
  }

  function isActive(href) {
    var path = location.pathname;
    var hrefPath = pathFromHref(href);
    return hrefPath === '/' ? path === '/' || path === '/index.html' : path === hrefPath;
  }

  function renderSiteHeader() {
    var placeholder = document.getElementById('site-header');
    if (!placeholder || document.querySelector('[data-site-header]')) return;
    var config = window.SITE_HEADER || {};
    var nav = (config.nav || []).map(function (item) {
      var href = navHref(item);
      var className = 'main-nav-link' + (isActive(href) ? ' active' : '');
      return '<div class="main-nav-item"><a class="' + className + '" href="' + escapeHtml(href) + '">' + escapeHtml(item.label) + '</a></div>';
    }).join('');
    var links = '';

    if (config.github) {
      links += '<a class="project-link project-link--github" href="' + escapeHtml(config.github) + '" target="_blank" rel="noopener noreferrer">GitHub</a>';
    }
    if (config.gitlab) {
      links += '<a class="project-link project-link--gitlab" href="' + escapeHtml(config.gitlab) + '" target="_blank" rel="noopener noreferrer">GitLab</a>';
    }

    var navToggle = '';
    if (config.nav && config.nav.length) {
      navToggle = '<button class="main-nav-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="main-nav">' +
        MENU_ICON + '</button>';
    }

    var chevronIcon = '<svg class="site-header-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="m16 14-4-4-4 4"/></svg>';

    placeholder.outerHTML = '<header class="site-header" data-site-header>' +
      '<div class="site-header__content shell header-row">' +
      '<h1 class="brand">' + escapeHtml(config.brand || 'JSketcher') + '</h1>' +
      '<nav class="main-nav" id="main-nav" aria-label="Main navigation">' + nav + '</nav>' +
      '<div class="header-project-links" aria-label="Project links">' + links + navToggle + '</div>' +
      '</div>' +
      '<div class="site-header__handle">' +
      '<button class="site-header-toggle" type="button" aria-label="Collapse site header" aria-expanded="true">' +
      chevronIcon +
      '</button>' +
      '</div></header>';

    bindSiteHeaderToggle();
    bindMainNavToggle();
  }

  function bindSiteHeaderToggle() {
    var header = document.querySelector('[data-site-header]');
    var button = header && header.querySelector('.site-header-toggle');
    if (!header || !button) return;

    button.addEventListener('click', function () {
      var collapsed = !header.classList.contains('site-header--collapsed');
      header.classList.toggle('site-header--collapsed', collapsed);
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', collapsed ? 'Expand site header' : 'Collapse site header');
    });
  }

  function bindMainNavToggle() {
    var header = document.querySelector('[data-site-header]');
    var button = header && header.querySelector('.main-nav-toggle');
    var nav = header && header.querySelector('.main-nav');
    if (!header || !button || !nav) return;

    function setOpen(open) {
      header.classList.toggle('site-header--nav-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }

    button.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!header.classList.contains('site-header--nav-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  function renderFallbacks() {
    renderGlobalBar();
    renderSiteHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.setTimeout(renderFallbacks, 1800);
    });
  } else {
    window.setTimeout(renderFallbacks, 1800);
  }
})();
