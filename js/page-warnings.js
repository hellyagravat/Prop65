// (function () {
//   'use strict';

//   const DB = window.Prop65DB;
//   const Guard = window.AuthGuard;

//   function el(id) { return document.getElementById(id); }

//   function esc(v) {
//     return String(v == null ? '' : v)
//       .replace(/&/g, '&amp;').replace(/</g, '&lt;')
//       .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
//       .replace(/'/g, '&#39;');
//   }

//   async function render() {
//     const container = el('warnings-list');
//     if (!container) return;

//     try {
//       const rows = await DB.listMyProducts();

//       const withWarnings = rows.filter(function (r) {
//         return r.warnings && r.warnings.length > 0;
//       });

//       if (!withWarnings.length) {
//         container.innerHTML =
//           '<div class="empty">' +
//             'No warnings yet.<br><br>' +
//             'Once our system reviews the products in your list, their warnings will appear here.' +
//           '</div>';
//         return;
//       }

//       container.innerHTML = withWarnings.map(function (row) {
//         const product = row.product || {};
//         return '<article class="product-card">' +
//           '<header class="product-card-head">' +
//             '<div>' +
//               '<h3>' + esc(product.name || 'Untitled') + '</h3>' +
//               '<span class="product-category">' + esc(product.category || 'Uncategorised') + '</span>' +
//             '</div>' +
//           '</header>' +
//           '<ul class="warning-list" style="margin-top:14px">' +
//             row.warnings.map(function (w) {
//               return '<li class="warning-item">' +
//                 '<div class="warning-main">' +
//                   '<strong>' + esc(w.chemical_name) + '</strong>' +
//                   '<span class="warning-type">' + esc(w.warning_type || 'unspecified') + '</span>' +
//                 '</div>' +
//                 '<p class="warning-text">' + esc(w.warning_text) + '</p>' +
//               '</li>';
//             }).join('') +
//           '</ul>' +
//         '</article>';
//       }).join('');
//     } catch (e) {
//       console.error(e);
//       container.innerHTML = '<div class="empty">Could not load warnings.</div>';
//     }
//   }

//   document.addEventListener('DOMContentLoaded', async function () {
//     const session = await Guard.protectDashboard();
//     if (!session) return;

//     if (window.renderPlanBadge) window.renderPlanBadge();
//     Guard.wireLogout();
//     Guard.setupAuthListener();

//     await render();
//   });

// })();

// ============================================
// PROP65 SHIELD — PAGE: WARNINGS
// ============================================

(function () {
  'use strict';

  const DB = window.Prop65DB;
  const Guard = window.AuthGuard;

  function el(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function render() {
    const container = el('warnings-list');
    if (!container) return;

    try {
      const rows = await DB.listMyProducts();

      const withWarnings = rows.filter(function (r) {
        return r.warnings && r.warnings.length > 0;
      });

      if (!withWarnings.length) {
        container.innerHTML =
          '<div class="empty">' +
            'No warnings yet.<br><br>' +
            'Once our system reviews the products in your list, their warnings will appear here.' +
          '</div>';
        return;
      }

      container.innerHTML = withWarnings.map(function (row) {
        const product = row.product || {};
        const warning = row.warnings[0];

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
            '<div class="warning-item">' +
              '<div class="warning-main">' +
                '<strong>' +
                  (warning.chemical_names || []).map(esc).join(', ') +
                '</strong>' +
                '<span class="warning-type">' +
                  esc(warning.warning_type || 'unspecified') +
                '</span>' +
              '</div>' +
              '<p class="warning-text">' +
                esc(warning.warning_text) +
              '</p>' +
            '</div>' +
          '</div>' +

        '</article>';
      }).join('');

    } catch (e) {
      console.error(e);
      container.innerHTML = '<div class="empty">Could not load warnings.</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const session = await Guard.protectDashboard();
    if (!session) return;

    if (window.renderPlanBadge) window.renderPlanBadge();
    Guard.wireLogout();
    Guard.setupAuthListener();

    await render();
  });

})();