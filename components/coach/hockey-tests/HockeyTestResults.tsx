'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Timer, Zap, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

export function HockeyTestResults({ teams }: HockeyTestResultsProps) {
  const [tests, setTests] = useState<HockeyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTests = async () => {
      const params = new URLSearchParams()
      if (teamFilter !== 'all') params.set('teamId', teamFilter)
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
    setLoading(true)
    fetchTests()
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
                    {(test.jumpSquatLadder || test.gripStrengthLeft) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> Krafttester</p>
                        {test.jumpSquatLadder && (
                          <div className="mb-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Knäböjshopp:</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {Object.entries(test.jumpSquatLadder).map(([kg, w]) => (
                                <span key={kg} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {kg}kg: {w}W
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
