import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
  searchParams: Promise<{ tab?: string }>
}

const PROFILE_TAB_ALIASES: Record<string, string> = {
  physiology: 'development',
  performance: 'development',
  technique: 'development',
  hockey: 'development',
  football: 'development',
  training: 'planning',
  readiness: 'overview',
  health: 'profile',
  body: 'body',
  composition: 'body',
  goals: 'profile',
}

export default async function BusinessAthleteProfileRoute({ params, searchParams }: PageProps) {
  const { businessSlug, id } = await params
  const { tab } = await searchParams
  const destinationTab = tab ? (PROFILE_TAB_ALIASES[tab] ?? 'profile') : 'profile'

  redirect(`/${businessSlug}/coach/clients/${id}?tab=${destinationTab}`)
}
