'use client'

/**
 * Business Management Client Component
 *
 * Client-side component for managing business, testers, and locations.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  Building2,
  Users,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  UserCheck,
} from 'lucide-react'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'

interface Business {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
}

interface Tester {
  id: string
  name: string
  email?: string | null
  isPrivate: boolean
  totalTests: number
}

interface Location {
  id: string
  name: string
  address?: string | null
  city?: string | null
  totalTests: number
}

interface BusinessManagementClientProps {
  userId: string
  business: Business | null
  userRole: string | null
  testers: Tester[]
  locations: Location[]
}

export function BusinessManagementClient({
  business,
  userRole,
  testers: initialTesters,
  locations: initialLocations,
}: BusinessManagementClientProps) {
  const { toast } = useToast()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = (en: string, sv: string) => locale === 'sv' ? sv : en
  const pathname = usePathname()
  const businessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = businessSlug ? `/${businessSlug}` : ''
  const [testers, setTesters] = useState(initialTesters)
  const [locations, setLocations] = useState(initialLocations)
  const [isLoading, setIsLoading] = useState(false)

  // Dialog states
  const [testerDialogOpen, setTesterDialogOpen] = useState(false)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [editingTester, setEditingTester] = useState<Tester | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  // Form states
  const [testerForm, setTesterForm] = useState({ name: '', email: '', isPrivate: false })
  const [locationForm, setLocationForm] = useState({ name: '', address: '', city: '' })

  const roleLabel = userRole === 'OWNER'
    ? copy('Owner', 'Ägare')
    : userRole === 'ADMIN'
      ? 'Admin'
      : copy('Member', 'Medlem')
  const testCountLabel = (count: number) => copy(`${count} ${count === 1 ? 'test' : 'tests'}`, `${count} tester`)

  // Tester CRUD
  const saveTester = async () => {
    setIsLoading(true)
    try {
      const url = editingTester
        ? `/api/testers/${editingTester.id}`
        : '/api/testers'
      const method = editingTester ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testerForm,
          businessId: business?.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (editingTester) {
          setTesters(testers.map((t) => (t.id === editingTester.id ? data.tester : t)))
        } else {
          setTesters([...testers, data.tester])
        }
        setTesterDialogOpen(false)
        setEditingTester(null)
        setTesterForm({ name: '', email: '', isPrivate: false })
        toast({
          title: editingTester ? copy('Tester updated', 'Testare uppdaterad') : copy('Tester created', 'Testare skapad'),
        })
      } else {
        toast({
          title: copy('Error', 'Fel'),
          description: data.error || copy('Could not save tester', 'Kunde inte spara testare'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: copy('Error', 'Fel'),
        description: copy('Could not save tester', 'Kunde inte spara testare'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTester = async (id: string) => {
    if (!confirm(copy('Are you sure you want to remove this tester?', 'Är du säker på att du vill ta bort denna testare?'))) return

    try {
      const response = await fetch(`/api/testers/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setTesters(testers.filter((t) => t.id !== id))
        toast({ title: copy('Tester removed', 'Testare borttagen') })
      } else {
        const data = await response.json()
        toast({
          title: copy('Error', 'Fel'),
          description: data.error || copy('Could not remove tester', 'Kunde inte ta bort testare'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: copy('Error', 'Fel'),
        description: copy('Could not remove tester', 'Kunde inte ta bort testare'),
        variant: 'destructive',
      })
    }
  }

  // Location CRUD
  const saveLocation = async () => {
    setIsLoading(true)
    try {
      const url = editingLocation
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations'
      const method = editingLocation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...locationForm,
          businessId: business?.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (editingLocation) {
          setLocations(locations.map((l) => (l.id === editingLocation.id ? data.location : l)))
        } else {
          setLocations([...locations, data.location])
        }
        setLocationDialogOpen(false)
        setEditingLocation(null)
        setLocationForm({ name: '', address: '', city: '' })
        toast({
          title: editingLocation ? copy('Location updated', 'Plats uppdaterad') : copy('Location created', 'Plats skapad'),
        })
      } else {
        toast({
          title: copy('Error', 'Fel'),
          description: data.error || copy('Could not save location', 'Kunde inte spara plats'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: copy('Error', 'Fel'),
        description: copy('Could not save location', 'Kunde inte spara plats'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteLocation = async (id: string) => {
    if (!confirm(copy('Are you sure you want to remove this location?', 'Är du säker på att du vill ta bort denna plats?'))) return

    try {
      const response = await fetch(`/api/locations/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setLocations(locations.filter((l) => l.id !== id))
        toast({ title: copy('Location removed', 'Plats borttagen') })
      } else {
        const data = await response.json()
        toast({
          title: copy('Error', 'Fel'),
          description: data.error || copy('Could not remove location', 'Kunde inte ta bort plats'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: copy('Error', 'Fel'),
        description: copy('Could not remove location', 'Kunde inte ta bort plats'),
        variant: 'destructive',
      })
    }
  }

  const openEditTester = (tester: Tester) => {
    setEditingTester(tester)
    setTesterForm({
      name: tester.name,
      email: tester.email || '',
      isPrivate: tester.isPrivate,
    })
    setTesterDialogOpen(true)
  }

  const openEditLocation = (location: Location) => {
    setEditingLocation(location)
    setLocationForm({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
    })
    setLocationDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`${basePath}/coach/dashboard`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h1 className="font-display text-lg font-semibold">{copy('Business', 'Verksamhet')}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Business Info */}
        {business ? (
          <Card>
            <CardHeader>
              <CardTitle>{business.name}</CardTitle>
              <CardDescription>
                {business.city && `${business.city} • `}
                {copy('Role', 'Roll')}: {roleLabel}
              </CardDescription>
            </CardHeader>
            {(business.address || business.phone || business.email) && (
              <CardContent className="text-sm text-muted-foreground">
                {business.address && <p>{business.address}</p>}
                {business.phone && <p>{business.phone}</p>}
                {business.email && <p>{business.email}</p>}
              </CardContent>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">{copy('No business', 'Ingen verksamhet')}</h3>
              <p className="text-sm text-muted-foreground">
                {copy('You are not connected to a business yet.', 'Du är inte kopplad till någon verksamhet ännu.')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Testers and Locations */}
        <Tabs defaultValue="testers">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="testers">
              <Users className="h-4 w-4 mr-2" />
              {copy('Testers', 'Testare')} ({testers.length})
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4 mr-2" />
              {copy('Locations', 'Platser')} ({locations.length})
            </TabsTrigger>
          </TabsList>

          {/* Testers Tab */}
          <TabsContent value="testers" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {copy('Testers who can run tests', 'Testare som kan genomföra tester')}
              </p>
              <Dialog open={testerDialogOpen} onOpenChange={setTesterDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTester(null)
                      setTesterForm({ name: '', email: '', isPrivate: false })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {copy('New tester', 'Ny testare')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTester ? copy('Edit tester', 'Redigera testare') : copy('Add tester', 'Lägg till testare')}
                    </DialogTitle>
                    <DialogDescription>
                      {copy('Testers can be assigned to tests for tracking', 'Testare kan tilldelas tester för spårning')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{copy('Name', 'Namn')} *</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={testerForm.name}
                        onChange={(e) => setTesterForm({ ...testerForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{copy('Email', 'E-post')}</label>
                      <input
                        type="email"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={testerForm.email}
                        onChange={(e) => setTesterForm({ ...testerForm, email: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        checked={testerForm.isPrivate}
                        onChange={(e) =>
                          setTesterForm({ ...testerForm, isPrivate: e.target.checked })
                        }
                      />
                      <label htmlFor="isPrivate" className="text-sm">
                        {copy('Private (can only see own tests)', 'Privat (kan bara se egna tester)')}
                      </label>
                    </div>
                    <Button onClick={saveTester} disabled={isLoading || !testerForm.name} className="w-full">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingTester ? copy('Save changes', 'Spara ändringar') : copy('Add', 'Lägg till')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {testers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{copy('No testers yet', 'Inga testare ännu')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {testers.map((tester) => (
                  <Card key={tester.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tester.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {tester.email && <span>{tester.email}</span>}
                          {tester.isPrivate && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                              {copy('Private', 'Privat')}
                            </span>
                          )}
                          <span>{testCountLabel(tester.totalTests)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTester(tester)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTester(tester.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {copy('Locations where tests are performed', 'Platser där tester genomförs')}
              </p>
              <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingLocation(null)
                      setLocationForm({ name: '', address: '', city: '' })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {copy('New location', 'Ny plats')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocation ? copy('Edit location', 'Redigera plats') : copy('Add location', 'Lägg till plats')}
                    </DialogTitle>
                    <DialogDescription>
                      {copy('Locations can be assigned to tests for tracking', 'Platser kan tilldelas tester för spårning')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{copy('Name', 'Namn')} *</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder={copy('Main office', 'Huvudkontoret')}
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{copy('Address', 'Adress')}</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder={copy('Main Street 1', 'Storgatan 1')}
                        value={locationForm.address}
                        onChange={(e) =>
                          setLocationForm({ ...locationForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{copy('City', 'Stad')}</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Stockholm"
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={saveLocation}
                      disabled={isLoading || !locationForm.name}
                      className="w-full"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingLocation ? copy('Save changes', 'Spara ändringar') : copy('Add', 'Lägg till')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {locations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{copy('No locations yet', 'Inga platser ännu')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <Card key={location.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <div className="text-xs text-muted-foreground">
                          {location.city && <span>{location.city} • </span>}
                          <span>{testCountLabel(location.totalTests)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditLocation(location)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLocation(location.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
