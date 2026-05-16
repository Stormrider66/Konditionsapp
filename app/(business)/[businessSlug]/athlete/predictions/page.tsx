// app/(business)/[businessSlug]/athlete/predictions/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RacePredictionWidget } from '@/components/athlete/RacePredictionWidget'
import { RaceEquivalentCalculator } from '@/components/athlete/RaceEquivalentCalculator'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('athletePages.predictions')
  return {
    title: t('metadataTitle'),
  }
}

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('athletePages.predictions')

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
          {t('backToDashboard')}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
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
