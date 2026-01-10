'use client'

/**
 * ACWRGauge
 *
 * Visual semicircle gauge showing ACWR (Acute:Chronic Workload Ratio)
 * with color-coded risk zones.
 *
 * Zones:
 * - Gray (<0.5): DETRAINING
 * - Green (0.8-1.3): OPTIMAL
 * - Yellow (0.5-0.8, 1.3-1.5): CAUTION
 * - Orange (1.5-2.0): DANGER
 * - Red (>2.0): CRITICAL
 */

import { cn } from '@/lib/utils'

type ACWRZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'

interface ACWRGaugeProps {
  value: number | null
  zone: ACWRZone | null
  className?: string
}

const ZONE_COLORS: Record<ACWRZone, { bg: string; text: string; label: string }> = {
  DETRAINING: {
    bg: 'text-gray-400',
    text: 'text-gray-600',
    label: 'Avträning',
  },
  OPTIMAL: {
    bg: 'text-green-500',
    text: 'text-green-600',
    label: 'Optimal',
  },
  CAUTION: {
    bg: 'text-yellow-500',
    text: 'text-yellow-600',
    label: 'Varning',
  },
  DANGER: {
    bg: 'text-orange-500',
    text: 'text-orange-600',
    label: 'Fara',
  },
  CRITICAL: {
    bg: 'text-red-500',
    text: 'text-red-600',
    label: 'Kritisk',
  },
}

export function ACWRGauge({ value, zone, className }: ACWRGaugeProps) {
  // Clamp value between 0 and 2.5 for display purposes
  const displayValue = value !== null ? Math.min(Math.max(value, 0), 2.5) : 0

  // Calculate needle rotation (0 = left, 180 = right)
  // Map 0-2.5 ACWR to 0-180 degrees
  const rotation = (displayValue / 2.5) * 180

  const zoneConfig = zone ? ZONE_COLORS[zone] : ZONE_COLORS.OPTIMAL

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* SVG Gauge */}
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc segments */}
          {/* Detraining zone (0-0.5) - Gray */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 36"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-gray-300 dark:text-gray-600"
          />
          {/* Caution zone (0.5-0.8) - Yellow */}
          <path
            d="M 56 36 A 80 80 0 0 1 78 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-yellow-200 dark:text-yellow-900"
          />
          {/* Optimal zone (0.8-1.3) - Green */}
          <path
            d="M 78 24 A 80 80 0 0 1 122 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-green-300 dark:text-green-800"
          />
          {/* Caution zone (1.3-1.5) - Yellow */}
          <path
            d="M 122 24 A 80 80 0 0 1 144 36"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-yellow-200 dark:text-yellow-900"
          />
          {/* Danger zone (1.5-2.0) - Orange */}
          <path
            d="M 144 36 A 80 80 0 0 1 172 66"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-orange-200 dark:text-orange-900"
          />
          {/* Critical zone (>2.0) - Red */}
          <path
            d="M 172 66 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-red-200 dark:text-red-900"
          />

          {/* Active indicator for current zone */}
          {zone === 'DETRAINING' && (
            <path
              d="M 20 100 A 80 80 0 0 1 56 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-gray-500"
            />
          )}
          {zone === 'OPTIMAL' && (
            <path
              d="M 78 24 A 80 80 0 0 1 122 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-green-500"
            />
          )}
          {zone === 'CAUTION' && displayValue < 0.8 && (
            <path
              d="M 56 36 A 80 80 0 0 1 78 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-yellow-500"
            />
          )}
          {zone === 'CAUTION' && displayValue >= 1.3 && (
            <path
              d="M 122 24 A 80 80 0 0 1 144 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-yellow-500"
            />
          )}
          {zone === 'DANGER' && (
            <path
              d="M 144 36 A 80 80 0 0 1 172 66"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-orange-500"
            />
          )}
          {zone === 'CRITICAL' && (
            <path
              d="M 172 66 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-red-500"
            />
          )}

          {/* Needle */}
          <g transform={`rotate(${rotation - 90}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-foreground"
            />
            {/* Needle base circle */}
            <circle
              cx="100"
              cy="100"
              r="6"
              fill="currentColor"
              className="text-foreground"
            />
          </g>

          {/* Zone labels */}
          <text x="15" y="108" className="fill-muted-foreground text-[8px]">
            0
          </text>
          <text x="175" y="108" className="fill-muted-foreground text-[8px]">
            2.5
          </text>
        </svg>
      </div>

      {/* Value and zone display */}
      <div className="text-center -mt-2">
        <div className={cn('text-3xl font-bold', value !== null ? zoneConfig.text : 'text-muted-foreground')}>
          {value !== null ? value.toFixed(2) : '—'}
        </div>
        <div className={cn('text-sm font-medium', value !== null ? zoneConfig.text : 'text-muted-foreground')}>
          {zone ? zoneConfig.label : 'Ingen data'}
        </div>
      </div>
    </div>
  )
}
