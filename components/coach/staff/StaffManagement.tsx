'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { UserPlus, Users, User, Shield, Dumbbell, Heart, Clipboard, Trash2, Pencil, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { teamStaffRolesFor, teamRoleLabel, type BusinessType } from '@/lib/permissions/staff-roles'

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
  userId: string | null
  name: string
  email: string | null
  role: string
  roleLabel: string
  teams: Team[]
  clients?: Athlete[]
  clientIds?: string[]
  // Roster players without a login account are surfaced with hasAccount=false
  // and a clientId (their Client record) so they can be invited.
  hasAccount?: boolean
  clientId?: string
  phone?: string | null
  invitedAt: string
  acceptedAt: string | null
}

type InviteMethod = 'email' | 'sms' | 'whatsapp' | 'link'

const ROLE_ICONS: Record<string, typeof Shield> = {
  OWNER: Shield,
  ADMIN: Shield,
  COACH: Users,
  PHYSICAL_TRAINER: Dumbbell,
  ASSISTANT_COACH: Clipboard,
  PHYSIO: Heart,
  MEMBER: User,
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COACH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PHYSICAL_TRAINER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ASSISTANT_COACH: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  PHYSIO: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  MEMBER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const ROLE_ORDER = ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'MEMBER']

const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO']

interface StaffManagementProps {
  teams: Team[]
  businessType: BusinessType | string
  businessSlug?: string
  currentUserId?: string
}

