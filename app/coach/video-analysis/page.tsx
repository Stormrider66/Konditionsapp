import { requireCoach } from '@/lib/auth-utils'
import { VideoAnalysisList } from '@/components/coach/video-analysis/VideoAnalysisList'

export const metadata = {
  title: 'Videoanalys | Coach',
  description: 'AI-driven videoanalys för teknikbedömning',
}

export default async function VideoAnalysisPage() {
  await requireCoach()

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <VideoAnalysisList />
    </div>
  )
}
