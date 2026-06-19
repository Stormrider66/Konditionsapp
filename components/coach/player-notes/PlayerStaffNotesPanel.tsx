'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, NotebookPen, Pin, Plus, Trash2 } from 'lucide-react'
import { useLocale } from '@/i18n/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type PlayerStaffNoteCategory = 'COACH' | 'PHYSIO' | 'TRAINING' | 'PLAN' | 'LOAD' | 'OTHER'

export interface PlayerStaffNoteSummary {
  id: string
  clientId: string
  teamId: string | null
  authorId: string
  body: string
  category: PlayerStaffNoteCategory
  isPinned: boolean
  actionRequired: boolean
  visibleToAthlete: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    email: string | null
  }
}

interface PlayerStaffNotesPanelProps {
  clientId: string
  businessSlug: string
  teamId?: string
  initialNotes?: PlayerStaffNoteSummary[]
  variant?: 'compact' | 'full'
  limit?: number
  className?: string
}

const categories: PlayerStaffNoteCategory[] = ['COACH', 'PHYSIO', 'TRAINING', 'PLAN', 'LOAD', 'OTHER']

const categoryClassName: Record<PlayerStaffNoteCategory, string> = {
  COACH: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  PHYSIO: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  TRAINING: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  PLAN: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
  LOAD: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  OTHER: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
}

function copy(locale: string) {
  const sv = locale === 'sv'
  return {
    title: sv ? 'Personalanteckningar' : 'Staff notes',
    description: sv
      ? 'Delad kontext för coach, fys och medicinskt team.'
      : 'Shared context for coach, performance and medical staff.',
    placeholder: sv ? 'Skriv en anteckning om spelaren...' : 'Write a note about the player...',
    add: sv ? 'Lägg till' : 'Add note',
    saving: sv ? 'Sparar...' : 'Saving...',
    loading: sv ? 'Laddar anteckningar...' : 'Loading notes...',
    empty: sv ? 'Inga personalanteckningar ännu.' : 'No staff notes yet.',
    pinned: sv ? 'Fäst' : 'Pinned',
    action: sv ? 'Åtgärd' : 'Action',
    delete: sv ? 'Ta bort' : 'Delete',
    confirmDelete: sv ? 'Ta bort anteckningen?' : 'Delete this note?',
    failed: sv ? 'Något gick fel.' : 'Something went wrong.',
    created: sv ? 'Anteckningen sparades.' : 'Note saved.',
    updated: sv ? 'Anteckningen uppdaterades.' : 'Note updated.',
    deleted: sv ? 'Anteckningen togs bort.' : 'Note deleted.',
    by: sv ? 'av' : 'by',
    category: sv ? 'Kategori' : 'Category',
    categories: {
      COACH: sv ? 'Coach' : 'Coach',
      PHYSIO: sv ? 'Fysio' : 'Physio',
      TRAINING: sv ? 'Fys' : 'Performance',
      PLAN: sv ? 'Plan' : 'Plan',
      LOAD: sv ? 'Belastning' : 'Load',
      OTHER: sv ? 'Övrigt' : 'Other',
    } satisfies Record<PlayerStaffNoteCategory, string>,
  }
}

