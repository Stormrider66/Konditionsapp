'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, Info, AlertCircle } from 'lucide-react'

interface HistoricalTrendingChartProps {
  clientId: string
  clientName: string
}

interface TrendingDataPoint {
  date: Date
  dateString: string // For chart display
  vdot?: number
  marathonPaceKmh?: number
  marathonPaceMinKm?: string
  thresholdPaceKmh?: number
  thresholdPaceMinKm?: string
  vo2max?: number
  lt2Lactate?: number
  source: 'RACE' | 'LACTATE_TEST' | 'VO2MAX_TEST'
  sourceDetail: string // e.g., "Half Marathon 1:28:00"
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
}

interface TrendingStats {
  vdotChange?: number
  vdotChangePercent?: number
  marathonPaceChange?: number
  vo2maxChange?: number
  dataPoints: number
  firstDate?: Date
  lastDate?: Date
}

type TimeRange = '3months' | '6months' | '1year' | 'all'

export function HistoricalTrendingChart({ clientId, clientName }: HistoricalTrendingChartProps) {
  const [data, setData] = useState<TrendingDataPoint[]>([])
  const [stats, setStats] = useState<TrendingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('1year')

  useEffect(() => {
    fetchHistoricalData()
  }, [clientId])

  const fetchHistoricalData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch race results
      const raceResponse = await fetch(`/api/clients/${clientId}/races`)
      const races = raceResponse.ok ? await raceResponse.json() : []

      // Fetch lactate tests (from Test model with lactate data)
      const testResponse = await fetch(`/api/clients/${clientId}/tests`)
      const tests = testResponse.ok ? await testResponse.json() : []

      // Process race results into data points
      const raceDataPoints: TrendingDataPoint[] = races
        .filter((race: any) => race.vdot) // Only races with VDOT calculated
        .map((race: any) => {
          const vdot = race.vdot

          // Calculate paces from VDOT using Jack Daniels formulas
          const marathonPaceKmh = calculateMarathonPaceFromVDOT(vdot)
          const thresholdPaceKmh = calculateThresholdPaceFromVDOT(vdot)

          return {
            date: new Date(race.raceDate),
            dateString: new Date(race.raceDate).toLocaleDateString('sv-SE'),
            vdot,
            marathonPaceKmh,
            marathonPaceMinKm: speedToPace(marathonPaceKmh),
            thresholdPaceKmh,
            thresholdPaceMinKm: speedToPace(thresholdPaceKmh),
            source: 'RACE' as const,
            sourceDetail: `${race.distance} - ${formatTime(race.finishTime)}`,
            confidence: race.conditions === 'IDEAL' ? 'VERY_HIGH' :
                       race.conditions === 'GOOD' ? 'HIGH' : 'MEDIUM',
          }
        })

      // Process lactate tests into data points
      const lactateDataPoints: TrendingDataPoint[] = tests
        .filter((test: any) => test.anaerobicThreshold && test.testStages?.length > 0)
        .map((test: any) => {
          // Get LT2 data from anaerobic threshold
          const lt2Stage = test.testStages.find(
            (stage: any) => stage.sequence === test.anaerobicThreshold?.sequence
          )

          // Calculate threshold pace from LT2
          const thresholdPaceKmh = lt2Stage?.speed || 0

          // Estimate VDOT from threshold pace (reverse calculation)
          const estimatedVdot = estimateVDOTFromThresholdPace(thresholdPaceKmh)

          // Calculate marathon pace from estimated VDOT
          const marathonPaceKmh = calculateMarathonPaceFromVDOT(estimatedVdot)

          return {
            date: new Date(test.testDate),
            dateString: new Date(test.testDate).toLocaleDateString('sv-SE'),
            vdot: estimatedVdot,
            marathonPaceKmh,
            marathonPaceMinKm: speedToPace(marathonPaceKmh),
            thresholdPaceKmh,
            thresholdPaceMinKm: speedToPace(thresholdPaceKmh),
            lt2Lactate: lt2Stage?.lactate,
            vo2max: test.vo2max,
            source: 'LACTATE_TEST' as const,
            sourceDetail: `Lactate Test - LT2 at ${lt2Stage?.lactate?.toFixed(1)} mmol/L`,
            confidence: 'HIGH' as const,
          }
        })

      // Process VO2max tests (tests without lactate but with VO2max)
      const vo2maxDataPoints: TrendingDataPoint[] = tests
        .filter((test: any) => test.vo2max && !test.anaerobicThreshold)
        .map((test: any) => {
          // Estimate VDOT from VO2max (simplified approximation)
          const estimatedVdot = test.vo2max * 0.95 // Rough conversion

          return {
            date: new Date(test.testDate),
            dateString: new Date(test.testDate).toLocaleDateString('sv-SE'),
            vdot: estimatedVdot,
            vo2max: test.vo2max,
            source: 'VO2MAX_TEST' as const,
            sourceDetail: `VO2max Test - ${test.vo2max} ml/kg/min`,
            confidence: 'MEDIUM' as const,
          }
        })

      // Combine all data points and sort by date
      const allDataPoints = [...raceDataPoints, ...lactateDataPoints, ...vo2maxDataPoints]
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      setData(allDataPoints)

      // Calculate statistics
      if (allDataPoints.length >= 2) {
        const first = allDataPoints[0]
        const last = allDataPoints[allDataPoints.length - 1]

        const vdotChange = last.vdot && first.vdot ? last.vdot - first.vdot : undefined
        const vdotChangePercent = vdotChange && first.vdot
          ? (vdotChange / first.vdot) * 100
          : undefined

        const marathonPaceChange = last.marathonPaceKmh && first.marathonPaceKmh
          ? last.marathonPaceKmh - first.marathonPaceKmh
          : undefined

        const vo2maxChange = last.vo2max && first.vo2max
          ? last.vo2max - first.vo2max
          : undefined

        setStats({
          vdotChange,
          vdotChangePercent,
          marathonPaceChange,
          vo2maxChange,
          dataPoints: allDataPoints.length,
          firstDate: first.date,
          lastDate: last.date,
        })
      }
    } catch (err) {
      console.error('Error fetching historical data:', err)
      setError('Failed to load historical data')
    } finally {
      setLoading(false)
    }
  }

  // Filter data by time range
  const getFilteredData = () => {
    if (timeRange === 'all') return data

    const now = new Date()
    const cutoffDate = new Date()

    switch (timeRange) {
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
    }

    return data.filter(d => d.date >= cutoffDate)
  }

  const filteredData = getFilteredData()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload as TrendingDataPoint

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-sm mb-1">{data.dateString}</p>
        <p className="text-xs text-gray-600 mb-2">{data.sourceDetail}</p>
        {data.vdot && (
          <p className="text-sm">
            <span className="font-medium">VDOT:</span> {data.vdot.toFixed(1)}
          </p>
        )}
        {data.marathonPaceMinKm && (
          <p className="text-sm">
            <span className="font-medium">Marathon Pace:</span> {data.marathonPaceMinKm}
          </p>
        )}
        {data.thresholdPaceMinKm && (
          <p className="text-sm">
            <span className="font-medium">Threshold Pace:</span> {data.thresholdPaceMinKm}
          </p>
        )}
        {data.vo2max && (
          <p className="text-sm">
            <span className="font-medium">VO2max:</span> {data.vo2max.toFixed(1)} ml/kg/min
          </p>
        )}
        {data.lt2Lactate && (
          <p className="text-sm">
            <span className="font-medium">LT2 Lactate:</span> {data.lt2Lactate.toFixed(1)} mmol/L
          </p>
        )}
        <Badge className="mt-2" variant={
          data.confidence === 'VERY_HIGH' ? 'default' :
          data.confidence === 'HIGH' ? 'secondary' : 'outline'
        }>
          {data.source}
        </Badge>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Progression</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Progression</CardTitle>
          <CardDescription>Athlete: {clientName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No historical data available. Add race results or complete lactate tests to see progression over time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Data Points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dataPoints || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.filter(d => d.source === 'RACE').length} races, {' '}
              {filteredData.filter(d => d.source === 'LACTATE_TEST').length} lactate tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>VDOT Change</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.vdotChange !== undefined ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {stats.vdotChange > 0 ? '+' : ''}{stats.vdotChange.toFixed(1)}
                  </div>
                  {stats.vdotChange > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.vdotChangePercent && stats.vdotChangePercent > 0 ? '+' : ''}
                  {stats.vdotChangePercent?.toFixed(1)}% since {stats.firstDate?.toLocaleDateString('sv-SE')}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Marathon Pace Change</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.marathonPaceChange !== undefined ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {stats.marathonPaceChange > 0 ? '+' : ''}
                    {formatPaceChange(stats.marathonPaceChange)}
                  </div>
                  {stats.marathonPaceChange > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : stats.marathonPaceChange < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faster is better (positive change = faster)
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>VO2max Change</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.vo2maxChange !== undefined ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {stats.vo2maxChange > 0 ? '+' : ''}{stats.vo2maxChange.toFixed(1)}
                  </div>
                  {stats.vo2maxChange > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ml/kg/min</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historical Progression</CardTitle>
              <CardDescription>Athlete: {clientName}</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="vdot" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vdot">VDOT</TabsTrigger>
              <TabsTrigger value="marathon">Marathon Pace</TabsTrigger>
              <TabsTrigger value="threshold">Threshold Pace</TabsTrigger>
              <TabsTrigger value="vo2max">VO2max</TabsTrigger>
            </TabsList>

            {/* VDOT Chart */}
            <TabsContent value="vdot" className="space-y-4">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateString"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: 'VDOT', angle: -90, position: 'insideLeft' }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="vdot"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="VDOT"
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      const color = payload.source === 'RACE' ? '#10b981' :
                                   payload.source === 'LACTATE_TEST' ? '#f59e0b' : '#6b7280'
                      return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Race Result</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span>Lactate Test</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span>VO2max Test</span>
                </div>
              </div>
            </TabsContent>

            {/* Marathon Pace Chart */}
            <TabsContent value="marathon" className="space-y-4">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredData.filter(d => d.marathonPaceKmh)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateString"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: 'Marathon Pace (km/h)', angle: -90, position: 'insideLeft' }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="marathonPaceKmh"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Marathon Pace (km/h)"
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      const color = payload.source === 'RACE' ? '#10b981' : '#f59e0b'
                      return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground">
                Higher pace (km/h) = faster marathon time. Trend line shows improvement over time.
              </p>
            </TabsContent>

            {/* Threshold Pace Chart */}
            <TabsContent value="threshold" className="space-y-4">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredData.filter(d => d.thresholdPaceKmh)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateString"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: 'Threshold Pace (km/h)', angle: -90, position: 'insideLeft' }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="thresholdPaceKmh"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Threshold Pace (km/h)"
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      const color = payload.source === 'RACE' ? '#10b981' : '#f59e0b'
                      return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground">
                Threshold pace (LT2) - critical for tempo runs and threshold intervals.
              </p>
            </TabsContent>

            {/* VO2max Chart */}
            <TabsContent value="vo2max" className="space-y-4">
              {filteredData.filter(d => d.vo2max).length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={filteredData.filter(d => d.vo2max)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateString"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        label={{ value: 'VO2max (ml/kg/min)', angle: -90, position: 'insideLeft' }}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="vo2max"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="VO2max"
                        dot={{ r: 5, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-muted-foreground">
                    VO2max progression from laboratory tests. Higher values indicate better aerobic capacity.
                  </p>
                </>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No VO2max data available. Complete laboratory tests to track VO2max progression.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Data Points</CardTitle>
          <CardDescription>Detailed view of all tests and races</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-right p-2">VDOT</th>
                  <th className="text-right p-2">Marathon Pace</th>
                  <th className="text-right p-2">Threshold Pace</th>
                  <th className="text-right p-2">VO2max</th>
                  <th className="text-center p-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice().reverse().map((point, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{point.dateString}</td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-xs">{point.source}</div>
                        <div className="text-xs text-gray-500">{point.sourceDetail}</div>
                      </div>
                    </td>
                    <td className="text-right p-2">
                      {point.vdot ? point.vdot.toFixed(1) : '-'}
                    </td>
                    <td className="text-right p-2">
                      {point.marathonPaceMinKm || '-'}
                    </td>
                    <td className="text-right p-2">
                      {point.thresholdPaceMinKm || '-'}
                    </td>
                    <td className="text-right p-2">
                      {point.vo2max ? point.vo2max.toFixed(1) : '-'}
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={
                        point.confidence === 'VERY_HIGH' ? 'default' :
                        point.confidence === 'HIGH' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {point.confidence}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions

function calculateMarathonPaceFromVDOT(vdot: number): number {
  // Jack Daniels formula: Marathon pace ≈ 0.926 × VO2 at marathon effort
  // Simplified: Marathon km/h = VDOT × 0.210
  return vdot * 0.210
}

function calculateThresholdPaceFromVDOT(vdot: number): number {
  // Jack Daniels formula: Threshold pace ≈ 88-90% of VO2max
  // Simplified: Threshold km/h = VDOT × 0.235
  return vdot * 0.235
}

function estimateVDOTFromThresholdPace(thresholdKmh: number): number {
  // Reverse calculation: VDOT ≈ Threshold pace / 0.235
  return thresholdKmh / 0.235
}

function speedToPace(kmh: number): string {
  if (!kmh || kmh === 0) return '0:00/km'
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function formatPaceChange(kmhChange: number): string {
  // Convert km/h change to min/km change (more intuitive)
  // Positive kmhChange = faster = better
  const secPerKmChange = Math.abs((60 / (13.5 + kmhChange)) - (60 / 13.5)) * 60
  return `${Math.floor(secPerKmChange)}s/km`
}
