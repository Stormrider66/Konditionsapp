import { RaceFuelingPlanDetail } from '@/components/athlete/fueling/RaceFuelingPlanDetail'

interface AthleteFuelingPlanPageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteFuelingPlanPage({ params }: AthleteFuelingPlanPageProps) {
  const { id } = await params
  return <RaceFuelingPlanDetail planId={id} backHref="/athlete/dashboard" />
}
