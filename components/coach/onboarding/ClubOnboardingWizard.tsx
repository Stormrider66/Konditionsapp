'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Building2, Users, UserPlus, Shield, Check, ChevronRight, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

const SPORT_TYPES = [
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SWIMMING', label: 'Simning' },
]

const STAFF_ROLES = [
  { value: 'COACH', label: 'Huvudtränare' },
  { value: 'PHYSICAL_TRAINER', label: 'Fystränare' },
  { value: 'ASSISTANT_COACH', label: 'Assisterande tränare' },
  { value: 'PHYSIO', label: 'Fysioterapeut' },
  { value: 'ADMIN', label: 'Sportchef' },
]

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

      toast.success(`${businessName} är redo! ${teams.length} lag, ${staff.length} personal, ${players.length} spelare skapade.`)
      router.push(`/${businessSlug}/coach/dashboard`)
    } catch (err) {
      toast.error('Något gick fel. Försök igen.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { label: 'Lag', icon: Users, count: teams.length },
    { label: 'Personal', icon: Shield, count: staff.length },
    { label: 'Spelare', icon: UserPlus, count: players.length },
    { label: 'Klar', icon: Check, count: 0 },
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
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
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
              Skapa lag för {businessName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Lagnamn, t.ex. J18, J20, SHL"
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
                Nästa: Personal <ChevronRight className="h-4 w-4 ml-1" />
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
              Bjud in personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Namn" />
              <Input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="E-post" type="email" />
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
                Lägg till
              </Button>
            </div>

            {/* Team assignment for team-scoped roles */}
            {['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'].includes(newStaffRole) && teams.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Tilldela till lag:</Label>
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
              <Button variant="outline" onClick={() => setStep(0)}>Tillbaka</Button>
              <Button onClick={() => setStep(2)}>
                Nästa: Spelare <ChevronRight className="h-4 w-4 ml-1" />
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
              Lägg till spelare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Spelarnamn" />
              <Input value={newPlayerEmail} onChange={(e) => setNewPlayerEmail(e.target.value)} placeholder="E-post (valfritt)" type="email" />
              <Select value={newPlayerTeam} onValueChange={setNewPlayerTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj lag..." />
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
              Lägg till spelare
            </Button>

            {players.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {teams.map((team) => {
                  const teamPlayers = players.filter((p) => p.teamId === team.id)
                  if (teamPlayers.length === 0) return null
                  return (
                    <div key={team.id}>
                      <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">{team.name} ({teamPlayers.length})</p>
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
              Du kan även lägga till spelare senare från atlethanteringen.
            </p>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Tillbaka</Button>
              <Button onClick={() => setStep(3)}>
                Nästa: Sammanfattning <ChevronRight className="h-4 w-4 ml-1" />
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
              <Check className="h-5 w-5 text-green-600" />
              Sammanfattning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-2xl font-bold text-blue-600">{teams.length}</p>
                <p className="text-xs text-muted-foreground">Lag</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <p className="text-2xl font-bold text-purple-600">{staff.length}</p>
                <p className="text-xs text-muted-foreground">Personal</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className="text-2xl font-bold text-green-600">{players.length}</p>
                <p className="text-xs text-muted-foreground">Spelare</p>
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
                    {teamStaff.length > 0 && <p>Personal: {teamStaff.map((s) => s.name).join(', ')}</p>}
                    <p>{teamPlayers.length} spelare</p>
                  </div>
                </div>
              )
            })}

            {staff.filter((s) => s.teamIds.length === 0).length > 0 && (
              <div className="p-3 rounded-lg border">
                <p className="font-semibold mb-1">Övergripande personal</p>
                <div className="text-xs text-muted-foreground">
                  {staff.filter((s) => s.teamIds.length === 0).map((s) => (
                    <p key={s.id}>{s.name} - {STAFF_ROLES.find((r) => r.value === s.role)?.label}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Tillbaka</Button>
              <Button onClick={handleFinish} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? 'Skapar...' : `Skapa ${businessName}`}
                <Check className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
