// app/(business)/[businessSlug]/coach/organizations/OrganizationsClient.tsx
'use client'

/**
 * Business-scoped Organizations Page Client
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OrganizationDayPrintDialog } from '@/components/coach/organizations/OrganizationDayPrintDialog'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import { useTranslations } from '@/i18n/client'
import { getSportLabelKey, TEAM_AND_RACKET_SPORT_OPTIONS } from '@/lib/sports/catalog'
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
  Printer,
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

interface OrganizationsClientProps {
  basePath?: string
}

export default function OrganizationsClient({ basePath = '/coach' }: OrganizationsClientProps) {
  const t = useTranslations('coach.pages.organizations')
  const tSports = useTranslations('sports')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printOrganizationId, setPrintOrganizationId] = useState<string | null>(null)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sportType, setSportType] = useState('')
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(basePath), [basePath])

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations', {
        headers: businessHeaders || undefined,
      })
      const result = await response.json()

      if (result.success) {
        setOrganizations(result.data || [])
      } else {
        toast.error(t('toasts.fetchFailed'))
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error(t('toasts.fetchNetworkFailed'))
    } finally {
      setLoading(false)
    }
  }, [businessHeaders, t])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchOrganizations()
    })
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

  const handleOpenPrintDialog = (organizationId?: string) => {
    setPrintOrganizationId(organizationId || null)
    setPrintDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('toasts.nameRequired'))
      return
    }

    setSaving(true)
    try {
      const url = editingOrg ? `/api/organizations/${editingOrg.id}` : '/api/organizations'
      const method = editingOrg ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...businessHeaders,
        },
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
          toast.success(t('toasts.updated'))
        } else {
          setOrganizations([result.data, ...organizations])
          toast.success(t('toasts.created'))
        }
        handleCloseDialog()
      } else {
        toast.error(result.error || t('toasts.saveFailed'))
      }
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error(t('toasts.unexpectedError'))
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
        headers: businessHeaders || undefined,
      })

      const result = await response.json()

      if (result.success) {
        setOrganizations(organizations.filter((o) => o.id !== orgToDelete.id))
        toast.success(t('toasts.deleted'))
      } else {
        toast.error(result.error || t('toasts.deleteFailed'))
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error(t('toasts.unexpectedError'))
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
          <h1 className="font-display text-3xl font-bold flex items-center gap-2 dark:text-white">
            <Building2 className="h-8 w-8" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => handleOpenPrintDialog()}>
            <Printer className="mr-2 h-4 w-4" />
            {t('printToday')}
          </Button>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newOrganization')}
          </Button>
        </div>
      </div>

      <OrganizationDayPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        organizations={organizations}
        basePath={basePath}
        selectedOrganizationId={printOrganizationId}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <RolePanel>
          <div className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('stats.organizations')}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{organizations.length}</p>
          </div>
        </RolePanel>
        <RolePanel>
          <div className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('stats.totalTeams')}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{totalTeams}</p>
          </div>
        </RolePanel>
        <RolePanel>
          <div className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('stats.totalPlayers')}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{totalMembers}</p>
          </div>
        </RolePanel>
      </div>

      {/* Organizations List */}
      {loading ? (
        <RolePanel>
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </RolePanel>
      ) : organizations.length === 0 ? (
        <RolePanel>
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 dark:text-white">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('emptyDescription')}
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirst')}
            </Button>
          </div>
        </RolePanel>
      ) : (
        <div className="space-y-6">
          {organizations.map((org) => (
            <RolePanel key={org.id} className="overflow-hidden">
              <div className="border-b border-zinc-200 bg-muted/30 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-zinc-50">
                        {org.name}
                        {org.sportType && (
                          <Badge variant="secondary" className="text-xs">
                            {getSportLabelKey(org.sportType) ? tSports(getSportLabelKey(org.sportType)!) : org.sportType}
                          </Badge>
                        )}
                      </h3>
                      {org.description && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{org.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPrintDialog(org.id)}
                      title={t('printToday')}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
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
              </div>
              <div className="p-5 pt-4">
                {org.teams && org.teams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      {t('teamCount', { count: org.teams.length })}
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
                              {t('playerCount', { count: team.members?.length || 0 })}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noTeams.prefix')}{' '}
                    <Link href={`${basePath}/teams`} className="text-primary hover:underline">
                      {t('noTeams.link')}
                    </Link>{' '}
                    {t('noTeams.suffix')}
                  </p>
                )}
              </div>
            </RolePanel>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? t('dialog.editTitle') : t('dialog.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingOrg
                ? t('dialog.editDescription')
                : t('dialog.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('fields.name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('placeholders.name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('fields.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('placeholders.description')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sportType">{t('fields.sport')}</Label>
              <Select value={sportType} onValueChange={setSportType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.sport')} />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_AND_RACKET_SPORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {tSports(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('actions.saving')}
                </>
              ) : editingOrg ? (
                t('actions.saveChanges')
              ) : (
                t('actions.create')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { organizationName: orgToDelete?.name ?? '' })}
              {orgToDelete?.teams && orgToDelete.teams.length > 0 && (
                <>
                  <br />
                  <br />
                  <strong>{t('deleteDialog.warningPrefix')}</strong> {t('deleteDialog.warning', { count: orgToDelete.teams.length })}
                </>
              )}
              <br />
              <br />
              {t('deleteDialog.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? t('actions.deleting') : t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
