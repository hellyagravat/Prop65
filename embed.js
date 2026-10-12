// ============================================
// PROP65 SHIELD — STOREFRONT EMBED
// ============================================
// Paste this on a customer storefront:
//
//   <script src="https://prop65-shield.vercel.app/embed.js"
//           data-key="pk_xxxxxxxxxxxxxxxx"></script>
//
// Optional: mark a product container with
//   <div data-prop65-sku="WIDGET-001"> ... </div>
// to identify products by SKU.
//
// Optional: place <div id="prop65-warning"></div>
// where you want the warning to appear.
// ============================================

(function () {
  'use strict';

  var API_BASE = 'https://wnlbddsnvkfjuzvjiwnm.supabase.co/functions/v1/embed-lookup';
  var PLACEHOLDER_ID = 'prop65-warning';
  var SKU_ATTR = 'data-prop65-sku';

  // --------------------------------------------
  // 1. Get our script tag + key
  // --------------------------------------------

  var script = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var embedKey = script && script.getAttribute('data-key');
  if (!embedKey) {
    console.warn('[Prop65] Missing data-key on script tag.');
    return;
  }

  // --------------------------------------------
  // 2. Identify the product
  // --------------------------------------------

  function findSku() {
    var el = document.querySelector('[' + SKU_ATTR + ']');
    if (el) return el.getAttribute(SKU_ATTR);

    // Shopify's default product form has an input named "id" (variant id)
    var shopifyInput = document.querySelector('form[action*="/cart/add"] input[name="id"]');
    if (shopifyInput) return shopifyInput.value;

    return null;
  }

  var sku = findSku();
  var pageUrl = window.location.href;

  // --------------------------------------------
  // 3. Find where to inject the warning
  // --------------------------------------------

  function getInjectionTarget() {
    // Prefer an explicit placeholder
    var placeholder = document.getElementById(PLACEHOLDER_ID);
    if (placeholder) return { el: placeholder, isPlaceholder: true };

    // Otherwise, inject after the H1 on the page (usually the product title)
    var h1 = document.querySelector('h1');
    if (h1 && h1.parentNode) {
      var container = document.createElement('div');
      container.id = PLACEHOLDER_ID;
      h1.parentNode.insertBefore(container, h1.nextSibling);
      return { el: container, isPlaceholder: false };
    }

    // Last resort: top of body
    var fallback = document.createElement('div');
    fallback.id = PLACEHOLDER_ID;
    document.body.insertBefore(fallback, document.body.firstChild);
    return { el: fallback, isPlaceholder: false };
  }

  // --------------------------------------------
  // 4. Render the warning
  // --------------------------------------------

  var STYLES = [
    '.p65-warning {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 14px;',
    '  max-width: 720px;',
    '  margin: 20px 0;',
    '  padding: 16px 20px;',
    '  border: 1px solid #C8BCAD;',
    '  border-radius: 14px;',
    '  background: #FBF8F5;',
    '  color: #10252B;',
    '  font-family: Inter, system-ui, -apple-system, sans-serif;',
    '  font-size: 13px;',
    '  line-height: 1.7;',
    '}',
    '.p65-warning__icon {',
    '  flex: 0 0 auto;',
    '  width: 22px;',
    '  height: 22px;',
    '  margin-top: 1px;',
    '  color: #8D7968;',
    '}',
    '.p65-warning__body { flex: 1 1 auto; }',
    '.p65-warning__text { margin: 0; }',
    '.p65-warning__link {',
    '  display: inline-block;',
    '  margin-top: 6px;',
    '  color: #8D7968;',
    '  font-size: 11px;',
    '  text-decoration: underline;',
    '  text-underline-offset: 3px;',
    '  letter-spacing: .04em;',
    '  text-transform: uppercase;',
    '  font-weight: 600;',
    '}',
    '@media (max-width: 520px) {',
    '  .p65-warning { padding: 14px 16px; font-size: 12.5px; }',
    '}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('prop65-styles')) return;
    var style = document.createElement('style');
    style.id = 'prop65-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderWarning(target, warning) {
    injectStyles();

    var html = '' +
      '<div class="p65-warning" role="note" aria-label="Proposition 65 warning">' +
        '<svg class="p65-warning__icon" viewBox="0 0 24 24" fill="none" ' +
             'stroke="currentColor" stroke-width="1.8" ' +
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 3 L22 20 L2 20 Z"></path>' +
          '<path d="M12 10 v4"></path>' +
          '<circle cx="12" cy="17.5" r=".6" fill="currentColor"></circle>' +
        '</svg>' +
        '<div class="p65-warning__body">' +
          '<p class="p65-warning__text">' +
            escapeHtml(warning.text) +
          '</p>' +
          '<a class="p65-warning__link" ' +
             'href="https://www.P65Warnings.ca.gov" ' +
             'target="_blank" rel="noopener noreferrer">' +
            'P65Warnings.ca.gov' +
          '</a>' +
        '</div>' +
      '</div>';

    target.el.innerHTML = html;
  }

  // --------------------------------------------
  // 5. Fetch the warning
  // --------------------------------------------

  function fetchWarning() {
    var params = ['key=' + encodeURIComponent(embedKey)];

    if (sku) params.push('sku=' + encodeURIComponent(sku));
    if (pageUrl) params.push('url=' + encodeURIComponent(pageUrl));

    var endpoint = API_BASE + '?' + params.join('&');

    fetch(endpoint, { credentials: 'omit' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !data.warning) return;

        var target = getInjectionTarget();
        renderWarning(target, data.warning);
      })
      .catch(function () {
        // Silent failure — never break the storefront
      });
  }

  // --------------------------------------------
  // 6. Run
  // --------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchWarning);
  } else {
    fetchWarning();
  }

})();