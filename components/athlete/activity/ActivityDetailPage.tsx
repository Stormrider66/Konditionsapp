import { notFound } from 'next/navigation'

import { ActivityDetailClient } from '@/components/athlete/activity/ActivityDetailClient'
import { buildActivityDetail } from '@/lib/activity-detail/build-detail'
import { isActivityDetailSource } from '@/lib/activity-detail/types'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getLocale } from '@/i18n/server'

interface ActivityDetailPageProps {
  source: string
  id: string
  basePath?: string
}

export async function ActivityDetailPage({ source, id, basePath = '' }: ActivityDetailPageProps) {
  if (!isActivityDetailSource(source)) {
    notFound()
  }

  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const locale = await getLocale()

  // Resolve the athlete's User.id — WorkoutLog.athleteId references User, not Client.
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { athleteAccount: { select: { userId: true } } },
  })

  const detail = await buildActivityDetail({
    source,
    id,
    clientId,
    athleteUserId: client?.athleteAccount?.userId ?? null,
  })

  if (!detail) {
    notFound()
  }

  return <ActivityDetailClient activity={detail} basePath={basePath} locale={locale} />
}
