'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Timer, Zap, ArrowUpDown, ChevronDown, ChevronUp, Dumbbell, Activity, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildRepeatedSprintProfile } from '@/lib/hockey/ice-speed'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Team {
  id: string
  name: string
}

interface HockeyTest {
  id: string
  testDate: string
  notes: string | null
  client: { id: string; name: string }
  team: { id: string; name: string } | null
  agility505Left: number | null
  agility505Right: number | null
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  sprint20mFly: number | null
  sprint30mFly: number | null
  endurance7x40: number[] | null
  jumpSquatLadder: Record<string, number> | null
  singleLegJumpLeft: Record<string, number> | null
  singleLegJumpRight: Record<string, number> | null
  gripStrengthLeft: number | null
  gripStrengthRight: number | null
  standingLongJump: number | null
  threeJumpLeft: number | null
  threeJumpRight: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  wingate30sAveragePower: number | null
  vo2Max: number | null
  lt1SpeedKmh: number | null
  lt1HeartRate: number | null
  lt1Lactate: number | null
  lt2SpeedKmh: number | null
  lt2HeartRate: number | null
  lt2Lactate: number | null
  maxLactate: number | null
  maxHeartRate: number | null
  rampTimeSeconds: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabJumps: Array<{
    externalLoadKg: number | null
    averagePowerW: number | null
    averageVelocityMs: number | null
    averageForceN: number | null
    displacementCm: number | null
  }> | null
  muscleLabMaxima: {
    maxAveragePowerW?: number | null
    maxAveragePowerPerBodyMass?: number | null
    powerPlateauLoadsKg?: number[]
    displacementDropPercent?: number | null
    rawDiagnostics?: {
      traceCount: number
      totalSamples: number
      maxPeakVelocityMs: number | null
      maxPeakForceN: number | null
      maxPeakPowerW: number | null
      flags: string[]
    } | null
    flags?: string[]
  } | null
  muscleLabRaw: {
    traces: Array<{
      traceId: string
      label: string
      sampleCount: number
      peakVelocityMs: number | null
      peakForceN: number | null
      peakPowerW: number | null
      samples: Array<{
        t: number
        velocityMs?: number | null
        forceN?: number | null
        powerW?: number | null
      }>
    }>
    diagnostics: {
      traceCount: number
      totalSamples: number
      maxPeakVelocityMs: number | null
      maxPeakForceN: number | null
      maxPeakPowerW: number | null
      flags: string[]
    } | null
  } | null
  aerobicAutoLinked?: boolean
  aerobicAutoLinkSource?: string | null
  aerobicAutoLinkDate?: string | null
}

interface HockeyTestResultsProps {
  teams: Team[]
  businessSlug?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function aerobicSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case 'lab-test':
      return 'labbtest'
    case 'athlete-profile':
      return 'profil'
    case 'manual-profile':
      return 'manuell profil'
    default:
      return 'profil/labb'
  }
}

function TestValue({ label, value, unit, highlight, decimals = 2 }: {
  label: string
  value: number | null | undefined
  unit: string
  highlight?: boolean
  decimals?: number
}) {
  if (value == null) return null
  return (
    <div className={cn('text-center', highlight && 'text-green-600 font-semibold')}>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-sm font-medium">{typeof value === 'number' ? value.toFixed(decimals) : value}</p>
      <p className="text-[9px] text-muted-foreground">{unit}</p>
    </div>
  )
}

function bestOf(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  return valid.length > 0 ? Math.max(...valid) : null
}

function percentDifference(left: number | null | undefined, right: number | null | undefined): number | null {
  if (left == null || right == null) return null
  const best = Math.max(left, right)
  if (best <= 0) return null
  return Math.abs(left - right) / best * 100
}

function enduranceStats(values: number[] | null) {
  return buildRepeatedSprintProfile(values ?? [])
}

