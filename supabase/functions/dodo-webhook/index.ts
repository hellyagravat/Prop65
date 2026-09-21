// supabase/functions/dodo-webhook/index.js
//
// Receives webhooks from Dodo when a subscription is created,
// paid, or cancelled. Verifies the signature and updates the
// user's membership_plan in the Supabase profiles table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'npm:standardwebhooks';
import { corsHeaders } from '../_shared/cors.ts';

// --------------------------------------------------
// Map Dodo product IDs → internal plan names.
// --------------------------------------------------
const PRODUCT_TO_PLAN = {
  'pdt_0No4rJyQKAPXNcbPw18sH': 'premium',
  // 'pdt_0No4qyr9h4jC75dGz4r4x': 'growth',  // Growth
  'pdt_0No4rECY6eqhxOpypGVQH': 'agency',   // Agency
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --------------------------------------------------
    // 1. Read raw body + signature headers
    // --------------------------------------------------
    const body = await req.text();
    const headers = {
      'webhook-id': req.headers.get('webhook-id') || '',
      'webhook-signature': req.headers.get('webhook-signature') || '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
    };

    const webhookSecret = Deno.env.get('DODO_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('DODO_WEBHOOK_SECRET is not configured');
    }

    // --------------------------------------------------
    // 2. Verify signature
    // --------------------------------------------------
    const webhook = new Webhook(webhookSecret);
    await webhook.verify(body, headers);

    // --------------------------------------------------
    // 3. Parse event
    // --------------------------------------------------
    const event = JSON.parse(body);
    console.log('Received event:', event.type);

    // --------------------------------------------------
    // 4. Supabase admin client (bypasses RLS)
    // --------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --------------------------------------------------
    // 5. Subscription activated / payment succeeded
    // --------------------------------------------------
    if (
      event.type === 'subscription.active' ||
      event.type === 'payment.succeeded'
    ) {
      const userId = event.data.metadata?.user_id;
      const productId = event.data.product_id;
      const plan = PRODUCT_TO_PLAN[productId];

      if (!userId) {
        console.error('Missing user_id in metadata');
        return new Response('Missing user_id', {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (!plan) {
        console.error('Unknown product ID:', productId);
        return new Response('Unknown product ID', {
          status: 400,
          headers: corsHeaders,
        });
      }

      console.log(`Upgrading user ${userId} to plan: ${plan}`);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          membership_plan: plan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Supabase update failed:', error);
        throw error;
      }

      console.log(`User ${userId} upgraded successfully.`);
    }

    // --------------------------------------------------
    // 6. Subscription cancelled
    // --------------------------------------------------
    if (event.type === 'subscription.cancelled') {
      const userId = event.data.metadata?.user_id;

      if (userId) {
        console.log(`Downgrading user ${userId} to free`);

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            membership_plan: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          console.error('Supabase downgrade failed:', error);
          throw error;
        }

        console.log(`User ${userId} downgraded successfully.`);
      }
    }

    // --------------------------------------------------
    // 7. Acknowledge
    // --------------------------------------------------
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err.message);

    return new Response(
      JSON.stringify({ error: err.message || 'Webhook failed' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});