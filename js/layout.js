// ============================================
// PROP65 SHIELD — LAYOUT (sidebar + topbar)
// ============================================

(function () {
  'use strict';

  var NAV_ITEMS = [
    { id: 'overview', label: 'Overview', href: 'dashboard.html' },
    { id: 'products', label: 'Products', href: 'products.html' },
    { id: 'warnings', label: 'Warnings', href: 'warnings.html' },
    { id: 'embed',    label: 'Embed',    href: 'embed.html'    },
    { id: 'activity', label: 'Activity', href: 'activity.html' },
    { id: 'settings', label: 'Settings', href: 'settings.html' }
  ];

  var NAV_ICONS = {
    overview: '<path d="M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1z"/>',
    products: '<path d="M3 5h14v10H3z"/><path d="M3 9h14"/>',
    warnings: '<path d="M10 3 2 17h16z"/><path d="M10 8v4"/><circle cx="10" cy="14.5" r=".6"/>',
    embed:    '<path d="m7 4-4 6 4 6"/><path d="m13 4 4 6-4 6"/>',
    activity: '<path d="M3 10h3l2-5 4 10 2-5h3"/>',
    settings: '<circle cx="10" cy="10" r="2.5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.2 4.2l2.1 2.1M13.7 13.7l2.1 2.1M4.2 15.8l2.1-2.1M13.7 6.3l2.1-2.1"/>'
  };

  function currentPage() {
    return document.body.dataset.page || 'overview';
  }

  function renderSidebar() {
    var active = currentPage();

    var links = NAV_ITEMS.map(function (item) {
      var cls = item.id === active ? 'active' : '';
      var icon = NAV_ICONS[item.id] || NAV_ICONS.overview;

      return '<a href="' + item.href + '" class="' + cls + '">' +
        '<svg class="nav-icon" viewBox="0 0 20 20" aria-hidden="true">' +
          icon +
        '</svg>' +
        '<span>' + item.label + '</span>' +
      '</a>';
    }).join('');

    var html = '' +
      '<aside class="sidebar">' +

        '<a class="brand" href="dashboard.html">' +
          '<span class="brand-mark">P65</span>' +
          '<span>Prop65 Shield</span>' +
        '</a>' +

        '<nav class="nav" aria-label="Primary">' + links + '</nav>' +

        '<div class="sidebar-footer">' +
          '<a href="settings.html" class="plan-badge" id="sidebar-plan" ' +
             'title="Manage your plan">' +
            '<span class="dot"></span>' +
            '<span id="sidebar-plan-text">—</span>' +
          '</a>' +
        '</div>' +

      '</aside>';

    var host = document.getElementById('sidebar-slot');
    if (host) host.outerHTML = html;
  }

  function renderTopbar() {
    var title = document.body.dataset.title || '';
    var eyebrow = document.body.dataset.eyebrow || 'Dashboard';
    var showLogout = document.body.dataset.showLogout !== 'false';

    var html = '' +
      '<div class="topbar">' +
        '<div>' +
          '<div class="eyebrow">' + eyebrow + '</div>' +
          '<h1>' + title + '</h1>' +
          '<p class="user-line" id="user-email">—</p>' +
        '</div>' +
        (showLogout
          ? '<button class="logout" id="logout-button" type="button">Logout</button>'
          : '') +
      '</div>';

    var host = document.getElementById('topbar-slot');
    if (host) host.outerHTML = html;
  }

  function paintPlanBadge() {
    if (!window.Prop65DB) return;

    window.Prop65DB.getProfile().then(function (profile) {
      if (!profile) return;

      var badge = document.getElementById('sidebar-plan');
      var text  = document.getElementById('sidebar-plan-text');

      if (!badge || !text) return;

      var plan = profile.membership_plan || 'free';
      var info = window.Prop65DB.getPlanInfo(plan);
      var label = info && info.name ? info.name : plan;

      text.textContent = label + ' plan';

      if (plan === 'premium' || plan === 'agency') {
        badge.classList.add('premium');
      }
    }).catch(function (error) {
      console.error('Could not render plan badge:', error);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderSidebar();
    renderTopbar();
    window.renderPlanBadge = paintPlanBadge;
  });

})();