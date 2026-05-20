'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Edit2, Save, X, RefreshCw } from 'lucide-react'
import { ChangeSportDialog } from './ChangeSportDialog'
import { SportType } from '@prisma/client'
import { useBasePath } from '@/lib/contexts/BasePathContext'

// Import onboarding components for reuse
import { CyclingOnboarding, DEFAULT_CYCLING_SETTINGS, type CyclingSettings } from '@/components/onboarding/CyclingOnboarding'
import { SkiingOnboarding, DEFAULT_SKIING_SETTINGS, type SkiingSettings } from '@/components/onboarding/SkiingOnboarding'
import { SwimmingOnboarding, DEFAULT_SWIMMING_SETTINGS, type SwimmingSettings } from '@/components/onboarding/SwimmingOnboarding'
import { TriathlonOnboarding, DEFAULT_TRIATHLON_SETTINGS, type TriathlonSettings } from '@/components/onboarding/TriathlonOnboarding'
import { HYROXOnboarding, DEFAULT_HYROX_SETTINGS, type HYROXSettings } from '@/components/onboarding/HYROXOnboarding'
import { GeneralFitnessOnboarding, DEFAULT_GENERAL_FITNESS_SETTINGS, type GeneralFitnessSettings } from '@/components/onboarding/GeneralFitnessOnboarding'

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const SPORT_DISPLAY: Record<string, { icon: string; label: Record<AppLocale, string> }> = {
  RUNNING: { icon: '🏃', label: { sv: 'Löpning', en: 'Running' } },
  CYCLING: { icon: '🚴', label: { sv: 'Cykling', en: 'Cycling' } },
  SKIING: { icon: '⛷️', label: { sv: 'Längdskidåkning', en: 'Cross-country skiing' } },
  TRIATHLON: { icon: '🏊', label: { sv: 'Triathlon', en: 'Triathlon' } },
  HYROX: { icon: '💪', label: { sv: 'HYROX', en: 'HYROX' } },
  GENERAL_FITNESS: { icon: '🏋️', label: { sv: 'Allmän Fitness', en: 'General Fitness' } },
  FUNCTIONAL_FITNESS: { icon: '🔥', label: { sv: 'Funktionell Fitness', en: 'Functional Fitness' } },
  SWIMMING: { icon: '🏊‍♂️', label: { sv: 'Simning', en: 'Swimming' } },
  TEAM_ICE_HOCKEY: { icon: '🏒', label: { sv: 'Ishockey', en: 'Ice hockey' } },
  TEAM_FOOTBALL: { icon: '⚽', label: { sv: 'Fotboll', en: 'Football' } },
  TEAM_HANDBALL: { icon: '🤾', label: { sv: 'Handboll', en: 'Handball' } },
  TEAM_FLOORBALL: { icon: '🏑', label: { sv: 'Innebandy', en: 'Floorball' } },
  TEAM_BASKETBALL: { icon: '🏀', label: { sv: 'Basket', en: 'Basketball' } },
  TEAM_VOLLEYBALL: { icon: '🏐', label: { sv: 'Volleyboll', en: 'Volleyball' } },
  TENNIS: { icon: '🎾', label: { sv: 'Tennis', en: 'Tennis' } },
  PADEL: { icon: '🎾', label: { sv: 'Padel', en: 'Padel' } },
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
  const locale = getAppLocale(useLocale())
  const basePath = useBasePath()
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
        title: t(locale, 'Profil uppdaterad!', 'Profile updated!'),
        description: t(locale, 'Dina inställningar har sparats.', 'Your settings have been saved.'),
      })

      setIsEditing(false)
      router.refresh()
    } catch {
      toast({
        title: t(locale, 'Fel', 'Error'),
        description: t(locale, 'Kunde inte spara profilen. Försök igen.', 'Could not save the profile. Try again.'),
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
            locale={locale}
          />
        )
      case 'SKIING':
        return (
          <SkiingOnboarding
            value={skiingSettings}
            onChange={setSkiingSettings}
            locale={locale}
          />
        )
      case 'SWIMMING':
        return (
          <SwimmingOnboarding
            value={swimmingSettings}
            onChange={setSwimmingSettings}
            locale={locale}
          />
        )
      case 'TRIATHLON':
        return (
          <TriathlonOnboarding
            value={triathlonSettings}
            onChange={setTriathlonSettings}
            locale={locale}
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
            {t(locale, 'Inga sportspecifika inställningar tillgängliga för denna sport.', 'No sport-specific settings are available for this sport.')}
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
            {cyclingSettings.weight && <p><span className="text-muted-foreground">{t(locale, 'Vikt:', 'Weight:')}</span> {cyclingSettings.weight}kg</p>}
            {cyclingSettings.primaryDiscipline && <p><span className="text-muted-foreground">{t(locale, 'Disciplin:', 'Discipline:')}</span> {cyclingSettings.primaryDiscipline}</p>}
            {cyclingSettings.bikeTypes && cyclingSettings.bikeTypes.length > 0 && <p><span className="text-muted-foreground">{t(locale, 'Cyklar:', 'Bikes:')}</span> {cyclingSettings.bikeTypes.join(', ')}</p>}
          </div>
        )
      case 'SKIING':
        return (
          <div className="space-y-2 text-sm">
            {skiingSettings.technique && <p><span className="text-muted-foreground">{t(locale, 'Teknik:', 'Technique:')}</span> {skiingSettings.technique}</p>}
            {skiingSettings.primaryDiscipline && <p><span className="text-muted-foreground">{t(locale, 'Disciplin:', 'Discipline:')}</span> {skiingSettings.primaryDiscipline}</p>}
          </div>
        )
      case 'SWIMMING':
        return (
          <div className="space-y-2 text-sm">
            {swimmingSettings.currentCss && <p><span className="text-muted-foreground">CSS:</span> {swimmingSettings.currentCss}s/100m</p>}
            {swimmingSettings.primaryStroke && <p><span className="text-muted-foreground">{t(locale, 'Primär simtag:', 'Primary stroke:')}</span> {swimmingSettings.primaryStroke}</p>}
            {swimmingSettings.strokeTypes && swimmingSettings.strokeTypes.length > 0 && <p><span className="text-muted-foreground">{t(locale, 'Simtag:', 'Strokes:')}</span> {swimmingSettings.strokeTypes.join(', ')}</p>}
          </div>
        )
      case 'TRIATHLON':
        return (
          <div className="space-y-2 text-sm">
            {triathlonSettings.targetRaceDistance && <p><span className="text-muted-foreground">{t(locale, 'Distans:', 'Distance:')}</span> {triathlonSettings.targetRaceDistance}</p>}
            {triathlonSettings.weakestDiscipline && <p><span className="text-muted-foreground">{t(locale, 'Svagaste disciplin:', 'Weakest discipline:')}</span> {triathlonSettings.weakestDiscipline}</p>}
          </div>
        )
      case 'HYROX':
        return (
          <div className="space-y-2 text-sm">
            {hyroxSettings.raceCategory && <p><span className="text-muted-foreground">{t(locale, 'Kategori:', 'Category:')}</span> {hyroxSettings.raceCategory}</p>}
            {hyroxSettings.experienceLevel && <p><span className="text-muted-foreground">{t(locale, 'Nivå:', 'Level:')}</span> {hyroxSettings.experienceLevel}</p>}
          </div>
        )
      case 'GENERAL_FITNESS':
        return (
          <div className="space-y-2 text-sm">
            {generalFitnessSettings.primaryGoal && <p><span className="text-muted-foreground">{t(locale, 'Mål:', 'Goal:')}</span> {generalFitnessSettings.primaryGoal}</p>}
            {generalFitnessSettings.fitnessLevel && <p><span className="text-muted-foreground">{t(locale, 'Nivå:', 'Level:')}</span> {generalFitnessSettings.fitnessLevel}</p>}
            {generalFitnessSettings.weeklyWorkouts && <p><span className="text-muted-foreground">{t(locale, 'Pass/vecka:', 'Sessions/week:')}</span> {generalFitnessSettings.weeklyWorkouts}</p>}
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
          <CardTitle>{t(locale, 'Personlig information', 'Personal information')}</CardTitle>
          <CardDescription>{t(locale, 'Dina grundläggande uppgifter', 'Your basic details')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Namn</p>
            <p className="font-medium">{clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{clientEmail || t(locale, 'Ej angett', 'Not provided')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sport Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t(locale, 'Sportprofil', 'Sport profile')}</CardTitle>
            <CardDescription>{t(locale, 'Din träningsinriktning och inställningar', 'Your training focus and settings')}</CardDescription>
          </div>
          {sportProfile && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              {t(locale, 'Redigera', 'Edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sportProfile ? (
            <div className="space-y-6">
              {/* Primary Sport Display */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t(locale, 'Huvudsport', 'Primary sport')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sportDisplay && (
                      <>
                        <span className="text-2xl">{sportDisplay.icon}</span>
                        <span className="font-medium">{sportDisplay.label[locale]}</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeSportDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t(locale, 'Byt sport', 'Change sport')}
                  </Button>
                </div>
              </div>

              {/* Secondary Sports */}
              {sportProfile.secondarySports && sportProfile.secondarySports.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t(locale, 'Sekundära sporter', 'Secondary sports')}</p>
                  <div className="flex flex-wrap gap-2">
                    {sportProfile.secondarySports.map((sport) => {
                      const display = SPORT_DISPLAY[sport]
                      return (
                        <Badge key={sport} variant="secondary">
                          {display?.icon} {display?.label[locale]}
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
                    <h4 className="font-medium mb-4">{t(locale, 'Sportspecifika inställningar', 'Sport-specific settings')}</h4>
                    {renderSportSettings()}
                  </div>

                  {/* Save/Cancel buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" />
                      {t(locale, 'Avbryt', 'Cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {t(locale, 'Spara ändringar', 'Save changes')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">{t(locale, 'Aktuella inställningar', 'Current settings')}</h4>
                  {renderSportSummary()}
                </div>
              )}

              {/* General Info */}
              {sportProfile.currentGoal && !isEditing && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">{t(locale, 'Nuvarande mål', 'Current goal')}</p>
                  <p className="font-medium">{sportProfile.currentGoal}</p>
                </div>
              )}

              {sportProfile.preferredSessionLength && !isEditing && (
                <div>
                  <p className="text-sm text-muted-foreground">{t(locale, 'Föredragen passlängd', 'Preferred session length')}</p>
                  <p className="font-medium">{sportProfile.preferredSessionLength} {t(locale, 'minuter', 'minutes')}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t(locale, 'Du har inte slutfört din sportprofil ännu.', 'You have not completed your sport profile yet.')}{' '}
              <Link href={`${basePath}/athlete/onboarding`} className="text-primary underline">
                {t(locale, 'Slutför nu', 'Complete now')}
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
