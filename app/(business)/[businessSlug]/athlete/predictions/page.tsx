// app/(business)/[businessSlug]/athlete/predictions/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RacePredictionWidget } from '@/components/athlete/RacePredictionWidget'
import { RaceEquivalentCalculator } from '@/components/athlete/RaceEquivalentCalculator'

export const metadata = {
  title: 'Tävlingsprediktioner',
}

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  // Fetch current VDOT from athlete profile
  let currentVDOT: number | undefined
  if (clientId) {
    const profile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: { currentVDOT: true },
    })
    currentVDOT = profile?.currentVDOT ?? undefined
  }

  const basePath = `/${businessSlug}`

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Link href={`${basePath}/athlete/dashboard`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tävlingsprediktioner</h1>
        <p className="text-muted-foreground">
          Se dina predicerade tider och räkna ut ekvivalenter mellan distanser
        </p>
      </div>

      <div className="space-y-6">
        {/* Current predictions based on training data */}
        <RacePredictionWidget clientId={clientId} />

        {/* Interactive what-if calculator */}
        <RaceEquivalentCalculator currentVDOT={currentVDOT} />
      </div>
    </div>
  )
}
