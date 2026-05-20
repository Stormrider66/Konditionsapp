'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Link2,
  Activity,
  Watch,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from '@/i18n/client'

// ─── Types ──────────────────────────────────────────────────────────────

interface UnlinkedAdHoc {
  id: string
  workoutName: string | null
  workoutDate: string
  parsedType: string | null
  inputType: string
  status: string
}

interface UnlinkedGarmin {
  id: string
  name: string | null
  type: string
  startDate: string
  duration: number | null
  distance: number | null
  averageHeartrate: number | null
  maxHeartrate: number | null
  calories: number | null
  mappedType: string | null
}

interface Suggestion {
  adHocId: string
  garminId: string
  confidence: number
  reasons: string[]
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return '–'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}min`
}

function formatDistance(meters: number | null): string {
  if (!meters) return '–'
  return `${(meters / 1000).toFixed(1)} km`
}

function confidenceColor(c: number): string {
  if (c >= 0.7) return 'bg-green-100 text-green-800'
  if (c >= 0.5) return 'bg-yellow-100 text-yellow-800'
  return 'bg-orange-100 text-orange-800'
}

const INPUT_LABELS: Record<string, string> = {
  PHOTO: 'photo',
  VOICE: 'voice',
  TEXT: 'text',
  MANUAL_FORM: 'manual',
}

// ─── Component ──────────────────────────────────────────────────────────

export function WorkoutMergeManager() {
  const t = useTranslations('components.workoutMergeManager')
  const locale = useLocale()

  const [adHocs, setAdHocs] = useState<UnlinkedAdHoc[]>([])
  const [garmins, setGarmins] = useState<UnlinkedGarmin[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)

  const localeCode = locale === 'sv' ? 'sv-SE' : 'en-US'

  const formatDateLocalized = useCallback(
    (iso: string): string => {
      return new Date(iso).toLocaleDateString(localeCode, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [localeCode],
  )

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/athlete/workouts/unlinked')
      if (res.ok) {
        const data = await res.json()
        setAdHocs(data.unlinkedAdHocs || [])
        setGarmins(data.unlinkedGarmin || [])
        setSuggestions(data.suggestions || [])
      }
    } catch {
      toast.error(t('toasts.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleLink = useCallback(
    async (adHocId: string, garminId: string) => {
      setLinking(`${adHocId}-${garminId}`)
      try {
        const res = await fetch('/api/athlete/workouts/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adHocId, garminId }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || t('toasts.linkFailed'))
        }

        toast.success(t('toasts.linkSuccess'))
        // Refresh data
        await fetchData()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toasts.linkFailed'))
      } finally {
        setLinking(null)
      }
    },
    [fetchData, t]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t('loading')}
      </div>
    )
  }

  const hasSuggestions = suggestions.length > 0
  const hasUnlinked = adHocs.length > 0 || garmins.length > 0

  if (!hasSuggestions && !hasUnlinked) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>{t('empty.allLinked')}</p>
        <p className="text-xs mt-1">{t('empty.noDuplicates')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Suggested matches */}
      {hasSuggestions && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">{t('sections.suggestedMatches')}</h3>
          {suggestions.map((s) => {
            const adHoc = adHocs.find((a) => a.id === s.adHocId)
            const garmin = garmins.find((g) => g.id === s.garminId)
            if (!adHoc || !garmin) return null

            const isLinking = linking === `${s.adHocId}-${s.garminId}`

            return (
              <Card key={`${s.adHocId}-${s.garminId}`} className="overflow-hidden">
                <CardContent className="p-3">
                  {/* Confidence badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`text-[10px] ${confidenceColor(s.confidence)}`}>
                      {t('badges.matchPercent', { percent: Math.round(s.confidence * 100) })}
                    </Badge>
                    <div className="flex gap-1">
                      {s.reasons.map((r, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    {/* Ad-hoc side */}
                    <div className="bg-blue-50 rounded-md p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-medium text-xs">{t('labels.loggedWorkout')}</span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {adHoc.workoutName || adHoc.parsedType || t('labels.fallbackWorkout')}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateLocalized(adHoc.workoutDate)}
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {t(`inputLabels.${INPUT_LABELS[adHoc.inputType] ?? adHoc.inputType}`)}
                      </Badge>
                    </div>

                    {/* Arrow + link button */}
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleLink(s.adHocId, s.garminId)}
                        disabled={isLinking}
                      >
                        {isLinking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            {t('actions.link')}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Garmin side */}
                    <div className="bg-green-50 rounded-md p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Watch className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium text-xs">{t('labels.garmin')}</span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {garmin.name || garmin.type}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateLocalized(garmin.startDate)}
                      </div>
                      <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                        {garmin.duration && <span>{formatDuration(garmin.duration)}</span>}
                        {garmin.distance && <span>{formatDistance(garmin.distance)}</span>}
                        {garmin.averageHeartrate && <span>{Math.round(garmin.averageHeartrate)} bpm</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Unlinked lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Unlinked ad-hocs */}
        {adHocs.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600" />
              {t('sections.unlinkedLogged', { count: adHocs.length })}
            </h3>
            {adHocs.map((a) => (
              <div key={a.id} className="border rounded-md p-2 text-sm">
                <p className="font-medium truncate">{a.workoutName || a.parsedType || t('labels.fallbackWorkout')}</p>
                <p className="text-xs text-muted-foreground">{formatDateLocalized(a.workoutDate)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Unlinked Garmin */}
        {garmins.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Watch className="h-4 w-4 text-green-600" />
              {t('sections.unlinkedGarmin', { count: garmins.length })}
            </h3>
            {garmins.map((g) => (
              <div key={g.id} className="border rounded-md p-2 text-sm">
                <p className="font-medium truncate">{g.name || g.type}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{formatDateLocalized(g.startDate)}</span>
                  {g.duration && <span>{formatDuration(g.duration)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
