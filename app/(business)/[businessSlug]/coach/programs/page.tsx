// app/(business)/[businessSlug]/coach/programs/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { isPlatformAdmin } from '@/lib/subscription/require-feature-access'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusIcon, Upload } from 'lucide-react'
import { ProgramsList } from '@/components/programs/ProgramsList'
import { getTranslations } from '@/i18n/server'

type ProgramsListPrograms = Parameters<typeof ProgramsList>[0]['programs']

interface BusinessCoachProgramsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachProgramsPage({ params }: BusinessCoachProgramsPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.programs')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

  // Fetch all programs for athletes in this active business. A coach may belong
  // to multiple businesses, so client.businessId is the tenant boundary.
  const programs = await prisma.trainingProgram.findMany({
    where: {
      coachId: { in: coachIds },
      client: {
        businessId: membership.businessId,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      test: {
        select: {
          id: true,
          testDate: true,
          testType: true,
        },
      },
      weeks: {
        select: {
          id: true,
          weekNumber: true,
          phase: true,
        },
        orderBy: {
          weekNumber: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })

  // Platform admins bypass all subscription gates; maxAthletes === -1 is
  // "unlimited" (ENTERPRISE) and must not be treated as a numeric ceiling.
  const isAdmin = await isPlatformAdmin(user.id)
  const canCreateMore = isAdmin
    || !subscription
    || subscription.maxAthletes === -1
    || subscription.currentAthletes < subscription.maxAthletes

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Link href={`${basePath}/coach/programs/import`}>
            <Button
              size="lg"
              variant="outline"
              disabled={!canCreateMore}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-5 w-5" />
              {t('importProgram')}
            </Button>
          </Link>
          <Link href={`${basePath}/coach/programs/new`}>
            <Button size="lg" disabled={!canCreateMore} className="w-full sm:w-auto">
              <PlusIcon className="mr-2 h-5 w-5" />
              {t('createNew')}
            </Button>
          </Link>
        </div>
      </div>

      {!canCreateMore && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('athleteLimitReached')}
          </p>
        </div>
      )}

      <ProgramsList programs={programs as unknown as ProgramsListPrograms} />
    </div>
  )
}
