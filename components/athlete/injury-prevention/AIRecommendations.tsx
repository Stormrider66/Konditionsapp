'use client'

/**
 * AIRecommendations
 *
 * Displays AI-generated recommendations based on injury prevention data.
 */

import { AlertTriangle, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type RecommendationType = 'WARNING' | 'SUGGESTION' | 'POSITIVE'

interface Recommendation {
  type: RecommendationType
  title: string
  message: string
  priority: number
}

interface AIRecommendationsProps {
  recommendations: Recommendation[]
  className?: string
}

const TYPE_CONFIG: Record<
  RecommendationType,
  { icon: typeof AlertTriangle; bgColor: string; textColor: string; borderColor: string }
> = {
  WARNING: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500/20',
  },
  SUGGESTION: {
    icon: Lightbulb,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
  },
  POSITIVE: {
    icon: CheckCircle2,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20',
  },
}

export function AIRecommendations({ recommendations, className }: AIRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inga rekommendationer just nu</p>
        <p className="text-xs mt-1">Fortsätt logga din träning för personliga tips!</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground">
          AI-rekommendationer
        </h3>
      </div>

      <div className="space-y-2">
        {recommendations.map((rec, index) => {
          const config = TYPE_CONFIG[rec.type] || TYPE_CONFIG.SUGGESTION
          const Icon = config.icon

          return (
            <div
              key={index}
              className={cn(
                'rounded-lg border p-3 space-y-1',
                config.bgColor,
                config.borderColor
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4 flex-shrink-0', config.textColor)} />
                <h4 className={cn('text-sm font-medium', config.textColor)}>
                  {rec.title}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{rec.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
