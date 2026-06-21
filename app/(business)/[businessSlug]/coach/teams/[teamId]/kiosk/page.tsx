import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { TeamKioskClient } from '@/components/coach/teams/TeamKioskClient'

interface TeamKioskPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
  searchParams: Promise<{
    date?: string
  }>
}

export default async function TeamKioskPage({ params, searchParams }: TeamKioskPageProps) {
  const { businessSlug, teamId } = await params
  const query = await searchParams
  const user = await requireCoach()
  const locale = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) {
    notFound()
  }

  return (
    <TeamKioskClient
      teamId={teamId}
      teamName={team.name}
      businessSlug={businessSlug}
      locale={locale}
      initialDate={query.date}
    />
  )
}
