import { describe, expect, it } from 'vitest';

import { WattbikeRecorder, buildErgometerTestRequest } from './recorder';
import type { WattbikeSample } from './types';

/** Build a recorder fed with `count` samples at `hz`, power from `power(i)`. */
function record(
  count: number,
  power: number | ((i: number) => number),
  opts: { hz?: number; cadence?: number; hr?: number; startMs?: number } = {},
): WattbikeRecorder {
  const hz = opts.hz ?? 1;
  const stepMs = 1000 / hz;
  const start = opts.startMs ?? 1000;
  const rec = new WattbikeRecorder();
  rec.start();
  for (let i = 0; i < count; i++) {
    const sample: WattbikeSample = {
      t: start + i * stepMs,
      power: typeof power === 'function' ? power(i) : power,
      source: 'ftms',
    };
    if (opts.cadence !== undefined) sample.cadence = opts.cadence;
    if (opts.hr !== undefined) sample.heartRate = opts.hr;
    rec.add(sample);
  }
  rec.stop();
  return rec;
}

describe('WattbikeRecorder binning + live metrics', () => {
  it('averages multiple samples within the same second', () => {
    // Two samples per second at 200 and 300 W → 250 W mean for the second.
    const rec = new WattbikeRecorder();
    rec.start();
    rec.add({ t: 1000, power: 200, source: 'ftms' });
    rec.add({ t: 1500, power: 300, source: 'ftms' });
    rec.add({ t: 2000, power: 260, source: 'ftms' });
    rec.stop();
    const live = rec.liveMetrics();
    expect(live.avgPower).toBe(255); // mean of [250, 260]
    expect(live.maxPower).toBe(300); // instantaneous from raw stream
  });

  it('carries the last power across a gap second', () => {
    const rec = new WattbikeRecorder();
    rec.start();
    rec.add({ t: 0, power: 100, source: 'ftms' });
    // skip second 1 entirely
    rec.add({ t: 2000, power: 200, source: 'ftms' });
    rec.stop();
    // tt20 averages all 3 seconds: [100, 100(carried), 200] = 133
    expect(rec.tt20MinRawData().avgPower).toBe(133);
  });
});

describe('TT_20MIN raw data', () => {
  it('reports avgPower and NP=avg for constant power', () => {
    const rec = record(120, 250); // 2 min constant
    const raw = rec.tt20MinRawData();
    expect(raw.avgPower).toBe(250);
    expect(raw.normalizedPower).toBe(250);
    expect(raw.variabilityIndex).toBe(1);
    expect(raw.correctionFactor).toBe(0.95);
  });

  it('omits NP when under 30 s of data', () => {
    const raw = record(10, 250).tt20MinRawData();
    expect(raw.normalizedPower).toBeUndefined();
  });

  it('NP exceeds avg for a surging effort (VI > 1)', () => {
    // 60 s blocks alternating 100/400 W — same mean (250) but the surges are
    // slower than NP's 30 s rolling window, so NP lifts above avg.
    const rec = record(240, (i) => (Math.floor(i / 60) % 2 === 0 ? 100 : 400));
    const raw = rec.tt20MinRawData();
    expect(raw.avgPower).toBe(250);
    expect(raw.normalizedPower!).toBeGreaterThan(250);
    expect(raw.variabilityIndex!).toBeGreaterThan(1);
  });

  it('passes through a custom correction factor', () => {
    const raw = record(60, 200).tt20MinRawData({ correctionFactor: 0.9 });
    expect(raw.correctionFactor).toBe(0.9);
  });
});

describe('Peak power raw data', () => {
  it('finds the best 6 s window and instantaneous peak', () => {
    // Ramp up then a 6 s spike at the end.
    const rec = record(20, (i) => (i >= 14 ? 900 : 200), { cadence: 110 });
    const raw = rec.peakPowerRawData(6);
    expect(raw.duration).toBe(6);
    expect(raw.peakPower).toBe(900);
    expect(raw.avgPower).toBe(900); // best 6 s window is the spike
    expect(raw.powerSamples).toHaveLength(6);
    expect(raw.peakRPM).toBe(110);
  });

  it('includes minPower for the 30 s sprint', () => {
    const rec = record(30, (i) => 600 - i * 5); // decaying sprint
    const raw = rec.peakPowerRawData(30);
    expect(raw.minPower).toBeDefined();
    expect(raw.minPower!).toBeLessThan(raw.peakPower);
  });
});

describe('CP_3MIN raw data', () => {
  it('produces ~180 one-second samples accepted by the route (170–190)', () => {
    const rec = record(180, 300, { hr: 170 });
    const raw = rec.cp3MinRawData();
    expect(raw.powerSamples.length).toBeGreaterThanOrEqual(170);
    expect(raw.powerSamples.length).toBeLessThanOrEqual(190);
    expect(raw.avgHR).toBe(170);
    expect(raw.maxHR).toBe(170);
  });

  it('trims an over-long recording to the first 180 s', () => {
    const raw = record(240, 300).cp3MinRawData();
    expect(raw.powerSamples).toHaveLength(180);
  });
});

describe('MAP_RAMP raw data', () => {
  it('builds per-minute stages and marks the trailing partial minute incomplete', () => {
    // 2.5 minutes: minutes 1 and 2 are full, minute 3 is partial (30 s).
    const rec = record(150, (i) => 150 + Math.floor(i / 60) * 25, { hr: 160 });
    const raw = rec.mapRampRawData({ startPower: 150, increment: 25 });
    expect(raw.stages).toHaveLength(3);
    expect(raw.stages[0].completed).toBe(true);
    expect(raw.stages[1].completed).toBe(true);
    expect(raw.stages[2].completed).toBe(false);
    expect(raw.stages[0].targetPower).toBe(150);
    expect(raw.stages[1].targetPower).toBe(175);
    // mapWatts = last completed minute's actual power
    expect(raw.mapWatts).toBe(raw.stages[1].actualPower);
    expect(raw.timeToExhaustion).toBe(150);
    expect(raw.maxHR).toBe(160);
  });
});

describe('buildErgometerTestRequest', () => {
  it('assembles a Wattbike body with defaults', () => {
    const rawData = record(60, 250).tt20MinRawData();
    const body = buildErgometerTestRequest('TT_20MIN', rawData, {
      clientId: 'abc',
      airResistance: 5,
    });
    expect(body.ergometerType).toBe('WATTBIKE');
    expect(body.testProtocol).toBe('TT_20MIN');
    expect(body.airResistance).toBe(5);
    expect(body.rawData).toBe(rawData);
    expect(typeof body.testDate).toBe('string');
  });
});
