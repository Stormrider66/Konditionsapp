'use client'

/**
 * VideoComparisonView - Side-by-side video comparison for technique analysis
 *
 * Allows coaches and athletes to compare two videos from different dates
 * to visualize technique improvements over time.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { Play, Pause, RotateCcw, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

interface VideoAnalysis {
  id: string
  createdAt: Date | string
  formScore: number | null
  videoType: string
  videoUrl: string | null
  exercise?: {
    name: string
    nameSv: string | null
    nameEn?: string | null
  } | null
  issuesDetected?: Array<{
    issue: string
    severity: string
  }> | null
  recommendations?: Array<{
    recommendation: string
  }> | null
}

interface VideoComparisonViewProps {
  analyses: VideoAnalysis[]
  title?: string
}

type AppLocale = 'en' | 'sv'

const labels: Record<AppLocale, {
  defaultTitle: string
  notEnoughTitle: string
  notEnoughDescription: string
  description: string
  pointsImprovement: string
  points: string
  noChange: string
  before: string
  after: string
  chooseVideo: string
  noVideoSelected: string
  reset: string
  pause: string
  play: string
  syncedPlayback: string
  issuesDetected: string
  high: string
  medium: string
  low: string
  noIssues: string
  summary: string
  timePeriod: string
  days: string
  scoreChange: string
  issuesResolved: string
}> = {
  en: {
    defaultTitle: 'Video comparison',
    notEnoughTitle: 'Not enough videos',
    notEnoughDescription: 'Upload at least two video analyses to compare technique progress.',
    description: 'Compare technique from different dates to see progress',
    pointsImprovement: 'points improvement',
    points: 'points',
    noChange: 'No change',
    before: 'Before (older)',
    after: 'After (newer)',
    chooseVideo: 'Choose video',
    noVideoSelected: 'No video selected',
    reset: 'Reset',
    pause: 'Pause',
    play: 'Play',
    syncedPlayback: 'Synced playback',
    issuesDetected: 'Issues detected',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    noIssues: 'No issues detected',
    summary: 'Summary',
    timePeriod: 'Time period',
    days: 'days',
    scoreChange: 'Score change',
    issuesResolved: 'Issues resolved',
  },
  sv: {
    defaultTitle: 'Videojamforelse',
    notEnoughTitle: 'Inte tillrackligt med videor',
    notEnoughDescription: 'Ladda upp minst tva videoanalyser for att kunna jamfora teknikutveckling.',
    description: 'Jamfor teknik fran olika tidpunkter for att se utveckling',
    pointsImprovement: 'poang forbattring',
    points: 'poang',
    noChange: 'Ingen forandring',
    before: 'Fore (aldre)',
    after: 'Efter (nyare)',
    chooseVideo: 'Valj video',
    noVideoSelected: 'Ingen video vald',
    reset: 'Aterstall',
    pause: 'Pausa',
    play: 'Spela',
    syncedPlayback: 'Synkad uppspelning',
    issuesDetected: 'Problem identifierade',
    high: 'Hog',
    medium: 'Medel',
    low: 'Lag',
    noIssues: 'Inga problem identifierade',
    summary: 'Sammanfattning',
    timePeriod: 'Tidsperiod',
    days: 'dagar',
    scoreChange: 'Poangforandring',
    issuesResolved: 'Problem lost',
  },
}

export function VideoComparisonView({
  analyses,
  title,
}: VideoComparisonViewProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = labels[locale]
  const dateLocale = locale === 'sv' ? sv : enUS
  const [leftVideoId, setLeftVideoId] = useState<string | null>(null)
  const [rightVideoId, setRightVideoId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [syncPlayback, setSyncPlayback] = useState(true)

  const leftVideoRef = useRef<HTMLVideoElement>(null)
  const rightVideoRef = useRef<HTMLVideoElement>(null)

  // Sort analyses by date (oldest first for left, newest for right comparison)
  const sortedAnalyses = useMemo(() => {
    return [...analyses]
      .filter((a) => a.videoUrl)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [analyses])

  // Auto-select first and last videos for comparison
  useEffect(() => {
    if (sortedAnalyses.length >= 2 && !leftVideoId && !rightVideoId) {
      setLeftVideoId(sortedAnalyses[0].id)
      setRightVideoId(sortedAnalyses[sortedAnalyses.length - 1].id)
    }
  }, [sortedAnalyses, leftVideoId, rightVideoId])

  const leftVideo = sortedAnalyses.find((a) => a.id === leftVideoId)
  const rightVideo = sortedAnalyses.find((a) => a.id === rightVideoId)
  const getExerciseName = (analysis: VideoAnalysis) =>
    getExerciseDisplayName(analysis.exercise, locale, analysis.videoType)

  // Calculate improvement
  const improvement = useMemo(() => {
    if (!leftVideo?.formScore || !rightVideo?.formScore) return null
    return rightVideo.formScore - leftVideo.formScore
  }, [leftVideo, rightVideo])

  // Synchronized playback
  const handlePlayPause = () => {
    if (isPlaying) {
      leftVideoRef.current?.pause()
      rightVideoRef.current?.pause()
    } else {
      void leftVideoRef.current?.play()
      if (syncPlayback) {
        void rightVideoRef.current?.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    if (leftVideoRef.current) {
      leftVideoRef.current.currentTime = 0
    }
    if (rightVideoRef.current) {
      rightVideoRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  const handleVideoTimeUpdate = (source: 'left' | 'right') => {
    if (!syncPlayback) return

    const sourceRef = source === 'left' ? leftVideoRef : rightVideoRef
    const targetRef = source === 'left' ? rightVideoRef : leftVideoRef

    if (sourceRef.current && targetRef.current) {
      const timeDiff = Math.abs(sourceRef.current.currentTime - targetRef.current.currentTime)
      if (timeDiff > 0.1) {
        targetRef.current.currentTime = sourceRef.current.currentTime
      }
    }
  }

  if (sortedAnalyses.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ArrowLeftRight className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{copy.notEnoughTitle}</h3>
          <p className="text-gray-500">
            {copy.notEnoughDescription}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title ?? copy.defaultTitle}</CardTitle>
            <CardDescription>
              {copy.description}
            </CardDescription>
          </div>
          {improvement !== null && (
            <Badge
              className={
                improvement > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : improvement < 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-zinc-100 text-zinc-800'
              }
            >
              {improvement > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{improvement} {copy.pointsImprovement}
                </>
              ) : improvement < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {improvement} {copy.points}
                </>
              ) : (
                <>
                  <Minus className="h-3 w-3 mr-1" />
                  {copy.noChange}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {copy.before}
            </label>
            <Select value={leftVideoId || ''} onValueChange={setLeftVideoId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.chooseVideo} />
              </SelectTrigger>
              <SelectContent>
                {sortedAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {format(new Date(analysis.createdAt), 'd MMM yyyy', { locale: dateLocale })} -{' '}
                    {getExerciseName(analysis)}
                    {analysis.formScore && ` (${analysis.formScore}/100)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {copy.after}
            </label>
            <Select value={rightVideoId || ''} onValueChange={setRightVideoId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.chooseVideo} />
              </SelectTrigger>
              <SelectContent>
                {sortedAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {format(new Date(analysis.createdAt), 'd MMM yyyy', { locale: dateLocale })} -{' '}
                    {getExerciseName(analysis)}
                    {analysis.formScore && ` (${analysis.formScore}/100)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Video Players */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Video */}
          <div className="space-y-2">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              {leftVideo?.videoUrl ? (
                <video
                  ref={leftVideoRef}
                  src={leftVideo.videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={() => handleVideoTimeUpdate('left')}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  {copy.noVideoSelected}
                </div>
              )}
            </div>
            {leftVideo && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {format(new Date(leftVideo.createdAt), 'd MMMM yyyy', { locale: dateLocale })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getExerciseName(leftVideo)}
                  </p>
                </div>
                {leftVideo.formScore !== null && (
                  <Badge
                    variant="secondary"
                    className={
                      leftVideo.formScore >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : leftVideo.formScore >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {leftVideo.formScore}/100
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Right Video */}
          <div className="space-y-2">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              {rightVideo?.videoUrl ? (
                <video
                  ref={rightVideoRef}
                  src={rightVideo.videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={() => handleVideoTimeUpdate('right')}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  {copy.noVideoSelected}
                </div>
              )}
            </div>
            {rightVideo && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {format(new Date(rightVideo.createdAt), 'd MMMM yyyy', { locale: dateLocale })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getExerciseName(rightVideo)}
                  </p>
                </div>
                {rightVideo.formScore !== null && (
                  <Badge
                    variant="secondary"
                    className={
                      rightVideo.formScore >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : rightVideo.formScore >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {rightVideo.formScore}/100
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {copy.reset}
          </Button>
          <Button onClick={handlePlayPause} disabled={!leftVideo?.videoUrl || !rightVideo?.videoUrl}>
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {copy.pause}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {copy.play}
              </>
            )}
          </Button>
          <Button
            variant={syncPlayback ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSyncPlayback(!syncPlayback)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {copy.syncedPlayback}
          </Button>
        </div>

        {/* Comparison Details */}
        {leftVideo && rightVideo && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {/* Left Video Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">{copy.issuesDetected}</h4>
              {leftVideo.issuesDetected && leftVideo.issuesDetected.length > 0 ? (
                <ul className="space-y-1">
                  {leftVideo.issuesDetected.slice(0, 3).map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={
                          issue.severity === 'HIGH'
                            ? 'border-red-300 text-red-700'
                            : issue.severity === 'MEDIUM'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-zinc-300'
                        }
                      >
                        {issue.severity === 'HIGH' ? copy.high : issue.severity === 'MEDIUM' ? copy.medium : copy.low}
                      </Badge>
                      <span className="text-gray-700">{issue.issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{copy.noIssues}</p>
              )}
            </div>

            {/* Right Video Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">{copy.issuesDetected}</h4>
              {rightVideo.issuesDetected && rightVideo.issuesDetected.length > 0 ? (
                <ul className="space-y-1">
                  {rightVideo.issuesDetected.slice(0, 3).map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={
                          issue.severity === 'HIGH'
                            ? 'border-red-300 text-red-700'
                            : issue.severity === 'MEDIUM'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-zinc-300'
                        }
                      >
                        {issue.severity === 'HIGH' ? copy.high : issue.severity === 'MEDIUM' ? copy.medium : copy.low}
                      </Badge>
                      <span className="text-gray-700">{issue.issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{copy.noIssues}</p>
              )}
            </div>
          </div>
        )}

        {/* Improvement Summary */}
        {leftVideo && rightVideo && improvement !== null && (
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="font-medium mb-2">{copy.summary}</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">{copy.timePeriod}</p>
                <p className="font-medium">
                  {Math.round(
                    (new Date(rightVideo.createdAt).getTime() - new Date(leftVideo.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  {copy.days}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{copy.scoreChange}</p>
                <p
                  className={`font-medium ${
                    improvement > 0 ? 'text-emerald-600' : improvement < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {improvement > 0 ? '+' : ''}
                  {improvement} {copy.points}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{copy.issuesResolved}</p>
                <p className="font-medium">
                  {Math.max(
                    0,
                    (leftVideo.issuesDetected?.length || 0) - (rightVideo.issuesDetected?.length || 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
