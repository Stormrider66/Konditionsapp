# Ergs over Web Bluetooth (FTMS)

Live **power / cadence / speed** from a Wattbike Atom — and any FTMS-compatible
smart trainer or airbike (e.g. Rogue Echo V3) — plus live **power / pace /
stroke rate** from a Concept2 PM5 (RowErg and SkiErg; both notify FTMS *Rower
Data*, PM5 firmware >150). Read directly in the browser over Bluetooth, with
optional **ERG (target-power) control** for ramp / FTP protocols on bikes with
a motor brake (air-resistance machines have no target to set). No API key, no
vendor account, no partner agreement: the machines advertise as standard BLE
fitness machines, the same way Zwift and ErgZone read them.

After connect, `client.getMachineKind()` (or `machineKind` from the hook)
reports `'bike'` or `'rower'` so the UI can pick watts/rpm vs pace/spm.

## ⚠️ Platform constraint (read this first)

Web Bluetooth exists in **Chrome / Edge / Android Chrome** only. **Safari and
every iOS browser lack `navigator.bluetooth`** — Apple has never shipped it. So:

| User device | Can capture? | Can view results? |
| --- | --- | --- |
| Android phone (Chrome) | ✅ self-serve | ✅ |
| Desktop (Chrome/Edge) | ✅ | ✅ |
| iPhone / iPad | ❌ never | ✅ (results are server-side) |

**iOS escape hatch — no file transfer needed.** Because trainomics stores
sessions server-side, the capture device is just a Bluetooth bridge. Run a
**coach capture station**: the coach uses one Android phone/tablet, picks the
athlete from the roster, runs the test, and the data saves to *that athlete's*
account. The iOS athlete then opens trainomics in Safari and sees their result —
nothing is exported or transferred. Gate the connect button on `isSupported`.

## Setup

```bash
npm i -D @types/web-bluetooth
```

(The runtime needs nothing — there are no dependencies. The types are dev-only.)

Web Bluetooth also requires **HTTPS** (trainomics already runs on it) and a
**user gesture** to open the device chooser — call `connect()` from an onClick,
never on mount.

## Usage — React

```tsx
'use client';
import { useEffect } from 'react';
import { useWattbike } from '@/hooks/use-wattbike';

export function WattbikeCapture({ athleteId }: { athleteId: string }) {
  const wb = useWattbike();

  // Record the full sample stream (the hook only keeps the latest in state).
  useEffect(() => {
    const samples: typeof wb.latest[] = [];
    const off = wb.client.on('data', (s) => samples.push(s));
    return off;
  }, [wb.client]);

  if (!wb.isSupported) {
    return <p>Capture needs Chrome on Android or desktop. On iPhone, ask your
      coach to run the test on their Android device — results show up here.</p>;
  }

  return (
    <div>
      <button onClick={() => wb.connect()} disabled={wb.status !== 'disconnected'}>
        {wb.status === 'connected' ? `Connected: ${wb.deviceName}` : 'Connect Wattbike'}
      </button>
      <div>Power: {wb.latest?.power ?? '–'} W · Cadence: {Math.round(wb.latest?.cadence ?? 0)} rpm</div>
      {wb.canControl && (
        <button onClick={() => wb.setTargetPower(250)}>ERG 250 W</button>
      )}
    </div>
  );
}
```

## Usage — vanilla client (no React)

```ts
import { WattbikeClient } from '@/lib/integrations/wattbike';

const client = new WattbikeClient();
client.on('data', (s) => console.log(s.power, s.cadence));
client.on('status', (s) => console.log('status', s));

await client.connect();          // from a user gesture
await client.setTargetPower(220); // ERG ramp step (if canControl())
// …later…
await client.disconnect();
```

## What you get — and what you don't

Over standard BLE the bike exposes **power, cadence, speed** (and HR if a strap
is paired). That is everything a MAP / FTP / ramp / W′ test needs. The ~37 deep
Wattbike metrics (polar view, L/R balance, pedal-stroke analysis) **never leave
the Wattbike Hub** — don't build UI that promises them.

The client prefers **FTMS Indoor Bike Data** (`0x2AD2`), which delivers power and
cadence as direct values, and falls back to the **Cycling Power** service
(`0x2A63`), deriving cadence from crank-revolution deltas. ERG control rides the
**FTMS Control Point** (`0x2AD9`) and is only available on the FTMS path.

## Recording a test (`recorder.ts`)

The whole persistence + physiology stack already exists: `ErgometerType.WATTBIKE`
+ protocols live in `prisma/schema/testing.prisma`, the calculators in
`lib/training-engine/ergometer`, and `POST /api/ergometer-tests` runs the
analysis and saves an `ErgometerFieldTest`. The Wattbike client only needs to
turn the live BLE stream into the `rawData` each protocol expects.

`WattbikeRecorder` does exactly that: it bins the irregular ~1–4 Hz stream to
1-second samples and emits the protocol-specific shape. The existing engine then
computes CP / W′ / FTP / MAP / training zones.

```ts
import {
  WattbikeRecorder,
  buildErgometerTestRequest,
  submitWattbikeTest,
} from '@/lib/integrations/wattbike';

const recorder = new WattbikeRecorder();
recorder.start();
client.on('data', (s) => recorder.add(s)); // pipe the BLE stream in
// …UI shows recorder.liveMetrics() (power / cadence / elapsed) during the effort…
recorder.stop();

// Build the rawData for the protocol that was run, then save:
const rawData = recorder.tt20MinRawData();                  // 20-min FTP test
const body = buildErgometerTestRequest('TT_20MIN', rawData, {
  clientId: athleteClientId, // attribute to the athlete on the bike
  airResistance: 5,
  rpe: 9,
});
await submitWattbikeTest(body); // → ErgometerFieldTest, with FTP + zones computed
```

Protocol builders, each matching the `/api/ergometer-tests` Zod contract:

| Method | Protocol | Notes |
| --- | --- | --- |
| `peakPowerRawData(6)` | `PEAK_POWER_6S` | best 6 s window + instantaneous peak |
| `peakPowerRawData(30)` | `PEAK_POWER_30S` | adds `minPower` (fatigue floor) |
| `cp3MinRawData()` | `CP_3MIN_ALL_OUT` | ~180 × 1 Hz samples → CP + W′ |
| `tt20MinRawData()` | `TT_20MIN` | avg power, NP, variability index → FTP |
| `mapRampRawData({startPower, increment})` | `MAP_RAMP` | per-minute stages → MAP |

For `MAP_RAMP`, drive the ramp with `client.setTargetPower(startPower + step*minute)`
(ERG mode), then pass the same `startPower`/`increment` to `mapRampRawData`.

## Next step (not built yet)

- A **capture UI component** (e.g. `components/athlete/wattbike/`) wiring
  `useWattbike` + `WattbikeRecorder` together: connect → pick protocol → live
  power gauge → stop → save. The logic layer underneath it is complete.
