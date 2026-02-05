/**
 * Coach Stripe Payment Integration
 *
 * Handles Stripe checkout sessions, webhooks, and subscription management
 * for coach subscriptions (separate from athlete subscriptions).
 */

import 'server-only';

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '@/lib/email';
import { logger } from '@/lib/logger';

// Lazy initialize Stripe client to avoid build-time errors
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
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

// Coach subscription price IDs from environment
const COACH_PRICE_IDS = {
  BASIC_MONTHLY: process.env.STRIPE_COACH_BASIC_MONTHLY,
  BASIC_YEARLY: process.env.STRIPE_COACH_BASIC_YEARLY,
  PRO_MONTHLY: process.env.STRIPE_COACH_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_COACH_PRO_YEARLY,
  ENTERPRISE_MONTHLY: process.env.STRIPE_COACH_ENTERPRISE_MONTHLY,
  ENTERPRISE_YEARLY: process.env.STRIPE_COACH_ENTERPRISE_YEARLY,
} as const;

// Pricing in SEK (for display purposes)
export const COACH_PRICING = {
  BASIC: {
    monthly: 499,
    yearly: 4990, // ~2 months free
    maxAthletes: 20,
  },
  PRO: {
    monthly: 1499,
    yearly: 14990, // ~2 months free
    maxAthletes: 100,
  },
  ENTERPRISE: {
    monthly: null, // Custom pricing
    yearly: null,
    maxAthletes: -1, // Unlimited
  },
} as const;

export type CoachBillingCycle = 'MONTHLY' | 'YEARLY';

/**
 * Get Stripe price ID for a coach tier and billing cycle
 */
export function getCoachPriceId(tier: SubscriptionTier, cycle: CoachBillingCycle): string | null {
  if (tier === 'FREE') return null;

  const key = `${tier}_${cycle}` as keyof typeof COACH_PRICE_IDS;
  return COACH_PRICE_IDS[key] || null;
}

/**
 * Get max athletes allowed for a tier
 */
export function getMaxAthletesForTier(tier: SubscriptionTier): number {
  switch (tier) {
    case 'FREE':
      return 1;
    case 'BASIC':
      return 20;
    case 'PRO':
      return 100;
    case 'ENTERPRISE':
      return -1; // Unlimited
    default:
      return 0;
  }
}

/**
 * Create or get Stripe customer for a coach
 */
export async function getOrCreateCoachStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Return existing customer ID if present
  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId: user.id,
      type: 'coach',
    },
  });

  // Update or create subscription with customer ID
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId: customer.id,
    },
    create: {
      userId,
      stripeCustomerId: customer.id,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      maxAthletes: 1,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for coach subscription upgrade
 */
export async function createCoachCheckoutSession(
  userId: string,
  tier: SubscriptionTier,
  cycle: CoachBillingCycle,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const priceId = getCoachPriceId(tier, cycle);
  if (!priceId) {
    throw new Error(`No price configured for tier ${tier} with cycle ${cycle}`);
  }

  const customerId = await getOrCreateCoachStripeCustomer(userId);

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
      userId,
      tier,
      cycle,
      type: 'coach',
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
        cycle,
        type: 'coach',
      },
    },
    // Allow promotion codes for discounts
    allow_promotion_codes: true,
  };

  const session = await stripe.checkout.sessions.create(sessionConfig);

  return session.url!;
}

/**
 * Create a billing portal session for coach subscription management
 */
export async function createCoachBillingPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error('No Stripe customer found for coach');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Handle coach-specific Stripe webhook events
 */
export async function handleCoachStripeWebhook(
  event: Stripe.Event
): Promise<{ handled: boolean; message: string }> {
  // Check if this is a coach-related event by looking at metadata
  const metadata = getEventMetadata(event);
  if (metadata?.type !== 'coach') {
    return { handled: false, message: 'Not a coach event' };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCoachCheckoutComplete(event.data.object as Stripe.Checkout.Session);

    case 'customer.subscription.updated':
      return handleCoachSubscriptionUpdated(event.data.object as Stripe.Subscription);

    case 'customer.subscription.deleted':
      return handleCoachSubscriptionDeleted(event.data.object as Stripe.Subscription);

    case 'invoice.payment_succeeded':
      return handleCoachInvoiceSucceeded(event.data.object as Stripe.Invoice);

    case 'invoice.payment_failed':
      return handleCoachInvoiceFailed(event.data.object as Stripe.Invoice);

    default:
      return { handled: false, message: `Unhandled coach event type: ${event.type}` };
  }
}

