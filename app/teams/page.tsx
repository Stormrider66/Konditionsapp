'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamForm } from '@/components/forms/TeamForm'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Trash2, Edit2, Users, Plus, ArrowLeft, BarChart3, Building2 } from 'lucide-react'
import type { Team } from '@/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Team type with simplified organization (API returns partial)
interface TeamWithPartialOrg {
  id: string
  userId: string
  name: string
  description?: string
  organizationId?: string | null
  sportType?: string | null
  organization?: {
    id: string
    name: string
  } | null
  members?: { id: string; name: string }[]
  createdAt: Date
  updatedAt: Date
}

// Use this for teams in this page
type ExtendedTeam = TeamWithPartialOrg

// Sport type labels in Swedish
const sportTypeLabels: Record<string, string> = {
  TEAM_FOOTBALL: 'Fotboll',
  TEAM_ICE_HOCKEY: 'Ishockey',
  TEAM_HANDBALL: 'Handboll',
  TEAM_FLOORBALL: 'Innebandy',
}

// TeamCard component for consistent rendering
function TeamCard({
  team,
  onEdit,
  onDelete,
}: {
  team: ExtendedTeam
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="hover:shadow-lg transition">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{team.name}</h3>
              {team.sportType && (
                <Badge variant="secondary" className="text-xs">
                  {sportTypeLabels[team.sportType] || team.sportType}
                </Badge>
              )}
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground font-normal">{team.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Link href={`/coach/teams/${team.id}`}>
              <Button variant="ghost" size="sm" title="Visa dashboard">
                <BarChart3 className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onEdit} title="Redigera lag">
              <Edit2 className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Ta bort lag"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {team.members && team.members.length > 0
                ? `${team.members.length} spelare`
                : 'Inga spelare'}
            </span>
          </div>
          {team.members && team.members.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Spelare:</p>
              <ul className="space-y-1">
                {team.members.slice(0, 5).map((member) => (
                  <li key={member.id} className="text-sm">
                    {member.name}
                  </li>
                ))}
                {team.members.length > 5 && (
                  <li className="text-sm text-muted-foreground italic">
                    +{team.members.length - 5} till
                  </li>
                )}
              </ul>
            </div>
          )}
          <Link href={`/coach/teams/${team.id}`} className="block pt-2">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <BarChart3 className="w-4 h-4" />
              Visa dashboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<ExtendedTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ExtendedTeam | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<ExtendedTeam | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  // Group teams by organization
  const groupedTeams = useMemo(() => {
    const groups: Record<string, ExtendedTeam[]> = {}
    const noOrg: ExtendedTeam[] = []

    teams.forEach((team) => {
      if (team.organization) {
        const orgName = team.organization.name
        if (!groups[orgName]) {
          groups[orgName] = []
        }
        groups[orgName].push(team)
      } else {
        noOrg.push(team)
      }
    })

    return { groups, noOrg }
  }, [teams])

  const hasOrganizations = Object.keys(groupedTeams.groups).length > 0

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teams')
      const result = await response.json()

      if (result.success) {
        setTeams(result.data || [])
      } else {
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta lag',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Fel',
        description: 'Nätverksfel vid hämtning av lag',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    fetchTeams()
  }, [fetchTeams])

  const handleTeamSuccess = (team: Team) => {
    // API returns partial organization, cast accordingly
    const extendedTeam = team as ExtendedTeam
    if (editingTeam) {
      setTeams(teams.map((t) => (t.id === team.id ? extendedTeam : t)))
      setEditingTeam(null)
    } else {
      setTeams([extendedTeam, ...teams])
    }
    setShowForm(false)
  }

  const handleDeleteClick = (team: ExtendedTeam) => {
    setTeamToDelete(team)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/teams/${teamToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setTeams(teams.filter((t) => t.id !== teamToDelete.id))
        toast({
          title: 'Lag borttaget',
          description: 'Laget har tagits bort',
        })
      } else {
        throw new Error(result.error || 'Kunde inte ta bort laget')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte ta bort laget',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setTeamToDelete(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 lg:py-12">
        {showForm ? (
          <div>
            <TeamForm
              team={(editingTeam as Team) || undefined}
              onSuccess={handleTeamSuccess}
              onCancel={() => {
                setShowForm(false)
                setEditingTeam(null)
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mina lag</h2>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nytt lag
              </Button>
            </div>

            {/* Quick links */}
            <div className="flex gap-2">
              <Link href="/coach/organizations">
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Organisationer
                </Button>
              </Link>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p>Laddar lag...</p>
                </CardContent>
              </Card>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">Du har inte skapat några lag än</p>
                  <Button onClick={() => setShowForm(true)}>Skapa första laget</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Teams grouped by organization */}
                {hasOrganizations &&
                  Object.entries(groupedTeams.groups).map(([orgName, orgTeams]) => (
                    <div key={orgName} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{orgName}</h3>
                        <Badge variant="secondary">{orgTeams.length} lag</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orgTeams.map((team) => (
                          <TeamCard
                            key={team.id}
                            team={team}
                            onEdit={() => {
                              setEditingTeam(team)
                              setShowForm(true)
                            }}
                            onDelete={() => handleDeleteClick(team)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                {/* Teams without organization */}
                {groupedTeams.noOrg.length > 0 && (
                  <div className="space-y-4">
                    {hasOrganizations && (
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Fristående lag</h3>
                        <Badge variant="outline">{groupedTeams.noOrg.length} lag</Badge>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedTeams.noOrg.map((team) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          onEdit={() => {
                            setEditingTeam(team)
                            setShowForm(true)
                          }}
                          onDelete={() => handleDeleteClick(team)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att permanent ta bort laget &quot;{teamToDelete?.name}&quot;. Medlemmarna
              kommer inte att tas bort, bara kopplingen till laget.
              <br />
              <br />
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
