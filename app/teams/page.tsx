'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamForm } from '@/components/forms/TeamForm'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Trash2, Edit2, Users, Plus, ArrowLeft } from 'lucide-react'
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

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    fetchTeams()
  }, [])

  const fetchTeams = async () => {
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
  }

  const handleTeamSuccess = (team: Team) => {
    if (editingTeam) {
      setTeams(teams.map((t) => (t.id === team.id ? team : t)))
      setEditingTeam(null)
    } else {
      setTeams([team, ...teams])
    }
    setShowForm(false)
  }

  const handleDeleteClick = (team: Team) => {
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

      <div className="lg:hidden gradient-primary text-white shadow-lg py-4 px-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Lag & Klubbar</h1>
            <p className="text-white/90 text-sm mt-1">Hantera dina lag</p>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="hidden lg:block gradient-primary text-white shadow-lg py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Lag & Klubbar</h1>
            <p className="text-white/90 mt-1">Hantera dina lag och klubbar</p>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Hem
            </Button>
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 lg:py-12">
        {showForm ? (
          <div>
            <TeamForm
              team={editingTeam || undefined}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl">{team.name}</h3>
                          {team.description && (
                            <p className="text-sm text-gray-500 font-normal mt-1">
                              {team.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingTeam(team)
                              setShowForm(true)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Redigera lag"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(team)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Ta bort lag"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>
                            {team.members && team.members.length > 0
                              ? `${team.members.length} medlemmar`
                              : 'Inga medlemmar'}
                          </span>
                        </div>
                        {team.members && team.members.length > 0 && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Medlemmar:</p>
                            <ul className="space-y-1">
                              {team.members.slice(0, 5).map((member) => (
                                <li key={member.id} className="text-sm text-gray-700">
                                  {member.name}
                                </li>
                              ))}
                              {team.members.length > 5 && (
                                <li className="text-sm text-gray-500 italic">
                                  +{team.members.length - 5} till
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
