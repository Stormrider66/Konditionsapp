// app/coach/programs/generate/page.tsx
import { redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ProgramGenerationForm } from '@/components/programs/ProgramGenerationForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function GenerateProgramPage() {
  // Require coach authentication
  const user = await requireCoach()

  // Fetch clients with their tests
  const clients = await prisma.client.findMany({
    where: {
      userId: user.id,
    },
    include: {
      tests: {
        where: {
          trainingZones: {
            not: Prisma.DbNull,
          },
        },
        orderBy: {
          testDate: 'desc',
        },
        take: 5, // Latest 5 tests per client
        select: {
          id: true,
          testDate: true,
          testType: true,
          vo2max: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Filter clients that have at least one test with training zones
  const clientsWithTests = clients.filter((c) => c.tests.length > 0)

  if (clientsWithTests.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Link href="/coach/programs">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>
        </Link>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Inga testresultat tillgängliga</h2>
          <p className="text-muted-foreground mb-4">
            För att skapa ett träningsprogram behöver du först ha genomfört och
            beräknat träningszoner för minst ett konditionstest.
          </p>
          <Link href="/test">
            <Button>Skapa test</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href="/coach/programs">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Skapa träningsprogram</h1>
        <p className="text-muted-foreground">
          Generera ett personligt träningsprogram baserat på testresultat
        </p>
      </div>

      <ProgramGenerationForm clients={clientsWithTests as any} />
    </div>
  )
}
