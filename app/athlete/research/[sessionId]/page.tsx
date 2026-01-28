import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { SharedResearchView } from '@/components/athlete/SharedResearchView'

export const metadata = {
  title: 'Research Report | Athlete Portal',
  description: 'View shared research report',
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function AthleteResearchViewPage({ params }: PageProps) {
  const basePath = '' // Standard athlete route
  const { sessionId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <SharedResearchView sessionId={sessionId} basePath={basePath} />
}
