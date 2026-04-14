// app/coach/settings/athlete-dashboards/page.tsx
// Legacy route — picks the coach's first active business membership.
// In practice users are redirected to business-scoped routes via middleware,
// but we keep this fallback so direct hits work.

import { redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import AthleteDashboardTemplatesClient from './AthleteDashboardTemplatesClient'

export default async function CoachAthleteDashboardTemplatesPage() {
  const user = await requireCoach()

  const membership = await prisma.businessMember.findFirst({
    where: { userId: user.id, isActive: true },
    select: { businessId: true, business: { select: { slug: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership) {
    redirect('/coach/dashboard')
  }

  return <AthleteDashboardTemplatesClient businessId={membership.businessId} />
}
