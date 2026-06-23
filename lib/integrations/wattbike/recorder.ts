/**
 * WattbikeRecorder — turns the live BLE sample stream into the `rawData`
 * payloads that `POST /api/ergometer-tests` expects, per protocol.
 *
 * The BLE notifications arrive at an irregular ~1–4 Hz. Every ergometer
 * protocol is defined on **1-second power samples**, so the recorder bins the
 * stream to 1 Hz (averaging within each second, carrying the last value across
 * gaps) and derives the protocol-specific shape from that series. All the heavy
 * physiology (CP, W′, FTP, MAP, zones) stays in `lib/training-engine/ergometer`
 * — this module only does capture-side resampling + assembly.
 *
 * Pure logic, no BLE / DOM dependencies — unit-testable in isolation.
 */

import type { WattbikeSample } from './types';
import {
  buildQuickErgAnalysisFromBluetooth,
  type QuickErgSessionAnalysis,
} from '@/lib/quick-erg/session-summary';

// Prisma enums are string unions at the type level, so type-only imports keep
// the generated client out of the browser bundle.
import type { ErgometerType, ErgometerTestProtocol } from '@prisma/client';

// ---- rawData shapes (match the Zod schemas in app/api/ergometer-tests) ------

export interface WattbikePeakPowerRawData {
  duration: number; // 6 | 30
  peakPower: number; // instantaneous max (watts)
  avgPower: number; // mean over the best `duration`-second window
  minPower?: number; // 30s sprint only — fatigue floor
  powerSamples: number[]; // 1 Hz samples for the window
  peakRPM?: number;
  avgRPM?: number;
}

export interface WattbikeCP3MinRawData {
  powerSamples: number[]; // ~180 samples @ 1 Hz (route accepts 170–190)
  avgHR?: number;
  maxHR?: number;
}

export interface WattbikeTT20MinRawData {
  avgPower: number;
  normalizedPower?: number;
  variabilityIndex?: number; // NP / avgPower
  avgCadence?: number;
  correctionFactor?: number; // 0.95 cyclists, 0.90 non-cyclists
}

export interface WattbikeMapRampStage {
  minute: number;
  targetPower: number;
  actualPower: number;
  hr?: number;
  completed: boolean;
}

export interface WattbikeMapRampRawData {
  startPower: number;
  increment: number;
  stages: WattbikeMapRampStage[];
  peakPower?: number;
  mapWatts: number; // last completed minute's average power
  maxHR?: number;
  timeToExhaustion: number; // total seconds
}

export type WattbikeRawData =
  | WattbikePeakPowerRawData
  | WattbikeCP3MinRawData
  | WattbikeTT20MinRawData
  | WattbikeMapRampRawData;

/** Live snapshot for driving capture UI. */
export interface WattbikeLiveMetrics {
  elapsedSec: number;
  sampleCount: number;
  power: number; // last ~3 s smoothed power
  avgPower: number;
  maxPower: number;
  cadence?: number;
  heartRate?: number;
  distanceMeters?: number;
  calories?: number;
  pace?: number;
  strokeRate?: number;
  speed?: number;
}

/** Base fields shared by every ergometer-test request body. */
export interface WattbikeTestMeta {
  clientId: string;
  /** ISO date; defaults to now when assembling the request body. */
  testDate?: string;
  airResistance?: number; // 1–10 (Wattbike)
  magnetResistance?: number; // 1–4 (Wattbike)
  conditions?: { temperature?: number; humidity?: number; altitude?: number };
  avgHR?: number;
  maxHR?: number;
  rpe?: number; // 1–10
  notes?: string;
}

/** Full body for POST /api/ergometer-tests (Wattbike subset). */
export interface WattbikeErgometerTestBody extends WattbikeTestMeta {
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  rawData: WattbikeRawData;
  testDate: string;
}

interface BinnedSeries {
  seconds: number;
  power: number[]; // length === seconds
  cadence: Array<number | undefined>;
  hr: Array<number | undefined>;
}

