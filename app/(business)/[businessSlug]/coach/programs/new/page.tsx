// app/(business)/[businessSlug]/coach/programs/new/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ProgramWizard } from '@/components/programs/wizard/ProgramWizard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from '@/i18n/server'
import {
  localizedHockeyMetrics,
  metricValuesForTest,
  type HockeyTestForSummary,
} from '@/lib/hockey/team-test-metrics'

type ProgramWizardClients = Parameters<typeof ProgramWizard>[0]['clients']
type ProgramWizardTeams = NonNullable<Parameters<typeof ProgramWizard>[0]['teams']>
type AppLocale = 'en' | 'sv'

const hockeyTestSelect = {
  id: true,
  clientId: true,
  testDate: true,
  sprint5m: true,
  sprint10m: true,
  sprint20m: true,
  sprint30m: true,
  sprint20mFly: true,
  sprint30mFly: true,
  agility505Left: true,
  agility505Right: true,
  endurance7x40: true,
  gripStrengthLeft: true,
  gripStrengthRight: true,
  standingLongJump: true,
  threeJumpLeft: true,
  threeJumpRight: true,
  beepTestLevel: true,
  beepTestShuttle: true,
  wingate30sAveragePower: true,
  vo2Max: true,
  lt1SpeedKmh: true,
  lt1HeartRate: true,
  lt1Lactate: true,
  lt2SpeedKmh: true,
  lt2HeartRate: true,
  lt2Lactate: true,
  maxLactate: true,
  maxHeartRate: true,
  rampTimeSeconds: true,
  backSquat1RM: true,
  powerClean1RM: true,
  benchPress1RM: true,
  pullUp1RM: true,
  muscleLabMaxima: true,
} satisfies Prisma.HockeyPhysicalTestSelect

function toHockeyTestOption(
  test: HockeyTestForSummary & { id: string },
  locale: AppLocale
) {
  const values = metricValuesForTest(test)
  const metrics = localizedHockeyMetrics(locale)
    .map((metric) => {
      const value = values[metric.key]
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return {
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        value,
        lowerIsBetter: metric.lowerIsBetter,
      }
    })
    .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))

  return {
    id: test.id,
    testDate: test.testDate,
    label: test.testDate.toISOString(),
    metricCount: metrics.length,
    metrics,
  }
}

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
  searchParams?: Promise<{
    source?: string
    prompt?: string
    clientId?: string
    teamId?: string
  }>
}

export default async function BusinessNewProgramPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const query = await searchParams
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.programNew')
  const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const teamFilter = await getAccessibleTeamWhere(user.id, businessSlug)

  // Fetch ALL clients with their tests AND sport profiles
  const clients = await prisma.client.findMany({
    where: {
      userId: { in: coachIds },
      businessId: membership.businessId,
    },
    include: {
      tests: {
        where: {
          trainingZones: {
            not: Prisma.DbNull,
          },
        },
        orderBy: {
          testDate: 'desc',
        },
        take: 5, // Latest 5 tests per client
        select: {
          id: true,
          testDate: true,
          testType: true,
          vo2max: true,
          qualityReviewStatus: true,
          qualityWarnings: true,
        },
      },
      hockeyPhysicalTests: {
        orderBy: {
          testDate: 'desc',
        },
        take: 5,
        select: hockeyTestSelect,
      },
      coachAlerts: {
        where: {
          alertType: 'PAIN_MENTION',
          status: { in: ['RESOLVED', 'ACTIONED', 'SNOOZED'] },
        },
        orderBy: [
          { resolvedAt: 'desc' },
          { actionedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 5,
        select: {
          status: true,
          message: true,
          resolutionOutcome: true,
          actionNote: true,
          followUpAt: true,
          resolvedAt: true,
          actionedAt: true,
          createdAt: true,
        },
      },
      // Fetch sport profile for PROFILE data source
      sportProfile: {
        select: {
          primarySport: true,
          cyclingSettings: true,
          swimmingSettings: true,
          runningSettings: true,
          skiingSettings: true,
          hockeySettings: true,
          footballSettings: true,
          basketballSettings: true,
          handballSettings: true,
          floorballSettings: true,
          volleyballSettings: true,
          tennisSettings: true,
          padelSettings: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  const teams = await prisma.team.findMany({
    where: teamFilter,
    select: {
      id: true,
      name: true,
      sportType: true,
      members: {
        where: {
          businessId: membership.businessId,
        },
        select: {
          id: true,
          name: true,
          position: true,
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  const wizardClients = clients.map((client) => ({
    id: client.id,
    name: client.name,
    teamId: client.teamId,
    position: client.position,
    tests: client.tests,
    hockeyTests: client.hockeyPhysicalTests.map((test) => toHockeyTestOption(test, locale)),
    painFollowUps: client.coachAlerts,
    sportProfile: client.sportProfile,
  }))

  // No clients at all
  if (clients.length === 0) {
    return (
      <RolePageFrame contentClassName="max-w-2xl">
        <RolePageHeader
          eyebrow="Coach"
          title={t('title')}
          description={t('description')}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}/programs`}>
                <ArrowLeft className="h-4 w-4" />
                {t('back')}
              </Link>
            </Button>
          }
        />

        <RolePanel className="border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/20">
          <h2 className="mb-2 text-xl font-semibold text-amber-800 dark:text-amber-200">{t('noClientsTitle')}</h2>
          <p className="mb-4 text-amber-700 dark:text-amber-200/80">
            {t('noClientsDescription')}
          </p>
          <Button asChild>
            <Link href={`${basePath}/clients/new`}>{t('createClient')}</Link>
          </Button>
        </RolePanel>
      </RolePageFrame>
    )
  }

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Coach"
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/programs`}>
              <ArrowLeft className="h-4 w-4" />
              {t('backToPrograms')}
            </Link>
          </Button>
        }
      />

      {query?.source === 'AI Canvas' && (
        <RolePanel className="mb-6 border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
          <p className="text-sm font-semibold">{t('aiCanvas.title')}</p>
          <p className="mt-1 text-sm leading-6">
            {t('aiCanvas.description')}
          </p>
          {query.prompt && (
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-blue-900">
              {query.prompt}
            </p>
          )}
        </RolePanel>
      )}

      <ProgramWizard
        clients={wizardClients as unknown as ProgramWizardClients}
        teams={teams as unknown as ProgramWizardTeams}
        basePath={basePath}
        initialClientId={query?.clientId}
        initialTeamId={query?.teamId}
      />
    </RolePageFrame>
  )
}
