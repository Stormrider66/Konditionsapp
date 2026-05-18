'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, Timer, Target, Flame, Shield, Zap, MapPin, Activity } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

// ==================== TYPES ====================

export interface FootballSettings {
  // Position & Team
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward'
  positionDetail: string // e.g., 'central_defender', 'left_winger', etc.
  teamName: string
  leagueLevel: 'recreational' | 'division_4' | 'division_3' | 'division_2' | 'division_1' | 'superettan' | 'allsvenskan'

  // Season
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'

  // Playing stats
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number

  // Play style
  playStyle: 'possession' | 'counter' | 'pressing' | 'physical'

  // GPS data (if available)
  hasGPSData: boolean
  gpsProvider: string
  avgMatchDistanceKm: number | null
  avgSprintDistanceM: number | null

  // Physical benchmarks
  benchmarks: {
    yoyoIR1Level: number | null
    yoyoIR2Level: number | null
    sprint10m: number | null // seconds
    sprint30m: number | null // seconds
    cmjHeight: number | null // cm
    agilityTest: number | null // seconds
  }

  // Focus areas
  strengthFocus: string[]
  weaknesses: string[]

  // Injury history
  injuryHistory: string[]

  // Training preferences
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  preferredFootwork: 'right' | 'left' | 'both'
}

export const DEFAULT_FOOTBALL_SETTINGS: FootballSettings = {
  position: 'midfielder',
  positionDetail: '',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  matchesPerWeek: 1,
  avgMinutesPerMatch: null,
  yearsPlaying: 0,
  playStyle: 'possession',
  hasGPSData: false,
  gpsProvider: '',
  avgMatchDistanceKm: null,
  avgSprintDistanceM: null,
  benchmarks: {
    yoyoIR1Level: null,
    yoyoIR2Level: null,
    sprint10m: null,
    sprint30m: null,
    cmjHeight: null,
    agilityTest: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  preferredFootwork: 'right',
}

// ==================== CONSTANTS ====================

const POSITIONS = [
  { value: 'goalkeeper', label: 'positionOptions.goalkeeper.label', description: 'positionOptions.goalkeeper.description' },
  { value: 'defender', label: 'positionOptions.defender.label', description: 'positionOptions.defender.description' },
  { value: 'midfielder', label: 'positionOptions.midfielder.label', description: 'positionOptions.midfielder.description' },
  { value: 'forward', label: 'positionOptions.forward.label', description: 'positionOptions.forward.description' },
]

const POSITION_DETAILS: Record<string, { value: string; label: string }[]> = {
  goalkeeper: [
    { value: 'goalkeeper', label: 'positionDetails.goalkeeper.goalkeeper' },
  ],
  defender: [
    { value: 'center_back', label: 'positionDetails.defender.centerBack' },
    { value: 'left_back', label: 'positionDetails.defender.leftBack' },
    { value: 'right_back', label: 'positionDetails.defender.rightBack' },
    { value: 'wing_back', label: 'positionDetails.defender.wingBack' },
    { value: 'sweeper', label: 'positionDetails.defender.sweeper' },
  ],
  midfielder: [
    { value: 'defensive_mid', label: 'positionDetails.midfielder.defensiveMid' },
    { value: 'central_mid', label: 'positionDetails.midfielder.centralMid' },
    { value: 'attacking_mid', label: 'positionDetails.midfielder.attackingMid' },
    { value: 'left_mid', label: 'positionDetails.midfielder.leftMid' },
    { value: 'right_mid', label: 'positionDetails.midfielder.rightMid' },
  ],
  forward: [
    { value: 'striker', label: 'positionDetails.forward.striker' },
    { value: 'left_winger', label: 'positionDetails.forward.leftWinger' },
    { value: 'right_winger', label: 'positionDetails.forward.rightWinger' },
    { value: 'false_nine', label: 'positionDetails.forward.falseNine' },
    { value: 'second_striker', label: 'positionDetails.forward.secondStriker' },
  ],
}

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'leagueLevels.recreational.label', description: 'leagueLevels.recreational.description' },
  { value: 'division_4', label: 'leagueLevels.division4.label', description: 'leagueLevels.division4.description' },
  { value: 'division_3', label: 'leagueLevels.division3.label', description: 'leagueLevels.division3.description' },
  { value: 'division_2', label: 'leagueLevels.division2.label', description: 'leagueLevels.division2.description' },
  { value: 'division_1', label: 'leagueLevels.division1.label', description: 'leagueLevels.division1.description' },
  { value: 'superettan', label: 'leagueLevels.superettan.label', description: 'leagueLevels.superettan.description' },
  { value: 'allsvenskan', label: 'leagueLevels.allsvenskan.label', description: 'leagueLevels.allsvenskan.description' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'seasonPhases.offSeason.label', description: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', label: 'seasonPhases.preSeason.label', description: 'seasonPhases.preSeason.description' },
  { value: 'in_season', label: 'seasonPhases.inSeason.label', description: 'seasonPhases.inSeason.description' },
  { value: 'playoffs', label: 'seasonPhases.playoffs.label', description: 'seasonPhases.playoffs.description' },
]

