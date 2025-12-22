// app/athlete/body-composition/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete, getAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Scale } from 'lucide-react'
import Link from 'next/link'

export default async function AthleteBodyCompositionPage() {
  const user = await requireAthlete()

  const clientId = await getAthleteClientId(user.id)

  if (!clientId) {
    redirect('/login')
  }

  // Get client name for display
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  })

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/athlete/profile?tab=body">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till profil
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Scale className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ny kroppssammansättningsmätning</h1>
            <p className="text-muted-foreground text-sm">
              Registrera dina bioimpedansmätningar
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Mätningsdata</CardTitle>
          <CardDescription>
            Fyll i värden från din bioimpedansvåg. Du behöver inte fylla i alla fält.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BioimpedanceForm
            clientId={clientId}
            clientName={client?.name}
          />
        </CardContent>
      </Card>
    </div>
  )
}
