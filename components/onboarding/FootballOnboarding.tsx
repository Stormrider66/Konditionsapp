'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Trophy, Timer, Target, Flame, Shield, Zap, MapPin, Activity } from 'lucide-react'

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
  { value: 'goalkeeper', label: 'Målvakt', description: 'Reflexer, positionering, bollhantering' },
  { value: 'defender', label: 'Försvarare', description: 'Dueller, speluppbyggnad, positionering' },
  { value: 'midfielder', label: 'Mittfältare', description: 'Box-to-box, spelfördelning, uthållighet' },
  { value: 'forward', label: 'Anfallare', description: 'Målskytte, sprint, avslut' },
]

const POSITION_DETAILS: Record<string, { value: string; label: string }[]> = {
  goalkeeper: [
    { value: 'goalkeeper', label: 'Målvakt' },
  ],
  defender: [
    { value: 'center_back', label: 'Mittback' },
    { value: 'left_back', label: 'Vänsterback' },
    { value: 'right_back', label: 'Högerback' },
    { value: 'wing_back', label: 'Wingback' },
    { value: 'sweeper', label: 'Libero' },
  ],
  midfielder: [
    { value: 'defensive_mid', label: 'Defensiv mittfältare (6:a)' },
    { value: 'central_mid', label: 'Central mittfältare (8:a)' },
    { value: 'attacking_mid', label: 'Offensiv mittfältare (10:a)' },
    { value: 'left_mid', label: 'Vänster mittfältare' },
    { value: 'right_mid', label: 'Höger mittfältare' },
  ],
  forward: [
    { value: 'striker', label: 'Nia/Striker' },
    { value: 'left_winger', label: 'Vänsterytter' },
    { value: 'right_winger', label: 'Högerytter' },
    { value: 'false_nine', label: 'Falsk nia' },
    { value: 'second_striker', label: 'Andraspets' },
  ],
}

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Korpen/Motion', description: 'Motionsfotboll' },
  { value: 'division_4', label: 'Division 4', description: 'Fjärde högsta nivån' },
  { value: 'division_3', label: 'Division 3', description: 'Tredje högsta nivån' },
  { value: 'division_2', label: 'Division 2', description: 'Andra högsta nivån' },
  { value: 'division_1', label: 'Division 1', description: 'Högsta amatörnivån' },
  { value: 'superettan', label: 'Superettan', description: 'Näst högsta proffsnivån' },
  { value: 'allsvenskan', label: 'Allsvenskan', description: 'Högsta proffsnivån' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Juni-juli, bygga bas' },
  { value: 'pre_season', label: 'Försäsong', description: 'Juli-augusti, matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'Augusti-november, mars-maj' },
  { value: 'playoffs', label: 'Slutspel/Avgörande', description: 'Slutspel eller viktiga matcher' },
]

const PLAY_STYLES = [
  { value: 'possession', label: 'Bollinnehav', description: 'Passingsspel, kontroll' },
  { value: 'counter', label: 'Kontring', description: 'Snabba omställningar' },
  { value: 'pressing', label: 'Högt press', description: 'Aggressivt, vinna boll högt' },
  { value: 'physical', label: 'Fysiskt', description: 'Duellstark, kraftfull' },
]

const GPS_PROVIDERS = [
  { value: 'catapult', label: 'Catapult' },
  { value: 'statsports', label: 'STATSports' },
  { value: 'polar', label: 'Polar Team Pro' },
  { value: 'gpexe', label: 'GPexe' },
  { value: 'playertek', label: 'PlayerTek' },
  { value: 'other', label: 'Annat' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'sprint_speed', label: 'Sprintsnabbhet' },
  { id: 'acceleration', label: 'Acceleration' },
  { id: 'endurance', label: 'Uthållighet' },
  { id: 'jumping', label: 'Hoppkraft' },
  { id: 'shooting_power', label: 'Skottstyrka' },
  { id: 'agility', label: 'Kvickhet' },
  { id: 'strength_duels', label: 'Duellstyrka' },
  { id: 'core_stability', label: 'Core-stabilitet' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_foot', label: 'Svaga foten' },
  { id: 'heading', label: 'Nickar' },
  { id: 'positioning', label: 'Positionering' },
  { id: 'first_touch', label: 'Första touch' },
  { id: 'passing', label: 'Passningar' },
  { id: 'finishing', label: 'Avslut' },
  { id: 'defensive_work', label: 'Defensivt arbete' },
  { id: 'stamina', label: 'Uthållighet' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'hamstring', label: 'Hamstring' },
  { id: 'groin', label: 'Ljumske' },
  { id: 'ankle', label: 'Fotled' },
  { id: 'knee_acl', label: 'Knä (ACL)' },
  { id: 'knee_meniscus', label: 'Knä (Menisk)' },
  { id: 'quadriceps', label: 'Quadriceps' },
  { id: 'calf', label: 'Vad' },
  { id: 'back', label: 'Rygg' },
]

// ==================== COMPONENT ====================

interface FootballOnboardingProps {
  settings: FootballSettings
  onUpdate: (settings: FootballSettings) => void
}

export function FootballOnboarding({ settings, onUpdate }: FootballOnboardingProps) {
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

  return (
    <div className="space-y-6">
      {/* Position & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Position & Lag
          </CardTitle>
          <CardDescription>
            Berätta om din roll i laget och vilken nivå du spelar på
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => {
                  updateField('position', value as FootballSettings['position'])
                  updateField('positionDetail', '')
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

            {positionDetails.length > 0 && (
              <div className="space-y-2">
                <Label>Specifik position</Label>
                <Select
                  value={settings.positionDetail}
                  onValueChange={(value) => updateField('positionDetail', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj specifik position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionDetails.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
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
                placeholder="t.ex. Malmö FF"
              />
            </div>

            <div className="space-y-2">
              <Label>Liganivå</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as FootballSettings['leagueLevel'])}
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
              <Label>År som fotbollsspelare</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={settings.yearsPlaying}
                onChange={(e) => updateField('yearsPlaying', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Favorit fot</Label>
              <Select
                value={settings.preferredFootwork}
                onValueChange={(value) => updateField('preferredFootwork', value as FootballSettings['preferredFootwork'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Höger</SelectItem>
                  <SelectItem value="left">Vänster</SelectItem>
                  <SelectItem value="both">Tvåfotad</SelectItem>
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
          <CardDescription>
            Vilken fas av säsongen och hur mycket spelar du?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nuvarande säsongsfas</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as FootballSettings['seasonPhase'])}
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
                max={3}
                value={settings.matchesPerWeek}
                onChange={(e) => updateField('matchesPerWeek', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Snitt minuter per match</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={settings.avgMinutesPerMatch ?? ''}
                onChange={(e) => updateField('avgMinutesPerMatch', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="t.ex. 75"
              />
            </div>

            <div className="space-y-2">
              <Label>Träningspass per vecka</Label>
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
            Spelstil
          </CardTitle>
          <CardDescription>
            Hur spelar ditt lag och vad är din stil?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lagets spelstil</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as FootballSettings['playStyle'])}
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

      {/* GPS Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            GPS-data
          </CardTitle>
          <CardDescription>
            Har du tillgång till GPS-spårning under matcher/träning?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasGPSData"
              checked={settings.hasGPSData}
              onCheckedChange={(checked) => updateField('hasGPSData', !!checked)}
            />
            <Label htmlFor="hasGPSData">Jag har tillgång till GPS-data</Label>
          </div>

          {settings.hasGPSData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>GPS-leverantör</Label>
                  <Select
                    value={settings.gpsProvider}
                    onValueChange={(value) => updateField('gpsProvider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj leverantör" />
                    </SelectTrigger>
                    <SelectContent>
                      {GPS_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Snitt matchdistans (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={15}
                    value={settings.avgMatchDistanceKm ?? ''}
                    onChange={(e) => updateField('avgMatchDistanceKm', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="t.ex. 10.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Snitt sprintdistans (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={settings.avgSprintDistanceM ?? ''}
                    onChange={(e) => updateField('avgSprintDistanceM', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="t.ex. 350"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  GPS-data hjälper oss att beräkna din belastning och optimera återhämtning.
                  Du kan lägga till matchdata efterhand via matchschema-funktionen.
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
            Fysiska tester
          </CardTitle>
          <CardDescription>
            Fyll i de tester du har resultat från (frivilligt)
          </CardDescription>
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
              <Label>30m sprint (sek)</Label>
              <Input
                type="number"
                step="0.01"
                min={3}
                max={6}
                value={settings.benchmarks.sprint30m ?? ''}
                onChange={(e) => updateBenchmark('sprint30m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 4.15"
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
                placeholder="t.ex. 45"
              />
            </div>

            <div className="space-y-2">
              <Label>Agility test (sek)</Label>
              <Input
                type="number"
                step="0.01"
                min={5}
                max={20}
                value={settings.benchmarks.agilityTest ?? ''}
                onChange={(e) => updateBenchmark('agilityTest', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="t.ex. 8.5"
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
          <CardDescription>
            Vilka fysiska egenskaper vill du utveckla?
          </CardDescription>
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
          <CardDescription>
            Vilka skador har du haft som vi bör ta hänsyn till?
          </CardDescription>
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
                <strong>Obs:</strong> Vi inkluderar förebyggande övningar (FIFA 11+, Nordic curls, etc.) baserat på din skadehistorik.
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
            <h4 className="font-medium text-sm">Tips för {POSITIONS.find(p => p.value === settings.position)?.label || 'din position'}:</h4>
            {settings.position === 'goalkeeper' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Prioritera reaktionsträning och lateral rörlighet</li>
                <li>• Explosiv kraft i benen för utkast och hopp</li>
                <li>• Axelstabilitet för att undvika skador</li>
              </ul>
            ) : settings.position === 'defender' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bygg överkroppsstyrka för dueller</li>
                <li>• Fokus på hoppkraft för nickdueller</li>
                <li>• Nordic curls för hamstring-skadeförebyggande</li>
              </ul>
            ) : settings.position === 'midfielder' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Högst krav på aerob kapacitet - bygg Yo-Yo</li>
                <li>• Repeated sprint ability är kritiskt</li>
                <li>• Skadeförebyggande extra viktigt vid hög volym</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maximal sprintförmåga - 10m acceleration</li>
                <li>• Hamstring-förebyggande är kritiskt</li>
                <li>• Skottstyrka genom rotationsövningar</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FootballOnboarding
