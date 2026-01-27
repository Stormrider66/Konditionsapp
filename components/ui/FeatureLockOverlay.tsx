'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FeatureLockOverlayProps {
  /** Whether the feature is locked */
  isLocked: boolean
  /** Reason for the lock (shown to user) */
  reason?: string
  /** URL to upgrade page */
  upgradeUrl?: string
  /** Required tier to unlock this feature */
  requiredTier?: 'STANDARD' | 'PRO'
  /** Children to render (will be blurred when locked) */
  children: React.ReactNode
  /** Additional class names */
  className?: string
  /** Locale for text */
  locale?: 'sv' | 'en'
}

export function FeatureLockOverlay({
  isLocked,
  reason,
  upgradeUrl = '/athlete/subscription',
  requiredTier = 'PRO',
  children,
  className,
  locale = 'sv',
}: FeatureLockOverlayProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  const tierLabels = {
    STANDARD: locale === 'sv' ? 'Standard' : 'Standard',
    PRO: locale === 'sv' ? 'Pro' : 'Pro',
  }

  const defaultReasons = {
    sv: `Denna funktion kräver ${tierLabels[requiredTier]}-prenumeration`,
    en: `This feature requires a ${tierLabels[requiredTier]} subscription`,
  }

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="flex flex-col items-center text-center p-6 max-w-sm">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>

          <h3 className="font-semibold text-lg mb-2">
            {locale === 'sv' ? 'Funktion låst' : 'Feature Locked'}
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            {reason || defaultReasons[locale]}
          </p>

          <Button asChild>
            <Link href={upgradeUrl}>
              {locale === 'sv' ? 'Uppgradera till ' : 'Upgrade to '}
              {tierLabels[requiredTier]}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// Card variant for wrapping entire sections
interface FeatureLockCardProps {
  isLocked: boolean
  title: string
  description: string
  upgradeUrl?: string
  requiredTier?: 'STANDARD' | 'PRO'
  icon?: React.ReactNode
  className?: string
  locale?: 'sv' | 'en'
}

export function FeatureLockCard({
  isLocked,
  title,
  description,
  upgradeUrl = '/athlete/subscription',
  requiredTier = 'PRO',
  icon,
  className,
  locale = 'sv',
}: FeatureLockCardProps) {
  if (!isLocked) {
    return null
  }

  const tierLabels = {
    STANDARD: locale === 'sv' ? 'Standard' : 'Standard',
    PRO: locale === 'sv' ? 'Pro' : 'Pro',
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-6 bg-muted/50 flex flex-col items-center text-center',
        className
      )}
    >
      {icon || (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {description}
      </p>

      <Button asChild>
        <Link href={upgradeUrl}>
          {locale === 'sv' ? 'Uppgradera till ' : 'Upgrade to '}
          {tierLabels[requiredTier]}
        </Link>
      </Button>
    </div>
  )
}

// Inline lock indicator for menus/lists
interface FeatureLockIndicatorProps {
  isLocked: boolean
  requiredTier?: 'STANDARD' | 'PRO'
  className?: string
}

export function FeatureLockIndicator({
  isLocked,
  requiredTier = 'PRO',
  className,
}: FeatureLockIndicatorProps) {
  if (!isLocked) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className
      )}
    >
      <Lock className="h-3 w-3" />
      <span>{requiredTier}</span>
    </span>
  )
}
