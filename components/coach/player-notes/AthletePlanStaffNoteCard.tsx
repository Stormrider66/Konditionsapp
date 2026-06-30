'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, StickyNote } from 'lucide-react'
import { useLocale } from '@/i18n/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { cn } from '@/lib/utils'

interface AthletePlanStaffNoteCardProps {
  clientId: string
  businessSlug?: string
  plan: AthletePlanSummary
  onSaved?: (plan: AthletePlanSummary) => void
  compact?: boolean
  className?: string
}

function copy(locale: string) {
  const sv = locale === 'sv'
  return {
    title: sv ? 'Plananteckning' : 'Plan note',
    description: sv
      ? 'Delad personaltext för den individuella planen.'
      : 'Shared staff text for this individual plan.',
    placeholder: sv ? 'Ex. stegra mot full träning över 10 dagar...' : 'E.g. progress toward full training over 10 days...',
    save: sv ? 'Spara plananteckning' : 'Save plan note',
    saving: sv ? 'Sparar...' : 'Saving...',
    saved: sv ? 'Plananteckningen sparades.' : 'Plan note saved.',
    failed: sv ? 'Kunde inte spara plananteckningen.' : 'Could not save plan note.',
    updatedBy: sv ? 'uppdaterad av' : 'updated by',
  }
}

export function AthletePlanStaffNoteCard({
  clientId,
  businessSlug,
  plan,
  onSaved,
  compact = false,
  className,
}: AthletePlanStaffNoteCardProps) {
  const locale = useLocale()
  const c = copy(locale)
  const router = useRouter()
  const { toast } = useToast()
  const [note, setNote] = useState(plan.staffPlanNote ?? '')
  const [saving, setSaving] = useState(false)

  const authorName = plan.staffPlanNoteAuthor?.name || plan.staffPlanNoteAuthor?.email || null

  async function saveNote() {
    if (saving) return
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (businessSlug) headers['x-business-slug'] = businessSlug
      const response = await fetch(`/api/clients/${clientId}/athlete-plans/${plan.id}/staff-note`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          staffPlanNote: note,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.data) throw new Error('Failed')
      onSaved?.(data.data)
      router.refresh()
      toast({ title: c.saved })
    } catch {
      toast({ title: c.failed, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={cn('rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900', className)}>
      <div className={cn('border-b dark:border-white/10', compact ? 'px-3 py-2.5' : 'px-4 py-3')}>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold dark:text-white">
            <StickyNote className="h-4 w-4 text-blue-500" />
            {c.title}
          </div>
          {!compact && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
        </div>
      </div>
      <div className={cn('space-y-3', compact ? 'p-3' : 'p-4')}>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={c.placeholder}
          maxLength={4000}
          className={cn('resize-y bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100', compact ? 'min-h-16 text-sm' : 'min-h-24')}
        />
        <div className="flex justify-end">
          <Button type="button" size={compact ? 'sm' : 'default'} onClick={saveNote} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? c.saving : c.save}
          </Button>
        </div>
        {authorName && plan.staffPlanNoteUpdatedAt && (
          <p className="text-[11px] text-muted-foreground">
            {c.updatedBy} {authorName}
          </p>
        )}
      </div>
    </section>
  )
}
