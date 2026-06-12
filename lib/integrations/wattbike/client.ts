/**
 * WattbikeClient — Web Bluetooth client for FTMS ergs: the Wattbike Atom and
 * any FTMS bike (Echo V3, FTMS airbikes) via Indoor Bike Data, plus Concept2
 * PM5 ergs (RowErg / SkiErg) via Rower Data.
 *
 * Reads live power / cadence / pace over the standard Fitness Machine Service
 * (FTMS), with a fallback to the Cycling Power Service. Optionally drives ERG
 * (target-power) mode via the FTMS Control Point for ramp / FTP protocols —
 * bikes with a motor brake only; air-resistance machines have no target to set.
 *
 * Platform note: Web Bluetooth runs in Chrome / Edge / Android Chrome only.
 * Safari and ALL iOS browsers lack `navigator.bluetooth`, so capture must
 * happen on an Android/desktop device. Call `WattbikeClient.isSupported()`
 * before rendering any "Connect" UI. See ./README.md.
 *
 * Requires the `@types/web-bluetooth` dev dependency for type-checking.
 * No external runtime dependencies.
 */

import {
  parseCyclingPower,
  parseIndoorBikeData,
  parsePm5AdditionalStatus1,
  parsePm5AdditionalStatus2,
  parsePm5AdditionalStrokeData,
  parsePm5GeneralStatus,
  parseRowerData,
} from './parsers';
import type { CrankState } from './parsers';
import type {
  ControlResponse,
  MachineKind,
  WattbikeClientOptions,
  WattbikeEvents,
  WattbikeStatus,
} from './types';

// ---- BLE service / characteristic UUIDs (16-bit shorthand) -----------------

// Exported so callers can build narrowed requestDevice filters (e.g. a rower
// slot that should not list cycling-power meters in the chooser).
export const FITNESS_MACHINE_SERVICE = 0x1826;
const INDOOR_BIKE_DATA = 0x2ad2; // notify: power / cadence / speed (bikes)
const ROWER_DATA = 0x2ad1; // notify: power / pace / stroke rate (PM5 row + ski)
const FTMS_CONTROL_POINT = 0x2ad9; // write + indicate: ERG control
const FTMS_STATUS = 0x2ada; // notify: machine status (optional)

export const CYCLING_POWER_SERVICE = 0x1818;
const CYCLING_POWER_MEASUREMENT = 0x2a63; // notify: power (+ crank for cadence)

const DEVICE_INFORMATION_SERVICE = 0x180a;

// Concept2 PM5 proprietary services. Older PM5 firmware (pre-FTMS, before
// Concept2's ~2021 update) exposes ONLY these — the FTMS path 404s with
// "No Services matching UUID 1826" on such monitors.
export const PM5_DISCOVERY_SERVICE = 'ce060000-43e5-11e4-916c-0800200c9a66'; // advertised
const PM5_ROWING_SERVICE = 'ce060030-43e5-11e4-916c-0800200c9a66';
const PM5_GENERAL_STATUS = 'ce060031-43e5-11e4-916c-0800200c9a66'; // elapsed + distance
const PM5_ADDITIONAL_STATUS_1 = 'ce060032-43e5-11e4-916c-0800200c9a66'; // pace/spm/HR
const PM5_ADDITIONAL_STATUS_2 = 'ce060033-43e5-11e4-916c-0800200c9a66'; // avg W + kcal
const PM5_ADDITIONAL_STROKE_DATA = 'ce060036-43e5-11e4-916c-0800200c9a66'; // stroke W

// ---- FTMS Control Point op-codes -------------------------------------------

const OP_REQUEST_CONTROL = 0x00;
const OP_RESET = 0x01;
const OP_SET_TARGET_POWER = 0x05;
const OP_START_RESUME = 0x07;
const OP_STOP_PAUSE = 0x08;
const OP_RESPONSE_CODE = 0x80;

const RESULT_SUCCESS = 0x01;

