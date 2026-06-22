import { ActivityDetailPage } from '@/components/athlete/activity/ActivityDetailPage'

interface AthleteActivityDetailPageProps {
  params: Promise<{ source: string; id: string }>
}

export default async function AthleteActivityDetailPage({ params }: AthleteActivityDetailPageProps) {
  const { source, id } = await params

  return <ActivityDetailPage source={source} id={id} />
}
