(function () {
  'use strict';

  const Guard = window.AuthGuard;

  document.addEventListener('DOMContentLoaded', async function () {
    const session = await Guard.protectDashboard();
    if (!session) return;

    if (window.renderPlanBadge) window.renderPlanBadge();
    Guard.wireLogout();
    Guard.setupAuthListener();
  });

})();