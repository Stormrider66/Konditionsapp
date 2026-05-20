'use client'

/**
 * ACWR (Acute:Chronic Workload Ratio) Injury Risk Monitor
 *
 * Comprehensive ACWR monitoring dashboard with:
 * - Risk zone categorization (OPTIMAL/CAUTION/DANGER/CRITICAL/DETRAINING)
 * - Per-athlete ACWR trend charts
 * - Acute vs Chronic load visualization
 * - Auto-intervention log
 * - Real-time alerts for danger zones
 */

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Area,
  AreaChart,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Shield,
  User,
} from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface ACWRData {
  clientId: string
  clientName: string
  acwr: number
  acwrZone: 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'DETRAINING'
  date: Date
  acuteLoad: number
  chronicLoad: number
}

interface LoadDataPoint {
  date: string
  acuteLoad: number
  chronicLoad: number
  acwr: number
}

type AppLocale = 'en' | 'sv'

const labels: Record<AppLocale, {
  pageTitle: string
  pageDescription: string
  riskZonesTitle: string
  riskZonesDescription: string
  detailedTitle: string
  detailedDescription: string
  selectAthlete: string
  selectPrompt: string
  noLoadData: string
  acuteVsChronic: string
  acute: string
  chronic: string
  acwrRatio: string
  guideWhatTitle: string
  guideWhatText: string
  recommendedActions: string
  currentLoad: string
  reduce20: string
  reduce40: string
  immediateRest: string
  increaseGradually: string
  acuteShort: string
  chronicShort: string
}> = {
  en: {
    pageTitle: 'ACWR injury risk monitor',
    pageDescription: 'Monitor training load and prevent injuries with ACWR zones',
    riskZonesTitle: 'Athletes in risk zones',
    riskZonesDescription: 'Athletes who need training adjustment based on ACWR',
    detailedTitle: 'Detailed ACWR analysis',
    detailedDescription: '30-day load trend with acute/chronic ratio',
    selectAthlete: 'Select athlete',
    selectPrompt: 'Select an athlete to see the detailed ACWR trend',
    noLoadData: 'No load data available',
    acuteVsChronic: 'Acute vs chronic load',
    acute: 'Acute (7d)',
    chronic: 'Chronic (28d)',
    acwrRatio: 'ACWR ratio (acute:chronic)',
    guideWhatTitle: 'What is ACWR?',
    guideWhatText:
      'ACWR (Acute:Chronic Workload Ratio) measures the relationship between acute load (last 7 days) and chronic load (last 28 days). This helps identify injury risks from sudden load spikes.',
    recommendedActions: 'Recommended actions',
    currentLoad: 'Optimal zone - continue current load',
    reduce20: 'Reduce load 20-30%',
    reduce40: 'Reduce load 40-50% + extra rest',
    immediateRest: 'Immediate rest recommended',
    increaseGradually: 'Increase load gradually (10% per week)',
    acuteShort: 'Acute',
    chronicShort: 'Chronic',
  },
  sv: {
    pageTitle: 'ACWR Skaderiskmonitor',
    pageDescription: 'Övervaka träningsbelastning och förebygg skador med ACWR-zoner',
    riskZonesTitle: 'Atleter i Riskzoner',
    riskZonesDescription: 'Atleeter som behöver träningsjustering baserat på ACWR',
    detailedTitle: 'Detaljerad ACWR-analys',
    detailedDescription: '30-dagars belastningstrend med akut/kronisk ratio',
    selectAthlete: 'Välj atleet',
    selectPrompt: 'Välj en atleet för att se detaljerad ACWR-trend',
    noLoadData: 'Ingen belastningsdata tillgänglig',
    acuteVsChronic: 'Akut vs Kronisk Belastning',
    acute: 'Akut (7d)',
    chronic: 'Kronisk (28d)',
    acwrRatio: 'ACWR Ratio (Akut:Kronisk)',
    guideWhatTitle: 'Vad är ACWR?',
    guideWhatText:
      'ACWR (Acute:Chronic Workload Ratio) mäter förhållandet mellan akut belastning (senaste 7 dagarna) och kronisk belastning (senaste 28 dagarna). Detta hjälper till att identifiera skaderisker från plötsliga belastningsökningar.',
    recommendedActions: 'Rekommenderade Åtgärder',
    currentLoad: 'Optimal zon - fortsätt nuvarande belastning',
    reduce20: 'Minska belastning 20-30%',
    reduce40: 'Minska belastning 40-50% + extra vila',
    immediateRest: 'Omedelbar vila rekommenderas',
    increaseGradually: 'Öka belastning gradvis (10% per vecka)',
    acuteShort: 'Akut',
    chronicShort: 'Kronisk',
  },
}

