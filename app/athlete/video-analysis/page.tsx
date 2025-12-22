// app/athlete/video-analysis/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete, getAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AthleteVideoUploader } from '@/components/athlete/video/AthleteVideoUploader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Video } from 'lucide-react'
import Link from 'next/link'

export default async function AthleteVideoAnalysisPage() {
  const user = await requireAthlete()

  const clientId = await getAthleteClientId(user.id)

  if (!clientId) {
    redirect('/login')
  }

  // Get client info and existing analyses
  const [client, videoAnalyses] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    }),
    prisma.videoAnalysis.findMany({
      where: { athleteId: clientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
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
            <CardTitle>Senaste analyser</CardTitle>
            <CardDescription>
              Dina senaste videoanalyser och feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {videoAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.createdAt).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.formScore !== null && (
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        analysis.formScore >= 80 ? 'bg-green-100 text-green-800' :
                        analysis.formScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {analysis.formScore}/100
                      </span>
                    )}
                    {analysis.aiAnalysis ? (
                      <span className="text-xs text-green-600">Analyserad</span>
                    ) : (
                      <span className="text-xs text-gray-500">Vantar pa analys</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
