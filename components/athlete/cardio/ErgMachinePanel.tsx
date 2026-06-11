'use client'

/**
 * ErgMachinePanel — connect the workout's erg machines, one row per equipment
 * slot (Row, Bike, SkiErg, …).
 *
 * Two variants:
 * - 'prestart': shown instead of the first interval when a power workout opens
 *   in focus mode, so all machines are connected BEFORE the clock starts. The
 *   primary button starts the workout (connected or not).
 * - 'manage': the same list inside a dialog mid-session, for swapping or
 *   late-connecting a machine without disturbing the running timer.
 *
 * Connecting is per slot — the athlete declares which machine is which. A
 * RowErg PM5 and a SkiErg PM5 are identical over BLE (both report rower data),
 * so the assignment can't be inferred from the device.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bluetooth, BluetoothConnected, Loader2, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import { expectedKindForSlot, type UseErgFleetResult } from '@/hooks/use-erg-fleet'

export function ergEquipmentLabel(slot: string, locale: string): string {
  const sv = locale === 'sv'
  switch (slot) {
    case 'ROW':
      return sv ? 'Rodd (Concept2)' : 'Row (Concept2)'
    case 'SKI_ERG':
      return 'SkiErg (Concept2)'
    case 'BIKE_ERG':
      return 'BikeErg (Concept2)'
    case 'BIKE':
      return sv ? 'Cykel' : 'Bike'
    case 'WATTBIKE':
      return 'Wattbike'
    case 'ASSAULT_BIKE':
      return 'Assault Bike'
    case 'ECHO_BIKE':
      return 'Echo Bike'
    default:
      return sv ? 'Maskin' : 'Machine'
  }
}

interface ErgMachinePanelProps {
  slots: string[]
  fleet: UseErgFleetResult
  variant: 'prestart' | 'manage'
  /** Start the workout (prestart) / close the dialog (manage). */
  onDone: () => void
}

export function ErgMachinePanel({ slots, fleet, variant, onDone }: ErgMachinePanelProps) {
  const locale = useLocale()
  const tw = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  // Samsung Internet exposes navigator.bluetooth (so the supported-gate passes)
  // but its scanner finds nothing in practice — steer those users to Chrome.
  const isSamsungInternet =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('SamsungBrowser')
  // After a failed/cancelled attempt, offer an unfiltered chooser for that
  // slot — the escape hatch when a machine doesn't show up in the list.
  const [fallbackSlot, setFallbackSlot] = useState<string | null>(null)

  const connect = async (slot: string, acceptAll = false) => {
    setBusySlot(slot)
    try {
      await fleet.connectSlot(slot, { acceptAll })
      setFallbackSlot(null)
    } catch {
      // Chooser cancelled or connect failed — fleet.error carries the details.
      setFallbackSlot(slot)
    } finally {
      setBusySlot(null)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {tw('Anslut dina maskiner', 'Connect your machines')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tw(
            'Anslut via Bluetooth innan du startar så mäts watt, tempo och distans automatiskt.',
            'Connect over Bluetooth before you start and watts, pace and distance are captured automatically.'
          )}
        </p>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const device = fleet.devices[slot]
          const connected = device?.status === 'connected'
          const connecting =
            busySlot === slot ||
            device?.status === 'connecting' ||
            device?.status === 'reconnecting'
          const expected = expectedKindForSlot(slot)
          const kindMismatch =
            connected && expected != null && device?.kind != null && device.kind !== expected

          return (
            <div
              key={slot || 'generic'}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5"
            >
              {connected ? (
                <BluetoothConnected className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Bluetooth className="h-5 w-5 shrink-0 text-slate-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {ergEquipmentLabel(slot, locale)}
                </p>
                <p
                  className={cn(
                    'truncate text-xs',
                    connected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {connected
                    ? device?.name || tw('Ansluten', 'Connected')
                    : connecting
                      ? tw('Ansluter…', 'Connecting…')
                      : tw('Ej ansluten', 'Not connected')}
                  {kindMismatch && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      {tw('· ser ut som fel maskintyp', '· looks like the wrong machine type')}
                    </span>
                  )}
                </p>
              </div>
              {connected ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void fleet.disconnectSlot(slot)}
                  title={tw('Koppla från', 'Disconnect')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={connecting || !fleet.isSupported}
                  onClick={() => void connect(slot)}
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    tw('Anslut', 'Connect')
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {fallbackSlot != null && fleet.devices[fallbackSlot]?.status !== 'connected' && (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tw(
              'Hittade du inte maskinen i listan?',
              "Didn't find the machine in the list?"
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busySlot != null}
            onClick={() => void connect(fallbackSlot, true)}
          >
            {tw('Visa alla Bluetooth-enheter', 'Show all Bluetooth devices')}
          </Button>
        </div>
      )}

      {isSamsungInternet && (
        <p className="text-center text-xs font-medium text-amber-600 dark:text-amber-400">
          {tw(
            'Samsung Internet hittar oftast inga maskiner — öppna passet i Chrome istället.',
            "Samsung Internet usually finds no machines — open the workout in Chrome instead."
          )}
        </p>
      )}

      {!fleet.isSupported && (
        <p className="text-center text-xs text-slate-400">
          {tw(
            'Live-data kräver Chrome på Android eller dator — du kan ändå köra passet och logga manuellt.',
            'Live data needs Chrome on Android or desktop — you can still run the workout and log manually.'
          )}
        </p>
      )}

      {variant === 'prestart' ? (
        <div className="space-y-2">
          <Button
            size="lg"
            onClick={onDone}
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20"
          >
            <Play className="mr-2 h-5 w-5" />
            {tw('Starta passet', 'Start workout')}
          </Button>
          <p className="text-center text-xs text-slate-400">
            {tw(
              'Maskiner kan även anslutas under passet.',
              'Machines can also be connected during the workout.'
            )}
          </p>
        </div>
      ) : (
        <Button variant="secondary" onClick={onDone} className="w-full">
          {tw('Klar', 'Done')}
        </Button>
      )}
    </div>
  )
}

export default ErgMachinePanel
