import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import { collectTeamData, computeVariableCoverage } from '@/lib/mva/data-collector'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function getUserLocale(userId: string): Promise<AppLocale> {
  const appUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  })
  return appUser?.language === 'sv' ? 'sv' : 'en'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id: teamId } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    locale = await getUserLocale(user.id)

    // Verify team ownership + get sport type
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, sportType: true },
    })
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Check coach subscription (PRO/ENTERPRISE) — platform admins bypass
    if (!(await hasProTierAccess(user.id))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for multivariate analysis', 'PRO-prenumeration krävs för multivariat analys') },
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
      { success: false, error: t(locale, 'Server error while fetching variables', 'Serverfel vid hämtning av variabler') },
      { status: 500 }
    )
  }
}
