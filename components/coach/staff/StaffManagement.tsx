'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { UserPlus, Users, Shield, Dumbbell, Heart, Clipboard } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
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

const INVITABLE_ROLES = [
  { value: 'COACH', label: 'Huvudtränare', description: 'Full tillgång till coaching, program och AI' },
  { value: 'PHYSICAL_TRAINER', label: 'Fystränare', description: 'Träningsprogram, tester, intervaller för tilldelade lag' },
  { value: 'ASSISTANT_COACH', label: 'Assisterande tränare', description: 'Köra tester och intervaller, visa resultat' },
  { value: 'PHYSIO', label: 'Fysioterapeut', description: 'Skadehantering och rehabilitering' },
  { value: 'ADMIN', label: 'Sportchef', description: 'Personalhantering, full översikt, kalender' },
]

const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO']

interface StaffManagementProps {
  teams: Team[]
}

export function StaffManagement({ teams }: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Invite form
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('')
  const [invTeamIds, setInvTeamIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch {
      toast.error('Kunde inte hämta personal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleInvite = async () => {
    if (!invName.trim() || !invEmail.trim() || !invRole) {
      toast.error('Fyll i alla fält')
      return
    }

    setInviting(true)
    try {
      const res = await fetch('/api/coach/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invName.trim(),
          email: invEmail.trim(),
          role: invRole,
          teamIds: TEAM_SCOPED_ROLES.includes(invRole) ? invTeamIds : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.roleLabel} inbjuden!`)
        setInviteOpen(false)
        setInvName('')
        setInvEmail('')
        setInvRole('')
        setInvTeamIds([])
        fetchStaff()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Kunde inte bjuda in')
      }
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setInviting(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setInvTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Personal</h2>
          <p className="text-sm text-muted-foreground">{staff.length} medlemmar</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Bjud in
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bjud in personal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Förnamn Efternamn" />
              </div>

              <div className="space-y-2">
                <Label>E-post</Label>
                <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} type="email" placeholder="coach@example.com" />
              </div>

              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={invRole} onValueChange={setInvRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj roll..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((r) => (
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
                  <Label>Tilldela till lag</Label>
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
                    <p className="text-xs text-amber-600">Välj minst ett lag</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Avbryt</Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? 'Bjuder in...' : 'Bjud in'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => {
            const Icon = ROLE_ICONS[member.role] || Users
            const colorClass = ROLE_COLORS[member.role] || ROLE_COLORS.MEMBER
            return (
              <Card key={member.id}>
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
                    {member.teams.length > 0 && (
                      <div className="hidden sm:flex gap-1">
                        {member.teams.map((t) => (
                          <Badge key={t.id} variant="outline" className="text-[10px]">{t.name}</Badge>
                        ))}
                      </div>
                    )}
                    <Badge className={`text-[10px] ${colorClass} border-0`}>
                      {member.roleLabel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
