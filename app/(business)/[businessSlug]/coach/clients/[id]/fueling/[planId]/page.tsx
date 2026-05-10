import { RaceFuelingPlanDetail } from '@/components/athlete/fueling/RaceFuelingPlanDetail'

interface CoachClientFuelingPlanDetailPageProps {
  params: Promise<{ businessSlug: string; id: string; planId: string }>
}

export default async function CoachClientFuelingPlanDetailPage({ params }: CoachClientFuelingPlanDetailPageProps) {
  const { businessSlug, id, planId } = await params

  return (
    <RaceFuelingPlanDetail
      planId={planId}
      backHref={`/${businessSlug}/coach/clients/${id}/fueling`}
      noteMode="coach"
    />
  )
}
