'use client'

import { useState, type ElementType } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Activity, ChevronDown, ChevronUp, Beaker, Zap, Heart, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { cn } from '@/lib/utils'

interface PhysiologyTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
}

export function PhysiologyTab({ data, viewMode, variant = 'default' }: PhysiologyTabProps) {
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  const isGlass = variant === 'glass'

  const { tests, fieldTests, thresholdCalculations } = data.physiology
  const latestTest = tests[0]

  // Get latest thresholds
  const latestThreshold = thresholdCalculations[0]
  const testAnaerobicThreshold = latestTest?.anaerobicThreshold as { heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  const lt2Hr = testAnaerobicThreshold?.heartRate ?? latestThreshold?.lt2Hr
  const lt2Lactate = testAnaerobicThreshold?.lactate ?? latestThreshold?.lt2Lactate

  const hasData = tests.length > 0 || fieldTests.length > 0

  const CardWrapper = isGlass ? GlassCard : Card;
  const CardHeaderWrapper = isGlass ? GlassCardHeader : CardHeader;
  const CardTitleWrapper = isGlass ? GlassCardTitle : CardTitle;
  const CardDescriptionWrapper = isGlass ? GlassCardDescription : CardDescription;
  const CardContentWrapper = isGlass ? GlassCardContent : CardContent;

  if (!hasData) {
    return (
      <CardWrapper>
        <CardContentWrapper className="py-20 text-center">
          <Activity className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
          <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-white" : "text-gray-900")}>
            Ingen fysiologisk data
          </h3>
          <p className={cn("font-medium mb-8 max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            Lägg till labb- eller fälttest för att se fysiologisk data här.
          </p>
          {viewMode === 'coach' && (
            <Link href="/test">
              <Button className={isGlass ? "bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl" : ""}>
                Skapa nytt test
              </Button>
            </Link>
          )}
        </CardContentWrapper>
      </CardWrapper>
    )
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          accentColor="blue"
          label="VO2max"
          value={latestTest?.vo2max ? `${latestTest.vo2max.toFixed(1)}` : '-'}
          unit="ml/kg/min"
          trend={getVO2Trend(tests)}
          isGlass={isGlass}
        />

        <MetricCard
          icon={Heart}
          accentColor="red"
          label="Max puls"
          value={latestTest?.maxHR ? `${latestTest.maxHR}` : '-'}
          unit="bpm"
          isGlass={isGlass}
        />

        <MetricCard
          icon={Beaker}
          accentColor="purple"
          label="Max laktat"
          value={latestTest?.maxLactate ? `${latestTest.maxLactate.toFixed(1)}` : '-'}
          unit="mmol/L"
          isGlass={isGlass}
        />

        <MetricCard
          icon={Zap}
          accentColor="yellow"
          label="LT2 puls"
          value={lt2Hr ? `${Math.round(lt2Hr)}` : '-'}
          unit="bpm"
          subValue={lt2Lactate ? `${lt2Lactate.toFixed(1)} mmol/L` : undefined}
          isGlass={isGlass}
        />
      </div>

      {/* Training Zones */}
      {latestTest?.trainingZones && (latestTest.trainingZones as any[]).length > 0 && (
        <CardWrapper>
          <CardHeaderWrapper>
            <CardTitleWrapper className={cn("flex items-center gap-3 text-xl font-black uppercase italic tracking-tight")}>
              <TrendingUp className={cn("h-6 w-6", isGlass ? "text-blue-400" : "text-gray-900")} />
              Träningszoner
            </CardTitleWrapper>
            <CardDescriptionWrapper className={cn("font-black uppercase tracking-widest text-[10px]")}>
              Baserat på test {format(new Date(latestTest.testDate), 'd MMMM yyyy', { locale: sv })}
            </CardDescriptionWrapper>
          </CardHeaderWrapper>
          <CardContentWrapper>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={isGlass ? "border-white/5" : ""}>
                    <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Zon</TableHead>
                    <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Puls (bpm)</TableHead>
                    <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>% av max</TableHead>
                    <TableHead className={cn("hidden md:table-cell font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Beskrivning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(latestTest.trainingZones as any[]).map((zone, idx) => {
                    const zoneNum = zone.zone || idx + 1
                    return (
                      <TableRow key={idx} className={isGlass ? "border-white/5 hover:bg-white/5" : ""}>
                        <TableCell className="py-4">
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black border transition-transform hover:scale-110",
                            getZoneColorClasses(zoneNum, isGlass)
                          )}>
                            {zoneNum}
                          </span>
                        </TableCell>
                        <TableCell className={cn("font-black text-sm", isGlass ? "text-white" : "")}>
                          {zone.hrMin} - {zone.hrMax}
                        </TableCell>
                        <TableCell className={cn("font-black text-sm text-slate-400")}>
                          {zone.percentMin}% - {zone.percentMax}%
                        </TableCell>
                        <TableCell className={cn("hidden md:table-cell text-[10px] font-black uppercase tracking-widest text-slate-500")}>
                          {zone.effect}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContentWrapper>
        </CardWrapper>
      )}

      {/* Lab Test History */}
      <CardWrapper>
        <CardHeaderWrapper>
          <div className="flex items-center justify-between">
            <div>
              <CardTitleWrapper className={cn("text-xl font-black uppercase italic tracking-tight")}>Labbtest</CardTitleWrapper>
              <CardDescriptionWrapper className={cn("font-black uppercase tracking-widest text-[10px]")}>
                {tests.length} test registrerade
              </CardDescriptionWrapper>
            </div>
            {viewMode === 'coach' && (
              <Link href="/athlete/tests">
                <Button size="sm" variant={isGlass ? "ghost" : "outline"} className={cn(isGlass && "bg-white/5 border-white/10 hover:bg-white/10")}>+ Nytt test</Button>
              </Link>
            )}
          </div>
        </CardHeaderWrapper>
        <CardContentWrapper>
          {tests.length === 0 ? (
            <p className={cn("text-center py-10 font-bold uppercase tracking-widest text-[10px]", isGlass ? "text-slate-600" : "text-gray-400")}>
              Inga labbtest registrerade
            </p>
          ) : (
            <div className="space-y-3">
              {tests.slice(0, 10).map((test) => {
                const isExpanded = expandedTestId === test.id
                const aerobicThreshold = test.aerobicThreshold as any
                const anaerobicThreshold = test.anaerobicThreshold as any

                return (
                  <div key={test.id} className={cn(
                    "rounded-2xl overflow-hidden transition-all duration-300",
                    isGlass ? "border border-white/5 bg-white/[0.02]" : "border"
                  )}>
                    <button
                      onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                      className={cn(
                        "w-full px-6 py-4 flex items-center justify-between transition-colors",
                        isGlass ? "hover:bg-white/5" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-gray-900")}>
                            {format(new Date(test.testDate), 'd MMMM yyyy', { locale: sv })}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {getTestTypeLabel(test.testType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          {test.vo2max && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              VO2max: <span className={cn(isGlass ? "text-blue-500" : "text-blue-600")}>{test.vo2max.toFixed(1)}</span>
                            </p>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            "font-black uppercase tracking-widest text-[9px] h-5 rounded-lg px-2 border-0",
                            test.status === 'COMPLETED'
                              ? (isGlass ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-800")
                              : (isGlass ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-800")
                          )}
                        >
                          {test.status === 'COMPLETED' ? 'Genomfört' : 'Utkast'}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className={cn(
                        "px-6 py-6 border-t animate-in slide-in-from-top-2 duration-300",
                        isGlass ? "bg-white/[0.01] border-white/5 text-slate-400" : "bg-gray-50 text-gray-700"
                      )}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">VO2max</p>
                            <p className={cn("font-black uppercase italic", isGlass ? "text-white" : "text-gray-900")}>
                              {test.vo2max ? `${test.vo2max.toFixed(1)} ml/kg/min` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Max puls</p>
                            <p className={cn("font-black uppercase italic", isGlass ? "text-white" : "text-gray-900")}>
                              {test.maxHR ? `${test.maxHR} bpm` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Aerob tröskel</p>
                            <p className={cn("font-black uppercase italic", isGlass ? "text-white" : "text-gray-900")}>
                              {(aerobicThreshold?.heartRate || aerobicThreshold?.hr) ? `${aerobicThreshold.heartRate || aerobicThreshold.hr} bpm` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Anaerob tröskel</p>
                            <p className={cn("font-black uppercase italic", isGlass ? "text-white" : "text-gray-900")}>
                              {(anaerobicThreshold?.heartRate || anaerobicThreshold?.hr) ? `${anaerobicThreshold.heartRate || anaerobicThreshold.hr} bpm` : '-'}
                            </p>
                          </div>
                        </div>

                        {test.notes && (
                          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Anteckningar</p>
                            <p className="text-xs font-medium leading-relaxed">{test.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-3 mt-8">
                          <Link href={`/tests/${test.id}`}>
                            <Button size="sm" variant="ghost" className={cn(
                              "font-black uppercase tracking-widest text-[10px] h-9 rounded-lg px-4",
                              isGlass ? "bg-white/5 hover:bg-white/10 text-white" : ""
                            )}>
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
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-600 py-4">
                  +{tests.length - 10} äldre tester
                </p>
              )}
            </div>
          )}
        </CardContentWrapper>
      </CardWrapper>

      {/* Field Tests */}
      {fieldTests.length > 0 && (
        <CardWrapper>
          <CardHeaderWrapper>
            <CardTitleWrapper className={cn("text-xl font-black uppercase italic tracking-tight")}>Fälttest</CardTitleWrapper>
            <CardDescriptionWrapper className={cn("font-black uppercase tracking-widest text-[10px]")}>
              {fieldTests.length} fälttest registrerade
            </CardDescriptionWrapper>
          </CardHeaderWrapper>
          <CardContentWrapper>
            <div className="space-y-3">
              {fieldTests.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-colors",
                    isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border hover:bg-gray-50"
                  )}
                >
                  <div>
                    <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-gray-900")}>
                      {getFieldTestTypeLabel(test.testType)}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {format(new Date(test.date), 'd MMM yyyy', { locale: sv })}
                    </p>
                  </div>
                  <div className="text-right">
                    {test.lt2HR && (
                      <p className={cn("text-xs font-black uppercase italic mb-1", isGlass ? "text-blue-500" : "text-blue-600")}>
                        LT2: {test.lt2HR} bpm
                      </p>
                    )}
                    {test.confidence && (
                      <Badge className={cn(
                        "font-black uppercase tracking-widest text-[9px] h-5 px-2 rounded-lg border-0",
                        test.confidence > 0.8
                          ? (isGlass ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-500 text-white")
                          : (isGlass ? "bg-slate-500/10 text-slate-400" : "bg-slate-500 text-white")
                      )}>
                        {Math.round(test.confidence * 100)}% konfid.
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContentWrapper>
        </CardWrapper>
      )}
    </div>
  )
}

// Helper components
function MetricCard({
  icon: Icon,
  accentColor = 'blue',
  label,
  value,
  unit,
  trend,
  subValue,
  isGlass = false,
}: {
  icon: ElementType
  accentColor?: 'blue' | 'emerald' | 'red' | 'purple' | 'yellow'
  label: string
  value: string
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; value: string } | null
  subValue?: string
  isGlass?: boolean
}) {
  const accentClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
  }

  return (
    <div className={cn(
      "p-6 rounded-3xl group transition-all duration-300",
      isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "bg-white border hover:shadow-md"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-black uppercase italic tracking-tighter",
              isGlass ? "text-white" : "text-gray-900"
            )}>{value}</span>
            {unit && <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{unit}</span>}
          </div>
          {subValue && (
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{subValue}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest mt-2",
              trend.direction === 'up'
                ? 'text-emerald-500 bg-emerald-500/10'
                : trend.direction === 'down'
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-slate-500 bg-slate-500/10'
            )}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
          accentClasses[accentColor]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
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

function getZoneColorClasses(zoneNumber: number, isGlass: boolean = false): string {
  // Zone colors: 1=green (recovery), 2=blue (aerobic), 3=yellow (tempo), 4=orange (threshold), 5=red (VO2max)
  if (isGlass) {
    switch (zoneNumber) {
      case 1: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 2: return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 3: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 4: return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 5: return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-white/5 text-slate-400 border-white/10'
    }
  }

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
