/**
 * WattbikeClient — Web Bluetooth client for the Wattbike Atom (and any FTMS trainer).
 *
 * Reads live power / cadence / speed over the standard Fitness Machine Service
 * (FTMS), with a fallback to the Cycling Power Service. Optionally drives ERG
 * (target-power) mode via the FTMS Control Point for ramp / FTP protocols.
 *
 * Platform note: Web Bluetooth runs in Chrome / Edge / Android Chrome only.
 * Safari and ALL iOS browsers lack `navigator.bluetooth`, so capture must
 * happen on an Android/desktop device. Call `WattbikeClient.isSupported()`
 * before rendering any "Connect" UI. See ./README.md.
 *
 * Requires the `@types/web-bluetooth` dev dependency for type-checking.
 * No external runtime dependencies.
 */

import type {
  ControlResponse,
  WattbikeClientOptions,
  WattbikeEvents,
  WattbikeSample,
  WattbikeSource,
  WattbikeStatus,
} from './types';

// ---- BLE service / characteristic UUIDs (16-bit shorthand) -----------------

const FITNESS_MACHINE_SERVICE = 0x1826;
const INDOOR_BIKE_DATA = 0x2ad2; // notify: power / cadence / speed
const FTMS_CONTROL_POINT = 0x2ad9; // write + indicate: ERG control
const FTMS_STATUS = 0x2ada; // notify: machine status (optional)

const CYCLING_POWER_SERVICE = 0x1818;
const CYCLING_POWER_MEASUREMENT = 0x2a63; // notify: power (+ crank for cadence)

const DEVICE_INFORMATION_SERVICE = 0x180a;

// ---- FTMS Control Point op-codes -------------------------------------------

const OP_REQUEST_CONTROL = 0x00;
const OP_RESET = 0x01;
const OP_SET_TARGET_POWER = 0x05;
const OP_START_RESUME = 0x07;
const OP_STOP_PAUSE = 0x08;
const OP_RESPONSE_CODE = 0x80;

const RESULT_SUCCESS = 0x01;

// ---- Tiny typed event emitter ----------------------------------------------

type Handler<T> = (payload: T) => void;

class Emitter<E> {
  private handlers = new Map<keyof E, Set<Handler<unknown>>>();

  /** Subscribe. Returns an unsubscribe function. */
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  protected emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.handlers.get(event)?.forEach((h) => {
      try {
        (h as Handler<E[K]>)(payload);
      } catch (err) {
        // Never let a subscriber throw break the BLE pipeline.
        console.error('[WattbikeClient] handler threw', err);
      }
    });
  }
}

// ---- Client ----------------------------------------------------------------

export class WattbikeClient extends Emitter<WattbikeEvents> {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;

  private status: WattbikeStatus = 'disconnected';
  private source: WattbikeSource = 'ftms';
  private hasControl = false;

  // Crank state for cadence derivation in the CPS fallback path.
  private lastCrank: { revs: number; time: number } | null = null;

  private reconnectAttempts = 0;
  private intentionalDisconnect = false;

  private readonly opts: Required<WattbikeClientOptions>;

  constructor(options: WattbikeClientOptions = {}) {
    super();
    this.opts = {
      filters: options.filters ?? [
        { services: [FITNESS_MACHINE_SERVICE] },
        { namePrefix: 'Wattbike' },
      ],
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelayMs: options.reconnectDelayMs ?? 1000,
    };
  }

