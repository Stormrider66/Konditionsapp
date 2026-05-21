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
import { SPORT_OPTIONS as SHARED_SPORT_OPTIONS } from '@/lib/sports/catalog'
import { useLocale } from '@/i18n/client'

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

type AppLocale = 'en' | 'sv'

const SPORT_OPTIONS = [
  ...SHARED_SPORT_OPTIONS.map((sport) => ({ value: sport.value, label: { en: sport.en, sv: sport.sv } })),
  { value: 'NUTRITION', label: { en: 'Nutrition', sv: 'Nutrition' } },
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
  label: Record<AppLocale, string>
  teamField: TeamField
  teamLabel: Record<AppLocale, string>
  profileField: ProfileField
  profileLabel: Record<AppLocale, string>
  defaultSettings: SportSettingsMap[SportSettingsKey]
  profileOptions: Array<{ value: string; label: Record<AppLocale, string> }>
  phaseOptions: Array<{ value: string; label: Record<AppLocale, string> }>
}

const TEAM_PHASE_OPTIONS = [
  { value: 'off_season', label: { en: 'Off-season', sv: 'Off-season' } },
  { value: 'pre_season', label: { en: 'Pre-season', sv: 'Försäsong' } },
  { value: 'in_season', label: { en: 'In-season', sv: 'Säsong' } },
  { value: 'playoffs', label: { en: 'Playoffs', sv: 'Slutspel' } },
]

const RACKET_PHASE_OPTIONS = [
  { value: 'off_season', label: { en: 'Off-season', sv: 'Off-season' } },
  { value: 'pre_season', label: { en: 'Pre-season', sv: 'Försäsong' } },
  { value: 'in_season', label: { en: 'In-season', sv: 'Säsong' } },
  { value: 'tournament', label: { en: 'Tournament', sv: 'Turnering' } },
]

