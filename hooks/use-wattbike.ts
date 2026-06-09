'use client';

/**
 * React hook wrapping {@link WattbikeClient}.
 *
 * Owns one client instance for the component's lifetime, mirrors connection
 * status and the latest sample into state, and cleans up on unmount. The raw
 * client is returned too, so callers can drive ERG mode (`setTargetPower`) or
 * subscribe to the full sample stream for recording.
 *
 * Capture only works in Chrome/Edge on Android/desktop — `isSupported` is false
 * on iOS. `connect()` must be called from a user gesture (e.g. an onClick).
 */

import { useCallback, useEffect, useState } from 'react';

import { WattbikeClient } from '@/lib/integrations/wattbike';
import type {
  WattbikeClientOptions,
  WattbikeSample,
  WattbikeStatus,
} from '@/lib/integrations/wattbike';

export interface UseWattbikeResult {
  /** False on iOS / any browser without Web Bluetooth — hide the connect button. */
  isSupported: boolean;
  status: WattbikeStatus;
  /** Most recent decoded sample (power/cadence/speed), or null before any data. */
  latest: WattbikeSample | null;
  /** Last error surfaced by the client (connect failure, lost reconnect, etc.). */
  error: Error | null;
  deviceName: string | undefined;
  /** True once the trainer exposes ERG control (FTMS control point). */
  canControl: boolean;
  /** Open the chooser and connect. Call from a click/tap handler. */
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Set ERG target wattage (no-op if the device can't be controlled). */
  setTargetPower: (watts: number) => Promise<void>;
  /** The underlying client — use `.on('data', …)` to record the full stream. */
  client: WattbikeClient;
}

export function useWattbike(
  options: WattbikeClientOptions = {},
): UseWattbikeResult {
  // One client per mount, created once. Options are read on creation only —
  // changing filters mid-session would mean reconnecting anyway.
  const [client] = useState(() => new WattbikeClient(options));

  const [status, setStatus] = useState<WattbikeStatus>('disconnected');
  const [latest, setLatest] = useState<WattbikeSample | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [deviceName, setDeviceName] = useState<string | undefined>(undefined);
  const [canControl, setCanControl] = useState(false);

  useEffect(() => {
    const offStatus = client.on('status', (s) => {
      setStatus(s);
      if (s === 'connected') {
        setDeviceName(client.getDeviceName());
        setCanControl(client.canControl());
      }
      if (s === 'disconnected') setCanControl(false);
    });
    const offData = client.on('data', (sample) => setLatest(sample));
    const offError = client.on('error', (err) => setError(err));

    return () => {
      offStatus();
      offData();
      offError();
      void client.disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await client.connect();
    } catch (err) {
      // User-cancelled chooser throws too; surface it but don't crash the UI.
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [client]);

  const disconnect = useCallback(async () => {
    await client.disconnect();
  }, [client]);

  const setTargetPower = useCallback(
    async (watts: number) => {
      if (!client.canControl()) return;
      await client.setTargetPower(watts);
    },
    [client],
  );

  return {
    isSupported: WattbikeClient.isSupported(),
    status,
    latest,
    error,
    deviceName,
    canControl,
    connect,
    disconnect,
    setTargetPower,
    client,
  };
}