function formatRampTime(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function MuscleLabChart({ test }: { test: HockeyTest }) {
  const rows = test.muscleLabJumps || []
  const rawTrace = test.muscleLabRaw?.traces?.[0]
  if (rows.length === 0 && !rawTrace) return null
  const chartData = rows
    .filter((row) => row.externalLoadKg != null)
    .map((row) => ({
      load: row.externalLoadKg,
      AP: row.averagePowerW,
      AV: row.averageVelocityMs,
    }))
  const rawChartData = rawTrace?.samples.map((sample) => ({
    t: sample.t,
    power: sample.powerW,
    velocity: sample.velocityMs,
  })) ?? []

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-1.5">
        {test.muscleLabMaxima?.maxAveragePowerW ? (
          <Badge variant="secondary" className="text-[10px]">
            AP {test.muscleLabMaxima.maxAveragePowerW} W
          </Badge>
        ) : null}
        {test.muscleLabMaxima?.maxAveragePowerPerBodyMass ? (
          <Badge variant="secondary" className="text-[10px]">
            {test.muscleLabMaxima.maxAveragePowerPerBodyMass} W/kg
          </Badge>
        ) : null}
        {test.muscleLabMaxima?.powerPlateauLoadsKg?.length ? (
          <Badge variant="outline" className="text-[10px]">
            Platå +{test.muscleLabMaxima.powerPlateauLoadsKg.join('/+')} kg
          </Badge>
        ) : null}
        {test.muscleLabMaxima?.displacementDropPercent ? (
          <Badge variant="outline" className="text-[10px]">
            ROM -{test.muscleLabMaxima.displacementDropPercent}%
          </Badge>
        ) : null}
        {test.muscleLabRaw?.diagnostics?.traceCount ? (
          <Badge variant="outline" className="text-[10px]">
            {test.muscleLabRaw.diagnostics.traceCount} råkurva
          </Badge>
        ) : null}
        {test.muscleLabRaw?.diagnostics?.maxPeakPowerW ? (
          <Badge variant="outline" className="text-[10px]">
            pP {test.muscleLabRaw.diagnostics.maxPeakPowerW} W
          </Badge>
        ) : null}
      </div>
      {chartData.length > 0 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="load" tick={{ fontSize: 10 }} unit="kg" />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={38} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="AP" name="AP W" stroke="#2563eb" strokeWidth={2} dot />
              <Line yAxisId="right" type="monotone" dataKey="AV" name="AV m/s" stroke="#16a34a" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {rawTrace && rawChartData.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground">{rawTrace.label}</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rawChartData} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={38} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={32} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="power" name="Power W" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="velocity" name="Velocity m/s" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {[...(test.muscleLabMaxima?.flags ?? []), ...(test.muscleLabRaw?.diagnostics?.flags ?? [])].map((flag) => (
        <p key={flag} className="text-[10px] text-amber-700 dark:text-amber-300">{flag}</p>
      ))}
    </div>
  )
}

