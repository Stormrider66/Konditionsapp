import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireCoach()

    const profile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
      select: { dashboardMode: true },
    })

    return NextResponse.json({
      dashboardMode: profile?.dashboardMode ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCoach()
    const body = await request.json()
    const { dashboardMode } = body

    // Validate mode value
    if (dashboardMode !== null && dashboardMode !== 'TEAM' && dashboardMode !== 'PT' && dashboardMode !== 'GYM') {
      return NextResponse.json({ error: 'Invalid dashboard mode' }, { status: 400 })
    }

    await prisma.coachProfile.upsert({
      where: { userId: user.id },
      update: { dashboardMode },
      create: {
        userId: user.id,
        slug: user.id,
        dashboardMode,
      },
    })

    return NextResponse.json({ dashboardMode })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
