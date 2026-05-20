'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { DEFAULT_HOCKEY_SETTINGS } from '@/components/onboarding/HockeyOnboarding'
import { DEFAULT_FOOTBALL_SETTINGS } from '@/components/onboarding/FootballOnboarding'
import { DEFAULT_HANDBALL_SETTINGS } from '@/components/onboarding/HandballOnboarding'
import { DEFAULT_FLOORBALL_SETTINGS } from '@/components/onboarding/FloorballOnboarding'
import { DEFAULT_BASKETBALL_SETTINGS } from '@/components/onboarding/BasketballOnboarding'
import { DEFAULT_VOLLEYBALL_SETTINGS } from '@/components/onboarding/VolleyballOnboarding'
import { DEFAULT_TENNIS_SETTINGS } from '@/components/onboarding/TennisOnboarding'
import { DEFAULT_PADEL_SETTINGS } from '@/components/onboarding/PadelOnboarding'

interface SportProfileEditorProps {
  clientId: string
  sportProfile: {
    primarySport?: string
    secondarySports?: string[]
    hockeySettings?: unknown
    footballSettings?: unknown
    handballSettings?: unknown
    floorballSettings?: unknown
    basketballSettings?: unknown
    volleyballSettings?: unknown
    tennisSettings?: unknown
    padelSettings?: unknown
    [key: string]: unknown
  } | null
  onUpdated: (sportProfile: SportProfileEditorProps['sportProfile']) => void
}

const SPORT_OPTIONS = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SKIING', label: 'Längdskidåkning' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'HYROX', label: 'HYROX' },
  { value: 'GENERAL_FITNESS', label: 'Allmän fitness' },
  { value: 'FUNCTIONAL_FITNESS', label: 'Funktionell fitness' },
  { value: 'STRENGTH', label: 'Styrketräning' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PADEL', label: 'Padel' },
  { value: 'NUTRITION', label: 'Nutrition' },
]

type SportSettingsMap = {
  hockeySettings: Record<string, unknown>
  footballSettings: Record<string, unknown>
  handballSettings: Record<string, unknown>
  floorballSettings: Record<string, unknown>
  basketballSettings: Record<string, unknown>
  volleyballSettings: Record<string, unknown>
  tennisSettings: Record<string, unknown>
  padelSettings: Record<string, unknown>
}

type SportSettingsKey = keyof SportSettingsMap
type ProfileField = 'position' | 'playStyle'
type TeamField = 'teamName' | 'clubName'

type SportProfileConfig = {
  sport: string
  settingsKey: SportSettingsKey
  label: string
  teamField: TeamField
  teamLabel: string
  profileField: ProfileField
  profileLabel: string
  defaultSettings: SportSettingsMap[SportSettingsKey]
  profileOptions: Array<{ value: string; label: string }>
  phaseOptions: Array<{ value: string; label: string }>
}

const TEAM_PHASE_OPTIONS = [
  { value: 'off_season', label: 'Off-season' },
  { value: 'pre_season', label: 'Försäsong' },
  { value: 'in_season', label: 'Säsong' },
  { value: 'playoffs', label: 'Slutspel' },
]

const RACKET_PHASE_OPTIONS = [
  { value: 'off_season', label: 'Off-season' },
  { value: 'pre_season', label: 'Försäsong' },
  { value: 'in_season', label: 'Säsong' },
  { value: 'tournament', label: 'Turnering' },
]

