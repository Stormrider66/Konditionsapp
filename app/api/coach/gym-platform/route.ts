import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAdapter } from '@/lib/integrations/gym-platforms/adapters'
import type { ConnectionConfig } from '@/lib/integrations/gym-platforms/types'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET() {
  try {
    const user = await requireCoach()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ connections: [] })
    }

    const connections = await prisma.gymPlatformConnection.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        provider: true,
        displayName: true,
        siteId: true,
        syncClasses: true,
        syncBookings: true,
        pushWorkouts: true,
        syncInterval: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncError: true,
        lastSyncStats: true,
        createdAt: true,
        _count: {
          select: {
            syncedClasses: true,
            syncedBookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ connections })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const body = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: t(locale, 'Only owners/admins can manage platform connections', 'Bara ägare/admin kan hantera plattformsanslutningar') }, { status: 403 })
    }

    // Test connection first
    const adapter = getAdapter(body.provider)
    if (!adapter) {
      return NextResponse.json({ error: t(locale, 'Unknown platform', 'Okänd plattform') }, { status: 400 })
    }

    const config: ConnectionConfig = {
      provider: body.provider,
      locale,
      apiKey: body.apiKey || undefined,
      apiSecret: body.apiSecret || undefined,
      siteId: body.siteId || undefined,
    }

    const testResult = await adapter.testConnection(config)

    const connection = await prisma.gymPlatformConnection.upsert({
      where: {
        businessId_provider: {
          businessId: membership.businessId,
          provider: body.provider,
        },
      },
      update: {
        displayName: body.displayName || body.provider,
        apiKey: body.apiKey || null,
        apiSecret: body.apiSecret || null,
        siteId: body.siteId || null,
        isActive: true,
        lastSyncError: testResult.success ? null : testResult.error,
      },
      create: {
        businessId: membership.businessId,
        provider: body.provider,
        displayName: body.displayName || body.provider,
        apiKey: body.apiKey || null,
        apiSecret: body.apiSecret || null,
        siteId: body.siteId || null,
      },
      select: {
        id: true,
        provider: true,
        displayName: true,
        isActive: true,
        lastSyncError: true,
      },
    })

    return NextResponse.json({
      connection,
      testResult,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { id } = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.gymPlatformConnection.deleteMany({
      where: { id, businessId: membership.businessId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
