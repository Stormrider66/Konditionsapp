'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ScreenWakeLockSentinel = {
  readonly released?: boolean
  release: () => Promise<void>
  addEventListener?: (
    type: 'release',
    listener: () => void,
    options?: AddEventListenerOptions
  ) => void
}

type ScreenWakeLock = {
  request: (type: 'screen') => Promise<ScreenWakeLockSentinel>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: ScreenWakeLock
}

interface UseScreenWakeLockOptions {
  enabled?: boolean
  reacquireOnVisibilityChange?: boolean
}

interface UseScreenWakeLockResult {
  isSupported: boolean
  isActive: boolean
  error: Error | null
  request: () => Promise<boolean>
  release: () => Promise<void>
}

function getScreenWakeLock(): ScreenWakeLock | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as NavigatorWithWakeLock).wakeLock
}

export function useScreenWakeLock({
  enabled = true,
  reacquireOnVisibilityChange = true,
}: UseScreenWakeLockOptions = {}): UseScreenWakeLockResult {
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null)
  const shouldHoldRef = useRef(enabled)
  const requestingRef = useRef(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const clearSentinel = useCallback((sentinel: ScreenWakeLockSentinel) => {
    if (sentinelRef.current !== sentinel) return
    sentinelRef.current = null
    setIsActive(false)
  }, [])

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    setIsActive(false)

    if (sentinel && !sentinel.released) {
      await sentinel.release().catch(() => {})
    }
  }, [])

  const request = useCallback(async () => {
    const wakeLock = getScreenWakeLock()

    if (
      !wakeLock ||
      requestingRef.current ||
      typeof document === 'undefined' ||
      document.visibilityState !== 'visible'
    ) {
      return false
    }

    if (sentinelRef.current && !sentinelRef.current.released) {
      setIsActive(true)
      return true
    }

    requestingRef.current = true

    try {
      const sentinel = await wakeLock.request('screen')

      if (!shouldHoldRef.current) {
        await sentinel.release().catch(() => {})
        return false
      }

      sentinelRef.current = sentinel
      setError(null)
      setIsActive(true)
      sentinel.addEventListener?.('release', () => clearSentinel(sentinel), { once: true })
      return true
    } catch (err) {
      if (shouldHoldRef.current) {
        sentinelRef.current = null
        setIsActive(false)
        setError(err instanceof Error ? err : new Error('Could not request screen wake lock'))
      }
      return false
    } finally {
      requestingRef.current = false
    }
  }, [clearSentinel])

  useEffect(() => {
    shouldHoldRef.current = enabled

    if (!enabled) {
      return
    }

    const requestId = window.setTimeout(() => {
      void request()
    }, 0)

    return () => {
      shouldHoldRef.current = false
      window.clearTimeout(requestId)
      void release()
    }
  }, [enabled, release, request])

  useEffect(() => {
    if (!enabled || !reacquireOnVisibilityChange || typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldHoldRef.current) {
        void request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, reacquireOnVisibilityChange, request])

  return {
    isSupported: Boolean(getScreenWakeLock()),
    isActive,
    error,
    request,
    release,
  }
}
