'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Activity, ChevronDown, ChevronUp, Beaker, Zap, Heart, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface PhysiologyTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function PhysiologyTab({ data, viewMode }: PhysiologyTabProps) {
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)

  const { tests, fieldTests, thresholdCalculations } = data.physiology
  const latestTest = tests[0]

  // Get latest thresholds - prefer Test.anaerobicThreshold (auto-saved with fresh calculations)
  // Fall back to ThresholdCalculation for legacy data
  const latestThreshold = thresholdCalculations[0]
  const testAnaerobicThreshold = latestTest?.anaerobicThreshold as { heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  const lt2Hr = testAnaerobicThreshold?.heartRate ?? latestThreshold?.lt2Hr
  const lt2Lactate = testAnaerobicThreshold?.lactate ?? latestThreshold?.lt2Lactate

  const hasData = tests.length > 0 || fieldTests.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen fysiologisk data</h3>
          <p className="text-gray-500 mb-4">
            Lägg till labb- eller fälttest för att se fysiologisk data här.
          </p>
          {viewMode === 'coach' && (
            <Link href="/test">
              <Button>Skapa nytt test</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          iconColor="text-blue-500"
          label="VO2max"
          value={latestTest?.vo2max ? `${latestTest.vo2max.toFixed(1)}` : '-'}
          unit="ml/kg/min"
          trend={getVO2Trend(tests)}
        />

        <MetricCard
          icon={Heart}
          iconColor="text-red-500"
          label="Max puls"
          value={latestTest?.maxHR ? `${latestTest.maxHR}` : '-'}
          unit="bpm"
        />

        <MetricCard
          icon={Beaker}
          iconColor="text-purple-500"
          label="Max laktat"
          value={latestTest?.maxLactate ? `${latestTest.maxLactate.toFixed(1)}` : '-'}
          unit="mmol/L"
        />

        <MetricCard
          icon={Zap}
          iconColor="text-yellow-500"
          label="LT2 puls"
          value={lt2Hr ? `${Math.round(lt2Hr)}` : '-'}
          unit="bpm"
          subValue={lt2Lactate ? `${lt2Lactate.toFixed(1)} mmol/L` : undefined}
        />
      </div>

      {/* Training Zones */}
      {latestTest?.trainingZones && (latestTest.trainingZones as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Träningszoner
            </CardTitle>
            <CardDescription>
              Baserat på test {format(new Date(latestTest.testDate), 'd MMMM yyyy', { locale: sv })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zon</TableHead>
                    <TableHead>Puls (bpm)</TableHead>
                    <TableHead>% av max</TableHead>
                    <TableHead className="hidden md:table-cell">Beskrivning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(latestTest.trainingZones as any[]).map((zone, idx) => {
                    const zoneNum = zone.zone || idx + 1
                    return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold border ${getZoneColorClasses(zoneNum)}`}>
                          {zoneNum}
                        </span>
                      </TableCell>
                      <TableCell>
                        {zone.hrMin} - {zone.hrMax}
                      </TableCell>
                      <TableCell>
                        {zone.percentMin}% - {zone.percentMax}%
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-500">
                        {zone.effect}
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Test History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Labbtest</CardTitle>
              <CardDescription>{tests.length} test registrerade</CardDescription>
            </div>
            {viewMode === 'coach' && (
              <Link href="/test">
                <Button size="sm">+ Nytt test</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Inga labbtest registrerade</p>
          ) : (
            <div className="space-y-2">
              {tests.slice(0, 10).map((test) => {
                const isExpanded = expandedTestId === test.id
                const aerobicThreshold = test.aerobicThreshold as any
                const anaerobicThreshold = test.anaerobicThreshold as any

                return (
                  <div key={test.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-medium">
                            {format(new Date(test.testDate), 'd MMMM yyyy', { locale: sv })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getTestTypeLabel(test.testType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          {test.vo2max && (
                            <p className="text-sm">
                              VO2max: <span className="font-medium">{test.vo2max.toFixed(1)}</span>
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={test.status === 'COMPLETED' ? 'default' : 'secondary'}
                        >
                          {test.status === 'COMPLETED' ? 'Genomfört' : 'Utkast'}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-4 bg-gray-50 border-t space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">VO2max</p>
                            <p className="font-medium">
                              {test.vo2max ? `${test.vo2max.toFixed(1)} ml/kg/min` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Max puls</p>
                            <p className="font-medium">
                              {test.maxHR ? `${test.maxHR} bpm` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Aerob tröskel</p>
                            <p className="font-medium">
                              {(aerobicThreshold?.heartRate || aerobicThreshold?.hr) ? `${aerobicThreshold.heartRate || aerobicThreshold.hr} bpm` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Anaerob tröskel</p>
                            <p className="font-medium">
                              {(anaerobicThreshold?.heartRate || anaerobicThreshold?.hr) ? `${anaerobicThreshold.heartRate || anaerobicThreshold.hr} bpm` : '-'}
                            </p>
                          </div>
                        </div>

                        {test.notes && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Anteckningar</p>
                            <p className="text-sm text-gray-700">{test.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Link href={`/tests/${test.id}`}>
                            <Button size="sm" variant="outline">
                              Visa detaljer
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {tests.length > 10 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  +{tests.length - 10} äldre tester
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Tests */}
      {fieldTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fälttest</CardTitle>
            <CardDescription>{fieldTests.length} fälttest registrerade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fieldTests.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{getFieldTestTypeLabel(test.testType)}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(test.date), 'd MMM yyyy', { locale: sv })}
                    </p>
                  </div>
                  <div className="text-right">
                    {test.lt2HR && (
                      <p className="text-sm">LT2: {test.lt2HR} bpm</p>
                    )}
                    {test.confidence && (
                      <Badge variant={test.confidence > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(test.confidence * 100)}% konfid.
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper components
function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  unit,
  trend,
  subValue,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; value: string } | null
  subValue?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
            {subValue && (
              <p className="text-xs text-gray-500 mt-1">{subValue}</p>
            )}
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.direction === 'up'
                    ? 'text-green-600'
                    : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
                {trend.value}
              </p>
            )}
          </div>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions
function getTestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löptest',
    CYCLING: 'Cykeltest',
    SKIING: 'Skidtest',
  }
  return labels[type] || type
}

function getFieldTestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    '30MIN_TT': '30 min time trial',
    '20MIN_TT': '20 min time trial',
    HR_DRIFT: 'HR Drift Test',
    CRITICAL_VELOCITY: 'Critical Velocity',
    TALK_TEST: 'Prattest',
    RACE_BASED: 'Tävlingsbaserat',
  }
  return labels[type] || type
}

function getZoneColorClasses(zoneNumber: number): string {
  // Zone colors: 1=green (recovery), 2=blue (aerobic), 3=yellow (tempo), 4=orange (threshold), 5=red (VO2max)
  switch (zoneNumber) {
    case 1:
      return 'bg-green-100 text-green-800 border-green-300'
    case 2:
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 3:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 4:
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 5:
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getVO2Trend(
  tests: { vo2max: number | null; testDate: Date }[]
): { direction: 'up' | 'down' | 'stable'; value: string } | null {
  if (tests.length < 2) return null

  const current = tests[0]?.vo2max
  const previous = tests[1]?.vo2max

  if (!current || !previous) return null

  const diff = current - previous
  const percentChange = ((diff / previous) * 100).toFixed(1)

  if (Math.abs(diff) < 0.5) {
    return { direction: 'stable', value: 'Stabil' }
  }

  return {
    direction: diff > 0 ? 'up' : 'down',
    value: `${diff > 0 ? '+' : ''}${percentChange}%`,
  }
}
