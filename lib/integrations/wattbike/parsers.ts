/**
 * Pure binary parsers for the BLE notification formats the erg client speaks.
 *
 * Extracted from client.ts so they can be unit-tested against hand-built
 * DataViews without a Bluetooth stack. All multi-byte fields are little-endian;
 * which fields are present in a packet is driven by its leading flags word.
 *
 * - FTMS Indoor Bike Data (0x2AD2): Wattbike Atom, Echo V3, any FTMS bike.
 * - FTMS Rower Data (0x2AD1): Concept2 PM5 (RowErg AND SkiErg — FTMS has no
 *   ski machine type, so the PM5 reports rower data for both).
 * - Cycling Power Measurement (0x2A63): fallback for older Wattbikes.
 */

import type { WattbikeSample } from './types';

/** Crank-revolution state carried between Cycling Power notifications. */
export interface CrankState {
  revs: number;
  time: number;
}

/** FTMS Indoor Bike Data (0x2AD2). */
export function parseIndoorBikeData(dv: DataView): WattbikeSample {
  let offset = 0;
  const flags = dv.getUint16(offset, true);
  offset += 2;

  const sample: WattbikeSample = { t: performance.now(), source: 'ftms' };

  // Gotcha: Instantaneous Speed is present when bit 0 ("More Data") is 0.
  if ((flags & 0x0001) === 0) {
    sample.speed = dv.getUint16(offset, true) * 0.01; // 0.01 km/h
    offset += 2;
  }
  if (flags & 0x0002) {
    sample.avgSpeed = dv.getUint16(offset, true) * 0.01; // 0.01 km/h
    offset += 2;
  }
  if (flags & 0x0004) {
    sample.cadence = dv.getUint16(offset, true) * 0.5; // 0.5 rpm
    offset += 2;
  }
  if (flags & 0x0008) {
    sample.avgCadence = dv.getUint16(offset, true) * 0.5; // 0.5 rpm
    offset += 2;
  }
  if (flags & 0x0010) {
    // Total Distance — uint24
    sample.distance =
      dv.getUint16(offset, true) + (dv.getUint8(offset + 2) << 16);
    offset += 3;
  }
  if (flags & 0x0020) offset += 2; // Resistance Level (sint16)
  if (flags & 0x0040) {
    sample.power = dv.getInt16(offset, true); // watts
    offset += 2;
  }
  if (flags & 0x0080) {
    sample.avgPower = dv.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x0100) {
    const totalEnergy = dv.getUint16(offset, true); // kcal
    if (totalEnergy !== 0xffff) sample.calories = totalEnergy;
    offset += 5; // total(u16) + perHour(u16) + perMin(u8)
  }
  if (flags & 0x0200) {
    sample.heartRate = dv.getUint8(offset); // bpm
    offset += 1;
  }
  if (flags & 0x0400) offset += 1; // Metabolic Equivalent
  if (flags & 0x0800) {
    sample.elapsedTime = dv.getUint16(offset, true); // seconds
    offset += 2;
  }
  // bit 12 (Remaining Time) intentionally not read — last field.

  return sample;
}

/** FTMS Rower Data (0x2AD1). Same flags-word scheme as Indoor Bike Data. */
export function parseRowerData(dv: DataView): WattbikeSample {
  let offset = 0;
  const flags = dv.getUint16(offset, true);
  offset += 2;

  const sample: WattbikeSample = { t: performance.now(), source: 'ftms-rower' };

  // Stroke Rate + Stroke Count are present when bit 0 ("More Data") is 0.
  if ((flags & 0x0001) === 0) {
    sample.strokeRate = dv.getUint8(offset) * 0.5; // 0.5 spm
    sample.strokeCount = dv.getUint16(offset + 1, true);
    offset += 3;
  }
  if (flags & 0x0002) offset += 1; // Average Stroke Rate (u8)
  if (flags & 0x0004) {
    // Total Distance — uint24, metres
    sample.distance =
      dv.getUint16(offset, true) + (dv.getUint8(offset + 2) << 16);
    offset += 3;
  }
  if (flags & 0x0008) {
    // Instantaneous Pace — seconds per 500 m. The PM5 sends 0 when idle and
    // 0xFFFF means "not available"; both are noise, not a pace.
    const pace = dv.getUint16(offset, true);
    if (pace > 0 && pace !== 0xffff) sample.pace = pace;
    offset += 2;
  }
  if (flags & 0x0010) offset += 2; // Average Pace (u16)
  if (flags & 0x0020) {
    sample.power = dv.getInt16(offset, true); // watts
    offset += 2;
  }
  if (flags & 0x0040) {
    sample.avgPower = dv.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x0080) offset += 2; // Resistance Level (sint16)
  if (flags & 0x0100) {
    const totalEnergy = dv.getUint16(offset, true); // kcal
    if (totalEnergy !== 0xffff) sample.calories = totalEnergy;
    offset += 5; // total(u16) + perHour(u16) + perMin(u8)
  }
  if (flags & 0x0200) {
    sample.heartRate = dv.getUint8(offset); // bpm
    offset += 1;
  }
  if (flags & 0x0400) offset += 1; // Metabolic Equivalent
  if (flags & 0x0800) {
    sample.elapsedTime = dv.getUint16(offset, true); // seconds
    offset += 2;
  }
  // bit 12 (Remaining Time) intentionally not read — last field.

  return sample;
}

