// supabase/functions/create-checkout/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import DodoPayments from 'npm:dodopayments';
import { corsHeadersFor } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  try {
    // ------------------------------------------------
    // 1. Authorization required
    // ------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // ------------------------------------------------
    // 2. Parse body
    // ------------------------------------------------
    const { productId, userId, userEmail, returnUrl } = await req.json();

    if (!productId || !userId || !userEmail) {
      return new Response(
        JSON.stringify({
          error: 'productId, userId and userEmail are required',
        }),
        {
          status: 400,
          headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // ------------------------------------------------
    // 3. Create Dodo client
    // ------------------------------------------------
    const dodoApiKey = Deno.env.get('DODO_API_KEY');
    const environment = Deno.env.get('DODO_ENVIRONMENT') || 'test_mode';
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5500';

    if (!dodoApiKey) {
      throw new Error('DODO_API_KEY is not configured');
    }

    const client = new DodoPayments({
      bearerToken: dodoApiKey,
      environment: environment,
    });

    // ------------------------------------------------
    // 4. Determine return URL
    // ------------------------------------------------
    const ALLOWED_ORIGINS = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5501',
      'http://127.0.0.1:5501',
      'https://prop65-shield.vercel.app',
    ];

    let returnTo = `${appUrl}/settings.html`;

    if (returnUrl && typeof returnUrl === 'string') {
      try {
        const url = new URL(returnUrl);
        const origin = `${url.protocol}//${url.host}`;

        if (ALLOWED_ORIGINS.includes(origin)) {
          returnTo = returnUrl;
        } else {
          console.warn('Blocked returnUrl from untrusted origin:', origin);
        }
      } catch (e) {
        console.warn('Invalid returnUrl:', returnUrl);
      }
    }

    // ------------------------------------------------
    // 5. Create checkout session
    // ------------------------------------------------
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
      return_url: `${returnTo}${returnTo.includes('?') ? '&' : '?'}checkout=success`,
    });

    console.log('Checkout session created:', session.checkout_url);

    // ------------------------------------------------
    // 6. Return URL
    // ------------------------------------------------
    return new Response(
      JSON.stringify({
        url: session.checkout_url,
        sessionId: session.session_id,
      }),
      {
        status: 200,
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('create-checkout error:', error.message);

    return new Response(
      JSON.stringify({
        error: error.message || 'Could not create checkout session',
      }),
      {
        status: 400,
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      }
    );
  }
});



