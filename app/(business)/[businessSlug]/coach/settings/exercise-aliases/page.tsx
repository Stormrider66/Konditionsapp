// app/(business)/[businessSlug]/coach/settings/exercise-aliases/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ExerciseAliasesClient } from '@/components/programs/import/ExerciseAliasesClient'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function ExerciseAliasesPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.exerciseAliases')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const basePath = `/${businessSlug}/coach`

  // Fetch once server-side so the page is useful even on slow connections.
  // Client component still refetches after any mutation.
  const initialAliases = await prisma.exerciseNameAlias.findMany({
    where: { coachId: user.id },
    select: {
      id: true,
      alias: true,
      createdAt: true,
      exerciseId: true,
      exercise: {
        select: {
          id: true,
          name: true,
          category: true,
          biomechanicalPillar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow="Settings"
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/settings`}>
              <ArrowLeft className="h-4 w-4" />
              {t('backToSettings')}
            </Link>
          </Button>
        }
      />

      <ExerciseAliasesClient
        initialAliases={initialAliases.map((a) => ({
          id: a.id,
          alias: a.alias,
          createdAt: a.createdAt.toISOString(),
          exerciseId: a.exerciseId,
          exerciseName: a.exercise.name,
          category: a.exercise.category,
          biomechanicalPillar: a.exercise.biomechanicalPillar,
        }))}
      />
    </RolePageFrame>
  )
}
