// app/athlete/video-analysis/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete, getAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AthleteVideoUploader } from '@/components/athlete/video/AthleteVideoUploader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Video } from 'lucide-react'
import Link from 'next/link'
import { VideoAnalysisDetailCard, AIPoseAnalysis } from '@/components/athlete/video/VideoAnalysisDetailCard'
import { createSignedUrl, normalizeStoragePath } from '@/lib/storage/supabase-storage'

export default async function AthleteVideoAnalysisPage() {
  const user = await requireAthlete()

  const clientId = await getAthleteClientId(user.id)

  if (!clientId) {
    redirect('/login')
  }

  // Get client info and existing analyses with AI pose analysis
  const [client, videoAnalyses] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    }),
    prisma.videoAnalysis.findMany({
      where: { athleteId: clientId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        videoUrl: true,
        videoType: true,
        cameraAngle: true,
        formScore: true,
        aiAnalysis: true,
        aiPoseAnalysis: true,
        status: true,
        exercise: {
          select: { name: true, nameSv: true },
        },
      },
    }),
  ])

  // Generate signed URLs for video access (Supabase storage requires signed URLs for private buckets)
  const analysesWithSignedUrls = await Promise.all(
    videoAnalyses.map(async (analysis) => {
      const path = normalizeStoragePath('video-analysis', analysis.videoUrl)
      if (!path) return analysis
      try {
        const signedUrl = await createSignedUrl('video-analysis', path, 60 * 60) // 1 hour expiry
        return { ...analysis, videoUrl: signedUrl }
      } catch (error) {
        console.error('Failed to create signed URL for video:', error)
        return analysis
      }
    })
  )

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/athlete/profile?tab=technique">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till profil
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Video className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ladda upp video</h1>
            <p className="text-muted-foreground text-sm">
              Ladda upp en video av din teknik for analys
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ny videoanalys</CardTitle>
          <CardDescription>
            Ladda upp en video av din lopstil, lyft eller annan teknik. Din coach kommer att
            analysera videon och ge feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AthleteVideoUploader clientId={clientId} />
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      {analysesWithSignedUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dina videoanalyser</CardTitle>
            <CardDescription>
              Klicka på en analys för att se detaljerad feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysesWithSignedUrls.map((analysis) => (
                <VideoAnalysisDetailCard
                  key={analysis.id}
                  analysis={{
                    id: analysis.id,
                    createdAt: analysis.createdAt,
                    videoUrl: analysis.videoUrl,
                    videoType: analysis.videoType,
                    cameraAngle: analysis.cameraAngle,
                    formScore: analysis.formScore,
                    aiAnalysis: analysis.aiAnalysis,
                    aiPoseAnalysis: analysis.aiPoseAnalysis as AIPoseAnalysis | null,
                    status: analysis.status,
                    exercise: analysis.exercise,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
