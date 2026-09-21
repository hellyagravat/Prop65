// ============================================
// PROP65 SHIELD — AUTH GUARD
// ============================================
// Every protected page calls this on load.
// Redirects to auth.html if no session.

(function () {
  'use strict';

  var AUTH_PAGE = 'auth.html';

  async function protectDashboard() {
    try {
      if (!window.supabaseClient) {
        console.error('Supabase client is not available.');
        window.location.href = AUTH_PAGE;
        return null;
      }

      var result = await window.supabaseClient.auth.getSession();
      var data = result.data;
      var error = result.error;

      if (error) {
        console.error('Authentication check failed:', error);
        window.location.href = AUTH_PAGE;
        return null;
      }

      if (!data.session) {
        console.log('No active session. Redirecting to login.');
        window.location.href = AUTH_PAGE;
        return null;
      }

      window.currentUser = data.session.user;
      return data.session;

    } catch (error) {
      console.error('Unexpected authentication error:', error);
      window.location.href = AUTH_PAGE;
      return null;
    }
  }

  async function logout() {
    try {
      var result = await window.supabaseClient.auth.signOut();
      if (result.error) {
        console.error('Logout failed:', result.error);
        return;
      }
      window.location.href = AUTH_PAGE;
    } catch (error) {
      console.error('Unexpected logout error:', error);
    }
  }

  function setupAuthListener() {
    if (!window.supabaseClient) return;

    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      console.log('Auth event:', event);

      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = AUTH_PAGE;
        return;
      }

      window.currentUser = session.user;
    });
  }

  function wireLogout() {
    var btn = document.getElementById('logout-button');
    if (!btn) return;
    btn.addEventListener('click', logout);
  }

  window.AuthGuard = {
    protectDashboard: protectDashboard,
    logout: logout,
    setupAuthListener: setupAuthListener,
    wireLogout: wireLogout
  };
})();