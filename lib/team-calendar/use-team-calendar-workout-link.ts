'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

type LinkedWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

export function useTeamCalendarWorkoutLink(workoutType: LinkedWorkoutType) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fromTeamCalendar = searchParams.get('fromTeamCalendar') === 'true'
  const teamId = searchParams.get('teamId')
  const teamEventId = searchParams.get('teamEventId')
  const eventTitle = searchParams.get('eventTitle')

  const businessSlug = useMemo(() => {
    if (!pathname) return undefined
    const match = pathname.match(/^\/([^/]+)\/coach\//)
    if (match && match[1] !== 'coach') return match[1]
    return undefined
  }, [pathname])

  const linkSavedWorkout = useCallback(async (workoutId: string | undefined, workoutName?: string | null) => {
    if (!fromTeamCalendar || !teamId || !teamEventId || !workoutId) return false

    const params = new URLSearchParams()
    if (businessSlug) params.set('businessSlug', businessSlug)

    const response = await fetch(`/api/coach/teams/${teamId}/events/${teamEventId}${params.size ? `?${params}` : ''}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
      },
      body: JSON.stringify({
        contentStatus: 'CONTENT_READY',
        linkedWorkoutType: workoutType,
        linkedWorkoutId: workoutId,
        linkedWorkoutName: workoutName || eventTitle || 'Kopplat pass',
      }),
    })

    if (!response.ok) {
      toast.error('Passet sparades, men kunde inte kopplas till lagkalendern')
      return false
    }

    toast.success('Passet kopplades till lagkalendern')
    return true
  }, [businessSlug, eventTitle, fromTeamCalendar, teamEventId, teamId, workoutType])

  return {
    fromTeamCalendar,
    teamEventId,
    teamId,
    linkSavedWorkout,
  }
}
