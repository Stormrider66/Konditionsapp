'use client'

// components/coach/cross-training/SubstitutionSchedule.tsx
/**
 * Cross-Training Substitution Schedule
 *
 * 7-day calendar view showing automatically converted running workouts
 * to cross-training based on active injuries.
 *
 * Features:
 * - Original workout → Converted workout flow
 * - TSS comparison
 * - Fitness retention badges
 * - Modality icons
 * - Weekly summary statistics
 * - Quick edit modality selection
 * - Date range selector (7 or 14 days)
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Calendar,
  ArrowRight,
  Activity,
  TrendingDown,
  Edit2,
  Check,
  X,
  AlertCircle,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

// Modality icons and colors
const MODALITY_CONFIG = {
  DWR: { icon: '🏊', label: 'DWR', color: 'bg-blue-500' },
  XC_SKIING: { icon: '⛷️', label: 'Längdskidåkning', color: 'bg-slate-600' },
  ALTERG: { icon: '🏃', label: 'AlterG', color: 'bg-indigo-500' },
  AIR_BIKE: { icon: '🚴‍♂️', label: 'Air Bike', color: 'bg-red-500' },
  CYCLING: { icon: '🚴', label: 'Cykling', color: 'bg-green-500' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning', color: 'bg-cyan-500' },
  ROWING: { icon: '🚣', label: 'Rodd', color: 'bg-purple-500' },
  ELLIPTICAL: { icon: '🏃‍♂️', label: 'Crosstrainer', color: 'bg-orange-500' },
}

type Modality = keyof typeof MODALITY_CONFIG

interface SubstitutionDay {
  date: string
  originalWorkout: {
    id: string
    type: string
    duration: number
    intensity: string
    tss: number
    description?: string
  } | null
  convertedWorkout: {
    modality: Modality
    duration: number
    intensity: string
    tss: number
    retentionPercent: number
    reasoning: string
  } | null
  hasSubstitution: boolean
}

interface WeeklySummary {
  totalRunningTSS: number
  totalCrossTrainingTSS: number
  averageRetention: number
  mostUsedModality: Modality | null
  daysSubstituted: number
  totalDays: number
}

interface SubstitutionData {
  clientId: string
  hasActiveInjury: boolean
  injuryType: string | null
  substitutions: SubstitutionDay[]
  summary: WeeklySummary
  recommendedModalities: Modality[]
}

interface SubstitutionScheduleProps {
  initialClientId?: string
}

export default function SubstitutionSchedule({
  initialClientId,
}: SubstitutionScheduleProps) {
  const { toast } = useToast()

  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || '')
  const [dateRange, setDateRange] = useState<7 | 14>(7)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null)

  // Fetch clients
  const { data: clientsResponse } = useSWR<{ success: boolean; data: any[] }>('/api/clients', fetcher, {
    refreshInterval: 30000,
  })
  const clients = clientsResponse?.data || []

  // Fetch substitutions
  const { data, error, isLoading, mutate } = useSWR<SubstitutionData>(
    selectedClient
      ? `/api/cross-training/substitutions/${selectedClient}?dateRange=${dateRange}`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    setEditingDay(null)
  }

  const handleEditDay = (date: string, currentModality: Modality) => {
    setEditingDay(date)
    setSelectedModality(currentModality)
  }

  const handleSaveEdit = async () => {
    if (!editingDay || !selectedModality) return

    // TODO: Implement API call to update workout modality
    // For now, just show success toast
    toast({
      title: 'Modalitet uppdaterad',
      description: `Pass för ${format(parseISO(editingDay), 'd MMM', { locale: sv })} ändrat till ${MODALITY_CONFIG[selectedModality].label}`,
    })

    setEditingDay(null)
    mutate() // Refresh data
  }

  const handleCancelEdit = () => {
    setEditingDay(null)
    setSelectedModality(null)
  }

  if (!selectedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Korstr.träningsschema</CardTitle>
          <CardDescription>
            Välj en atlet för att visa automatiska korstr.träningskonverteringar
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

  if (isLoading) {
    return <div className="text-muted-foreground">Laddar korstr.träningsschema...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Kunde inte ladda korstr.träningsschema.</AlertDescription>
      </Alert>
    )
  }

  if (!data?.hasActiveInjury) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingen aktiv skada</CardTitle>
          <CardDescription>
            Denna atlet har ingen aktiv skada. Korstr.träningskonverteringar är inte nödvändiga.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { substitutions, summary, injuryType, recommendedModalities } = data

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Korstr.träningsschema</h2>
          <p className="text-sm text-muted-foreground">
            Automatiska konverteringar baserat på {injuryType} skada
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <Select
            value={dateRange.toString()}
            onValueChange={(value) => setDateRange(parseInt(value) as 7 | 14)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dagar</SelectItem>
              <SelectItem value="14">14 dagar</SelectItem>
            </SelectContent>
          </Select>

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
        </div>
      </div>

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Veckosammanfattning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <div className="text-2xl font-bold">{summary.totalRunningTSS}</div>
              <div className="text-xs text-muted-foreground">Löp-TSS ersatt</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalCrossTrainingTSS}</div>
              <div className="text-xs text-muted-foreground">Korstr.-TSS</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.averageRetention}%</div>
              <div className="text-xs text-muted-foreground">Genomsnittlig retention</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {summary.mostUsedModality
                  ? MODALITY_CONFIG[summary.mostUsedModality].icon
                  : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Mest använd modalitet</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {summary.daysSubstituted}/{summary.totalDays}
              </div>
              <div className="text-xs text-muted-foreground">Dagar konverterade</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended modalities info */}
      {recommendedModalities && recommendedModalities.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Rekommenderade modaliteter för {injuryType}:</strong>{' '}
            {recommendedModalities.map((m) => MODALITY_CONFIG[m].label).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* 7-day calendar */}
      <div className="grid grid-cols-1 gap-4">
        {substitutions.map((day) => {
          const isEditing = editingDay === day.date

          return (
            <Card
              key={day.date}
              className={
                day.hasSubstitution
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-gray-200'
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">
                        {format(parseISO(day.date), 'EEEE d MMMM', { locale: sv })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(day.date), 'yyyy-MM-dd')}
                      </div>
                    </div>
                  </div>

                  {day.hasSubstitution && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleEditDay(day.date, day.convertedWorkout!.modality)
                      }
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Ändra
                    </Button>
                  )}
                </div>

                {!day.hasSubstitution ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Inget löppass planerat denna dag
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                    {/* Original workout */}
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">Originalpass</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold">
                          {day.originalWorkout!.type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {day.originalWorkout!.duration} min •{' '}
                          {day.originalWorkout!.intensity}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          TSS: {day.originalWorkout!.tss}
                        </div>
                        {day.originalWorkout!.description && (
                          <div className="text-xs text-muted-foreground italic mt-2">
                            {day.originalWorkout!.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-8 w-8 text-blue-500" />

                    {/* Converted workout */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {isEditing && selectedModality
                              ? MODALITY_CONFIG[selectedModality].icon
                              : MODALITY_CONFIG[day.convertedWorkout!.modality].icon}
                          </span>
                          <span className="font-semibold">Korstr.träning</span>
                        </div>
                        <Badge
                          className={
                            isEditing && selectedModality
                              ? MODALITY_CONFIG[selectedModality].color
                              : MODALITY_CONFIG[day.convertedWorkout!.modality].color
                          }
                        >
                          {isEditing && selectedModality
                            ? MODALITY_CONFIG[selectedModality].label
                            : MODALITY_CONFIG[day.convertedWorkout!.modality].label}
                        </Badge>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <Select
                            value={selectedModality || undefined}
                            onValueChange={(value) =>
                              setSelectedModality(value as Modality)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Välj modalitet..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(MODALITY_CONFIG) as Modality[]).map(
                                (modality) => (
                                  <SelectItem key={modality} value={modality}>
                                    {MODALITY_CONFIG[modality].icon}{' '}
                                    {MODALITY_CONFIG[modality].label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={!selectedModality}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Spara
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 mr-1" />
                              Avbryt
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-lg font-bold">
                            {day.convertedWorkout!.duration} min
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {day.convertedWorkout!.intensity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            TSS: {day.convertedWorkout!.tss} (
                            <span className="text-red-600">
                              <TrendingDown className="h-3 w-3 inline mr-1" />
                              {Math.round(
                                ((day.originalWorkout!.tss -
                                  day.convertedWorkout!.tss) /
                                  day.originalWorkout!.tss) *
                                  100
                              )}
                              %
                            </span>
                            )
                          </div>
                          <Badge variant="outline" className="mt-2">
                            {day.convertedWorkout!.retentionPercent}% fitnessretention
                          </Badge>
                          <div className="text-xs text-muted-foreground italic mt-2">
                            {day.convertedWorkout!.reasoning}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
