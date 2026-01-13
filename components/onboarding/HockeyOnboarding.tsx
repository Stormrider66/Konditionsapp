'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Swords, Trophy, Timer, Target, Flame, Shield, Zap } from 'lucide-react'

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
  { value: 'center', label: 'Center', description: 'Tekningar, tvåvägsspel, playmaking' },
  { value: 'wing', label: 'Wing/Forward', description: 'Målskytte, fart, offensivt fokus' },
  { value: 'defense', label: 'Back', description: 'Defensivt ansvar, puckflytt, fysiskt spel' },
  { value: 'goalie', label: 'Målvakt', description: 'Reflexer, positionering, mental styrka' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Motionshockey', description: 'Korp, veteraner, träning för nöjes skull' },
  { value: 'junior', label: 'Junior', description: 'J18, J20, eller motsvarande' },
  { value: 'hockeyettan', label: 'Hockeyettan', description: 'Division 1-hockey' },
  { value: 'division_3', label: 'Division 3', description: 'Tredje högsta nivån' },
  { value: 'division_2', label: 'Division 2', description: 'Andra högsta nivån' },
  { value: 'division_1', label: 'Division 1', description: 'Högsta amatörnivån' },
  { value: 'hockeyallsvenskan', label: 'Hockeyallsvenskan', description: 'Näst högsta proffsnivån' },
  { value: 'shl', label: 'SHL', description: 'Svenska Hockey Ligan - högsta nivån' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Maj-juli, bygga bas och styrka' },
  { value: 'pre_season', label: 'Försäsong', description: 'Augusti-september, sport-specifik träning' },
  { value: 'in_season', label: 'Säsong', description: 'September-mars, underhåll och matchfokus' },
  { value: 'playoffs', label: 'Slutspel', description: 'Mars-maj, vila och topp-form' },
]

const PLAY_STYLES = [
  { value: 'offensive', label: 'Offensiv', description: 'Fokus på målskytte och assists' },
  { value: 'defensive', label: 'Defensiv', description: 'Pålitlig i egen zon, blockeringar' },
  { value: 'two_way', label: 'Tvåvägsspelare', description: 'Balanserad i båda zonerna' },
  { value: 'physical', label: 'Fysisk', description: 'Kroppsspel, tacklingar, närvaro' },
  { value: 'skill', label: 'Teknisk', description: 'Puckhantering, kreativitet' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'skating_speed', label: 'Skridskohastighet' },
  { id: 'acceleration', label: 'Acceleration' },
  { id: 'shot_power', label: 'Skottstyrka' },
  { id: 'physical_battles', label: 'Fysiska dueller' },
  { id: 'endurance', label: 'Uthållighet' },
  { id: 'agility', label: 'Kvickhet' },
  { id: 'core_stability', label: 'Core-stabilitet' },
  { id: 'upper_body', label: 'Överkroppsstyrka' },
]

const WEAKNESS_OPTIONS = [
  { id: 'skating_technique', label: 'Skridskoteknik' },
  { id: 'backwards_skating', label: 'Baklängesåkning' },
  { id: 'shot_accuracy', label: 'Skottaccuracy' },
  { id: 'faceoffs', label: 'Tekningar' },
  { id: 'positioning', label: 'Positionering' },
  { id: 'puck_handling', label: 'Puckhantering' },
  { id: 'passing', label: 'Passningar' },
  { id: 'defensive_play', label: 'Defensivt spel' },
]

const INJURY_HISTORY_OPTIONS = [
  { id: 'groin', label: 'Ljumske' },
  { id: 'hip', label: 'Höft' },
  { id: 'knee', label: 'Knä' },
  { id: 'shoulder', label: 'Axel' },
  { id: 'ankle', label: 'Fotled' },
  { id: 'back', label: 'Rygg' },
  { id: 'concussion', label: 'Hjärnskakning' },
  { id: 'wrist_hand', label: 'Handled/hand' },
]

// ==================== COMPONENT ====================

interface HockeyOnboardingProps {
  settings: HockeySettings
  onUpdate: (settings: HockeySettings) => void
}

export function HockeyOnboarding({ settings, onUpdate }: HockeyOnboardingProps) {
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
                onValueChange={(value) => updateField('position', value as HockeySettings['position'])}
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
              <Label>Lagnamn</Label>
              <Input
                value={settings.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                placeholder="t.ex. Luleå HF"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Liganivå</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as HockeySettings['leagueLevel'])}
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

            <div className="space-y-2">
              <Label>År som hockeyspelare</Label>
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
            Säsong & Istid
          </CardTitle>
          <CardDescription>
            Vilken fas av säsongen är du i och hur mycket istid får du?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nuvarande säsongsfas</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as HockeySettings['seasonPhase'])}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Genomsnittlig istid per match (minuter)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.averageIceTimeMinutes ?? ''}
                onChange={(e) => updateField('averageIceTimeMinutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="t.ex. 18"
              />
            </div>

            <div className="space-y-2">
              <Label>Byten per match</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={settings.shiftsPerGame ?? ''}
                onChange={(e) => updateField('shiftsPerGame', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="t.ex. 22"
              />
            </div>
          </div>

          {/* Calculate average shift length if both values are set */}
          {settings.averageIceTimeMinutes && settings.shiftsPerGame && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Genomsnittlig byteslängd: </span>
                {Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame)} sekunder
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
            Spelstil
          </CardTitle>
          <CardDescription>
            Vilken typ av spelare är du?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Din spelstil</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as HockeySettings['playStyle'])}
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

      {/* Strengths & Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Styrkor & Fokusområden
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
            <Label>Utvecklingsområden</Label>
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
            <Target className="h-5 w-5 text-purple-500" />
            Skadehistorik
          </CardTitle>
          <CardDescription>
            Vilka skador har du haft som vi bör ta hänsyn till i träningen?
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
                <strong>Obs:</strong> Vi tar hänsyn till dessa i träningsprogrammet med extra fokus på förebyggande övningar.
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
            Träningsförutsättningar
          </CardTitle>
          <CardDescription>
            Vilken tillgång har du till träningsmöjligheter?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Off-ice pass per vecka (styrka/kondition)</Label>
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
              <Label htmlFor="hasAccessToIce">Tillgång till istid</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAccessToGym"
                checked={settings.hasAccessToGym}
                onCheckedChange={(checked) => updateField('hasAccessToGym', !!checked)}
              />
              <Label htmlFor="hasAccessToGym">Tillgång till gym</Label>
            </div>
          </div>

          {/* Position-specific tips */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Tips för {POSITIONS.find(p => p.value === settings.position)?.label || 'din position'}:</h4>
            {settings.position === 'goalie' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Prioritera höftrörlighet och flexibilitet</li>
                <li>• Lateral power för sidförflyttningar</li>
                <li>• Reaktionsträning och mental fokus</li>
              </ul>
            ) : settings.position === 'defense' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bygg aerob uthållighet för längre byten</li>
                <li>• Fokusera på höft- och ljumskstyrka</li>
                <li>• Överkroppsstyrka för dueller</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Explosiv acceleration och sprintförmåga</li>
                <li>• Rotationsstyrka för skott</li>
                <li>• Snabb återhämtning mellan byten</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HockeyOnboarding
