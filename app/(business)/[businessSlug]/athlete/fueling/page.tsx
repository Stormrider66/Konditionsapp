import { RaceFuelingPlanList } from '@/components/athlete/fueling/RaceFuelingPlanList'

interface BusinessAthleteFuelingPlansPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteFuelingPlansPage({ params }: BusinessAthleteFuelingPlansPageProps) {
  const { businessSlug } = await params
  return <RaceFuelingPlanList basePath={`/${businessSlug}`} />
}
