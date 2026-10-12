// ============================================
// PROP65 SHIELD — PAGE: EMBED
// ============================================

(function () {
  'use strict';

  const Guard = window.AuthGuard;

  function el(id) { return document.getElementById(id); }

  function toast(message, type) {
    const node = el('dash-message');
    if (!node) return;
    node.textContent = message;
    node.className = 'dash-message' + (type ? ' ' + type : '');
  }

  // --------------------------------------------
  // Key generation
  // --------------------------------------------

  function randomKey() {
    // 22-char base62 + prefix
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    const arr = new Uint8Array(22);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) {
      s += chars[arr[i] % chars.length];
    }
    return 'pk_' + s;
  }

  // --------------------------------------------
  // Load or create the user's embed key
  // --------------------------------------------

  // --------------------------------------------
  // Render snippet
  // --------------------------------------------

  function renderSnippet(key) {
    const snippet =
      '<script src="https://prop65-shield.vercel.app/embed.js"\n' +
      '        data-key="' + key + '"><\/script>';

    el('embed-snippet').textContent = snippet;
    el('snippet-note').textContent = 'Your key: ' + key;
  }

  // --------------------------------------------
  // Copy to clipboard
  // --------------------------------------------

  function wireCopy() {
    el('copy-snippet').addEventListener('click', async function () {
      const text = el('embed-snippet').textContent;

      try {
        await navigator.clipboard.writeText(text);
        const btn = el('copy-snippet');
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = original; }, 1800);
      } catch (e) {
        console.error(e);
        toast('Copy failed — select the text and copy manually.', 'error');
      }
    });
  }

  // --------------------------------------------
  // Rotate key
  // --------------------------------------------

  async function rotateKey(currentKeyId) {
    const confirmed = window.confirm(
      'Regenerating will break any site using the current key.\n\n' +
      'You will need to paste the new script tag into your storefront.\n\n' +
      'Continue?'
    );
    if (!confirmed) return;

    try {
      const newKey = await window.Prop65DB.rotateEmbedKey(currentKeyId);
      renderSnippet(newKey.key);
      toast('New key generated. Update your storefront.', 'success');
    } catch (e) {
      console.error(e);
      toast('Could not rotate key.', 'error');
    }
  }

  // --------------------------------------------
  // Boot
  // --------------------------------------------

  document.addEventListener('DOMContentLoaded', async function () {
    const session = await Guard.protectDashboard();
    if (!session) return;

    if (window.renderPlanBadge) window.renderPlanBadge();
    Guard.wireLogout();
    Guard.setupAuthListener();

    try {
      const keyRow = await window.Prop65DB.getOrCreateEmbedKey();
      renderSnippet(keyRow.key);
      wireCopy();

      el('rotate-key').addEventListener('click', function () {
        rotateKey(keyRow.id);
      });
    } catch (e) {
      console.error(e);
      el('embed-snippet').textContent = 'Could not load your embed key.';
      el('snippet-note').textContent = e.message || 'Try reloading the page.';
    }
  });

})();