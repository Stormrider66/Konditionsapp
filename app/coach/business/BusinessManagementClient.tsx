'use client'

/**
 * Business Management Client Component
 *
 * Client-side component for managing business, testers, and locations.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  BarChart3,
} from 'lucide-react'

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
  userId,
  business,
  userRole,
  testers: initialTesters,
  locations: initialLocations,
}: BusinessManagementClientProps) {
  const { toast } = useToast()
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

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

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
          title: editingTester ? 'Testare uppdaterad' : 'Testare skapad',
        })
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte spara testare',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara testare',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTester = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna testare?')) return

    try {
      const response = await fetch(`/api/testers/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setTesters(testers.filter((t) => t.id !== id))
        toast({ title: 'Testare borttagen' })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte ta bort testare',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort testare',
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
          title: editingLocation ? 'Plats uppdaterad' : 'Plats skapad',
        })
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte spara plats',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara plats',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteLocation = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna plats?')) return

    try {
      const response = await fetch(`/api/locations/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setLocations(locations.filter((l) => l.id !== id))
        toast({ title: 'Plats borttagen' })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte ta bort plats',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort plats',
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
          <Link href="/coach/dashboard">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Verksamhet</h1>
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
                Roll: {userRole === 'OWNER' ? 'Ägare' : userRole === 'ADMIN' ? 'Admin' : 'Medlem'}
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
              <h3 className="font-medium mb-2">Ingen verksamhet</h3>
              <p className="text-sm text-muted-foreground">
                Du är inte kopplad till någon verksamhet ännu.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Testers and Locations */}
        <Tabs defaultValue="testers">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="testers">
              <Users className="h-4 w-4 mr-2" />
              Testare ({testers.length})
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4 mr-2" />
              Platser ({locations.length})
            </TabsTrigger>
          </TabsList>

          {/* Testers Tab */}
          <TabsContent value="testers" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Testare som kan genomföra tester
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
                    Ny testare
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTester ? 'Redigera testare' : 'Lägg till testare'}
                    </DialogTitle>
                    <DialogDescription>
                      Testare kan tilldelas tester för spårning
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Namn *</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={testerForm.name}
                        onChange={(e) => setTesterForm({ ...testerForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">E-post</label>
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
                        Privat (kan bara se egna tester)
                      </label>
                    </div>
                    <Button onClick={saveTester} disabled={isLoading || !testerForm.name} className="w-full">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingTester ? 'Spara ändringar' : 'Lägg till'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {testers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Inga testare ännu</p>
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
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                              Privat
                            </span>
                          )}
                          <span>{tester.totalTests} tester</span>
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
                Platser där tester genomförs
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
                    Ny plats
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocation ? 'Redigera plats' : 'Lägg till plats'}
                    </DialogTitle>
                    <DialogDescription>
                      Platser kan tilldelas tester för spårning
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Namn *</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Huvudkontoret"
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Adress</label>
                      <input
                        type="text"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Storgatan 1"
                        value={locationForm.address}
                        onChange={(e) =>
                          setLocationForm({ ...locationForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stad</label>
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
                      {editingLocation ? 'Spara ändringar' : 'Lägg till'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {locations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Inga platser ännu</p>
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
                          <span>{location.totalTests} tester</span>
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
