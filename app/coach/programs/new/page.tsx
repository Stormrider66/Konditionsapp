// app/coach/programs/new/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ProgramWizard } from '@/components/programs/wizard/ProgramWizard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function NewProgramPage() {
  // Require coach authentication
  const user = await requireCoach()

  // Fetch ALL clients with their tests AND sport profiles
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
      // Fetch sport profile for PROFILE data source
      sportProfile: {
        select: {
          primarySport: true,
          cyclingSettings: true,
          swimmingSettings: true,
          runningSettings: true,
          skiingSettings: true,
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/coach/programs">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Skapa träningsprogram</h1>
        <p className="text-muted-foreground">
          Välj sport, mål och datakälla för att generera ett personligt program
        </p>
      </div>

      <ProgramWizard clients={clients as any} />
    </div>
  )
}
