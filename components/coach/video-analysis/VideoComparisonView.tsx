'use client'

/**
 * VideoComparisonView - Side-by-side video comparison for technique analysis
 *
 * Allows coaches and athletes to compare two videos from different dates
 * to visualize technique improvements over time.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Play, Pause, RotateCcw, ArrowLeftRight, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface VideoAnalysis {
  id: string
  createdAt: Date | string
  formScore: number | null
  videoType: string
  videoUrl: string | null
  exercise?: {
    name: string
    nameSv: string | null
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

export function VideoComparisonView({
  analyses,
  title = 'Videojamforelse',
}: VideoComparisonViewProps) {
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
      leftVideoRef.current?.play()
      if (syncPlayback) {
        rightVideoRef.current?.play()
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inte tillrackligt med videor</h3>
          <p className="text-gray-500">
            Ladda upp minst tva videoanalyser for att kunna jamfora teknikutveckling.
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
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Jamfor teknik fran olika tidpunkter for att se utveckling
            </CardDescription>
          </div>
          {improvement !== null && (
            <Badge
              className={
                improvement > 0
                  ? 'bg-green-100 text-green-800'
                  : improvement < 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }
            >
              {improvement > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{improvement} poang forbattring
                </>
              ) : improvement < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {improvement} poang
                </>
              ) : (
                <>
                  <Minus className="h-3 w-3 mr-1" />
                  Ingen forandring
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
              Fore (aldre)
            </label>
            <Select value={leftVideoId || ''} onValueChange={setLeftVideoId}>
              <SelectTrigger>
                <SelectValue placeholder="Valj video" />
              </SelectTrigger>
              <SelectContent>
                {sortedAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {format(new Date(analysis.createdAt), 'd MMM yyyy', { locale: sv })} -{' '}
                    {analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType}
                    {analysis.formScore && ` (${analysis.formScore}/100)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Efter (nyare)
            </label>
            <Select value={rightVideoId || ''} onValueChange={setRightVideoId}>
              <SelectTrigger>
                <SelectValue placeholder="Valj video" />
              </SelectTrigger>
              <SelectContent>
                {sortedAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {format(new Date(analysis.createdAt), 'd MMM yyyy', { locale: sv })} -{' '}
                    {analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType}
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
                  Ingen video vald
                </div>
              )}
            </div>
            {leftVideo && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {format(new Date(leftVideo.createdAt), 'd MMMM yyyy', { locale: sv })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leftVideo.exercise?.nameSv || leftVideo.exercise?.name || leftVideo.videoType}
                  </p>
                </div>
                {leftVideo.formScore !== null && (
                  <Badge
                    variant="secondary"
                    className={
                      leftVideo.formScore >= 80
                        ? 'bg-green-100 text-green-800'
                        : leftVideo.formScore >= 60
                        ? 'bg-yellow-100 text-yellow-800'
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
                  Ingen video vald
                </div>
              )}
            </div>
            {rightVideo && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {format(new Date(rightVideo.createdAt), 'd MMMM yyyy', { locale: sv })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rightVideo.exercise?.nameSv || rightVideo.exercise?.name || rightVideo.videoType}
                  </p>
                </div>
                {rightVideo.formScore !== null && (
                  <Badge
                    variant="secondary"
                    className={
                      rightVideo.formScore >= 80
                        ? 'bg-green-100 text-green-800'
                        : rightVideo.formScore >= 60
                        ? 'bg-yellow-100 text-yellow-800'
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
            Aterstall
          </Button>
          <Button onClick={handlePlayPause} disabled={!leftVideo?.videoUrl || !rightVideo?.videoUrl}>
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausa
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Spela
              </>
            )}
          </Button>
          <Button
            variant={syncPlayback ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSyncPlayback(!syncPlayback)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Synkad uppspelning
          </Button>
        </div>

        {/* Comparison Details */}
        {leftVideo && rightVideo && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {/* Left Video Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Problem identifierade</h4>
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
                            ? 'border-yellow-300 text-yellow-700'
                            : 'border-gray-300'
                        }
                      >
                        {issue.severity === 'HIGH' ? 'Hog' : issue.severity === 'MEDIUM' ? 'Medel' : 'Lag'}
                      </Badge>
                      <span className="text-gray-700">{issue.issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Inga problem identifierade</p>
              )}
            </div>

            {/* Right Video Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Problem identifierade</h4>
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
                            ? 'border-yellow-300 text-yellow-700'
                            : 'border-gray-300'
                        }
                      >
                        {issue.severity === 'HIGH' ? 'Hog' : issue.severity === 'MEDIUM' ? 'Medel' : 'Lag'}
                      </Badge>
                      <span className="text-gray-700">{issue.issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Inga problem identifierade</p>
              )}
            </div>
          </div>
        )}

        {/* Improvement Summary */}
        {leftVideo && rightVideo && improvement !== null && (
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="font-medium mb-2">Sammanfattning</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Tidsperiod</p>
                <p className="font-medium">
                  {Math.round(
                    (new Date(rightVideo.createdAt).getTime() - new Date(leftVideo.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  dagar
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Poangforandring</p>
                <p
                  className={`font-medium ${
                    improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {improvement > 0 ? '+' : ''}
                  {improvement} poang
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Problem lost</p>
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
