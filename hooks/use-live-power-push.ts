'use client';

/**
 * useLivePowerPush
 *
 * While `enabled` (typically: a Wattbike is connected), streams the athlete's
 * live power/cadence to whatever active LiveHR team session they belong to, so a
 * coach sees them on the live team grid alongside heart-rate athletes.
 *
 * No-op when the athlete isn't in a session — it polls for an active session and
 * only POSTs power once one exists. Reuses GET /api/athlete/live-hr/push for
 * session discovery and POSTs to /api/athlete/live-power/push.
 */

import { useEffect, useRef, useState } from 'react';

import type { WattbikeClient } from '@/lib/integrations/wattbike';
import type { LiveHRMachineType } from '@/lib/live-hr/types';

const SESSION_POLL_MS = 15_000;
const PUSH_INTERVAL_MS = 2_000;

export function useLivePowerPush(
  client: WattbikeClient | null,
  enabled: boolean,
  machineType?: LiveHRMachineType,
): { activeSessionId: string | null } {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const latestRef = useRef<{ power?: number; cadence?: number; strokeRate?: number; heartRate?: number } | null>(null);

  // Track the most recent sample without re-rendering. The client may swap
  // mid-session (multi-erg workouts route per segment) — re-subscribe and drop
  // the previous machine's stale sample.
  useEffect(() => {
    latestRef.current = null;
    if (!client) return;
    const off = client.on('data', (s) => {
      latestRef.current = { power: s.power, cadence: s.cadence, strokeRate: s.strokeRate, heartRate: s.heartRate };
    });
    return off;
  }, [client]);

  // Discover the athlete's active session while enabled. (A poll clears the id
  // when a session ends; no synchronous reset needed when disabled.)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/athlete/live-hr/push', { method: 'GET' });
        if (!res.ok) return;
        const json = (await res.json()) as { activeSession?: { sessionId?: string } | null };
        if (!cancelled) setActiveSessionId(json?.activeSession?.sessionId ?? null);
      } catch {
        /* offline / transient — try again next tick */
      }
    };
    void poll();
    const id = setInterval(poll, SESSION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  // Stream power to the session.
  useEffect(() => {
    if (!enabled || !activeSessionId) return;
    const id = setInterval(() => {
      const s = latestRef.current;
      if (!s || typeof s.power !== 'number') return;
      void fetch('/api/athlete/live-power/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          power: Math.round(s.power),
          cadence: typeof s.cadence === 'number'
            ? Math.round(s.cadence)
            : typeof s.strokeRate === 'number'
              ? Math.round(s.strokeRate)
              : undefined,
          heartRate: typeof s.heartRate === 'number' ? Math.round(s.heartRate) : undefined,
          ergometerType: machineType,
        }),
      }).catch(() => {});
    }, PUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, activeSessionId, machineType]);

  return { activeSessionId };
}
