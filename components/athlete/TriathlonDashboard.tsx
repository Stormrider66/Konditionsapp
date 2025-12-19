'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Waves, Bike, PersonStanding, Timer, Target, TrendingUp, Trophy, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface TriathlonSettings {
  targetRaceDistance?: string
  experienceLevel?: string
  strongestDiscipline?: string
  weakestDiscipline?: string
  currentCss?: number | null
  cssTestDate?: string | null
  openWaterExperience?: string
  wetsuitType?: string
  currentFtp?: number | null
  ftpTestDate?: string | null
  bikeType?: string
  hasPowerMeter?: boolean
  currentThresholdPace?: number | null
  thresholdTestDate?: string | null
  weeklyHoursAvailable?: number
  swimSessions?: number
  bikeSessions?: number
  runSessions?: number
  brickWorkoutsPerWeek?: number
  hasHeartRateMonitor?: boolean
  hasGpsWatch?: boolean
  hasIndoorTrainer?: boolean
  weight?: number | null
}

interface TriathlonDashboardProps {
  triathlonSettings: TriathlonSettings | null | undefined
  experience: string | null
  clientName: string
}

// Race distance data
const RACE_DATA: Record<string, { name: string; swim: number; bike: number; run: number; swimUnit: string; bikeUnit: string; runUnit: string }> = {
  super_sprint: { name: 'Super Sprint', swim: 400, bike: 10, run: 2.5, swimUnit: 'm', bikeUnit: 'km', runUnit: 'km' },
  sprint: { name: 'Sprint', swim: 750, bike: 20, run: 5, swimUnit: 'm', bikeUnit: 'km', runUnit: 'km' },
  olympic: { name: 'Olympisk', swim: 1500, bike: 40, run: 10, swimUnit: 'm', bikeUnit: 'km', runUnit: 'km' },
  half_ironman: { name: 'Halv Ironman (70.3)', swim: 1900, bike: 90, run: 21.1, swimUnit: 'm', bikeUnit: 'km', runUnit: 'km' },
  ironman: { name: 'Ironman (140.6)', swim: 3800, bike: 180, run: 42.2, swimUnit: 'm', bikeUnit: 'km', runUnit: 'km' },
}

