// app/coach/programs/page.tsx
import { redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { ProgramsList } from '@/components/programs/ProgramsList'

export default async function CoachProgramsPage() {
  // Require coach authentication
  const user = await requireCoach()

  // Fetch all programs for this coach
  const programs = await prisma.trainingProgram.findMany({
    where: {
      coachId: user.id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      test: {
        select: {
          id: true,
          testDate: true,
          testType: true,
        },
      },
      weeks: {
        select: {
          id: true,
          weekNumber: true,
          phase: true,
        },
        orderBy: {
          weekNumber: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get subscription info to check if user can create more programs
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })

  const canCreateMore = subscription
    ? subscription.currentAthletes < subscription.maxAthletes
    : true

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Träningsprogram</h1>
          <p className="text-muted-foreground">
            Hantera och skapa träningsprogram för dina atleter
          </p>
        </div>
        <Link href="/coach/programs/generate">
          <Button size="lg" disabled={!canCreateMore}>
            <PlusIcon className="mr-2 h-5 w-5" />
            Skapa nytt program
          </Button>
        </Link>
      </div>

      {!canCreateMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Du har nått gränsen för antalet atleter i din prenumeration.
            Uppgradera för att skapa fler program.
          </p>
        </div>
      )}

      <ProgramsList programs={programs as any} />
    </div>
  )
}
