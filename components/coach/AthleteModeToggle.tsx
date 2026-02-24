'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { User, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAthleteModeCookie, setAthleteModeCookie, clearAthleteModeCookie } from '@/lib/athlete-mode-client'

interface AthleteModeStatus {
  canUseAthleteMode: boolean
  hasAthleteProfile: boolean
  isAthleteModeActive: boolean
  athleteProfile: {
    id: string
    name: string
  } | null
  businessSlug: string | null
}

interface AthleteModeToggleProps {
  variant?: 'dropdown' | 'button'
  className?: string
}

/**
 * Extract business slug from pathname if present
 * Paths like /star-by-thomson/coach/dashboard -> 'star-by-thomson'
 * Paths like /coach/dashboard -> null
 */
function extractBusinessSlug(pathname: string): string | null {
  // Skip known top-level routes
  const topLevelRoutes = ['coach', 'athlete', 'admin', 'api', 'login', 'register', 'test', 'clients', 'teams']
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length > 0 && !topLevelRoutes.includes(segments[0])) {
    // First segment might be a business slug
    return segments[0]
  }

  return null
}

export function AthleteModeToggle({ variant = 'dropdown', className }: AthleteModeToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [status, setStatus] = useState<AthleteModeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Extract business slug from current path, falling back to API-provided slug
  const urlBusinessSlug = extractBusinessSlug(pathname)
  const businessSlug = urlBusinessSlug || status?.businessSlug || null

  // Determine if we're currently on an athlete route
  const isOnAthleteRoute = pathname.includes('/athlete/')

  // Fetch athlete mode status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/athlete-mode/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
      } else {
        // 401 is expected when not authenticated - only log unexpected errors
        if (response.status !== 401) {
          console.error('[AthleteModeToggle] API returned error:', data.error)
        }
        // Set a default status so the component still renders
        setStatus({
          canUseAthleteMode: false,
          hasAthleteProfile: false,
          isAthleteModeActive: false,
          athleteProfile: null,
          businessSlug: null,
        })
      }
    } catch (error) {
      console.error('[AthleteModeToggle] Failed to fetch status:', error)
      // Set a default status so the component still renders
      setStatus({
        canUseAthleteMode: false,
        hasAthleteProfile: false,
        isAthleteModeActive: false,
        athleteProfile: null,
        businessSlug: null,
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleToggle = async () => {
    if (!status) return

    // If no athlete profile, redirect to setup
    if (!status.hasAthleteProfile) {
      const setupPath = businessSlug
        ? `/${businessSlug}/coach/settings/athlete-profile`
        : '/coach/settings/athlete-profile'
      router.push(setupPath)
      return
    }

    setIsLoading(true)

    try {
      // Toggle based on current route, not cookie state
      // If on athlete route -> disable (go to coach)
      // If on coach route -> enable (go to athlete)
      const newEnabled = !isOnAthleteRoute

      const response = await fetch('/api/athlete-mode/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled, businessSlug }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local cookie state
        if (newEnabled) {
          setAthleteModeCookie(true)
        } else {
          clearAthleteModeCookie()
        }

        // Update local status
        setStatus((prev) => prev ? { ...prev, isAthleteModeActive: newEnabled } : null)

        toast({
          title: newEnabled ? 'Athlete Mode Activated' : 'Athlete Mode Deactivated',
          description: newEnabled
            ? 'You are now viewing your athlete dashboard'
            : 'You are back to coach mode',
        })

        // Redirect to appropriate dashboard
        router.push(data.data.redirectTo)
        router.refresh()
      } else {
        throw new Error(data.error || 'Failed to toggle athlete mode')
      }
    } catch (error) {
      console.error('Failed to toggle athlete mode:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle athlete mode',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while fetching
  if (isFetching) {
    if (variant === 'dropdown') {
      return (
        <DropdownMenuItem disabled className="cursor-default">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading...
        </DropdownMenuItem>
      )
    }
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  // Don't show anything if user can't use athlete mode (not a coach)
  if (!status?.canUseAthleteMode) {
    return null
  }

  // Determine button text based on current route
  const getButtonText = () => {
    if (!status?.hasAthleteProfile) {
      return 'Set Up Athlete Profile'
    }
    // Show based on current route, not cookie state
    return isOnAthleteRoute ? 'Exit Athlete Mode' : 'Switch to Athlete Mode'
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isOnAthleteRoute ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <User className="h-4 w-4 mr-2" />
        )}
        {isOnAthleteRoute ? 'Exit Athlete Mode' : 'Athlete Mode'}
      </Button>
    )
  }

  // Dropdown variant
  return (
    <DropdownMenuItem
      onClick={handleToggle}
      disabled={isLoading}
      className="cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <User className="h-4 w-4 mr-2" />
      )}
      {getButtonText()}
    </DropdownMenuItem>
  )
}
