// app/api/athlete/me/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/athlete/me - Get current athlete's info including sport profile
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get athlete account with client and sport profile
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          include: {
            sportProfile: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: athleteAccount.id,
        clientId: athleteAccount.clientId,
        clientName: athleteAccount.client.name,
        sportProfile: athleteAccount.client.sportProfile,
      },
    })
  } catch (error) {
    logger.error('Error fetching athlete info', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch athlete info' },
      { status: 500 }
    )
  }
}
