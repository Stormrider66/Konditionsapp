'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export interface CoachQuickErgReviewState {
  reviewedAt: string | null
  note: string | null
  openAlertCount: number
}

interface CoachQuickErgReviewCardProps {
  clientId: string
  sessionId: string
  locale: string
  review: CoachQuickErgReviewState
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function CoachQuickErgReviewCard({
  clientId,
  sessionId,
  locale,
  review,
}: CoachQuickErgReviewCardProps) {
  const router = useRouter()
  const [note, setNote] = useState(review.note ?? '')
  const [reviewedAt, setReviewedAt] = useState(review.reviewedAt)
  const [openAlertCount, setOpenAlertCount] = useState(review.openAlertCount)
  const [saving, setSaving] = useState(false)

  async function saveReview() {
    setSaving(true)

    try {
      const response = await fetch(`/api/clients/${clientId}/quick-erg-sessions/${sessionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || null }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || text(locale, 'Could not save review', 'Kunde inte spara granskning'))
      }

      setReviewedAt(payload.data.reviewedAt)
      setNote(payload.data.note ?? '')
      setOpenAlertCount(0)
      toast.success(
        payload.data.actionedAlerts > 0
          ? text(locale, 'Review saved and alerts handled', 'Granskning sparad och alerts hanterade')
          : text(locale, 'Review saved', 'Granskning sparad')
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not save review', 'Kunde inte spara granskning'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              {text(locale, 'Coach review', 'Coachgranskning')}
            </CardTitle>
            <CardDescription>
              {text(locale, 'Mark the session handled and leave a coach note.', 'Markera passet hanterat och lämna en coachanteckning.')}
            </CardDescription>
          </div>
          {openAlertCount > 0 && (
            <Badge variant="secondary">
              {text(locale, `${openAlertCount} open`, `${openAlertCount} öppna`)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewedAt ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {text(locale, 'Reviewed', 'Granskat')}
            </div>
            <p className="mt-1 text-xs opacity-80">{formatDate(reviewedAt, locale)}</p>
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {text(locale, 'Not reviewed by coach yet.', 'Inte coachgranskat ännu.')}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareText className="h-4 w-4" />
            {text(locale, 'Coach note', 'Coachanteckning')}
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={4000}
            rows={4}
            disabled={saving}
            placeholder={text(locale, 'Recovery, plan adjustment, follow-up...', 'Återhämtning, planjustering, uppföljning...')}
          />
        </div>

        <Button className="w-full" onClick={() => void saveReview()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {reviewedAt ? text(locale, 'Update review', 'Uppdatera granskning') : text(locale, 'Mark reviewed', 'Markera granskat')}
        </Button>
      </CardContent>
    </Card>
  )
}
