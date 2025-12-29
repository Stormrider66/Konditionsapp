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
      {videoAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dina videoanalyser</CardTitle>
            <CardDescription>
              Klicka på en analys för att se detaljerad feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videoAnalyses.map((analysis) => (
                <VideoAnalysisDetailCard
                  key={analysis.id}
                  analysis={{
                    id: analysis.id,
                    createdAt: analysis.createdAt,
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
