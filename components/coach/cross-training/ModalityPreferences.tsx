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
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useLocale } from 'next-intl'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Modality = 'DWR' | 'XC_SKIING' | 'ALTERG' | 'AIR_BIKE' | 'CYCLING' | 'ROWING' | 'ELLIPTICAL' | 'SWIMMING'
type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

const getModalityConfig = (locale: AppLocale) => ({
  DWR: { icon: '🏊', label: 'DWR (Deep Water Running)', description: copy(locale, '98% retention', '98% retention') },
  XC_SKIING: { icon: '⛷️', label: copy(locale, 'Cross-country skiing', 'Längdskidåkning'), description: copy(locale, '92% retention', '92% retention') },
  ALTERG: { icon: '🏃', label: 'AlterG (Anti-gravity)', description: copy(locale, '90% retention', '90% retention') },
  AIR_BIKE: { icon: '🚴‍♂️', label: 'Air Bike / Assault Bike', description: copy(locale, '80% retention', '80% retention') },
  CYCLING: { icon: '🚴', label: copy(locale, 'Cycling', 'Cykling'), description: copy(locale, '75% retention', '75% retention') },
  ROWING: { icon: '🚣', label: copy(locale, 'Rowing', 'Rodd'), description: copy(locale, '68% retention', '68% retention') },
  ELLIPTICAL: { icon: '🏃‍♂️', label: copy(locale, 'Elliptical', 'Crosstrainer'), description: copy(locale, '65% retention', '65% retention') },
  SWIMMING: { icon: '🏊‍♂️', label: copy(locale, 'Swimming', 'Simning'), description: copy(locale, '45% retention', '45% retention') },
})