const SPORT_PROFILE_CONFIGS: SportProfileConfig[] = [
  {
    sport: 'TEAM_ICE_HOCKEY',
    settingsKey: 'hockeySettings',
    label: 'Ishockey',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Position',
    defaultSettings: { ...DEFAULT_HOCKEY_SETTINGS },
    profileOptions: [
      { value: 'center', label: 'Center' },
      { value: 'wing', label: 'Wing/Forward' },
      { value: 'defense', label: 'Back' },
      { value: 'goalie', label: 'Målvakt' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_FOOTBALL',
    settingsKey: 'footballSettings',
    label: 'Fotboll',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Position',
    defaultSettings: { ...DEFAULT_FOOTBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: 'Målvakt' },
      { value: 'defender', label: 'Försvarare' },
      { value: 'midfielder', label: 'Mittfältare' },
      { value: 'forward', label: 'Anfallare' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_HANDBALL',
    settingsKey: 'handballSettings',
    label: 'Handboll',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Position',
    defaultSettings: { ...DEFAULT_HANDBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: 'Målvakt' },
      { value: 'wing', label: 'Kantspelare' },
      { value: 'back', label: '9-meter' },
      { value: 'center_back', label: 'Mittnia' },
      { value: 'pivot', label: 'Linjespelare' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_FLOORBALL',
    settingsKey: 'floorballSettings',
    label: 'Innebandy',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Position',
    defaultSettings: { ...DEFAULT_FLOORBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: 'Målvakt' },
      { value: 'defender', label: 'Back' },
      { value: 'center', label: 'Center' },
      { value: 'forward', label: 'Forward' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_BASKETBALL',
    settingsKey: 'basketballSettings',
    label: 'Basket',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Roll',
    defaultSettings: { ...DEFAULT_BASKETBALL_SETTINGS },
    profileOptions: [
      { value: 'point_guard', label: 'Point guard' },
      { value: 'shooting_guard', label: 'Shooting guard' },
      { value: 'small_forward', label: 'Small forward' },
      { value: 'power_forward', label: 'Power forward' },
      { value: 'center', label: 'Center' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_VOLLEYBALL',
    settingsKey: 'volleyballSettings',
    label: 'Volleyboll',
    teamField: 'teamName',
    teamLabel: 'Lag',
    profileField: 'position',
    profileLabel: 'Position',
    defaultSettings: { ...DEFAULT_VOLLEYBALL_SETTINGS },
    profileOptions: [
      { value: 'setter', label: 'Passare' },
      { value: 'outside_hitter', label: 'Vänsterspiker' },
      { value: 'opposite_hitter', label: 'Högerspiker' },
      { value: 'middle_blocker', label: 'Center' },
      { value: 'libero', label: 'Libero' },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TENNIS',
    settingsKey: 'tennisSettings',
    label: 'Tennis',
    teamField: 'clubName',
    teamLabel: 'Klubb',
    profileField: 'playStyle',
    profileLabel: 'Spelstil',
    defaultSettings: { ...DEFAULT_TENNIS_SETTINGS },
    profileOptions: [
      { value: 'aggressive_baseliner', label: 'Aggressiv baslinjespelare' },
      { value: 'serve_and_volleyer', label: 'Serve och volley' },
      { value: 'all_court', label: 'All-court' },
      { value: 'counter_puncher', label: 'Kontringsspelare' },
      { value: 'big_server', label: 'Stor servare' },
    ],
    phaseOptions: RACKET_PHASE_OPTIONS,
  },
  {
    sport: 'PADEL',
    settingsKey: 'padelSettings',
    label: 'Padel',
    teamField: 'clubName',
    teamLabel: 'Klubb',
    profileField: 'position',
    profileLabel: 'Sida',
    defaultSettings: { ...DEFAULT_PADEL_SETTINGS },
    profileOptions: [
      { value: 'right_side', label: 'Högersida' },
      { value: 'left_side', label: 'Vänstersida' },
      { value: 'all_court', label: 'All-court' },
    ],
    phaseOptions: RACKET_PHASE_OPTIONS,
  },
]

const SPORT_PROFILE_CONFIG_BY_SPORT = Object.fromEntries(
  SPORT_PROFILE_CONFIGS.map((config) => [config.sport, config])
) as Record<string, SportProfileConfig | undefined>

function asSettings(settings: unknown, defaults: object): Record<string, unknown> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ...defaults }
  }

  return {
    ...defaults,
    ...(settings as Record<string, unknown>),
  }
}

export function SportProfileEditor({ clientId, sportProfile, onUpdated }: SportProfileEditorProps) {
  const { toast } = useToast()
  const [primarySport, setPrimarySport] = useState(sportProfile?.primarySport || 'RUNNING')
  const [settingsByKey, setSettingsByKey] = useState<SportSettingsMap>(() => ({
    hockeySettings: asSettings(sportProfile?.hockeySettings, DEFAULT_HOCKEY_SETTINGS),
    footballSettings: asSettings(sportProfile?.footballSettings, DEFAULT_FOOTBALL_SETTINGS),
    handballSettings: asSettings(sportProfile?.handballSettings, DEFAULT_HANDBALL_SETTINGS),
    floorballSettings: asSettings(sportProfile?.floorballSettings, DEFAULT_FLOORBALL_SETTINGS),
    basketballSettings: asSettings(sportProfile?.basketballSettings, DEFAULT_BASKETBALL_SETTINGS),
    volleyballSettings: asSettings(sportProfile?.volleyballSettings, DEFAULT_VOLLEYBALL_SETTINGS),
    tennisSettings: asSettings(sportProfile?.tennisSettings, DEFAULT_TENNIS_SETTINGS),
    padelSettings: asSettings(sportProfile?.padelSettings, DEFAULT_PADEL_SETTINGS),
  }))
  const [saving, setSaving] = useState(false)
  const activeConfig = SPORT_PROFILE_CONFIG_BY_SPORT[primarySport]
  const activeSettings = activeConfig ? settingsByKey[activeConfig.settingsKey] : null

  const secondarySports = useMemo(
    () => (sportProfile?.secondarySports || []).filter((sport) => sport !== primarySport),
    [primarySport, sportProfile?.secondarySports]
  )

  const updateActiveSettings = (key: string, value: unknown) => {
    if (!activeConfig) return

    setSettingsByKey((current) => ({
      ...current,
      [activeConfig.settingsKey]: {
        ...current[activeConfig.settingsKey],
        [key]: value,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        primarySport,
        secondarySports,
      }

      if (activeConfig) {
        body[activeConfig.settingsKey] = settingsByKey[activeConfig.settingsKey]
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kunde inte uppdatera sportprofilen')
      }

      onUpdated(result.data)
      toast({
        title: 'Sportprofil uppdaterad',
        description: activeConfig
          ? `${activeConfig.label}-profilen sparades och kan användas i programgenerering.`
          : 'Primär sport har uppdaterats.',
      })
    } catch (error) {
      console.error('Error updating sport profile:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte uppdatera sportprofilen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-sport">Primär sport</Label>
            <Select value={primarySport} onValueChange={setPrimarySport}>
              <SelectTrigger id="primary-sport">
                <SelectValue placeholder="Välj sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((sport) => (
                  <SelectItem key={sport.value} value={sport.value}>
                    {sport.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeConfig && activeSettings && (
            <div className="space-y-2">
              <Label htmlFor="sport-team">{activeConfig.teamLabel}</Label>
              <Input
                id="sport-team"
                value={String(activeSettings[activeConfig.teamField] ?? '')}
                onChange={(event) => updateActiveSettings(activeConfig.teamField, event.target.value)}
                placeholder={activeConfig.teamLabel}
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Spara sport
        </Button>
      </div>

      {activeConfig && activeSettings && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sport-profile">{activeConfig.profileLabel}</Label>
            <Select
              value={String(activeSettings[activeConfig.profileField] ?? '')}
              onValueChange={(value) => updateActiveSettings(activeConfig.profileField, value)}
            >
              <SelectTrigger id="sport-profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeConfig.profileOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport-phase">Säsongsfas</Label>
            <Select
              value={String(activeSettings.seasonPhase ?? '')}
              onValueChange={(value) => updateActiveSettings('seasonPhase', value)}
            >
              <SelectTrigger id="sport-phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeConfig.phaseOptions.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    {phase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Shield className="mb-2 h-4 w-4 text-blue-500" />
            <span className="pb-1">Sparade värden följer med till programgeneratorn.</span>
          </div>
        </div>
      )}
    </div>
  )
}
