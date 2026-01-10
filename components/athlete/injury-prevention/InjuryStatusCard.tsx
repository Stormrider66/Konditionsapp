'use client'

/**
 * InjuryStatusCard
 *
 * Displays active injury with phase progress and pain level.
 */

import { AlertTriangle, Activity, Calendar } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

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
const PHASE_INFO: Record<string, { label: string; progress: number; color: string }> = {
  ACUTE: {
    label: 'Akut fas',
    progress: 10,
    color: 'bg-red-500',
  },
  SUBACUTE: {
    label: 'Subakut fas',
    progress: 35,
    color: 'bg-orange-500',
  },
  CHRONIC: {
    label: 'Kronisk fas',
    progress: 60,
    color: 'bg-yellow-500',
  },
  RECOVERY: {
    label: 'Återhämtning',
    progress: 85,
    color: 'bg-green-500',
  },
}

// Map body parts to Swedish
const BODY_PART_LABELS: Record<string, string> = {
  PLANTAR_FASCIA: 'Fotsulefascian',
  ACHILLES: 'Hälsenan',
  IT_BAND: 'IT-bandet',
  KNEE: 'Knäet',
  HIP: 'Höften',
  LOWER_BACK: 'Ländryggen',
  CALF: 'Vaden',
  HAMSTRING: 'Bakre låret',
  QUADRICEPS: 'Framsida lår',
  SHIN: 'Smalbenet',
  ANKLE: 'Fotleden',
  FOOT: 'Foten',
  SHOULDER: 'Axeln',
  ELBOW: 'Armbågen',
  WRIST: 'Handleden',
}

// Map injury types to Swedish
const INJURY_TYPE_LABELS: Record<string, string> = {
  STRESS_FRACTURE: 'Stressfraktur',
  TENDINOPATHY: 'Tendinopati',
  MUSCLE_STRAIN: 'Muskelskada',
  PLANTAR_FASCIITIS: 'Plantarfasciit',
  ACHILLES_TENDINOPATHY: 'Akillestendinopati',
  SHIN_SPLINTS: 'Medial tibialt stressyndrom',
  RUNNERS_KNEE: 'Löparknä',
  IT_BAND_SYNDROME: 'IT-bandssyndrom',
  SPRAIN: 'Stukning',
  OVERUSE: 'Överbelastning',
}

function getPainLevelColor(painLevel: number): string {
  if (painLevel <= 2) return 'text-green-500'
  if (painLevel <= 4) return 'text-yellow-500'
  if (painLevel <= 6) return 'text-orange-500'
  return 'text-red-500'
}

function getPainLevelLabel(painLevel: number): string {
  if (painLevel <= 2) return 'Lindrig'
  if (painLevel <= 4) return 'Måttlig'
  if (painLevel <= 6) return 'Betydande'
  return 'Svår'
}

export function InjuryStatusCard({ injury, className }: InjuryStatusCardProps) {
  const phaseInfo = injury.phase ? PHASE_INFO[injury.phase] : null
  const bodyPartLabel = injury.bodyPart ? BODY_PART_LABELS[injury.bodyPart] || injury.bodyPart : 'Okänd plats'
  const injuryTypeLabel = injury.injuryType
    ? INJURY_TYPE_LABELS[injury.injuryType] || injury.injuryType
    : 'Skada'

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
            {injury.status === 'ACTIVE' ? 'Aktiv' : 'Övervakas'}
          </span>
        </div>
      </div>

      {/* Pain level indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Smärtnivå</span>
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
            <span className="text-muted-foreground">Fas</span>
            <span className="font-medium">{phaseInfo.label}</span>
          </div>
          <Progress value={phaseInfo.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Akut</span>
            <span>Återställd</span>
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>
          {daysSinceStart === 0
            ? 'Började idag'
            : daysSinceStart === 1
              ? 'Började igår'
              : `${daysSinceStart} dagar sedan`}
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
  if (injuries.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inga aktiva skador</p>
        <p className="text-xs mt-1">Fortsätt träna smart för att hålla dig skadefri!</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        Aktiva skador ({injuries.length})
      </h3>
      {injuries.map((injury) => (
        <InjuryStatusCard key={injury.id} injury={injury} />
      ))}
    </div>
  )
}
