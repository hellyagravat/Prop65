// ============================================
// PROP65 SHIELD — PAGE: PRODUCTS
// ============================================

(function () {
  'use strict';

  const DB = window.Prop65DB;
  const Guard = window.AuthGuard;

  const state = {
    session: null,
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
    if (!node) return;
    node.textContent = message;
    node.className = 'dash-message' + (type ? ' ' + type : '');
  }

  // --------------------------------------------
  // RENDER: PRODUCTS
  // --------------------------------------------

  function renderProducts() {
    const container = el('products-list');
    if (!container) return;

    if (!state.myProducts.length) {
      container.innerHTML =
        '<div class="empty">' +
          "You haven't added any products yet.<br><br>" +
          'Click <strong>+ Add product</strong> to pick from our catalog.' +
        '</div>';
      return;
    }

    container.innerHTML = state.myProducts.map(function (row) {
      const product = row.product || {};
      const warning = (row.warnings || [])[0] || null;

      // Determine card state
      let status;
      if (warning) {
        status = 'live';
      } else {
        status = 'empty';
      }

      let warningBlock;

      if (status === 'live') {
        warningBlock =
          '<div class="warning-item">' +
            '<div class="warning-main">' +
              '<strong>' +
                (warning.chemical_names || []).map(esc).join(', ') +
              '</strong>' +
              '<span class="warning-type">' +
                esc(warning.warning_type || 'unspecified') +
              '</span>' +
            '</div>' +
            '<p class="warning-text">' + esc(warning.warning_text) + '</p>' +
            '<div class="warning-actions">' +
              '<button class="link-btn" data-action="edit-ingredients" ' +
                'data-user-product="' + esc(row.id) + '" ' +
                'data-product-name="' + esc(product.name || '') + '">' +
                'Edit ingredients' +
              '</button>' +
            '</div>' +
          '</div>';
      } else {
        warningBlock =
          '<div class="empty-state-inline">' +
            '<p class="no-warning">' +
              'Add ingredients to generate a warning for this product.' +
            '</p>' +
            '<button class="add small" data-action="edit-ingredients" ' +
              'data-user-product="' + esc(row.id) + '" ' +
              'data-product-name="' + esc(product.name || '') + '">' +
              '+ Add ingredients' +
            '</button>' +
          '</div>';
      }

      return '' +
        '<article class="product-card" data-user-product="' + esc(row.id) + '">' +

          '<header class="product-card-head">' +
            '<div>' +
              '<h3>' + esc(product.name || 'Untitled') + '</h3>' +
              '<span class="product-category">' +
                esc(product.category || 'Uncategorised') +
              '</span>' +
            '</div>' +
            '<button class="link-btn danger" ' +
              'data-action="remove" ' +
              'data-user-product="' + esc(row.id) + '">Remove</button>' +
          '</header>' +

          '<p class="product-desc">' + esc(product.description || '') + '</p>' +

          '<div class="warning-block">' +
            '<div class="warning-block-head">' +
              '<span class="mini-label">Warnings</span>' +
            '</div>' +
            warningBlock +
          '</div>' +

        '</article>';
    }).join('');
  }

  // --------------------------------------------
  // RENDER: CATALOG
  // --------------------------------------------

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

  // --------------------------------------------
  // ACTIONS
  // --------------------------------------------

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
      el('catalog-list').innerHTML = '<div class="empty">Could not load catalog.</div>';
    }
  }

  async function refresh() {
    state.myProducts = await DB.listMyProducts();
    renderProducts();
    if (state.catalogLoaded) renderCatalog();
  }

  async function addToList(productId, button) {
    button.disabled = true;
    try {
      await DB.addProduct(productId);
      toast('Product added.', 'success');
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Could not add product.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function removeFromList(userProductId) {
    if (!window.confirm('Remove this product and all its warnings?')) return;
    try {
      await DB.removeProduct(userProductId);
      toast('Product removed.', 'success');
      await refresh();
    } catch (e) {
      console.error(e);
      toast('Could not remove product.', 'error');
    }
  }

  function openIngredients(userProductId, productName) {
    if (!window.Prop65Dialogs) {
      console.error('Ingredient dialogs not loaded.');
      return;
    }
    window.Prop65Dialogs.open(userProductId, productName);
  }

  // --------------------------------------------
  // WIRING
  // --------------------------------------------

  function wire() {
    el('add-product-button').addEventListener('click', openCatalog);

    el('catalog-close').addEventListener('click', function () {
      el('catalog-dialog').close();
    });

    el('catalog-list').addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action="add-to-list"]');
      if (!btn) return;
      addToList(btn.dataset.product, btn);
    });

    el('products-list').addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const userProductId = btn.dataset.userProduct;

      if (action === 'remove') {
        removeFromList(userProductId);
      }

      if (action === 'edit-ingredients') {
        openIngredients(userProductId, btn.dataset.productName || '');
      }
    });

    let timer = null;
    el('catalog-search').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(async function () {
        try {
          state.catalog = await DB.listCatalog(el('catalog-search').value);
          renderCatalog();
        } catch (e) { console.error(e); }
      }, 250);
    });

    // Called by ingredient-dialog after saving
        // Called by ingredient-dialog after saving.
    // Payload: { userProductId, matched, total }
    window.onIngredientsSaved = async function (result) {
      var msg;

      if (result && result.matched > 0) {
        msg = 'Warning generated from ' + result.matched +
              (result.matched === 1 ? ' chemical' : ' chemicals') +
              ' found in your ingredients.';
      } else if (result && result.total > 0) {
        msg = 'Ingredients saved. No Prop 65 chemicals were identified ' +
              'in what you entered.';
      } else {
        msg = 'Ingredients saved.';
      }

      toast(msg, 'success');
      await refresh();
    };
  }

  // --------------------------------------------
  // BOOT
  // --------------------------------------------

  document.addEventListener('DOMContentLoaded', async function () {
    state.session = await Guard.protectDashboard();
    if (!state.session) return;

    if (window.renderPlanBadge) window.renderPlanBadge();

    if (window.Prop65Dialogs) {
      window.Prop65Dialogs.init(DB);
    }

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