/**
 * Extract metadata from various Stripe event types
 */
function getEventMetadata(event: Stripe.Event): Record<string, string> | null {
  const obj = event.data.object as { metadata?: Record<string, string> };
  return obj.metadata || null;
}

/**
 * Handle checkout.session.completed for coaches
 */
async function handleCoachCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<{ handled: boolean; message: string }> {
  const { userId, tier, cycle } = session.metadata || {};

  if (!userId || !tier) {
    return { handled: false, message: 'Missing metadata in coach checkout session' };
  }

  const subscriptionTier = tier as SubscriptionTier;
  const maxAthletes = getMaxAthletesForTier(subscriptionTier);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      tier: subscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
      stripePriceId: null, // Will be set from subscription object if needed
      maxAthletes,
    },
    create: {
      userId,
      tier: subscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
      maxAthletes,
    },
  });

  // Send subscription confirmation email
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      const pricing = COACH_PRICING[tier as keyof typeof COACH_PRICING];
      const isYearly = cycle === 'YEARLY';
      const amount = isYearly
        ? `${pricing?.yearly || 0} kr/år`
        : `${pricing?.monthly || 0} kr/månad`;

      // Calculate next billing date (1 month or 1 year from now)
      const nextBillingDate = new Date();
      if (isYearly) {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      await sendSubscriptionConfirmationEmail(
        user.email,
        user.name || user.email.split('@')[0],
        subscriptionTier,
        amount,
        nextBillingDate.toLocaleDateString('sv-SE'),
        'sv'
      );
    }
  } catch (emailError) {
    console.error('Failed to send subscription confirmation email:', emailError);
    // Don't fail the webhook for email errors
  }

  return { handled: true, message: `Coach subscription created for user ${userId}` };
}

/**
 * Handle customer.subscription.updated for coaches
 */
async function handleCoachSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<{ handled: boolean; message: string }> {
  const { userId, tier } = subscription.metadata || {};

  if (!userId) {
    return { handled: false, message: 'Missing userId in coach subscription metadata' };
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
    case 'past_due':
      // Fail closed: suspend access while Stripe is retrying payment
      status = SubscriptionStatus.EXPIRED;
      logger.warn('Coach subscription payment past due - access suspended', {
        userId,
        stripeStatus: subscription.status,
      });
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      status = SubscriptionStatus.CANCELLED;
      break;
    case 'incomplete':
      // Checkout not yet completed - don't change status
      return { handled: true, message: `Coach subscription incomplete for user ${userId}, awaiting payment` };
    default:
      logger.warn('Unknown Stripe subscription status', { userId, stripeStatus: subscription.status });
      // Fail closed on unknown status to avoid accidental free access
      status = SubscriptionStatus.EXPIRED;
  }

  const subscriptionTier = (tier as SubscriptionTier) || 'FREE';
  const maxAthletes = getMaxAthletesForTier(subscriptionTier);

  // Get current period end (handle both Stripe SDK types)
  const subscriptionAny = subscription as unknown as { current_period_end?: number };
  const currentPeriodEnd = subscriptionAny.current_period_end
    ? new Date(subscriptionAny.current_period_end * 1000)
    : null;

  await prisma.subscription.update({
    where: { userId },
    data: {
      tier: subscriptionTier,
      status,
      maxAthletes,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
    },
  });

  return { handled: true, message: `Coach subscription updated for user ${userId}` };
}

/**
 * Handle customer.subscription.deleted for coaches
 */
