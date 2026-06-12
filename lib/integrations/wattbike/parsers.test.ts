import { describe, expect, it } from 'vitest';

import { parseCyclingPower, parseIndoorBikeData, parseRowerData } from './parsers';

/** Build a little-endian DataView from a field spec. */
function frame(
  fields: Array<['u8' | 'u16' | 'u24' | 's16', number]>,
): DataView {
  const size = fields.reduce(
    (sum, [kind]) => sum + (kind === 'u8' ? 1 : kind === 'u24' ? 3 : 2),
    0,
  );
  const dv = new DataView(new ArrayBuffer(size));
  let offset = 0;
  for (const [kind, value] of fields) {
    if (kind === 'u8') {
      dv.setUint8(offset, value);
      offset += 1;
    } else if (kind === 'u16') {
      dv.setUint16(offset, value, true);
      offset += 2;
    } else if (kind === 's16') {
      dv.setInt16(offset, value, true);
      offset += 2;
    } else {
      dv.setUint16(offset, value & 0xffff, true);
      dv.setUint8(offset + 2, (value >> 16) & 0xff);
      offset += 3;
    }
  }
  return dv;
}

describe('parseRowerData (FTMS 0x2AD1)', () => {
  it('decodes a typical PM5 work frame: strokes, distance, pace, power', () => {
    // flags 0x002C = distance (bit2) + inst pace (bit3) + inst power (bit5);
    // bit 0 clear → stroke rate + stroke count lead the payload.
    const dv = frame([
      ['u16', 0x002c],
      ['u8', 56], // stroke rate ×0.5 → 28 spm
      ['u16', 142], // stroke count
      ['u24', 1500], // total distance, metres
      ['u16', 125], // pace: 125 s = 2:05 /500m
      ['s16', 185], // watts
    ]);
    const s = parseRowerData(dv);
    expect(s.source).toBe('ftms-rower');
    expect(s.strokeRate).toBe(28);
    expect(s.strokeCount).toBe(142);
    expect(s.distance).toBe(1500);
    expect(s.pace).toBe(125);
    expect(s.power).toBe(185);
    expect(s.cadence).toBeUndefined();
  });

  it('treats idle pace 0 and not-available 0xFFFF as no pace', () => {
    const idle = frame([
      ['u16', 0x0028], // pace + power, strokes lead (bit0 clear)
      ['u8', 0],
      ['u16', 0],
      ['u16', 0], // PM5 idle pace
      ['s16', 0],
    ]);
    expect(parseRowerData(idle).pace).toBeUndefined();

    const unavailable = frame([
      ['u16', 0x0029], // bit0 set → no stroke fields; pace + power
      ['u16', 0xffff],
      ['s16', 0],
    ]);
    expect(parseRowerData(unavailable).pace).toBeUndefined();
  });

  it('decodes energy, heart rate and elapsed time; 0xFFFF energy is unavailable', () => {
    // flags 0x0B01 = bit0 (no strokes) + energy (bit8) + HR (bit9) + elapsed (bit11)
    const dv = frame([
      ['u16', 0x0b01],
      ['u16', 55], // total energy, kcal
      ['u16', 600], // energy per hour (skipped)
      ['u8', 11], // energy per minute (skipped)
      ['u8', 152], // heart rate
      ['u16', 360], // elapsed seconds
    ]);
    const s = parseRowerData(dv);
    expect(s.calories).toBe(55);
    expect(s.heartRate).toBe(152);
    expect(s.elapsedTime).toBe(360);

    const noEnergy = frame([
      ['u16', 0x0101],
      ['u16', 0xffff],
      ['u16', 0xffff],
      ['u8', 0xff],
    ]);
    expect(parseRowerData(noEnergy).calories).toBeUndefined();
  });
});

describe('parseIndoorBikeData (FTMS 0x2AD2)', () => {
  it('decodes speed, cadence and power', () => {
    // flags 0x0044 = cadence (bit2) + power (bit6); bit 0 clear → speed leads.
    const dv = frame([
      ['u16', 0x0044],
      ['u16', 3215], // speed ×0.01 → 32.15 km/h
      ['u16', 180], // cadence ×0.5 → 90 rpm
      ['s16', 250], // watts
    ]);
    const s = parseIndoorBikeData(dv);
    expect(s.source).toBe('ftms');
    expect(s.speed).toBeCloseTo(32.15);
    expect(s.cadence).toBe(90);
    expect(s.power).toBe(250);
  });

  it('decodes distance and heart rate with offsets intact', () => {
    // flags 0x0251 = bit0 (no speed) + distance (bit4) + power (bit6) + HR (bit9)
    const dv = frame([
      ['u16', 0x0251],
      ['u24', 70000], // distance > 16 bits exercises the u24 read
      ['s16', 210],
      ['u8', 147],
    ]);
    const s = parseIndoorBikeData(dv);
    expect(s.distance).toBe(70000);
    expect(s.power).toBe(210);
    expect(s.heartRate).toBe(147);
  });
});

