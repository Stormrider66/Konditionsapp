import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import NutritionScanPage from '@/app/athlete/nutrition/scan/page'

interface BusinessNutritionScanPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessNutritionScanPage({
  params,
}: BusinessNutritionScanPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <NutritionScanPage />
}
