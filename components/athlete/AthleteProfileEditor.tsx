'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Edit2, Save, X, RefreshCw } from 'lucide-react'
import { ChangeSportDialog } from './ChangeSportDialog'
import { SportType } from '@prisma/client'

// Import onboarding components for reuse
import { CyclingOnboarding, DEFAULT_CYCLING_SETTINGS, type CyclingSettings } from '@/components/onboarding/CyclingOnboarding'
import { SkiingOnboarding, DEFAULT_SKIING_SETTINGS, type SkiingSettings } from '@/components/onboarding/SkiingOnboarding'
import { SwimmingOnboarding, DEFAULT_SWIMMING_SETTINGS, type SwimmingSettings } from '@/components/onboarding/SwimmingOnboarding'
import { TriathlonOnboarding, DEFAULT_TRIATHLON_SETTINGS, type TriathlonSettings } from '@/components/onboarding/TriathlonOnboarding'
import { HYROXOnboarding, DEFAULT_HYROX_SETTINGS, type HYROXSettings } from '@/components/onboarding/HYROXOnboarding'
import { GeneralFitnessOnboarding, DEFAULT_GENERAL_FITNESS_SETTINGS, type GeneralFitnessSettings } from '@/components/onboarding/GeneralFitnessOnboarding'

const SPORT_DISPLAY: Record<string, { icon: string; label: string }> = {
  RUNNING: { icon: '🏃', label: 'Löpning' },
  CYCLING: { icon: '🚴', label: 'Cykling' },
  SKIING: { icon: '⛷️', label: 'Längdskidåkning' },
  TRIATHLON: { icon: '🏊', label: 'Triathlon' },
  HYROX: { icon: '💪', label: 'HYROX' },
  GENERAL_FITNESS: { icon: '🏋️', label: 'Allmän Fitness' },
  FUNCTIONAL_FITNESS: { icon: '🔥', label: 'Funktionell Fitness' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning' },
  TEAM_ICE_HOCKEY: { icon: '🏒', label: 'Ishockey' },
  TEAM_FOOTBALL: { icon: '⚽', label: 'Fotboll' },
  TEAM_HANDBALL: { icon: '🤾', label: 'Handboll' },
  TEAM_FLOORBALL: { icon: '🏑', label: 'Innebandy' },
  TEAM_BASKETBALL: { icon: '🏀', label: 'Basket' },
  TEAM_VOLLEYBALL: { icon: '🏐', label: 'Volleyboll' },
  TENNIS: { icon: '🎾', label: 'Tennis' },
  PADEL: { icon: '🎾', label: 'Padel' },
}

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: 'Nybörjare',
  INTERMEDIATE: 'Mellanliggande',
  ADVANCED: 'Avancerad',
  ELITE: 'Elit',
}

interface SportProfile {
  id: string
  primarySport: string
  secondarySports: string[]
  runningExperience?: string
  cyclingExperience?: string
  swimmingExperience?: string
  currentGoal?: string
  preferredSessionLength?: number
  // Sport-specific settings from JSON - using Partial for flexibility
  cyclingSettings?: Partial<CyclingSettings> | Record<string, unknown>
  skiingSettings?: Partial<SkiingSettings> | Record<string, unknown>
  swimmingSettings?: Partial<SwimmingSettings> | Record<string, unknown>
  triathlonSettings?: Partial<TriathlonSettings> | Record<string, unknown>
  hyroxSettings?: Partial<HYROXSettings> | Record<string, unknown>
  generalFitnessSettings?: Partial<GeneralFitnessSettings> | Record<string, unknown>
}

interface AthleteProfileEditorProps {
  clientId: string
  clientName: string
  clientEmail?: string
  sportProfile: SportProfile | null
}

