'use client'

/**
 * AddPlayersDialog — add players to a team from two sources in the same modal.
 *
 *   Tab 1 "Befintliga"  → multiselect among the coach's clients, attach via
 *                         POST /api/coach/teams/[teamId]/members
 *   Tab 2 "Ny spelare"  → one quick-new form (name, jersey, position, email),
 *                         POST /api/coach/teams/[teamId]/members/bulk with 1 row
 *
 * The bulk import drop-zone lives on its own page — this modal intentionally
 * stays small and keyboard-friendly for the common cases.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Upload, Users } from 'lucide-react'

interface ClientLite {
  id: string
  name: string
  email: string | null
  jerseyNumber: number | null
  position: string | null
  team: { id: string; name: string } | null
}

interface AddPlayersDialogProps {
  teamId: string
  teamName: string
  basePath: string
  importPath: string
  trigger?: React.ReactNode
}

export function AddPlayersDialog({
  teamId,
  teamName,
  basePath,
  importPath,
  trigger,
}: AddPlayersDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'existing' | 'new'>('existing')

  // --- existing clients tab ---
  const [clients, setClients] = useState<ClientLite[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [filter, setFilter] = useState<'unassigned' | 'all'>('unassigned')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [attaching, setAttaching] = useState(false)

  // --- quick-new tab ---
  const [newName, setNewName] = useState('')
  const [newJersey, setNewJersey] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [creating, setCreating] = useState(false)
  const businessSlug = basePath.split('/').filter(Boolean)[0]
  const businessHeaders = useMemo(
    () => (businessSlug ? { 'x-business-slug': businessSlug } : undefined),
    [businessSlug]
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingClients(true)
    fetch(`/api/coach/teams/${teamId}/members?filter=${filter}`, {
      headers: businessHeaders,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setClients(Array.isArray(d.clients) ? d.clients : [])
      })
      .catch(() => {
        if (!cancelled) setClients([])
      })
      .finally(() => {
        if (!cancelled) setLoadingClients(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessHeaders, open, teamId, filter])

  const handleOpenChange = (next: boolean) => {
    if (next) setSelected(new Set())
    setOpen(next)
  }

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAttach = async () => {
    if (selected.size === 0) return
    setAttaching(true)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessHeaders ?? {}),
        },
        body: JSON.stringify({ clientIds: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Kunde inte lägga till spelare')
      toast({
        title: `${data.attached} spelare tillagda`,
        description: `Lades till i ${teamName}`,
      })
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setAttaching(false)
    }
  }

  const handleCreateNew = async () => {
    const name = newName.trim()
    if (name.length < 2) {
      toast({ title: 'Namn krävs', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const row: Record<string, unknown> = { name, gender: newGender }
      if (newJersey.trim()) row.jerseyNumber = Number(newJersey.trim())
      if (newPosition.trim()) row.position = newPosition.trim()
      if (newEmail.trim()) row.email = newEmail.trim()

      const res = await fetch(`/api/coach/teams/${teamId}/members/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessHeaders ?? {}),
        },
        body: JSON.stringify({ rows: [row] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Kunde inte skapa spelare')

      const created = data.summary?.created ?? 0
      if (created === 0) {
        const why = data.results?.[0]?.reason ?? 'Okänt fel'
        throw new Error(why)
      }
      toast({ title: 'Spelare tillagd', description: `${name} lades till i ${teamName}` })
      setNewName('')
      setNewJersey('')
      setNewPosition('')
      setNewEmail('')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" onClick={() => handleOpenChange(true)}>
          <Users className="mr-2 h-4 w-4" />
          Lägg till spelare
        </Button>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lägg till spelare i {teamName}</DialogTitle>
          <DialogDescription>
            Välj befintliga atleter eller lägg till en ny direkt. För större listor — importera från Excel/text.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'existing' | 'new')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="existing">Befintliga atleter</TabsTrigger>
            <TabsTrigger value="new">Ny spelare</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3 pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Sök..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={filter} onValueChange={(v) => setFilter(v as 'unassigned' | 'all')}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Utan lag</SelectItem>
                  <SelectItem value="all">Alla atleter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
              {loadingClients ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Laddar...
                </div>
              ) : visibleClients.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {filter === 'unassigned'
                    ? 'Inga atleter utan lag hittades.'
                    : 'Inga atleter hittades.'}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {visibleClients.map((c) => {
                    const inThisTeam = c.team?.id === teamId
                    return (
                      <li key={c.id} className="flex items-center gap-3 p-2.5">
                        <Checkbox
                          id={`pick-${c.id}`}
                          disabled={inThisTeam}
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggle(c.id)}
                        />
                        <label
                          htmlFor={`pick-${c.id}`}
                          className="flex-1 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[c.email, c.position].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {c.jerseyNumber != null && <span>#{c.jerseyNumber}</span>}
                            {inThisTeam ? (
                              <span className="text-green-600">I detta lag</span>
                            ) : c.team ? (
                              <span>{c.team.name}</span>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selected.size} valda</span>
              <Link
                href={importPath}
                className="flex items-center gap-1 hover:underline text-blue-600"
              >
                <Upload className="h-3.5 w-3.5" />
                Importera från Excel/text/PDF
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="new-name">
                  Namn <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Förnamn Efternamn"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-jersey">Tröjnummer</Label>
                <Input
                  id="new-jersey"
                  type="number"
                  min={0}
                  max={999}
                  value={newJersey}
                  onChange={(e) => setNewJersey(e.target.value)}
                  placeholder="17"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-position">Position</Label>
                <Input
                  id="new-position"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Center, Back, Målvakt..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">E-post</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="namn@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-gender">Kön</Label>
                <Select value={newGender} onValueChange={(v) => setNewGender(v as 'MALE' | 'FEMALE')}>
                  <SelectTrigger id="new-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Man</SelectItem>
                    <SelectItem value="FEMALE">Kvinna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Vikt, längd och födelsedatum kan fyllas i senare — krävs bara för fysiologiska beräkningar.
              Om e-post anges skapas ett atletkonto automatiskt.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          {tab === 'existing' ? (
            <Button
              onClick={handleAttach}
              disabled={selected.size === 0 || attaching}
            >
              {attaching && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lägg till {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          ) : (
            <Button onClick={handleCreateNew} disabled={creating || newName.trim().length < 2}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Skapa spelare
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