describe('parseCyclingPower (0x2A63)', () => {
  it('derives cadence from crank deltas across notifications', () => {
    // flags 0x0020 = crank revolution data present.
    const first = frame([
      ['u16', 0x0020],
      ['s16', 240],
      ['u16', 100], // crank revs
      ['u16', 0], // event time (1/1024 s)
    ]);
    const second = frame([
      ['u16', 0x0020],
      ['s16', 245],
      ['u16', 102], // +2 revs
      ['u16', 1365], // +1365/1024 s ≈ 1.333 s → 90 rpm
    ]);

    const r1 = parseCyclingPower(first, null);
    expect(r1.sample.power).toBe(240);
    expect(r1.sample.cadence).toBeUndefined(); // no previous crank state yet

    const r2 = parseCyclingPower(second, r1.crank);
    expect(r2.sample.power).toBe(245);
    expect(r2.sample.cadence).toBeCloseTo(90, 0);
  });

  it('handles 16-bit crank rollover', () => {
    const before = parseCyclingPower(
      frame([
        ['u16', 0x0020],
        ['s16', 200],
        ['u16', 0xffff],
        ['u16', 0xfffa],
      ]),
      null,
    );
    const after = parseCyclingPower(
      frame([
        ['u16', 0x0020],
        ['s16', 200],
        ['u16', 1], // rolled over: +2 revs
        ['u16', 1359], // rolled over: +1365 ticks ≈ 1.333 s → 90 rpm
      ]),
      before.crank,
    );
    expect(after.sample.cadence).toBeCloseTo(90, 0);
  });
});

describe('PM5 proprietary parsers', async () => {
  const {
    parsePm5GeneralStatus,
    parsePm5AdditionalStatus1,
    parsePm5AdditionalStatus2,
    parsePm5AdditionalStrokeData,
  } = await import('./parsers');

  it('parses general status: elapsed time and distance', () => {
    const dv = frame([
      ['u24', 1234], // elapsed 12.34 s (0.01 s units)
      ['u24', 1565], // distance 156.5 m (0.1 m units)
      ['u8', 1], ['u8', 1], ['u8', 1], ['u8', 4], ['u8', 2], // workout/interval/state bytes
      ['u24', 0], ['u24', 0], ['u8', 0], ['u8', 120], // totals + duration type + drag
    ]);
    const sample = parsePm5GeneralStatus(dv);
    expect(sample.source).toBe('pm5');
    expect(sample.elapsedTime).toBe(12);
    expect(sample.distance).toBeCloseTo(156.5, 5);
  });

  it('parses additional status 1: pace, stroke rate, heart rate', () => {
    const dv = frame([
      ['u24', 1234], // elapsed
      ['u16', 4000], // speed 4 m/s (0.001 m/s units)
      ['u8', 32], // stroke rate spm
      ['u8', 152], // heart rate
      ['u16', 11300], // current pace 113 s /500m (0.01 s units)
      ['u16', 11500], // avg pace
      ['u16', 0], ['u24', 0], ['u8', 0], // rest distance/time + machine type
    ]);
    const sample = parsePm5AdditionalStatus1(dv);
    expect(sample.speed).toBeCloseTo(14.4, 5);
    expect(sample.strokeRate).toBe(32);
    expect(sample.heartRate).toBe(152);
    expect(sample.pace).toBe(113);
  });

  it('treats heart rate 255 as invalid', () => {
    const dv = frame([
      ['u24', 0],
      ['u16', 0],
      ['u8', 28],
      ['u8', 255], // no strap paired
      ['u16', 0],
      ['u16', 0],
      ['u16', 0], ['u24', 0], ['u8', 0],
    ]);
    const sample = parsePm5AdditionalStatus1(dv);
    expect(sample.heartRate).toBeUndefined();
    expect(sample.pace).toBeUndefined(); // pace 0 = idle, not a pace
  });

  it('parses additional status 2: average power and cumulative calories', () => {
    const dv = frame([
      ['u24', 1234], // elapsed
      ['u8', 2], // interval count
      ['u16', 169], // avg power
      ['u16', 15], // total calories (kcal)
      ['u16', 0], ['u16', 0], ['u16', 0], ['u24', 0], ['u24', 0],
    ]);
    const sample = parsePm5AdditionalStatus2(dv);
    expect(sample.avgPower).toBe(169);
    expect(sample.calories).toBe(15);
  });

  it('parses additional stroke data: per-stroke power', () => {
    const dv = frame([
      ['u24', 1234], // elapsed
      ['u16', 244], // stroke power W
      ['u16', 900], // stroke calories (cal/hr)
      ['u16', 87], // stroke count
      ['u24', 0], ['u24', 0],
    ]);
    const sample = parsePm5AdditionalStrokeData(dv);
    expect(sample.power).toBe(244);
    expect(sample.strokeCount).toBe(87);
  });
});
