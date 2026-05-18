'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from 'next-intl'
import { Swords, Timer, Target, Flame, Shield, Zap } from 'lucide-react'

// ==================== TYPES ====================

export interface HockeySettings {
  // Position & Team
  position: 'center' | 'wing' | 'defense' | 'goalie'
  teamName: string
  leagueLevel: 'recreational' | 'junior' | 'division_3' | 'division_2' | 'division_1' | 'shl' | 'hockeyallsvenskan' | 'hockeyettan'

  // Season
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'

  // Playing stats
  averageIceTimeMinutes: number | null
  shiftsPerGame: number | null
  yearsPlaying: number

  // Play style
  playStyle: 'offensive' | 'defensive' | 'two_way' | 'physical' | 'skill'

  // Focus areas
  strengthFocus: string[]
  weaknesses: string[]

  // Injury history
  injuryHistory: string[]

  // Training preferences
  weeklyOffIceSessions: number
  hasAccessToIce: boolean
  hasAccessToGym: boolean
}

export const DEFAULT_HOCKEY_SETTINGS: HockeySettings = {
  position: 'center',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  averageIceTimeMinutes: null,
  shiftsPerGame: null,
  yearsPlaying: 0,
  playStyle: 'two_way',
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyOffIceSessions: 3,
  hasAccessToIce: true,
  hasAccessToGym: true,
}

// ==================== CONSTANTS ====================

const POSITIONS = [
  { value: 'center', label: 'positions.center.label', description: 'positions.center.description' },
  { value: 'wing', label: 'positions.wing.label', description: 'positions.wing.description' },
  { value: 'defense', label: 'positions.defense.label', description: 'positions.defense.description' },
  { value: 'goalie', label: 'positions.goalie.label', description: 'positions.goalie.description' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'leagueLevels.recreational.label', description: 'leagueLevels.recreational.description' },
  { value: 'junior', label: 'leagueLevels.junior.label', description: 'leagueLevels.junior.description' },
  { value: 'hockeyettan', label: 'leagueLevels.hockeyettan.label', description: 'leagueLevels.hockeyettan.description' },
  { value: 'division_3', label: 'leagueLevels.division3.label', description: 'leagueLevels.division3.description' },
  { value: 'division_2', label: 'leagueLevels.division2.label', description: 'leagueLevels.division2.description' },
  { value: 'division_1', label: 'leagueLevels.division1.label', description: 'leagueLevels.division1.description' },
  { value: 'hockeyallsvenskan', label: 'leagueLevels.hockeyAllsvenskan.label', description: 'leagueLevels.hockeyAllsvenskan.description' },
  { value: 'shl', label: 'leagueLevels.shl.label', description: 'leagueLevels.shl.description' },
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
  { value: 'two_way', label: 'playStyles.twoWay.label', description: 'playStyles.twoWay.description' },
  { value: 'physical', label: 'playStyles.physical.label', description: 'playStyles.physical.description' },
  { value: 'skill', label: 'playStyles.skill.label', description: 'playStyles.skill.description' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'skating_speed', label: 'strengths.skatingSpeed' },
  { id: 'acceleration', label: 'strengths.acceleration' },
  { id: 'shot_power', label: 'strengths.shotPower' },
  { id: 'physical_battles', label: 'strengths.physicalBattles' },
  { id: 'endurance', label: 'strengths.endurance' },
  { id: 'agility', label: 'strengths.agility' },
  { id: 'core_stability', label: 'strengths.coreStability' },
  { id: 'upper_body', label: 'strengths.upperBody' },
]

const WEAKNESS_OPTIONS = [
  { id: 'skating_technique', label: 'weaknesses.skatingTechnique' },
  { id: 'backwards_skating', label: 'weaknesses.backwardsSkating' },
  { id: 'shot_accuracy', label: 'weaknesses.shotAccuracy' },
  { id: 'faceoffs', label: 'weaknesses.faceoffs' },
  { id: 'positioning', label: 'weaknesses.positioning' },
  { id: 'puck_handling', label: 'weaknesses.puckHandling' },
  { id: 'passing', label: 'weaknesses.passing' },
  { id: 'defensive_play', label: 'weaknesses.defensivePlay' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'groin', label: 'injuries.groin' },
  { id: 'hip', label: 'injuries.hip' },
  { id: 'knee', label: 'injuries.knee' },
  { id: 'shoulder', label: 'injuries.shoulder' },
  { id: 'ankle', label: 'injuries.ankle' },
  { id: 'back', label: 'injuries.back' },
  { id: 'concussion', label: 'injuries.concussion' },
  { id: 'wrist_hand', label: 'injuries.wristHand' },
]

