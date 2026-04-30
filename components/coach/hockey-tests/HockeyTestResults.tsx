'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Timer, Zap, ArrowUpDown, ChevronDown, ChevronUp, Dumbbell, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  sprint10m: number | null
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
    flags?: string[]
  } | null
}

interface HockeyTestResultsProps {
  teams: Team[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TestValue({ label, value, unit, highlight }: { label: string; value: number | null | undefined; unit: string; highlight?: boolean }) {
  if (value == null) return null
  return (
    <div className={cn('text-center', highlight && 'text-green-600 font-semibold')}>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-sm font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</p>
      <p className="text-[9px] text-muted-foreground">{unit}</p>
    </div>
  )
}

function MuscleLabChart({ test }: { test: HockeyTest }) {
  const rows = test.muscleLabJumps || []
  if (rows.length === 0) return null
  const chartData = rows
    .filter((row) => row.externalLoadKg != null)
    .map((row) => ({
      load: row.externalLoadKg,
      AP: row.averagePowerW,
      AV: row.averageVelocityMs,
    }))

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
      </div>
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
      {test.muscleLabMaxima?.flags?.map((flag) => (
        <p key={flag} className="text-[10px] text-amber-700 dark:text-amber-300">{flag}</p>
      ))}
    </div>
  )
}

export function HockeyTestResults({ teams }: HockeyTestResultsProps) {
  const [tests, setTests] = useState<HockeyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTests = async () => {
      const params = new URLSearchParams()
      if (teamFilter !== 'all') params.set('teamId', teamFilter)
      setLoading(true)
      try {
        const res = await fetch(`/api/coach/hockey-tests?${params}`)
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
  }, [teamFilter])

  return (
    <div className="space-y-4">
      <Select value={teamFilter} onValueChange={setTeamFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Alla lag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla lag</SelectItem>
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
                    {test.sprint10m && <Badge variant="outline" className="text-[10px]">{test.sprint10m.toFixed(2)}s 10m</Badge>}
                    {test.agility505Left && <Badge variant="outline" className="text-[10px]">{test.agility505Left.toFixed(2)}s agility</Badge>}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Ice tests */}
                    {(test.agility505Left || test.sprint10m || endurance) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Timer className="h-3 w-3" /> Istester</p>
                        <div className="grid grid-cols-5 gap-2">
                          <TestValue label="Agility V" value={test.agility505Left} unit="s" />
                          <TestValue label="Agility H" value={test.agility505Right} unit="s" />
                          <TestValue label="10m" value={test.sprint10m} unit="s" />
                          <TestValue label="20m fly" value={test.sprint20mFly} unit="s" />
                          <TestValue label="30m fly" value={test.sprint30mFly} unit="s" />
                        </div>
                        {endurance && endurance.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-muted-foreground mb-1">7x40m:</p>
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
                    {(test.jumpSquatLadder || test.gripStrengthLeft || test.muscleLabJumps) && (
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
                      </div>
                    )}

                    {/* Endurance tests */}
                    {(test.beepTestLevel || endurance) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Activity className="h-3 w-3" /> Uthållighet</p>
                        <div className="grid grid-cols-2 gap-2">
                          <TestValue label="Beep nivå" value={test.beepTestLevel} unit="" />
                          <TestValue label="Beep shuttle" value={test.beepTestShuttle} unit="" />
                        </div>
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
