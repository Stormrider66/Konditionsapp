'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dumbbell, Timer, Footprints, Target } from 'lucide-react'

export interface HYROXSettings {
  // Race category
  raceCategory: 'open' | 'pro' | 'doubles' | 'relay'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  targetRaceDate: string | null

  // Running fitness
  fiveKmTime: number | null // seconds
  tenKmTime: number | null // seconds
  currentWeeklyRunKm: number

  // Station benchmarks (times in seconds, or reps)
  skiErgTime: number | null // 1km time
  sledPushTime: number | null // 50m time
  sledPullTime: number | null // 50m time
  burpeeBroadJumpTime: number | null // 80m time
  rowingTime: number | null // 1km time
  farmersCarryTime: number | null // 200m time
  sandbagLungeTime: number | null // 100m time
  wallBallTime: number | null // 75/100 reps time

  // Strengths and weaknesses
  strongestStation: string
  weakestStation: string

  // Training preferences
  weeklyTrainingHours: number
  runningSessionsPerWeek: number
  strengthSessionsPerWeek: number
  hyroxSpecificSessionsPerWeek: number

  // Equipment access
  hasSkiErg: boolean
  hasRower: boolean
  hasSled: boolean
  hasWallBall: boolean
  hasSandbag: boolean
  hasFarmersCarryHandles: boolean
  gymAccess: boolean
}

export const DEFAULT_HYROX_SETTINGS: HYROXSettings = {
  raceCategory: 'open',
  experienceLevel: 'beginner',
  targetRaceDate: null,

  fiveKmTime: null,
  tenKmTime: null,
  currentWeeklyRunKm: 20,

  skiErgTime: null,
  sledPushTime: null,
  sledPullTime: null,
  burpeeBroadJumpTime: null,
  rowingTime: null,
  farmersCarryTime: null,
  sandbagLungeTime: null,
  wallBallTime: null,

  strongestStation: '',
  weakestStation: '',

  weeklyTrainingHours: 8,
  runningSessionsPerWeek: 3,
  strengthSessionsPerWeek: 2,
  hyroxSpecificSessionsPerWeek: 1,

  hasSkiErg: false,
  hasRower: false,
  hasSled: false,
  hasWallBall: false,
  hasSandbag: false,
  hasFarmersCarryHandles: false,
  gymAccess: true,
}

