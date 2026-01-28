// app/(business)/[businessSlug]/coach/organizations/OrganizationsClient.tsx
'use client'

/**
 * Business-scoped Organizations Page Client
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import {
  Plus,
  Building2,
  Users,
  Edit2,
  Trash2,
  Loader2,
  ChevronRight,
  Trophy,
} from 'lucide-react'

interface Team {
  id: string
  name: string
  members?: { id: string }[]
}

interface Organization {
  id: string
  name: string
  description?: string
  sportType?: string
  teams?: Team[]
  createdAt: string
  updatedAt: string
}

// Sport type labels in Swedish
const sportTypeLabels: Record<string, string> = {
  TEAM_FOOTBALL: 'Fotboll',
  TEAM_ICE_HOCKEY: 'Ishockey',
  TEAM_HANDBALL: 'Handboll',
  TEAM_FLOORBALL: 'Innebandy',
}

const sportTypeOptions = [
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
]

interface OrganizationsClientProps {
  basePath?: string
}

export default function OrganizationsClient({ basePath = '/coach' }: OrganizationsClientProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sportType, setSportType] = useState('')

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')
      const result = await response.json()

      if (result.success) {
        setOrganizations(result.data || [])
      } else {
        toast.error('Kunde inte hämta organisationer')
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Nätverksfel vid hämtning av organisationer')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const resetForm = () => {
    setName('')
    setDescription('')
    setSportType('')
    setEditingOrg(null)
  }

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org)
      setName(org.name)
      setDescription(org.description || '')
      setSportType(org.sportType || '')
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Namn krävs')
      return
    }

    setSaving(true)
    try {
      const url = editingOrg ? `/api/organizations/${editingOrg.id}` : '/api/organizations'
      const method = editingOrg ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          sportType: sportType || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (editingOrg) {
          setOrganizations(
            organizations.map((o) => (o.id === editingOrg.id ? result.data : o))
          )
          toast.success('Organisation uppdaterad')
        } else {
          setOrganizations([result.data, ...organizations])
          toast.success('Organisation skapad')
        }
        handleCloseDialog()
      } else {
        toast.error(result.error || 'Kunde inte spara organisationen')
      }
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error('Ett oväntat fel inträffade')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (org: Organization) => {
    setOrgToDelete(org)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/organizations/${orgToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setOrganizations(organizations.filter((o) => o.id !== orgToDelete.id))
        toast.success('Organisation borttagen')
      } else {
        toast.error(result.error || 'Kunde inte ta bort organisationen')
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error('Ett oväntat fel inträffade')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setOrgToDelete(null)
    }
  }

  const totalTeams = organizations.reduce(
    (sum, org) => sum + (org.teams?.length || 0),
    0
  )
  const totalMembers = organizations.reduce(
    (sum, org) =>
      sum +
      (org.teams?.reduce((teamSum, team) => teamSum + (team.members?.length || 0), 0) || 0),
    0
  )

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
            <Building2 className="h-8 w-8" />
            Organisationer
          </h1>
          <p className="text-muted-foreground mt-1">
            Hantera klubbar och föreningar med flera lag
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Ny organisation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Organisationer</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{organizations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Lag totalt</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{totalTeams}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Spelare totalt</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{totalMembers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Organizations List */}
      {loading ? (
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Laddar organisationer...</p>
          </CardContent>
        </Card>
      ) : organizations.length === 0 ? (
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 dark:text-white">Inga organisationer ännu</h3>
            <p className="text-muted-foreground mb-4">
              Skapa en organisation för att gruppera dina lag (t.ex. &quot;IFK Göteborg&quot; med U19, U21, Senior).
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Skapa första organisationen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {organizations.map((org) => (
            <Card key={org.id} className="overflow-hidden dark:bg-slate-900/50 dark:border-white/10">
              <CardHeader className="bg-muted/30 dark:bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        {org.name}
                        {org.sportType && (
                          <Badge variant="secondary" className="text-xs">
                            {sportTypeLabels[org.sportType] || org.sportType}
                          </Badge>
                        )}
                      </CardTitle>
                      {org.description && (
                        <CardDescription className="mt-1">{org.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(org)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(org)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {org.teams && org.teams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      {org.teams.length} lag
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {org.teams.map((team) => (
                        <Link
                          key={team.id}
                          href={`${basePath}/teams/${team.id}`}
                          className="flex items-center justify-between p-3 bg-muted/50 dark:bg-white/5 rounded-lg hover:bg-muted dark:hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium dark:text-slate-200">{team.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {team.members?.length || 0} spelare
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Inga lag i denna organisation.{' '}
                    <Link href={`${basePath}/teams`} className="text-primary hover:underline">
                      Gå till lag
                    </Link>{' '}
                    för att koppla lag till organisationen.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? 'Redigera organisation' : 'Ny organisation'}
            </DialogTitle>
            <DialogDescription>
              {editingOrg
                ? 'Uppdatera organisationens uppgifter.'
                : 'Skapa en organisation för att gruppera flera lag.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. IFK Göteborg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kort beskrivning av organisationen..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sportType">Sport</Label>
              <Select value={sportType} onValueChange={setSportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj sport..." />
                </SelectTrigger>
                <SelectContent>
                  {sportTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : editingOrg ? (
                'Spara ändringar'
              ) : (
                'Skapa organisation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att ta bort organisationen &quot;{orgToDelete?.name}&quot;.
              {orgToDelete?.teams && orgToDelete.teams.length > 0 && (
                <>
                  <br />
                  <br />
                  <strong>Varning:</strong> Lagen ({orgToDelete.teams.length} st) kommer att bli
                  fristående men inte tas bort.
                </>
              )}
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
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
