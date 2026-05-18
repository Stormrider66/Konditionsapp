'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, Timer, Target, Flame, Shield, Zap, Activity } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ==================== TYPES ====================

export interface FloorballSettings {
  // Position & Team
  position: 'goalkeeper' | 'defender' | 'center' | 'forward'
  teamName: string
  leagueLevel: 'recreational' | 'division_3' | 'division_2' | 'division_1' | 'allsvenskan' | 'ssl'

  // Season
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'

  // Playing stats
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number

  // Play style
  playStyle: 'offensive' | 'defensive' | 'playmaker' | 'physical'

  // Physical benchmarks
  benchmarks: {
    yoyoIR1Level: number | null
    beepTestLevel: number | null
    sprint20m: number | null // seconds
    sprint30m: number | null // seconds
    agilityTest: number | null // seconds (5-10-5)
    standingLongJump: number | null // cm
  }

  // Focus areas
  strengthFocus: string[]
  weaknesses: string[]

  // Injury history
  injuryHistory: string[]

  // Training preferences
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  stickHand: 'right' | 'left'
}

export const DEFAULT_FLOORBALL_SETTINGS: FloorballSettings = {
  position: 'center',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  matchesPerWeek: 1,
  avgMinutesPerMatch: null,
  yearsPlaying: 0,
  playStyle: 'playmaker',
  benchmarks: {
    yoyoIR1Level: null,
    beepTestLevel: null,
    sprint20m: null,
    sprint30m: null,
    agilityTest: null,
    standingLongJump: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  stickHand: 'right',
}

// ==================== CONSTANTS ====================

const POSITIONS = [
  { value: 'goalkeeper', label: 'positions.goalkeeper.label', description: 'positions.goalkeeper.description' },
  { value: 'defender', label: 'positions.defender.label', description: 'positions.defender.description' },
  { value: 'center', label: 'positions.center.label', description: 'positions.center.description' },
  { value: 'forward', label: 'positions.forward.label', description: 'positions.forward.description' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'leagueLevels.recreational.label', description: 'leagueLevels.recreational.description' },
  { value: 'division_3', label: 'leagueLevels.division3.label', description: 'leagueLevels.division3.description' },
  { value: 'division_2', label: 'leagueLevels.division2.label', description: 'leagueLevels.division2.description' },
  { value: 'division_1', label: 'leagueLevels.division1.label', description: 'leagueLevels.division1.description' },
  { value: 'allsvenskan', label: 'leagueLevels.allsvenskan.label', description: 'leagueLevels.allsvenskan.description' },
  { value: 'ssl', label: 'leagueLevels.ssl.label', description: 'leagueLevels.ssl.description' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'seasonPhases.offSeason.label', description: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', label: 'seasonPhases.preSeason.label', description: 'seasonPhases.preSeason.description' },
  { value: 'in_season', label: 'seasonPhases.inSeason.label', description: 'seasonPhases.inSeason.description' },
  { value: 'playoffs', label: 'seasonPhases.playoffs.label', description: 'seasonPhases.playoffs.description' },
]

const PLAY_STYLES = [
  { value: 'offensive', label: 'playStyles.offensive.label', description: 'playStyles.offensive.description' },
  { value: 'defensive', label: 'playStyles.defensive.label', description: 'playStyles.defensive.description' },
  { value: 'playmaker', label: 'playStyles.playmaker.label', description: 'playStyles.playmaker.description' },
  { value: 'physical', label: 'playStyles.physical.label', description: 'playStyles.physical.description' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'sprint_speed', label: 'strengths.sprintSpeed' },
  { id: 'acceleration', label: 'strengths.acceleration' },
  { id: 'endurance', label: 'strengths.endurance' },
  { id: 'agility', label: 'strengths.agility' },
  { id: 'shooting_power', label: 'strengths.shootingPower' },
  { id: 'core_stability', label: 'strengths.coreStability' },
  { id: 'leg_strength', label: 'strengths.legStrength' },
  { id: 'low_position', label: 'strengths.lowPosition' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_hand', label: 'weaknesses.weakHand' },
  { id: 'finishing', label: 'weaknesses.finishing' },
  { id: 'defense', label: 'weaknesses.defense' },
  { id: 'positioning', label: 'weaknesses.positioning' },
  { id: 'stick_handling', label: 'weaknesses.stickHandling' },
  { id: 'passing', label: 'weaknesses.passing' },
  { id: 'stamina', label: 'weaknesses.stamina' },
  { id: 'game_reading', label: 'weaknesses.gameReading' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'groin', label: 'injuries.groin' },
  { id: 'hamstring', label: 'injuries.hamstring' },
  { id: 'knee', label: 'injuries.knee' },
  { id: 'ankle', label: 'injuries.ankle' },
  { id: 'hip', label: 'injuries.hip' },
  { id: 'back', label: 'injuries.back' },
  { id: 'wrist', label: 'injuries.wrist' },
  { id: 'shoulder', label: 'injuries.shoulder' },
]

const STICK_HAND = [
  { value: 'right', label: 'stickHand.right' },
  { value: 'left', label: 'stickHand.left' },
]

const POSITION_TIPS = {
  goalkeeper: ['tips.goalkeeper.1', 'tips.goalkeeper.2', 'tips.goalkeeper.3'],
  defender: ['tips.defender.1', 'tips.defender.2', 'tips.defender.3'],
  center: ['tips.center.1', 'tips.center.2', 'tips.center.3'],
  forward: ['tips.forward.1', 'tips.forward.2', 'tips.forward.3'],
}

// ==================== COMPONENT ====================

interface FloorballOnboardingProps {
  settings: FloorballSettings
  onUpdate: (settings: FloorballSettings) => void
}

export function FloorballOnboarding({ settings, onUpdate }: FloorballOnboardingProps) {
  const t = useTranslations('components.onboarding.floorball')
  const updateField = <K extends keyof FloorballSettings>(field: K, value: FloorballSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const updateBenchmark = <K extends keyof FloorballSettings['benchmarks']>(
    field: K,
    value: FloorballSettings['benchmarks'][K]
  ) => {
    onUpdate({
      ...settings,
      benchmarks: { ...settings.benchmarks, [field]: value },
    })
  }

  const toggleArrayItem = (field: 'strengthFocus' | 'weaknesses' | 'injuryHistory', itemId: string) => {
    const currentArray = settings[field]
    const newArray = currentArray.includes(itemId)
      ? currentArray.filter((e) => e !== itemId)
      : [...currentArray, itemId]
    updateField(field, newArray)
  }

  return (
    <div className="space-y-6">
      {/* Position & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            {t('sections.positionAndTeam.title')}
          </CardTitle>
          <CardDescription>{t('sections.positionAndTeam.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.position')}</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => updateField('position', value as FloorballSettings['position'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.position')} />
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

            <div className="space-y-2">
              <Label>{t('labels.stickHand')}</Label>
              <Select
                value={settings.stickHand}
                onValueChange={(value) => updateField('stickHand', value as FloorballSettings['stickHand'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STICK_HAND.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {t(item.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.teamName')}</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder={t('placeholders.teamName')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.leagueLevel')}</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as FloorballSettings['leagueLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.leagueLevel')} />
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

          <div className="space-y-2">
            <Label>{t('labels.yearsPlaying')}</Label>
            <Input
              type="number"
              min={0}
              max={40}
              value={settings.yearsPlaying}
              onChange={(e) => updateField('yearsPlaying', parseInt(e.target.value) || 0)}
            />
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
          <CardDescription>{t('sections.seasonAndMatchLoad.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.currentSeasonPhase')}</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as FloorballSettings['seasonPhase'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.seasonPhase')} />
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
              <Label>{t('labels.matchesPerWeek')}</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={settings.matchesPerWeek}
                onChange={(e) => updateField('matchesPerWeek', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.averageMinutesPerMatch')}</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.avgMinutesPerMatch ?? ''}
                onChange={(e) => updateField('avgMinutesPerMatch', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.avgMinutesPerMatch')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.trainingSessionsPerWeek')}</Label>
              <Input
                type="number"
                min={0}
                max={12}
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
          <CardDescription>{t('sections.playStyle.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.playStyle')}</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as FloorballSettings['playStyle'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.playStyle')} />
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

      {/* Physical Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            {t('sections.benchmarks.title')}
          </CardTitle>
          <CardDescription>{t('sections.benchmarks.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.yoyoIR1Level')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR1Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR1Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.yoyoIR1Level')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.beepTestLevel')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={20}
                value={settings.benchmarks.beepTestLevel ?? ''}
                onChange={(e) => updateBenchmark('beepTestLevel', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.beepTestLevel')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.sprint20m')}</Label>
              <Input
                type="number"
                step="0.01"
                min={2}
                max={5}
                value={settings.benchmarks.sprint20m ?? ''}
                onChange={(e) => updateBenchmark('sprint20m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.sprint20m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.sprint30m')}</Label>
              <Input
                type="number"
                step="0.01"
                min={3}
                max={6}
                value={settings.benchmarks.sprint30m ?? ''}
                onChange={(e) => updateBenchmark('sprint30m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.sprint30m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.agilityTest')}</Label>
              <Input
                type="number"
                step="0.1"
                min={3}
                max={8}
                value={settings.benchmarks.agilityTest ?? ''}
                onChange={(e) => updateBenchmark('agilityTest', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.agilityTest')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.standingLongJump')}</Label>
              <Input
                type="number"
                min={150}
                max={320}
                value={settings.benchmarks.standingLongJump ?? ''}
                onChange={(e) =>
                  updateBenchmark('standingLongJump', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder={t('placeholders.standingLongJump')}
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
          <CardDescription>{t('sections.strengthAndWeakness.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.strengthFocus')}</Label>
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
            <Label>{t('labels.weaknesses')}</Label>
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
          <CardDescription>{t('sections.injuryHistory.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.previousInjuries')}</Label>
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
                <strong>{t('labels.noteLabel')}</strong> {t('notes.injuryFocus')}
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
            <Label htmlFor="hasAccessToGym">{t('labels.hasAccessToGym')}</Label>
          </div>

          {/* Position-specific tips */}
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">
              {t('tips.positionPrefix')}{' '}
              {(POSITIONS.find((p) => p.value === settings.position)?.label
                ? t(POSITIONS.find((p) => p.value === settings.position)?.label as string)
                : t('positionFallback'))}
              :
            </h4>
            {settings.position === 'goalkeeper' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- {t(POSITION_TIPS.goalkeeper[0])}</li>
                <li>- {t(POSITION_TIPS.goalkeeper[1])}</li>
                <li>- {t(POSITION_TIPS.goalkeeper[2])}</li>
              </ul>
            ) : settings.position === 'defender' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- {t(POSITION_TIPS.defender[0])}</li>
                <li>- {t(POSITION_TIPS.defender[1])}</li>
                <li>- {t(POSITION_TIPS.defender[2])}</li>
              </ul>
            ) : settings.position === 'center' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- {t(POSITION_TIPS.center[0])}</li>
                <li>- {t(POSITION_TIPS.center[1])}</li>
                <li>- {t(POSITION_TIPS.center[2])}</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- {t(POSITION_TIPS.forward[0])}</li>
                <li>- {t(POSITION_TIPS.forward[1])}</li>
                <li>- {t(POSITION_TIPS.forward[2])}</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FloorballOnboarding
