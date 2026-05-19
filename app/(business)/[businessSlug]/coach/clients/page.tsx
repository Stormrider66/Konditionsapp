// app/(business)/[businessSlug]/coach/clients/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import type { Client, Team } from '@/types'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingTable } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { MoreVertical, UserPlus, Eye, Trash2, Phone, Mail, Download, UserCircle, Check, CircleAlert } from 'lucide-react'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { exportClientsToCSV } from '@/lib/utils/csv-export'
import { useLocale, useTranslations } from '@/i18n/client'

type RegistryClient = Client & {
  athleteAccount?: unknown
}

type ClientReadiness = 'ready' | 'missingAccount' | 'missingContact'

export default function BusinessClientsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/coach/clients`
  const t = useTranslations('coach.pages.clients')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? sv : enUS

  const [clients, setClients] = useState<RegistryClient[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<RegistryClient | null>(null)
  const { toast } = useToast()

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients', {
        headers: { 'x-business-slug': businessSlug },
      })
      const result = await response.json()

      if (result.success) {
        setClients(result.data)
      } else {
        setError(result.error || t('errors.fetchFailed'))
      }
    } catch (err) {
      setError(t('errors.network'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [businessSlug, t])

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams', {
        headers: { 'x-business-slug': businessSlug },
      })
      const result = await response.json()
      if (result.success) {
        setTeams(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }, [businessSlug])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchClients()
      void fetchTeams()
    })
  }, [fetchClients, fetchTeams])

  const handleDeleteClick = (client: RegistryClient) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return

    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-business-slug': businessSlug },
      })

      if (response.ok) {
        setClients(clients.filter((c) => c.id !== clientToDelete.id))
        toast({
          title: t('toasts.deletedTitle'),
          description: t('toasts.deletedDescription', { name: clientToDelete.name }),
        })
      } else {
        toast({
          title: t('toasts.errorTitle'),
          description: t('errors.deleteFailed'),
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: t('toasts.networkErrorTitle'),
        description: t('errors.retry'),
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      client.name.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search)

    const matchesTeam =
      teamFilter === 'all' ||
      (teamFilter === 'none' && !client.teamId) ||
      client.teamId === teamFilter

    return matchesSearch && matchesTeam
  })
  const visibleReadyClients = filteredClients.filter((client) => client.athleteAccount && (client.email || client.phone)).length
  const visibleMissingAccountClients = filteredClients.filter((client) => !client.athleteAccount).length
  const visibleMissingContactClients = filteredClients.filter((client) => !client.email && !client.phone).length

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getClientReadiness = (client: RegistryClient): ClientReadiness => {
    if (!client.athleteAccount) return 'missingAccount'
    if (!client.email && !client.phone) return 'missingContact'
    return 'ready'
  }

  const getClientReadinessLabel = (status: ClientReadiness) => {
    if (status === 'ready') return t('readiness.ready')
    if (status === 'missingAccount') return t('readiness.missingAccount')
    return t('readiness.missingContact')
  }

  const getClientReadinessDescription = (status: ClientReadiness) => {
    if (status === 'ready') return t('readiness.readyDescription')
    if (status === 'missingAccount') return t('readiness.missingAccountDescription')
    return t('readiness.missingContactDescription')
  }

  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      toast({
        title: t('toasts.noExportDataTitle'),
        description: t('toasts.noExportDataDescription'),
        variant: 'destructive',
      })
      return
    }

    try {
      exportClientsToCSV(filteredClients)
      toast({
        title: t('toasts.exportSuccessTitle'),
        description: t('toasts.exportSuccessDescription', { count: filteredClients.length }),
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: t('toasts.exportErrorTitle'),
        description: t('toasts.exportErrorDescription'),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">{t('title')}</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm lg:text-base">
          {t('description')}
        </p>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{t('errors.inlinePrefix')} {error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <GlassCard glow="blue">
            <GlassCardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('summary.visible')}</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{filteredClients.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('summary.visibleDescription')}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard glow="emerald">
            <GlassCardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('summary.ready')}</p>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300 mt-1">{visibleReadyClients}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('summary.readyDescription')}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard glow="amber">
            <GlassCardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('summary.missingAccount')}</p>
              <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300 mt-1">{visibleMissingAccountClients}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('summary.missingAccountDescription')}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard glow="blue">
            <GlassCardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('summary.missingContact')}</p>
              <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300 mt-1">{visibleMissingContactClients}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('summary.missingContactDescription')}</p>
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      <GlassCard glow="blue">
        <GlassCardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <GlassCardTitle>{t('allClients')}</GlassCardTitle>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('showingFiltered', { filtered: filteredClients.length, total: clients.length })}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial sm:min-w-[300px]">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm('')}
                />
              </div>
              <div className="sm:min-w-[180px]">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('teamFilter.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('teamFilter.all')}</SelectItem>
                    <SelectItem value="none">{t('teamFilter.none')}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('actions.exportCsv')}
                </Button>
                <Link href={`${basePath}/new`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('actions.newClient')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {loading ? (
            <LoadingTable />
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? t('empty.noSearchResults') : t('empty.noClients')}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredClients.map((client) => {
                  const readiness = getClientReadiness(client)

                  return (
                    <GlassCard key={client.id} className="hover:shadow-md transition">
                      <GlassCardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate dark:text-slate-100">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('ageYears', { age: calculateAge(client.birthDate) })}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`${basePath}/${client.id}`} className="cursor-pointer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t('actions.view')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`${basePath}/${client.id}?tab=profile`} className="cursor-pointer">
                                  <UserCircle className="w-4 h-4 mr-2" />
                                  {t('actions.fullProfile')}
                                </Link>
                              </DropdownMenuItem>
                              {client.athleteAccount ? (
                                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                  <CreateAthleteAccountDialog
                                    clientId={client.id}
                                    clientName={client.name}
                                    clientEmail={client.email}
                                    clientPhone={client.phone}
                                    hasExistingAccount
                                    onAccountCreated={() => {
                                      void fetchClients()
                                    }}
                                    trigger={
                                      <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                        <Mail className="w-4 h-4 mr-2" />
                                        {t('actions.sendInvite')}
                                      </button>
                                    }
                                  />
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                  <CreateAthleteAccountDialog
                                    clientId={client.id}
                                    clientName={client.name}
                                    clientEmail={client.email}
                                    clientPhone={client.phone}
                                    hasExistingAccount={false}
                                    onAccountCreated={() => {
                                      void fetchClients()
                                    }}
                                    trigger={
                                      <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        {t('actions.createAthleteAccount')}
                                      </button>
                                    }
                                  />
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(client)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            readiness === 'ready'
                              ? 'mb-3 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'mb-3 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                          }
                        >
                          {readiness === 'ready' ? <Check className="w-3 h-3 mr-1" /> : <CircleAlert className="w-3 h-3 mr-1" />}
                          {getClientReadinessLabel(readiness)}
                        </Badge>
                        <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t('fields.gender')}:</span>
                          <Badge variant={client.gender === 'MALE' ? 'default' : 'secondary'}>
                            {client.gender === 'MALE' ? t('gender.male') : t('gender.female')}
                          </Badge>
                        </div>
                        {client.team && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('fields.team')}:</span>
                            <Badge variant="outline">{client.team.name}</Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t('fields.athleteAccount')}:</span>
                          {client.athleteAccount ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              {t('account.active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              {t('account.missing')}
                            </Badge>
                          )}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs pt-2 border-t">
                          {t('updatedAt', { date: format(new Date(client.updatedAt), 'PPP', { locale: dateLocale }) })}
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/10">
                      <TableHead>{t('table.client')}</TableHead>
                      <TableHead>{t('table.coachStatus')}</TableHead>
                      <TableHead>{t('table.age')}</TableHead>
                      <TableHead>{t('table.gender')}</TableHead>
                      <TableHead>{t('table.team')}</TableHead>
                      <TableHead>{t('table.email')}</TableHead>
                      <TableHead>{t('table.athleteAccount')}</TableHead>
                      <TableHead>{t('table.lastUpdated')}</TableHead>
                      <TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const readiness = getClientReadiness(client)

                      return (
                        <TableRow key={client.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium dark:text-slate-100">{client.name}</span>
                            </div>
                          </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={
                                readiness === 'ready'
                                  ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                  : 'w-fit border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                              }
                            >
                              {readiness === 'ready' ? <Check className="w-3 h-3 mr-1" /> : <CircleAlert className="w-3 h-3 mr-1" />}
                              {getClientReadinessLabel(readiness)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{getClientReadinessDescription(readiness)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{t('ageYears', { age: calculateAge(client.birthDate) })}</TableCell>
                        <TableCell>
                          <Badge variant={client.gender === 'MALE' ? 'default' : 'secondary'}>
                            {client.gender === 'MALE' ? t('gender.male') : t('gender.female')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.team ? (
                            <Badge variant="outline">{client.team.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.email || '-'}
                        </TableCell>
                        <TableCell>
                          {client.athleteAccount ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                <Check className="w-3 h-3 mr-1" />
                                {t('account.active')}
                              </Badge>
                              <CreateAthleteAccountDialog
                                clientId={client.id}
                                clientName={client.name}
                                clientEmail={client.email}
                                clientPhone={client.phone}
                                hasExistingAccount
                                onAccountCreated={() => {
                                  void fetchClients()
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="h-7 text-xs">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {t('actions.invite')}
                                  </Button>
                                }
                              />
                            </div>
                          ) : (
                            <CreateAthleteAccountDialog
                              clientId={client.id}
                              clientName={client.name}
                              clientEmail={client.email}
                              clientPhone={client.phone}
                              hasExistingAccount={false}
                              onAccountCreated={() => {
                                void fetchClients()
                              }}
                              trigger={
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  {t('actions.create')}
                                </Button>
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(client.updatedAt), 'PPP', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`${basePath}/${client.id}`}
                                  className="cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t('actions.view')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`${basePath}/${client.id}?tab=profile`}
                                  className="cursor-pointer"
                                >
                                  <UserCircle className="w-4 h-4 mr-2" />
                                  {t('actions.fullProfile')}
                                </Link>
                              </DropdownMenuItem>
                              {client.athleteAccount ? (
                                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                  <CreateAthleteAccountDialog
                                    clientId={client.id}
                                    clientName={client.name}
                                    clientEmail={client.email}
                                    clientPhone={client.phone}
                                    hasExistingAccount
                                    onAccountCreated={() => {
                                      void fetchClients()
                                    }}
                                    trigger={
                                      <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                        <Mail className="w-4 h-4 mr-2" />
                                        {t('actions.sendInvite')}
                                      </button>
                                    }
                                  />
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                  <CreateAthleteAccountDialog
                                    clientId={client.id}
                                    clientName={client.name}
                                    clientEmail={client.email}
                                    clientPhone={client.phone}
                                    hasExistingAccount={false}
                                    onAccountCreated={() => {
                                      void fetchClients()
                                    }}
                                    trigger={
                                      <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        {t('actions.createAthleteAccount')}
                                      </button>
                                    }
                                  />
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(client)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </GlassCardContent>
      </GlassCard>

      <GlassCard className="mt-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30" glow="blue">
        <GlassCardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{t('tips.prefix')}</strong> {t('tips.text')}
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('deleteDialog.description', {
                name: clientToDelete?.name ?? '',
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t('actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
