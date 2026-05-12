import { RaceFuelingPlanDetail } from '@/components/athlete/fueling/RaceFuelingPlanDetail'

interface BusinessAthleteFuelingPlanPageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessAthleteFuelingPlanPage({ params }: BusinessAthleteFuelingPlanPageProps) {
  const { businessSlug, id } = await params
  return <RaceFuelingPlanDetail planId={id} backHref={`/${businessSlug}/athlete/fueling`} />
}
