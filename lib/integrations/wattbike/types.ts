/**
 * Erg Web Bluetooth integration — public types.
 *
 * Any FTMS-compatible machine is read live over Bluetooth in the browser:
 * bikes (Wattbike Atom, Echo V3, FTMS airbikes) via Indoor Bike Data, and
 * Concept2 PM5 ergs (RowErg / SkiErg) via Rower Data. See ./client.ts for the
 * connection logic and ./README.md for the platform constraints (Web Bluetooth
 * is unavailable on iOS).
 */

export type WattbikeStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/** Which BLE profile/characteristic produced a sample. */
export type WattbikeSource = 'ftms' | 'ftms-rower' | 'cps' | 'pm5';

/**
 * What kind of machine the connected device reports as. 'rower' covers every
 * PM5 erg (Concept2 RowErg and SkiErg both notify FTMS Rower Data).
 */
export type MachineKind = 'bike' | 'rower';

/**
 * One decoded notification from the machine. Optional fields are present only
 * when the device includes them in that packet (driven by the BLE flags word).
 */
export interface WattbikeSample {
  /** Monotonic ms since page load (performance.now()) — use for time-series spacing. */
  t: number;
  /** Instantaneous power in watts. */
  power?: number;
  /** Instantaneous cadence in rpm (bikes only). */
  cadence?: number;
  /** Average cadence in rpm, if the bike reports average but not instantaneous cadence. */
  avgCadence?: number;
  /** Instantaneous speed in km/h. */
  speed?: number;
  /** Average speed in km/h, if the bike reports average but not instantaneous speed. */
  avgSpeed?: number;
  /** Average power reported by the machine (watts), if present. */
  avgPower?: number;
  /** Total distance in metres, if present. */
  distance?: number;
  /** Heart rate in bpm, if the machine relays a paired strap. */
  heartRate?: number;
  /** Elapsed time in seconds, if present. */
  elapsedTime?: number;
  /** Instantaneous pace in seconds per 500 m (rower/ski erg only). */
  pace?: number;
  /** Stroke rate in strokes per minute (rower/ski erg only). */
  strokeRate?: number;
  /** Cumulative stroke count for the session (rower/ski erg only). */
  strokeCount?: number;
  /** Total energy expended in kcal, if the machine reports it. */
  calories?: number;
  /** Which BLE profile produced this sample. */
  source: WattbikeSource;
}

/** Decoded FTMS control-point indication (response to an ERG command). */
export interface ControlResponse {
  requestOpCode: number;
  result: number;
  success: boolean;
}

/** Event map for {@link WattbikeClient}. Subscribe via `client.on(event, handler)`. */
export interface WattbikeEvents {
  status: WattbikeStatus;
  data: WattbikeSample;
  error: Error;
  controlresponse: ControlResponse;
}

export interface WattbikeClientOptions {
  /**
   * Custom requestDevice filters. Defaults to "any FTMS trainer OR any device
   * named Wattbike*". Override to broaden or narrow the chooser.
   */
  filters?: BluetoothLEScanFilter[];
  /** Try to silently reconnect when the GATT link drops. Default: true. */
  autoReconnect?: boolean;
  /** Reconnect attempts before giving up. Default: 5. */
  maxReconnectAttempts?: number;
  /** Base backoff between reconnect attempts, ms (multiplied by attempt #). Default: 1000. */
  reconnectDelayMs?: number;
  /**
   * Machine kind to assume when connecting over the Concept2 PM5 proprietary
   * protocol (pre-FTMS firmware), where the kind can't be inferred from the
   * data characteristic. Default: 'rower' (RowErg/SkiErg); pass 'bike' for a
   * BikeErg slot.
   */
  pm5Kind?: MachineKind;
}
