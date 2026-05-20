'use client'

import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { SportType } from '@prisma/client'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ConfigFormData } from './schema'
import type { AppLocale } from './helpers'

type CourtSport =
  | 'TEAM_BASKETBALL'
  | 'TEAM_HANDBALL'
  | 'TEAM_FLOORBALL'
  | 'TEAM_VOLLEYBALL'
  | 'TENNIS'
  | 'PADEL'

type CourtSeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs' | 'tournament'

type CourtSportConfig = {
  settingsKey:
    | 'basketballSettings'
    | 'handballSettings'
    | 'floorballSettings'
    | 'volleyballSettings'
    | 'tennisSettings'
    | 'padelSettings'
  profileField: 'position' | 'playStyle'
  label: Record<AppLocale, string>
  defaultProfile: string
  peakPhase: 'playoffs' | 'tournament'
  options: Array<{
    value: string
    label: Record<AppLocale, string>
  }>
}

type CourtSportProfileSettingsSource = Partial<Record<
  CourtSportConfig['settingsKey'],
  Record<string, unknown> | null | undefined
>>

const COURT_SPORT_CONFIGS: Record<CourtSport, CourtSportConfig> = {
  TEAM_BASKETBALL: {
    settingsKey: 'basketballSettings',
    profileField: 'position',
    label: { en: 'Basketball role', sv: 'Basketroll' },
    defaultProfile: 'small_forward',
    peakPhase: 'playoffs',
    options: [
      { value: 'point_guard', label: { en: 'Point guard', sv: 'Point guard' } },
      { value: 'shooting_guard', label: { en: 'Shooting guard', sv: 'Shooting guard' } },
      { value: 'small_forward', label: { en: 'Small forward', sv: 'Small forward' } },
      { value: 'power_forward', label: { en: 'Power forward', sv: 'Power forward' } },
      { value: 'center', label: { en: 'Center', sv: 'Center' } },
    ],
  },
  TEAM_HANDBALL: {
    settingsKey: 'handballSettings',
    profileField: 'position',
    label: { en: 'Handball position', sv: 'Handbollsposition' },
    defaultProfile: 'back',
    peakPhase: 'playoffs',
    options: [
      { value: 'goalkeeper', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
      { value: 'wing', label: { en: 'Wing', sv: 'Kantspelare' } },
      { value: 'back', label: { en: 'Back', sv: '9-meter' } },
      { value: 'center_back', label: { en: 'Center back', sv: 'Mittnia' } },
      { value: 'pivot', label: { en: 'Pivot', sv: 'Linjespelare' } },
    ],
  },
  TEAM_FLOORBALL: {
    settingsKey: 'floorballSettings',
    profileField: 'position',
    label: { en: 'Floorball position', sv: 'Innebandyposition' },
    defaultProfile: 'forward',
    peakPhase: 'playoffs',
    options: [
      { value: 'goalkeeper', label: { en: 'Goalkeeper', sv: 'Målvakt' } },
      { value: 'defender', label: { en: 'Defender', sv: 'Back' } },
      { value: 'center', label: { en: 'Center', sv: 'Center' } },
      { value: 'forward', label: { en: 'Forward', sv: 'Forward' } },
    ],
  },
  TEAM_VOLLEYBALL: {
    settingsKey: 'volleyballSettings',
    profileField: 'position',
    label: { en: 'Volleyball position', sv: 'Volleybollposition' },
    defaultProfile: 'outside_hitter',
    peakPhase: 'playoffs',
    options: [
      { value: 'setter', label: { en: 'Setter', sv: 'Passare' } },
      { value: 'outside_hitter', label: { en: 'Outside hitter', sv: 'Vänsterspiker' } },
      { value: 'opposite_hitter', label: { en: 'Opposite hitter', sv: 'Högerspiker' } },
      { value: 'middle_blocker', label: { en: 'Middle blocker', sv: 'Center' } },
      { value: 'libero', label: { en: 'Libero', sv: 'Libero' } },
    ],
  },
  TENNIS: {
    settingsKey: 'tennisSettings',
    profileField: 'playStyle',
    label: { en: 'Tennis play style', sv: 'Tennisspelstil' },
    defaultProfile: 'all_court',
    peakPhase: 'tournament',
    options: [
      { value: 'aggressive_baseliner', label: { en: 'Aggressive baseliner', sv: 'Aggressiv baslinjespelare' } },
      { value: 'serve_and_volleyer', label: { en: 'Serve and volley', sv: 'Serve och volley' } },
      { value: 'all_court', label: { en: 'All-court', sv: 'All-court' } },
      { value: 'counter_puncher', label: { en: 'Counter-puncher', sv: 'Kontringsspelare' } },
      { value: 'big_server', label: { en: 'Big server', sv: 'Stor servare' } },
    ],
  },
  PADEL: {
    settingsKey: 'padelSettings',
    profileField: 'position',
    label: { en: 'Padel side', sv: 'Padelsida' },
    defaultProfile: 'all_court',
    peakPhase: 'tournament',
    options: [
      { value: 'right_side', label: { en: 'Right side', sv: 'Högersida' } },
      { value: 'left_side', label: { en: 'Left side', sv: 'Vänstersida' } },
      { value: 'all_court', label: { en: 'All-court', sv: 'All-court' } },
    ],
  },
}

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

export function isCourtSportProgram(sport: SportType): sport is CourtSport {
  return sport in COURT_SPORT_CONFIGS
}

export function getCourtSportSettingsKey(sport: SportType): CourtSportConfig['settingsKey'] | null {
  return isCourtSportProgram(sport) ? COURT_SPORT_CONFIGS[sport].settingsKey : null
}

export function getCourtSportProfileSettings(
  sportProfile: CourtSportProfileSettingsSource | null | undefined,
  sport: SportType
): Record<string, unknown> | null {
  const key = getCourtSportSettingsKey(sport)
  if (!key || !sportProfile) return null
  const settings = sportProfile[key]
  return isRecord(settings) ? settings : null
}

export function getCourtSportProfileValue(
  sport: SportType,
  settings: Record<string, unknown> | null | undefined,
  locale: AppLocale
): string | undefined {
  if (!isCourtSportProgram(sport) || !settings) return undefined
  const config = COURT_SPORT_CONFIGS[sport]
  const profileValue = getString(settings[config.profileField])
  const profileLabel = config.options.find((option) => option.value === profileValue)?.label[locale]
  const phase = getString(settings.seasonPhase)
  const matchCount = getNumber(settings.matchesPerWeek) ?? getNumber(settings.matchesThisWeek)
  return [profileLabel, phase, matchCount !== undefined ? `${matchCount} ${t(locale, 'matcher', 'matches')}` : null]
    .filter(Boolean)
    .join(' · ') || config.label[locale]
}

export function getCourtSportProfileLabel(sport: SportType, locale: AppLocale): string | undefined {
  return isCourtSportProgram(sport) ? COURT_SPORT_CONFIGS[sport].label[locale] : undefined
}

export function buildCourtSportSettingsPayload(
  sport: SportType,
  goal: string,
  data: ConfigFormData,
  profileSettings?: Record<string, unknown> | null
): Partial<Pick<
  ConfigFormData,
  'basketballSettings' | 'handballSettings' | 'floorballSettings' | 'volleyballSettings' | 'tennisSettings' | 'padelSettings'
>> {
  if (!isCourtSportProgram(sport)) return {}

  const config = COURT_SPORT_CONFIGS[sport]
  const baseSettings = isRecord(profileSettings) ? profileSettings : {}
  const selectedProfile = config.profileField === 'playStyle' ? data.courtPlayStyle : data.courtPosition
  const phase = data.seasonPhase || getSeasonPhase(baseSettings.seasonPhase, goal, config)
  const matchesPerWeek = data.matchesPerWeek ??
    getNumber(baseSettings.matchesPerWeek) ??
    getNumber(baseSettings.matchesThisWeek) ??
    getDefaultMatchesPerWeek(goal, phase)

  return {
    [config.settingsKey]: {
      ...baseSettings,
      [config.profileField]: selectedProfile || getString(baseSettings[config.profileField]) || config.defaultProfile,
      seasonPhase: phase,
      matchesPerWeek,
      sessionsPerWeek: data.sessionsPerWeek,
    },
  }
}

export function CourtSportSettings({
  form,
  sport,
  goal,
  locale,
  profileSettings,
}: {
  form: UseFormReturn<ConfigFormData>
  sport: SportType
  goal: string
  locale: AppLocale
  profileSettings?: Record<string, unknown> | null
}) {
  const config = isCourtSportProgram(sport) ? COURT_SPORT_CONFIGS[sport] : null
  const profileFieldName = config?.profileField === 'playStyle' ? 'courtPlayStyle' : 'courtPosition'

  useEffect(() => {
    if (!config) return

    const seasonPhase = getSeasonPhase(profileSettings?.seasonPhase, goal, config)
    const matchesPerWeek = getNumber(profileSettings?.matchesPerWeek) ??
      getNumber(profileSettings?.matchesThisWeek) ??
      getDefaultMatchesPerWeek(goal, seasonPhase)
    const profileValue = getString(profileSettings?.[config.profileField]) || config.defaultProfile

    form.setValue(profileFieldName, profileValue)
    form.setValue('seasonPhase', seasonPhase)
    form.setValue('matchesPerWeek', matchesPerWeek)
  }, [config, form, goal, profileFieldName, profileSettings])

  if (!config) return null

  const phaseOptions = getSeasonPhaseOptions(config, locale)

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="font-medium mb-4">{t(locale, 'Sportspecifika inställningar', 'Sport-specific settings')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name={profileFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{config.label[locale]}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {config.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t(locale, 'Styr positionens krav, prevention och passfokus.', 'Controls role demands, prevention, and workout focus.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seasonPhase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(locale, 'Säsongsfas', 'Season phase')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t(locale, 'Påverkar belastning, matchinslag och toppning.', 'Affects load, match work, and peaking.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="matchesPerWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(locale, 'Matcher per vecka', 'Matches per week')}</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString() ?? '1'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t(locale, 'Används för att placera återhämtning, aktivering och hårda pass.', 'Used to place recovery, activation, and hard sessions.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function getSeasonPhaseOptions(config: CourtSportConfig, locale: AppLocale) {
  return [
    { value: 'off_season', label: t(locale, 'Off-season', 'Off-season') },
    { value: 'pre_season', label: t(locale, 'Försäsong', 'Pre-season') },
    { value: 'in_season', label: t(locale, 'Säsong', 'In-season') },
    {
      value: config.peakPhase,
      label: config.peakPhase === 'tournament'
        ? t(locale, 'Turnering', 'Tournament')
        : t(locale, 'Slutspel', 'Playoffs'),
    },
  ]
}

function getSeasonPhase(value: unknown, goal: string, config: CourtSportConfig): CourtSeasonPhase {
  const phase = getString(value)
  if (phase && isAllowedSeasonPhase(phase, config)) return phase
  return getDefaultSeasonPhase(goal, config)
}

function getDefaultSeasonPhase(goal: string, config: CourtSportConfig): CourtSeasonPhase {
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness' || goal === 'speed-power') return 'pre_season'
  if (goal === 'playoffs' || goal === 'tournament') return config.peakPhase
  return 'in_season'
}

function isAllowedSeasonPhase(phase: string, config: CourtSportConfig): phase is CourtSeasonPhase {
  return phase === 'off_season' ||
    phase === 'pre_season' ||
    phase === 'in_season' ||
    phase === config.peakPhase
}

function getDefaultMatchesPerWeek(goal: string, seasonPhase: string): number {
  if (goal === 'off-season-build' || seasonPhase === 'off_season' || seasonPhase === 'pre_season') return 0
  if (goal === 'playoffs' || goal === 'tournament' || seasonPhase === 'playoffs' || seasonPhase === 'tournament') return 2
  return 1
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
