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

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { WattbikeClient } from '@/lib/integrations/wattbike';
import type {
  MachineKind,
  WattbikeClientOptions,
  WattbikeSample,
  WattbikeStatus,
} from '@/lib/integrations/wattbike';

export interface UseWattbikeResult {
  /** False on iOS / any browser without Web Bluetooth — hide the connect button. */
  isSupported: boolean;
  status: WattbikeStatus;
  /** Most recent decoded sample (power/cadence/pace), or null before any data. */
  latest: WattbikeSample | null;
  /** Last error surfaced by the client (connect failure, lost reconnect, etc.). */
  error: Error | null;
  deviceName: string | undefined;
  deviceId: string | undefined;
  /** 'bike' or 'rower' (Concept2 RowErg/SkiErg) once connected, else null. */
  machineKind: MachineKind | null;
  /** True once the trainer exposes ERG control (FTMS control point). */
  canControl: boolean;
  /** Open the chooser and connect. Call from a click/tap handler. */
  connect: () => Promise<void>;
  /** Silently reconnect to the last-paired bike (no chooser). True on success. */
  reconnectKnown: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  /** Set ERG target wattage (no-op if the device can't be controlled). */
  setTargetPower: (watts: number) => Promise<void>;
  /** The underlying client — use `.on('data', …)` to record the full stream. */
  client: WattbikeClient;
}

export interface UseWattbikeOptions extends WattbikeClientOptions {
  /** On mount, silently try reconnecting to the last-paired bike (no chooser). */
  reconnectKnownOnMount?: boolean;
}

function subscribeToBluetoothSupport(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const timeoutId = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(timeoutId);
}

function getBluetoothSupportSnapshot(): boolean {
  return WattbikeClient.isSupported();
}

function getServerBluetoothSupportSnapshot(): boolean {
  return false;
}

export function useWattbike(
  options: UseWattbikeOptions = {},
): UseWattbikeResult {
  // One client per mount, created once. Options are read on creation only —
  // changing filters mid-session would mean reconnecting anyway.
  const [client] = useState(() => new WattbikeClient(options));

  const isSupported = useSyncExternalStore(
    subscribeToBluetoothSupport,
    getBluetoothSupportSnapshot,
    getServerBluetoothSupportSnapshot,
  );
  const [status, setStatus] = useState<WattbikeStatus>('disconnected');
  const [latest, setLatest] = useState<WattbikeSample | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [deviceName, setDeviceName] = useState<string | undefined>(undefined);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [machineKind, setMachineKind] = useState<MachineKind | null>(null);
  const [canControl, setCanControl] = useState(false);

  useEffect(() => {
    const offStatus = client.on('status', (s) => {
      setStatus(s);
      if (s === 'connected') {
        setDeviceName(client.getDeviceName());
        setDeviceId(client.getDeviceId());
        setMachineKind(client.getMachineKind());
        setCanControl(client.canControl());
      }
      if (s === 'disconnected') {
        setCanControl(false);
        setMachineKind(null);
        setDeviceId(undefined);
      }
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

  const reconnectKnown = useCallback(async () => {
    setError(null);
    try {
      return await client.reconnectKnown();
    } catch {
      return false;
    }
  }, [client]);

  // Fixed-setup convenience: silently reconnect to the last bike on mount.
  useEffect(() => {
    if (!options.reconnectKnownOnMount) return;
    void client.reconnectKnown().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    isSupported,
    status,
    latest,
    error,
    deviceName,
    deviceId,
    machineKind,
    canControl,
    connect,
    reconnectKnown,
    disconnect,
    setTargetPower,
    client,
  };
}