export function StaffManagement({ teams, businessSlug, currentUserId }: StaffManagementProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = useCallback((en: string, sv: string) => locale === 'sv' ? sv : en, [locale])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  // The staff hub is team-only, so always offer the full team lineup
  // (Sport director, head/assistant coach, physical trainer, physio, player),
  // regardless of how the business type was set during onboarding.
  const invitableRoles = teamStaffRolesFor(locale)

  // Invite form
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('')
  const [invTeamIds, setInvTeamIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)
  // Player-specific invite fields (role === MEMBER / Spelare)
  const [invPlayerTeamId, setInvPlayerTeamId] = useState('')
  const [invJersey, setInvJersey] = useState('')
  const [invPosition, setInvPosition] = useState('')

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

  // Invite a roster player (give an account-less player a login)
  const [invitePlayerOpen, setInvitePlayerOpen] = useState(false)
  const [invitePlayerTarget, setInvitePlayerTarget] = useState<StaffMember | null>(null)
  const [invitePlayerEmail, setInvitePlayerEmail] = useState('')
  const [invitePlayerPhone, setInvitePlayerPhone] = useState('')
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('email')
  const [invitingPlayer, setInvitingPlayer] = useState(false)

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

  const resetInviteForm = () => {
    setInviteOpen(false)
    setInvName('')
    setInvEmail('')
    setInvRole('')
    setInvTeamIds([])
    setInvPlayerTeamId('')
    setInvJersey('')
    setInvPosition('')
  }

  // Players (Spelare = MEMBER role) are roster athletes: create a Client on the
  // team (with an athlete login if an email is given) via the roster endpoint.
  const handleAddPlayer = async () => {
    if (!invName.trim()) {
      toast.error(copy('Enter a name', 'Ange ett namn'))
      return
    }
    if (!invPlayerTeamId) {
      toast.error(copy('Select a team', 'Välj ett lag'))
      return
    }

    setInviting(true)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${invPlayerTeamId}/members/bulk${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          rows: [{
            name: invName.trim(),
            email: invEmail.trim() || undefined,
            jerseyNumber: invJersey.trim() ? Number(invJersey) : undefined,
            position: invPosition.trim() || undefined,
            createAthleteAccount: !!invEmail.trim(),
          }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if ((data.summary?.created ?? 0) > 0) {
          toast.success(copy('Player added', 'Spelare tillagd'))
          resetInviteForm()
          await fetchStaff()
        } else {
          const reason = data.results?.[0]?.reason
          toast.error(reason || copy('Could not add player', 'Kunde inte lägga till spelare'))
        }
      } else {
        const err = await res.json()
        toast.error(err.error || copy('Could not add player', 'Kunde inte lägga till spelare'))
      }
    } catch {
      toast.error(copy('Network error', 'Nätverksfel'))
    } finally {
      setInviting(false)
    }
  }

  const handleInvite = async () => {
    if (invRole === 'MEMBER') {
      await handleAddPlayer()
      return
    }

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
        resetInviteForm()
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

  const openInvitePlayer = (member: StaffMember) => {
    setInvitePlayerTarget(member)
    setInvitePlayerEmail(member.email ?? '')
    setInvitePlayerPhone(member.phone ?? '')
    setInviteMethod('email')
    setInvitePlayerOpen(true)
  }

  // Hand the generated invite to WhatsApp/SMS/clipboard so the coach can deliver
  // it themselves (handy while outbound email is paused).
  const shareInvite = (method: InviteMethod, data: { inviteUrl?: string; inviteText?: string }) => {
    const text = data.inviteText || data.inviteUrl || ''
    const phoneDigits = invitePlayerPhone.replace(/[^0-9]/g, '')
    if (method === 'whatsapp') {
      const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/'
      window.open(`${base}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } else if (method === 'sms') {
      window.open(`sms:${invitePlayerPhone.trim()}?&body=${encodeURIComponent(text)}`, '_blank')
    } else if (method === 'link') {
      if (data.inviteUrl) {
        void navigator.clipboard?.writeText(data.inviteUrl)
        toast.success(copy('Invite link copied', 'Inbjudningslänk kopierad'))
      }
    }
  }

  const handleInvitePlayer = async () => {
    if (!invitePlayerTarget?.clientId) return
    if (!invitePlayerEmail.trim()) {
      toast.error(copy('An email is required to create the login', 'En e-post krävs för att skapa inloggningen'))
      return
    }
    if ((inviteMethod === 'sms' || inviteMethod === 'whatsapp') && !invitePlayerPhone.trim()) {
      toast.error(copy('Enter a phone number', 'Ange ett telefonnummer'))
      return
    }
    setInvitingPlayer(true)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/athlete-accounts${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          clientId: invitePlayerTarget.clientId,
          email: invitePlayerEmail.trim(),
          deliveryMethod: inviteMethod,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (inviteMethod === 'email') {
          toast.success(data.message || copy('Player invited', 'Spelare inbjuden'))
        } else {
          shareInvite(inviteMethod, data)
          toast.success(copy('Account created — share the invite', 'Konto skapat — dela inbjudan'))
        }
        setInvitePlayerOpen(false)
        setInvitePlayerTarget(null)
        await fetchStaff()
      } else {
        toast.error(data.error || copy('Could not invite player', 'Kunde inte bjuda in spelare'))
      }
    } catch {
      toast.error(copy('Network error', 'Nätverksfel'))
    } finally {
      setInvitingPlayer(false)
    }
  }

  // Smart detection: roster players who have no login account yet.
  const memberlessPlayers = useMemo(() => staff.filter((m) => m.hasAccount === false), [staff])

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
    const isRosterOnly = member.hasAccount === false
    const canManage = !isRosterOnly && member.role !== 'OWNER' && !isSelf
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
            {isRosterOnly && (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
                {copy('No account', 'Inget konto')}
              </Badge>
            )}
            <Badge className={`text-[10px] ${colorClass} border-0`}>
              {teamRoleLabel(member.role, locale)}
            </Badge>
            {isRosterOnly && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => openInvitePlayer(member)}
              >
                <Mail className="h-3.5 w-3.5 mr-1" />
                {copy('Invite', 'Bjud in')}
              </Button>
            )}
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
        <Dialog open={inviteOpen} onOpenChange={(open) => { if (open) setInviteOpen(true); else resetInviteForm() }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {copy('Invite', 'Bjud in')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{copy('Invite staff', 'Bjud in personal')}</DialogTitle>
              <DialogDescription>
                {copy('Add a new staff member and assign their role and teams.', 'Lägg till en ny medlem i personalen och tilldela roll och lag.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{copy('Name', 'Namn')}</Label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder={copy('First Last', 'Förnamn Efternamn')} />
              </div>

              <div className="space-y-2">
                <Label>{invRole === 'MEMBER' ? copy('Email (optional)', 'E-post (valfritt)') : copy('Email', 'E-post')}</Label>
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

              {/* Player (Spelare) fields */}
              {invRole === 'MEMBER' && (
                <>
                  <div className="space-y-2">
                    <Label>{copy('Team', 'Lag')}</Label>
                    <Select value={invPlayerTeamId} onValueChange={setInvPlayerTeamId}>
                      <SelectTrigger>
                        <SelectValue placeholder={copy('Select team...', 'Välj lag...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {teams.length === 0 && (
                      <p className="text-xs text-amber-600">{copy('Create a team first', 'Skapa ett lag först')}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>{copy('Jersey #', 'Tröjnummer')}</Label>
                      <Input value={invJersey} onChange={(e) => setInvJersey(e.target.value)} type="number" inputMode="numeric" placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label>{copy('Position', 'Position')}</Label>
                      <Input value={invPosition} onChange={(e) => setInvPosition(e.target.value)} placeholder={copy('e.g. Center', 't.ex. Center')} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {copy('With an email the player also gets a login. Height, weight and birth date can be filled in later on the athlete’s profile.', 'Med en e-post får spelaren även en inloggning. Längd, vikt och födelsedatum kan fyllas i senare på atletens profil.')}
                  </p>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetInviteForm}>{copy('Cancel', 'Avbryt')}</Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting
                    ? copy('Saving...', 'Sparar...')
                    : invRole === 'MEMBER'
                      ? copy('Add player', 'Lägg till spelare')
                      : copy('Invite', 'Bjud in')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smart detection: players missing a login account */}
      {!loading && memberlessPlayers.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {copy(
                `${memberlessPlayers.length} ${memberlessPlayers.length === 1 ? 'player has' : 'players have'} no login account`,
                `${memberlessPlayers.length} ${memberlessPlayers.length === 1 ? 'spelare saknar' : 'spelare saknar'} inloggning`,
              )}
            </p>
            <p className="text-amber-700 dark:text-amber-400/80 text-xs mt-0.5">
              {copy('Invite them so they can log in and follow their training.', 'Bjud in dem så att de kan logga in och följa sin träning.')}
            </p>
          </div>
        </div>
      )}

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
                {teamRoleLabel(group.role, locale)}
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
            <DialogDescription>
              {copy('Update this member’s role, team connections, and athletes.', 'Uppdatera medlemmens roll, lagkopplingar och atleter.')}
            </DialogDescription>
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

      {/* Invite player dialog (give an account-less roster player a login) */}
      <Dialog open={invitePlayerOpen} onOpenChange={(open) => { setInvitePlayerOpen(open); if (!open) setInvitePlayerTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {invitePlayerTarget ? copy(`Invite ${invitePlayerTarget.name}`, `Bjud in ${invitePlayerTarget.name}`) : copy('Invite player', 'Bjud in spelare')}
            </DialogTitle>
            <DialogDescription>
              {copy('This player has no login yet. Send an invite so they get an account and can access the app.', 'Spelaren har ingen inloggning ännu. Skicka en inbjudan så att de får ett konto och kan använda appen.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{copy('Email', 'E-post')}</Label>
              <Input
                value={invitePlayerEmail}
                onChange={(e) => setInvitePlayerEmail(e.target.value)}
                type="email"
                placeholder="player@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{copy('Deliver via', 'Skicka via')}</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: 'email', label: copy('Email', 'E-post') },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'link', label: copy('Copy link', 'Kopiera länk') },
                ] as { value: InviteMethod; label: string }[]).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setInviteMethod(m.value)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      inviteMethod === m.value
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {(inviteMethod === 'sms' || inviteMethod === 'whatsapp') && (
              <div className="space-y-2">
                <Label>{copy('Phone', 'Telefon')}</Label>
                <Input
                  value={invitePlayerPhone}
                  onChange={(e) => setInvitePlayerPhone(e.target.value)}
                  type="tel"
                  placeholder="+46 70 123 45 67"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {copy('An email is always required to create the login. WhatsApp, SMS and link just let you deliver the invite yourself.', 'En e-post krävs alltid för att skapa inloggningen. WhatsApp, SMS och länk låter dig leverera inbjudan själv.')}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setInvitePlayerOpen(false); setInvitePlayerTarget(null) }}>{copy('Cancel', 'Avbryt')}</Button>
              <Button onClick={handleInvitePlayer} disabled={invitingPlayer}>
                {invitingPlayer
                  ? copy('Sending...', 'Skickar...')
                  : inviteMethod === 'email'
                    ? copy('Send invite', 'Skicka inbjudan')
                    : inviteMethod === 'whatsapp'
                      ? copy('Create & open WhatsApp', 'Skapa & öppna WhatsApp')
                      : inviteMethod === 'sms'
                        ? copy('Create & open SMS', 'Skapa & öppna SMS')
                        : copy('Create & copy link', 'Skapa & kopiera länk')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