// Remembers the last-paired bike (origin-scoped) so a fixed setup can silently
// reconnect via getDevices() without showing the chooser again.
const LAST_DEVICE_STORAGE_KEY = 'wattbike:lastDeviceId';

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
  private machineKind: MachineKind | null = null;
  private hasControl = false;

  // Crank state for cadence derivation in the CPS fallback path.
  private lastCrank: CrankState | null = null;

  private reconnectAttempts = 0;
  private intentionalDisconnect = false;

  private readonly opts: Required<WattbikeClientOptions>;

  constructor(options: WattbikeClientOptions = {}) {
    super();
    this.opts = {
      filters: options.filters ?? [
        { services: [FITNESS_MACHINE_SERVICE] },
        // Older Wattbikes (Performance Monitor "b") broadcast as a plain Cycling
        // Power meter — no FTMS, often no "Wattbike" name — so match that too.
        { services: [CYCLING_POWER_SERVICE] },
        { namePrefix: 'Wattbike' },
        // Concept2 PM5 advertises its proprietary service, not FTMS, so the
        // service filters above miss it — match it by name instead. (FTMS is
        // still reachable post-connect via optionalServices.)
        { namePrefix: 'PM5' },
      ],
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelayMs: options.reconnectDelayMs ?? 1000,
      pm5Kind: options.pm5Kind ?? 'rower',
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

  /** Origin-scoped BLE device id, once connected — stable across sessions. */
  getDeviceId(): string | undefined {
    return this.device?.id ?? undefined;
  }

  /**
   * What the connected machine reports as: 'bike' (Indoor Bike Data or Cycling
   * Power) or 'rower' (FTMS Rower Data — Concept2 RowErg/SkiErg). Null before
   * a connection is established.
   */
  getMachineKind(): MachineKind | null {
    return this.machineKind;
  }

  /**
   * Open the browser chooser and connect. MUST be called from a user gesture
   * (click/tap) — Web Bluetooth refuses to prompt otherwise.
   *
   * `opts.acceptAll` lists every nearby BLE device instead of applying the
   * configured filters — the escape hatch when a machine's advertisement
   * doesn't match what we expect and the filtered chooser comes up empty.
   */
  async connect(opts: { acceptAll?: boolean } = {}): Promise<void> {
    if (!WattbikeClient.isSupported()) {
      throw new Error(
        'Web Bluetooth is not available. Use Chrome/Edge on Android or desktop — ' +
          'iOS (Safari and all iOS browsers) does not support it.',
      );
    }
    this.intentionalDisconnect = false;
    this.setStatus('connecting');

    const optionalServices = [
      FITNESS_MACHINE_SERVICE,
      CYCLING_POWER_SERVICE,
      DEVICE_INFORMATION_SERVICE,
      PM5_DISCOVERY_SERVICE,
      PM5_ROWING_SERVICE,
    ];
    try {
      this.device = await navigator.bluetooth.requestDevice(
        opts.acceptAll
          ? { acceptAllDevices: true, optionalServices }
          : { filters: this.opts.filters, optionalServices },
      );
    } catch (err) {
      this.setStatus('disconnected');
      throw err; // user cancelled the chooser, or no device matched
    }

    this.device.addEventListener(
      'gattserverdisconnected',
      this.handleGattDisconnected,
    );

    await this.openGatt();
    this.rememberDevice();
  }

  /**
   * Reconnect to a previously-paired machine WITHOUT the chooser, using the Web
   * Bluetooth getDevices() permission list. No user gesture required — ideal
   * for a fixed gym setup where the same tablet always sits on the same bike.
   * Returns false (no throw) when unsupported, nothing is remembered, or the
   * machine is out of range, so the caller can fall back to connect().
   *
   * `opts.exact` refuses to fall back to another known device when the wanted
   * id isn't found — required when several machines are paired (multi-erg
   * sessions), where "any known device" could be the wrong machine.
   */
  async reconnectKnown(
    preferredId?: string,
    opts: { exact?: boolean } = {},
  ): Promise<boolean> {
    const known = await WattbikeClient.listKnownDevices();
    if (known.length === 0) return false;

    const wantedId = preferredId ?? this.readRememberedId();
    let device = wantedId ? known.find((d) => d.id === wantedId) : undefined;
    if (!device && opts.exact) return false;
    if (!device) {
      device =
        known.find((d) => (d.name ?? '').toLowerCase().includes('wattbike')) ||
        known[0];
    }
    if (!device) return false;

    this.intentionalDisconnect = false;
    this.setStatus('connecting');
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.handleGattDisconnected);

    try {
      // The bike may be out of range; bound the attempt so the UI never hangs.
      await this.withTimeout(this.openGatt(), 6000);
      this.rememberDevice();
      return true;
    } catch {
      this.setStatus('disconnected');
      return false;
    }
  }

  /** Previously-granted Wattbike/FTMS devices for this origin (Chrome only). */
  static async listKnownDevices(): Promise<BluetoothDevice[]> {
    if (!WattbikeClient.isSupported()) return [];
    const bt = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
    if (typeof bt.getDevices !== 'function') return [];
    return bt.getDevices().catch(() => []);
  }

  /** Cleanly tear down notifications and drop the GATT link. */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.hasControl = false;
    this.lastCrank = null;
    this.machineKind = null;
    try {
      this.server?.disconnect();
    } finally {
      this.setStatus('disconnected');
    }
  }

  private rememberDevice(): void {
    try {
      if (this.device?.id && typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_DEVICE_STORAGE_KEY, this.device.id);
      }
    } catch {
      /* private mode / storage disabled — non-fatal */
    }
  }

  private readRememberedId(): string | undefined {
    try {
      if (typeof localStorage === 'undefined') return undefined;
      return localStorage.getItem(LAST_DEVICE_STORAGE_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms),
      ),
    ]);
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

    // Prefer FTMS (gives power AND cadence/pace as direct values, plus ERG control).
    try {
      await this.setupFtms(this.server);
    } catch {
      // Old-firmware PM5s expose only Concept2's proprietary service.
      try {
        await this.setupPm5(this.server);
      } catch {
        // Fall back to the Cycling Power Service (power always, cadence derived).
        await this.setupCyclingPower(this.server);
      }
    }

    this.setStatus('connected');
  }

  /**
   * Concept2 PM5 proprietary protocol — pre-FTMS firmware. Subscribes to the
   * status + stroke characteristics that together cover what FTMS Rower Data
   * gives us: distance, pace, stroke rate, HR (0x0032), avg W + kcal (0x0033),
   * per-stroke watts (0x0036). No ERG control.
   */
  private async setupPm5(server: BluetoothRemoteGATTServer): Promise<void> {
    const rowing = await server.getPrimaryService(PM5_ROWING_SERVICE);

    const subscribe = async (
      uuid: string,
      handler: (event: Event) => void,
    ): Promise<void> => {
      const characteristic = await rowing.getCharacteristic(uuid);
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handler);
    };

    // Stroke power is the core signal — fail the setup if it's missing.
    await subscribe(PM5_ADDITIONAL_STROKE_DATA, this.handlePm5StrokeData);
    // The rest are best-effort.
    await subscribe(PM5_GENERAL_STATUS, this.handlePm5GeneralStatus).catch(() => {});
    await subscribe(PM5_ADDITIONAL_STATUS_1, this.handlePm5Status1).catch(() => {});
    await subscribe(PM5_ADDITIONAL_STATUS_2, this.handlePm5Status2).catch(() => {});

    this.controlPoint = null; // no ERG over the proprietary protocol
    // RowErg/SkiErg/BikeErg PM5s are indistinguishable here — trust the slot.
    this.machineKind = this.opts.pm5Kind;
  }

  private async setupFtms(server: BluetoothRemoteGATTServer): Promise<void> {
    const ftms = await server.getPrimaryService(FITNESS_MACHINE_SERVICE);

    // A machine exposes the data characteristic matching its type: bikes notify
    // Indoor Bike Data, the PM5 (RowErg/SkiErg) notifies Rower Data.
    try {
      const ibd = await ftms.getCharacteristic(INDOOR_BIKE_DATA);
      await ibd.startNotifications();
      ibd.addEventListener('characteristicvaluechanged', this.handleIndoorBikeData);
      this.machineKind = 'bike';
    } catch {
      const rower = await ftms.getCharacteristic(ROWER_DATA);
      await rower.startNotifications();
      rower.addEventListener('characteristicvaluechanged', this.handleRowerData);
      this.machineKind = 'rower';
    }

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
    this.machineKind = 'bike';
  }

  // Arrow fns so `this` is bound when used as event listeners.

  private handleIndoorBikeData = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parseIndoorBikeData(dv));
  };

  private handleRowerData = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parseRowerData(dv));
  };

  private handleCyclingPower = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    const { sample, crank } = parseCyclingPower(dv, this.lastCrank);
    this.lastCrank = crank;
    this.emit('data', sample);
  };

  private handlePm5GeneralStatus = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parsePm5GeneralStatus(dv));
  };

  private handlePm5Status1 = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parsePm5AdditionalStatus1(dv));
  };

  private handlePm5Status2 = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parsePm5AdditionalStatus2(dv));
  };

  private handlePm5StrokeData = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    this.emit('data', parsePm5AdditionalStrokeData(dv));
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
}
