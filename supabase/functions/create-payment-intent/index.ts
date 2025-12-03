import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import Stripe from "stripe"; // now resolved through import_map.json

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16"
});

serve(async (req) => {
  try {
    const { amount, currency, planId, userId } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'pkr',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        planId,
        userId,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});