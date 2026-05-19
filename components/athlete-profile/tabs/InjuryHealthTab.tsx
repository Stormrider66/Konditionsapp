'use client'

import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Heart, AlertTriangle, CheckCircle, Activity, Clock, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { useLocale } from '@/i18n/client'

interface InjuryHealthTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
}

import {
  GlassCard,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export function InjuryHealthTab({ data, viewMode: _viewMode, variant = 'default' }: InjuryHealthTabProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
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
            {t('Ingen hälsodata', 'No health data')}
          </h3>
          <p className={cn("font-medium max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            {t('Inga skadebedömningar eller korsträningspass registrerade.', 'No injury assessments or cross-training sessions registered.')}
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
              {t('Aktiva skador', 'Active injuries')} ({activeInjuries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeInjuries.map((injury) => (
              <InjuryCard key={injury.id} injury={injury} isActive isGlass={isGlass} locale={locale} />
            ))}
          </CardContent>
        </CardWrapper>
      )}

      {/* Injury Timeline */}
      <CardWrapper>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
            <Clock className="h-5 w-5" />
            {t('Skadehistorik', 'Injury history')}
          </CardTitle>
          <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
            {injuryAssessments.length} {t('BEDÖMNINGAR REGISTRERADE', 'ASSESSMENTS REGISTERED')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {injuryAssessments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className={cn("h-16 w-16 mx-auto mb-4", isGlass ? "text-emerald-500/20" : "text-green-300")} />
              <p className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>{t('Ingen skadehistorik - fortsätt så!', 'No injury history - keep it up!')}</p>
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

                    <InjuryCard injury={injury} isActive={!injury.resolved} isGlass={isGlass} locale={locale} />
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
              {t('Korsträning', 'Cross-training')}
            </CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              {t('ALTERNATIV TRÄNING UNDER SKADOR ELLER FÖR VARIATION', 'ALTERNATIVE TRAINING DURING INJURY OR FOR VARIETY')}
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
                      <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{getModalityLabel(session.modality, locale)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {format(new Date(session.date), 'd MMM yyyy', { locale: dateLocale })}
                        {session.reason && ` • ${getReasonLabel(session.reason, locale)}`}
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
              {t('Tidigare skador', 'Previous injuries')} ({resolvedInjuries.length})
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
                    <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{getInjuryTypeLabel(injury.injuryType || 'OTHER', locale)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {format(new Date(injury.date), 'd MMM yyyy', { locale: dateLocale })}
                      {injury.resolvedDate && (
                        <> → {format(new Date(injury.resolvedDate), 'd MMM yyyy', { locale: dateLocale })}</>
                      )}
                    </p>
                  </div>
                  <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-emerald-500/10 text-emerald-400" : "bg-green-100 text-green-700")}>
                    {t('LÄKT', 'RESOLVED')}
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
  locale,
}: {
  injury: AthleteProfileData['health']['injuryAssessments'][0]
  isActive: boolean
  isGlass?: boolean
  locale: 'en' | 'sv'
}) {
  const dateLocale = locale === 'sv' ? sv : enUS
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
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
            {getInjuryTypeLabel(injury.injuryType || 'OTHER', locale)}
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
            {getStatusLabel(injury.status, locale)}
          </Badge>
          {injury.phase && (
            <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-600")}>{getPhaseLabel(injury.phase, locale)}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-200 dark:border-white/5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('Smärtnivå', 'Pain level')}</p>
          <div className="flex items-center gap-2">
            <PainIndicator level={injury.painLevel} />
            <span className={cn("text-xl font-black italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{injury.painLevel}/10</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('Datum', 'Date')}</p>
          <p className={cn("text-sm font-black uppercase tracking-widest", isGlass ? "text-slate-500 dark:text-slate-300" : "text-gray-900")}>
            {format(new Date(injury.date), 'd MMM yyyy', { locale: dateLocale })}
          </p>
        </div>
        {injury.estimatedTimeOff && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('Ber. vila', 'Est. rest')}</p>
            <p className={cn("text-sm font-black uppercase tracking-widest", isGlass ? "text-slate-500 dark:text-slate-300" : "text-gray-900")}>{injury.estimatedTimeOff}</p>
          </div>
        )}
        {injury.gaitAffected && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('Gång påverkad', 'Gait affected')}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-500">{t('JA', 'YES')}</p>
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
function getInjuryTypeLabel(type: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      MUSCLE_STRAIN: 'Muscle strain',
      TENDINOPATHY: 'Tendinopathy',
      JOINT_PAIN: 'Joint pain',
      STRESS_FRACTURE: 'Stress fracture',
      SHIN_SPLINTS: 'Shin splints',
      PLANTAR_FASCIITIS: 'Plantar fasciitis',
      IT_BAND: 'IT band syndrome',
      ACHILLES: 'Achilles',
      OTHER: 'Other',
    },
    sv: {
      MUSCLE_STRAIN: 'Muskelsträckning',
      TENDINOPATHY: 'Senbesvär',
      JOINT_PAIN: 'Ledvärk',
      STRESS_FRACTURE: 'Stressfraktur',
      SHIN_SPLINTS: 'Benhinnebesvär',
      PLANTAR_FASCIITIS: 'Hälsporre',
      IT_BAND: 'IT-band syndrom',
      ACHILLES: 'Akilles',
      OTHER: 'Övrigt',
    },
  }
  return labels[locale][type] || type
}

function getStatusLabel(status: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      ACTIVE: 'Active',
      MONITORING: 'Monitoring',
      RESOLVED: 'Resolved',
    },
    sv: {
      ACTIVE: 'Aktiv',
      MONITORING: 'Under bevakning',
      RESOLVED: 'Läkt',
    },
  }
  return labels[locale][status] || status
}

function getPhaseLabel(phase: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      ACUTE: 'Acute',
      SUBACUTE: 'Subacute',
      CHRONIC: 'Chronic',
      RECOVERY: 'Recovery',
    },
    sv: {
      ACUTE: 'Akut',
      SUBACUTE: 'Subakut',
      CHRONIC: 'Kronisk',
      RECOVERY: 'Återhämtning',
    },
  }
  return labels[locale][phase] || phase
}

function getModalityLabel(modality: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      DEEP_WATER_RUNNING: 'Deep water running',
      CYCLING: 'Cycling',
      SWIMMING: 'Swimming',
      ELLIPTICAL: 'Elliptical',
      ROWING: 'Rowing',
      STRENGTH: 'Strength training',
    },
    sv: {
      DEEP_WATER_RUNNING: 'Vattenjogging',
      CYCLING: 'Cykling',
      SWIMMING: 'Simning',
      ELLIPTICAL: 'Crosstrainer',
      ROWING: 'Rodd',
      STRENGTH: 'Styrketräning',
    },
  }
  return labels[locale][modality] || modality
}

function getReasonLabel(reason: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      INJURY: 'Injury',
      VARIETY: 'Variety',
      WEATHER: 'Weather',
      PREFERENCE: 'Preference',
    },
    sv: {
      INJURY: 'Skada',
      VARIETY: 'Variation',
      WEATHER: 'Väder',
      PREFERENCE: 'Preferens',
    },
  }
  return labels[locale][reason] || reason
}
