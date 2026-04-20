'use client'

/**
 * Full editable roster table for a team.
 *
 * - Inline edit of jersey + position (click, type, blur saves)
 * - Remove button per row (detaches from team — does NOT delete the client)
 * - Sorts by jersey then name
 */

import { useMemo, useState } from 'react'
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
import { Trash2, Loader2 } from 'lucide-react'
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

export function TeamRosterTable({ teamId, members: initialMembers }: TeamRosterTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [members, setMembers] = useState(initialMembers)
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
    const current = members.find((m) => m.id === clientId)
    if (!current) {
      setSavingId(null)
      return
    }

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
      payload = { position: value }
    }

    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Sparning misslyckades')
      setMembers((prev) =>
        prev.map((m) =>
          m.id === clientId
            ? {
                ...m,
                jerseyNumber: data.client.jerseyNumber ?? null,
                position: data.client.position ?? null,
              }
            : m
        )
      )
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
      setMembers((prev) => prev.filter((m) => m.id !== clientId))
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

function RosterNumberCell({
  value,
  onSave,
  saving,
}: {
  value: number | null
  onSave: (v: string) => void
  saving: boolean
}) {
  const [local, setLocal] = useState<string>(value == null ? '' : String(value))
  return (
    <Input
      type="number"
      min={0}
      max={999}
      value={local}
      disabled={saving}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const next = local.trim()
        const current = value == null ? '' : String(value)
        if (next !== current) onSave(next)
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
  const [local, setLocal] = useState<string>(value ?? '')
  return (
    <Input
      value={local}
      placeholder={placeholder}
      disabled={saving}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const next = local.trim()
        const current = value ?? ''
        if (next !== current) onSave(next)
      }}
      className="h-8"
    />
  )
}
