'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, UserPlus, Shield, Check, ChevronRight, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface TeamDraft {
  id: string
  name: string
  sportType: string
}

interface StaffDraft {
  id: string
  name: string
  email: string
  role: string
  teamIds: string[]
}

interface PlayerDraft {
  id: string
  name: string
  email: string
  teamId: string
}

interface ClubOnboardingWizardProps {
  businessSlug: string
  businessName: string
}

export function ClubOnboardingWizard({ businessSlug, businessName }: ClubOnboardingWizardProps) {
  const router = useRouter()
  const t = useTranslations('coach.pages.clubOnboardingWizard')
  const tCommon = useTranslations('common')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 1: Teams
  const [teams, setTeams] = useState<TeamDraft[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSport, setNewTeamSport] = useState('TEAM_ICE_HOCKEY')

  // Step 2: Staff
  const [staff, setStaff] = useState<StaffDraft[]>([])
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('COACH')
  const [newStaffTeams, setNewStaffTeams] = useState<string[]>([])

  // Step 3: Players
  const [players, setPlayers] = useState<PlayerDraft[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerEmail, setNewPlayerEmail] = useState('')
  const [newPlayerTeam, setNewPlayerTeam] = useState('')
  const SPORT_TYPES = [
    { value: 'TEAM_ICE_HOCKEY', label: t('sports.teamIceHockey') },
    { value: 'TEAM_FOOTBALL', label: t('sports.teamFootball') },
    { value: 'TEAM_HANDBALL', label: t('sports.teamHandball') },
    { value: 'TEAM_FLOORBALL', label: t('sports.teamFloorball') },
    { value: 'TEAM_BASKETBALL', label: t('sports.teamBasketball') },
    { value: 'TEAM_VOLLEYBALL', label: t('sports.teamVolleyball') },
    { value: 'TENNIS', label: 'Tennis' },
    { value: 'PADEL', label: 'Padel' },
    { value: 'RUNNING', label: t('sports.running') },
    { value: 'CYCLING', label: t('sports.cycling') },
    { value: 'SWIMMING', label: t('sports.swimming') },
  ]
  const STAFF_ROLES = [
    { value: 'COACH', label: t('roles.coach') },
    { value: 'PHYSICAL_TRAINER', label: t('roles.physicalTrainer') },
    { value: 'ASSISTANT_COACH', label: t('roles.assistantCoach') },
    { value: 'PHYSIO', label: t('roles.physio') },
    { value: 'ADMIN', label: t('roles.admin') },
  ]

  const addTeam = () => {
    if (!newTeamName.trim()) return
    setTeams([...teams, { id: crypto.randomUUID(), name: newTeamName.trim(), sportType: newTeamSport }])
    setNewTeamName('')
  }

  const addStaff = () => {
    if (!newStaffName.trim() || !newStaffEmail.trim()) return
    setStaff([...staff, {
      id: crypto.randomUUID(),
      name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      teamIds: newStaffTeams,
    }])
    setNewStaffName('')
    setNewStaffEmail('')
    setNewStaffTeams([])
  }

  const addPlayer = () => {
    if (!newPlayerName.trim() || !newPlayerTeam) return
    setPlayers([...players, {
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      email: newPlayerEmail.trim(),
      teamId: newPlayerTeam,
    }])
    setNewPlayerName('')
    setNewPlayerEmail('')
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // Step 1: Create all teams
      const teamIdMap = new Map<string, string>() // draft ID → real ID
      for (const team of teams) {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: team.name, sportType: team.sportType }),
        })
        if (res.ok) {
          const data = await res.json()
          teamIdMap.set(team.id, data.data?.id || data.id)
        }
      }

      // Step 2: Invite staff
      for (const s of staff) {
        const realTeamIds = s.teamIds.map((id) => teamIdMap.get(id)).filter(Boolean)
        await fetch('/api/coach/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.name,
            email: s.email,
            role: s.role,
            teamIds: realTeamIds,
          }),
        })
      }

      // Step 3: Add players as clients
      for (const p of players) {
        const realTeamId = teamIdMap.get(p.teamId)
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name,
            email: p.email || undefined,
            teamId: realTeamId,
            gender: 'MALE', // Default, can be changed later
            birthDate: '2008-01-01', // Placeholder for J18
            height: 175,
            weight: 70,
          }),
        })
      }

      toast.success(
        t('toasts.success', {
          businessName,
          teamCount: teams.length,
          staffCount: staff.length,
          playerCount: players.length,
        })
      )
      router.push(`/${businessSlug}/coach/dashboard`)
    } catch (err) {
      toast.error(t('toasts.error'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { label: t('steps.teams'), icon: Users, count: teams.length },
    { label: t('steps.staff'), icon: Shield, count: staff.length },
    { label: t('steps.players'), icon: UserPlus, count: players.length },
    { label: t('steps.summary'), icon: Check, count: 0 },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center flex-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {s.count > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{s.count}</Badge>}
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Step 0: Teams */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('titles.createTeams', { businessName })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder={t('placeholders.teamName')}
                onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              />
              <Select value={newTeamSport} onValueChange={setNewTeamSport}>
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORT_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addTeam} disabled={!newTeamName.trim()} size="sm" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {teams.length > 0 && (
              <div className="space-y-1">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {SPORT_TYPES.find((s) => s.value === t.sportType)?.label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                      onClick={() => setTeams(teams.filter((x) => x.id !== t.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)} disabled={teams.length === 0}>
                {t('actions.nextToStaff')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Staff */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('titles.inviteStaff')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder={tCommon('name')} />
              <Input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder={tCommon('email')} type="email" />
            </div>
            <div className="flex gap-2">
              <Select value={newStaffRole} onValueChange={setNewStaffRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addStaff} disabled={!newStaffName.trim() || !newStaffEmail.trim()} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                {t('actions.add')}
              </Button>
            </div>

            {/* Team assignment for team-scoped roles */}
            {['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'].includes(newStaffRole) && teams.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.assignToTeam')}</Label>
                <div className="flex flex-wrap gap-1">
                  {teams.map((t) => (
                    <button key={t.id} type="button"
                      onClick={() => setNewStaffTeams((prev) =>
                        prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                      )}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${
                        newStaffTeams.includes(t.id)
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >{t.name}</button>
                  ))}
                </div>
              </div>
            )}

            {staff.length > 0 && (
              <div className="space-y-1">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{s.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{s.email}</span>
                      <Badge variant="outline" className="text-[10px] ml-2">
                        {STAFF_ROLES.find((r) => r.value === s.role)?.label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                      onClick={() => setStaff(staff.filter((x) => x.id !== s.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>{tCommon('back')}</Button>
              <Button onClick={() => setStep(2)}>
                {t('actions.nextToPlayers')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Players */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('titles.addPlayers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder={t('placeholders.playerName')} />
              <Input value={newPlayerEmail} onChange={(e) => setNewPlayerEmail(e.target.value)} placeholder={t('placeholders.playerEmailOptional')} type="email" />
              <Select value={newPlayerTeam} onValueChange={setNewPlayerTeam}>
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectTeam')} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addPlayer} disabled={!newPlayerName.trim() || !newPlayerTeam} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t('actions.addPlayer')}
            </Button>

            {players.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {teams.map((team) => {
                  const teamPlayers = players.filter((p) => p.teamId === team.id)
                  if (teamPlayers.length === 0) return null
                  return (
                    <div key={team.id}>
                      <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">
                        {team.name} ({t('summary.teamPlayerCount', { count: teamPlayers.length })})
                      </p>
                      {teamPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-1.5 rounded-md bg-muted/50 text-sm">
                          <span>{p.name}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive"
                            onClick={() => setPlayers(players.filter((x) => x.id !== p.id))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {t('messages.playerManagement')}
            </p>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>{tCommon('back')}</Button>
              <Button onClick={() => setStep(3)}>
                {t('actions.nextToSummary')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              {t('titles.summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-2xl font-bold text-blue-600">{teams.length}</p>
                <p className="text-xs text-muted-foreground">{t('summary.labels.teams')}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/30">
                <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{staff.length}</p>
                <p className="text-xs text-muted-foreground">{t('summary.labels.staff')}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-2xl font-bold text-emerald-600">{players.length}</p>
                <p className="text-xs text-muted-foreground">{t('summary.labels.players')}</p>
              </div>
            </div>

            {teams.map((team) => {
              const teamStaff = staff.filter((s) => s.teamIds.includes(team.id))
              const teamPlayers = players.filter((p) => p.teamId === team.id)
              return (
                <div key={team.id} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{team.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {SPORT_TYPES.find((s) => s.value === team.sportType)?.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {teamStaff.length > 0 && <p>{t('summary.teamStaff', { names: teamStaff.map((s) => s.name).join(', ') })}</p>}
                    <p>{t('summary.teamPlayerCount', { count: teamPlayers.length })}</p>
                  </div>
                </div>
              )
            })}

            {staff.filter((s) => s.teamIds.length === 0).length > 0 && (
              <div className="p-3 rounded-lg border">
                <p className="font-semibold mb-1">{t('summary.overallStaff')}</p>
                <div className="text-xs text-muted-foreground">
                  {staff.filter((s) => s.teamIds.length === 0).map((s) => (
                    <p key={s.id}>{s.name} - {STAFF_ROLES.find((r) => r.value === s.role)?.label}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>{tCommon('back')}</Button>
              <Button onClick={handleFinish} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? t('actions.creating') : t('actions.createBusiness', { businessName })}
                <Check className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