  /** True if this browser/OS supports Web Bluetooth at all (false on iOS). */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.bluetooth !== 'undefined' &&
      typeof navigator.bluetooth.requestDevice === 'function'
    );
  }

  getStatus(): WattbikeStatus {
    return this.status;
  }

  /** Human-readable device name, once connected. */
  getDeviceName(): string | undefined {
    return this.device?.name ?? undefined;
  }

  /**
   * Open the browser chooser and connect. MUST be called from a user gesture
   * (click/tap) — Web Bluetooth refuses to prompt otherwise.
   */
  async connect(): Promise<void> {
    if (!WattbikeClient.isSupported()) {
      throw new Error(
        'Web Bluetooth is not available. Use Chrome/Edge on Android or desktop — ' +
          'iOS (Safari and all iOS browsers) does not support it.',
      );
    }
    this.intentionalDisconnect = false;
    this.setStatus('connecting');

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: this.opts.filters,
        optionalServices: [
          FITNESS_MACHINE_SERVICE,
          CYCLING_POWER_SERVICE,
          DEVICE_INFORMATION_SERVICE,
        ],
      });
    } catch (err) {
      this.setStatus('disconnected');
      throw err; // user cancelled the chooser, or no device matched
    }

    this.device.addEventListener(
      'gattserverdisconnected',
      this.handleGattDisconnected,
    );

    await this.openGatt();
  }

  /** Cleanly tear down notifications and drop the GATT link. */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.hasControl = false;
    this.lastCrank = null;
    try {
      this.server?.disconnect();
    } finally {
      this.setStatus('disconnected');
    }
  }

  // -- ERG / control ---------------------------------------------------------

  /** Whether the connected profile exposes the FTMS control point. */
  canControl(): boolean {
    return this.controlPoint !== null;
  }

  /**
   * Acquire control of the trainer. Idempotent — setTargetPower calls this for
   * you, but you can call it eagerly to surface "control denied" errors early.
   */
  async requestControl(): Promise<void> {
    if (!this.controlPoint) {
      throw new Error('This device does not expose the FTMS control point.');
    }
    await this.writeControl([OP_REQUEST_CONTROL]);
    this.hasControl = true;
  }

  /** Put the trainer in ERG mode at the given wattage (rounded to whole watts). */
  async setTargetPower(watts: number): Promise<void> {
    if (!this.controlPoint) {
      throw new Error('This device does not expose the FTMS control point.');
    }
    if (!this.hasControl) await this.requestControl();
    const w = Math.max(0, Math.round(watts));
    await this.writeControl([OP_SET_TARGET_POWER, w & 0xff, (w >> 8) & 0xff]);
  }

  /** Tell the trainer a session is starting (optional; some protocols need it). */
  async start(): Promise<void> {
    if (this.controlPoint) await this.writeControl([OP_START_RESUME]);
  }

  /** Stop the current ERG session. */
  async stop(): Promise<void> {
    if (this.controlPoint) {
      await this.writeControl([OP_STOP_PAUSE, 0x01]); // 0x01 = stop
    }
  }

  /** Reset the trainer to its idle state (clears the ERG target). */
  async reset(): Promise<void> {
    if (this.controlPoint) {
      await this.writeControl([OP_RESET]);
      this.hasControl = false;
    }
  }

  // -- Internals -------------------------------------------------------------

  private setStatus(status: WattbikeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit('status', status);
  }

  private async openGatt(): Promise<void> {
    if (!this.device?.gatt) throw new Error('No GATT server on device.');

    this.server = await this.device.gatt.connect();
    this.reconnectAttempts = 0;

    // Prefer FTMS (gives power AND cadence as direct values, plus ERG control).
    try {
      await this.setupFtms(this.server);
      this.source = 'ftms';
    } catch {
      // Fall back to the Cycling Power Service (power always, cadence derived).
      await this.setupCyclingPower(this.server);
      this.source = 'cps';
    }

    this.setStatus('connected');
  }

  private async setupFtms(server: BluetoothRemoteGATTServer): Promise<void> {
    const ftms = await server.getPrimaryService(FITNESS_MACHINE_SERVICE);

    const ibd = await ftms.getCharacteristic(INDOOR_BIKE_DATA);
    await ibd.startNotifications();
    ibd.addEventListener('characteristicvaluechanged', this.handleIndoorBikeData);

    // Control point is optional — present on Atom, absent on read-only meters.
    try {
      this.controlPoint = await ftms.getCharacteristic(FTMS_CONTROL_POINT);
      await this.controlPoint.startNotifications();
      this.controlPoint.addEventListener(
        'characteristicvaluechanged',
        this.handleControlResponse,
      );
    } catch {
      this.controlPoint = null;
    }

    // Machine status (optional, ignored if unavailable).
    try {
      const statusChar = await ftms.getCharacteristic(FTMS_STATUS);
      await statusChar.startNotifications();
    } catch {
      /* not all trainers expose it */
    }
  }

  private async setupCyclingPower(
    server: BluetoothRemoteGATTServer,
  ): Promise<void> {
    const cps = await server.getPrimaryService(CYCLING_POWER_SERVICE);
    const cpm = await cps.getCharacteristic(CYCLING_POWER_MEASUREMENT);
    await cpm.startNotifications();
    cpm.addEventListener('characteristicvaluechanged', this.handleCyclingPower);
    this.controlPoint = null; // no ERG over plain CPS
  }

  // Arrow fns so `this` is bound when used as event listeners.

  private handleIndoorBikeData = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', this.parseIndoorBikeData(dv));
  };

  private handleCyclingPower = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', this.parseCyclingPower(dv));
  };

  private handleControlResponse = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv || dv.byteLength < 3) return;
    if (dv.getUint8(0) !== OP_RESPONSE_CODE) return;
    const requestOpCode = dv.getUint8(1);
    const result = dv.getUint8(2);
    const response: ControlResponse = {
      requestOpCode,
      result,
      success: result === RESULT_SUCCESS,
    };
    this.emit('controlresponse', response);
    const pending = this.pendingControl;
    if (pending && pending.opCode === requestOpCode) {
      clearTimeout(pending.timer);
      this.pendingControl = null;
      pending.resolve();
    }
  };

  private handleGattDisconnected = (): void => {
    this.controlPoint = null;
    this.hasControl = false;
    this.lastCrank = null;

    if (this.intentionalDisconnect || !this.opts.autoReconnect) {
      this.setStatus('disconnected');
      return;
    }
    void this.attemptReconnect();
  };

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      this.setStatus('disconnected');
      this.emit(
        'error',
        new Error(
          `Lost connection to the Wattbike and could not reconnect after ` +
            `${this.opts.maxReconnectAttempts} attempts.`,
        ),
      );
      return;
    }
    this.reconnectAttempts += 1;
    this.setStatus('reconnecting');

    const delay = this.opts.reconnectDelayMs * this.reconnectAttempts;
    await new Promise((r) => setTimeout(r, delay));

    if (this.intentionalDisconnect) return;
    try {
      await this.openGatt();
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      void this.attemptReconnect();
    }
  }

  // -- Control-point write with optional ack ---------------------------------

  private pendingControl: {
    opCode: number;
    resolve: () => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  /**
   * Write a control-point command and wait (best-effort) for its indication.
   * Resolves on the matching response, or after a short timeout if the bike
   * never indicates (some firmware acks the write but skips the indication).
   */
  private async writeControl(bytes: number[]): Promise<void> {
    if (!this.controlPoint) return;

    // Back the view with a concrete ArrayBuffer so it satisfies BufferSource.
    const view = new Uint8Array(new ArrayBuffer(bytes.length));
    view.set(bytes);

    const ack = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingControl = null;
        resolve(); // write was GATT-acked below; don't hard-fail on a missing indication
      }, 2000);
      this.pendingControl = { opCode: bytes[0], resolve, timer };
    });

    await this.controlPoint.writeValueWithResponse(view);
    await ack;
  }

  // -- Binary parsers --------------------------------------------------------

  /** FTMS Indoor Bike Data (0x2AD2). Little-endian; fields keyed off the flags word. */
  private parseIndoorBikeData(dv: DataView): WattbikeSample {
    let offset = 0;
    const flags = dv.getUint16(offset, true);
    offset += 2;

    const sample: WattbikeSample = { t: performance.now(), source: 'ftms' };

    // Gotcha: Instantaneous Speed is present when bit 0 ("More Data") is 0.
    if ((flags & 0x0001) === 0) {
      sample.speed = dv.getUint16(offset, true) * 0.01; // 0.01 km/h
      offset += 2;
    }
    if (flags & 0x0002) offset += 2; // Average Speed
    if (flags & 0x0004) {
      sample.cadence = dv.getUint16(offset, true) * 0.5; // 0.5 rpm
      offset += 2;
    }
    if (flags & 0x0008) offset += 2; // Average Cadence
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
    if (flags & 0x0100) offset += 5; // Expended Energy: total(u16)+perHour(u16)+perMin(u8)
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

  /** Cycling Power Measurement (0x2A63) fallback. Cadence derived from crank deltas. */
  private parseCyclingPower(dv: DataView): WattbikeSample {
    let offset = 0;
    const flags = dv.getUint16(offset, true);
    offset += 2;

    const sample: WattbikeSample = { t: performance.now(), source: 'cps' };
    sample.power = dv.getInt16(offset, true); // always present
    offset += 2;

    if (flags & 0x0001) offset += 1; // Pedal Power Balance (u8)
    if (flags & 0x0004) offset += 2; // Accumulated Torque (u16)
    if (flags & 0x0010) offset += 6; // Wheel Revolution Data: u32 + u16

    if (flags & 0x0020) {
      // Crank Revolution Data: cumulative crank revs (u16) + last event time (u16, 1/1024 s)
      const revs = dv.getUint16(offset, true);
      const time = dv.getUint16(offset + 2, true);
      offset += 4;

      if (this.lastCrank) {
        let dRev = revs - this.lastCrank.revs;
        if (dRev < 0) dRev += 0x10000; // 16-bit rollover
        let dt = time - this.lastCrank.time;
        if (dt < 0) dt += 0x10000;
        if (dt > 0 && dRev > 0) {
          sample.cadence = (dRev / (dt / 1024)) * 60; // rpm
        } else if (dRev === 0) {
          sample.cadence = 0; // no crank movement between notifications
        }
      }
      this.lastCrank = { revs, time };
    }

    return sample;
  }
}
