// ============================================
// PROP65 SHIELD — PAGE: OVERVIEW
// ============================================

(function () {
  'use strict';

  const DB = window.Prop65DB;
  const Guard = window.AuthGuard;

  const state = {
    session: null,
    profile: null,
    myProducts: [],
    catalog: [],
    catalogLoaded: false
  };

  function el(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    const node = el('dash-message');
    if (!node) { console.log(message); return; }
    node.textContent = message;
    node.className = 'dash-message' + (type ? ' ' + type : '');
  }

  function renderProfile() {
    const emailNode = el('user-email');
    const planNode = el('stat-plan');

    if (emailNode && state.session) {
      emailNode.textContent = state.session.user.email;
    }

    if (planNode && state.profile) {
      const plan = state.profile.membership_plan || 'free';
      planNode.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  }

  async function renderStats() {
    try {
      const stats = await DB.getStats();
      const p = el('stat-products');
      const w = el('stat-warnings');
      if (p) p.textContent = stats.products;
      if (w) w.textContent = stats.warnings;
    } catch (e) {
      console.error('Stats failed:', e);
    }
  }

  function renderMyProducts() {
    const container = el('my-products');
    if (!container) return;

    if (!state.myProducts.length) {
      container.innerHTML =
        '<div class="empty">' +
          "You haven't added any products yet.<br><br>" +
          'Click <strong>+ Add product</strong> above to pick from our catalog.' +
        '</div>';
      return;
    }

    const preview = state.myProducts.slice(0, 3);
    const remaining = state.myProducts.length - preview.length;

    container.innerHTML = preview.map(function (row) {
      const product = row.product || {};
      const warning = (row.warnings || [])[0] || null;

      const warningHtml = warning
        ? '<div class="warning-item">' +
            '<div class="warning-main">' +
              '<strong>' +
                (warning.chemical_names || []).map(esc).join(', ') +
              '</strong>' +
              '<span class="warning-type">' +
                esc(warning.warning_type || 'unspecified') +
              '</span>' +
            '</div>' +
            '<p class="warning-text">' + esc(warning.warning_text) + '</p>' +
          '</div>'
        : '<p class="no-warning">' +
            'No warning yet — <a href="products.html" ' +
            'style="text-decoration:underline">add ingredients</a> ' +
            'to generate one.' +
          '</p>';

      return '<article class="product-card">' +
        '<header class="product-card-head">' +
          '<div>' +
            '<h3>' + esc(product.name || 'Untitled') + '</h3>' +
            '<span class="product-category">' +
              esc(product.category || 'Uncategorised') +
            '</span>' +
          '</div>' +
        '</header>' +
        '<div class="warning-block">' +
          '<div class="warning-block-head">' +
            '<span class="mini-label">Warnings</span>' +
          '</div>' +
          warningHtml +
        '</div>' +
      '</article>';
    }).join('') +
    (remaining > 0
      ? '<p class="user-line" style="margin-top:18px">+ ' + remaining +
        ' more on <a href="products.html" style="text-decoration:underline">Products</a></p>'
      : '');
  }

  function renderCatalog() {
    const container = el('catalog-list');
    if (!container) return;

    const ownedIds = {};
    state.myProducts.forEach(function (row) {
      if (row.product) ownedIds[row.product.id] = true;
    });

    if (!state.catalog.length) {
      container.innerHTML = '<div class="empty">No products found.</div>';
      return;
    }

    container.innerHTML = state.catalog.map(function (p) {
      const owned = ownedIds[p.id];
      return '<div class="catalog-row">' +
        '<div>' +
          '<strong>' + esc(p.name) + '</strong>' +
          '<span class="product-category">' +
            esc(p.category || 'Uncategorised') +
          '</span>' +
        '</div>' +
        (owned
          ? '<span class="owned-tag">In your list</span>'
          : '<button class="add small" ' +
              'data-action="add-to-list" ' +
              'data-product="' + esc(p.id) + '">+ Add</button>') +
      '</div>';
    }).join('');
  }

  async function openCatalog() {
    const dialog = el('catalog-dialog');
    if (!dialog) return;
    dialog.showModal();

    if (state.catalogLoaded) return;

    try {
      el('catalog-list').innerHTML = '<div class="empty">Loading catalog…</div>';
      state.catalog = await DB.listCatalog();
      state.catalogLoaded = true;
      renderCatalog();
    } catch (e) {
      console.error(e);
      el('catalog-list').innerHTML = '<div class="empty">Could not load the catalog.</div>';
    }
  }

  async function refresh() {
    state.myProducts = await DB.listMyProducts();
    renderMyProducts();
    await renderStats();
    if (state.catalogLoaded) renderCatalog();
  }

  async function handleAddToList(productId, button) {
    if (button) button.disabled = true;
    try {
      await DB.addProduct(productId);
      toast('Product added to your list.', 'success');
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Could not add product.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function wire() {
    const addBtn = el('add-product-button');
    if (addBtn) addBtn.addEventListener('click', openCatalog);

    const closeBtn = el('catalog-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      el('catalog-dialog').close();
    });

    const catalogList = el('catalog-list');
    if (catalogList) catalogList.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action="add-to-list"]');
      if (!btn) return;
      handleAddToList(btn.dataset.product, btn);
    });

    const search = el('catalog-search');
    if (search) {
      let timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(async function () {
          try {
            state.catalog = await DB.listCatalog(search.value);
            renderCatalog();
          } catch (e) { console.error(e); }
        }, 250);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    state.session = await Guard.protectDashboard();
    if (!state.session) return;

    try {
      state.profile = await DB.getProfile();
    } catch (e) {
      console.error('Profile load failed:', e);
    }

    renderProfile();
    if (window.renderPlanBadge) window.renderPlanBadge();

    wire();
    Guard.wireLogout();
    Guard.setupAuthListener();

    try {
      await refresh();
    } catch (e) {
      console.error(e);
      toast('Could not load your products.', 'error');
    }
  });

})(); 