const SPORT_PROFILE_CONFIGS: SportProfileConfig[] = [
  {
    sport: 'TEAM_ICE_HOCKEY',
    settingsKey: 'hockeySettings',
    label: { en: 'Ice hockey', sv: 'Ishockey' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Position', sv: 'Position' },
    defaultSettings: { ...DEFAULT_HOCKEY_SETTINGS },
    profileOptions: [
      { value: 'center', label: { en: 'Center', sv: 'Center' } },
      { value: 'wing', label: { en: 'Wing/Forward', sv: 'Wing/Forward' } },
      { value: 'defense', label: { en: 'Defense', sv: 'Back' } },
      { value: 'goalie', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_FOOTBALL',
    settingsKey: 'footballSettings',
    label: { en: 'Football', sv: 'Fotboll' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Position', sv: 'Position' },
    defaultSettings: { ...DEFAULT_FOOTBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
      { value: 'defender', label: { en: 'Defender', sv: 'Försvarare' } },
      { value: 'midfielder', label: { en: 'Midfielder', sv: 'Mittfältare' } },
      { value: 'forward', label: { en: 'Forward', sv: 'Anfallare' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_HANDBALL',
    settingsKey: 'handballSettings',
    label: { en: 'Handball', sv: 'Handboll' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Position', sv: 'Position' },
    defaultSettings: { ...DEFAULT_HANDBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
      { value: 'wing', label: { en: 'Wing', sv: 'Kantspelare' } },
      { value: 'back', label: { en: 'Backcourt', sv: '9-meter' } },
      { value: 'center_back', label: { en: 'Center back', sv: 'Mittnia' } },
      { value: 'pivot', label: { en: 'Pivot', sv: 'Linjespelare' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_FLOORBALL',
    settingsKey: 'floorballSettings',
    label: { en: 'Floorball', sv: 'Innebandy' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Position', sv: 'Position' },
    defaultSettings: { ...DEFAULT_FLOORBALL_SETTINGS },
    profileOptions: [
      { value: 'goalkeeper', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
      { value: 'defender', label: { en: 'Defense', sv: 'Back' } },
      { value: 'center', label: { en: 'Center', sv: 'Center' } },
      { value: 'forward', label: { en: 'Forward', sv: 'Forward' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_BASKETBALL',
    settingsKey: 'basketballSettings',
    label: { en: 'Basketball', sv: 'Basket' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Role', sv: 'Roll' },
    defaultSettings: { ...DEFAULT_BASKETBALL_SETTINGS },
    profileOptions: [
      { value: 'point_guard', label: { en: 'Point guard', sv: 'Point guard' } },
      { value: 'shooting_guard', label: { en: 'Shooting guard', sv: 'Shooting guard' } },
      { value: 'small_forward', label: { en: 'Small forward', sv: 'Small forward' } },
      { value: 'power_forward', label: { en: 'Power forward', sv: 'Power forward' } },
      { value: 'center', label: { en: 'Center', sv: 'Center' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TEAM_VOLLEYBALL',
    settingsKey: 'volleyballSettings',
    label: { en: 'Volleyball', sv: 'Volleyboll' },
    teamField: 'teamName',
    teamLabel: { en: 'Team', sv: 'Lag' },
    profileField: 'position',
    profileLabel: { en: 'Position', sv: 'Position' },
    defaultSettings: { ...DEFAULT_VOLLEYBALL_SETTINGS },
    profileOptions: [
      { value: 'setter', label: { en: 'Setter', sv: 'Passare' } },
      { value: 'outside_hitter', label: { en: 'Outside hitter', sv: 'Vänsterspiker' } },
      { value: 'opposite_hitter', label: { en: 'Opposite hitter', sv: 'Högerspiker' } },
      { value: 'middle_blocker', label: { en: 'Center', sv: 'Center' } },
      { value: 'libero', label: { en: 'Libero', sv: 'Libero' } },
    ],
    phaseOptions: TEAM_PHASE_OPTIONS,
  },
  {
    sport: 'TENNIS',
    settingsKey: 'tennisSettings',
    label: { en: 'Tennis', sv: 'Tennis' },
    teamField: 'clubName',
    teamLabel: { en: 'Club', sv: 'Klubb' },
    profileField: 'playStyle',
    profileLabel: { en: 'Playing style', sv: 'Spelstil' },
    defaultSettings: { ...DEFAULT_TENNIS_SETTINGS },
    profileOptions: [
      { value: 'aggressive_baseliner', label: { en: 'Aggressive baseliner', sv: 'Aggressiv baslinjespelare' } },
      { value: 'serve_and_volleyer', label: { en: 'Serve and volley', sv: 'Serve och volley' } },
      { value: 'all_court', label: { en: 'All-court', sv: 'All-court' } },
      { value: 'counter_puncher', label: { en: 'Counter puncher', sv: 'Kontringsspelare' } },
      { value: 'big_server', label: { en: 'Big server', sv: 'Stor servare' } },
    ],
    phaseOptions: RACKET_PHASE_OPTIONS,
  },
  {
    sport: 'PADEL',
    settingsKey: 'padelSettings',
    label: { en: 'Padel', sv: 'Padel' },
    teamField: 'clubName',
    teamLabel: { en: 'Club', sv: 'Klubb' },
    profileField: 'position',
    profileLabel: { en: 'Side', sv: 'Sida' },
    defaultSettings: { ...DEFAULT_PADEL_SETTINGS },
    profileOptions: [
      { value: 'right_side', label: { en: 'Right side', sv: 'Högersida' } },
      { value: 'left_side', label: { en: 'Left side', sv: 'Vänstersida' } },
      { value: 'all_court', label: { en: 'All-court', sv: 'All-court' } },
    ],
    phaseOptions: RACKET_PHASE_OPTIONS,
  },
]

const SPORT_PROFILE_CONFIG_BY_SPORT = Object.fromEntries(
  SPORT_PROFILE_CONFIGS.map((config) => [config.sport, config])
) as Record<string, SportProfileConfig | undefined>

const COPY: Record<AppLocale, {
  updateError: string;
  updatedTitle: string;
  profileSavedDescription: (sport: string) => string;
  primaryUpdatedDescription: string;
  errorTitle: string;
  primarySport: string;
  chooseSport: string;
  saveSport: string;
  seasonPhase: string;
  savedValuesHint: string;
}> = {
  en: {
    updateError: 'Could not update sport profile',
    updatedTitle: 'Sport profile updated',
    profileSavedDescription: (sport) => `${sport} profile saved and can be used in program generation.`,
    primaryUpdatedDescription: 'Primary sport has been updated.',
    errorTitle: 'Error',
    primarySport: 'Primary sport',
    chooseSport: 'Choose sport',
    saveSport: 'Save sport',
    seasonPhase: 'Season phase',
    savedValuesHint: 'Saved values carry over to the program generator.',
  },
  sv: {
    updateError: 'Kunde inte uppdatera sportprofilen',
    updatedTitle: 'Sportprofil uppdaterad',
    profileSavedDescription: (sport) => `${sport}-profilen sparades och kan användas i programgenerering.`,
    primaryUpdatedDescription: 'Primär sport har uppdaterats.',
    errorTitle: 'Fel',
    primarySport: 'Primär sport',
    chooseSport: 'Välj sport',
    saveSport: 'Spara sport',
    seasonPhase: 'Säsongsfas',
    savedValuesHint: 'Sparade värden följer med till programgeneratorn.',
  },
}

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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
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
        throw new Error(result.error || copy.updateError)
      }

      onUpdated(result.data)
      toast({
        title: copy.updatedTitle,
        description: activeConfig
          ? copy.profileSavedDescription(activeConfig.label[locale])
          : copy.primaryUpdatedDescription,
      })
    } catch (error) {
      console.error('Error updating sport profile:', error)
      toast({
        title: copy.errorTitle,
        description: error instanceof Error ? error.message : copy.updateError,
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
            <Label htmlFor="primary-sport">{copy.primarySport}</Label>
            <Select value={primarySport} onValueChange={setPrimarySport}>
              <SelectTrigger id="primary-sport">
                <SelectValue placeholder={copy.chooseSport} />
              </SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((sport) => (
                  <SelectItem key={sport.value} value={sport.value}>
                    {sport.label[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeConfig && activeSettings && (
            <div className="space-y-2">
              <Label htmlFor="sport-team">{activeConfig.teamLabel[locale]}</Label>
              <Input
                id="sport-team"
                value={String(activeSettings[activeConfig.teamField] ?? '')}
                onChange={(event) => updateActiveSettings(activeConfig.teamField, event.target.value)}
                placeholder={activeConfig.teamLabel[locale]}
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {copy.saveSport}
        </Button>
      </div>

      {activeConfig && activeSettings && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sport-profile">{activeConfig.profileLabel[locale]}</Label>
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
                    {option.label[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport-phase">{copy.seasonPhase}</Label>
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
                    {phase.label[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Shield className="mb-2 h-4 w-4 text-blue-500" />
            <span className="pb-1">{copy.savedValuesHint}</span>
          </div>
        </div>
      )}
    </div>
  )
}
