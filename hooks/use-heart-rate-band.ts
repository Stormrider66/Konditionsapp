'use client'

/**
 * useHeartRateBand — connect a BLE heart-rate band (chest strap / broadcast
 * watch) and stream live bpm. One band per session; connect() must run from a
 * click/tap (Web Bluetooth chooser requirement).
 *
 * `onSample` (kept in a ref) fires on every measurement notification (~1 Hz),
 * so callers can accumulate per-segment HR without re-render coupling.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { HeartRateBandClient, type HeartRateStatus } from '@/lib/integrations/heart-rate/client'

export interface UseHeartRateBandResult {
  isSupported: boolean
  status: HeartRateStatus
  bpm: number | null
  deviceName: string | null
  connect: (opts?: { acceptAll?: boolean }) => Promise<void>
  disconnect: () => Promise<void>
}

export function useHeartRateBand(onSample?: (bpm: number) => void): UseHeartRateBandResult {
  const clientRef = useRef<HeartRateBandClient | null>(null)
  const [status, setStatus] = useState<HeartRateStatus>('disconnected')
  const [bpm, setBpm] = useState<number | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)

  const onSampleRef = useRef(onSample)
  useEffect(() => {
    onSampleRef.current = onSample
  })

  const getClient = useCallback((): HeartRateBandClient => {
    if (!clientRef.current) {
      const client = new HeartRateBandClient()
      client.on('status', (next) => {
        setStatus(next)
        setDeviceName(client.getDeviceName())
        if (next === 'disconnected') setBpm(null)
      })
      client.on('data', (value) => {
        setBpm(value)
        onSampleRef.current?.(value)
      })
      clientRef.current = client
    }
    return clientRef.current
  }, [])

  useEffect(() => {
    return () => {
      void clientRef.current?.disconnect().catch(() => {})
    }
  }, [])

  const connect = useCallback(
    (opts?: { acceptAll?: boolean }) => getClient().connect(opts),
    [getClient]
  )
  const disconnect = useCallback(() => getClient().disconnect(), [getClient])

  return {
    isSupported: HeartRateBandClient.isSupported(),
    status,
    bpm,
    deviceName,
    connect,
    disconnect,
  }
}
