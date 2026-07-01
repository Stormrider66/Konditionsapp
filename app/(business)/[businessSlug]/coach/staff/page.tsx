import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { StaffManagement } from '@/components/coach/staff/StaffManagement'
import { Users } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function StaffPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.staff')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  // Staff/role management is a team feature. Mirror the nav, which only surfaces
  // "Personal" when the coach is in TEAM dashboard mode; also allow club-type
  // businesses. Gyms and solo PTs (PT/GYM mode) don't get the multi-role hub.
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { dashboardMode: true },
  })
  const isTeamContext = profile?.dashboardMode === 'TEAM' || membership.business.type === 'CLUB'
  if (!isTeamContext) notFound()

  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
  const teams = await prisma.team.findMany({
    where: teamWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('description')}
        </p>
      </div>

      <StaffManagement teams={teams} businessType={membership.business.type} businessSlug={businessSlug} currentUserId={user.id} />
    </div>
  )
}