async function handleCoachSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<{ handled: boolean; message: string }> {
  const { userId, tier } = subscription.metadata || {};

  if (!userId) {
    return { handled: false, message: 'Missing userId in coach subscription metadata' };
  }

  // Get the current period end for the email
  const subscriptionAny = subscription as unknown as { current_period_end?: number };
  const endDate = subscriptionAny.current_period_end
    ? new Date(subscriptionAny.current_period_end * 1000)
    : new Date();

  // Downgrade to FREE tier
  await prisma.subscription.update({
    where: { userId },
    data: {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.CANCELLED,
      stripeSubscriptionId: null,
      maxAthletes: 1,
    },
  });

  // Send subscription cancelled email
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendSubscriptionCancelledEmail(
        user.email,
        user.name || user.email.split('@')[0],
        tier || 'Subscription',
        endDate.toLocaleDateString('sv-SE'),
        'sv'
      );
    }
  } catch (emailError) {
    console.error('Failed to send subscription cancelled email:', emailError);
    // Don't fail the webhook for email errors
  }

  return { handled: true, message: `Coach subscription cancelled for user ${userId}` };
}

/**
 * Handle invoice.payment_succeeded for coaches
 */
async function handleCoachInvoiceSucceeded(
  invoice: Stripe.Invoice
): Promise<{ handled: boolean; message: string }> {
  // Get subscription from invoice
  const invoiceAny = invoice as unknown as { subscription?: string | null };
  const subscriptionId = invoiceAny.subscription;

  if (!subscriptionId) {
    return { handled: true, message: 'Coach payment succeeded but no subscription found' };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription?.metadata?.userId && subscription?.metadata?.type === 'coach') {
    // Update period end date (handle Stripe SDK types)
    const subAny = subscription as unknown as { current_period_end?: number };
    await prisma.subscription.update({
      where: { userId: subscription.metadata.userId },
      data: {
        stripeCurrentPeriodEnd: subAny.current_period_end
          ? new Date(subAny.current_period_end * 1000)
          : undefined,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    return {
      handled: true,
      message: `Coach payment succeeded for user ${subscription.metadata.userId}`,
    };
  }

  return { handled: true, message: 'Coach payment succeeded but no userId found' };
}

/**
 * Handle invoice.payment_failed for coaches
 */
async function handleCoachInvoiceFailed(
  invoice: Stripe.Invoice
): Promise<{ handled: boolean; message: string }> {
  const invoiceAny = invoice as unknown as {
    subscription?: string | null;
    amount_due?: number;
    next_payment_attempt?: number | null;
  };
  const subscriptionId = invoiceAny.subscription;

  if (!subscriptionId) {
    return { handled: true, message: 'Coach payment failed but no subscription found' };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription?.metadata?.userId && subscription?.metadata?.type === 'coach') {
    console.error(`Coach payment failed for user ${subscription.metadata.userId}`);

    // Send payment failed email
    try {
      const user = await prisma.user.findUnique({
        where: { id: subscription.metadata.userId },
      });

      if (user?.email) {
        const amount = invoiceAny.amount_due
          ? `${(invoiceAny.amount_due / 100).toFixed(0)} kr`
          : 'Okänt belopp';
        const retryDate = invoiceAny.next_payment_attempt
          ? new Date(invoiceAny.next_payment_attempt * 1000).toLocaleDateString('sv-SE')
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'); // 3 days

        await sendPaymentFailedEmail(
          user.email,
          user.name || user.email.split('@')[0],
          amount,
          retryDate,
          'sv'
        );
      }
    } catch (emailError) {
      console.error('Failed to send payment failed email:', emailError);
      // Don't fail the webhook for email errors
    }

    return {
      handled: true,
      message: `Coach payment failed for user ${subscription.metadata.userId}`,
    };
  }

  return { handled: true, message: 'Coach payment failed but no userId found' };
}

/**
 * Get coach subscription from Stripe
 */
export async function getCoachStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel coach subscription at period end
 */
export async function cancelCoachSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume cancelled coach subscription
 */
export async function resumeCoachSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Export Stripe client getter for direct use if needed
export { getStripeClient };
