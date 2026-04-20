'use client'

/**
 * Full editable roster table for a team.
 *
 * - Inline edit of jersey + position (focus → type → blur saves)
 * - Remove button per row (detaches from team — does NOT delete the client)
 * - Sorts by jersey then name
 *
 * Prop-driven: `members` is the source of truth. After any mutation we
 * call router.refresh() so the RSC parent re-renders and cells see the
 * authoritative values. Local state is limited to a per-cell edit buffer
 * (active only while focused) plus savingId/removingId indicators.
 */

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Loader2, Trash2, User2, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface TeamRosterMember {
  id: string
  name: string
  email: string | null
  jerseyNumber: number | null
  position: string | null
  photoUrl: string | null
}

interface TeamRosterTableProps {
  teamId: string
  members: TeamRosterMember[]
}

export function TeamRosterTable({ teamId, members }: TeamRosterTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const ja = a.jerseyNumber ?? 9999
        const jb = b.jerseyNumber ?? 9999
        if (ja !== jb) return ja - jb
        return a.name.localeCompare(b.name)
      }),
    [members]
  )

  const saveField = async (
    clientId: string,
    field: 'jerseyNumber' | 'position',
    value: string
  ) => {
    setSavingId(clientId)

    let payload: Record<string, unknown>
    if (field === 'jerseyNumber') {
      if (value === '') payload = { jerseyNumber: null }
      else {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 0 || n > 999) {
          toast({ title: 'Ogiltigt tröjnummer (0-999)', variant: 'destructive' })
          setSavingId(null)
          return
        }
        payload = { jerseyNumber: n }
      }
    } else {
      payload = { position: value === '' ? null : value }
    }

    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Sparning misslyckades')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Kunde inte spara',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const removeMember = async (clientId: string, name: string) => {
    if (!confirm(`Ta bort ${name} från laget? Spelaren finns kvar i atletregistret.`)) return
    setRemovingId(clientId)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members/${clientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Kunde inte ta bort')
      }
      toast({ title: `${name} borttagen från laget` })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Inga spelare i laget ännu — lägg till din första spelare.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14"></TableHead>
          <TableHead className="w-20">#</TableHead>
          <TableHead>Namn</TableHead>
          <TableHead className="w-40">Position</TableHead>
          <TableHead className="hidden md:table-cell">E-post</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m) => (
          <TableRow key={m.id}>
            <TableCell>
              <PlayerAvatarCell
                teamId={teamId}
                clientId={m.id}
                name={m.name}
                photoUrl={m.photoUrl}
              />
            </TableCell>
            <TableCell>
              <RosterNumberCell
                value={m.jerseyNumber}
                onSave={(v) => saveField(m.id, 'jerseyNumber', v)}
                saving={savingId === m.id}
              />
            </TableCell>
            <TableCell className="font-medium">{m.name}</TableCell>
            <TableCell>
              <RosterTextCell
                value={m.position}
                placeholder="—"
                onSave={(v) => saveField(m.id, 'position', v)}
                saving={savingId === m.id}
              />
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
              {m.email ?? '—'}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                disabled={removingId === m.id}
                onClick={() => removeMember(m.id, m.name)}
                aria-label={`Ta bort ${m.name}`}
              >
                {removingId === m.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-500" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PlayerAvatarCell({
  teamId,
  clientId,
  name,
  photoUrl,
}: {
  teamId: string
  clientId: string
  name: string
  photoUrl: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ogiltigt format', description: 'Välj en bild (JPG/PNG/WebP/HEIC)', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch(
        `/api/coach/teams/${teamId}/members/${clientId}/photo`,
        { method: 'POST', body: form }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Uppladdning misslyckades')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const remove = async () => {
    if (!confirm(`Ta bort foto för ${name}?`)) return
    setUploading(true)
    try {
      const res = await fetch(
        `/api/coach/teams/${teamId}/members/${clientId}/photo`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Kunde inte ta bort')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 transition"
        aria-label={`Ladda upp foto för ${name}`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <User2 className="h-5 w-5 text-slate-400" />
        )}
        {!uploading && !photoUrl && (
          <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <Camera className="h-4 w-4 text-white" />
          </span>
        )}
      </button>
      {photoUrl && !uploading && (
        <button
          type="button"
          onClick={remove}
          aria-label={`Ta bort foto för ${name}`}
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-700 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Controlled input that tracks the parent's `value` prop whenever the cell
 * is NOT actively being edited, and uses a local `buffer` only while focused.
 * This way server-driven re-renders (router.refresh after bulk import, etc.)
 * update what's shown without fighting user typing.
 */
function RosterNumberCell({
  value,
  onSave,
  saving,
}: {
  value: number | null
  onSave: (v: string) => void
  saving: boolean
}) {
  const [buffer, setBuffer] = useState<string | null>(null)
  const propDisplay = value == null ? '' : String(value)
  const display = buffer ?? propDisplay
  return (
    <Input
      type="number"
      min={0}
      max={999}
      value={display}
      disabled={saving}
      onFocus={() => setBuffer(propDisplay)}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const next = (buffer ?? '').trim()
        if (next !== propDisplay) onSave(next)
        setBuffer(null)
      }}
      className="h-8 w-16 text-center"
    />
  )
}

function RosterTextCell({
  value,
  placeholder,
  onSave,
  saving,
}: {
  value: string | null
  placeholder: string
  onSave: (v: string) => void
  saving: boolean
}) {
  const [buffer, setBuffer] = useState<string | null>(null)
  const propDisplay = value ?? ''
  const display = buffer ?? propDisplay
  return (
    <Input
      value={display}
      placeholder={placeholder}
      disabled={saving}
      onFocus={() => setBuffer(propDisplay)}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const next = (buffer ?? '').trim()
        if (next !== propDisplay) onSave(next)
        setBuffer(null)
      }}
      className="h-8"
    />
  )
}
