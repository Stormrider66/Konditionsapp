/**
 * Stripe Payment Integration
 *
 * Handles Stripe checkout sessions, webhooks, and subscription management
 * for athlete subscriptions with support for revenue sharing.
 */

import 'server-only';

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { AthleteSubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { getTierFeatures } from '@/lib/auth/tier-utils';

// Lazy initialize Stripe client to avoid build-time errors
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15',
    });
  }
  return _stripe;
}

// Convenience getter for the Stripe client
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as unknown as Record<string, unknown>)[prop as string];
  },
});

// Price IDs from environment
const PRICE_IDS = {
  STANDARD_MONTHLY: process.env.STRIPE_ATHLETE_STANDARD_MONTHLY!,
  STANDARD_YEARLY: process.env.STRIPE_ATHLETE_STANDARD_YEARLY!,
  PRO_MONTHLY: process.env.STRIPE_ATHLETE_PRO_MONTHLY!,
  PRO_YEARLY: process.env.STRIPE_ATHLETE_PRO_YEARLY!,
} as const;

export type BillingCycle = 'MONTHLY' | 'YEARLY';

/**
 * Get Stripe price ID for a tier and billing cycle
 */
export function getPriceId(tier: AthleteSubscriptionTier, cycle: BillingCycle): string | null {
  if (tier === 'FREE') return null;

  const key = `${tier}_${cycle}` as keyof typeof PRICE_IDS;
  return PRICE_IDS[key] || null;
}

/**
 * Create or get Stripe customer for a client
 */
