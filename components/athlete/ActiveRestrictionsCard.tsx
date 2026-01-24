'use client'

/**
 * Active Restrictions Card Component
 *
 * Displays current training restrictions for an athlete.
 * Shows on the athlete dashboard when restrictions are active.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  AlertTriangle,
  Calendar,
  MessageCircle,
  Loader2,
  ShieldAlert,
  Activity,
} from 'lucide-react'

interface Restriction {
  id: string
  type: string
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'COMPLETE'
  bodyParts: string[]
  description?: string
  reason?: string
  endDate?: string
  createdAt: string
  createdBy?: {
    id: string
    name: string
    role: string
  }
}

interface ActiveRestrictionsCardProps {
  clientId: string
  onContactPhysio?: () => void
  variant?: 'default' | 'glass'
  compact?: boolean
}

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  NO_RUNNING: 'Ingen löpning',
  NO_JUMPING: 'Inga hopp',
  NO_IMPACT: 'Ingen stötbelastning',
  NO_UPPER_BODY: 'Ingen överkroppsträning',
  NO_LOWER_BODY: 'Ingen underkroppsträning',
  REDUCED_VOLUME: 'Reducerad volym',
  REDUCED_INTENSITY: 'Reducerad intensitet',
  MODIFIED_ONLY: 'Endast modifierade övningar',
  SPECIFIC_EXERCISES: 'Specifika övningar begränsade',
  CUSTOM: 'Anpassad restriktion',
}

const SEVERITY_COLORS: Record<string, string> = {
  MILD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  MODERATE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  SEVERE: 'bg-red-500/20 text-red-400 border-red-500/30',
  COMPLETE: 'bg-red-600/20 text-red-500 border-red-600/30',
}

const SEVERITY_LABELS: Record<string, string> = {
  MILD: 'Lindrig',
  MODERATE: 'Måttlig',
  SEVERE: 'Allvarlig',
  COMPLETE: 'Total',
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

export function ActiveRestrictionsCard({
  clientId,
  onContactPhysio,
  variant = 'glass',
  compact = false,
}: ActiveRestrictionsCardProps) {
  const isGlass = variant === 'glass'
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRestrictions() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/restrictions/athlete/${clientId}`)
        if (!response.ok) {
          if (response.status === 404) {
            // No restrictions found - that's OK
            setRestrictions([])
            return
          }
          throw new Error('Failed to fetch restrictions')
        }

        const data = await response.json()
        setRestrictions(data.restrictions || [])
      } catch (err) {
        console.error('Error fetching restrictions:', err)
        setError('Kunde inte hämta restriktioner')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRestrictions()
  }, [clientId])

  // Don't render if no restrictions
  if (!isLoading && restrictions.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffMs = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return (
      <GlassCard className={cn(!isGlass && 'bg-card', 'border-orange-500/20')}>
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error) {
    return null // Silently fail - don't show error to athlete
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card', 'border-orange-500/20 bg-orange-500/5')}>
      <GlassCardHeader className={compact ? 'pb-2' : ''}>
        <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          Aktiva träningsrestriktioner
        </GlassCardTitle>
        {!compact && (
          <GlassCardDescription className="text-slate-400">
            Dessa begränsningar gäller för din träning just nu.
          </GlassCardDescription>
        )}
      </GlassCardHeader>

      <GlassCardContent className={cn('space-y-4', compact && 'pt-0')}>
        {restrictions.map((restriction) => (
          <div
            key={restriction.id}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3"
          >
            {/* Type and severity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-white">
                  {RESTRICTION_TYPE_LABELS[restriction.type] || restriction.type}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn('text-[10px] font-bold', SEVERITY_COLORS[restriction.severity])}
              >
                {SEVERITY_LABELS[restriction.severity]}
              </Badge>
            </div>

            {/* Description */}
            {restriction.description && (
              <p className="text-sm text-slate-400">{restriction.description}</p>
            )}

            {/* Body parts */}
            {restriction.bodyParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {restriction.bodyParts.map((part) => (
                  <Badge
                    key={part}
                    variant="outline"
                    className="text-[10px] border-orange-500/20 text-orange-400 bg-orange-500/10"
                  >
                    {BODY_PART_LABELS[part] || part}
                  </Badge>
                ))}
              </div>
            )}

            {/* End date */}
            {restriction.endDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-slate-500">
                  Gäller till: {formatDate(restriction.endDate)}
                </span>
                {getDaysRemaining(restriction.endDate) > 0 && (
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    {getDaysRemaining(restriction.endDate)} dagar kvar
                  </Badge>
                )}
              </div>
            )}

            {/* Created by */}
            {restriction.createdBy && !compact && (
              <div className="text-xs text-slate-600">
                Skapad av {restriction.createdBy.name} ({restriction.createdBy.role === 'PHYSIO' ? 'Fysioterapeut' : 'Coach'})
              </div>
            )}
          </div>
        ))}

        {/* Contact physio button */}
        {onContactPhysio && (
          <Button
            onClick={onContactPhysio}
            variant="outline"
            className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Kontakta fysioterapeut
          </Button>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
