/**
 * Business Invitation Accept API
 *
 * POST /api/business/invitations/accept - Accept a business invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const acceptSchema = z.object({
  code: z.string().uuid('Valid invitation code is required'),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Unauthorized. Please log in or create an account first.',
            'Obehörig. Logga in eller skapa ett konto först.'
          ),
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = acceptSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { code } = validationResult.data

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: t(locale, 'Invitation not found', 'Inbjudan hittades inte') },
        { status: 404 }
      )
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: t(locale, 'Invitation has already been used', 'Inbjudan har redan använts') },
        { status: 400 }
      )
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: t(locale, 'Invitation has expired', 'Inbjudan har gått ut') },
        { status: 400 }
      )
    }

    if (invitation.type !== 'BUSINESS_CLAIM') {
      return NextResponse.json(
        { error: t(locale, 'Invalid invitation type', 'Ogiltig inbjudningstyp') },
        { status: 400 }
      )
    }

    if (!invitation.businessId) {
      return NextResponse.json(
        { error: t(locale, 'Invalid invitation: no business linked', 'Ogiltig inbjudan: ingen verksamhet är kopplad') },
        { status: 400 }
      )
    }

    // Find the database user
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: t(locale, 'User account not found', 'Användarkontot hittades inte') },
        { status: 404 }
      )
    }
    locale = resolveRequestLocale(request, dbUser.language)

    // Check if user is already a member of this business
    const existingMembership = await prisma.businessMember.findFirst({
      where: {
        userId: dbUser.id,
        businessId: invitation.businessId,
      },
    })

    if (existingMembership) {
      // Mark invitation as used even if already a member
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      })
      return NextResponse.json(
        { error: t(locale, 'You are already a member of this business', 'Du är redan medlem i den här verksamheten') },
        { status: 400 }
      )
    }

    // Check if user is already in another business
    const otherMembership = await prisma.businessMember.findFirst({
      where: { userId: dbUser.id },
    })

    if (otherMembership) {
      return NextResponse.json(
        { error: t(locale, 'You are already a member of another business', 'Du är redan medlem i en annan verksamhet') },
        { status: 400 }
      )
    }

    // Extract role from metadata
    const metadata = invitation.metadata as Record<string, unknown> | null
    const role = (metadata?.role as string) || 'MEMBER'

    // Create the membership and mark invitation as used in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.businessMember.create({
        data: {
          userId: dbUser.id,
          businessId: invitation.businessId!,
          role,
        },
        include: {
          business: { select: { name: true, slug: true } },
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), currentUses: { increment: 1 } },
      })

      return membership
    })

    logger.info('Business invitation accepted', {
      userId: dbUser.id,
      businessId: result.businessId,
      role: result.role,
      invitationId: invitation.id,
    })

    return NextResponse.json({
      success: true,
      business: {
        id: result.businessId,
        name: result.business.name,
        slug: result.business.slug,
      },
      role: result.role,
    })
  } catch (error) {
    logger.error('Accept business invitation error', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to accept invitation', 'Kunde inte acceptera inbjudan') },
      { status: 500 }
    )
  }
}
