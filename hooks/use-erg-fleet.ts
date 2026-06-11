'use client';

/**
 * useErgFleet — multiple live erg machines for one workout.
 *
 * A mixed-erg session ("1 min row, 1 min bike, 1 min ski × 10") needs one BLE
 * connection per machine, each tied to the equipment it stands for. The fleet
 * keys one {@link WattbikeClient} per equipment *slot* (the distinct power
 * equipment across the workout's segments — ROW, BIKE, SKI_ERG, …). Connecting
 * happens per slot, so the athlete declares which machine is which — a RowErg
 * PM5 and a SkiErg PM5 are indistinguishable over BLE (both report rower data).
 *
 * Slot → device-id assignments persist in localStorage, and remembered
 * machines silently reconnect on mount (exact id match only — with several
 * paired machines, "any known device" could be the wrong one).
 *
 * `deviceFor(equipment)` routes a segment to its machine: exact slot first,
 * then the only-connected-machine shortcut, then an unambiguous kind match.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { WattbikeClient } from '@/lib/integrations/wattbike';
import type {
  MachineKind,
  WattbikeSample,
  WattbikeStatus,
} from '@/lib/integrations/wattbike';
import { equipmentIsRowing, equipmentUsesPower } from '@/lib/cardio/focus-mode-segments';

const SLOT_STORAGE_KEY = 'erg:slotDevices:v1';
// Pre-fleet single-machine sessions remembered the bike under this key — honor
// it so existing Wattbike setups keep silently reconnecting.
const LEGACY_LAST_DEVICE_KEY = 'wattbike:lastDeviceId';
// Cap UI re-renders: each machine notifies at 1–4 Hz, and three machines at
// full rate would re-render the whole focus screen ~12×/s.
const LATEST_THROTTLE_MS = 250;

export interface ErgDevice {
  /** The equipment slot this machine is connected as ('' = generic/unspecified). */
  slot: string;
  client: WattbikeClient;
  status: WattbikeStatus;
  name?: string;
  kind: MachineKind | null;
  canControl: boolean;
  latest: WattbikeSample | null;
}

export interface UseErgFleetResult {
  /** False on iOS / any browser without Web Bluetooth — hide all connect UI. */
  isSupported: boolean;
  /** One entry per slot that has (or is getting) a machine. Keyed by slot. */
  devices: Record<string, ErgDevice>;
  connectedCount: number;
  /** Open the chooser and connect a machine as `slot`. Call from a click/tap. */
  connectSlot: (slot: string) => Promise<void>;
  disconnectSlot: (slot: string) => Promise<void>;
  /** The machine that should drive a segment with this equipment, if any. */
  deviceFor: (equipment?: string | null) => ErgDevice | undefined;
  /** Last error surfaced by any machine (connect failure, lost reconnect, …). */
  error: Error | null;
}

/** The machine kind a slot is expected to report, for mismatch warnings. */
export function expectedKindForSlot(slot: string): MachineKind | null {
  if (!slot) return null;
  if (equipmentIsRowing(slot)) return 'rower';
  if (equipmentUsesPower(slot)) return 'bike';
  return null;
}

function readAssignments(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(SLOT_STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeAssignment(slot: string, deviceId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      SLOT_STORAGE_KEY,
      JSON.stringify({ ...readAssignments(), [slot]: deviceId }),
    );
  } catch {
    /* private mode / storage disabled — non-fatal */
  }
}

