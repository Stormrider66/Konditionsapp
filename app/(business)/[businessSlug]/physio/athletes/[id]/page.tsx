import { PhysioAthleteDetail } from '@/components/physio/PhysioAthleteDetail'

interface PageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessPhysioAthleteDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params

  return <PhysioAthleteDetail athleteId={id} basePath={`/${businessSlug}/physio`} />
}