export async function getOrCreateStripeCustomer(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      athleteSubscription: true,
      user: true,
    },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Return existing customer ID if present
  if (client.athleteSubscription?.stripeCustomerId) {
    return client.athleteSubscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: client.email || client.user?.email || undefined,
    name: client.name,
    metadata: {
      clientId: client.id,
      userId: client.userId,
    },
  });

  // Update subscription with customer ID
  await prisma.athleteSubscription.upsert({
    where: { clientId },
    update: {
      stripeCustomerId: customer.id,
    },
    create: {
      clientId,
      stripeCustomerId: customer.id,
      tier: AthleteSubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  clientId: string,
  tier: AthleteSubscriptionTier,
  cycle: BillingCycle,
  successUrl: string,
  cancelUrl: string,
  businessId?: string
): Promise<string> {
  const priceId = getPriceId(tier, cycle);
  if (!priceId) {
    throw new Error(`No price configured for tier ${tier} with cycle ${cycle}`);
  }

  const customerId = await getOrCreateStripeCustomer(clientId);

  // Check if business has Stripe Connect for revenue sharing
  let applicationFeePercent: number | undefined;
  let stripeAccount: string | undefined;

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business?.stripeConnectAccountId && business.stripeConnectStatus === 'ACTIVE') {
      stripeAccount = business.stripeConnectAccountId;
      applicationFeePercent = business.defaultRevenueShare; // Platform's share
    }
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      clientId,
      tier,
      cycle,
      businessId: businessId || '',
    },
    subscription_data: {
      metadata: {
        clientId,
        tier,
        cycle,
        businessId: businessId || '',
      },
    },
  };

  // Add application fee for revenue sharing
  if (stripeAccount && applicationFeePercent) {
    sessionConfig.subscription_data!.application_fee_percent = applicationFeePercent;
    sessionConfig.payment_intent_data = {
      transfer_data: {
        destination: stripeAccount,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  return session.url!;
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(
  clientId: string,
  returnUrl: string
): Promise<string> {
  const subscription = await prisma.athleteSubscription.findUnique({
    where: { clientId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error('No Stripe customer found for client');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<{ handled: boolean; message: string }> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);

    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

    case 'invoice.payment_succeeded':
      return handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);

    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);

    default:
      return { handled: false, message: `Unhandled event type: ${event.type}` };
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<{ handled: boolean; message: string }> {
  const { clientId, tier, cycle, businessId } = session.metadata || {};

  if (!clientId || !tier) {
    return { handled: false, message: 'Missing metadata in checkout session' };
  }

  const subscriptionTier = tier as AthleteSubscriptionTier;
  const features = getTierFeatures(subscriptionTier);

  await prisma.athleteSubscription.upsert({
    where: { clientId },
    update: {
      tier: subscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
      billingCycle: cycle || 'MONTHLY',
      businessId: businessId || null,
      paymentSource: businessId ? 'BUSINESS' : 'DIRECT',
      ...features,
    },
    create: {
      clientId,
      tier: subscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
      billingCycle: cycle || 'MONTHLY',
      businessId: businessId || null,
      paymentSource: businessId ? 'BUSINESS' : 'DIRECT',
      ...features,
    },
  });

  return { handled: true, message: `Subscription created for client ${clientId}` };
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<{ handled: boolean; message: string }> {
  const { clientId, tier } = subscription.metadata || {};

  if (!clientId) {
    return { handled: false, message: 'Missing clientId in subscription metadata' };
  }

  // Determine status
  let status: SubscriptionStatus;
  switch (subscription.status) {
    case 'active':
      status = SubscriptionStatus.ACTIVE;
      break;
    case 'trialing':
      status = SubscriptionStatus.TRIAL;
      break;
    case 'canceled':
    case 'unpaid':
      status = SubscriptionStatus.CANCELLED;
      break;
    default:
      status = SubscriptionStatus.ACTIVE;
  }

  const subscriptionTier = (tier as AthleteSubscriptionTier) || 'FREE';
  const features = getTierFeatures(subscriptionTier);

  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      tier: subscriptionTier,
      status,
      ...features,
    },
  });

  return { handled: true, message: `Subscription updated for client ${clientId}` };
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<{ handled: boolean; message: string }> {
  const { clientId } = subscription.metadata || {};

  if (!clientId) {
    return { handled: false, message: 'Missing clientId in subscription metadata' };
  }

  // Downgrade to FREE tier
  const features = getTierFeatures(AthleteSubscriptionTier.FREE);

  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      tier: AthleteSubscriptionTier.FREE,
      status: SubscriptionStatus.CANCELLED,
      stripeSubscriptionId: null,
      ...features,
    },
  });

  return { handled: true, message: `Subscription cancelled for client ${clientId}` };
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<{ handled: boolean; message: string }> {
  // Reset monthly usage counters if it's a new billing period
  // Access subscription via parent in newer API versions
  const invoiceAny = invoice as unknown as { subscription?: string | null };
  const subscriptionId = invoiceAny.subscription;

  const subscription = subscriptionId
    ? await stripe.subscriptions.retrieve(subscriptionId)
    : null;

  if (subscription?.metadata?.clientId) {
    await prisma.athleteSubscription.update({
      where: { clientId: subscription.metadata.clientId },
      data: {
        aiChatMessagesUsed: 0, // Reset monthly counter
      },
    });

    return {
      handled: true,
      message: `Payment succeeded and usage reset for client ${subscription.metadata.clientId}`,
    };
  }

  return { handled: true, message: 'Payment succeeded but no clientId found' };
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<{ handled: boolean; message: string }> {
  // Access subscription via parent in newer API versions
  const invoiceAny = invoice as unknown as { subscription?: string | null };
  const subscriptionId = invoiceAny.subscription;

  const subscription = subscriptionId
    ? await stripe.subscriptions.retrieve(subscriptionId)
    : null;

  if (subscription?.metadata?.clientId) {
    // Could send notification, update status, etc.
    console.error(`Payment failed for client ${subscription.metadata.clientId}`);
    return {
      handled: true,
      message: `Payment failed for client ${subscription.metadata.clientId}`,
    };
  }

  return { handled: true, message: 'Payment failed but no clientId found' };
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel Stripe subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume cancelled subscription (if still within period)
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Export Stripe client getter for direct use if needed
export { getStripeClient };