export function AthleteProfileEditor({
  clientId,
  clientName,
  clientEmail,
  sportProfile,
}: AthleteProfileEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showChangeSportDialog, setShowChangeSportDialog] = useState(false)

  // Sport-specific settings states
  const [cyclingSettings, setCyclingSettings] = useState<CyclingSettings>(
    (sportProfile?.cyclingSettings as CyclingSettings) || DEFAULT_CYCLING_SETTINGS
  )
  const [skiingSettings, setSkiingSettings] = useState<SkiingSettings>(
    (sportProfile?.skiingSettings as SkiingSettings) || DEFAULT_SKIING_SETTINGS
  )
  const [swimmingSettings, setSwimmingSettings] = useState<SwimmingSettings>(
    (sportProfile?.swimmingSettings as SwimmingSettings) || DEFAULT_SWIMMING_SETTINGS
  )
  const [triathlonSettings, setTriathlonSettings] = useState<TriathlonSettings>(
    (sportProfile?.triathlonSettings as TriathlonSettings) || DEFAULT_TRIATHLON_SETTINGS
  )
  const [hyroxSettings, setHyroxSettings] = useState<HYROXSettings>(
    (sportProfile?.hyroxSettings as HYROXSettings) || DEFAULT_HYROX_SETTINGS
  )
  const [generalFitnessSettings, setGeneralFitnessSettings] = useState<GeneralFitnessSettings>(
    (sportProfile?.generalFitnessSettings as GeneralFitnessSettings) || DEFAULT_GENERAL_FITNESS_SETTINGS
  )

  const primarySport = sportProfile?.primarySport
  const sportDisplay = primarySport ? SPORT_DISPLAY[primarySport] : null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const requestBody: Record<string, unknown> = {}

      // Add sport-specific settings based on primary sport
      if (primarySport === 'CYCLING') {
        requestBody.cyclingSettings = cyclingSettings
      }
      if (primarySport === 'SKIING') {
        requestBody.skiingSettings = skiingSettings
      }
      if (primarySport === 'SWIMMING') {
        requestBody.swimmingSettings = swimmingSettings
      }
      if (primarySport === 'TRIATHLON') {
        requestBody.triathlonSettings = triathlonSettings
      }
      if (primarySport === 'HYROX') {
        requestBody.hyroxSettings = hyroxSettings
      }
      if (primarySport === 'GENERAL_FITNESS') {
        requestBody.generalFitnessSettings = generalFitnessSettings
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }

      toast({
        title: 'Profil uppdaterad!',
        description: 'Dina inställningar har sparats.',
      })

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara profilen. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to original values
    setCyclingSettings((sportProfile?.cyclingSettings as CyclingSettings) || DEFAULT_CYCLING_SETTINGS)
    setSkiingSettings((sportProfile?.skiingSettings as SkiingSettings) || DEFAULT_SKIING_SETTINGS)
    setSwimmingSettings((sportProfile?.swimmingSettings as SwimmingSettings) || DEFAULT_SWIMMING_SETTINGS)
    setTriathlonSettings((sportProfile?.triathlonSettings as TriathlonSettings) || DEFAULT_TRIATHLON_SETTINGS)
    setHyroxSettings((sportProfile?.hyroxSettings as HYROXSettings) || DEFAULT_HYROX_SETTINGS)
    setGeneralFitnessSettings((sportProfile?.generalFitnessSettings as GeneralFitnessSettings) || DEFAULT_GENERAL_FITNESS_SETTINGS)
    setIsEditing(false)
  }

  const renderSportSettings = () => {
    if (!primarySport) return null

    switch (primarySport) {
      case 'CYCLING':
        return (
          <CyclingOnboarding
            value={cyclingSettings}
            onChange={setCyclingSettings}
            locale="sv"
          />
        )
      case 'SKIING':
        return (
          <SkiingOnboarding
            value={skiingSettings}
            onChange={setSkiingSettings}
            locale="sv"
          />
        )
      case 'SWIMMING':
        return (
          <SwimmingOnboarding
            value={swimmingSettings}
            onChange={setSwimmingSettings}
            locale="sv"
          />
        )
      case 'TRIATHLON':
        return (
          <TriathlonOnboarding
            value={triathlonSettings}
            onChange={setTriathlonSettings}
            locale="sv"
          />
        )
      case 'HYROX':
        return (
          <HYROXOnboarding
            settings={hyroxSettings}
            onUpdate={setHyroxSettings}
          />
        )
      case 'GENERAL_FITNESS':
        return (
          <GeneralFitnessOnboarding
            settings={generalFitnessSettings}
            onUpdate={setGeneralFitnessSettings}
          />
        )
      default:
        return (
          <p className="text-muted-foreground">
            Inga sportspecifika inställningar tillgängliga för denna sport.
          </p>
        )
    }
  }

  const renderSportSummary = () => {
    if (!primarySport) return null

    switch (primarySport) {
      case 'CYCLING':
        return (
          <div className="space-y-2 text-sm">
            {cyclingSettings.currentFtp && <p><span className="text-muted-foreground">FTP:</span> {cyclingSettings.currentFtp}W</p>}
            {cyclingSettings.weight && <p><span className="text-muted-foreground">Vikt:</span> {cyclingSettings.weight}kg</p>}
            {cyclingSettings.primaryDiscipline && <p><span className="text-muted-foreground">Disciplin:</span> {cyclingSettings.primaryDiscipline}</p>}
            {cyclingSettings.bikeTypes && cyclingSettings.bikeTypes.length > 0 && <p><span className="text-muted-foreground">Cyklar:</span> {cyclingSettings.bikeTypes.join(', ')}</p>}
          </div>
        )
      case 'SKIING':
        return (
          <div className="space-y-2 text-sm">
            {skiingSettings.technique && <p><span className="text-muted-foreground">Teknik:</span> {skiingSettings.technique}</p>}
            {skiingSettings.primaryDiscipline && <p><span className="text-muted-foreground">Disciplin:</span> {skiingSettings.primaryDiscipline}</p>}
          </div>
        )
      case 'SWIMMING':
        return (
          <div className="space-y-2 text-sm">
            {swimmingSettings.currentCss && <p><span className="text-muted-foreground">CSS:</span> {swimmingSettings.currentCss}s/100m</p>}
            {swimmingSettings.primaryStroke && <p><span className="text-muted-foreground">Primär simtag:</span> {swimmingSettings.primaryStroke}</p>}
            {swimmingSettings.strokeTypes && swimmingSettings.strokeTypes.length > 0 && <p><span className="text-muted-foreground">Simtag:</span> {swimmingSettings.strokeTypes.join(', ')}</p>}
          </div>
        )
      case 'TRIATHLON':
        return (
          <div className="space-y-2 text-sm">
            {triathlonSettings.targetRaceDistance && <p><span className="text-muted-foreground">Distans:</span> {triathlonSettings.targetRaceDistance}</p>}
            {triathlonSettings.weakestDiscipline && <p><span className="text-muted-foreground">Svagaste disciplin:</span> {triathlonSettings.weakestDiscipline}</p>}
          </div>
        )
      case 'HYROX':
        return (
          <div className="space-y-2 text-sm">
            {hyroxSettings.raceCategory && <p><span className="text-muted-foreground">Kategori:</span> {hyroxSettings.raceCategory}</p>}
            {hyroxSettings.experienceLevel && <p><span className="text-muted-foreground">Nivå:</span> {hyroxSettings.experienceLevel}</p>}
          </div>
        )
      case 'GENERAL_FITNESS':
        return (
          <div className="space-y-2 text-sm">
            {generalFitnessSettings.primaryGoal && <p><span className="text-muted-foreground">Mål:</span> {generalFitnessSettings.primaryGoal}</p>}
            {generalFitnessSettings.fitnessLevel && <p><span className="text-muted-foreground">Nivå:</span> {generalFitnessSettings.fitnessLevel}</p>}
            {generalFitnessSettings.weeklyWorkouts && <p><span className="text-muted-foreground">Pass/vecka:</span> {generalFitnessSettings.weeklyWorkouts}</p>}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personlig information</CardTitle>
          <CardDescription>Dina grundläggande uppgifter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Namn</p>
            <p className="font-medium">{clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{clientEmail || 'Ej angett'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sport Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sportprofil</CardTitle>
            <CardDescription>Din träningsinriktning och inställningar</CardDescription>
          </div>
          {sportProfile && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Redigera
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sportProfile ? (
            <div className="space-y-6">
              {/* Primary Sport Display */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Huvudsport</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sportDisplay && (
                      <>
                        <span className="text-2xl">{sportDisplay.icon}</span>
                        <span className="font-medium">{sportDisplay.label}</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeSportDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Byt sport
                  </Button>
                </div>
              </div>

              {/* Secondary Sports */}
              {sportProfile.secondarySports && sportProfile.secondarySports.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Sekundära sporter</p>
                  <div className="flex flex-wrap gap-2">
                    {sportProfile.secondarySports.map((sport) => {
                      const display = SPORT_DISPLAY[sport]
                      return (
                        <Badge key={sport} variant="secondary">
                          {display?.icon} {display?.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sport-Specific Settings */}
              {isEditing ? (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Sportspecifika inställningar</h4>
                    {renderSportSettings()}
                  </div>

                  {/* Save/Cancel buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Spara ändringar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Aktuella inställningar</h4>
                  {renderSportSummary()}
                </div>
              )}

              {/* General Info */}
              {sportProfile.currentGoal && !isEditing && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Nuvarande mål</p>
                  <p className="font-medium">{sportProfile.currentGoal}</p>
                </div>
              )}

              {sportProfile.preferredSessionLength && !isEditing && (
                <div>
                  <p className="text-sm text-muted-foreground">Föredragen passlängd</p>
                  <p className="font-medium">{sportProfile.preferredSessionLength} minuter</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Du har inte slutfört din sportprofil ännu.{' '}
              <Link href="/athlete/onboarding" className="text-primary underline">
                Slutför nu
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Change Sport Dialog */}
      {sportProfile && (
        <ChangeSportDialog
          open={showChangeSportDialog}
          onOpenChange={setShowChangeSportDialog}
          clientId={clientId}
          currentSport={sportProfile.primarySport as SportType}
        />
      )}
    </div>
  )
}
