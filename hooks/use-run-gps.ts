'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PhoneRunRawSample } from '@/lib/outdoor-run/session-summary'

export type RunGpsStatus = 'idle' | 'tracking' | 'error'

export interface RunGpsState {
  isSupported: boolean
  status: RunGpsStatus
  latest: PhoneRunRawSample | null
  error: string | null
  start: (startedAt: Date, getHeartRate?: () => number | null) => void
  stop: () => void
}

function getGpsSupportSnapshot(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
}

function subscribeGpsSupportSnapshot(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const id = window.setTimeout(onStoreChange, 0)
  return () => window.clearTimeout(id)
}

export function useRunGps(onSample: (sample: PhoneRunRawSample) => void): RunGpsState {
  const watchIdRef = useRef<number | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const getHeartRateRef = useRef<(() => number | null) | null>(null)
  const onSampleRef = useRef(onSample)

  const [status, setStatus] = useState<RunGpsStatus>('idle')
  const [latest, setLatest] = useState<PhoneRunRawSample | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isSupported = useSyncExternalStore(subscribeGpsSupportSnapshot, getGpsSupportSnapshot, () => false)

  useEffect(() => {
    onSampleRef.current = onSample
  }, [onSample])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    startedAtRef.current = null
    getHeartRateRef.current = null
    setStatus('idle')
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback((startedAt: Date, getHeartRate?: () => number | null) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error')
      setError('Location is not available in this browser')
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    startedAtRef.current = startedAt
    getHeartRateRef.current = getHeartRate ?? null
    setLatest(null)
    setError(null)
    setStatus('tracking')

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const baseStartedAt = startedAtRef.current ?? startedAt
        const elapsedSec = Math.max(0, Math.round((Date.now() - baseStartedAt.getTime()) / 1000))
        const coords = position.coords
        const heartRate = getHeartRateRef.current?.() ?? undefined
        const sample: PhoneRunRawSample = {
          elapsedSec,
          timestamp: new Date(position.timestamp).toISOString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude ?? undefined,
          speed: coords.speed ?? undefined,
          heading: coords.heading ?? undefined,
          heartRate: heartRate ?? undefined,
        }

        setLatest(sample)
        onSampleRef.current(sample)
      },
      (geoError) => {
        setStatus('error')
        setError(geoError.message || 'Could not read location')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 12_000,
      }
    )
  }, [])

  return {
    isSupported,
    status,
    latest,
    error,
    start,
    stop,
  }
}
