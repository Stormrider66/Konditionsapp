// app/(business)/[businessSlug]/coach/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
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
import { MoreVertical, UserPlus, Eye, Trash2, Phone, Mail, Download, UserCircle, Check } from 'lucide-react'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { exportClientsToCSV } from '@/lib/utils/csv-export'

export default function BusinessClientsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/coach/clients`

  const [clients, setClients] = useState<Client[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchClients()
    fetchTeams()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients')
      const result = await response.json()

      if (result.success) {
        setClients(result.data)
      } else {
        setError(result.error || 'Failed to fetch clients')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const result = await response.json()
      if (result.success) {
        setTeams(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return

    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setClients(clients.filter((c) => c.id !== clientToDelete.id))
        toast({
          title: 'Klient borttagen',
          description: `${clientToDelete.name} har tagits bort från registret.`,
        })
      } else {
        toast({
          title: 'Fel',
          description: 'Kunde inte ta bort klienten.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Nätverksfel',
        description: 'Något gick fel. Försök igen.',
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

  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      toast({
        title: 'Ingen data att exportera',
        description: 'Det finns inga klienter att exportera.',
        variant: 'destructive',
      })
      return
    }

    try {
      exportClientsToCSV(filteredClients)
      toast({
        title: 'Export lyckades!',
        description: `${filteredClients.length} klienter exporterades till CSV.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Exportfel',
        description: 'Kunde inte exportera klienter.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Klientregister</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm lg:text-base">
          Hantera klienter och deras testhistorik
        </p>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Fel: {error}</AlertDescription>
        </Alert>
      )}

      <GlassCard>
        <GlassCardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <GlassCardTitle>Alla klienter</GlassCardTitle>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-1">
                  Visar {filteredClients.length} av {clients.length} klienter
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial sm:min-w-[300px]">
                <SearchInput
                  placeholder="Sök namn, e-post eller telefon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm('')}
                />
              </div>
              <div className="sm:min-w-[180px]">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrera lag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla lag</SelectItem>
                    <SelectItem value="none">Inget lag</SelectItem>
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
                  Exportera CSV
                </Button>
                <Link href={`${basePath}/new`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ny Klient
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
              {searchTerm ? 'Inga klienter matchade sökningen' : 'Inga klienter ännu'}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredClients.map((client) => (
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
                              {calculateAge(client.birthDate)} år
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
                                Visa
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`${basePath}/${client.id}/profile`} className="cursor-pointer">
                                <UserCircle className="w-4 h-4 mr-2" />
                                Fullständig profil
                              </Link>
                            </DropdownMenuItem>
                            {!(client as any).athleteAccount && (
                              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                <CreateAthleteAccountDialog
                                  clientId={client.id}
                                  clientName={client.name}
                                  clientEmail={client.email}
                                  hasExistingAccount={false}
                                  onAccountCreated={fetchClients}
                                  trigger={
                                    <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                      <UserPlus className="w-4 h-4 mr-2" />
                                      Skapa atletkonto
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
                              Ta bort
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Kön:</span>
                          <Badge variant={client.gender === 'MALE' ? 'default' : 'secondary'}>
                            {client.gender === 'MALE' ? 'Man' : 'Kvinna'}
                          </Badge>
                        </div>
                        {client.team && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Lag:</span>
                            <Badge variant="outline">{client.team.name}</Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Atletkonto:</span>
                          {(client as any).athleteAccount ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              Aktivt
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Saknas
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
                          Uppdaterad: {format(new Date(client.updatedAt), 'PPP', { locale: sv })}
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/10">
                      <TableHead>Klient</TableHead>
                      <TableHead>Ålder</TableHead>
                      <TableHead>Kön</TableHead>
                      <TableHead>Lag</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Atletkonto</TableHead>
                      <TableHead>Senast uppdaterad</TableHead>
                      <TableHead className="text-right">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium dark:text-slate-100">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{calculateAge(client.birthDate)} år</TableCell>
                        <TableCell>
                          <Badge variant={client.gender === 'MALE' ? 'default' : 'secondary'}>
                            {client.gender === 'MALE' ? 'Man' : 'Kvinna'}
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
                          {(client as any).athleteAccount ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              Aktivt
                            </Badge>
                          ) : (
                            <CreateAthleteAccountDialog
                              clientId={client.id}
                              clientName={client.name}
                              clientEmail={client.email}
                              hasExistingAccount={false}
                              onAccountCreated={fetchClients}
                              trigger={
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  Skapa
                                </Button>
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(client.updatedAt), 'PPP', { locale: sv })}
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
                                  Visa
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`${basePath}/${client.id}/profile`}
                                  className="cursor-pointer"
                                >
                                  <UserCircle className="w-4 h-4 mr-2" />
                                  Fullständig profil
                                </Link>
                              </DropdownMenuItem>
                              {!(client as any).athleteAccount && (
                                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                                  <CreateAthleteAccountDialog
                                    clientId={client.id}
                                    clientName={client.name}
                                    clientEmail={client.email}
                                    hasExistingAccount={false}
                                    onAccountCreated={fetchClients}
                                    trigger={
                                      <button className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Skapa atletkonto
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
                                Ta bort
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </GlassCardContent>
      </GlassCard>

      <GlassCard className="mt-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30">
        <GlassCardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tips:</strong> Klicka på en klient för att se deras testhistorik
            och skapa nya tester.
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Är du säker?</DialogTitle>
            <DialogDescription>
              Detta kommer ta bort <strong>{clientToDelete?.name}</strong> permanent från
              registret. Denna åtgärd kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
