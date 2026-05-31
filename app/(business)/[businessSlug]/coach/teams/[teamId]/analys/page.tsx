import { redirect } from 'next/navigation'

interface TeamAnalysisHubPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

// The Analys area now uses a sub-tab nav (Träning / Test / Multivariat) rendered
// on each sub-page, so the old card hub is redundant — land on Training.
export default async function TeamAnalysisHubPage({ params }: TeamAnalysisHubPageProps) {
  const { businessSlug, teamId } = await params
  redirect(`/${businessSlug}/coach/teams/${teamId}/analysis`)
}
