'use client'

// components/coach/cross-training/ModalityPreferences.tsx
/**
 * Cross-Training Modality Preferences Manager
 *
 * Allows coaches to configure athlete-specific cross-training preferences:
 * - Preferred modality order (drag-and-drop ranking)
 * - Equipment availability
 * - Limitations/dislikes
 * - Injury-specific overrides
 *
 * Features:
 * - Drag-and-drop modality ordering
 * - Equipment availability checkboxes
 * - Limitations text area
 * - Injury-specific override configuration
 * - Save/cancel with optimistic updates
 * - Preview sample substitution
 */

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { GripVertical, Save, X, Check, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Modality = 'DWR' | 'XC_SKIING' | 'ALTERG' | 'AIR_BIKE' | 'CYCLING' | 'ROWING' | 'ELLIPTICAL' | 'SWIMMING'

const MODALITY_CONFIG = {
  DWR: { icon: '🏊', label: 'DWR (Deep Water Running)', description: '98% retention' },
  XC_SKIING: { icon: '⛷️', label: 'Längdskidåkning', description: '92% retention' },
  ALTERG: { icon: '🏃', label: 'AlterG (Anti-gravity)', description: '90% retention' },
  AIR_BIKE: { icon: '🚴‍♂️', label: 'Air Bike / Assault Bike', description: '80% retention' },
  CYCLING: { icon: '🚴', label: 'Cykling', description: '75% retention' },
  ROWING: { icon: '🚣', label: 'Rodd', description: '68% retention' },
  ELLIPTICAL: { icon: '🏃‍♂️', label: 'Crosstrainer', description: '65% retention' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning', description: '45% retention' },
}

const INJURY_TYPES = [
  { value: 'PLANTAR_FASCIITIS', label: 'Plantar Fasciitis' },
  { value: 'ACHILLES_TENDINOPATHY', label: 'Achilles Tendinopati' },
  { value: 'IT_BAND_SYNDROME', label: 'IT-band Syndrom' },
  { value: 'PATELLOFEMORAL_SYNDROME', label: 'Patellofemoral Syndrom' },
  { value: 'SHIN_SPLINTS', label: 'Hälsporre' },
  { value: 'STRESS_FRACTURE', label: 'Stressfraktur' },
  { value: 'HAMSTRING_STRAIN', label: 'Hamstringsträckning' },
  { value: 'CALF_STRAIN', label: 'Vadträckning' },
  { value: 'HIP_FLEXOR', label: 'Höftböjare' },
]

interface ModalityPreferences {
  preferredOrder: Modality[]
  equipment: {
    hasBike: boolean
    hasPoolAccess: boolean
    hasAlterG: boolean
    hasAirBike: boolean
    hasElliptical: boolean
    hasRowingMachine: boolean
    hasXCSkiAccess: boolean
  }
  limitations: string
  injuryOverrides: {
    [injuryType: string]: Modality
  }
}

interface ModalityPreferencesProps {
  initialClientId?: string
}

export default function ModalityPreferences({
  initialClientId,
}: ModalityPreferencesProps) {
  const { toast } = useToast()

  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || '')
  const [preferences, setPreferences] = useState<ModalityPreferences | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  // Fetch clients
  const { data: clients } = useSWR<any[]>('/api/clients', fetcher)

  // Fetch preferences
  const { data, error, isLoading, mutate } = useSWR<any>(
    selectedClient ? `/api/cross-training/preferences/${selectedClient}` : null,
    fetcher
  )

  // Initialize preferences when data loads
  useEffect(() => {
    if (data?.preferences) {
      setPreferences(data.preferences)
      setHasChanges(false)
    }
  }, [data])

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    setHasChanges(false)
  }

  const handleEquipmentChange = (key: keyof ModalityPreferences['equipment'], checked: boolean) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      equipment: {
        ...preferences.equipment,
        [key]: checked,
      },
    })
    setHasChanges(true)
  }

  const handleLimitationsChange = (value: string) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      limitations: value,
    })
    setHasChanges(true)
  }

  const handleInjuryOverrideChange = (injuryType: string, modality: Modality) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      injuryOverrides: {
        ...preferences.injuryOverrides,
        [injuryType]: modality,
      },
    })
    setHasChanges(true)
  }

  const handleRemoveInjuryOverride = (injuryType: string) => {
    if (!preferences) return

    const newOverrides = { ...preferences.injuryOverrides }
    delete newOverrides[injuryType]

    setPreferences({
      ...preferences,
      injuryOverrides: newOverrides,
    })
    setHasChanges(true)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index || !preferences) return

    const newOrder = [...preferences.preferredOrder]
    const draggedModality = newOrder[draggedItem]
    newOrder.splice(draggedItem, 1)
    newOrder.splice(index, 0, draggedModality)

    setPreferences({
      ...preferences,
      preferredOrder: newOrder,
    })
    setDraggedItem(index)
    setHasChanges(true)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleSave = async () => {
    if (!preferences || !selectedClient) return

    setIsSaving(true)

    try {
      const response = await fetch(`/api/cross-training/preferences/${selectedClient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save preferences')
      }

      toast({
        title: 'Preferenser sparade',
        description: 'Korstr.träningspreferenser har uppdaterats',
      })

      setHasChanges(false)
      mutate()
    } catch (error: any) {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte spara preferenser',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (data?.preferences) {
      setPreferences(data.preferences)
      setHasChanges(false)
    }
  }

  if (!selectedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Korstr.träningspreferenser</CardTitle>
          <CardDescription>
            Välj en atlet för att konfigurera korstr.träningspreferenser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleClientChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj atlet..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !preferences) {
    return <div className="text-muted-foreground">Laddar preferenser...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Korstr.träningspreferenser</h2>
          <p className="text-sm text-muted-foreground">
            Konfigurera modaliteter och utrustning för individuell anpassning
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Client selector */}
          <Select value={selectedClient} onValueChange={handleClientChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Save/Cancel buttons */}
          {hasChanges && (
            <>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Sparar...' : 'Spara'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Avbryt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preferred Modality Order */}
      <Card>
        <CardHeader>
          <CardTitle>Prioriterad ordning (dra för att ändra)</CardTitle>
          <CardDescription>
            Första valet används vid automatiska konverteringar (om kompatibelt med skada)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {preferences.preferredOrder.map((modality, index) => (
              <div
                key={modality}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-4 bg-white border-2 rounded-lg cursor-move transition-all ${
                  draggedItem === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-2xl">{MODALITY_CONFIG[modality].icon}</span>
                  <div>
                    <div className="font-semibold">{MODALITY_CONFIG[modality].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {MODALITY_CONFIG[modality].description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Tillgänglig utrustning</CardTitle>
          <CardDescription>
            Markera vilken utrustning atleten har tillgång till
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBike"
                checked={preferences.equipment.hasBike}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasBike', checked as boolean)
                }
              />
              <Label htmlFor="hasBike" className="cursor-pointer">
                🚴 Cykel
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPoolAccess"
                checked={preferences.equipment.hasPoolAccess}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasPoolAccess', checked as boolean)
                }
              />
              <Label htmlFor="hasPoolAccess" className="cursor-pointer">
                🏊‍♂️ Pool (DWR/Simning)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAlterG"
                checked={preferences.equipment.hasAlterG}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasAlterG', checked as boolean)
                }
              />
              <Label htmlFor="hasAlterG" className="cursor-pointer">
                🏃 AlterG Löpband
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAirBike"
                checked={preferences.equipment.hasAirBike}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasAirBike', checked as boolean)
                }
              />
              <Label htmlFor="hasAirBike" className="cursor-pointer">
                🚴‍♂️ Air Bike
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasElliptical"
                checked={preferences.equipment.hasElliptical}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasElliptical', checked as boolean)
                }
              />
              <Label htmlFor="hasElliptical" className="cursor-pointer">
                🏃‍♂️ Crosstrainer
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasRowingMachine"
                checked={preferences.equipment.hasRowingMachine}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasRowingMachine', checked as boolean)
                }
              />
              <Label htmlFor="hasRowingMachine" className="cursor-pointer">
                🚣 Roddmaskin
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasXCSkiAccess"
                checked={preferences.equipment.hasXCSkiAccess}
                onCheckedChange={(checked) =>
                  handleEquipmentChange('hasXCSkiAccess', checked as boolean)
                }
              />
              <Label htmlFor="hasXCSkiAccess" className="cursor-pointer">
                ⛷️ Längdskidåkning
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Begränsningar / Ogillar</CardTitle>
          <CardDescription>
            Fritext för specifika begränsningar eller preferenser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="T.ex. 'Gillar inte simning', 'Vänster axel begränsar rodd', 'Föredrar utomhus'"
            value={preferences.limitations}
            onChange={(e) => handleLimitationsChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Injury-Specific Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Skadespecifika åsidosättningar</CardTitle>
          <CardDescription>
            Åsidosätt standardrekommendationer för specifika skador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Systemet har standardrekommendationer för varje skatyp. Använd endast åsidosättningar om atleten har specifika skäl.
            </AlertDescription>
          </Alert>

          {/* Existing overrides */}
          {Object.entries(preferences.injuryOverrides).map(([injuryType, modality]) => (
            <div
              key={injuryType}
              className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{MODALITY_CONFIG[modality].icon}</span>
                <div>
                  <div className="font-semibold">
                    {INJURY_TYPES.find((i) => i.value === injuryType)?.label || injuryType}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    → {MODALITY_CONFIG[modality].label}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveInjuryOverride(injuryType)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add new override */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              onValueChange={(value) => {
                const modality = preferences.preferredOrder[0] // Default to first preference
                handleInjuryOverrideChange(value, modality)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj skatyp..." />
              </SelectTrigger>
              <SelectContent>
                {INJURY_TYPES.filter(
                  (i) => !preferences.injuryOverrides[i.value]
                ).map((injury) => (
                  <SelectItem key={injury.value} value={injury.value}>
                    {injury.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Förhandsvisning</CardTitle>
          <CardDescription>Exempel på automatisk konvertering</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              <strong>Löppass 60 min @ Lätt</strong> konverteras till{' '}
              <strong>
                {MODALITY_CONFIG[preferences.preferredOrder[0]].icon}{' '}
                {MODALITY_CONFIG[preferences.preferredOrder[0]].label}
              </strong>{' '}
              med {MODALITY_CONFIG[preferences.preferredOrder[0]].description} fitnessretention
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