const POSITION_TIPS = {
  goalie: ['tips.goalie.1', 'tips.goalie.2', 'tips.goalie.3'],
  defense: ['tips.defense.1', 'tips.defense.2', 'tips.defense.3'],
  default: ['tips.default.1', 'tips.default.2', 'tips.default.3'],
}

// ==================== COMPONENT ====================

interface HockeyOnboardingProps {
  settings: HockeySettings
  onUpdate: (settings: HockeySettings) => void
}

export function HockeyOnboarding({ settings, onUpdate }: HockeyOnboardingProps) {
  const t = useTranslations('components.onboarding.hockey')
  const updateField = <K extends keyof HockeySettings>(field: K, value: HockeySettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const toggleArrayItem = (field: 'strengthFocus' | 'weaknesses' | 'injuryHistory', itemId: string) => {
    const currentArray = settings[field]
    const newArray = currentArray.includes(itemId)
      ? currentArray.filter(e => e !== itemId)
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
          <CardDescription>
            {t('sections.positionAndTeam.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.position')}</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => updateField('position', value as HockeySettings['position'])}
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
              <Label>{t('labels.teamName')}</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder={t('placeholders.teamName')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.leagueLevel')}</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as HockeySettings['leagueLevel'])}
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
          </div>
        </CardContent>
      </Card>

      {/* Season & Playing Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-500" />
            {t('sections.seasonAndIceTime.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.seasonAndIceTime.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.currentSeasonPhase')}</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as HockeySettings['seasonPhase'])}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.averageIceTime')}</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.averageIceTimeMinutes ?? ''}
                onChange={(e) => updateField('averageIceTimeMinutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.averageIceTime')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.shiftsPerMatch')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={settings.shiftsPerGame ?? ''}
                onChange={(e) => updateField('shiftsPerGame', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.shiftsPerMatch')}
              />
            </div>
          </div>

          {/* Calculate average shift length if both values are set */}
          {settings.averageIceTimeMinutes && settings.shiftsPerGame && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">{t('labels.averageShiftLengthLabel')}</span>{' '}
                {Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame)} {t('units.seconds')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Play Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-red-500" />
            {t('sections.playStyle.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.playStyle.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.playStyle')}</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as HockeySettings['playStyle'])}
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

      {/* Strengths & Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t('sections.strengths.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.strengths.description')}
          </CardDescription>
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
            <Target className="h-5 w-5 text-purple-500" />
            {t('sections.injuryHistory.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.injuryHistory.description')}
          </CardDescription>
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
                <strong>{t('labels.noteLabel')}:</strong> {t('notes.injuryFocus')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('sections.trainingConditions.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.trainingConditions.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.weeklyOffIceSessions')}</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={settings.weeklyOffIceSessions}
              onChange={(e) => updateField('weeklyOffIceSessions', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAccessToIce"
                checked={settings.hasAccessToIce}
                onCheckedChange={(checked) => updateField('hasAccessToIce', !!checked)}
              />
              <Label htmlFor="hasAccessToIce">{t('labels.hasAccessToIce')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAccessToGym"
                checked={settings.hasAccessToGym}
                onCheckedChange={(checked) => updateField('hasAccessToGym', !!checked)}
              />
              <Label htmlFor="hasAccessToGym">{t('labels.hasAccessToGym')}</Label>
            </div>
          </div>

          {/* Position-specific tips */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">
              {t('tips.positionPrefix')}{' '}
              {(POSITIONS.find(p => p.value === settings.position)?.label
                ? t(POSITIONS.find(p => p.value === settings.position)?.label as string)
                : t('positionFallback'))}
              :
            </h4>
            {settings.position === 'goalie' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t(POSITION_TIPS.goalie[0])}</li>
                <li>• {t(POSITION_TIPS.goalie[1])}</li>
                <li>• {t(POSITION_TIPS.goalie[2])}</li>
              </ul>
            ) : settings.position === 'defense' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t(POSITION_TIPS.defense[0])}</li>
                <li>• {t(POSITION_TIPS.defense[1])}</li>
                <li>• {t(POSITION_TIPS.defense[2])}</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t(POSITION_TIPS.default[0])}</li>
                <li>• {t(POSITION_TIPS.default[1])}</li>
                <li>• {t(POSITION_TIPS.default[2])}</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HockeyOnboarding
