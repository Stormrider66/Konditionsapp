// app/(business)/[businessSlug]/coach/video-analysis/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { VideoAnalysisList } from '@/components/coach/video-analysis/VideoAnalysisList'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessVideoAnalysisPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <VideoAnalysisList />
    </div>
  )
}
