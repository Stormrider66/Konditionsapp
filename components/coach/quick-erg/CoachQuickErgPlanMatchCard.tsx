'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  CheckCircle2,
  Link2,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface CoachQuickErgPlanMatchView {
  assignmentId: string
  sessionId: string
  sessionName: string
  assignedDate: string
  status?: string | null
  sport?: string | null
  plannedDurationSec?: number | null
  plannedDistanceMeters?: number | null
}

export interface CoachQuickErgPlanSuggestionView extends CoachQuickErgPlanMatchView {
  id: string
  confidence: number
  reasons: string[]
}

interface CoachQuickErgPlanMatchCardProps {
  clientId: string
  sessionId: string
  locale: string
  plannedMatch: CoachQuickErgPlanMatchView | null
  suggestions: CoachQuickErgPlanSuggestionView[]
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatShortDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '--'
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = Math.round(sec % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatDistance(meters?: number | null): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

export function CoachQuickErgPlanMatchCard({
  clientId,
  sessionId,
  locale,
  plannedMatch,
  suggestions,
}: CoachQuickErgPlanMatchCardProps) {
  const router = useRouter()
  const [matchingAssignmentId, setMatchingAssignmentId] = useState<string | null>(null)
  const [removingMatch, setRemovingMatch] = useState(false)

  async function matchSuggestion(assignmentId: string) {
    setMatchingAssignmentId(assignmentId)

    try {
      const response = await fetch(`/api/clients/${clientId}/quick-erg-sessions/${sessionId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || text(locale, 'Could not match planned session', 'Kunde inte matcha planerat pass'))
      }

      toast.success(text(locale, 'Planned session completed', 'Planerat pass markerat klart'))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not match planned session', 'Kunde inte matcha planerat pass'))
    } finally {
      setMatchingAssignmentId(null)
    }
  }

  async function removeMatch() {
    setRemovingMatch(true)

    try {
      const response = await fetch(`/api/clients/${clientId}/quick-erg-sessions/${sessionId}/match`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || text(locale, 'Could not remove planned match', 'Kunde inte ta bort matchningen'))
      }

      toast.success(text(locale, 'Planned match removed', 'Planerad matchning borttagen'))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not remove planned match', 'Kunde inte ta bort matchningen'))
    } finally {
      setRemovingMatch(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{text(locale, 'Plan status', 'Planstatus')}</CardTitle>
        <CardDescription>
          {text(locale, 'Connect this free session to planned training.', 'Koppla det fria passet till planerad träning.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plannedMatch ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              {text(locale, 'Matched to plan', 'Matchat mot plan')}
            </div>
            <p className="mt-2 text-sm">{plannedMatch.sessionName}</p>
            <p className="text-xs opacity-80">
              {formatShortDate(plannedMatch.assignedDate, locale)}
              {plannedMatch.sport ? ` / ${plannedMatch.sport}` : ''}
              {plannedMatch.plannedDurationSec ? ` / ${formatDuration(plannedMatch.plannedDurationSec)}` : ''}
              {plannedMatch.plannedDistanceMeters ? ` / ${formatDistance(plannedMatch.plannedDistanceMeters)}` : ''}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-emerald-200 bg-background/80 dark:border-emerald-500/20"
              onClick={() => void removeMatch()}
              disabled={removingMatch || matchingAssignmentId !== null}
            >
              {removingMatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {text(locale, 'Undo match', 'Ångra matchning')}
            </Button>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <Link2 className="h-4 w-4" />
                {text(locale, 'Possible plan match', 'Möjlig planmatchning')}
              </div>
              <p className="mt-1 text-sm opacity-80">
                {text(locale, 'Confirm the right planned session here and it will be marked completed.', 'Bekräfta rätt planerat pass här så markeras det som klart.')}
              </p>
            </div>
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{suggestion.sessionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(suggestion.assignedDate, locale)}
                      {suggestion.sport ? ` / ${suggestion.sport}` : ''}
                      {suggestion.plannedDurationSec ? ` / ${formatDuration(suggestion.plannedDurationSec)}` : ''}
                      {suggestion.plannedDistanceMeters ? ` / ${formatDistance(suggestion.plannedDistanceMeters)}` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary">{Math.round(suggestion.confidence * 100)}%</Badge>
                </div>
                {suggestion.reasons.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">{suggestion.reasons.join(' / ')}</p>
                )}
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void matchSuggestion(suggestion.id)}
                  disabled={matchingAssignmentId !== null || removingMatch}
                >
                  {matchingAssignmentId === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {text(locale, 'Match and complete', 'Matcha och markera klart')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarCheck className="h-4 w-4" />
              {text(locale, 'Free session', 'Fritt pass')}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {text(locale, 'No nearby planned session was found.', 'Inget närliggande planerat pass hittades.')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