const RACE_CATEGORIES = [
  { value: 'open', label: 'HYROX Open', description: 'Standard vikter' },
  { value: 'pro', label: 'HYROX Pro', description: 'Tyngre vikter' },
  { value: 'doubles', label: 'HYROX Doubles', description: 'Par (2 personer)' },
  { value: 'relay', label: 'HYROX Relay', description: 'Lag (4 personer)' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Nybörjare', description: 'Första HYROX eller <3 månader träning' },
  { value: 'intermediate', label: 'Medel', description: '1-2 genomförda HYROX eller 6+ månaders träning' },
  { value: 'advanced', label: 'Avancerad', description: '3+ genomförda HYROX, tävlar regelbundet' },
  { value: 'elite', label: 'Elit', description: 'Topp 10% placeringar, siktar på podium' },
]

const STATIONS = [
  { value: 'skierg', label: 'SkiErg (1km)' },
  { value: 'sled_push', label: 'Sled Push (50m)' },
  { value: 'sled_pull', label: 'Sled Pull (50m)' },
  { value: 'burpee_broad_jump', label: 'Burpee Broad Jump (80m)' },
  { value: 'rowing', label: 'Rodd (1km)' },
  { value: 'farmers_carry', label: 'Farmers Carry (200m)' },
  { value: 'sandbag_lunge', label: 'Sandbag Lunge (100m)' },
  { value: 'wall_balls', label: 'Wall Balls (75/100)' },
]

interface HYROXOnboardingProps {
  settings: HYROXSettings
  onUpdate: (settings: HYROXSettings) => void
}

export function HYROXOnboarding({ settings, onUpdate }: HYROXOnboardingProps) {
  const updateField = <K extends keyof HYROXSettings>(field: K, value: HYROXSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const formatTimeInput = (seconds: number | null): string => {
    if (seconds === null) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTimeInput = (value: string): number | null => {
    if (!value) return null
    const parts = value.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0
      const secs = parseInt(parts[1]) || 0
      return mins * 60 + secs
    }
    return parseInt(value) || null
  }

  return (
    <div className="space-y-6">
      {/* Race Category & Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Tävlingsinformation
          </CardTitle>
          <CardDescription>
            Välj din HYROX-kategori och erfarenhetsnivå
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tävlingskategori</Label>
              <Select
                value={settings.raceCategory}
                onValueChange={(value) => updateField('raceCategory', value as HYROXSettings['raceCategory'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {RACE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <div className="font-medium">{cat.label}</div>
                        <div className="text-xs text-muted-foreground">{cat.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Erfarenhetsnivå</Label>
              <Select
                value={settings.experienceLevel}
                onValueChange={(value) => updateField('experienceLevel', value as HYROXSettings['experienceLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj nivå" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
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
            <Label>Måltävlingsdatum (valfritt)</Label>
            <Input
              type="date"
              value={settings.targetRaceDate || ''}
              onChange={(e) => updateField('targetRaceDate', e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Running Fitness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-green-500" />
            Löpkapacitet
          </CardTitle>
          <CardDescription>
            Din nuvarande löpform (8km löpning ingår i HYROX)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>5 km personbästa (mm:ss)</Label>
              <Input
                placeholder="25:00"
                value={formatTimeInput(settings.fiveKmTime)}
                onChange={(e) => updateField('fiveKmTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>10 km personbästa (mm:ss)</Label>
              <Input
                placeholder="52:00"
                value={formatTimeInput(settings.tenKmTime)}
                onChange={(e) => updateField('tenKmTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Veckokilometer löpning</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={settings.currentWeeklyRunKm}
                onChange={(e) => updateField('currentWeeklyRunKm', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            Stationstider
          </CardTitle>
          <CardDescription>
            Dina bästa tider på respektive station (lämna tomt om okänt)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>SkiErg 1km (mm:ss)</Label>
              <Input
                placeholder="4:00"
                value={formatTimeInput(settings.skiErgTime)}
                onChange={(e) => updateField('skiErgTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Sled Push 50m (mm:ss)</Label>
              <Input
                placeholder="2:30"
                value={formatTimeInput(settings.sledPushTime)}
                onChange={(e) => updateField('sledPushTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Sled Pull 50m (mm:ss)</Label>
              <Input
                placeholder="2:00"
                value={formatTimeInput(settings.sledPullTime)}
                onChange={(e) => updateField('sledPullTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Burpee Broad Jump 80m (mm:ss)</Label>
              <Input
                placeholder="5:00"
                value={formatTimeInput(settings.burpeeBroadJumpTime)}
                onChange={(e) => updateField('burpeeBroadJumpTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Rodd 1km (mm:ss)</Label>
              <Input
                placeholder="3:45"
                value={formatTimeInput(settings.rowingTime)}
                onChange={(e) => updateField('rowingTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Farmers Carry 200m (mm:ss)</Label>
              <Input
                placeholder="2:00"
                value={formatTimeInput(settings.farmersCarryTime)}
                onChange={(e) => updateField('farmersCarryTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Sandbag Lunge 100m (mm:ss)</Label>
              <Input
                placeholder="4:30"
                value={formatTimeInput(settings.sandbagLungeTime)}
                onChange={(e) => updateField('sandbagLungeTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Wall Balls (mm:ss)</Label>
              <Input
                placeholder="4:00"
                value={formatTimeInput(settings.wallBallTime)}
                onChange={(e) => updateField('wallBallTime', parseTimeInput(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label>Starkaste station</Label>
              <Select
                value={settings.strongestStation}
                onValueChange={(value) => updateField('strongestStation', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj station" />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station.value} value={station.value}>
                      {station.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Svagaste station</Label>
              <Select
                value={settings.weakestStation}
                onValueChange={(value) => updateField('weakestStation', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj station" />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station.value} value={station.value}>
                      {station.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-500" />
            Träningsupplägg
          </CardTitle>
          <CardDescription>
            Hur mycket tid och hur ofta du kan träna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Träningstimmar/vecka</Label>
              <Input
                type="number"
                min={3}
                max={20}
                value={settings.weeklyTrainingHours}
                onChange={(e) => updateField('weeklyTrainingHours', parseInt(e.target.value) || 8)}
              />
            </div>

            <div className="space-y-2">
              <Label>Löppass/vecka</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={settings.runningSessionsPerWeek}
                onChange={(e) => updateField('runningSessionsPerWeek', parseInt(e.target.value) || 3)}
              />
            </div>

            <div className="space-y-2">
              <Label>Styrkepass/vecka</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={settings.strengthSessionsPerWeek}
                onChange={(e) => updateField('strengthSessionsPerWeek', parseInt(e.target.value) || 2)}
              />
            </div>

            <div className="space-y-2">
              <Label>HYROX-specifika pass/vecka</Label>
              <Input
                type="number"
                min={0}
                max={3}
                value={settings.hyroxSpecificSessionsPerWeek}
                onChange={(e) => updateField('hyroxSpecificSessionsPerWeek', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Access */}
      <Card>
        <CardHeader>
          <CardTitle>Utrustning</CardTitle>
          <CardDescription>
            Vilken HYROX-specifik utrustning har du tillgång till?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gym"
                checked={settings.gymAccess}
                onCheckedChange={(checked) => updateField('gymAccess', checked === true)}
              />
              <Label htmlFor="gym" className="text-sm">Gymtillgång</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skierg"
                checked={settings.hasSkiErg}
                onCheckedChange={(checked) => updateField('hasSkiErg', checked === true)}
              />
              <Label htmlFor="skierg" className="text-sm">SkiErg</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rower"
                checked={settings.hasRower}
                onCheckedChange={(checked) => updateField('hasRower', checked === true)}
              />
              <Label htmlFor="rower" className="text-sm">Roddmaskin</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sled"
                checked={settings.hasSled}
                onCheckedChange={(checked) => updateField('hasSled', checked === true)}
              />
              <Label htmlFor="sled" className="text-sm">Släde</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wallball"
                checked={settings.hasWallBall}
                onCheckedChange={(checked) => updateField('hasWallBall', checked === true)}
              />
              <Label htmlFor="wallball" className="text-sm">Wall Ball</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sandbag"
                checked={settings.hasSandbag}
                onCheckedChange={(checked) => updateField('hasSandbag', checked === true)}
              />
              <Label htmlFor="sandbag" className="text-sm">Sandsäck</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="farmers"
                checked={settings.hasFarmersCarryHandles}
                onCheckedChange={(checked) => updateField('hasFarmersCarryHandles', checked === true)}
              />
              <Label htmlFor="farmers" className="text-sm">Farmers Carry-handtag</Label>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Oroa dig inte om du saknar viss utrustning - vi anpassar träningen med alternativa övningar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
