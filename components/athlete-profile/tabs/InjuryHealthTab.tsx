'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Heart, AlertTriangle, CheckCircle, Activity, Clock, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface InjuryHealthTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
}

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export function InjuryHealthTab({ data, viewMode, variant = 'default' }: InjuryHealthTabProps) {
  const isGlass = variant === 'glass'
  const { injuryAssessments, crossTrainingSessions } = data.health

  // Separate active vs resolved injuries
  const activeInjuries = injuryAssessments.filter((i) => !i.resolved)
  const resolvedInjuries = injuryAssessments.filter((i) => i.resolved)

  const hasData = injuryAssessments.length > 0 || crossTrainingSessions.length > 0

  const CardWrapper = isGlass ? GlassCard : Card;

  if (!hasData) {
    return (
      <CardWrapper>
        <CardContent className="py-20 text-center">
          <Heart className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
          <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
            Ingen hälsodata
          </h3>
          <p className={cn("font-medium max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            Inga skadebedömningar eller korsträningspass registrerade.
          </p>
        </CardContent>
      </CardWrapper>
    )
  }

  return (
    <div className="space-y-8">
      {/* Active Injuries Alert */}
      {activeInjuries.length > 0 && (
        <CardWrapper className={cn(
          "border-red-500/20",
          isGlass ? "bg-red-500/5" : "bg-red-50"
        )}>
          <CardHeader className="pb-4">
            <CardTitle className={cn(
              "flex items-center gap-2 text-xl font-black uppercase italic tracking-tight",
              isGlass ? "text-red-500" : "text-red-800"
            )}>
              <AlertTriangle className="h-6 w-6" />
              Aktiva skador ({activeInjuries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeInjuries.map((injury) => (
              <InjuryCard key={injury.id} injury={injury} isActive isGlass={isGlass} />
            ))}
          </CardContent>
        </CardWrapper>
      )}

      {/* Injury Timeline */}
      <CardWrapper>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
            <Clock className="h-5 w-5" />
            Skadehistorik
          </CardTitle>
          <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
            {injuryAssessments.length} BEDÖMNINGAR REGISTRERADE
          </CardDescription>
        </CardHeader>
        <CardContent>
          {injuryAssessments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className={cn("h-16 w-16 mx-auto mb-4", isGlass ? "text-emerald-500/20" : "text-green-300")} />
              <p className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>Ingen skadehistorik - fortsätt så!</p>
            </div>
          ) : (
            <div className="relative pt-2">
              {/* Timeline line */}
              <div className={cn("absolute left-4 top-0 bottom-0 w-0.5", isGlass ? "bg-white/5" : "bg-gray-100")} />

              <div className="space-y-6">
                {injuryAssessments.slice(0, 10).map((injury) => (
                  <div key={injury.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-2.5 w-3.5 h-3.5 rounded-full border-2 transition-transform hover:scale-125 z-10",
                        isGlass ? "border-slate-900" : "border-white",
                        injury.resolved
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : injury.status === 'ACTIVE'
                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                            : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                      )}
                    />

                    <InjuryCard injury={injury} isActive={!injury.resolved} isGlass={isGlass} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </CardWrapper>

      {/* Cross Training Sessions */}
      {crossTrainingSessions.length > 0 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
              <Bike className="h-5 w-5 text-blue-500" />
              Korsträning
            </CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              ALTERNATIV TRÄNING UNDER SKADOR ELLER FÖR VARIATION
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crossTrainingSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5" : "border hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      isGlass ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                    )}>
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{getModalityLabel(session.modality)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {format(new Date(session.date), 'd MMM yyyy', { locale: sv })}
                        {session.reason && ` • ${getReasonLabel(session.reason)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-black italic text-lg", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
                      {session.duration} <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">min</span>
                    </p>
                    {session.tssEquivalent && (
                      <Badge className={cn("font-black tracking-widest text-[8px] h-4 px-1.5 rounded-md border-0 mt-1", isGlass ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}>
                        ~{Math.round(session.tssEquivalent)} TSS
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Resolved Injuries */}
      {resolvedInjuries.length > 0 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-emerald-500" : "text-green-700")}>
              <CheckCircle className="h-5 w-5" />
              Tidigare skador ({resolvedInjuries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedInjuries.slice(0, 5).map((injury) => (
                <div
                  key={injury.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5" : "bg-green-50/50 border border-green-100"
                  )}
                >
                  <div>
                    <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{getInjuryTypeLabel(injury.injuryType || 'OTHER')}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {format(new Date(injury.date), 'd MMM yyyy', { locale: sv })}
                      {injury.resolvedDate && (
                        <> → {format(new Date(injury.resolvedDate), 'd MMM yyyy', { locale: sv })}</>
                      )}
                    </p>
                  </div>
                  <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-emerald-500/10 text-emerald-400" : "bg-green-100 text-green-700")}>
                    LÄKT
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </CardWrapper>
      )}
    </div>
  )
}

// Helper component
function InjuryCard({
  injury,
  isActive,
  isGlass = false,
}: {
  injury: AthleteProfileData['health']['injuryAssessments'][0]
  isActive: boolean
  isGlass?: boolean
}) {
  return (
    <div
      className={cn(
        "p-5 rounded-3xl transition-all duration-300",
        isGlass
          ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5"
          : (isActive ? 'bg-white border-red-200' : 'bg-white border')
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={cn("font-black uppercase italic tracking-tight text-lg", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
            {getInjuryTypeLabel(injury.injuryType || 'OTHER')}
          </p>
          {injury.painLocation && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{injury.painLocation}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(
            "font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0",
            injury.status === 'ACTIVE' ? "bg-red-500 text-white" : "bg-white/10 text-slate-400"
          )}>
            {getStatusLabel(injury.status)}
          </Badge>
          {injury.phase && (
            <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-600")}>{getPhaseLabel(injury.phase)}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-200 dark:border-white/5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Smärtnivå</p>
          <div className="flex items-center gap-2">
            <PainIndicator level={injury.painLevel} />
            <span className={cn("text-xl font-black italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{injury.painLevel}/10</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Datum</p>
          <p className={cn("text-sm font-black uppercase tracking-widest", isGlass ? "text-slate-500 dark:text-slate-300" : "text-gray-900")}>
            {format(new Date(injury.date), 'd MMM yyyy', { locale: sv })}
          </p>
        </div>
        {injury.estimatedTimeOff && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Ber. vila</p>
            <p className={cn("text-sm font-black uppercase tracking-widest", isGlass ? "text-slate-500 dark:text-slate-300" : "text-gray-900")}>{injury.estimatedTimeOff}</p>
          </div>
        )}
        {injury.gaitAffected && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Gång påverkad</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-500">JA</p>
          </div>
        )}
      </div>

      {injury.notes && (
        <p className={cn("text-xs font-medium mt-4 leading-relaxed", isGlass ? "text-slate-500" : "text-gray-600")}>{injury.notes}</p>
      )}
    </div>
  )
}

function PainIndicator({ level }: { level: number }) {
  const color =
    level <= 3 ? 'bg-emerald-500' : level <= 5 ? 'bg-yellow-500' : level <= 7 ? 'bg-orange-500' : 'bg-red-500'

  return <div className={cn("w-2.5 h-2.5 rounded-full", color, "shadow-[0_0_8px_currentColor]")} />
}

// Helper functions
function getInjuryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MUSCLE_STRAIN: 'Muskelsträckning',
    TENDINOPATHY: 'Senbesvär',
    JOINT_PAIN: 'Ledvärk',
    STRESS_FRACTURE: 'Stressfraktur',
    SHIN_SPLINTS: 'Benhinnebesvär',
    PLANTAR_FASCIITIS: 'Hälsporre',
    IT_BAND: 'IT-band syndrom',
    ACHILLES: 'Akilles',
    OTHER: 'Övrigt',
  }
  return labels[type] || type
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktiv',
    MONITORING: 'Under bevakning',
    RESOLVED: 'Läkt',
  }
  return labels[status] || status
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ACTIVE':
      return 'destructive'
    case 'MONITORING':
      return 'secondary'
    case 'RESOLVED':
      return 'default'
    default:
      return 'outline'
  }
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    ACUTE: 'Akut',
    SUBACUTE: 'Subakut',
    CHRONIC: 'Kronisk',
    RECOVERY: 'Återhämtning',
  }
  return labels[phase] || phase
}

function getModalityLabel(modality: string): string {
  const labels: Record<string, string> = {
    DEEP_WATER_RUNNING: 'Vattenjogging',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    ELLIPTICAL: 'Crosstrainer',
    ROWING: 'Rodd',
    STRENGTH: 'Styrketräning',
  }
  return labels[modality] || modality
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    INJURY: 'Skada',
    VARIETY: 'Variation',
    WEATHER: 'Väder',
    PREFERENCE: 'Preferens',
  }
  return labels[reason] || reason
}
