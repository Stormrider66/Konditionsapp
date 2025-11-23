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

import { useState } from 'react'
import useSWR from 'swr'
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
import { sv } from 'date-fns/locale'

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

const ZONE_CONFIG = {
  OPTIMAL: {
    label: 'Optimal',
    range: '0.8-1.3',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
    description: 'Perfekt balans mellan belastning och återhämtning',
  },
  CAUTION: {
    label: 'Varning',
    range: '1.3-1.5',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: AlertTriangle,
    description: 'Måttlig risk - övervaka noga',
  },
  DANGER: {
    label: 'Fara',
    range: '1.5-2.0',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: TrendingUp,
    description: 'Hög risk - minska belastning omedelbart',
  },
  CRITICAL: {
    label: 'Kritisk',
    range: '>2.0',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: AlertTriangle,
    description: 'Mycket hög risk - omedelbar vila rekommenderas',
  },
  DETRAINING: {
    label: 'Avträning',
    range: '<0.8',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: TrendingDown,
    description: 'För låg belastning - risk för konditionsförlust',
  },
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ACWRRiskMonitor() {
  const [selectedClientId, setSelectedClientId] = useState<string>('')

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
  const allClients = clientsData?.clients || []

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
      date: format(new Date(l.date), 'dd MMM', { locale: sv }),
      acuteLoad: l.acuteLoad,
      chronicLoad: l.chronicLoad,
      acwr: l.acwr,
    })) || []

  const selectedWarning = warnings.find(w => w.clientId === selectedClientId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold">ACWR Skaderiskmonitor</h3>
        <p className="text-sm text-muted-foreground">
          Övervaka träningsbelastning och förebygg skador med ACWR-zoner
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
                <p className="text-sm font-medium mb-2">{config.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {config.description}
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
              Atleter i Riskzoner
            </CardTitle>
            <CardDescription>
              Atleeter som behöver träningsjustering baserat på ACWR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Critical Risk Athletes */}
              {athletesByZone.CRITICAL.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="CRITICAL" />
              ))}

              {/* Danger Athletes */}
              {athletesByZone.DANGER.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="DANGER" />
              ))}

              {/* Caution Athletes */}
              {athletesByZone.CAUTION.map(athlete => (
                <AthleteRiskCard key={athlete.clientId} athlete={athlete} severity="CAUTION" />
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
              <CardTitle>Detaljerad ACWR-analys</CardTitle>
              <CardDescription>
                30-dagars belastningstrend med akut/kronisk ratio
              </CardDescription>
            </div>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Välj atleet" />
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
              Välj en atleet för att se detaljerad ACWR-trend
            </p>
          ) : loadChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Ingen belastningsdata tillgänglig
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
                        {ZONE_CONFIG[selectedWarning.acwrZone].label}
                      </p>
                      <p className="text-sm">
                        {ZONE_CONFIG[selectedWarning.acwrZone].description}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Load Chart - Acute vs Chronic */}
              <div>
                <h4 className="text-sm font-medium mb-3">Akut vs Kronisk Belastning</h4>
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
                      name="Akut (7d)"
                    />
                    <Area
                      type="monotone"
                      dataKey="chronicLoad"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#chronicGradient)"
                      name="Kronisk (28d)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* ACWR Ratio Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">ACWR Ratio (Akut:Kronisk)</h4>
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
                    <ReferenceLine y={0.8} stroke="#3b82f6" strokeDasharray="3 3" label="Avträning" />
                    <ReferenceLine y={1.3} stroke="#eab308" strokeDasharray="3 3" label="Varning" />
                    <ReferenceLine y={1.5} stroke="#f97316" strokeDasharray="3 3" label="Fara" />
                    <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label="Kritisk" />

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
              <h4 className="font-semibold mb-2">Vad är ACWR?</h4>
              <p className="text-sm text-muted-foreground">
                ACWR (Acute:Chronic Workload Ratio) mäter förhållandet mellan akut belastning
                (senaste 7 dagarna) och kronisk belastning (senaste 28 dagarna). Detta hjälper
                till att identifiera skaderisker från plötsliga belastningsökningar.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Rekommenderade Åtgärder</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>ACWR 0.8-1.3:</strong> Optimal zon - fortsätt nuvarande belastning</li>
                <li>• <strong>ACWR 1.3-1.5:</strong> Minska belastning 20-30%</li>
                <li>• <strong>ACWR 1.5-2.0:</strong> Minska belastning 40-50% + extra vila</li>
                <li>• <strong>ACWR &gt;2.0:</strong> Omedelbar vila rekommenderas</li>
                <li>• <strong>ACWR &lt;0.8:</strong> Öka belastning gradvis (10% per vecka)</li>
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
}: {
  athlete: ACWRData
  severity: 'CRITICAL' | 'DANGER' | 'CAUTION'
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
            ACWR: <span className="font-medium">{athlete.acwr.toFixed(2)}</span> · Akut:{' '}
            {athlete.acuteLoad.toFixed(0)} TSS · Kronisk: {athlete.chronicLoad.toFixed(0)} TSS
          </p>
        </div>
      </div>

      <Badge variant={severity === 'CRITICAL' ? 'destructive' : 'default'}>
        {config.label}
      </Badge>
    </div>
  )
}
