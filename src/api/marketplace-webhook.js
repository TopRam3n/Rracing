/**
 * Marketplace Webhook Handler
 * Placeholder for Medusa/Stripe payment webhooks
 * Handles order creation, fulfillment, subscription events
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  const body = req.body;

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Route to appropriate handler
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook error' });
  }
}

async function handlePaymentSuccess(paymentIntent) {
  // TODO: Update order status in Supabase
  // - orders.status = 'confirmed'
  // - Create order_items records
  // - Email confirmation
  console.log('Payment succeeded:', paymentIntent.id);
}

async function handleRefund(charge) {
  // TODO: Update order status
  // - orders.status = 'refunded'
  // - Restock inventory
  // - Email refund notification
  console.log('Refund processed:', charge.refund);
}

async function handleSubscriptionUpdate(subscription) {
  // TODO: Update user subscription tier
  // - driver_profiles.subscription_tier = 'pro'
  // - Increment build quota
  console.log('Subscription updated:', subscription.id);
}
