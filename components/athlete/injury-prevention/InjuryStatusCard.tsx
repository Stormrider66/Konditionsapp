'use client'

/**
 * InjuryStatusCard
 *
 * Displays active injury with phase progress and pain level.
 */

import { AlertTriangle, Activity, Calendar } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface Injury {
  id: string
  bodyPart: string | null
  injuryType: string | null
  status: string
  phase: string | null
  painLevel: number
  startDate: string
  recommendedProtocol: unknown
}

interface InjuryStatusCardProps {
  injury: Injury
  className?: string
}

// Map injury phases to display info
type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0]

const PHASE_INFO: Record<string, { labelKey: TranslationKey; progress: number; color: string }> = {
  ACUTE: {
    labelKey: 'phases.acute',
    progress: 10,
    color: 'bg-red-500',
  },
  SUBACUTE: {
    labelKey: 'phases.subacute',
    progress: 35,
    color: 'bg-orange-500',
  },
  CHRONIC: {
    labelKey: 'phases.chronic',
    progress: 60,
    color: 'bg-yellow-500',
  },
  RECOVERY: {
    labelKey: 'phases.recovery',
    progress: 85,
    color: 'bg-green-500',
  },
}

// Map body parts to Swedish
const BODY_PART_KEYS: Record<string, TranslationKey> = {
  PLANTAR_FASCIA: 'bodyParts.plantarFascia',
  ACHILLES: 'bodyParts.achilles',
  IT_BAND: 'bodyParts.itBand',
  KNEE: 'bodyParts.knee',
  HIP: 'bodyParts.hip',
  LOWER_BACK: 'bodyParts.lowerBack',
  CALF: 'bodyParts.calf',
  HAMSTRING: 'bodyParts.hamstring',
  QUADRICEPS: 'bodyParts.quadriceps',
  SHIN: 'bodyParts.shin',
  ANKLE: 'bodyParts.ankle',
  FOOT: 'bodyParts.foot',
  SHOULDER: 'bodyParts.shoulder',
  ELBOW: 'bodyParts.elbow',
  WRIST: 'bodyParts.wrist',
}

// Map injury types to Swedish
const INJURY_TYPE_KEYS: Record<string, TranslationKey> = {
  STRESS_FRACTURE: 'injuryTypes.stressFracture',
  TENDINOPATHY: 'injuryTypes.tendinopathy',
  MUSCLE_STRAIN: 'injuryTypes.muscleStrain',
  PLANTAR_FASCIITIS: 'injuryTypes.plantarFasciitis',
  ACHILLES_TENDINOPATHY: 'injuryTypes.achillesTendinopathy',
  SHIN_SPLINTS: 'injuryTypes.shinSplints',
  RUNNERS_KNEE: 'injuryTypes.runnersKnee',
  IT_BAND_SYNDROME: 'injuryTypes.itBandSyndrome',
  SPRAIN: 'injuryTypes.sprain',
  OVERUSE: 'injuryTypes.overuse',
}

function getPainLevelColor(painLevel: number): string {
  if (painLevel <= 2) return 'text-green-500'
  if (painLevel <= 4) return 'text-yellow-500'
  if (painLevel <= 6) return 'text-orange-500'
  return 'text-red-500'
}

export function InjuryStatusCard({ injury, className }: InjuryStatusCardProps) {
  const t = useTranslations('components.injuryStatusCard')
  const phaseInfo = injury.phase ? PHASE_INFO[injury.phase] : null
  const bodyPartLabel = injury.bodyPart && BODY_PART_KEYS[injury.bodyPart]
    ? t(BODY_PART_KEYS[injury.bodyPart])
    : injury.bodyPart || t('unknownLocation')
  const injuryTypeLabel = injury.injuryType
    ? INJURY_TYPE_KEYS[injury.injuryType]
      ? t(INJURY_TYPE_KEYS[injury.injuryType])
      : injury.injuryType
    : t('injury')

  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(injury.startDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 space-y-3',
        injury.painLevel >= 5 && 'border-orange-500/50 bg-orange-500/5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              injury.painLevel >= 5 ? 'text-orange-500' : 'text-yellow-500'
            )}
          />
          <div>
            <h4 className="font-medium text-sm">{bodyPartLabel}</h4>
            <p className="text-xs text-muted-foreground">{injuryTypeLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-sm font-medium inline-flex items-center gap-1',
              injury.status === 'ACTIVE' ? 'text-orange-500' : 'text-yellow-500'
            )}
          >
            <Activity className="h-3 w-3" />
            {injury.status === 'ACTIVE' ? t('status.active') : t('status.monitored')}
          </span>
        </div>
      </div>

      {/* Pain level indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('painLevel')}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-3 rounded-sm',
                  i < injury.painLevel
                    ? getPainLevelColor(injury.painLevel).replace('text-', 'bg-')
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
          <span className={cn('font-medium', getPainLevelColor(injury.painLevel))}>
            {injury.painLevel}/10
          </span>
        </div>
      </div>

      {/* Phase progress */}
      {phaseInfo && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('phase')}</span>
            <span className="font-medium">{t(phaseInfo.labelKey)}</span>
          </div>
          <Progress value={phaseInfo.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('phaseScale.acute')}</span>
            <span>{t('phaseScale.recovered')}</span>
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>
          {daysSinceStart === 0
            ? t('duration.today')
            : daysSinceStart === 1
              ? t('duration.yesterday')
              : t('duration.daysAgo', { days: daysSinceStart })}
        </span>
      </div>
    </div>
  )
}

/**
 * List component for multiple injuries
 */
interface InjuryStatusListProps {
  injuries: Injury[]
  className?: string
}

export function InjuryStatusList({ injuries, className }: InjuryStatusListProps) {
  const t = useTranslations('components.injuryStatusCard')

  if (injuries.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('empty.title')}</p>
        <p className="text-xs mt-1">{t('empty.description')}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        {t('listTitle', { count: injuries.length })}
      </h3>
      {injuries.map((injury) => (
        <InjuryStatusCard key={injury.id} injury={injury} />
      ))}
    </div>
  )
}
