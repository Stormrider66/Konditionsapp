'use client'

/**
 * Athlete HR Hook
 *
 * Polls for the latest heart rate reading from any active LiveHRSession.
 * Used to pipe HR data into the live voice coach.
 */

import { useEffect, useState, useRef } from 'react'

interface AthleteHRData {
  heartRate: number | null
  zone: number | null
  stale: boolean
}

export function useAthleteHR(enabled: boolean, pollIntervalMs = 3000): AthleteHRData {
  const [data, setData] = useState<AthleteHRData>({ heartRate: null, zone: null, stale: true })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData({ heartRate: null, zone: null, stale: true })
      return
    }

    async function poll() {
      try {
        const res = await fetch('/api/athlete/live-hr/current')
        if (res.ok) {
          const json = await res.json()
          setData({
            heartRate: json.heartRate ?? null,
            zone: json.zone ?? null,
            stale: json.stale ?? true,
          })
        }
      } catch {
        // Network error — keep last known state
      }
    }

    void poll()
    intervalRef.current = setInterval(poll, pollIntervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, pollIntervalMs])

  return data
}
