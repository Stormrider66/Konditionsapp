import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { collectTeamData, computeVariableCoverage } from '@/lib/mva/data-collector'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify team ownership + get sport type
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, sportType: true },
    })
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Check coach subscription (PRO/ENTERPRISE)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })
    if (!subscription || !['PRO', 'ENTERPRISE'].includes(subscription.tier)) {
      return NextResponse.json(
        { success: false, error: 'PRO-prenumeration krävs för multivariat analys' },
        { status: 403 }
      )
    }

    // Collect team data and compute coverage
    const bundles = await collectTeamData(teamId)
    const coverage = computeVariableCoverage(bundles)

    return NextResponse.json({
      success: true,
      data: {
        variables: coverage,
        teamSize: bundles.length,
        sportType: team.sportType ?? null,
      },
    })
  } catch (error) {
    console.error('MVA variables error:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfel vid hämtning av variabler' },
      { status: 500 }
    )
  }
}