// ---- helpers ---------------------------------------------------------------

const isNum = (v: number | undefined): v is number => typeof v === 'number';
const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const sampleCadence = (s: WattbikeSample): number | undefined =>
  isNum(s.cadence) ? s.cadence : s.avgCadence;
const sampleSpeed = (s: WattbikeSample): number | undefined =>
  isNum(s.speed) ? s.speed : s.avgSpeed;

/** Normalized Power: 30 s rolling average → 4th power → mean → 4th root. */
function normalizedPower(power: number[]): number | undefined {
  if (power.length < 30) return undefined;
  const rolling: number[] = [];
  let windowSum = 0;
  for (let i = 0; i < power.length; i++) {
    windowSum += power[i];
    if (i >= 30) windowSum -= power[i - 30];
    if (i >= 29) rolling.push(windowSum / 30);
  }
  const mean4 = mean(rolling.map((p) => p ** 4));
  return Math.round(mean4 ** 0.25);
}

/** Best (highest-average) `w`-second window. Returns the window's start index. */
function bestWindow(power: number[], w: number): { avg: number; startIdx: number } {
  if (power.length <= w) return { avg: mean(power), startIdx: 0 };
  let sum = 0;
  for (let i = 0; i < w; i++) sum += power[i];
  let best = sum;
  let bestIdx = 0;
  for (let i = w; i < power.length; i++) {
    sum += power[i] - power[i - w];
    if (sum > best) {
      best = sum;
      bestIdx = i - w + 1;
    }
  }
  return { avg: best / w, startIdx: bestIdx };
}

// ---- recorder --------------------------------------------------------------

export class WattbikeRecorder {
  private samples: WattbikeSample[] = [];
  private t0: number | null = null;
  private running = false;

  /** Begin a fresh recording. Call before streaming samples in. */
  start(): void {
    this.samples = [];
    this.t0 = null;
    this.running = true;
  }

  /** Feed one decoded sample (wire `client.on('data', s => recorder.add(s))`). */
  add(sample: WattbikeSample): void {
    if (!this.running) return;
    if (this.t0 === null) this.t0 = sample.t;
    this.samples.push(sample);
  }

  /** Stop recording. Samples are retained so the build* methods still work. */
  stop(): void {
    this.running = false;
  }

