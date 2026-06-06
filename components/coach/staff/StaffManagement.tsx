'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Users, Shield, Dumbbell, Heart, Clipboard, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { invitableRolesFor, type BusinessType } from '@/lib/permissions/assistant-coach'

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  name: string
}

interface StaffMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  roleLabel: string
  teams: Team[]
  clients?: Athlete[]
  clientIds?: string[]
  invitedAt: string
  acceptedAt: string | null
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  OWNER: Shield,
  ADMIN: Shield,
  COACH: Users,
  PHYSICAL_TRAINER: Dumbbell,
  ASSISTANT_COACH: Clipboard,
  PHYSIO: Heart,
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COACH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PHYSICAL_TRAINER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ASSISTANT_COACH: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  PHYSIO: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
}

const ROLE_ORDER = ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'MEMBER']

const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO']

interface StaffManagementProps {
  teams: Team[]
  businessType: BusinessType | string
  businessSlug?: string
  currentUserId?: string
}

export function StaffManagement({ teams, businessType, businessSlug, currentUserId }: StaffManagementProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = useCallback((en: string, sv: string) => locale === 'sv' ? sv : en, [locale])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const invitableRoles = invitableRolesFor(businessType, locale)

  // Invite form
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('')
  const [invTeamIds, setInvTeamIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)

  // Edit form
  const [editOpen, setEditOpen] = useState(false)
  const [editMember, setEditMember] = useState<StaffMember | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editTeamIds, setEditTeamIds] = useState<string[]>([])
  const [editClientIds, setEditClientIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Athlete roster (lazy — only fetched when assigning individual athletes to a physio)
  const [roster, setRoster] = useState<Athlete[]>([])
  const [rosterLoaded, setRosterLoaded] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/staff${params.size ? `?${params}` : ''}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch {
      toast.error(copy('Unable to load staff', 'Kunde inte hämta personal'))
    } finally {
      setLoading(false)
    }
  }, [businessSlug, copy])

  const fetchRoster = useCallback(async () => {
    if (rosterLoaded) return
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/roster${params.size ? `?${params}` : ''}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setRoster((data.roster || []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
        setRosterLoaded(true)
      }
    } catch {
      // Non-fatal — picker just shows no athletes.
    }
  }, [businessSlug, rosterLoaded])

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(copy(`Remove ${name} from staff?`, `Ta bort ${name} från personalen?`))) return
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/staff/${memberId}${params.size ? `?${params}` : ''}`, {
        method: 'DELETE',
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        setStaff((prev) => prev.filter((m) => m.id !== memberId))
        toast.success(copy(`${name} removed`, `${name} borttagen`))
      } else {
        const err = await res.json()
        toast.error(err.error || copy('Unable to remove staff member', 'Kunde inte ta bort'))
      }
    } catch {
      toast.error(copy('Network error', 'Nätverksfel'))
    }
  }

  useEffect(() => {
    void fetchStaff()
  }, [fetchStaff])

  const handleInvite = async () => {
    if (!invName.trim() || !invEmail.trim() || !invRole) {
      toast.error(copy('Fill in all fields', 'Fyll i alla fält'))
      return
    }

    setInviting(true)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/staff${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          name: invName.trim(),
          email: invEmail.trim(),
          role: invRole,
          teamIds: TEAM_SCOPED_ROLES.includes(invRole) ? invTeamIds : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(copy(`${data.roleLabel} invited`, `${data.roleLabel} inbjuden!`))
        setInviteOpen(false)
        setInvName('')
        setInvEmail('')
        setInvRole('')
        setInvTeamIds([])
        await fetchStaff()
      } else {
        const err = await res.json()
        toast.error(err.error || copy('Unable to invite staff member', 'Kunde inte bjuda in'))
      }
    } catch {
      toast.error(copy('Network error', 'Nätverksfel'))
    } finally {
      setInviting(false)
    }
  }

  const openEdit = (member: StaffMember) => {
    setEditMember(member)
    setEditRole(member.role)
    setEditTeamIds(member.teams.map((t) => t.id))
    setEditClientIds(member.clientIds ?? [])
    setEditOpen(true)
    if (member.role === 'PHYSIO') void fetchRoster()
  }

  // Editing the role to physio reveals the athlete picker — load the roster then.
  const handleEditRoleChange = (value: string) => {
    setEditRole(value)
    if (value === 'PHYSIO') void fetchRoster()
  }

  const handleSaveEdit = async () => {
    if (!editMember || !editRole) return

    const teamScoped = TEAM_SCOPED_ROLES.includes(editRole)
    if (teamScoped && editTeamIds.length === 0) {
      toast.error(copy('Select at least one team', 'Välj minst ett lag'))
      return
    }

    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/staff/${editMember.id}${params.size ? `?${params}` : ''}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          role: editRole,
          teamIds: teamScoped ? editTeamIds : undefined,
          clientIds: editRole === 'PHYSIO' ? editClientIds : undefined,
        }),
      })

      if (res.ok) {
        toast.success(copy('Staff updated', 'Personal uppdaterad'))
        setEditOpen(false)
        setEditMember(null)
        await fetchStaff()
      } else {
        const err = await res.json()
        toast.error(err.error || copy('Unable to update staff member', 'Kunde inte uppdatera'))
      }
    } catch {
      toast.error(copy('Network error', 'Nätverksfel'))
    } finally {
      setSaving(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setInvTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  const toggleEditTeam = (teamId: string) => {
    setEditTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  const toggleEditClient = (clientId: string) => {
    setEditClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  // Group staff by role for a legible, scannable layout.
  const groupedStaff = useMemo(() => {
    const groups = new Map<string, StaffMember[]>()
    for (const m of staff) {
      const key = ROLE_ORDER.includes(m.role) ? m.role : 'MEMBER'
      const arr = groups.get(key) ?? []
      arr.push(m)
      groups.set(key, arr)
    }
    return ROLE_ORDER
      .filter((role) => groups.has(role))
      .map((role) => ({ role, members: groups.get(role)! }))
  }, [staff])

  const editTeamScoped = TEAM_SCOPED_ROLES.includes(editRole)

  const renderMemberCard = (member: StaffMember) => {
    const Icon = ROLE_ICONS[member.role] || Users
    const colorClass = ROLE_COLORS[member.role] || ROLE_COLORS.COACH
    const isSelf = !!currentUserId && member.userId === currentUserId
    const canManage = member.role !== 'OWNER' && !isSelf
    const athleteCount = member.clients?.length ?? 0
    return (
      <Card key={member.id} className="group">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-[40vw]">
              {member.teams.map((t) => (
                <Badge key={t.id} variant="outline" className="text-[10px]">{t.name}</Badge>
              ))}
              {athleteCount > 0 && (
                <Badge variant="outline" className="text-[10px] border-pink-300 text-pink-700 dark:text-pink-400">
                  {copy(`${athleteCount} ${athleteCount === 1 ? 'athlete' : 'athletes'}`, `${athleteCount} ${athleteCount === 1 ? 'atlet' : 'atleter'}`)}
                </Badge>
              )}
            </div>
            <Badge className={`text-[10px] ${colorClass} border-0`}>
              {member.roleLabel}
            </Badge>
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => openEdit(member)}
                  aria-label={copy('Edit', 'Redigera')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(member.id, member.name)}
                  aria-label={copy('Remove', 'Ta bort')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{copy('Staff', 'Personal')}</h2>
          <p className="text-sm text-muted-foreground">
            {copy(`${staff.length} ${staff.length === 1 ? 'member' : 'members'}`, `${staff.length} medlemmar`)}
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {copy('Invite', 'Bjud in')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{copy('Invite staff', 'Bjud in personal')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{copy('Name', 'Namn')}</Label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder={copy('First Last', 'Förnamn Efternamn')} />
              </div>

              <div className="space-y-2">
                <Label>{copy('Email', 'E-post')}</Label>
                <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} type="email" placeholder="coach@example.com" />
              </div>

              <div className="space-y-2">
                <Label>{copy('Role', 'Roll')}</Label>
                <Select value={invRole} onValueChange={setInvRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy('Select role...', 'Välj roll...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <span className="font-medium">{r.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team assignment (for team-scoped roles) */}
              {TEAM_SCOPED_ROLES.includes(invRole) && teams.length > 0 && (
                <div className="space-y-2">
                  <Label>{copy('Assign to teams', 'Tilldela till lag')}</Label>
                  <div className="space-y-1">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          invTeamIds.includes(team.id)
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                  {invTeamIds.length === 0 && (
                    <p className="text-xs text-amber-600">{copy('Select at least one team', 'Välj minst ett lag')}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>{copy('Cancel', 'Avbryt')}</Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? copy('Inviting...', 'Bjuder in...') : copy('Invite', 'Bjud in')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff list (grouped by role) */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedStaff.map((group) => (
            <div key={group.role} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {group.members[0].roleLabel}
                <span className="ml-1.5 font-normal normal-case">({group.members.length})</span>
              </h3>
              {group.members.map(renderMemberCard)}
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditMember(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMember ? copy(`Edit ${editMember.name}`, `Redigera ${editMember.name}`) : copy('Edit staff', 'Redigera personal')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{copy('Role', 'Roll')}</Label>
              <Select value={editRole} onValueChange={handleEditRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder={copy('Select role...', 'Välj roll...')} />
                </SelectTrigger>
                <SelectContent>
                  {invitableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team connections (for team-scoped roles) */}
            {editTeamScoped && (
              <div className="space-y-2">
                <Label>{copy('Connected teams', 'Kopplade lag')}</Label>
                {teams.length > 0 ? (
                  <div className="space-y-1">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleEditTeam(team.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          editTeamIds.includes(team.id)
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{copy('No teams yet', 'Inga lag ännu')}</p>
                )}
                {editTeamIds.length === 0 && (
                  <p className="text-xs text-amber-600">{copy('Select at least one team', 'Välj minst ett lag')}</p>
                )}
              </div>
            )}

            {/* Individual athletes (PHYSIO only) */}
            {editRole === 'PHYSIO' && (
              <div className="space-y-2">
                <Label>{copy('Individual athletes (optional)', 'Enskilda atleter (valfritt)')}</Label>
                <p className="text-xs text-muted-foreground">
                  {copy('Give this physio access to specific athletes in addition to their teams.', 'Ge denna fysioterapeut tillgång till specifika atleter utöver sina lag.')}
                </p>
                {roster.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {roster.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => toggleEditClient(athlete.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          editClientIds.includes(athlete.id)
                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {athlete.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{copy('No athletes available', 'Inga atleter tillgängliga')}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditMember(null) }}>{copy('Cancel', 'Avbryt')}</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? copy('Saving...', 'Sparar...') : copy('Save', 'Spara')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