export function HockeyTestResults({ teams, businessSlug }: HockeyTestResultsProps) {
  const [tests, setTests] = useState<HockeyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTests = async () => {
      const params = new URLSearchParams()
      if (teamFilter !== 'all') params.set('teamId', teamFilter)
      setLoading(true)
      try {
        const res = await fetch(`/api/coach/hockey-tests?${params}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : undefined,
        })
        if (res.ok) {
          const data = await res.json()
          setTests(data.tests || [])
        }
      } catch {
        toast.error('Kunde inte hämta tester')
      } finally {
        setLoading(false)
      }
    }
    void fetchTests()
  }, [businessSlug, teamFilter])

  const handleExportPDF = async (test: HockeyTest) => {
    setExportingId(test.id)
    try {
      const { downloadHockeyTestReportPDF } = await import('@/lib/exports/hockey-test-report-export')
      downloadHockeyTestReportPDF(test)
      toast.success('PDF exporterad')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte exportera PDF')
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Select value={teamFilter} onValueChange={setTeamFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Alla spelare" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla spelare</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Inga testresultat hittades</div>
      ) : (
        tests.map((test) => {
          const isExpanded = expandedId === test.id
          const endurance = test.endurance7x40 as number[] | null
          const enduranceSummary = enduranceStats(endurance)
          const gripAsymmetry = percentDifference(test.gripStrengthLeft, test.gripStrengthRight)
          const threeJumpAsymmetry = percentDifference(test.threeJumpLeft, test.threeJumpRight)
          const bestThreeJump = bestOf([test.threeJumpLeft, test.threeJumpRight])
          return (
            <Card key={test.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : test.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{test.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(test.testDate)}
                      {test.team && ` · ${test.team.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.muscleLabMaxima?.maxAveragePowerPerBodyMass && (
                      <Badge variant="outline" className="text-[10px]">{test.muscleLabMaxima.maxAveragePowerPerBodyMass} W/kg</Badge>
                    )}
                    {test.sprint5m && <Badge variant="outline" className="text-[10px]">{test.sprint5m.toFixed(2)}s 5m</Badge>}
                    {test.sprint10m && <Badge variant="outline" className="text-[10px]">{test.sprint10m.toFixed(2)}s 10m</Badge>}
                    {test.agility505Left && <Badge variant="outline" className="text-[10px]">{test.agility505Left.toFixed(2)}s agility</Badge>}
                    {enduranceSummary.fatigueDropPct != null && (
                      <Badge variant={enduranceSummary.fatigueDropPct >= 6 ? 'destructive' : 'secondary'} className="text-[10px]">
                        7x40 drop {enduranceSummary.fatigueDropPct.toFixed(1)}%
                      </Badge>
                    )}
                    {enduranceSummary.averageSpeedKmh != null && (
                      <Badge variant="outline" className="text-[10px]">
                        RSA {enduranceSummary.averageSpeedKmh.toFixed(1)} km/h
                      </Badge>
                    )}
                    {test.vo2Max != null && <Badge variant="outline" className="text-[10px]">{test.vo2Max.toFixed(1)} VO2</Badge>}
                    {isExpanded && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs"
                        disabled={exportingId === test.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleExportPDF(test)
                        }}
                      >
                        {exportingId === test.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Ice tests */}
                    {(test.agility505Left || test.sprint5m || test.sprint10m || test.sprint20m || test.sprint30m || endurance) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Timer className="h-3 w-3" /> Istester</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          <TestValue label="Agility V" value={test.agility505Left} unit="s" />
                          <TestValue label="Agility H" value={test.agility505Right} unit="s" />
                          <TestValue label="5m" value={test.sprint5m} unit="s" />
                          <TestValue label="10m" value={test.sprint10m} unit="s" />
                          <TestValue label="20m" value={test.sprint20m} unit="s" />
                          <TestValue label="30m" value={test.sprint30m} unit="s" />
                          <TestValue label="20m fly" value={test.sprint20mFly} unit="s" />
                          <TestValue label="30m fly" value={test.sprint30mFly} unit="s" />
                        </div>
                        {endurance && endurance.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-muted-foreground mb-1">
                              7x40m:
                              {enduranceSummary.bestTimeS != null && ` bästa ${enduranceSummary.bestTimeS.toFixed(2)}s`}
                              {enduranceSummary.averageTimeS != null && ` · snitt ${enduranceSummary.averageTimeS.toFixed(2)}s`}
                              {enduranceSummary.averageSpeedKmh != null && ` · ${enduranceSummary.averageSpeedKmh.toFixed(1)} km/h`}
                              {enduranceSummary.fatigueDropPct != null && ` · drop ${enduranceSummary.fatigueDropPct.toFixed(1)}%`}
                              {enduranceSummary.fatigueResistancePct != null && ` · resistance ${enduranceSummary.fatigueResistancePct.toFixed(0)}%`}
                            </p>
                            <div className="flex gap-1.5">
                              {endurance.map((t, i) => (
                                <span key={i} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {t.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Power tests */}
                    {(test.jumpSquatLadder || test.gripStrengthLeft || test.muscleLabJumps || test.muscleLabRaw) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> Krafttester</p>
                        <MuscleLabChart test={test} />
                        {test.jumpSquatLadder && (
                          <div className="mb-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Loaded squat jump / power squat:</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {Object.entries(test.jumpSquatLadder).map(([kg, w]) => (
                                <span key={kg} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                  +{kg}kg: {w}W
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <TestValue label="Grepp V" value={test.gripStrengthLeft} unit="kg" />
                          <TestValue label="Grepp H" value={test.gripStrengthRight} unit="kg" />
                        </div>
                        {gripAsymmetry != null && (
                          <p className={cn('mt-2 text-[10px]', gripAsymmetry >= 10 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                            Grepp asymmetri {gripAsymmetry.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    )}

                    {/* Strength tests */}
                    {(test.backSquat1RM || test.powerClean1RM || test.benchPress1RM || test.pullUp1RM) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Maxstyrka</p>
                        <div className="grid grid-cols-4 gap-2">
                          <TestValue label="Knäböj" value={test.backSquat1RM} unit="kg" />
                          <TestValue label="Power clean" value={test.powerClean1RM} unit="kg" />
                          <TestValue label="Bänkpress" value={test.benchPress1RM} unit="kg" />
                          <TestValue label="Pull-up 1RM" value={test.pullUp1RM} unit="kg" />
                        </div>
                      </div>
                    )}

                    {/* Jump tests */}
                    {(test.standingLongJump || test.threeJumpLeft) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Hopp</p>
                        <div className="grid grid-cols-3 gap-2">
                          <TestValue label="Längdhopp" value={test.standingLongJump} unit="cm" />
                          <TestValue label="3-hopp V" value={test.threeJumpLeft} unit="cm" />
                          <TestValue label="3-hopp H" value={test.threeJumpRight} unit="cm" />
                        </div>
                        {(bestThreeJump != null || threeJumpAsymmetry != null) && (
                          <p className={cn('mt-2 text-[10px]', threeJumpAsymmetry != null && threeJumpAsymmetry >= 8 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                            {bestThreeJump != null && `Bästa 3-steg ${bestThreeJump.toFixed(0)} cm`}
                            {threeJumpAsymmetry != null && ` · asymmetri ${threeJumpAsymmetry.toFixed(1)}%`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Endurance tests */}
                    {(test.beepTestLevel || endurance || test.wingate30sAveragePower || test.vo2Max || test.lt1SpeedKmh || test.lt2SpeedKmh) && (
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Uthållighet</p>
                          {test.aerobicAutoLinked && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
                              Länkat från {aerobicSourceLabel(test.aerobicAutoLinkSource)}
                              {test.aerobicAutoLinkDate ? ` ${test.aerobicAutoLinkDate}` : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <TestValue label="Beep nivå" value={test.beepTestLevel} unit="" decimals={1} />
                          <TestValue label="Beep shuttle" value={test.beepTestShuttle} unit="" decimals={0} />
                          <TestValue label="Wingate 30 s" value={test.wingate30sAveragePower} unit="W" decimals={0} />
                          <TestValue label="VO2max" value={test.vo2Max} unit="ml/kg/min" decimals={1} />
                          <TestValue label="Maxpuls" value={test.maxHeartRate} unit="bpm" decimals={0} />
                          <TestValue label="Max laktat" value={test.maxLactate} unit="mmol/L" decimals={1} />
                          <TestValue label="LT1 fart" value={test.lt1SpeedKmh} unit="km/h" decimals={1} />
                          <TestValue label="LT1 puls" value={test.lt1HeartRate} unit="bpm" decimals={0} />
                          <TestValue label="LT1 laktat" value={test.lt1Lactate} unit="mmol/L" decimals={1} />
                          <TestValue label="LT2 fart" value={test.lt2SpeedKmh} unit="km/h" decimals={1} />
                          <TestValue label="LT2 puls" value={test.lt2HeartRate} unit="bpm" decimals={0} />
                          <TestValue label="LT2 laktat" value={test.lt2Lactate} unit="mmol/L" decimals={1} />
                        </div>
                        {formatRampTime(test.rampTimeSeconds) && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Ramptid till avslut: {formatRampTime(test.rampTimeSeconds)}
                          </p>
                        )}
                      </div>
                    )}

                    {test.notes && (
                      <p className="text-xs text-muted-foreground italic">{test.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
