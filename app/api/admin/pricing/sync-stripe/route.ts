import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import Stripe from 'stripe'

// POST /api/admin/pricing/sync-stripe - Sync pricing tiers with Stripe
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN'])

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw ApiError.internal('Stripe is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    })

    const body = await request.json()
    const { tierId } = body

    // Get tier(s) to sync
    const tiers = tierId
      ? [await prisma.pricingTier.findUnique({ where: { id: tierId } })]
      : await prisma.pricingTier.findMany({ where: { isActive: true } })

    const results: Array<{
      tierId: string
      tierName: string
      status: 'created' | 'updated' | 'error'
      stripeProductId?: string
      error?: string
    }> = []

    for (const tier of tiers) {
      if (!tier) continue

      try {
        let productId = tier.stripeProductId

        // Create or update Stripe product
        if (!productId) {
          const product = await stripe.products.create({
            name: `${tier.tierType} - ${tier.displayName}`,
            description: tier.description || undefined,
            metadata: {
              tierId: tier.id,
              tierType: tier.tierType,
              tierName: tier.tierName,
            },
          })
          productId = product.id
        } else {
          await stripe.products.update(productId, {
            name: `${tier.tierType} - ${tier.displayName}`,
            description: tier.description || undefined,
          })
        }

        // Create or update monthly price
        let monthlyPriceId = tier.stripePriceIdMonthly
        if (!monthlyPriceId && tier.monthlyPriceCents > 0) {
          const monthlyPrice = await stripe.prices.create({
            product: productId,
            unit_amount: tier.monthlyPriceCents,
            currency: tier.currency.toLowerCase(),
            recurring: { interval: 'month' },
            metadata: {
              tierId: tier.id,
              interval: 'monthly',
            },
          })
          monthlyPriceId = monthlyPrice.id
        }

        // Create or update yearly price
        let yearlyPriceId = tier.stripePriceIdYearly
        if (!yearlyPriceId && tier.yearlyPriceCents && tier.yearlyPriceCents > 0) {
          const yearlyPrice = await stripe.prices.create({
            product: productId,
            unit_amount: tier.yearlyPriceCents,
            currency: tier.currency.toLowerCase(),
            recurring: { interval: 'year' },
            metadata: {
              tierId: tier.id,
              interval: 'yearly',
            },
          })
          yearlyPriceId = yearlyPrice.id
        }

        // Update tier with Stripe IDs
        await prisma.pricingTier.update({
          where: { id: tier.id },
          data: {
            stripeProductId: productId,
            stripePriceIdMonthly: monthlyPriceId,
            stripePriceIdYearly: yearlyPriceId,
          },
        })

        results.push({
          tierId: tier.id,
          tierName: tier.tierName,
          status: tier.stripeProductId ? 'updated' : 'created',
          stripeProductId: productId,
        })
      } catch (err) {
        results.push({
          tierId: tier.id,
          tierName: tier.tierName,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        synced: results.filter((r) => r.status !== 'error').length,
        errors: results.filter((r) => r.status === 'error').length,
        results,
      },
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/pricing/sync-stripe')
  }
}
