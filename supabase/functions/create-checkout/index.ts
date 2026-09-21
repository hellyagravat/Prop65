// supabase/functions/create-checkout/index.js
//
// Called by the browser when the user clicks "Upgrade".
// Uses the secret Dodo API key to create a checkout session
// and returns the hosted checkout URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import DodoPayments from 'npm:dodopayments';
import { corsHeaders } from '../_shared/cors.js';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --------------------------------------------------
    // 1. Require an Authorization header
    // --------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // --------------------------------------------------
    // 2. Parse body
    // --------------------------------------------------
    const { productId, userId, userEmail } = await req.json();

    if (!productId || !userId || !userEmail) {
      return new Response(
        JSON.stringify({
          error: 'productId, userId and userEmail are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // --------------------------------------------------
    // 3. Create Dodo client
    // --------------------------------------------------
    const dodoApiKey = Deno.env.get('DODO_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5500';

    if (!dodoApiKey) {
      throw new Error('DODO_API_KEY is not configured');
    }

    const client = new DodoPayments({
      bearerToken: dodoApiKey,
      environment: 'test_mode',
    });

    // --------------------------------------------------
    // 4. Create the checkout session
    // --------------------------------------------------
    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: {
        email: userEmail,
      },
      metadata: {
        user_id: userId,
      },
      return_url: `${appUrl}/settings.html?checkout=success`,
    });

    console.log('Checkout session created:', session.checkout_url);

    // --------------------------------------------------
    // 5. Return URL
    // --------------------------------------------------
    return new Response(
      JSON.stringify({
        url: session.checkout_url,
        sessionId: session.session_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('create-checkout error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Could not create checkout session',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});