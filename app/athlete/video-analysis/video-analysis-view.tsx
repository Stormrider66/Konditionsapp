// app/athlete/video-analysis/video-analysis-view.tsx
//
// Shared video-analysis page rendered by BOTH the solo route
// (app/athlete/video-analysis) and the business route
// (app/(business)/[businessSlug]/athlete/video-analysis).
// Auth is resolved by the page wrappers.
import Link from 'next/link'
import { ArrowLeft, Video } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import { normalizeStoragePath, isHttpUrl } from '@/lib/storage/supabase-storage'
import { createSignedUrl } from '@/lib/storage/supabase-storage-server'

import { AthleteVideoUploader } from '@/components/athlete/video/AthleteVideoUploader'
import { VideoAnalysisDetailCard, AIPoseAnalysis } from '@/components/athlete/video/VideoAnalysisDetailCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/i18n/server'

type VideoAnalysisRow = {
  id: string
  createdAt: Date
  videoUrl: string | null
  videoType: string | null
  cameraAngle: string | null
  formScore: number | null
  aiAnalysis: string | null
  aiPoseAnalysis: unknown | null
  status: string
  exercise: { name: string; nameSv: string | null; nameEn: string | null } | null
}

type VideoAnalysisWithVideo = Omit<VideoAnalysisRow, 'videoUrl'> & {
  videoUrl: string | null
  videoError?: string | null
}

export interface AthleteVideoAnalysisViewProps {
  clientId: string
  /** Empty for solo athletes; the business slug path prefix otherwise. */
  basePath: string
}

export async function AthleteVideoAnalysisView({ clientId, basePath }: AthleteVideoAnalysisViewProps) {
  const t = await getTranslations('athletePages.videoAnalysis')
  // Prisma typings can appear stale locally (especially on Windows) if `prisma generate` didn't fully run.
  // Calling through `any` avoids TS false-positives about select fields/relations.
  const videoAnalyses = (await (prisma as any).videoAnalysis.findMany({
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
        select: { name: true, nameSv: true, nameEn: true },
      },
    },
  })) as VideoAnalysisRow[]

  // Generate signed URLs for video access (Supabase storage requires signed URLs for private buckets)
  const analysesWithSignedUrls: VideoAnalysisWithVideo[] = await Promise.all(
    videoAnalyses.map(async (analysis): Promise<VideoAnalysisWithVideo> => {
      // Guard: if videoUrl is null/empty, return early with error message
      if (!analysis.videoUrl) {
        return {
          ...analysis,
          videoUrl: null,
          videoError: t('errors.missingVideo'),
        }
      }

      const path = normalizeStoragePath('video-analysis', analysis.videoUrl)

      if (!path) {
        // normalizeStoragePath returns null for HTTP URLs it can't extract a path from.
        // This could be a valid signed URL OR a malformed legacy URL.
        if (isHttpUrl(analysis.videoUrl)) {
          // Validate signed URL: must have token= parameter in query string
          // Supabase signed URLs always include ?token=... or &token=...
          try {
            const url = new URL(analysis.videoUrl)
            const hasToken = url.searchParams.has('token')
            if (hasToken) {
              // Valid signed URL with token parameter - pass through
              return { ...analysis, videoUrl: analysis.videoUrl }
            }
          } catch {
            // Invalid URL format - fall through to error
          }
          // HTTP URL without valid token parameter - treat as error
          console.warn('Unrecognized video URL format (missing token):', analysis.videoUrl)
          return {
            ...analysis,
            videoUrl: null,
            videoError: t('errors.invalidUrl'),
          }
        }
        // Non-HTTP, non-path value - shouldn't happen, but treat as error
        return {
          ...analysis,
          videoUrl: null,
          videoError: t('errors.missingVideo'),
        }
      }

      try {
        const signedUrl = await createSignedUrl('video-analysis', path, 60 * 60) // 1 hour expiry
        return { ...analysis, videoUrl: signedUrl }
      } catch (error) {
        // IMPORTANT: Never fall back to returning the raw storage path for private buckets,
        // because the video player cannot load it and the UI would fail silently.
        console.error('Failed to create signed URL for video:', error)
        return {
          ...analysis,
          videoUrl: null,
          videoError: t('errors.accessDenied'),
        }
      }
    })
  )

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t('backToDashboard')}
          </Button>
        </Link>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
            <Video className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold italic uppercase tracking-tight leading-none mb-1 text-slate-900 dark:text-white transition-colors">{t('title')}</h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">{t('description')}</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('upload.title')}</CardTitle>
          <CardDescription>
            {t('upload.description')}
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
            <CardTitle>{t('recent.title')}</CardTitle>
            <CardDescription>{t('recent.description')}</CardDescription>
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
                    videoError: analysis.videoError ?? null,
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
