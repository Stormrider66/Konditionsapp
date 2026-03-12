import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { WorkoutTemplateDetailClient } from '@/components/athlete/browse-workouts/WorkoutTemplateDetailClient'

export const metadata = {
  title: 'Pass | Athlete',
  description: 'Detaljer för träningspass',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkoutTemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const resolved = await requireAthleteOrCoachInAthleteMode()

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