const PLAY_STYLES = [
  { value: 'possession', label: 'playStyles.possession.label', description: 'playStyles.possession.description' },
  { value: 'counter', label: 'playStyles.counter.label', description: 'playStyles.counter.description' },
  { value: 'pressing', label: 'playStyles.pressing.label', description: 'playStyles.pressing.description' },
  { value: 'physical', label: 'playStyles.physical.label', description: 'playStyles.physical.description' },
]

const GPS_PROVIDERS = [
  { value: 'catapult', label: 'gpsProviders.catapult' },
  { value: 'statsports', label: 'gpsProviders.statsports' },
  { value: 'polar', label: 'gpsProviders.polar' },
  { value: 'gpexe', label: 'gpsProviders.gpexe' },
  { value: 'playertek', label: 'gpsProviders.playertek' },
  { value: 'other', label: 'gpsProviders.other' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'sprint_speed', label: 'strengthFocusOptions.sprintSpeed' },
  { id: 'acceleration', label: 'strengthFocusOptions.acceleration' },
  { id: 'endurance', label: 'strengthFocusOptions.endurance' },
  { id: 'jumping', label: 'strengthFocusOptions.jumping' },
  { id: 'shooting_power', label: 'strengthFocusOptions.shootingPower' },
  { id: 'agility', label: 'strengthFocusOptions.agility' },
  { id: 'strength_duels', label: 'strengthFocusOptions.strengthDuels' },
  { id: 'core_stability', label: 'strengthFocusOptions.coreStability' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_foot', label: 'weaknessOptions.weakFoot' },
  { id: 'heading', label: 'weaknessOptions.heading' },
  { id: 'positioning', label: 'weaknessOptions.positioning' },
  { id: 'first_touch', label: 'weaknessOptions.firstTouch' },
  { id: 'passing', label: 'weaknessOptions.passing' },
  { id: 'finishing', label: 'weaknessOptions.finishing' },
  { id: 'defensive_work', label: 'weaknessOptions.defensiveWork' },
  { id: 'stamina', label: 'weaknessOptions.stamina' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'hamstring', label: 'injuryHistory.hamstring' },
  { id: 'groin', label: 'injuryHistory.groin' },
  { id: 'ankle', label: 'injuryHistory.ankle' },
  { id: 'knee_acl', label: 'injuryHistory.kneeAcl' },
  { id: 'knee_meniscus', label: 'injuryHistory.kneeMeniscus' },
  { id: 'quadriceps', label: 'injuryHistory.quadriceps' },
  { id: 'calf', label: 'injuryHistory.calf' },
  { id: 'back', label: 'injuryHistory.back' },
]

const POSITION_TIP_KEYS: Record<FootballSettings['position'], string[]> = {
  goalkeeper: [
    'positionTips.goalkeeper.item1',
    'positionTips.goalkeeper.item2',
    'positionTips.goalkeeper.item3',
  ],
  defender: [
    'positionTips.defender.item1',
    'positionTips.defender.item2',
    'positionTips.defender.item3',
  ],
  midfielder: [
    'positionTips.midfielder.item1',
    'positionTips.midfielder.item2',
    'positionTips.midfielder.item3',
  ],
  forward: [
    'positionTips.forward.item1',
    'positionTips.forward.item2',
    'positionTips.forward.item3',
  ],
}

// ==================== COMPONENT ====================

interface FootballOnboardingProps {
  settings: FootballSettings
  onUpdate: (settings: FootballSettings) => void
}

export function FootballOnboarding({ settings, onUpdate }: FootballOnboardingProps) {
  const t = useTranslations('components.footballOnboarding')

  const updateField = <K extends keyof FootballSettings>(field: K, value: FootballSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const updateBenchmark = <K extends keyof FootballSettings['benchmarks']>(
    field: K,
    value: FootballSettings['benchmarks'][K]
  ) => {
    onUpdate({
      ...settings,
      benchmarks: { ...settings.benchmarks, [field]: value }
    })
  }

  const toggleArrayItem = (field: 'strengthFocus' | 'weaknesses' | 'injuryHistory', itemId: string) => {
    const currentArray = settings[field]
    const newArray = currentArray.includes(itemId)
      ? currentArray.filter(e => e !== itemId)
      : [...currentArray, itemId]
    updateField(field, newArray)
  }

  const positionDetails = POSITION_DETAILS[settings.position] || []
  const selectedPosition = POSITIONS.find((p) => p.value === settings.position)
  const selectedPositionLabel = selectedPosition ? t(selectedPosition.label) : t('positionTips.fallbackPosition')

  return (
    <div className="space-y-6">
      {/* Position & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            {t('sections.positionAndTeam.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.positionAndTeam.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.position.label')}</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => {
                  updateField('position', value as FootballSettings['position'])
                  updateField('positionDetail', '')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectPosition')} />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      <div>
                        <div className="font-medium">{t(pos.label)}</div>
                        <div className="text-xs text-muted-foreground">{t(pos.description)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {positionDetails.length > 0 && (
              <div className="space-y-2">
                <Label>{t('fields.positionDetail.label')}</Label>
                <Select
                  value={settings.positionDetail}
                  onValueChange={(value) => updateField('positionDetail', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.selectSpecificPosition')} />
                  </SelectTrigger>
                  <SelectContent>
                    {positionDetails.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {t(pos.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.teamName.label')}</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder={t('placeholders.exampleTeam')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.leagueLevel.label')}</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as FootballSettings['leagueLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectLeague')} />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{t(level.label)}</div>
                        <div className="text-xs text-muted-foreground">{t(level.description)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.yearsPlaying.label')}</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={settings.yearsPlaying}
                onChange={(e) => updateField('yearsPlaying', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.preferredFootwork.label')}</Label>
              <Select
                value={settings.preferredFootwork}
                onValueChange={(value) => updateField('preferredFootwork', value as FootballSettings['preferredFootwork'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">{t('preferredFootwork.right')}</SelectItem>
                  <SelectItem value="left">{t('preferredFootwork.left')}</SelectItem>
                  <SelectItem value="both">{t('preferredFootwork.both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season & Match Load */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            {t('sections.seasonAndMatchLoad.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.seasonAndMatchLoad.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('fields.seasonPhase.label')}</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as FootballSettings['seasonPhase'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectSeasonPhase')} />
              </SelectTrigger>
              <SelectContent>
                {SEASON_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    <div>
                      <div className="font-medium">{t(phase.label)}</div>
                      <div className="text-xs text-muted-foreground">{t(phase.description)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.matchesPerWeek.label')}</Label>
              <Input
                type="number"
                min={0}
                max={3}
                value={settings.matchesPerWeek}
                onChange={(e) => updateField('matchesPerWeek', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.avgMinutesPerMatch.label')}</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={settings.avgMinutesPerMatch ?? ''}
                onChange={(e) => updateField('avgMinutesPerMatch', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.exampleAvgMinutesPerMatch')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.weeklyTrainingSessions.label')}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={settings.weeklyTrainingSessions}
                onChange={(e) => updateField('weeklyTrainingSessions', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Play Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('sections.playStyle.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.playStyle.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('fields.playStyle.label')}</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as FootballSettings['playStyle'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectPlayStyle')} />
              </SelectTrigger>
              <SelectContent>
                {PLAY_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <div className="font-medium">{t(style.label)}</div>
                      <div className="text-xs text-muted-foreground">{t(style.description)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GPS Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            {t('sections.gpsData.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.gpsData.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasGPSData"
              checked={settings.hasGPSData}
              onCheckedChange={(checked) => updateField('hasGPSData', !!checked)}
            />
            <Label htmlFor="hasGPSData">{t('fields.hasGPSData.label')}</Label>
          </div>

          {settings.hasGPSData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('fields.gpsProvider.label')}</Label>
                  <Select
                    value={settings.gpsProvider}
                    onValueChange={(value) => updateField('gpsProvider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('placeholders.selectGpsProvider')} />
                    </SelectTrigger>
                    <SelectContent>
                      {GPS_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {t(provider.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('fields.avgMatchDistanceKm.label')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={15}
                    value={settings.avgMatchDistanceKm ?? ''}
                    onChange={(e) => updateField('avgMatchDistanceKm', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder={t('placeholders.exampleAvgMatchDistance')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('fields.avgSprintDistanceM.label')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={settings.avgSprintDistanceM ?? ''}
                    onChange={(e) => updateField('avgSprintDistanceM', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder={t('placeholders.exampleAvgSprintDistance')}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('sections.gpsData.info')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Physical Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            {t('sections.physicalBenchmarks.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.physicalBenchmarks.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.benchmarks.yoyoIR1.label')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR1Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR1Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.exampleYoyoIR1')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.benchmarks.yoyoIR2.label')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR2Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR2Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.exampleYoyoIR2')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.benchmarks.sprint10m.label')}</Label>
              <Input
                type="number"
                step="0.01"
                min={1}
                max={3}
                value={settings.benchmarks.sprint10m ?? ''}
                onChange={(e) => updateBenchmark('sprint10m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.exampleSprint10m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.benchmarks.sprint30m.label')}</Label>
              <Input
                type="number"
                step="0.01"
                min={3}
                max={6}
                value={settings.benchmarks.sprint30m ?? ''}
                onChange={(e) => updateBenchmark('sprint30m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.exampleSprint30m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.benchmarks.cmjHeight.label')}</Label>
              <Input
                type="number"
                min={20}
                max={80}
                value={settings.benchmarks.cmjHeight ?? ''}
                onChange={(e) => updateBenchmark('cmjHeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.exampleCmjHeight')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.benchmarks.agilityTest.label')}</Label>
              <Input
                type="number"
                step="0.01"
                min={5}
                max={20}
                value={settings.benchmarks.agilityTest ?? ''}
                onChange={(e) => updateBenchmark('agilityTest', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.exampleAgilityTest')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t('sections.strengthAndWeakness.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.strengthAndWeakness.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('sections.strengthAndWeakness.strengthsTitle')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STRENGTH_FOCUS_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.strengthFocus.includes(option.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleArrayItem('strengthFocus', option.id)}
                >
                  <Checkbox
                    id={`strength-${option.id}`}
                    checked={settings.strengthFocus.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('strengthFocus', option.id)}
                  />
                  <Label htmlFor={`strength-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.label)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('sections.strengthAndWeakness.weaknessesTitle')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {WEAKNESS_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.weaknesses.includes(option.id)
                      ? 'bg-orange-500/10 border-orange-500'
                      : 'hover:border-orange-500/50'
                  }`}
                  onClick={() => toggleArrayItem('weaknesses', option.id)}
                >
                  <Checkbox
                    id={`weakness-${option.id}`}
                    checked={settings.weaknesses.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('weaknesses', option.id)}
                  />
                  <Label htmlFor={`weakness-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.label)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injury History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            {t('sections.injuryHistory.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.injuryHistory.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('fields.injuryHistory.label')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {INJURY_HISTORY_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.injuryHistory.includes(option.id)
                      ? 'bg-red-500/10 border-red-500'
                      : 'hover:border-red-500/50'
                  }`}
                  onClick={() => toggleArrayItem('injuryHistory', option.id)}
                >
                  <Checkbox
                    id={`injury-${option.id}`}
                    checked={settings.injuryHistory.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('injuryHistory', option.id)}
                  />
                  <Label htmlFor={`injury-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.label)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {settings.injuryHistory.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('sections.injuryHistory.warning')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-500" />
            {t('sections.trainingConditions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAccessToGym"
              checked={settings.hasAccessToGym}
              onCheckedChange={(checked) => updateField('hasAccessToGym', !!checked)}
            />
            <Label htmlFor="hasAccessToGym">{t('fields.hasAccessToGym.label')}</Label>
          </div>

          {/* Position-specific tips */}
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">
              {t('positionTips.title', { position: selectedPositionLabel })}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {POSITION_TIP_KEYS[settings.position].map((tipKey) => (
                <li key={tipKey}>• {t(tipKey)}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FootballOnboarding
