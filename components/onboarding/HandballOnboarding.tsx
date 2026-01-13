'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Trophy, Timer, Target, Flame, Shield, Zap, Activity } from 'lucide-react'

// ==================== TYPES ====================

export interface HandballSettings {
  // Position & Team
  position: 'goalkeeper' | 'wing' | 'back' | 'center_back' | 'pivot'
  positionSide: 'left' | 'right' | 'both' | 'center'
  teamName: string
  leagueLevel: 'recreational' | 'division_3' | 'division_2' | 'division_1' | 'allsvenskan' | 'handbollsligan'

  // Season
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'

  // Playing stats
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number

  // Play style
  playStyle: 'offensive' | 'defensive' | 'all_round' | 'specialist'

  // Physical benchmarks
  benchmarks: {
    yoyoIR1Level: number | null
    yoyoIR2Level: number | null
    sprint10m: number | null // seconds
    sprint20m: number | null // seconds
    cmjHeight: number | null // cm
    medicineBallThrow: number | null // meters (3kg ball)
    tTestAgility: number | null // seconds
  }

  // Focus areas
  strengthFocus: string[]
  weaknesses: string[]

  // Injury history
  injuryHistory: string[]

  // Training preferences
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  throwingArm: 'right' | 'left'
}

export const DEFAULT_HANDBALL_SETTINGS: HandballSettings = {
  position: 'back',
  positionSide: 'right',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  matchesPerWeek: 1,
  avgMinutesPerMatch: null,
  yearsPlaying: 0,
  playStyle: 'all_round',
  benchmarks: {
    yoyoIR1Level: null,
    yoyoIR2Level: null,
    sprint10m: null,
    sprint20m: null,
    cmjHeight: null,
    medicineBallThrow: null,
    tTestAgility: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  throwingArm: 'right',
}

// ==================== CONSTANTS ====================

const POSITIONS = [
  { value: 'goalkeeper', label: 'Målvakt', description: 'Reaktion, positionering, räddningar' },
  { value: 'wing', label: 'Ytter', description: 'Snabbhet, genombrott, vinkelavslut' },
  { value: 'back', label: 'Vänster-/Högernia', description: 'Skott, genombrott, speluppbyggnad' },
  { value: 'center_back', label: 'Mittnia/Playmaker', description: 'Spelmotor, passningar, överblick' },
  { value: 'pivot', label: 'Lansen/Pivot', description: 'Spärrar, blockerar, avslut i trängsel' },
]

const POSITION_SIDES: Record<string, { value: string; label: string }[]> = {
  goalkeeper: [{ value: 'center', label: 'Målvakt' }],
  wing: [
    { value: 'left', label: 'Vänsterytter' },
    { value: 'right', label: 'Högerytter' },
    { value: 'both', label: 'Båda sidor' },
  ],
  back: [
    { value: 'left', label: 'Vänsternia' },
    { value: 'right', label: 'Högernia' },
    { value: 'both', label: 'Båda sidor' },
  ],
  center_back: [{ value: 'center', label: 'Mittnia' }],
  pivot: [{ value: 'center', label: 'Lansen' }],
}

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Korpen/Motion', description: 'Motionshandboll' },
  { value: 'division_3', label: 'Division 3', description: 'Tredje högsta nivån' },
  { value: 'division_2', label: 'Division 2', description: 'Andra högsta nivån' },
  { value: 'division_1', label: 'Division 1', description: 'Högsta amatörnivån' },
  { value: 'allsvenskan', label: 'Allsvenskan', description: 'Näst högsta proffsnivån' },
  { value: 'handbollsligan', label: 'Handbollsligan', description: 'Högsta ligan (HBL/SHE)' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Maj-juli, bygga bas' },
  { value: 'pre_season', label: 'Försäsong', description: 'Juli-augusti, matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'September-maj' },
  { value: 'playoffs', label: 'Slutspel', description: 'Slutspel eller SM-final' },
]

const PLAY_STYLES = [
  { value: 'offensive', label: 'Offensiv', description: 'Fokus på anfall och målskytte' },
  { value: 'defensive', label: 'Defensiv', description: 'Fokus på försvar och tacklingar' },
  { value: 'all_round', label: 'Allround', description: 'Balanserad spelare' },
  { value: 'specialist', label: 'Specialist', description: 'Specifik roll (t.ex. 7-mot-6)' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'throwing_power', label: 'Skottstyrka' },
  { id: 'sprint_speed', label: 'Sprintsnabbhet' },
  { id: 'jumping', label: 'Hoppkraft' },
  { id: 'agility', label: 'Kvickhet' },
  { id: 'endurance', label: 'Uthållighet' },
  { id: 'upper_body', label: 'Överkroppsstyrka' },
  { id: 'core_stability', label: 'Core-stabilitet' },
  { id: 'contact_strength', label: 'Kontaktstyrka' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_arm', label: 'Svaga armen' },
  { id: 'finishing', label: 'Avslut' },
  { id: 'defense', label: 'Försvarsspel' },
  { id: 'positioning', label: 'Positionering' },
  { id: 'ball_handling', label: 'Bollhantering' },
  { id: 'passing', label: 'Passningar' },
  { id: 'stamina', label: 'Uthållighet' },
  { id: 'decision_making', label: 'Beslutsfattande' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'shoulder', label: 'Axel' },
  { id: 'knee', label: 'Knä' },
  { id: 'knee_acl', label: 'Knä (ACL)' },
  { id: 'ankle', label: 'Fotled' },
  { id: 'groin', label: 'Ljumske' },
  { id: 'back', label: 'Rygg' },
  { id: 'finger', label: 'Fingrar' },
  { id: 'elbow', label: 'Armbåge' },
]

// ==================== COMPONENT ====================

interface HandballOnboardingProps {
  settings: HandballSettings
  onUpdate: (settings: HandballSettings) => void
}

export function HandballOnboarding({ settings, onUpdate }: HandballOnboardingProps) {
  const updateField = <K extends keyof HandballSettings>(field: K, value: HandballSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const updateBenchmark = <K extends keyof HandballSettings['benchmarks']>(
    field: K,
    value: HandballSettings['benchmarks'][K]
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

  const positionSides = POSITION_SIDES[settings.position] || []

  return (
    <div className="space-y-6">
      {/* Position & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
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
                onValueChange={(value) => {
                  updateField('position', value as HandballSettings['position'])
                  // Reset position side based on new position
                  const sides = POSITION_SIDES[value] || []
                  if (sides.length > 0) {
                    updateField('positionSide', sides[0].value as HandballSettings['positionSide'])
                  }
                }}
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

            {positionSides.length > 1 && (
              <div className="space-y-2">
                <Label>Sida</Label>
                <Select
                  value={settings.positionSide}
                  onValueChange={(value) => updateField('positionSide', value as HandballSettings['positionSide'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj sida" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionSides.map((side) => (
                      <SelectItem key={side.value} value={side.value}>
                        {side.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lagnamn</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder="t.ex. IK Sävehof"
              />
            </div>

            <div className="space-y-2">
              <Label>Liganivå</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as HandballSettings['leagueLevel'])}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>År som handbollsspelare</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={settings.yearsPlaying}
                onChange={(e) => updateField('yearsPlaying', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Kastararm</Label>
              <Select
                value={settings.throwingArm}
                onValueChange={(value) => updateField('throwingArm', value as HandballSettings['throwingArm'])}
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
              onValueChange={(value) => updateField('seasonPhase', value as HandballSettings['seasonPhase'])}
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
                placeholder="t.ex. 45"
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
          <CardDescription>Vad är din spelstil och specialitet?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Din spelstil</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as HandballSettings['playStyle'])}
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
                placeholder="t.ex. 18.3"
              />
            </div>

            <div className="space-y-2">
              <Label>Yo-Yo IR2 (nivå)</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR2Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR2Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 20.1"
              />
            </div>

            <div className="space-y-2">
              <Label>10m sprint (sek)</Label>
              <Input
                type="number"
                step="0.01"
                min={1}
                max={3}
                value={settings.benchmarks.sprint10m ?? ''}
                onChange={(e) => updateBenchmark('sprint10m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 1.72"
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
                placeholder="t.ex. 3.05"
              />
            </div>

            <div className="space-y-2">
              <Label>CMJ hopp (cm)</Label>
              <Input
                type="number"
                min={20}
                max={80}
                value={settings.benchmarks.cmjHeight ?? ''}
                onChange={(e) => updateBenchmark('cmjHeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="t.ex. 48"
              />
            </div>

            <div className="space-y-2">
              <Label>Medicinboll (m, 3kg)</Label>
              <Input
                type="number"
                step="0.1"
                min={5}
                max={20}
                value={settings.benchmarks.medicineBallThrow ?? ''}
                onChange={(e) =>
                  updateBenchmark('medicineBallThrow', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="t.ex. 12.5"
              />
            </div>

            <div className="space-y-2">
              <Label>T-test agility (sek)</Label>
              <Input
                type="number"
                step="0.1"
                min={7}
                max={15}
                value={settings.benchmarks.tTestAgility ?? ''}
                onChange={(e) => updateBenchmark('tTestAgility', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 9.2"
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
                <strong>Obs:</strong> Vi inkluderar förebyggande övningar (Nordic curls, axelstabilisering, etc.)
                baserat på din skadehistorik.
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
                <li>- Prioritera reaktionsträning och lateral rörlighet</li>
                <li>- Explosiv kraft för utkast och hopp</li>
                <li>- Axelstabilitet och höftrörlighet</li>
              </ul>
            ) : settings.position === 'wing' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Fokus på sprintsnabbhet och acceleration</li>
                <li>- Hoppkraft för vinkelavslut</li>
                <li>- Uthållighet för återkommande löpningar</li>
              </ul>
            ) : settings.position === 'back' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Skottstyrka och rotationskraft</li>
                <li>- Hoppkraft för hopp-skott</li>
                <li>- Axelstabilitet för skadeförebyggande</li>
              </ul>
            ) : settings.position === 'center_back' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Högst krav på aerob kapacitet</li>
                <li>- Kvickhet och snabba fötter</li>
                <li>- Beslutsfattande under press</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Bygg kroppsstyrka för kontakt</li>
                <li>- Core-stabilitet för balans i dueller</li>
                <li>- Explosivitet i begränsat utrymme</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HandballOnboarding
