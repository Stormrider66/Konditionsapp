'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Dumbbell,
  Ship,
  FlaskConical,
  Wrench,
  Heart,
  Package,
  X,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface Equipment {
  id: string
  name: string
  nameSv: string | null
  category: string
  brand: string | null
  description: string | null
  enablesTests: string[]
  enablesExercises: string[]
}

interface LocationEquipment {
  id: string
  locationId: string
  equipmentId: string
  quantity: number
  condition: string | null
  notes: string | null
  isAvailable: boolean
  equipment: Equipment
}

interface LocationEquipmentManagerProps {
  locationId: string
  locationName: string
  onBack: () => void
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  CARDIO_MACHINE: <Heart className="h-4 w-4" />,
  STRENGTH_MACHINE: <Dumbbell className="h-4 w-4" />,
  FREE_WEIGHTS: <Dumbbell className="h-4 w-4" />,
  RACKS: <Package className="h-4 w-4" />,
  TESTING: <FlaskConical className="h-4 w-4" />,
  ACCESSORIES: <Wrench className="h-4 w-4" />,
  RECOVERY: <Heart className="h-4 w-4" />,
}

const CATEGORY_LABELS: Record<string, string> = {
  CARDIO_MACHINE: 'Cardio Machines',
  STRENGTH_MACHINE: 'Strength Machines',
  FREE_WEIGHTS: 'Free Weights',
  RACKS: 'Racks & Stations',
  TESTING: 'Testing Equipment',
  ACCESSORIES: 'Accessories',
  RECOVERY: 'Recovery',
}