const getInjuryTypes = (locale: AppLocale) => [
  { value: 'PLANTAR_FASCIITIS', label: 'Plantar Fasciitis' },
  { value: 'ACHILLES_TENDINOPATHY', label: copy(locale, 'Achilles tendinopathy', 'Achilles Tendinopati') },
  { value: 'IT_BAND_SYNDROME', label: copy(locale, 'IT band syndrome', 'IT-band Syndrom') },
  { value: 'PATELLOFEMORAL_SYNDROME', label: copy(locale, 'Patellofemoral syndrome', 'Patellofemoral Syndrom') },
  { value: 'SHIN_SPLINTS', label: copy(locale, 'Shin splints', 'Hälsporre') },
  { value: 'STRESS_FRACTURE', label: copy(locale, 'Stress fracture', 'Stressfraktur') },
  { value: 'HAMSTRING_STRAIN', label: copy(locale, 'Hamstring strain', 'Hamstringsträckning') },
  { value: 'CALF_STRAIN', label: copy(locale, 'Calf strain', 'Vadträckning') },
  { value: 'HIP_FLEXOR', label: copy(locale, 'Hip flexor', 'Höftböjare') },
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

interface ClientOption {
  id: string
  name: string
}

interface PreferencesResponse {
  preferences?: ModalityPreferences
}

interface ModalityPreferencesProps {
  initialClientId?: string
}

export default function ModalityPreferences({
  initialClientId,
}: ModalityPreferencesProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const modalityConfig = getModalityConfig(locale)
  const injuryTypes = getInjuryTypes(locale)

  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || '')
  const [preferences, setPreferences] = useState<ModalityPreferences | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  // Fetch clients
  const { data: clientsResponse } = useSWR<{ success: boolean; data: ClientOption[] }>('/api/clients', fetcher)
  const clients = clientsResponse?.data || []

  // Fetch preferences
  const { data, isLoading, mutate } = useSWR<PreferencesResponse>(
    selectedClient ? `/api/cross-training/preferences/${selectedClient}` : null,
    fetcher
  )

  // Initialize preferences when data loads
  useEffect(() => {
    if (data?.preferences) {
      const frame = requestAnimationFrame(() => {
        setPreferences(data.preferences ?? null)
        setHasChanges(false)
      })
      return () => cancelAnimationFrame(frame)
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
        title: copy(locale, 'Preferences saved', 'Preferenser sparade'),
        description: copy(locale, 'Cross-training preferences have been updated', 'Korstr.träningspreferenser har uppdaterats'),
      })

      setHasChanges(false)
      void mutate()
    } catch (error: unknown) {
      toast({
        title: copy(locale, 'Error', 'Fel'),
        description: error instanceof Error ? error.message : copy(locale, 'Could not save preferences', 'Kunde inte spara preferenser'),
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
          <CardTitle>{copy(locale, 'Cross-training preferences', 'Korstr.träningspreferenser')}</CardTitle>
          <CardDescription>
            {copy(locale, 'Select an athlete to configure cross-training preferences', 'Välj en atlet för att konfigurera korstr.träningspreferenser')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleClientChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={copy(locale, 'Select athlete...', 'Välj atlet...')} />
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
    return <div className="text-muted-foreground">{copy(locale, 'Loading preferences...', 'Laddar preferenser...')}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-1.5">{copy(locale, 'Cross-training preferences', 'Korstr.träningspreferenser')} <InfoTooltip conceptKey="crossTraining" /></h2>
          <p className="text-sm text-muted-foreground">
            {copy(locale, 'Configure modalities and equipment for individual adaptation', 'Konfigurera modaliteter och utrustning för individuell anpassning')}
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
                {isSaving ? copy(locale, 'Saving...', 'Sparar...') : copy(locale, 'Save', 'Spara')}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                {copy(locale, 'Cancel', 'Avbryt')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preferred Modality Order */}
      <Card>
        <CardHeader>
          <CardTitle>{copy(locale, 'Priority order (drag to reorder)', 'Prioriterad ordning (dra för att ändra)')}</CardTitle>
          <CardDescription>
            {copy(locale, 'The first choice is used for automatic conversions when compatible with the injury', 'Första valet används vid automatiska konverteringar (om kompatibelt med skada)')}
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
                  <span className="text-2xl">{modalityConfig[modality].icon}</span>
                  <div>
                    <div className="font-semibold">{modalityConfig[modality].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {modalityConfig[modality].description}
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
          <CardTitle>{copy(locale, 'Available equipment', 'Tillgänglig utrustning')}</CardTitle>
          <CardDescription>
            {copy(locale, 'Select the equipment the athlete can access', 'Markera vilken utrustning atleten har tillgång till')}
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
                🚴 {copy(locale, 'Bike', 'Cykel')}
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
                🏊‍♂️ {copy(locale, 'Pool (DWR/Swimming)', 'Pool (DWR/Simning)')}
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
                🏃 {copy(locale, 'AlterG treadmill', 'AlterG Löpband')}
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
                🏃‍♂️ {copy(locale, 'Elliptical', 'Crosstrainer')}
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
                🚣 {copy(locale, 'Rowing machine', 'Roddmaskin')}
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
                ⛷️ {copy(locale, 'Cross-country skiing', 'Längdskidåkning')}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>{copy(locale, 'Limitations / dislikes', 'Begränsningar / Ogillar')}</CardTitle>
          <CardDescription>
            {copy(locale, 'Free text for specific limitations or preferences', 'Fritext för specifika begränsningar eller preferenser')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={copy(locale, "E.g. 'Dislikes swimming', 'Left shoulder limits rowing', 'Prefers outdoors'", "T.ex. 'Gillar inte simning', 'Vänster axel begränsar rodd', 'Föredrar utomhus'")}
            value={preferences.limitations}
            onChange={(e) => handleLimitationsChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Injury-Specific Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>{copy(locale, 'Injury-specific overrides', 'Skadespecifika åsidosättningar')}</CardTitle>
          <CardDescription>
            {copy(locale, 'Override standard recommendations for specific injuries', 'Åsidosätt standardrekommendationer för specifika skador')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {copy(locale, 'The system has standard recommendations for each injury type. Use overrides only when the athlete has specific reasons.', 'Systemet har standardrekommendationer för varje skatyp. Använd endast åsidosättningar om atleten har specifika skäl.')}
            </AlertDescription>
          </Alert>

          {/* Existing overrides */}
          {Object.entries(preferences.injuryOverrides).map(([injuryType, modality]) => (
            <div
              key={injuryType}
              className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{modalityConfig[modality].icon}</span>
                <div>
                  <div className="font-semibold">
                    {injuryTypes.find((i) => i.value === injuryType)?.label || injuryType}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    → {modalityConfig[modality].label}
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
                <SelectValue placeholder={copy(locale, 'Select injury type...', 'Välj skatyp...')} />
              </SelectTrigger>
              <SelectContent>
                {injuryTypes.filter(
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
          <CardTitle>{copy(locale, 'Preview', 'Förhandsvisning')}</CardTitle>
          <CardDescription>{copy(locale, 'Example automatic conversion', 'Exempel på automatisk konvertering')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              <strong>{copy(locale, 'Run 60 min @ Easy', 'Löppass 60 min @ Lätt')}</strong> {copy(locale, 'converts to', 'konverteras till')}{' '}
              <strong>
                {modalityConfig[preferences.preferredOrder[0]].icon}{' '}
                {modalityConfig[preferences.preferredOrder[0]].label}
              </strong>{' '}
              {copy(locale, 'with', 'med')} {modalityConfig[preferences.preferredOrder[0]].description} {copy(locale, 'fitness retention', 'fitnessretention')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
