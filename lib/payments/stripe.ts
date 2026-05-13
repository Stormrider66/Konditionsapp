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
import { calculateAndRecordRevenueShare } from '@/lib/coach/revenue-share';
import { sendPaymentFailedEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getOrCreateAiAllowanceAccount, roundSek } from '@/lib/ai/billing/allowance';
import { getAiTopUpPack } from '@/lib/ai/billing/top-up-packs';

// Lazy initialize Stripe client to avoid build-time errors
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      // Auto-retry transient network errors. The SDK auto-generates an
      // idempotency key for each retry so duplicate writes (customers,
      // subscriptions, refunds) are not created on the Stripe side.
      maxNetworkRetries: 2,
      // Default timeout is 80s — too long for user-facing checkout flows.
      // Cap at 20s so a stuck Stripe call surfaces the breaker / fallback
      // path instead of pinning a Fluid Compute instance.
      timeout: 20_000,
    });
  }
  return _stripe;
}

// Lazy accessor — calls getStripeClient() on each use so the key is
// validated at runtime rather than import time.
function stripe(): Stripe {
  return getStripeClient();
}

// Price IDs from environment
const PRICE_IDS = {
  STANDARD_MONTHLY: process.env.STRIPE_ATHLETE_STANDARD_MONTHLY,
  STANDARD_YEARLY: process.env.STRIPE_ATHLETE_STANDARD_YEARLY,
  PRO_MONTHLY: process.env.STRIPE_ATHLETE_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_ATHLETE_PRO_YEARLY,
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
  const freeFeatures = getTierFeatures(AthleteSubscriptionTier.FREE);
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
  const customer = await stripe().customers.create({
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
      paymentSource: 'DIRECT',
      ...freeFeatures,
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
  const customerId = await getOrCreateStripeCustomer(clientId);

  // Check if business has Stripe Connect for revenue sharing
  let applicationFeePercent: number | undefined;
  let stripeAccount: string | undefined;
  let business: { name: string; stripeConnectAccountId: string | null; stripeConnectStatus: string | null; defaultRevenueShare: number; elitePriceMonthly: number | null; elitePriceYearly: number | null; eliteDescription: string | null } | null = null;

  if (businessId) {
    business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business?.stripeConnectAccountId && business.stripeConnectStatus === 'ACTIVE') {
      stripeAccount = business.stripeConnectAccountId;
      applicationFeePercent = business.defaultRevenueShare; // Platform's share
    }
  }

  // Build line items - ELITE uses dynamic pricing, others use pre-defined Price IDs
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (tier === 'ELITE') {
    if (!businessId || !business) {
      throw new Error('ELITE tier requires a business');
    }
    const priceInOre = cycle === 'MONTHLY'
      ? business.elitePriceMonthly
      : business.elitePriceYearly;
    if (!priceInOre) {
      throw new Error('Business does not offer ELITE tier');
    }

    lineItems = [{
      price_data: {
        currency: 'sek',
        product_data: {
          name: `Elite Training – ${business.name}`,
          description: business.eliteDescription || 'Premium training with assigned PT',
        },
        unit_amount: priceInOre,
        recurring: {
          interval: cycle === 'MONTHLY' ? 'month' : 'year',
        },
      },
      quantity: 1,
    }];
  } else {
    const priceId = getPriceId(tier, cycle);
    if (!priceId) {
      throw new Error(`No price configured for tier ${tier} with cycle ${cycle}`);
    }
    lineItems = [{ price: priceId, quantity: 1 }];
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
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

  const session = await stripe().checkout.sessions.create(sessionConfig);

  return session.url!;
}

/**
 * Create a one-time checkout session for athlete AI credit top-ups.
 */
export async function createAiTopUpCheckoutSession(
  clientId: string,
  packId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const pack = getAiTopUpPack(packId);
  if (!pack) {
    throw new Error(`Unknown AI top-up pack: ${packId}`);
  }

  const customerId = await getOrCreateStripeCustomer(clientId);
  const amountPaidSek = roundSek(pack.amountSek);
  const creditsSek = roundSek(pack.creditsSek);

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'sek',
          product_data: {
            name: `${pack.name} krediter`,
            description: pack.description,
          },
          unit_amount: Math.round(amountPaidSek * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'ai_top_up',
      clientId,
      packId: pack.id,
      amountPaidSek: String(amountPaidSek),
      creditsSek: String(creditsSek),
    },
    payment_intent_data: {
      metadata: {
        type: 'ai_top_up',
        clientId,
        packId: pack.id,
        amountPaidSek: String(amountPaidSek),
        creditsSek: String(creditsSek),
      },
    },
  });

  await prisma.aITopUpPurchase.create({
    data: {
      clientId,
      stripeCheckoutSessionId: session.id,
      amountPaidSek,
      creditsSek,
      creditsRemainingSek: creditsSek,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

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

  const session = await stripe().billingPortal.sessions.create({
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
  if (session.metadata?.type === 'ai_top_up') {
    return handleAiTopUpCheckoutComplete(session);
  }

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

async function handleAiTopUpCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<{ handled: boolean; message: string }> {
  const { clientId, creditsSek, amountPaidSek } = session.metadata || {};

  if (!clientId || !creditsSek || !amountPaidSek) {
    return { handled: false, message: 'Missing AI top-up metadata in checkout session' };
  }

  const parsedCreditsSek = roundSek(Number(creditsSek));
  const parsedAmountPaidSek = roundSek(Number(amountPaidSek));

  if (!Number.isFinite(parsedCreditsSek) || parsedCreditsSek <= 0) {
    return { handled: false, message: 'Invalid AI top-up credit amount' };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.aITopUpPurchase.findUnique({
      where: { stripeCheckoutSessionId: session.id },
      select: { id: true, status: true },
    });

    if (existing?.status === 'ACTIVE') {
      return;
    }

    await getOrCreateAiAllowanceAccount(clientId, new Date(), tx);

    if (existing) {
      await tx.aITopUpPurchase.update({
        where: { id: existing.id },
        data: {
          stripePaymentIntentId: paymentIntentId,
          amountPaidSek: parsedAmountPaidSek,
          creditsSek: parsedCreditsSek,
          creditsRemainingSek: parsedCreditsSek,
          status: 'ACTIVE',
        },
      });
    } else {
      await tx.aITopUpPurchase.create({
        data: {
          clientId,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          amountPaidSek: parsedAmountPaidSek,
          creditsSek: parsedCreditsSek,
          creditsRemainingSek: parsedCreditsSek,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    await tx.aIAllowanceAccount.update({
      where: { clientId },
      data: {
        topUpBalanceSek: { increment: parsedCreditsSek },
      },
    });
  });

  return { handled: true, message: `AI top-up activated for client ${clientId}` };
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
    case 'past_due':
      // Fail closed: suspend access while Stripe is retrying payment
      status = SubscriptionStatus.EXPIRED;
      logger.warn('Athlete subscription payment past due - access suspended', {
        clientId,
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
      return { handled: true, message: `Subscription incomplete for client ${clientId}, awaiting payment` };
    default:
      logger.warn('Unknown Stripe subscription status', { clientId, stripeStatus: subscription.status });
      // Fail closed on unknown status to avoid accidental free access
      status = SubscriptionStatus.EXPIRED;
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
    ? await stripe().subscriptions.retrieve(subscriptionId)
    : null;

  if (subscription?.metadata?.clientId) {
    const clientId = subscription.metadata.clientId;

    // Reset monthly AI chat usage counter
    await prisma.athleteSubscription.update({
      where: { clientId },
      data: {
        aiChatMessagesUsed: 0, // Reset monthly counter
      },
    });

    // Calculate and record revenue share for coach (if applicable)
    // This only creates a record if the athlete has an assigned coach
    // and the revenue share start date has been reached
    try {
      const totalAmount = invoice.amount_paid; // Amount in smallest currency unit (öre/cents)
      const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
      const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date();

      const revenueShareResult = await calculateAndRecordRevenueShare({
        athleteClientId: clientId,
        subscriptionId: subscriptionId || invoice.id,
        totalAmount,
        periodStart,
        periodEnd,
      });

      if (revenueShareResult.recorded) {
        logger.info('Revenue share recorded for invoice', {
          invoiceId: invoice.id,
          clientId,
          totalAmount,
        });
      } else {
        logger.debug('Revenue share not recorded', {
          invoiceId: invoice.id,
          clientId,
          reason: revenueShareResult.reason,
        });
      }
    } catch (error) {
      // Log error but don't fail the webhook - payment succeeded
      logger.error('Error recording revenue share', { invoiceId: invoice.id, clientId }, error);
    }

    return {
      handled: true,
      message: `Payment succeeded and usage reset for client ${clientId}`,
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
  const invoiceAny = invoice as unknown as {
    subscription?: string | null;
    amount_due?: number;
    next_payment_attempt?: number | null;
  };
  const subscriptionId = invoiceAny.subscription;

  const subscription = subscriptionId
    ? await stripe().subscriptions.retrieve(subscriptionId)
    : null;

  if (subscription?.metadata?.clientId) {
    const clientId = subscription.metadata.clientId;
    logger.error('Athlete payment failed', { clientId, invoiceId: invoice.id });

    // Send payment failure email to athlete
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          athleteAccount: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
      });

      const athleteEmail = client?.athleteAccount?.user?.email || client?.email;
      const athleteName = client?.athleteAccount?.user?.name || client?.name || 'Athlete';

      if (athleteEmail) {
        const amount = invoiceAny.amount_due
          ? `${(invoiceAny.amount_due / 100).toFixed(0)} kr`
          : 'Okänt belopp';
        const retryDate = invoiceAny.next_payment_attempt
          ? new Date(invoiceAny.next_payment_attempt * 1000).toLocaleDateString('sv-SE')
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');

        await sendPaymentFailedEmail(
          athleteEmail,
          athleteName,
          amount,
          retryDate,
          'sv',
          { updatePaymentPath: '/athlete/subscription' }
        );
      }
    } catch (emailError) {
      logger.error('Failed to send athlete payment failed email', { clientId }, emailError);
    }

    return {
      handled: true,
      message: `Payment failed for client ${clientId}`,
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return stripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe().subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel Stripe subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume cancelled subscription (if still within period)
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Export Stripe client getter for direct use if needed
export { getStripeClient };