// Format pace as mm:ss
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Estimate race times based on threshold data
function estimateRaceTime(
  raceDistance: string,
  css: number | null, // seconds per 100m
  ftp: number | null, // watts
  thresholdPace: number | null, // seconds per km
  weight: number | null
): { swim: string; bike: string; run: string; total: string } | null {
  const race = RACE_DATA[raceDistance]
  if (!race) return null

  // Estimate swim time (CSS is ~1500m pace, add 5-10% for open water)
  let swimSeconds = 0
  if (css) {
    const swimDistance = race.swim
    const openWaterFactor = 1.08 // 8% slower in open water
    swimSeconds = Math.round((css / 100) * swimDistance * openWaterFactor)
  }

  // Estimate bike time (assume 75-80% FTP for race pace)
  let bikeSeconds = 0
  if (ftp && weight) {
    // Very simplified power-to-speed model
    const racePower = ftp * 0.75 // 75% FTP for long distance
    const wattsPerKg = racePower / weight
    // Rough estimate: 30 km/h at 3 W/kg, scales somewhat linearly
    const speedKmh = 25 + (wattsPerKg - 2.5) * 5
    bikeSeconds = Math.round((race.bike / speedKmh) * 3600)
  }

  // Estimate run time (threshold pace is ~10K pace, add 5-15% for race distance)
  let runSeconds = 0
  if (thresholdPace) {
    const distanceFactor = race.run <= 5 ? 1.0 : race.run <= 10 ? 1.05 : race.run <= 21.1 ? 1.12 : 1.18
    runSeconds = Math.round(thresholdPace * race.run * distanceFactor)
  }

  // Add transition times
  const t1 = raceDistance === 'ironman' ? 300 : raceDistance === 'half_ironman' ? 180 : 90
  const t2 = raceDistance === 'ironman' ? 300 : raceDistance === 'half_ironman' ? 180 : 60

  const totalSeconds = swimSeconds + bikeSeconds + runSeconds + t1 + t2

  // Format times
  const formatTime = (secs: number) => {
    if (secs === 0) return '--:--'
    const hours = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${mins}:${s.toString().padStart(2, '0')}`
  }

  return {
    swim: formatTime(swimSeconds),
    bike: formatTime(bikeSeconds),
    run: formatTime(runSeconds),
    total: formatTime(totalSeconds),
  }
}

// Get discipline icon
function DisciplineIcon({ discipline, className }: { discipline: string; className?: string }) {
  switch (discipline) {
    case 'swim':
      return <Waves className={cn('h-5 w-5', className)} />
    case 'bike':
      return <Bike className={cn('h-5 w-5', className)} />
    case 'run':
      return <PersonStanding className={cn('h-5 w-5', className)} />
    default:
      return null
  }
}

// Get discipline name in Swedish
function getDisciplineName(discipline: string): string {
  switch (discipline) {
    case 'swim':
      return 'Simning'
    case 'bike':
      return 'Cykling'
    case 'run':
      return 'Löpning'
    default:
      return discipline
  }
}

export function TriathlonDashboard({
  triathlonSettings,
  experience,
  clientName,
}: TriathlonDashboardProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!triathlonSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardContent className="py-6">
          <p className="text-center" style={{ color: theme.colors.textMuted }}>
            Ingen triathloninställning hittades. Vänligen slutför din profil.
          </p>
        </CardContent>
      </Card>
    )
  }

  const race = triathlonSettings.targetRaceDistance
    ? RACE_DATA[triathlonSettings.targetRaceDistance]
    : null

  const estimatedTimes = triathlonSettings.targetRaceDistance
    ? estimateRaceTime(
        triathlonSettings.targetRaceDistance,
        triathlonSettings.currentCss || null,
        triathlonSettings.currentFtp || null,
        triathlonSettings.currentThresholdPace || null,
        triathlonSettings.weight || null
      )
    : null

  // Calculate training distribution
  const totalSessions = (triathlonSettings.swimSessions || 0) +
    (triathlonSettings.bikeSessions || 0) +
    (triathlonSettings.runSessions || 0)
  const swimPercent = totalSessions > 0 ? Math.round(((triathlonSettings.swimSessions || 0) / totalSessions) * 100) : 0
  const bikePercent = totalSessions > 0 ? Math.round(((triathlonSettings.bikeSessions || 0) / totalSessions) * 100) : 0
  const runPercent = totalSessions > 0 ? Math.round(((triathlonSettings.runSessions || 0) / totalSessions) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header with Race Target */}
      <Card
        className="border-0"
        style={{
          background: theme.id === 'FITAPP_DARK'
            ? 'linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(234, 179, 8, 0.15), rgba(34, 197, 94, 0.15))'
            : 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(234, 179, 8, 0.1), rgba(34, 197, 94, 0.1))',
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-xl" style={{ color: theme.colors.textPrimary }}>Triathlon</CardTitle>
            </div>
            {race && (
              <Badge variant="secondary" className="text-sm">
                {race.name}
              </Badge>
            )}
          </div>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {race ? (
              <span className="flex items-center gap-2 mt-1">
                <Waves className="h-4 w-4 text-blue-500" /> {race.swim}{race.swimUnit}
                <span className="mx-1">+</span>
                <Bike className="h-4 w-4 text-yellow-500" /> {race.bike}{race.bikeUnit}
                <span className="mx-1">+</span>
                <PersonStanding className="h-4 w-4 text-green-500" /> {race.run}{race.runUnit}
              </span>
            ) : (
              'Välj din måltävlingsdistans i profilen'
            )}
          </CardDescription>
        </CardHeader>
        {estimatedTimes && estimatedTimes.total !== '--:--' && (
          <CardContent>
            <div className="rounded-lg p-4" style={{ backgroundColor: theme.colors.backgroundCard + 'cc' }}>
              <p className="text-sm mb-2" style={{ color: theme.colors.textMuted }}>Uppskattad tävlingstid</p>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <Waves className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="font-bold" style={{ color: theme.colors.textPrimary }}>{estimatedTimes.swim}</p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Sim</p>
                </div>
                <div>
                  <Bike className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                  <p className="font-bold" style={{ color: theme.colors.textPrimary }}>{estimatedTimes.bike}</p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Cykel</p>
                </div>
                <div>
                  <PersonStanding className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="font-bold" style={{ color: theme.colors.textPrimary }}>{estimatedTimes.run}</p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Löp</p>
                </div>
                <div className="border-l" style={{ borderColor: theme.colors.border }}>
                  <Timer className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.accent }} />
                  <p className="font-bold" style={{ color: theme.colors.accent }}>{estimatedTimes.total}</p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Totalt</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Discipline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Swimming */}
        <Card
          className={cn(
            triathlonSettings.strongestDiscipline === 'swim' && 'ring-2 ring-green-500',
            triathlonSettings.weakestDiscipline === 'swim' && 'ring-2 ring-orange-500'
          )}
          style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Waves className="h-5 w-5 text-blue-500" />
              Simning
              {triathlonSettings.strongestDiscipline === 'swim' && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Starkast</Badge>
              )}
              {triathlonSettings.weakestDiscipline === 'swim' && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">Fokus</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {triathlonSettings.currentCss ? (
              <div>
                <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{formatPace(triathlonSettings.currentCss)}</p>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>CSS per 100m</p>
              </div>
            ) : (
              <div className="flex items-center gap-2" style={{ color: theme.colors.textMuted }}>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">CSS ej testat</span>
              </div>
            )}
            <div className="text-sm">
              <p style={{ color: theme.colors.textMuted }}>Öppet vatten: {
                triathlonSettings.openWaterExperience === 'none' ? 'Ingen erfarenhet' :
                triathlonSettings.openWaterExperience === 'beginner' ? 'Nybörjare' :
                triathlonSettings.openWaterExperience === 'intermediate' ? 'Mellan' : 'Avancerad'
              }</p>
            </div>
          </CardContent>
        </Card>

        {/* Cycling */}
        <Card
          className={cn(
            triathlonSettings.strongestDiscipline === 'bike' && 'ring-2 ring-green-500',
            triathlonSettings.weakestDiscipline === 'bike' && 'ring-2 ring-orange-500'
          )}
          style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Bike className="h-5 w-5 text-yellow-500" />
              Cykling
              {triathlonSettings.strongestDiscipline === 'bike' && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Starkast</Badge>
              )}
              {triathlonSettings.weakestDiscipline === 'bike' && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">Fokus</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {triathlonSettings.currentFtp ? (
              <div>
                <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{triathlonSettings.currentFtp}W</p>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>FTP</p>
                {triathlonSettings.weight && (
                  <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                    {(triathlonSettings.currentFtp / triathlonSettings.weight).toFixed(2)} W/kg
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2" style={{ color: theme.colors.textMuted }}>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">FTP ej testat</span>
              </div>
            )}
            <div className="text-sm">
              <p style={{ color: theme.colors.textMuted }}>
                {triathlonSettings.hasPowerMeter ? 'Wattmätare' : 'Ingen wattmätare'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Running */}
        <Card
          className={cn(
            triathlonSettings.strongestDiscipline === 'run' && 'ring-2 ring-green-500',
            triathlonSettings.weakestDiscipline === 'run' && 'ring-2 ring-orange-500'
          )}
          style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <PersonStanding className="h-5 w-5 text-green-500" />
              Löpning
              {triathlonSettings.strongestDiscipline === 'run' && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Starkast</Badge>
              )}
              {triathlonSettings.weakestDiscipline === 'run' && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">Fokus</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {triathlonSettings.currentThresholdPace ? (
              <div>
                <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{formatPace(triathlonSettings.currentThresholdPace)}</p>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>Tröskeltempo per km</p>
              </div>
            ) : (
              <div className="flex items-center gap-2" style={{ color: theme.colors.textMuted }}>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Tröskeltempo ej testat</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Distribution */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-5 w-5" />
            Träningsfördelning
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {triathlonSettings.weeklyHoursAvailable}h/vecka - {totalSessions} pass + {triathlonSettings.brickWorkoutsPerWeek || 0} kombipass
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Waves className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1" style={{ color: theme.colors.textPrimary }}>
                  <span>Simning</span>
                  <span>{triathlonSettings.swimSessions || 0} pass ({swimPercent}%)</span>
                </div>
                <Progress value={swimPercent} className="h-2 bg-blue-100" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bike className="h-4 w-4 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1" style={{ color: theme.colors.textPrimary }}>
                  <span>Cykling</span>
                  <span>{triathlonSettings.bikeSessions || 0} pass ({bikePercent}%)</span>
                </div>
                <Progress value={bikePercent} className="h-2 bg-yellow-100" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PersonStanding className="h-4 w-4 text-green-500 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1" style={{ color: theme.colors.textPrimary }}>
                  <span>Löpning</span>
                  <span>{triathlonSettings.runSessions || 0} pass ({runPercent}%)</span>
                </div>
                <Progress value={runPercent} className="h-2 bg-green-100" />
              </div>
            </div>
          </div>

          {(triathlonSettings.brickWorkoutsPerWeek || 0) > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="font-medium" style={{ color: theme.colors.textPrimary }}>{triathlonSettings.brickWorkoutsPerWeek} kombipass/vecka</span>
                <span style={{ color: theme.colors.textMuted }}>(cykel+löp)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Tips */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg" style={{ color: theme.colors.textPrimary }}>Träningstips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm" style={{ color: theme.colors.textPrimary }}>
            {triathlonSettings.weakestDiscipline === 'swim' && (
              <li className="flex items-start gap-2">
                <Waves className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span>Fokusera på teknik och öppet vatten-simning. CSS-träning förbättrar din uthållighet.</span>
              </li>
            )}
            {triathlonSettings.weakestDiscipline === 'bike' && (
              <li className="flex items-start gap-2">
                <Bike className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <span>Bygg din cykelstyrka med sweet spot-träning. Använd en wattmätare för bästa resultat.</span>
              </li>
            )}
            {triathlonSettings.weakestDiscipline === 'run' && (
              <li className="flex items-start gap-2">
                <PersonStanding className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Fokusera på löploppet - det är där många triathlon avgörs. Brick-löpning är viktigt.</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
              <span>Kombipass (brick workouts) förberedrar kroppen för övergången cykel-löp.</span>
            </li>
            {race && race.name.includes('Ironman') && (
              <li className="flex items-start gap-2">
                <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <span>Ironman kräver extremt fokus på näring. Träna matintag under långa pass.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
