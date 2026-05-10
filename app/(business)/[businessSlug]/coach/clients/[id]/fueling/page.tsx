import { RaceFuelingPlanList } from '@/components/athlete/fueling/RaceFuelingPlanList'

interface CoachClientFuelingPlansPageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function CoachClientFuelingPlansPage({ params }: CoachClientFuelingPlansPageProps) {
  const { businessSlug, id } = await params
  const detailBasePath = `/${businessSlug}/coach/clients/${id}/fueling`

  return (
    <RaceFuelingPlanList
      clientId={id}
      detailBasePath={detailBasePath}
    />
  )
}
