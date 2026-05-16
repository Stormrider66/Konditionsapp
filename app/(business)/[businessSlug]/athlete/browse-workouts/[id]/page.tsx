import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { WorkoutTemplateDetailClient } from '@/components/athlete/browse-workouts/WorkoutTemplateDetailClient'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('athletePages.workoutDetail')
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function WorkoutTemplateDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const resolved = await requireAthleteOrCoachInAthleteMode()
  const membership = await validateBusinessMembership(resolved.user.id, businessSlug)
  if (!membership) return notFound()

  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      favorites: {
        where: { userId: resolved.user.id },
        select: { id: true },
      },
    },
  })

  if (!template) return notFound()

  const { favorites, ...rest } = template

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <WorkoutTemplateDetailClient
        template={{
          ...rest,
          sections: rest.sections as { type: string; label: string; exercises: { name: string; nameSv: string; sets?: number; reps?: number | string; duration?: number; rest?: number; weight?: string; notes?: string }[] }[],
          isFavorite: favorites.length > 0,
        }}
      />
    </div>
  )
}
