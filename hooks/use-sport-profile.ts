'use client'

import { useState, useEffect } from 'react'
import { SportType } from '@prisma/client'

export interface SportProfile {
  id: string
  clientId: string
  primarySport: SportType
  secondarySports: SportType[]
  onboardingCompleted: boolean
  onboardingStep: number
}

interface UseSportProfileResult {
  sportProfile: SportProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Sport icons for display
export const SPORT_ICONS: Record<SportType, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SKIING: '⛷️',
  TRIATHLON: '🏊',
  HYROX: '💪',
  GENERAL_FITNESS: '🏋️',
  FUNCTIONAL_FITNESS: '🔥',
  SWIMMING: '🏊‍♂️',
  STRENGTH: '🏋️',
  TEAM_FOOTBALL: '⚽',
  TEAM_ICE_HOCKEY: '🏒',
  TEAM_HANDBALL: '🤾',
  TEAM_FLOORBALL: '🏑',
  TEAM_BASKETBALL: '🏀',
  TEAM_VOLLEYBALL: '🏐',
  TENNIS: '🎾',
  PADEL: '🎾',
}

// Sport labels for display
export const SPORT_LABELS: Record<SportType, { en: string; sv: string }> = {
  RUNNING: { en: 'Running', sv: 'Löpning' },
  CYCLING: { en: 'Cycling', sv: 'Cykling' },
  SKIING: { en: 'Cross-Country Skiing', sv: 'Längdskidåkning' },
  TRIATHLON: { en: 'Triathlon', sv: 'Triathlon' },
  HYROX: { en: 'HYROX', sv: 'HYROX' },
  GENERAL_FITNESS: { en: 'General Fitness', sv: 'Allmän Fitness' },
  FUNCTIONAL_FITNESS: { en: 'Functional Fitness', sv: 'Funktionell Fitness' },
  SWIMMING: { en: 'Swimming', sv: 'Simning' },
  STRENGTH: { en: 'Strength Training', sv: 'Styrketräning' },
  TEAM_FOOTBALL: { en: 'Football', sv: 'Fotboll' },
  TEAM_ICE_HOCKEY: { en: 'Ice Hockey', sv: 'Ishockey' },
  TEAM_HANDBALL: { en: 'Handball', sv: 'Handboll' },
  TEAM_FLOORBALL: { en: 'Floorball', sv: 'Innebandy' },
  TEAM_BASKETBALL: { en: 'Basketball', sv: 'Basket' },
  TEAM_VOLLEYBALL: { en: 'Volleyball', sv: 'Volleyboll' },
  TENNIS: { en: 'Tennis', sv: 'Tennis' },
  PADEL: { en: 'Padel', sv: 'Padel' },
}

export function useSportProfile(clientId?: string): UseSportProfileResult {
  const [sportProfile, setSportProfile] = useState<SportProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSportProfile = async () => {
    if (!clientId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/sport-profile/${clientId}`)
      const result = await response.json()

      if (response.ok && result.success) {
        setSportProfile(result.data)
      } else if (response.status === 404) {
        // No sport profile yet - that's okay
        setSportProfile(null)
      } else {
        setError(result.error || 'Failed to fetch sport profile')
      }
    } catch (err) {
      setError('Failed to fetch sport profile')
      console.error('Error fetching sport profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSportProfile()
  }, [clientId])

  return {
    sportProfile,
    isLoading,
    error,
    refetch: fetchSportProfile,
  }
}