export function LocationEquipmentManager({ locationId, locationName, onBack }: LocationEquipmentManagerProps) {
  const [locationEquipment, setLocationEquipment] = useState<LocationEquipment[]>([])
  const [equipmentCatalog, setEquipmentCatalog] = useState<Record<string, Equipment[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<LocationEquipment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Add form state
  const [addFormData, setAddFormData] = useState({
    equipmentId: '',
    quantity: 1,
    condition: '',
    notes: '',
  })

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    quantity: 1,
    condition: '',
    notes: '',
    isAvailable: true,
  })

  const fetchLocationEquipment = useCallback(async () => {
    try {
      const response = await fetch(`/api/coach/admin/locations/${locationId}/equipment`)
      const result = await response.json()
      if (result.success) {
        setLocationEquipment(result.data.equipment)
      }
    } catch {
      toast.error('Failed to load location equipment')
    }
  }, [locationId])

  const fetchEquipmentCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/equipment')
      const result = await response.json()
      if (result.success) {
        setEquipmentCatalog(result.data.grouped)
      }
    } catch {
      toast.error('Failed to load equipment catalog')
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchLocationEquipment(), fetchEquipmentCatalog()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchLocationEquipment, fetchEquipmentCatalog])

  const handleAddEquipment = async () => {
    if (!addFormData.equipmentId) {
      toast.error('Please select equipment to add')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/coach/admin/locations/${locationId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message || 'Equipment added')
        setIsAddOpen(false)
        setAddFormData({ equipmentId: '', quantity: 1, condition: '', notes: '' })
        fetchLocationEquipment()
      } else {
        toast.error(result.error || 'Failed to add equipment')
      }
    } catch {
      toast.error('Failed to add equipment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateEquipment = async () => {
    if (!selectedEquipment) return

    try {
      setIsSubmitting(true)
      const response = await fetch(
        `/api/coach/admin/locations/${locationId}/equipment/${selectedEquipment.equipmentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editFormData),
        }
      )
      const result = await response.json()
      if (result.success) {
        toast.success('Equipment updated')
        setIsEditOpen(false)
        setSelectedEquipment(null)
        fetchLocationEquipment()
      } else {
        toast.error(result.error || 'Failed to update equipment')
      }
    } catch {
      toast.error('Failed to update equipment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEquipment = async () => {
    if (!selectedEquipment) return

    try {
      setIsSubmitting(true)
      const response = await fetch(
        `/api/coach/admin/locations/${locationId}/equipment/${selectedEquipment.equipmentId}`,
        { method: 'DELETE' }
      )
      const result = await response.json()
      if (result.success) {
        toast.success('Equipment removed')
        setIsDeleteOpen(false)
        setSelectedEquipment(null)
        fetchLocationEquipment()
      } else {
        toast.error(result.error || 'Failed to remove equipment')
      }
    } catch {
      toast.error('Failed to remove equipment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (item: LocationEquipment) => {
    setSelectedEquipment(item)
    setEditFormData({
      quantity: item.quantity,
      condition: item.condition || '',
      notes: item.notes || '',
      isAvailable: item.isAvailable,
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (item: LocationEquipment) => {
    setSelectedEquipment(item)
    setIsDeleteOpen(true)
  }

  // Get available equipment (not already at this location)
  const getAvailableEquipment = (): Equipment[] => {
    const existingIds = new Set(locationEquipment.map((le) => le.equipmentId))
    const allEquipment = Object.values(equipmentCatalog).flat()
    return allEquipment.filter((e) => !existingIds.has(e.id))
  }

  // Filter available equipment by search and category
  const filteredAvailableEquipment = getAvailableEquipment().filter((e) => {
    const matchesSearch =
      searchQuery === '' ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.nameSv && e.nameSv.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.brand && e.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group location equipment by category
  const groupedLocationEquipment = locationEquipment.reduce((acc, item) => {
    const category = item.equipment.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, LocationEquipment[]>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Equipment - {locationName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {locationEquipment.length} items in inventory
            </p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
              <DialogDescription>
                Select equipment from the catalog to add to this location
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(CATEGORY_LABELS).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment List */}
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {filteredAvailableEquipment.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'No matching equipment found'
                      : 'All equipment already added'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableEquipment.map((equipment) => (
                      <div
                        key={equipment.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          addFormData.equipmentId === equipment.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setAddFormData({ ...addFormData, equipmentId: equipment.id })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {CATEGORY_ICONS[equipment.category] || <Dumbbell className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{equipment.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {equipment.brand && `${equipment.brand} • `}
                              {CATEGORY_LABELS[equipment.category]}
                            </div>
                          </div>
                        </div>
                        {addFormData.equipmentId === equipment.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Quantity and Details */}
              {addFormData.equipmentId && (
                <div className="grid gap-4 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={addFormData.quantity}
                        onChange={(e) =>
                          setAddFormData({ ...addFormData, quantity: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="condition">Condition</Label>
                      <Select
                        value={addFormData.condition}
                        onValueChange={(v) => setAddFormData({ ...addFormData, condition: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Needs Maintenance">Needs Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                      placeholder="Serial numbers, maintenance notes, etc."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEquipment} disabled={isSubmitting || !addFormData.equipmentId}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Equipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Equipment by Category */}
      {locationEquipment.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No equipment yet</h3>
            <p className="text-muted-foreground mb-4">
              Add equipment to track what&apos;s available at this location
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLocationEquipment).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {CATEGORY_ICONS[category]}
                  {CATEGORY_LABELS[category]}
                  <Badge variant="secondary" className="ml-2">
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {item.equipment.name}
                            {!item.isAvailable && (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.equipment.brand && `${item.equipment.brand} • `}
                            Qty: {item.quantity}
                            {item.condition && ` • ${item.condition}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteDialog(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update {selectedEquipment?.equipment.name} details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={editFormData.quantity}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-condition">Condition</Label>
                <Select
                  value={editFormData.condition}
                  onValueChange={(v) => setEditFormData({ ...editFormData, condition: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Needs Maintenance">Needs Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Serial numbers, maintenance notes, etc."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-available">Available for use</Label>
              <Switch
                id="edit-available"
                checked={editFormData.isAvailable}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isAvailable: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEquipment} disabled={isSubmitting}>
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
            <AlertDialogTitle>Remove Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{selectedEquipment?.equipment.name}&quot; from
              this location? This won&apos;t delete it from the catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEquipment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
