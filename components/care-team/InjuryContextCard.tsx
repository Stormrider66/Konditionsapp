'use client'

/**
 * Injury Context Card Component
 *
 * Displays injury information inline within a care team thread.
 * Shows injury type, body part, phase, and pain level.
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Stethoscope, AlertCircle } from 'lucide-react'

interface InjuryContextCardProps {
  injury: {
    id: string
    injuryType: string
    bodyPart: string
    phase: string
    painLevel: number
  }
  variant?: 'default' | 'glass'
}

const PHASE_LABELS: Record<string, string> = {
  ACUTE: 'Akut',
  SUBACUTE: 'Subakut',
  REMODELING: 'Remodellering',
  FUNCTIONAL: 'Funktionell',
  RETURN_TO_SPORT: 'Återgång till idrott',
}

const PHASE_COLORS: Record<string, string> = {
  ACUTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUBACUTE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  REMODELING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  FUNCTIONAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  RETURN_TO_SPORT: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const BODY_PART_LABELS: Record<string, string> = {
  ANKLE: 'Fotled',
  KNEE: 'Knä',
  HIP: 'Höft',
  LOWER_BACK: 'Ländrygg',
  UPPER_BACK: 'Övre rygg',
  SHOULDER: 'Axel',
  ELBOW: 'Armbåge',
  WRIST: 'Handled',
  NECK: 'Nacke',
  GROIN: 'Ljumske',
  HAMSTRING: 'Baksida lår',
  QUADRICEPS: 'Framsida lår',
  CALF: 'Vad',
  ACHILLES: 'Akillessena',
  FOOT: 'Fot',
  SHIN: 'Skenben',
}

export function InjuryContextCard({ injury, variant = 'glass' }: InjuryContextCardProps) {
  const isGlass = variant === 'glass'

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'text-green-400'
    if (level <= 5) return 'text-yellow-400'
    if (level <= 7) return 'text-orange-400'
    return 'text-red-400'
  }

  const getPainLevelBg = (level: number) => {
    if (level <= 3) return 'bg-green-500/20'
    if (level <= 5) return 'bg-yellow-500/20'
    if (level <= 7) return 'bg-orange-500/20'
    return 'bg-red-500/20'
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card', 'border-red-500/20')}>
      <GlassCardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
            Skada
          </span>
        </div>

        <div className="space-y-3">
          {/* Injury type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">
              Typ
            </p>
            <p className="font-bold text-white">{injury.injuryType}</p>
          </div>

          {/* Body part */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">
              Kroppsdel
            </p>
            <p className="text-sm text-slate-300">
              {BODY_PART_LABELS[injury.bodyPart] || injury.bodyPart}
            </p>
          </div>

          {/* Phase and Pain */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-bold',
                PHASE_COLORS[injury.phase] || 'border-white/10 text-slate-400'
              )}
            >
              {PHASE_LABELS[injury.phase] || injury.phase}
            </Badge>

            <div className="flex items-center gap-1.5">
              <AlertCircle className={cn('h-3.5 w-3.5', getPainLevelColor(injury.painLevel))} />
              <span
                className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  getPainLevelBg(injury.painLevel),
                  getPainLevelColor(injury.painLevel)
                )}
              >
                Smärta: {injury.painLevel}/10
              </span>
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
