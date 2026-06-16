'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/i18n/client'

interface TestQualityWarning {
  type?: string
  severity?: string
  message?: string
}

interface TestQualityReviewBannerProps {
  testId: string
  status?: string | null
  warnings?: unknown
  reviewedAt?: Date | string | null
}

function parseWarnings(value: unknown): TestQualityWarning[] {
  return Array.isArray(value)
    ? value.filter((item): item is TestQualityWarning => Boolean(item) && typeof item === 'object')
    : []
}

export function TestQualityReviewBanner({
  testId,
  status,
  warnings,
  reviewedAt,
}: TestQualityReviewBannerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('coach.pages.testQualityReview')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const parsedWarnings = parseWarnings(warnings)

  if (!status || status === 'CLEAR') return null

  const approve = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/tests/${testId}/quality-review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', note }),
      })

      if (!response.ok) {
        throw new Error(t('approveFailed'))
      }

      toast({ title: t('approvedTitle'), description: t('approvedDescription') })
      router.refresh()
    } catch (error) {
      toast({
        title: t('errorTitle'),
        description: error instanceof Error ? error.message : t('approveFailed'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'APPROVED') {
    return (
      <div
        id="quality-review"
        className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 print:hidden dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          {t('approved')}
          {reviewedAt && (
            <Badge variant="outline" className="ml-1 border-emerald-300 text-emerald-800 dark:text-emerald-100">
              {new Date(reviewedAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-sm">{t('approvedImpact')}</p>
      </div>
    )
  }

  return (
    <div
      id="quality-review"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 print:hidden dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          {t('needsReview')}
        </div>
        <Badge className="border-0 bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          {t('badge')}
        </Badge>
      </div>
      <p className="mb-3 text-sm">{t('decisionImpact')}</p>

      {parsedWarnings.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {parsedWarnings.slice(0, 3).map((warning, index) => (
            <li key={`${warning.type ?? 'warning'}-${index}`}>
              {warning.message ?? warning.type ?? t('warningFallback')}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('notePlaceholder')}
          className="min-h-[72px] bg-white/70 dark:bg-slate-950/40"
        />
        <Button type="button" onClick={approve} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {t('approve')}
        </Button>
      </div>
    </div>
  )
}
