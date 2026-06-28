'use client'

/**
 * Injury Progress Timeline Component
 *
 * Visualizes return-to-running protocol progress with:
 * - 5-phase timeline (Walking → Walk/Run → Progressive → Continuous → Full Training)
 * - Daily pain trend charts
 * - Phase completion criteria
 * - Estimated return date predictions
 * - Progress indicators per phase
 */

import { useState } from 'react'
import useSWR from 'swr'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  Target,
} from 'lucide-react'
import { format, addDays, differenceInDays } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useLocale } from '@/i18n/client'

interface InjuryWithProgress {
  id: string
  clientId: string
  clientName: string
  injuryType: string
  painLevel: number
  detectedAt: Date
  status: 'ACTIVE' | 'MONITORING' | 'RESOLVED'
  phase: number | null
  estimatedReturnWeeks: number
  daysInCurrentPhase?: number
}

interface PainDataPoint {
  date: string
  pain: number
  soreness: number
}

interface DailyMetric {
  date: string | Date
  injuryPain?: number | null
  muscleSoreness?: number | null
}

interface PhaseInfo {
  phase: number
  name: string
  weeks: number
  description: string
  criteria: string[]
  runWalkRatio: string
  frequency: number
  duration: number
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')
const localizedText = (locale: AppLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText

const RETURN_TO_RUNNING_PHASES_SV: PhaseInfo[] = [
  {
    phase: 1,
    name: 'Gång',
    weeks: 1,
    description: 'Endast gång, ingen löpning',
    criteria: [
      '7 dagar smärtfri gång',
      'Ingen morgonstelhet',
      'Full rörlighet',
      'Coach/fysio godkännande',
    ],
    runWalkRatio: '0:1 (endast gång)',
    frequency: 5,
    duration: 20,
  },
  {
    phase: 2,
    name: 'Gång/Löp Introduktion',
    weeks: 2,
    description: 'Försiktig introduktion av löpning',
    criteria: [
      '6 pass utan smärta',
      'Ingen smärta 24h efter',
      'HRV inom 5% av baslinjen',
      'Sömnkvalitet bibehållen',
    ],
    runWalkRatio: '1:4 (1 min löp, 4 min gång)',
    frequency: 3,
    duration: 30,
  },
  {
    phase: 3,
    name: 'Progressiv Gång/Löp',
    weeks: 2,
    description: 'Gradvis ökning av löpning',
    criteria: [
      '8 pass utan smärta',
      'ACWR <1.3',
      'Funktionstest godkänt',
      'Styrkeövningar smärtfria',
    ],
    runWalkRatio: '2:3 → 3:2 (gradvis progression)',
    frequency: 4,
    duration: 35,
  },
  {
    phase: 4,
    name: 'Kontinuerlig Löpning',
    weeks: 2,
    description: 'Hel löpning utan gångpauser',
    criteria: [
      '8 kontinuerliga löpningar',
      '50% av volym före skada',
      'Inga symptom på 2 veckor',
      'Redo för 10% veckoökning',
    ],
    runWalkRatio: '1:0 (kontinuerlig löpning)',
    frequency: 4,
    duration: 40,
  },
  {
    phase: 5,
    name: 'Återgång till Full Träning',
    weeks: 4,
    description: 'Gradvis återgång till normal träning',
    criteria: [
      '80% av volym före skada',
      'Intensitetsprogression återinförd',
      'Inga symptom på 4 veckor',
      'Tävlingsredo enligt coach',
    ],
    runWalkRatio: '1:0',
    frequency: 5,
    duration: 60,
  },
]

const RETURN_TO_RUNNING_PHASES_EN: PhaseInfo[] = [
  {
    phase: 1,
    name: 'Walking',
    weeks: 1,
    description: 'Walking only, no running',
    criteria: [
      '7 days of pain-free walking',
      'No morning stiffness',
      'Full mobility',
      'Coach/physio approval',
    ],
    runWalkRatio: '0:1 (walking only)',
    frequency: 5,
    duration: 20,
  },
  {
    phase: 2,
    name: 'Walk/Run Introduction',
    weeks: 2,
    description: 'Careful reintroduction of running',
    criteria: [
      '6 sessions without pain',
      'No pain 24h after',
      'HRV within 5% of baseline',
      'Sleep quality maintained',
    ],
    runWalkRatio: '1:4 (1 min run, 4 min walk)',
    frequency: 3,
    duration: 30,
  },
  {
    phase: 3,
    name: 'Progressive Walk/Run',
    weeks: 2,
    description: 'Gradual increase in running',
    criteria: [
      '8 sessions without pain',
      'ACWR <1.3',
      'Functional test approved',
      'Strength exercises pain-free',
    ],
    runWalkRatio: '2:3 -> 3:2 (gradual progression)',
    frequency: 4,
    duration: 35,
  },
  {
    phase: 4,
    name: 'Continuous Running',
    weeks: 2,
    description: 'Full running without walk breaks',
    criteria: [
      '8 continuous runs',
      '50% of pre-injury volume',
      'No symptoms for 2 weeks',
      'Ready for 10% weekly increase',
    ],
    runWalkRatio: '1:0 (continuous running)',
    frequency: 4,
    duration: 40,
  },
  {
    phase: 5,
    name: 'Return to Full Training',
    weeks: 4,
    description: 'Gradual return to normal training',
    criteria: [
      '80% of pre-injury volume',
      'Intensity progression reintroduced',
      'No symptoms for 4 weeks',
      'Competition-ready according to coach',
    ],
    runWalkRatio: '1:0',
    frequency: 5,
    duration: 60,
  },
]

const RETURN_TO_RUNNING_PHASES_BY_LOCALE: Record<AppLocale, PhaseInfo[]> = {
  en: RETURN_TO_RUNNING_PHASES_EN,
  sv: RETURN_TO_RUNNING_PHASES_SV,
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function InjuryProgressTimeline() {
  const locale = getAppLocale(useLocale())
  const t = (svText: string, enText: string) => localizedText(locale, svText, enText)
  const dateFnsLocale = locale === 'sv' ? sv : enUS
  const phases = RETURN_TO_RUNNING_PHASES_BY_LOCALE[locale]
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30')

  // Fetch all active injuries
  const { data: injuriesData } = useSWR('/api/injury/alerts?status=ACTIVE', fetcher, {
    refreshInterval: 60000,
  })

  // Fetch pain data for selected client
  const { data: painData } = useSWR(
    selectedClientId ? `/api/daily-metrics?clientId=${selectedClientId}&days=${dateRange === 'all' ? 90 : dateRange}` : null,
    fetcher
  )

  const injuries: InjuryWithProgress[] = injuriesData?.alerts || []
  const selectedInjury = injuries.find(i => i.clientId === selectedClientId)

  // Transform pain data for chart
  const painChartData: PainDataPoint[] =
    painData?.metrics?.map((m: DailyMetric) => ({
      date: format(new Date(m.date), 'dd MMM', { locale: dateFnsLocale }),
      pain: m.injuryPain ? 11 - m.injuryPain : 0, // Convert back to athlete-facing scale
      soreness: m.muscleSoreness ? 11 - m.muscleSoreness : 0,
    })) || []

  // Calculate progress metrics
  const currentPhase = selectedInjury?.phase || 1
  const phaseInfo = phases[currentPhase - 1]
  const daysInPhase = selectedInjury?.daysInCurrentPhase || 0
  const expectedDaysInPhase = (phaseInfo?.weeks || 1) * 7
  const phaseProgress = Math.min((daysInPhase / expectedDaysInPhase) * 100, 100)

  // Calculate estimated completion dates
  const detectedDate = selectedInjury ? new Date(selectedInjury.detectedAt) : new Date()
  const estimatedReturnDate = addDays(detectedDate, (selectedInjury?.estimatedReturnWeeks || 0) * 7)
  const daysUntilReturn = differenceInDays(estimatedReturnDate, new Date())

  // Calculate pain trend
  const recentPain = painChartData.slice(-7)
  const painTrend =
    recentPain.length >= 2
      ? recentPain[recentPain.length - 1].pain - recentPain[0].pain
      : 0

  if (injuries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">{t('Inga aktiva skador', 'No active injuries')}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                'Det finns inga skador att följa upp just nu',
                'There are no injuries to follow up right now'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Athlete Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">
            {t('Skadeåterhämtning', 'Injury recovery')}{' '}
            <InfoTooltip conceptKey="rehabPhases" />
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'Följ progressionen tillbaka till full träning',
              'Track progression back to full training'
            )}
          </p>
        </div>

        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder={t('Välj atleet', 'Select athlete')} />
          </SelectTrigger>
          <SelectContent>
            {injuries.map(injury => (
              <SelectItem key={injury.clientId} value={injury.clientId}>
                {injury.clientName} - {injury.injuryType.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedInjury ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t(
              'Välj en atleet för att se återhämtningsprogress',
              'Select an athlete to view recovery progress'
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('Nuvarande Fas', 'Current Phase')}
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {t(`Fas ${currentPhase}/5`, `Phase ${currentPhase}/5`)}
                </div>
                <p className="text-xs text-muted-foreground">{phaseInfo.name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('Fasens Progress', 'Phase Progress')}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(phaseProgress)}%</div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    `${daysInPhase} av ${expectedDaysInPhase} dagar`,
                    `${daysInPhase} of ${expectedDaysInPhase} days`
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('Smärttrend', 'Pain trend')}
                </CardTitle>
                {painTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {painTrend < 0 ? '↓' : painTrend > 0 ? '↑' : '→'}{' '}
                  {Math.abs(painTrend).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {painTrend < 0
                    ? t('Förbättring', 'Improving')
                    : painTrend > 0
                      ? t('Försämring', 'Worsening')
                      : t('Stabilt', 'Stable')}{' '}
                  {t('(7 dagar)', '(7 days)')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('Beräknad Återgång', 'Estimated Return')}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysUntilReturn}d</div>
                <p className="text-xs text-muted-foreground">
                  {format(estimatedReturnDate, 'd MMM', { locale: dateFnsLocale })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Phase Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Återhämtningsfaser', 'Recovery phases')}</CardTitle>
              <CardDescription>
                {t(
                  '5-fas protokoll för säker återgång till full träning',
                  '5-phase protocol for a safe return to full training'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {phases.map((phase, idx) => {
                  const isCompleted = currentPhase > phase.phase
                  const isCurrent = currentPhase === phase.phase

                  return (
                    <div key={phase.phase} className="relative">
                      {/* Connector Line */}
                      {idx < phases.length - 1 && (
                        <div
                          className={`absolute left-4 top-12 w-0.5 h-full ${
                            isCompleted ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}

                      <div className="flex gap-4">
                        {/* Phase Number Circle */}
                        <div
                          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? 'border-green-500 bg-green-500 text-white'
                              : isCurrent
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-muted bg-background text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{phase.phase}</span>
                          )}
                        </div>

                        {/* Phase Details */}
                        <div
                          className={`flex-1 pb-6 ${isCurrent ? 'bg-blue-50/50 p-4 rounded-lg' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">{phase.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {phase.description} · {phase.weeks}{' '}
                                {phase.weeks === 1 ? t('vecka', 'week') : t('veckor', 'weeks')}
                              </p>
                            </div>
                            {isCurrent && (
                              <Badge variant="default">{t('Pågående', 'Current')}</Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {t('Slutförd', 'Completed')}
                              </Badge>
                            )}
                          </div>

                          {isCurrent && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span className="font-medium">{Math.round(phaseProgress)}%</span>
                              </div>
                              <Progress value={phaseProgress} className="h-2" />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">
                                {t('Gång/Löp:', 'Walk/Run:')}
                              </span>
                              <span className="ml-2 font-medium">{phase.runWalkRatio}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {t('Frekvens:', 'Frequency:')}
                              </span>
                              <span className="ml-2 font-medium">
                                {t(
                                  `${phase.frequency}x/vecka, ${phase.duration} min`,
                                  `${phase.frequency}x/week, ${phase.duration} min`
                                )}
                              </span>
                            </div>
                          </div>

                          {(isCurrent || !isCompleted) && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                {t('Kriterier för nästa fas:', 'Criteria for next phase:')}
                              </p>
                              <ul className="text-sm space-y-1">
                                {phase.criteria.map((criterion, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    <span>{criterion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pain Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('Smärttrend', 'Pain trend')}</CardTitle>
                  <CardDescription>
                    {t(
                      'Daglig smärta från check-ins (0 = ingen smärta, 10 = extrem smärta)',
                      'Daily pain from check-ins (0 = no pain, 10 = extreme pain)'
                    )}
                  </CardDescription>
                </div>
                <Select
                  value={dateRange}
                  onValueChange={(value: '7' | '30' | 'all') => setDateRange(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t('7 dagar', '7 days')}</SelectItem>
                    <SelectItem value="30">{t('30 dagar', '30 days')}</SelectItem>
                    <SelectItem value="all">{t('90 dagar', '90 days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {painChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('Ingen smärtdata tillgänglig', 'No pain data available')}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={painChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                    <ReferenceLine
                      y={5}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={t('Tröskelvärde', 'Threshold')}
                    />
                    <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="pain"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name={t('Smärta', 'Pain')}
                    />
                    <Line
                      type="monotone"
                      dataKey="soreness"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      name={t('Ömhet', 'Soreness')}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
