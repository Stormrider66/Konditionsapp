'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Dumbbell,
  Users,
  FlaskConical,
  Loader2,
  Star,
  Phone,
  Mail,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { LocationEquipmentManager } from './LocationEquipmentManager'

interface Location {
  id: string
  name: string
  slug: string | null
  city: string | null
  address: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  isPrimary: boolean
  isActive: boolean
  capabilities: string[]
  openingHours: Record<string, string> | null
  _count: {
    tests: number
    equipment: number
    services: number
    staff: number
  }
}

export function BusinessLocationsTab() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if we're in equipment management mode
  const equipmentLocationId = searchParams.get('location')
  const equipmentLocation = locations.find(l => l.id === equipmentLocationId)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    city: '',
    address: '',
    postalCode: '',
    phone: '',
    email: '',
    isPrimary: false,
  })

  const fetchLocations = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/coach/admin/locations')
      const result = await response.json()
      if (result.success) {
        setLocations(result.data)
      } else {
        toast.error('Failed to load locations')
      }
    } catch {
      toast.error('Failed to load locations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleCreateLocation = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/coach/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Location created')
        setIsCreateOpen(false)
        resetForm()
        fetchLocations()
      } else {
        toast.error(result.error || 'Failed to create location')
      }
    } catch {
      toast.error('Failed to create location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLocation = async () => {
    if (!selectedLocation) return
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/coach/admin/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Location updated')
        setIsEditOpen(false)
        setSelectedLocation(null)
        resetForm()
        fetchLocations()
      } else {
        toast.error(result.error || 'Failed to update location')
      }
    } catch {
      toast.error('Failed to update location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/coach/admin/locations/${selectedLocation.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Location deleted')
        setIsDeleteOpen(false)
        setSelectedLocation(null)
        fetchLocations()
      } else {
        toast.error(result.error || 'Failed to delete location')
      }
    } catch {
      toast.error('Failed to delete location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      city: '',
      address: '',
      postalCode: '',
      phone: '',
      email: '',
      isPrimary: false,
    })
  }

  const openEditDialog = (location: Location) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      slug: location.slug || '',
      city: location.city || '',
      address: location.address || '',
      postalCode: location.postalCode || '',
      phone: location.phone || '',
      email: location.email || '',
      isPrimary: location.isPrimary,
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (location: Location) => {
    setSelectedLocation(location)
    setIsDeleteOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show equipment manager if a location is selected
  if (equipmentLocationId && equipmentLocation) {
    return (
      <LocationEquipmentManager
        locationId={equipmentLocationId}
        locationName={equipmentLocation.name}
        onBack={() => {
          const url = new URL(window.location.href)
          url.searchParams.delete('location')
          router.push(url.pathname + url.search)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Locations</h2>
          <p className="text-sm text-muted-foreground">
            Manage your gym locations and their equipment
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Location</DialogTitle>
              <DialogDescription>
                Add a new gym location to your business
              </DialogDescription>
            </DialogHeader>
            <LocationForm
              formData={formData}
              setFormData={setFormData}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} disabled={isSubmitting || !formData.name}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No locations yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first gym location to start tracking equipment
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id} className={!location.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {location.name}
                      {location.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </CardTitle>
                    {location.city && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location.city}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(location)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => openDeleteDialog(location)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                {(location.phone || location.email) && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {location.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {location.phone}
                      </div>
                    )}
                    {location.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {location.email}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <Dumbbell className="h-4 w-4 text-orange-500" />
                      {location._count.equipment}
                    </div>
                    <div className="text-xs text-muted-foreground">Equipment</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <FlaskConical className="h-4 w-4 text-blue-500" />
                      {location._count.tests}
                    </div>
                    <div className="text-xs text-muted-foreground">Tests</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <Users className="h-4 w-4 text-green-500" />
                      {location._count.staff}
                    </div>
                    <div className="text-xs text-muted-foreground">Staff</div>
                  </div>
                </div>

                {/* Capabilities */}
                {location.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {location.capabilities.slice(0, 5).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {location.capabilities.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{location.capabilities.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Manage Equipment Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const url = new URL(window.location.href)
                    url.searchParams.set('location', location.id)
                    router.push(url.pathname + url.search)
                  }}
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Manage Equipment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            formData={formData}
            setFormData={setFormData}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLocation} disabled={isSubmitting || !formData.name}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedLocation?.name}&quot;? This action cannot be undone.
              {selectedLocation?._count.tests && selectedLocation._count.tests > 0 && (
                <span className="block mt-2 text-destructive">
                  This location has {selectedLocation._count.tests} associated tests.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Form Component
interface LocationFormProps {
  formData: {
    name: string
    slug: string
    city: string
    address: string
    postalCode: string
    phone: string
    email: string
    isPrimary: boolean
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string
    slug: string
    city: string
    address: string
    postalCode: string
    phone: string
    email: string
    isPrimary: boolean
  }>>
}

function LocationForm({ formData, setFormData }: LocationFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Main Gym"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Stockholm"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            placeholder="111 22"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Storgatan 1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+46 70 123 4567"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="gym@example.com"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPrimary"
          checked={formData.isPrimary}
          onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="isPrimary" className="text-sm font-normal">
          Set as primary location (HQ)
        </Label>
      </div>
    </div>
  )
}