export function useErgFleet(slots: string[]): UseErgFleetResult {
  const [devices, setDevices] = useState<Record<string, ErgDevice>>({});
  const [error, setError] = useState<Error | null>(null);
  const clientsRef = useRef(new Map<string, WattbikeClient>());
  const latestAtRef = useRef(new Map<string, number>());
  const slotsKey = JSON.stringify(slots);

  // Register a client under a slot and mirror its events into state. The
  // client-identity guard drops events from a replaced machine.
  const attach = useCallback((slot: string, client: WattbikeClient) => {
    clientsRef.current.set(slot, client);
    setDevices((prev) => ({
      ...prev,
      [slot]: {
        slot,
        client,
        status: client.getStatus(),
        name: client.getDeviceName(),
        kind: client.getMachineKind(),
        canControl: client.canControl(),
        latest: null,
      },
    }));

    const update = (patch: Partial<ErgDevice>) =>
      setDevices((prev) => {
        const cur = prev[slot];
        if (!cur || cur.client !== client) return prev;
        return { ...prev, [slot]: { ...cur, ...patch } };
      });

    client.on('status', (s) => {
      if (s === 'connected') {
        update({
          status: s,
          name: client.getDeviceName(),
          kind: client.getMachineKind(),
          canControl: client.canControl(),
        });
      } else {
        update({ status: s, ...(s === 'disconnected' ? { canControl: false } : {}) });
      }
    });
    client.on('data', (sample) => {
      const last = latestAtRef.current.get(slot) ?? 0;
      if (sample.t - last < LATEST_THROTTLE_MS) return;
      latestAtRef.current.set(slot, sample.t);
      update({ latest: sample });
    });
    client.on('error', (err) => setError(err));
  }, []);

  const removeSlot = useCallback((slot: string, client: WattbikeClient) => {
    if (clientsRef.current.get(slot) === client) clientsRef.current.delete(slot);
    setDevices((prev) => {
      if (prev[slot]?.client !== client) return prev;
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const connectSlot = useCallback(
    async (slot: string) => {
      setError(null);
      const existing = clientsRef.current.get(slot);
      if (existing) {
        void existing.disconnect().catch(() => {});
        removeSlot(slot, existing);
      }
      const client = new WattbikeClient();
      attach(slot, client);
      try {
        await client.connect();
        const id = client.getDeviceId();
        if (id) writeAssignment(slot, id);
      } catch (err) {
        removeSlot(slot, client);
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [attach, removeSlot],
  );

  const disconnectSlot = useCallback(
    async (slot: string) => {
      const client = clientsRef.current.get(slot);
      if (!client) return;
      await client.disconnect().catch(() => {});
      removeSlot(slot, client);
    },
    [removeSlot],
  );

  // Silently reconnect remembered machines for the workout's slots on mount.
  useEffect(() => {
    if (!WattbikeClient.isSupported()) return;
    const slotList = JSON.parse(slotsKey) as string[];
    const assignments = readAssignments();
    for (const slot of slotList) {
      if (clientsRef.current.has(slot)) continue;
      let id: string | undefined = assignments[slot];
      if (!id && slotList.length === 1) {
        // Single-machine workout with no fleet memory yet: honor the legacy key.
        try {
          id = localStorage.getItem(LEGACY_LAST_DEVICE_KEY) ?? undefined;
        } catch {
          /* ignore */
        }
      }
      if (!id) continue;
      const client = new WattbikeClient();
      attach(slot, client);
      void client
        .reconnectKnown(id, { exact: true })
        .then((ok) => {
          if (!ok) removeSlot(slot, client);
        })
        .catch(() => removeSlot(slot, client));
    }
  }, [slotsKey, attach, removeSlot]);

  // Drop every GATT link on unmount.
  useEffect(() => {
    const clients = clientsRef.current;
    return () => {
      for (const client of clients.values()) void client.disconnect().catch(() => {});
      clients.clear();
    };
  }, []);

  const deviceFor = useCallback(
    (equipment?: string | null): ErgDevice | undefined => {
      const connected = Object.values(devices).filter((d) => d.status === 'connected');
      if (equipment && devices[equipment]?.status === 'connected') return devices[equipment];
      if (connected.length === 0) return undefined;
      if (connected.length === 1) return connected[0];
      if (equipment) {
        const expected = expectedKindForSlot(equipment);
        const matches = connected.filter((d) => d.kind === expected);
        if (matches.length === 1) return matches[0];
      }
      if (devices['']?.status === 'connected') return devices[''];
      return connected[0];
    },
    [devices],
  );

  return {
    isSupported: WattbikeClient.isSupported(),
    devices,
    connectedCount: Object.values(devices).filter((d) => d.status === 'connected').length,
    connectSlot,
    disconnectSlot,
    deviceFor,
    error,
  };
}
