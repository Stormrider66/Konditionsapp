'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useLocale } from '@/i18n/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type TeamNoteTag = 'TRAINING' | 'TEST' | 'MATCH' | 'ROSTER' | 'OTHER'

export interface TeamNoteSummary {
  id: string
  body: string
  tag: TeamNoteTag
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    email: string | null
  }
}

interface TeamNotesCardProps {
  teamId: string
  businessSlug: string
  currentUserId: string
  canManageAllNotes: boolean
  initialNotes: TeamNoteSummary[]
}

const tags: TeamNoteTag[] = ['TRAINING', 'TEST', 'MATCH', 'ROSTER', 'OTHER']

const tagClassName: Record<TeamNoteTag, string> = {
  TRAINING: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
  TEST: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200',
  MATCH: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
  ROSTER: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-200',
  OTHER: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-200',
}

function noteCopy(locale: string) {
  const sv = locale === 'sv'
  return {
    title: sv ? 'Laganteckningar' : 'Team notes',
    description: sv
      ? 'Delade anteckningar för tränarteamet.'
      : 'Shared notes for the staff around this team.',
    placeholder: sv ? 'Skriv en anteckning...' : 'Write a note...',
    add: sv ? 'Lägg till' : 'Add note',
    saving: sv ? 'Sparar...' : 'Saving...',
    empty: sv ? 'Inga anteckningar ännu.' : 'No notes yet.',
    by: sv ? 'av' : 'by',
    edit: sv ? 'Redigera' : 'Edit',
    delete: sv ? 'Ta bort' : 'Delete',
    cancel: sv ? 'Avbryt' : 'Cancel',
    save: sv ? 'Spara' : 'Save',
    confirmDelete: sv ? 'Ta bort anteckningen?' : 'Delete this note?',
    created: sv ? 'Anteckningen sparades.' : 'Note saved.',
    updated: sv ? 'Anteckningen uppdaterades.' : 'Note updated.',
    deleted: sv ? 'Anteckningen togs bort.' : 'Note deleted.',
    failed: sv ? 'Något gick fel.' : 'Something went wrong.',
    tags: {
      TRAINING: sv ? 'Träning' : 'Training',
      TEST: sv ? 'Test' : 'Test',
      MATCH: sv ? 'Match' : 'Match',
      ROSTER: sv ? 'Trupp' : 'Roster',
      OTHER: sv ? 'Övrigt' : 'Other',
    } satisfies Record<TeamNoteTag, string>,
  }
}

export function TeamNotesCard({
  teamId,
  businessSlug,
  currentUserId,
  canManageAllNotes,
  initialNotes,
}: TeamNotesCardProps) {
  const router = useRouter()
  const locale = useLocale()
  const copy = noteCopy(locale)
  const { toast } = useToast()
  const [notes, setNotes] = useState(initialNotes)
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<TeamNoteTag>('TRAINING')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editTag, setEditTag] = useState<TeamNoteTag>('OTHER')
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null)

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

  const noteHeaders = { 'Content-Type': 'application/json', 'x-business-slug': businessSlug }

  async function addNote() {
    if (!body.trim() || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/coach/teams/${teamId}/notes`, {
        method: 'POST',
        headers: noteHeaders,
        body: JSON.stringify({ body, tag }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.note) throw new Error(data.error ?? 'Failed')

      setNotes((current) => [data.note, ...current].slice(0, 20))
      setBody('')
      setTag('TRAINING')
      router.refresh()
      toast({ title: copy.created })
    } catch {
      toast({ title: copy.failed, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note: TeamNoteSummary) {
    setEditingId(note.id)
    setEditBody(note.body)
    setEditTag(note.tag)
  }

  async function updateNote(noteId: string) {
    if (!editBody.trim() || busyNoteId) return
    setBusyNoteId(noteId)
    try {
      const response = await fetch(`/api/coach/teams/${teamId}/notes/${noteId}`, {
        method: 'PUT',
        headers: noteHeaders,
        body: JSON.stringify({ body: editBody, tag: editTag }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.note) throw new Error(data.error ?? 'Failed')

      setNotes((current) => current.map((note) => (note.id === noteId ? data.note : note)))
      setEditingId(null)
      router.refresh()
      toast({ title: copy.updated })
    } catch {
      toast({ title: copy.failed, variant: 'destructive' })
    } finally {
      setBusyNoteId(null)
    }
  }

  async function deleteNote(noteId: string) {
    if (busyNoteId || !window.confirm(copy.confirmDelete)) return
    setBusyNoteId(noteId)
    try {
      const response = await fetch(`/api/coach/teams/${teamId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'x-business-slug': businessSlug },
      })
      if (!response.ok) throw new Error('Failed')

      setNotes((current) => current.filter((note) => note.id !== noteId))
      router.refresh()
      toast({ title: copy.deleted })
    } catch {
      toast({ title: copy.failed, variant: 'destructive' })
    } finally {
      setBusyNoteId(null)
    }
  }

  return (
    <GlassCard glow="blue">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2 dark:text-white">
          <NotebookPen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          {copy.title}
        </GlassCardTitle>
        <GlassCardDescription>{copy.description}</GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.placeholder}
            maxLength={2000}
            className="min-h-[96px] resize-y bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={tag} onValueChange={(value) => setTag(value as TeamNoteTag)}>
              <SelectTrigger className="w-full bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tags.map((option) => (
                  <SelectItem key={option} value={option}>
                    {copy.tags[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addNote} disabled={!body.trim() || saving}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? copy.saving : copy.add}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-muted-foreground dark:border-white/10">
              {copy.empty}
            </p>
          ) : (
            notes.map((note) => {
              const canEdit = canManageAllNotes || note.authorId === currentUserId
              const authorName = note.author.name || note.author.email || copy.title

              return (
                <div
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-slate-950/35"
                >
                  {editingId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        maxLength={2000}
                        className="min-h-[96px] resize-y bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Select value={editTag} onValueChange={(value) => setEditTag(value as TeamNoteTag)}>
                          <SelectTrigger className="w-full bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tags.map((option) => (
                              <SelectItem key={option} value={option}>
                                {copy.tags[option]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setEditingId(null)}>
                            <X className="mr-2 h-4 w-4" />
                            {copy.cancel}
                          </Button>
                          <Button
                            onClick={() => updateNote(note.id)}
                            disabled={!editBody.trim() || busyNoteId === note.id}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {copy.save}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('text-xs', tagClassName[note.tag])}>
                            {copy.tags[note.tag]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(note.createdAt))} {copy.by} {authorName}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={copy.edit}
                              onClick={() => startEdit(note)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={copy.delete}
                              onClick={() => deleteNote(note.id)}
                              disabled={busyNoteId === note.id}
                              className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                        {note.body}
                      </p>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
