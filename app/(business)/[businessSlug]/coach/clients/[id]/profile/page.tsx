import { CoachAthleteProfilePage } from '@/components/coach/clients/AthleteProfilePage'

interface PageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
  searchParams: Promise<{ tab?: string }>
}

export default async function BusinessAthleteProfileRoute({ params, searchParams }: PageProps) {
  const { businessSlug, id } = await params
  const { tab } = await searchParams

  return <CoachAthleteProfilePage id={id} tab={tab} basePath={`/${businessSlug}`} />
}

export const dynamic = 'force-dynamic'
