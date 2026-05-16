import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { TeamCalendarView } from '@/components/coach/team-calendar/TeamCalendarView'
import { ManageAssistantsDialog } from '@/components/coach/team-calendar/ManageAssistantsDialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamCalendarPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamCalendar')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)

  if (!team) notFound()

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${businessSlug}/coach/teams`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              {t('title', { teamName: team.name })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>
        <ManageAssistantsDialog teamId={team.id} teamName={team.name} />
      </div>

      <TeamCalendarView
        teamId={team.id}
        teamName={team.name}
        businessSlug={businessSlug}
      />
    </div>
  )
}