const ZONE_CONFIG = {
  OPTIMAL: {
    label: { en: 'Optimal', sv: 'Optimal' },
    range: '0.8-1.3',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
    description: {
      en: 'Perfect balance between load and recovery',
      sv: 'Perfekt balans mellan belastning och återhämtning',
    },
  },
  CAUTION: {
    label: { en: 'Caution', sv: 'Varning' },
    range: '1.3-1.5',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: AlertTriangle,
    description: {
      en: 'Moderate risk - monitor closely',
      sv: 'Måttlig risk - övervaka noga',
    },
  },
  DANGER: {
    label: { en: 'Danger', sv: 'Fara' },
    range: '1.5-2.0',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: TrendingUp,
    description: {
      en: 'High risk - reduce load immediately',
      sv: 'Hög risk - minska belastning omedelbart',
    },
  },
  CRITICAL: {
    label: { en: 'Critical', sv: 'Kritisk' },
    range: '>2.0',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: AlertTriangle,
    description: {
      en: 'Very high risk - immediate rest recommended',
      sv: 'Mycket hög risk - omedelbar vila rekommenderas',
    },
  },
  DETRAINING: {
    label: { en: 'Detraining', sv: 'Avträning' },
    range: '<0.8',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: TrendingDown,
    description: {
      en: 'Load is too low - risk of fitness loss',
      sv: 'För låg belastning - risk för konditionsförlust',
    },
  },
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ACWRRiskMonitor() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = labels[locale]
  const dateLocale = locale === 'sv' ? sv : enUS
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const pageCtx = usePageContextOptional()

  // Fetch ACWR warnings from API
  const { data: warningsData, error } = useSWR('/api/training-load/warnings', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  })

  // Fetch all clients for dropdown (we'll need an endpoint for this or use warnings data)
  const { data: clientsData } = useSWR('/api/clients', fetcher)

  // Fetch detailed load data for selected client
  const { data: loadData } = useSWR(
    selectedClientId ? `/api/training-load/${selectedClientId}?days=30` : null,
    fetcher
  )

  const warnings: ACWRData[] = warningsData?.warnings || []

  // Get all athletes from clients data
  const allClients = clientsData?.data || []

  // Categorize athletes by ACWR zone
  const athletesByZone = {
    CRITICAL: warnings.filter(w => w.acwrZone === 'CRITICAL'),
    DANGER: warnings.filter(w => w.acwrZone === 'DANGER'),
    CAUTION: warnings.filter(w => w.acwrZone === 'CAUTION'),
    OPTIMAL: allClients.filter(
      (c: any) => !warnings.find(w => w.clientId === c.id)
    ),
    DETRAINING: [], // Would need separate endpoint for this
  }

  // Transform load data for chart
  const loadChartData: LoadDataPoint[] =
    loadData?.loads?.map((l: any) => ({
      date: format(new Date(l.date), 'dd MMM', { locale: dateLocale }),
      acuteLoad: l.acuteLoad,
      chronicLoad: l.chronicLoad,
      acwr: l.acwr,
    })) || []

  const selectedWarning = warnings.find(w => w.clientId === selectedClientId)

  // Rich page context for AI chat
  useEffect(() => {
    if (!pageCtx?.setPageContext) return
    const currentWarnings: ACWRData[] = warningsData?.warnings || []
    const currentClients = clientsData?.data || []
    const critical = currentWarnings.filter(w => w.acwrZone === 'CRITICAL').length
    const danger = currentWarnings.filter(w => w.acwrZone === 'DANGER').length
    const caution = currentWarnings.filter(w => w.acwrZone === 'CAUTION').length
    pageCtx.setPageContext({
      type: 'acwr-monitor',
      title: copy.pageTitle,
      data: {
        totalWarnings: currentWarnings.length,
        criticalCount: critical,
        dangerCount: danger,
        cautionCount: caution,
        totalAthletes: currentClients.length,
        flaggedAthletes: currentWarnings.map(w => ({ name: w.clientName, acwr: w.acwr.toFixed(2), zone: w.acwrZone })),
      },
      summary: locale === 'sv'
        ? `ACWR-monitor: ${critical} kritiska, ${danger} fara, ${caution} varning av ${currentClients.length} atleter.`
        : `ACWR monitor: ${critical} critical, ${danger} danger, ${caution} caution out of ${currentClients.length} athletes.`,
      conceptKeys: ['acwr', 'delawarePain', 'rehabPhases', 'tss'],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warningsData, clientsData, copy.pageTitle, locale])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold">{copy.pageTitle} <InfoTooltip conceptKey="acwr" /></h3>
        <p className="text-sm text-muted-foreground">
          {copy.pageDescription}
        </p>
      </div>

      {/* Risk Zone Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(ZONE_CONFIG).map(([zone, config]) => {
          const athletes = athletesByZone[zone as keyof typeof athletesByZone] || []
          const Icon = config.icon

          return (
            <Card
              key={zone}
              className={`${config.bgColor} border-l-4 ${
                athletes.length > 0 && zone !== 'OPTIMAL' ? 'shadow-md' : ''
              }`}
              style={{ borderLeftColor: config.color.replace('bg-', '#') }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                  <Badge variant="outline" className={config.textColor}>
                    {config.range}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{athletes.length}</div>
                <p className="text-sm font-medium mb-2">{config.label[locale]}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {config.description[locale]}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Athletes at Risk */}
      {(athletesByZone.CRITICAL.length > 0 ||
        athletesByZone.DANGER.length > 0 ||
        athletesByZone.CAUTION.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {copy.riskZonesTitle}
            </CardTitle>
            <CardDescription>
              {copy.riskZonesDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Critical Risk Athletes */}
              {athletesByZone.CRITICAL.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="CRITICAL" locale={locale} copy={copy} />
              ))}

              {/* Danger Athletes */}
              {athletesByZone.DANGER.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="DANGER" locale={locale} copy={copy} />
              ))}

              {/* Caution Athletes */}
              {athletesByZone.CAUTION.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="CAUTION" locale={locale} copy={copy} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed ACWR Chart for Selected Athlete */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{copy.detailedTitle}</CardTitle>
              <CardDescription>
                {copy.detailedDescription}
              </CardDescription>
            </div>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={copy.selectAthlete} />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClientId ? (
            <p className="text-center text-muted-foreground py-12">
              {copy.selectPrompt}
            </p>
          ) : loadChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {copy.noLoadData}
            </p>
          ) : (
            <div className="space-y-6">
              {/* ACWR Summary for Selected Athlete */}
              {selectedWarning && (
                <Alert variant={selectedWarning.acwrZone === 'CRITICAL' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">
                        ACWR: {selectedWarning.acwr.toFixed(2)} -{' '}
                        {ZONE_CONFIG[selectedWarning.acwrZone].label[locale]}
                      </p>
                      <p className="text-sm">
                        {ZONE_CONFIG[selectedWarning.acwrZone].description[locale]}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Load Chart - Acute vs Chronic */}
              <div>
                <h4 className="text-sm font-medium mb-3">{copy.acuteVsChronic}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={loadChartData}>
                    <defs>
                      <linearGradient id="acuteGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="chronicGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      label={{ value: 'TSS', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="acuteLoad"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#acuteGradient)"
                      name={copy.acute}
                    />
                    <Area
                      type="monotone"
                      dataKey="chronicLoad"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#chronicGradient)"
                      name={copy.chronic}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* ACWR Ratio Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">{copy.acwrRatio}</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={loadChartData}>
                    <defs>
                      <linearGradient id="optimalZone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
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
                      domain={[0, 2.5]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />

                    {/* Zone Reference Lines */}
                    <ReferenceLine y={0.8} stroke="#3b82f6" strokeDasharray="3 3" label={ZONE_CONFIG.DETRAINING.label[locale]} />
                    <ReferenceLine y={1.3} stroke="#eab308" strokeDasharray="3 3" label={ZONE_CONFIG.CAUTION.label[locale]} />
                    <ReferenceLine y={1.5} stroke="#f97316" strokeDasharray="3 3" label={ZONE_CONFIG.DANGER.label[locale]} />
                    <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={ZONE_CONFIG.CRITICAL.label[locale]} />

                    {/* Optimal Zone Shading (0.8-1.3) */}
                    <Area
                      type="monotone"
                      dataKey={() => 1.3}
                      stroke="none"
                      fill="url(#optimalZone)"
                      fillOpacity={0.3}
                    />

                    {/* ACWR Line */}
                    <Line
                      type="monotone"
                      dataKey="acwr"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 4 }}
                      name="ACWR"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACWR Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ACWR Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">{copy.guideWhatTitle}</h4>
              <p className="text-sm text-muted-foreground">
                {copy.guideWhatText}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{copy.recommendedActions}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>ACWR 0.8-1.3:</strong> {copy.currentLoad}</li>
                <li>• <strong>ACWR 1.3-1.5:</strong> {copy.reduce20}</li>
                <li>• <strong>ACWR 1.5-2.0:</strong> {copy.reduce40}</li>
                <li>• <strong>ACWR &gt;2.0:</strong> {copy.immediateRest}</li>
                <li>• <strong>ACWR &lt;0.8:</strong> {copy.increaseGradually}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Individual Athlete Risk Card
 */
function AthleteRiskCard({
  athlete,
  severity,
  locale,
  copy,
}: {
  athlete: ACWRData
  severity: 'CRITICAL' | 'DANGER' | 'CAUTION'
  locale: AppLocale
  copy: typeof labels[AppLocale]
}) {
  const config = ZONE_CONFIG[severity]
  const Icon = config.icon

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${config.bgColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${config.color.replace('500', '100')}`}>
          <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <p className="font-semibold">{athlete.clientName}</p>
          <p className="text-sm text-muted-foreground">
            ACWR: <span className="font-medium">{athlete.acwr.toFixed(2)}</span> · {copy.acuteShort}:{' '}
            {athlete.acuteLoad.toFixed(0)} TSS · {copy.chronicShort}: {athlete.chronicLoad.toFixed(0)} TSS
          </p>
        </div>
      </div>

      <Badge variant={severity === 'CRITICAL' ? 'destructive' : 'default'}>
        {config.label[locale]}
      </Badge>
    </div>
  )
}
