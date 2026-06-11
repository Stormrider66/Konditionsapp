/**
 * HeartRateBandClient — Web Bluetooth client for standard BLE heart-rate
 * bands (chest straps and broadcast-capable watches): Garmin HRM-Dual,
 * Polar H9/H10, Wahoo TICKR, etc.
 *
 * Speaks the Bluetooth SIG Heart Rate Service (0x180D) and parses the Heart
 * Rate Measurement characteristic (0x2A37) notifications, which all bands
 * implement identically — no per-vendor handling needed.
 *
 * Platform note: same Web Bluetooth constraints as the erg clients (Chrome /
 * Edge / Android Chrome only). Call HeartRateBandClient.isSupported() before
 * rendering any "Connect" UI.
 */

export const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT = 0x2a37;

export type HeartRateStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface HeartRateEvents {
  data: (bpm: number) => void;
  status: (status: HeartRateStatus) => void;
}

const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1500;

export class HeartRateBandClient {
  private device: BluetoothDevice | null = null;
  private status: HeartRateStatus = 'disconnected';
  private listeners: { [K in keyof HeartRateEvents]: Set<HeartRateEvents[K]> } = {
    data: new Set(),
    status: new Set(),
  };
  private reconnectAttempts = 0;
  private intentionalDisconnect = false;

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  getStatus(): HeartRateStatus {
    return this.status;
  }

  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }

  on<K extends keyof HeartRateEvents>(event: K, listener: HeartRateEvents[K]): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  /** Open the chooser (must be called from a user gesture) and connect. */
  async connect(opts: { acceptAll?: boolean } = {}): Promise<void> {
    if (!HeartRateBandClient.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }
    this.intentionalDisconnect = false;
    this.setStatus('connecting');

    try {
      this.device = await navigator.bluetooth.requestDevice(
        opts.acceptAll
          ? { acceptAllDevices: true, optionalServices: [HEART_RATE_SERVICE] }
          : { filters: [{ services: [HEART_RATE_SERVICE] }] }
      );
    } catch (err) {
      this.setStatus('disconnected');
      throw err; // user cancelled the chooser, or no device matched
    }

    this.device.addEventListener('gattserverdisconnected', this.handleGattDisconnected);
    try {
      await this.openGatt();
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    } catch (err) {
      this.setStatus('disconnected');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.device?.removeEventListener('gattserverdisconnected', this.handleGattDisconnected);
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.setStatus('disconnected');
  }

  private async openGatt(): Promise<void> {
    if (!this.device?.gatt) throw new Error('No device selected');
    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const measurement = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
    await measurement.startNotifications();
    measurement.addEventListener('characteristicvaluechanged', this.handleMeasurement);
  }

  private handleMeasurement = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    // Flags bit 0: 0 → bpm is uint8 at offset 1, 1 → uint16le at offset 1.
    const flags = value.getUint8(0);
    const bpm = (flags & 0x01) === 0 ? value.getUint8(1) : value.getUint16(1, true);
    if (bpm > 0 && bpm < 250) {
      for (const listener of this.listeners.data) listener(bpm);
    }
  };

  private handleGattDisconnected = (): void => {
    if (this.intentionalDisconnect) return;
    void this.tryReconnect();
  };

  private async tryReconnect(): Promise<void> {
    while (this.reconnectAttempts < RECONNECT_ATTEMPTS && this.device && !this.intentionalDisconnect) {
      this.reconnectAttempts++;
      this.setStatus('reconnecting');
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS * this.reconnectAttempts));
      try {
        await this.openGatt();
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        return;
      } catch {
        // next attempt, or give up below
      }
    }
    this.setStatus('disconnected');
  }

  private setStatus(status: HeartRateStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners.status) listener(status);
  }
}
