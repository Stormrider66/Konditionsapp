// app/(business)/[businessSlug]/coach/athletes/[id]/calendar/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserRound } from 'lucide-react'
import { UnifiedCalendar } from '@/components/calendar'
import { AthletePlanStaffNoteCard } from '@/components/coach/player-notes/AthletePlanStaffNoteCard'
import { PlayerStaffNotesPanel } from '@/components/coach/player-notes/PlayerStaffNotesPanel'
import { getTranslations } from '@/i18n/server'

interface BusinessAthleteCalendarPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessAthleteCalendarPage({
  params,
}: BusinessAthleteCalendarPageProps) {
  const { businessSlug, id } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.athleteCalendar')

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Scope client access by role: OWNER/ADMIN see all, COACH sees own
  const scopedIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

  // Fetch client and verify it belongs to a scoped coach
  const client = await prisma.client.findFirst({
    where: {
      id,
      userId: { in: scopedIds },
      businessId: membership.businessId,
    },
    select: {
      id: true,
      name: true,
      teamId: true,
    },
  })

  if (!client) {
    notFound()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeAthletePlan = await prisma.athletePlan.findFirst({
    where: {
      clientId: client.id,
      status: 'ACTIVE',
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: {
      id: true,
      clientId: true,
      coachId: true,
      name: true,
      description: true,
      status: true,
      staffPlanNote: true,
      staffPlanNoteVisibleToAthlete: true,
      staffPlanNoteUpdatedAt: true,
      staffPlanNoteAuthorId: true,
      staffPlanNoteAuthor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      startDate: true,
      endDate: true,
      blocks: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          focus: true,
          description: true,
          order: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`${basePath}/coach/clients/${client.id}`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToAthlete', { athleteName: client.name })}
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">{t('title', { athleteName: client.name })}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/coach/clients/${client.id}`}>
            <UserRound className="h-4 w-4 mr-2" />
            {t('viewProfile')}
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <PlayerStaffNotesPanel
          clientId={client.id}
          businessSlug={businessSlug}
          teamId={client.teamId ?? undefined}
          variant="compact"
          limit={3}
        />
        {activeAthletePlan && (
          <AthletePlanStaffNoteCard
            clientId={client.id}
            businessSlug={businessSlug}
            plan={activeAthletePlan}
            compact
          />
        )}
      </div>

      <UnifiedCalendar
        clientId={client.id}
        clientName={client.name}
        isCoachView={true}
        businessSlug={businessSlug}
      />
    </div>
  )
}