/**
 * Cycling Power Measurement (0x2A63) fallback. Cadence is derived from crank
 * revolution deltas, so the previous notification's crank state is threaded
 * through; pass the returned `crank` back in on the next call.
 */
export function parseCyclingPower(
  dv: DataView,
  lastCrank: CrankState | null,
): { sample: WattbikeSample; crank: CrankState | null } {
  let offset = 0;
  const flags = dv.getUint16(offset, true);
  offset += 2;

  const sample: WattbikeSample = { t: performance.now(), source: 'cps' };
  sample.power = dv.getInt16(offset, true); // always present
  offset += 2;

  if (flags & 0x0001) offset += 1; // Pedal Power Balance (u8)
  if (flags & 0x0004) offset += 2; // Accumulated Torque (u16)
  if (flags & 0x0010) offset += 6; // Wheel Revolution Data: u32 + u16

  let crank = lastCrank;
  if (flags & 0x0020) {
    // Crank Revolution Data: cumulative crank revs (u16) + last event time (u16, 1/1024 s)
    const revs = dv.getUint16(offset, true);
    const time = dv.getUint16(offset + 2, true);
    offset += 4;

    if (lastCrank) {
      let dRev = revs - lastCrank.revs;
      if (dRev < 0) dRev += 0x10000; // 16-bit rollover
      let dt = time - lastCrank.time;
      if (dt < 0) dt += 0x10000;
      if (dt > 0 && dRev > 0) {
        sample.cadence = (dRev / (dt / 1024)) * 60; // rpm
      } else if (dRev === 0) {
        sample.cadence = 0; // no crank movement between notifications
      }
    }
    crank = { revs, time };
  }

  return { sample, crank };
}

// ---- Concept2 PM5 proprietary protocol --------------------------------------
//
// Older PM5 firmware (pre-FTMS, before Concept2's ~2021 update) exposes ONLY
// the proprietary rowing service (ce060030-…). Fixed-layout packets, no flags
// word; offsets per the "Concept2 PM Bluetooth Smart Communication Interface
// Definition". uint24 fields are little-endian lo/mid/hi.

function u24(dv: DataView, offset: number): number {
  return dv.getUint8(offset) + (dv.getUint8(offset + 1) << 8) + (dv.getUint8(offset + 2) << 16);
}

/** PM5 General Status (ce060031): elapsed time + distance. */
export function parsePm5GeneralStatus(dv: DataView): WattbikeSample {
  const sample: WattbikeSample = { t: performance.now(), source: 'pm5' };
  if (dv.byteLength >= 6) {
    sample.elapsedTime = Math.round(u24(dv, 0) * 0.01); // 0.01 s units
    sample.distance = u24(dv, 3) * 0.1; // 0.1 m units → metres
  }
  return sample;
}

/** PM5 Additional Status 1 (ce060032): speed, stroke rate, HR, pace. */
export function parsePm5AdditionalStatus1(dv: DataView): WattbikeSample {
  const sample: WattbikeSample = { t: performance.now(), source: 'pm5' };
  if (dv.byteLength >= 9) {
    const speed = dv.getUint16(3, true); // 0.001 m/s
    if (speed > 0) sample.speed = (speed * 0.001 * 3600) / 1000; // km/h
    sample.strokeRate = dv.getUint8(5); // spm
    const hr = dv.getUint8(6);
    if (hr > 0 && hr < 255) sample.heartRate = hr; // 255 = invalid
    const pace = dv.getUint16(7, true); // 0.01 s per 500 m
    if (pace > 0 && pace !== 0xffff) sample.pace = Math.round(pace * 0.01);
  }
  return sample;
}

/** PM5 Additional Status 2 (ce060033): average power + total calories. */
export function parsePm5AdditionalStatus2(dv: DataView): WattbikeSample {
  const sample: WattbikeSample = { t: performance.now(), source: 'pm5' };
  if (dv.byteLength >= 8) {
    const avgPower = dv.getUint16(4, true);
    if (avgPower > 0 && avgPower !== 0xffff) sample.avgPower = avgPower;
    const totalCalories = dv.getUint16(6, true); // kcal, cumulative
    if (totalCalories !== 0xffff) sample.calories = totalCalories;
  }
  return sample;
}

/** PM5 Additional Stroke Data (ce060036): per-stroke instantaneous power. */
export function parsePm5AdditionalStrokeData(dv: DataView): WattbikeSample {
  const sample: WattbikeSample = { t: performance.now(), source: 'pm5' };
  if (dv.byteLength >= 9) {
    const power = dv.getUint16(3, true);
    if (power !== 0xffff) sample.power = power;
    sample.strokeCount = dv.getUint16(7, true);
  }
  return sample;
}