export function PlayerStaffNotesPanel({
  clientId,
  businessSlug,
  teamId,
  initialNotes,
  variant = 'full',
  limit = variant === 'compact' ? 3 : 20,
  className,
}: PlayerStaffNotesPanelProps) {
  const locale = useLocale()
  const c = copy(locale)
  const router = useRouter()
  const { toast } = useToast()
  const [notes, setNotes] = useState<PlayerStaffNoteSummary[]>(initialNotes ?? [])
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<PlayerStaffNoteCategory>('COACH')
  const [isPinned, setIsPinned] = useState(false)
  const [actionRequired, setActionRequired] = useState(false)
  const [loading, setLoading] = useState(!initialNotes)
  const [saving, setSaving] = useState(false)
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null)
  const hasInitialNotes = initialNotes !== undefined

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', 'x-business-slug': businessSlug }),
    [businessSlug]
  )
  const compact = variant === 'compact'

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  )

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/staff-notes?limit=${limit}`, {
        headers: { 'x-business-slug': businessSlug },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !Array.isArray(data.notes)) throw new Error('Failed')
      setNotes(data.notes)
    } catch {
      toast({ title: c.failed, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [businessSlug, c.failed, clientId, limit, toast])

  useEffect(() => {
    if (hasInitialNotes) return
    let cancelled = false
    fetch(`/api/clients/${clientId}/staff-notes?limit=${limit}`, {
      headers: { 'x-business-slug': businessSlug },
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok || !Array.isArray(data.notes)) throw new Error('Failed')
        setNotes(data.notes)
      })
      .catch(() => {
        if (!cancelled) toast({ title: c.failed, variant: 'destructive' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [businessSlug, c.failed, clientId, hasInitialNotes, limit, toast])

  async function addNote() {
    if (!body.trim() || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/staff-notes`, {
        method: 'POST',
        headers,
          body: JSON.stringify({
            body,
            category,
            isPinned,
            actionRequired,
            teamId,
          }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.note) throw new Error('Failed')
      setBody('')
      setCategory('COACH')
      setIsPinned(false)
      setActionRequired(false)
      await loadNotes()
      router.refresh()
      toast({ title: c.created })
    } catch {
      toast({ title: c.failed, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function updateNote(noteId: string, patch: Partial<PlayerStaffNoteSummary>) {
    if (busyNoteId) return
    setBusyNoteId(noteId)
    try {
      const response = await fetch(`/api/clients/${clientId}/staff-notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(patch),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.note) throw new Error('Failed')
      await loadNotes()
      router.refresh()
      toast({ title: c.updated })
    } catch {
      toast({ title: c.failed, variant: 'destructive' })
    } finally {
      setBusyNoteId(null)
    }
  }

  async function deleteNote(noteId: string) {
    if (busyNoteId || !window.confirm(c.confirmDelete)) return
    setBusyNoteId(noteId)
    try {
      const response = await fetch(`/api/clients/${clientId}/staff-notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'x-business-slug': businessSlug },
      })
      if (!response.ok) throw new Error('Failed')
      setNotes((current) => current.filter((note) => note.id !== noteId))
      router.refresh()
      toast({ title: c.deleted })
    } catch {
      toast({ title: c.failed, variant: 'destructive' })
    } finally {
      setBusyNoteId(null)
    }
  }

  return (
    <section className={cn('rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900', className)}>
      <div className={cn('border-b dark:border-white/10', compact ? 'px-3 py-2.5' : 'px-4 py-3')}>
        <div className="flex items-center gap-2 text-sm font-semibold dark:text-white">
          <NotebookPen className="h-4 w-4 text-blue-500" />
          {c.title}
        </div>
        {!compact && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
      </div>

      <div className={cn('space-y-3', compact ? 'p-3' : 'p-4')}>
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={c.placeholder}
            maxLength={3000}
            className={cn('resize-y bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100', compact ? 'min-h-16 text-sm' : 'min-h-24')}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as PlayerStaffNoteCategory)}
              aria-label={c.category}
              className="rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-950"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {c.categories[option]}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-1.5">
                <Checkbox checked={isPinned} onCheckedChange={(checked) => setIsPinned(checked === true)} />
                {c.pinned}
              </label>
              <label className="inline-flex items-center gap-1.5">
                <Checkbox checked={actionRequired} onCheckedChange={(checked) => setActionRequired(checked === true)} />
                {c.action}
              </label>
            </div>
          </div>
          <Button type="button" size={compact ? 'sm' : 'default'} onClick={addNote} disabled={!body.trim() || saving}>
            <Plus className="mr-2 h-4 w-4" />
            {saving ? c.saving : c.add}
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground dark:border-white/10">
              {c.loading}
            </p>
          ) : notes.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground dark:border-white/10">
              {c.empty}
            </p>
          ) : (
            notes.map((note) => {
              const authorName = note.author.name || note.author.email || c.title
              return (
                <article key={note.id} className="rounded-md border bg-background/70 p-3 dark:border-white/10 dark:bg-slate-950/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', categoryClassName[note.category])}>
                        {c.categories[note.category]}
                      </Badge>
                      {note.isPinned && (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[10px] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                          <Pin className="mr-1 h-3 w-3" />
                          {c.pinned}
                        </Badge>
                      )}
                      {note.actionRequired && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {c.action}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={c.pinned}
                        className="h-7 w-7"
                        disabled={busyNoteId === note.id}
                        onClick={() => updateNote(note.id, { isPinned: !note.isPinned })}
                      >
                        <Pin className={cn('h-3.5 w-3.5', note.isPinned && 'fill-current text-blue-600')} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={c.action}
                        className="h-7 w-7"
                        disabled={busyNoteId === note.id}
                        onClick={() => updateNote(note.id, { actionRequired: !note.actionRequired })}
                      >
                        <AlertTriangle className={cn('h-3.5 w-3.5', note.actionRequired && 'text-amber-600')} />
                      </Button>
                      {!compact && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={c.delete}
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          disabled={busyNoteId === note.id}
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-800 dark:text-slate-100">
                    {note.body}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {dateFormatter.format(new Date(note.createdAt))} {c.by} {authorName}
                  </p>
                </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
