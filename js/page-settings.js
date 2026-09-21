// ============================================
// PROP65 SHIELD — PAGE: SETTINGS
// ============================================

(function () {
  'use strict';

  const DB = window.Prop65DB;
  const Guard = window.AuthGuard;

  const state = {
    session: null,
    profile: null,
    original: null,
    plans: []
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

    if (type === 'success') {
      clearTimeout(toast._timer);
      toast._timer = setTimeout(function () {
        node.textContent = '';
        node.className = 'dash-message';
      }, 5000);
    }
  }

  // --------------------------------------------
  // PROFILE FORM
  // --------------------------------------------

  function fillProfileForm() {
    const p = state.profile;
    if (!p) return;

    el('profile-full-name').value = p.full_name || '';
    el('profile-email').value     = state.session.user.email || '';
    el('profile-company').value   = p.company_name || '';
    el('profile-website').value   = p.website || '';
    el('profile-phone').value     = p.phone || '';

    const savedAt = el('profile-saved-at');
    if (savedAt) {
      savedAt.textContent = p.updated_at
        ? 'Last saved ' + new Date(p.updated_at).toLocaleString()
        : '';
    }

    state.original = {
      full_name: p.full_name || '',
      company_name: p.company_name || '',
      website: p.website || '',
      phone: p.phone || ''
    };

    setToggle('notify_on_warning', p.notify_on_warning !== false);
    setToggle('notify_on_update',  p.notify_on_update  !== false);
  }

  function readProfileForm() {
    return {
      full_name:    el('profile-full-name').value.trim(),
      company_name: el('profile-company').value.trim(),
      website:      el('profile-website').value.trim(),
      phone:        el('profile-phone').value.trim()
    };
  }

  function resetProfileForm() {
    const o = state.original;
    if (!o) return;
    el('profile-full-name').value = o.full_name;
    el('profile-company').value   = o.company_name;
    el('profile-website').value   = o.website;
    el('profile-phone').value     = o.phone;
    toast('Form reset to last saved values.');
  }

  async function saveProfile(event) {
    event.preventDefault();

    const button = el('profile-save');
    const patch = readProfileForm();

    if (!patch.full_name) {
      toast('Please enter your full name.', 'error');
      el('profile-full-name').focus();
      return;
    }

    if (patch.website && !/^https?:\/\//i.test(patch.website)) {
      patch.website = 'https://' + patch.website.replace(/^\/+/, '');
    }

    button.disabled = true;
    button.textContent = 'Saving…';

    try {
      const updated = await DB.updateProfile(patch);
      state.profile = updated;
      fillProfileForm();
      toast('Profile saved.', 'success');
      if (window.renderPlanBadge) window.renderPlanBadge();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not save profile.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Save changes';
    }
  }

  // --------------------------------------------
  // TOGGLES
  // --------------------------------------------

  function setToggle(pref, value) {
    const node = document.querySelector(
      '.toggle-switch[data-pref="' + pref + '"]'
    );
    if (!node) return;
    node.setAttribute('aria-checked', value ? 'true' : 'false');
  }

  async function flipToggle(button) {
    const pref = button.dataset.pref;
    const current = button.getAttribute('aria-checked') === 'true';
    const next = !current;

    button.setAttribute('aria-checked', next ? 'true' : 'false');

    try {
      const payload = {};
      payload[pref] = next;
      const updated = await DB.updateProfile(payload);
      state.profile = updated;
      toast('Preferences updated.', 'success');
    } catch (error) {
      console.error(error);
      button.setAttribute('aria-checked', current ? 'true' : 'false');
      toast('Could not update preferences.', 'error');
    }
  }

  // --------------------------------------------
  // PLAN GRID
  // --------------------------------------------

  function renderPlans() {
    const container = el('plan-grid');
    if (!container) return;

    const currentPlan = state.profile
      ? state.profile.membership_plan
      : 'free';

    const plans = state.plans;

    container.innerHTML = plans.map(function (plan) {
      const isCurrent = plan.id === currentPlan;

      const actionHtml = isCurrent
        ? '<button class="btn-secondary" type="button" disabled>Current plan</button>'
        : (plan.price === 0
            ? '<button class="btn-secondary" type="button" data-action="downgrade" data-plan="' +
                esc(plan.id) + '">Switch to ' + esc(plan.name) + '</button>'
            : '<button class="add" type="button" data-action="upgrade" data-plan="' +
                esc(plan.id) + '">Upgrade to ' + esc(plan.name) + '</button>');

      return '<article class="plan-card' + (isCurrent ? ' current' : '') + '">' +

        '<div class="plan-card-head">' +
          '<span class="plan-tag">' + esc(plan.name) + '</span>' +
          (isCurrent ? '<span class="plan-current-tag">Current</span>' : '') +
        '</div>' +

        '<h3 class="plan-name">' + esc(plan.tagline) + '</h3>' +

        '<div class="plan-price">' +
          '<b>$' + plan.price + '</b> / ' + esc(plan.cadence) +
        '</div>' +

        '<ul class="plan-features">' +
          plan.features.map(function (f) {
            return '<li>' + esc(f) + '</li>';
          }).join('') +
        '</ul>' +

        '<div class="plan-action">' + actionHtml + '</div>' +

      '</article>';
    }).join('');
  }

  async function handlePlanClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const planId = button.dataset.plan;

    if (action === 'upgrade') {
      const original = button.textContent;

      button.disabled = true;
      button.textContent = 'Redirecting…';

      try {
        const url = await DB.startCheckout(planId);
        window.location.href = url;
      } catch (error) {
        console.error('Checkout failed:', error);
        toast(error.message || 'Could not start checkout.', 'error');
        button.disabled = false;
        button.textContent = original;
      }
      return;
    }

    if (action === 'downgrade') {
      window.alert(
        'To downgrade, please use the customer portal link in your ' +
        'confirmation email, or contact support@prop65shield.com.'
      );
    }
  }

  // --------------------------------------------
  // RETURN FROM DODO CHECKOUT
  // --------------------------------------------

  function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;

    toast('Payment received. Your plan will update shortly…', 'success');

    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname);

    // Poll for the webhook to land
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const profile = await DB.getProfile();
        if (profile && profile.membership_plan !== 'free') {
          clearInterval(poll);
          state.profile = profile;
          fillProfileForm();
          renderPlans();
          if (window.renderPlanBadge) window.renderPlanBadge();
          toast(
            'Your account has been upgraded to ' +
            profile.membership_plan.charAt(0).toUpperCase() +
            profile.membership_plan.slice(1) + '.',
            'success'
          );
        }
      } catch (e) {
        console.error('Poll failed:', e);
      }

      if (attempts >= 15) {
        clearInterval(poll);
        const p = state.profile;
        if (!p || p.membership_plan === 'free') {
          toast(
            'We haven\'t seen your payment yet. If your card was charged, ' +
            'please refresh in a minute or contact support.',
            'error'
          );
        }
      }
    }, 1500);
  }

  // --------------------------------------------
  // SECURITY
  // --------------------------------------------

  async function sendPasswordReset() {
    const email = state.session.user.email;
    if (!email) return;

    const ok = window.confirm('Send a password reset email to ' + email + '?');
    if (!ok) return;

    const button = el('password-send');
    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      const redirectUrl = window.location.origin + '/auth.html';

      const result = await window.supabaseClient.auth.resetPasswordForEmail(
        email,
        { redirectTo: redirectUrl }
      );

      if (result.error) throw result.error;
      toast('Reset email sent. Check your inbox.', 'success');
    } catch (error) {
      console.error(error);
      toast('Could not send reset email.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send password reset email';
    }
  }

  // --------------------------------------------
  // DANGER ZONE
  // --------------------------------------------

  async function deleteAccount() {
    const email = state.session.user.email;

    const confirmation = window.prompt(
      'This will permanently delete your account and all data.\n\n' +
      'Type your email address to confirm:\n' + email
    );

    if (confirmation !== email) {
      if (confirmation !== null) {
        toast('Email did not match. Nothing was deleted.', 'error');
      }
      return;
    }

    window.alert(
      'Account deletion requires the backend service role and is ' +
      'queued for the next phase.\n\n' +
      'Your account has NOT been deleted.'
    );
  }

  // --------------------------------------------
  // WIRING
  // --------------------------------------------

  function wire() {
    el('profile-form').addEventListener('submit', saveProfile);
    el('profile-reset').addEventListener('click', resetProfileForm);

    document.querySelectorAll('.toggle-switch').forEach(function (btn) {
      btn.addEventListener('click', function () { flipToggle(btn); });
    });

    el('plan-grid').addEventListener('click', handlePlanClick);

    el('password-send').addEventListener('click', sendPasswordReset);

    el('account-delete').addEventListener('click', deleteAccount);
        // Always reset upgrade buttons on page load
    window.addEventListener('pageshow', function () {
      document.querySelectorAll('[data-action="upgrade"]').forEach(function (btn) {
        const planId = btn.dataset.plan;
        const planInfo = DB.getPlanInfo(planId);
        btn.disabled = false;
        btn.textContent = 'Upgrade to ' + (planInfo ? planInfo.name : planId);
      });
    });
  }

  // --------------------------------------------
  // BOOT
  // --------------------------------------------

  document.addEventListener('DOMContentLoaded', async function () {
    state.session = await Guard.protectDashboard();
    if (!state.session) return;

    Guard.wireLogout();
    Guard.setupAuthListener();

    try {
      state.profile = await DB.getProfile();
    } catch (error) {
      console.error('Could not load profile:', error);
      toast('Could not load your profile.', 'error');
      return;
    }

    if (window.renderPlanBadge) window.renderPlanBadge();

    state.plans = DB.listPlans();

    fillProfileForm();
    renderPlans();
    wire();
    handleCheckoutReturn();
  });

})();