  get isRecording(): boolean {
    return this.running;
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  /** Seconds of data captured so far. */
  get elapsedSec(): number {
    if (this.t0 === null || this.samples.length === 0) return 0;
    return (this.samples[this.samples.length - 1].t - this.t0) / 1000;
  }

  /** Live snapshot for the capture UI (cheap to call on every notification). */
  liveMetrics(): WattbikeLiveMetrics {
    const { power, cadence, hr } = this.bin();
    const last = power.length;
    const recent = power.slice(Math.max(0, last - 3));
    const lastCadence = [...cadence].reverse().find(isNum);
    const lastHr = [...hr].reverse().find(isNum);
    const lastDistance = [...this.samples].reverse().find((s) => isNum(s.distance))?.distance;
    const lastCalories = [...this.samples].reverse().find((s) => isNum(s.calories))?.calories;
    const lastPace = [...this.samples].reverse().find((s) => isNum(s.pace))?.pace;
    const lastStrokeRate = [...this.samples].reverse().find((s) => isNum(s.strokeRate))?.strokeRate;
    const lastSpeed = [...this.samples].reverse().map(sampleSpeed).find(isNum);
    return {
      elapsedSec: Math.round(this.elapsedSec),
      sampleCount: this.samples.length,
      power: Math.round(mean(recent)),
      avgPower: Math.round(mean(power)),
      maxPower: Math.round(this.rawPeakPower()),
      cadence: lastCadence,
      heartRate: lastHr,
      distanceMeters: lastDistance === undefined ? undefined : Math.round(lastDistance),
      calories: lastCalories === undefined ? undefined : Math.round(lastCalories),
      pace: lastPace === undefined ? undefined : Math.round(lastPace),
      strokeRate: lastStrokeRate === undefined ? undefined : Math.round(lastStrokeRate),
      speed: lastSpeed === undefined ? undefined : Math.round(lastSpeed * 10) / 10,
    };
  }

  /** Open-ended free-session export for Quick Erg Session persistence. */
  quickErgSessionAnalysis(): QuickErgSessionAnalysis {
    return buildQuickErgAnalysisFromBluetooth(this.samples);
  }

  // -- protocol rawData builders --------------------------------------------

  /** 6 s or 30 s peak-power sprint (PEAK_POWER_6S / PEAK_POWER_30S). */
  peakPowerRawData(duration: 6 | 30): WattbikePeakPowerRawData {
    const { power, cadence } = this.bin();
    const { avg, startIdx } = bestWindow(power, duration);
    const window = power.slice(startIdx, startIdx + duration);
    const cadWindow = cadence
      .slice(startIdx, startIdx + duration)
      .filter(isNum);

    const result: WattbikePeakPowerRawData = {
      duration,
      peakPower: Math.round(this.rawPeakPower()),
      avgPower: Math.round(avg),
      powerSamples: window,
    };
    if (cadWindow.length) {
      result.peakRPM = Math.round(Math.max(...cadWindow));
      result.avgRPM = Math.round(mean(cadWindow));
    }
    if (duration === 30 && window.length) {
      result.minPower = Math.round(Math.min(...window));
    }
    return result;
  }

  /**
   * 3-minute all-out test (CP_3MIN_ALL_OUT). The route requires 170–190
   * samples, so this assumes the recording IS the 3-minute effort. If more than
   * 190 s were captured, the first 180 s (the effort) are kept.
   */
  cp3MinRawData(): WattbikeCP3MinRawData {
    const { power, hr } = this.bin();
    const powerSamples = power.length > 190 ? power.slice(0, 180) : power;
    const hrDefined = hr.filter(isNum);

    const result: WattbikeCP3MinRawData = { powerSamples };
    if (hrDefined.length) {
      result.avgHR = Math.round(mean(hrDefined));
      result.maxHR = Math.round(Math.max(...hrDefined));
    }
    return result;
  }

  /** 20-minute FTP test (TT_20MIN). Averages the full recorded effort. */
  tt20MinRawData(opts: { correctionFactor?: number } = {}): WattbikeTT20MinRawData {
    const { power, cadence } = this.bin();
    const avgPower = mean(power);
    const np = normalizedPower(power);
    const cadDefined = cadence.filter(isNum);

    const result: WattbikeTT20MinRawData = {
      avgPower: Math.round(avgPower),
      correctionFactor: opts.correctionFactor ?? 0.95,
    };
    if (np !== undefined && avgPower > 0) {
      result.normalizedPower = np;
      result.variabilityIndex = Math.round((np / avgPower) * 100) / 100;
    }
    if (cadDefined.length) result.avgCadence = Math.round(mean(cadDefined));
    return result;
  }

  /**
   * MAP ramp test (MAP_RAMP). `startPower`/`increment` describe the ramp the
   * bike was driven with (typically via WattbikeClient.setTargetPower). Each
   * whole minute becomes a stage; the trailing partial minute is "not completed".
   */
  mapRampRawData(opts: { startPower: number; increment: number }): WattbikeMapRampRawData {
    const { power, hr } = this.bin();
    const totalSeconds = power.length;
    const minutes = Math.ceil(totalSeconds / 60);
    const stages: WattbikeMapRampStage[] = [];

    for (let m = 0; m < minutes; m++) {
      const start = m * 60;
      const end = Math.min(start + 60, totalSeconds);
      const segPower = power.slice(start, end);
      const segHr = hr.slice(start, end).filter(isNum);
      const stage: WattbikeMapRampStage = {
        minute: m + 1,
        targetPower: opts.startPower + opts.increment * m,
        actualPower: Math.round(mean(segPower)),
        completed: end - start >= 60, // full minute elapsed
      };
      if (segHr.length) stage.hr = Math.round(mean(segHr));
      stages.push(stage);
    }

    const completed = stages.filter((s) => s.completed);
    const mapWatts = completed.length
      ? completed[completed.length - 1].actualPower // last full minute (ramp peak)
      : stages[0]?.actualPower ?? 0;
    const allHr = hr.filter(isNum);

    const result: WattbikeMapRampRawData = {
      startPower: opts.startPower,
      increment: opts.increment,
      stages,
      mapWatts,
      timeToExhaustion: totalSeconds,
      peakPower: Math.round(this.rawPeakPower()),
    };
    if (allHr.length) result.maxHR = Math.round(Math.max(...allHr));
    return result;
  }

  // -- internals ------------------------------------------------------------

  private rawPeakPower(): number {
    let max = 0;
    for (const s of this.samples) if (isNum(s.power) && s.power > max) max = s.power;
    return max;
  }

  /** Bin the irregular stream into 1 Hz arrays (carry-forward across gaps). */
  private bin(): BinnedSeries {
    if (this.samples.length === 0 || this.t0 === null) {
      return { seconds: 0, power: [], cadence: [], hr: [] };
    }
    const t0 = this.t0;
    const tEnd = this.samples[this.samples.length - 1].t;
    // One bin per elapsed second, inclusive of the final sample's second.
    const seconds = Math.floor((tEnd - t0) / 1000) + 1;

    const acc = Array.from({ length: seconds }, () => ({
      p: 0,
      pc: 0,
      c: 0,
      cc: 0,
      h: 0,
      hc: 0,
    }));
    for (const s of this.samples) {
      let idx = Math.floor((s.t - t0) / 1000);
      if (idx < 0) idx = 0;
      if (idx >= seconds) idx = seconds - 1;
      const b = acc[idx];
      if (isNum(s.power)) {
        b.p += s.power;
        b.pc++;
      }
      const cadenceValue = sampleCadence(s);
      if (isNum(cadenceValue)) {
        b.c += cadenceValue;
        b.cc++;
      }
      if (isNum(s.heartRate)) {
        b.h += s.heartRate;
        b.hc++;
      }
    }

    const power: number[] = [];
    const cadence: Array<number | undefined> = [];
    const hr: Array<number | undefined> = [];
    let lastP = 0;
    let lastC: number | undefined;
    let lastH: number | undefined;
    for (let i = 0; i < seconds; i++) {
      const b = acc[i];
      if (b.pc > 0) lastP = b.p / b.pc;
      power.push(Math.round(lastP));
      if (b.cc > 0) lastC = b.c / b.cc;
      cadence.push(lastC === undefined ? undefined : Math.round(lastC));
      if (b.hc > 0) lastH = b.h / b.hc;
      hr.push(lastH === undefined ? undefined : Math.round(lastH));
    }
    return { seconds, power, cadence, hr };
  }
}

// ---- request assembly + submission -----------------------------------------

/** Assemble a POST /api/ergometer-tests body for a Wattbike test. */
export function buildErgometerTestRequest(
  testProtocol: ErgometerTestProtocol,
  rawData: WattbikeRawData,
  meta: WattbikeTestMeta,
): WattbikeErgometerTestBody {
  return {
    ...meta,
    ergometerType: 'WATTBIKE' as ErgometerType,
    testProtocol,
    rawData,
    testDate: meta.testDate ?? new Date().toISOString(),
  };
}

/**
 * POST an assembled test body to the existing ergometer-tests endpoint.
 * Runs server-side analysis (CP/FTP/MAP/zones) and persists an ErgometerFieldTest.
 * Throws with the server message on a non-2xx response.
 */
export async function submitWattbikeTest(
  body: WattbikeErgometerTestBody,
  init: { endpoint?: string; fetchImpl?: typeof fetch } = {},
): Promise<unknown> {
  const doFetch = init.fetchImpl ?? fetch;
  const res = await doFetch(init.endpoint ?? '/api/ergometer-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Failed to save test (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) message = err.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return res.json();
}
