'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, Timer, Target, Flame, Shield, Zap, Activity } from 'lucide-react'

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
  { value: 'goalkeeper', label: 'Målvakt', description: 'Reaktion, benarbete, positionering' },
  { value: 'defender', label: 'Back', description: 'Täckning, speluppbyggnad, tacklingar' },
  { value: 'center', label: 'Center', description: 'Box-to-box, arbetskapacitet, allround' },
  { value: 'forward', label: 'Forward/Ytter', description: 'Avslut, snabbhet, press' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Korpen/Motion', description: 'Motionsinnebandy' },
  { value: 'division_3', label: 'Division 3', description: 'Tredje högsta nivån' },
  { value: 'division_2', label: 'Division 2', description: 'Andra högsta nivån' },
  { value: 'division_1', label: 'Division 1', description: 'Högsta amatörnivån' },
  { value: 'allsvenskan', label: 'Allsvenskan', description: 'Näst högsta proffsnivån' },
  { value: 'ssl', label: 'Svenska Superligan', description: 'Högsta ligan (SSL)' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Maj-augusti, bygga bas' },
  { value: 'pre_season', label: 'Försäsong', description: 'Augusti-september' },
  { value: 'in_season', label: 'Säsong', description: 'September-april' },
  { value: 'playoffs', label: 'Slutspel', description: 'Slutspel eller SM-final' },
]

const PLAY_STYLES = [
  { value: 'offensive', label: 'Offensiv', description: 'Fokus på anfall och målskytte' },
  { value: 'defensive', label: 'Defensiv', description: 'Fokus på försvar och täckning' },
  { value: 'playmaker', label: 'Spelmotor', description: 'Skapar spel, passningar' },
  { value: 'physical', label: 'Fysisk', description: 'Tacklingar, vinna bollar' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'sprint_speed', label: 'Sprintsnabbhet' },
  { id: 'acceleration', label: 'Acceleration' },
  { id: 'endurance', label: 'Uthållighet' },
  { id: 'agility', label: 'Kvickhet' },
  { id: 'shooting_power', label: 'Skottstyrka' },
  { id: 'core_stability', label: 'Core-stabilitet' },
  { id: 'leg_strength', label: 'Benstyrka' },
  { id: 'low_position', label: 'Låg position' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_hand', label: 'Svaga handen' },
  { id: 'finishing', label: 'Avslut' },
  { id: 'defense', label: 'Försvarsspel' },
  { id: 'positioning', label: 'Positionering' },
  { id: 'stick_handling', label: 'Teknik' },
  { id: 'passing', label: 'Passningar' },
  { id: 'stamina', label: 'Uthållighet' },
  { id: 'game_reading', label: 'Spelläsning' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'groin', label: 'Ljumske' },
  { id: 'hamstring', label: 'Hamstring' },
  { id: 'knee', label: 'Knä' },
  { id: 'ankle', label: 'Fotled' },
  { id: 'hip', label: 'Höft' },
  { id: 'back', label: 'Rygg' },
  { id: 'wrist', label: 'Handled' },
  { id: 'shoulder', label: 'Axel' },
]

// ==================== COMPONENT ====================

interface FloorballOnboardingProps {
  settings: FloorballSettings
  onUpdate: (settings: FloorballSettings) => void
}

export function FloorballOnboarding({ settings, onUpdate }: FloorballOnboardingProps) {
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
            Position & Lag
          </CardTitle>
          <CardDescription>Berätta om din roll i laget och vilken nivå du spelar på</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => updateField('position', value as FloorballSettings['position'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      <div>
                        <div className="font-medium">{pos.label}</div>
                        <div className="text-xs text-muted-foreground">{pos.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Klubbhand</Label>
              <Select
                value={settings.stickHand}
                onValueChange={(value) => updateField('stickHand', value as FloorballSettings['stickHand'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Höger</SelectItem>
                  <SelectItem value="left">Vänster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lagnamn</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder="t.ex. Storvreta IBK"
              />
            </div>

            <div className="space-y-2">
              <Label>Liganivå</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as FloorballSettings['leagueLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj liga" />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>År som innebandyspelare</Label>
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
            Säsong & Matchbelastning
          </CardTitle>
          <CardDescription>Vilken fas av säsongen och hur mycket spelar du?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nuvarande säsongsfas</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as FloorballSettings['seasonPhase'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj fas" />
              </SelectTrigger>
              <SelectContent>
                {SEASON_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    <div>
                      <div className="font-medium">{phase.label}</div>
                      <div className="text-xs text-muted-foreground">{phase.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Matcher per vecka</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={settings.matchesPerWeek}
                onChange={(e) => updateField('matchesPerWeek', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Snitt minuter per match</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.avgMinutesPerMatch ?? ''}
                onChange={(e) => updateField('avgMinutesPerMatch', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="t.ex. 25"
              />
            </div>

            <div className="space-y-2">
              <Label>Träningspass per vecka</Label>
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
            Spelstil
          </CardTitle>
          <CardDescription>Vad är din spelstil?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Din spelstil</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as FloorballSettings['playStyle'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj spelstil" />
              </SelectTrigger>
              <SelectContent>
                {PLAY_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-muted-foreground">{style.description}</div>
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
            Fysiska tester
          </CardTitle>
          <CardDescription>Fyll i de tester du har resultat från (frivilligt)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Yo-Yo IR1 (nivå)</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR1Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR1Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 19.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Beep-test (nivå)</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={20}
                value={settings.benchmarks.beepTestLevel ?? ''}
                onChange={(e) => updateBenchmark('beepTestLevel', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 12.5"
              />
            </div>

            <div className="space-y-2">
              <Label>20m sprint (sek)</Label>
              <Input
                type="number"
                step="0.01"
                min={2}
                max={5}
                value={settings.benchmarks.sprint20m ?? ''}
                onChange={(e) => updateBenchmark('sprint20m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 3.10"
              />
            </div>

            <div className="space-y-2">
              <Label>30m sprint (sek)</Label>
              <Input
                type="number"
                step="0.01"
                min={3}
                max={6}
                value={settings.benchmarks.sprint30m ?? ''}
                onChange={(e) => updateBenchmark('sprint30m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 4.25"
              />
            </div>

            <div className="space-y-2">
              <Label>5-10-5 agility (sek)</Label>
              <Input
                type="number"
                step="0.1"
                min={3}
                max={8}
                value={settings.benchmarks.agilityTest ?? ''}
                onChange={(e) => updateBenchmark('agilityTest', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 4.6"
              />
            </div>

            <div className="space-y-2">
              <Label>Stående längdhopp (cm)</Label>
              <Input
                type="number"
                min={150}
                max={320}
                value={settings.benchmarks.standingLongJump ?? ''}
                onChange={(e) =>
                  updateBenchmark('standingLongJump', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="t.ex. 255"
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
            Styrkor & Utvecklingsområden
          </CardTitle>
          <CardDescription>Vilka fysiska egenskaper vill du utveckla?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Styrkor att bygga vidare på</Label>
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
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Svagheter att förbättra</Label>
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
                    {option.label}
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
            Skadehistorik
          </CardTitle>
          <CardDescription>Vilka skador har du haft som vi bör ta hänsyn till?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tidigare skador (välj relevanta)</Label>
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
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {settings.injuryHistory.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Obs:</strong> Vi inkluderar förebyggande övningar baserat på din skadehistorik.
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
            Träningsförutsättningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAccessToGym"
              checked={settings.hasAccessToGym}
              onCheckedChange={(checked) => updateField('hasAccessToGym', !!checked)}
            />
            <Label htmlFor="hasAccessToGym">Tillgång till gym för styrketräning</Label>
          </div>

          {/* Position-specific tips */}
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">
              Tips för {POSITIONS.find((p) => p.value === settings.position)?.label || 'din position'}:
            </h4>
            {settings.position === 'goalkeeper' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Prioritera lateral rörlighet och benarbete</li>
                <li>- Höftflexibilitet för låga räddningar</li>
                <li>- Reaktionsträning och splitpositioner</li>
              </ul>
            ) : settings.position === 'defender' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Fokus på låg position och täckningsarbete</li>
                <li>- Benstyrka för tacklingssituationer</li>
                <li>- Speluppbyggnad och passningsprecision</li>
              </ul>
            ) : settings.position === 'center' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Högst krav på aerob kapacitet</li>
                <li>- Arbetskapacitet hela matchen</li>
                <li>- Snabba omställningar anfall-försvar</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Maximal acceleration och sprintförmåga</li>
                <li>- Skottstyrka och avslutsprecision</li>
                <li>- Kvickhet i tight space</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FloorballOnboarding
