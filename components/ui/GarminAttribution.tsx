'use client'

/**
 * Garmin Attribution Component
 *
 * Required by Garmin API Brand Guidelines (v6.30.2025):
 * Every display of Garmin device-sourced data MUST include
 * "Garmin [device model]" attribution.
 *
 * For AI-derived/combined data, includes the required notice:
 * "Insights derived in part from Garmin device-sourced data"
 */

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface GarminAttributionProps {
  /** Garmin device model name (e.g. "Forerunner 265") */
  deviceModel?: string | null
  /** Show the "derived data" notice for AI/combined insights */
  derived?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
  /** Additional class name */
  className?: string
}

export function GarminAttribution({
  deviceModel,
  derived = false,
  size = 'sm',
  className,
}: GarminAttributionProps) {
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const logoSize = size === 'sm' ? 12 : 16

  if (derived) {
    return (
      <div className={cn('flex items-center gap-1.5', textSize, 'text-muted-foreground', className)}>
        <Image
          src="/garmin-tag-black.png"
          alt="Garmin"
          width={logoSize * 3}
          height={logoSize}
          className="dark:hidden opacity-60"
          unoptimized
        />
        <Image
          src="/garmin-tag-white.png"
          alt="Garmin"
          width={logoSize * 3}
          height={logoSize}
          className="hidden dark:block opacity-60"
          unoptimized
        />
        <span>Insights derived in part from Garmin device-sourced data</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5', textSize, 'text-muted-foreground', className)}>
      <Image
        src="/garmin-tag-black.png"
        alt="Garmin"
        width={logoSize * 3}
        height={logoSize}
        className="dark:hidden opacity-60"
        unoptimized
      />
      <Image
        src="/garmin-tag-white.png"
        alt="Garmin"
        width={logoSize * 3}
        height={logoSize}
        className="hidden dark:block opacity-60"
        unoptimized
      />
      {deviceModel ? (
        <span>{deviceModel.startsWith('Garmin') ? deviceModel : `Garmin ${deviceModel}`}</span>
      ) : (
        <span>Garmin Connect&trade;</span>
      )}
    </div>
  )
}
