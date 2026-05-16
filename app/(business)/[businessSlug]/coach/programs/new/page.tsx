// app/(business)/[businessSlug]/coach/programs/new/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ProgramWizard } from '@/components/programs/wizard/ProgramWizard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

type ProgramWizardClients = Parameters<typeof ProgramWizard>[0]['clients']

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
  searchParams?: Promise<{
    source?: string
    prompt?: string
    clientId?: string
  }>
}

export default async function BusinessNewProgramPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const query = await searchParams
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.programNew')

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

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
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  // No clients at all
  if (clients.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Link href={`${basePath}/programs`}>
          <Button variant="ghost" className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
        </Link>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-yellow-800 dark:text-yellow-200">{t('noClientsTitle')}</h2>
          <p className="text-yellow-700 dark:text-yellow-200/80 mb-4">
            {t('noClientsDescription')}
          </p>
          <Link href={`${basePath}/clients/new`}>
            <Button>{t('createClient')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={`${basePath}/programs`}>
        <Button variant="ghost" className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToPrograms')}
        </Button>
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('description')}
        </p>
      </div>

      {query?.source === 'AI Canvas' && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
          <p className="text-sm font-semibold">{t('aiCanvas.title')}</p>
          <p className="mt-1 text-sm leading-6">
            {t('aiCanvas.description')}
          </p>
          {query.prompt && (
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-blue-900">
              {query.prompt}
            </p>
          )}
        </div>
      )}

      <ProgramWizard clients={clients as unknown as ProgramWizardClients} basePath={basePath} />
    </div>
  )
}
