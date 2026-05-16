// app/(business)/[businessSlug]/coach/athletes/[id]/calendar/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { UnifiedCalendar } from '@/components/calendar'
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
    },
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href={`${basePath}/coach/clients/${client.id}`}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAthlete', { athleteName: client.name })}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('title', { athleteName: client.name })}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
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
