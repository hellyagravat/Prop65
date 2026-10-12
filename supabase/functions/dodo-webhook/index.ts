import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'npm:standardwebhooks';
import { corsHeadersFor } from '../_shared/cors.ts';

// -------------------------------------------------------------------
// Product → plan mapping
// LIVE IDs first, TEST IDs kept for reference.
// -------------------------------------------------------------------
const PRODUCT_TO_PLAN: Record<string, string> = {
  // ---- LIVE MODE ----
  'pdt_0NoAAjyZ60IX3TorVbxOf': 'premium',   // Growth $29/mo
  'pdt_0NoAAycQwRws9mw8c3cC3': 'agency',    // Agency $79/mo

  // ---- TEST MODE (uncomment if you want to test again later) ----
  // 'pdt_0No1HVvOYWPt06KaL3QNT': 'premium',
  // 'pdt_0No1HJyNOQsvxSmOeU9WD': 'agency',
};

// -------------------------------------------------------------------
// Event groups
// -------------------------------------------------------------------
const UPGRADE_EVENTS = [
  'payment.succeeded',
  'subscription.active',
  'subscription.updated',
  'subscription.plan_changed',
];

const DOWNGRADE_EVENTS = [
  'subscription.cancelled',
  'subscription.expired',
  // NOTE: 'subscription.failed' is intentionally NOT here.
  // A failed attempt to buy a NEW subscription must not cancel
  // the user's CURRENT subscription.
];

// -------------------------------------------------------------------
// Handler
// -------------------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  try {
    const body = await req.text();

    let peeked: any = null;
    try {
      peeked = JSON.parse(body);
    } catch (_e) {
      // signature verification will catch non-JSON
    }

    if (peeked) {
      console.log('[webhook] incoming:', {
        type: peeked.type,
        hasUserId: !!peeked.data?.metadata?.user_id,
        productId: peeked.data?.product_id,
        subscriptionId: peeked.data?.subscription_id,
      });
    }

    // ---- Verify signature ----
    const headers = {
      'webhook-id': req.headers.get('webhook-id') || '',
      'webhook-signature': req.headers.get('webhook-signature') || '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
    };

    const webhookSecret = Deno.env.get('DODO_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('DODO_WEBHOOK_SECRET is not configured');
    }

    const webhook = new Webhook(webhookSecret);
    await webhook.verify(body, headers);
    console.log('[webhook] signature verified ✓');

    const event = peeked || JSON.parse(body);

    // ---- Supabase admin ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase env vars missing');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const eventType: string = event.type || '';
    const userId = event.data?.metadata?.user_id;
    const productId = event.data?.product_id;
    const subscriptionId = event.data?.subscription_id || null;

    console.log('[webhook] dispatch:', {
      eventType,
      userId,
      productId,
      subscriptionId,
    });

    // --------------------------------------------------
    // Upgrade
    // --------------------------------------------------
    if (UPGRADE_EVENTS.includes(eventType)) {
      if (!userId || !productId) {
        return json200(req, { received: true, note: 'missing fields' });
      }

      const plan = PRODUCT_TO_PLAN[productId];
      if (!plan) {
        console.warn('[webhook] unknown product:', productId);
        return json200(req, { received: true, note: 'unknown product' });
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          membership_plan: plan,
          dodo_subscription_id: subscriptionId,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[webhook] upgrade db error:', error);
        return json200(req, { received: true, note: 'db error' });
      }

      console.log('[webhook] upgraded:', userId, '→', plan);
      return json200(req, { received: true, action: 'upgraded', plan });
    }

    // --------------------------------------------------
    // Downgrade
    // --------------------------------------------------
    if (DOWNGRADE_EVENTS.includes(eventType)) {
      if (!userId) {
        return json200(req, { received: true, note: 'no user_id' });
      }

      // Only downgrade if the cancelled subscription is the
      // one currently on the user's profile.
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('dodo_subscription_id')
        .eq('id', userId)
        .single();

      const currentSubId = profile?.dodo_subscription_id || null;

      if (currentSubId && subscriptionId && currentSubId !== subscriptionId) {
        console.log('[webhook] ignoring cancellation of stale subscription:', {
          current: currentSubId,
          incoming: subscriptionId,
        });
        return json200(req, { received: true, note: 'stale subscription' });
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          membership_plan: 'free',
          dodo_subscription_id: null,
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[webhook] downgrade db error:', error);
        return json200(req, { received: true, note: 'db error' });
      }

      console.log('[webhook] downgraded:', userId);
      return json200(req, { received: true, action: 'downgraded' });
    }

    // --------------------------------------------------
    // Everything else: acknowledge, do not act
    // --------------------------------------------------
    console.log('[webhook] unhandled event:', eventType);
    return json200(req, { received: true, note: 'event ignored' });

  } catch (err) {
    console.error('[webhook] ERROR:', err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Webhook failed' }),
      { status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );
  }
});

function json200(req: Request, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}