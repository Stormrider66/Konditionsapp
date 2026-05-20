'use client'

import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Waves, Timer, Target, TrendingUp, Droplets, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface SwimmingSettings {
  strokeTypes?: string[]
  primaryStroke?: string
  primaryDiscipline?: string
  preferredPoolLength?: string
  trainingEnvironments?: string[]
  currentCss?: number | null
  cssTestDate?: string | null
  weeklySwimDistance?: number
  weeklySwimSessions?: number
  equipment?: string[]
  hasHeartRateMonitor?: boolean
  openWaterExperience?: string
  swimmingExperience?: string
}

interface SwimmingDashboardProps {
  swimmingSettings: SwimmingSettings | null | undefined
  experience: string | null
  clientName: string
}

interface SwimZone {
  zone: number
  name: string
  paceMin: number // seconds per 100m
  paceMax: number // seconds per 100m
  percentMin: number
  percentMax: number
  description: string
  color: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

// Format pace as mm:ss per 100m
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Calculate swimming pace zones based on CSS
function calculateSwimmingPaceZones(css: number, locale: AppLocale): SwimZone[] {
  return [
    {
      zone: 1,
      name: t(locale, 'Återhämtning', 'Recovery'),
      paceMin: Math.round(css * 1.20),
      paceMax: Math.round(css * 1.35),
      percentMin: 74,
      percentMax: 83,
      description: t(locale, 'Lätt simning för återhämtning och uppvärmning', 'Easy swimming for recovery and warm-ups'),
      color: 'bg-blue-100 text-blue-800',
    },
    {
      zone: 2,
      name: t(locale, 'Uthållighet', 'Endurance'),
      paceMin: Math.round(css * 1.08),
      paceMax: Math.round(css * 1.20),
      percentMin: 83,
      percentMax: 93,
      description: t(locale, 'Aerob basträning, längre intervaller', 'Aerobic base work and longer intervals'),
      color: 'bg-green-100 text-green-800',
    },
    {
      zone: 3,
      name: t(locale, 'Tröskel (CSS)', 'Threshold (CSS)'),
      paceMin: Math.round(css * 0.98),
      paceMax: Math.round(css * 1.08),
      percentMin: 93,
      percentMax: 102,
      description: t(locale, 'CSS-tempo, tävlingsfart på längre distanser', 'CSS pace and race pace for longer distances'),
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      zone: 4,
      name: 'VO2max',
      paceMin: Math.round(css * 0.90),
      paceMax: Math.round(css * 0.98),
      percentMin: 102,
      percentMax: 111,
      description: t(locale, 'Hög intensitet, medellånga intervaller (200-400m)', 'High intensity, medium-length intervals (200-400m)'),
      color: 'bg-orange-100 text-orange-800',
    },
    {
      zone: 5,
      name: 'Sprint',
      paceMin: Math.round(css * 0.82),
      paceMax: Math.round(css * 0.90),
      percentMin: 111,
      percentMax: 122,
      description: t(locale, 'Maximal intensitet, korta intervaller (25-100m)', 'Maximum intensity, short intervals (25-100m)'),
      color: 'bg-red-100 text-red-800',
    },
  ]
}

function getStrokeName(stroke: string, locale: AppLocale): string {
  const names: Record<string, Record<AppLocale, string>> = {
    freestyle: { sv: 'Frisim', en: 'Freestyle' },
    backstroke: { sv: 'Ryggsim', en: 'Backstroke' },
    breaststroke: { sv: 'Bröstsim', en: 'Breaststroke' },
    butterfly: { sv: 'Fjärilsim', en: 'Butterfly' },
    im: { sv: 'Medley', en: 'Individual medley' },
  }
  return names[stroke]?.[locale] || stroke
}

function getDisciplineName(discipline: string, locale: AppLocale): string {
  const names: Record<string, Record<AppLocale, string>> = {
    pool_distance: { sv: 'Pool Distans', en: 'Pool distance' },
    pool_sprint: { sv: 'Pool Sprint', en: 'Pool sprint' },
    open_water: { sv: 'Öppet vatten', en: 'Open water' },
    triathlon: { sv: 'Triathlon', en: 'Triathlon' },
    masters: { sv: 'Mastersim', en: 'Masters swimming' },
    recreational: { sv: 'Motionssim', en: 'Recreational swimming' },
  }
  return names[discipline]?.[locale] || discipline
}

// Get experience level display
function getExperienceLevel(exp: string, locale: AppLocale): { label: string; color: string } {
  const levels: Record<string, { label: Record<AppLocale, string>; color: string }> = {
    beginner: { label: { sv: 'Nybörjare', en: 'Beginner' }, color: 'bg-blue-100 text-blue-800' },
    intermediate: { label: { sv: 'Medel', en: 'Intermediate' }, color: 'bg-green-100 text-green-800' },
    advanced: { label: { sv: 'Avancerad', en: 'Advanced' }, color: 'bg-yellow-100 text-yellow-800' },
    elite: { label: { sv: 'Elit', en: 'Elite' }, color: 'bg-purple-100 text-purple-800' },
  }
  const level = levels[exp]
  return level ? { label: level.label[locale], color: level.color } : { label: exp, color: 'bg-gray-100 text-gray-800' }
}

// Get training tips based on discipline and experience
function getTrainingTips(discipline: string, experience: string, locale: AppLocale): string[] {
  const tips: string[] = []

  if (discipline === 'triathlon') {
    tips.push(t(locale, 'Fokusera på CSS-intervaller för effektivitet', 'Focus on CSS intervals for efficiency'))
    tips.push(t(locale, 'Träna simdragning med pull buoy regelbundet', 'Practice pull-buoy work regularly'))
    tips.push(t(locale, 'Öva våtdräktssimning före tävling', 'Practice wetsuit swimming before race day'))
    tips.push(t(locale, 'Inkludera open water-pass om möjligt', 'Include open-water sessions when possible'))
  } else if (discipline === 'pool_distance') {
    tips.push(t(locale, 'Bygg aerob bas med längre lågintensiva pass', 'Build aerobic base with longer low-intensity sessions'))
    tips.push(t(locale, 'Inkludera CSS-set för att höja tröskeln', 'Include CSS sets to lift threshold'))
    tips.push(t(locale, 'Arbeta med simteknik och effektivitet', 'Work on swim technique and efficiency'))
  } else if (discipline === 'pool_sprint') {
    tips.push(t(locale, 'Fokusera på teknik vid låg hastighet', 'Focus on technique at low speed'))
    tips.push(t(locale, 'Inkludera sprintset med full återhämtning', 'Include sprint sets with full recovery'))
    tips.push(t(locale, 'Träna starts och vändningar', 'Practice starts and turns'))
  } else if (discipline === 'open_water') {
    tips.push(t(locale, 'Träna navigation och siktning', 'Practice navigation and sighting'))
    tips.push(t(locale, 'Öva massstart och positionering', 'Practice mass starts and positioning'))
    tips.push(t(locale, 'Bygg uthållighet med långa, kontinuerliga pass', 'Build endurance with long continuous sessions'))
  } else {
    tips.push(t(locale, 'Variera simsätten för allsidig träning', 'Vary strokes for well-rounded training'))
    tips.push(t(locale, 'Fokusera på teknik framför hastighet', 'Prioritize technique over speed'))
    tips.push(t(locale, 'Inkludera återhämtningspass mellan hårda pass', 'Include recovery swims between hard sessions'))
  }

  if (experience === 'beginner') {
    tips.push(t(locale, 'Prioritera simteknik över volym', 'Prioritize swim technique over volume'))
    tips.push(t(locale, 'Börja med kortare intervaller och bygg upp', 'Start with shorter intervals and build gradually'))
  } else if (experience === 'elite') {
    tips.push(t(locale, 'Periodisera träningen mot huvudtävlingar', 'Periodize training toward key races'))
    tips.push(t(locale, 'Använd videanalys för teknikförbättring', 'Use video analysis to refine technique'))
  }

  return tips.slice(0, 4)
}

export function SwimmingDashboard({
  swimmingSettings,
  experience,
  clientName: _clientName,
}: SwimmingDashboardProps) {
  const locale = getAppLocale(useLocale())
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const settings = swimmingSettings || {}
  const css = settings.currentCss
  const paceZones = css ? calculateSwimmingPaceZones(css, locale) : []

  const primaryStroke = settings.primaryStroke || 'freestyle'
  const primaryDiscipline = settings.primaryDiscipline || 'recreational'
  const poolLength = settings.preferredPoolLength || '25'
  const swimExperience = settings.swimmingExperience || experience || 'intermediate'

  const trainingTips = getTrainingTips(primaryDiscipline, swimExperience, locale)
  const expLevel = getExperienceLevel(swimExperience, locale)

  return (
    <div className="space-y-6">
      {/* Header with CSS and Key Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* CSS Card */}
        <Card className="col-span-2 lg:col-span-1" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Timer className="h-4 w-4 text-cyan-500" />
              CSS ({t(locale, 'Tröskel', 'Threshold')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {css ? (
              <div>
                <p className="text-2xl font-bold text-cyan-600">
                  {formatPace(css)}<span className="text-sm font-normal ml-1" style={{ color: theme.colors.textMuted }}>/100m</span>
                </p>
                {settings.cssTestDate && (
                  <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    {t(locale, 'Testad:', 'Tested:')} {new Date(settings.cssTestDate).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-lg" style={{ color: theme.colors.textMuted }}>{t(locale, 'Ej angiven', 'Not set')}</p>
                <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                  {t(locale, 'Gör ett CSS-test för att få träningszoner', 'Complete a CSS test to get training zones')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Stroke */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Waves className="h-4 w-4 text-blue-500" />
              {t(locale, 'Huvudsimsätt', 'Primary stroke')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold" style={{ color: theme.colors.textPrimary }}>{getStrokeName(primaryStroke, locale)}</p>
            {settings.strokeTypes && settings.strokeTypes.length > 1 && (
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                +{settings.strokeTypes.length - 1} {t(locale, 'andra', 'others')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Discipline */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Target className="h-4 w-4 text-green-500" />
              Fokus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold" style={{ color: theme.colors.textPrimary }}>{getDisciplineName(primaryDiscipline, locale)}</p>
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>{poolLength}m {t(locale, 'bassäng', 'pool')}</p>
          </CardContent>
        </Card>

        {/* Experience */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4 text-purple-500" />
              {t(locale, 'Nivå', 'Level')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={cn('text-sm', expLevel.color)}>{expLevel.label}</Badge>
            {settings.weeklySwimSessions && (
              <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                {settings.weeklySwimSessions} {t(locale, 'pass/vecka', 'sessions/week')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pace Zones */}
      {css && paceZones.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Droplets className="h-5 w-5 text-cyan-500" />
              {t(locale, 'Simzoner', 'Swim zones')}
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Baserade på din CSS', 'Based on your CSS')} ({formatPace(css)}/100m)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paceZones.map((zone) => (
                <div key={zone.zone} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('w-8 h-6 flex items-center justify-center', zone.color)}>
                        Z{zone.zone}
                      </Badge>
                      <span className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{zone.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm" style={{ color: theme.colors.textPrimary }}>
                        {formatPace(zone.paceMax)} - {formatPace(zone.paceMin)}
                      </span>
                      <span className="text-xs ml-2" style={{ color: theme.colors.textMuted }}>
                        ({zone.percentMin}-{zone.percentMax}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(zone.percentMax - 70) * 2}
                    className="h-2"
                  />
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>{zone.description}</p>
                </div>
              ))}
            </div>

            {/* Estimated Race Paces */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
              <h4 className="font-medium text-sm mb-3" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Beräknade tävlingstempo', 'Estimated race paces')}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2 rounded" style={{ backgroundColor: theme.colors.background }}>
                  <span style={{ color: theme.colors.textMuted }}>400m:</span>
                  <span className="ml-2 font-mono" style={{ color: theme.colors.textPrimary }}>{formatPace(Math.round(css * 1.02))}</span>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: theme.colors.background }}>
                  <span style={{ color: theme.colors.textMuted }}>800m:</span>
                  <span className="ml-2 font-mono" style={{ color: theme.colors.textPrimary }}>{formatPace(Math.round(css * 1.05))}</span>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: theme.colors.background }}>
                  <span style={{ color: theme.colors.textMuted }}>1500m:</span>
                  <span className="ml-2 font-mono" style={{ color: theme.colors.textPrimary }}>{formatPace(Math.round(css * 1.08))}</span>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: theme.colors.background }}>
                  <span style={{ color: theme.colors.textMuted }}>3000m+:</span>
                  <span className="ml-2 font-mono" style={{ color: theme.colors.textPrimary }}>{formatPace(Math.round(css * 1.12))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Tips */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Info className="h-5 w-5 text-blue-500" />
            {t(locale, 'Träningstips för', 'Training tips for')} {getDisciplineName(primaryDiscipline, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {trainingTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm" style={{ color: theme.colors.textPrimary }}>
                <span className="text-cyan-500 mt-0.5">
                  <Waves className="h-4 w-4" />
                </span>
                {tip}
              </li>
            ))}
          </ul>

          {/* CSS Test Reminder */}
          {(!css || (settings.cssTestDate && daysSince(settings.cssTestDate) > 60)) && (
            <div
              className="mt-4 p-3 rounded-lg border"
              style={{
                backgroundColor: theme.id === 'FITAPP_DARK' ? '#422006' : '#fffbeb',
                borderColor: theme.id === 'FITAPP_DARK' ? '#92400e' : '#fde68a',
              }}
            >
              <p
                className="text-sm"
                style={{ color: theme.id === 'FITAPP_DARK' ? '#fcd34d' : '#92400e' }}
              >
                {!css
                  ? t(locale, 'Gör ett CSS-test för att få personliga träningszoner. Ett enkelt test: simma 400m + vila 10 min + simma 200m på tid.', 'Complete a CSS test to get personal training zones. Simple test: swim 400m, rest 10 min, then swim 200m for time.')
                  : t(locale, 'Din CSS är över 2 månader gammal. Överväg att göra ett nytt test för att uppdatera dina zoner.', 'Your CSS is over 2 months old. Consider retesting to update your zones.')}
              </p>
            </div>
          )}

          {/* Equipment Tips */}
          {settings.equipment && settings.equipment.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Din utrustning', 'Your equipment')}</h4>
              <div className="flex flex-wrap gap-2">
                {settings.equipment.map((equip) => (
                  <Badge key={equip} variant="outline" className="text-xs">
                    {getEquipmentName(equip, locale)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getEquipmentName(equip: string, locale: AppLocale): string {
  const names: Record<string, Record<AppLocale, string>> = {
    pull_buoy: { sv: 'Pull buoy', en: 'Pull buoy' },
    paddles: { sv: 'Paddlar', en: 'Paddles' },
    fins: { sv: 'Fenor', en: 'Fins' },
    snorkel: { sv: 'Snorkel', en: 'Snorkel' },
    kickboard: { sv: 'Simplatta', en: 'Kickboard' },
    wetsuit: { sv: 'Våtdräkt', en: 'Wetsuit' },
  }
  return names[equip]?.[locale] || equip
}

// Helper to calculate days since a date
function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
