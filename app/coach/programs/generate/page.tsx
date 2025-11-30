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

  // Fetch ALL clients with their tests (tests are optional for CUSTOM methodology)
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
      // Also fetch sport profile for context
      sportProfile: {
        select: {
          primarySport: true,
          onboardingCompleted: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  // No clients at all
  if (clients.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Link href="/coach/programs">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>
        </Link>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Inga klienter tillgängliga</h2>
          <p className="text-muted-foreground mb-4">
            Du behöver skapa en klient innan du kan skapa ett träningsprogram.
          </p>
          <Link href="/clients/new">
            <Button>Skapa klient</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Check if any clients have tests (for info display)
  const clientsWithTests = clients.filter((c) => c.tests.length > 0)
  const hasClientsWithTests = clientsWithTests.length > 0

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
          Generera ett personligt träningsprogram baserat på testresultat, eller skapa ett anpassat program manuellt
        </p>
      </div>

      {!hasClientsWithTests && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Tips:</strong> Ingen av dina klienter har genomförda tester med träningszoner.
            Välj &quot;Custom&quot; som metodik för att skapa ett tomt program och lägga till pass manuellt.
          </p>
        </div>
      )}

      <ProgramGenerationForm clients={clients as any} />
    </div>
  )
}
