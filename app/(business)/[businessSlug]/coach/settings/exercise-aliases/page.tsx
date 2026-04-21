// app/(business)/[businessSlug]/coach/settings/exercise-aliases/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ExerciseAliasesClient } from '@/components/programs/import/ExerciseAliasesClient'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function ExerciseAliasesPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href={`${basePath}/settings`}>
        <Button
          variant="ghost"
          className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till inställningar
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
          Övningskopplingar
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          När du kopplar ett importerat övningsnamn till rätt övning i
          biblioteket sparas det här så att framtida importer känner igen samma
          namn automatiskt. Rensa kopplingar du inte längre vill använda.
        </p>
      </div>

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
    </div>
  )
}
