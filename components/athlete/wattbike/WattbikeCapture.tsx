'use client';

/**
 * Wattbike Capture
 *
 * Connects to a Wattbike over Web Bluetooth, records a chosen ergometer
 * protocol live, and saves it via POST /api/ergometer-tests (which computes
 * CP / FTP / MAP / zones server-side). Capture works in Chrome/Edge on
 * Android/desktop only; on iOS it renders the coach-capture-station guidance.
 *
 * The test is attributed to `clientId`, so a coach can run it on one Android
 * device for an athlete who is on iPhone — the result appears in that athlete's
 * account with no transfer step.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  Gauge,
  Heart,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Square,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWattbike } from '@/hooks/use-wattbike';
import {
  WattbikeRecorder,
  buildErgometerTestRequest,
  submitWattbikeTest,
  type WattbikeLiveMetrics,
  type WattbikeRawData,
} from '@/lib/integrations/wattbike';

type AppLocale = 'en' | 'sv';
const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');
const t = (locale: AppLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText;

type WattbikeProtocol =
  | 'TT_20MIN'
  | 'CP_3MIN_ALL_OUT'
  | 'PEAK_POWER_6S'
  | 'PEAK_POWER_30S'
  | 'MAP_RAMP';

interface ProtocolDef {
  value: WattbikeProtocol;
  sv: string;
  en: string;
  /** Target effort length in seconds (0 = open-ended). */
  targetSec: number;
  /** Minimum seconds of data before the result is savable. */
  minSec: number;
}

const PROTOCOLS: ProtocolDef[] = [
  { value: 'TT_20MIN', sv: '20-min FTP-test', en: '20-min FTP test', targetSec: 1200, minSec: 60 },
  { value: 'CP_3MIN_ALL_OUT', sv: '3-min all-out (CP/W′)', en: '3-min all-out (CP/W′)', targetSec: 180, minSec: 170 },
  { value: 'PEAK_POWER_6S', sv: '6-s toppeffekt', en: '6-s peak power', targetSec: 6, minSec: 6 },
  { value: 'PEAK_POWER_30S', sv: '30-s sprint', en: '30-s sprint', targetSec: 30, minSec: 30 },
  { value: 'MAP_RAMP', sv: 'MAP ramptest', en: 'MAP ramp test', targetSec: 0, minSec: 60 },
];

type Phase = 'idle' | 'recording' | 'review' | 'saving';

export interface WattbikeCaptureProps {
  /** Client (athlete) the saved test is attributed to. */
  clientId: string;
  /** Called with the API response after a successful save. */
  onSaved?: (result: unknown) => void;
  className?: string;
}

const fmtTime = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function WattbikeCapture({ clientId, onSaved, className }: WattbikeCaptureProps) {
  const locale = getAppLocale(useLocale());
  const { toast } = useToast();
  const wb = useWattbike();

  const [protocol, setProtocol] = useState<WattbikeProtocol>('TT_20MIN');
  const [phase, setPhase] = useState<Phase>('idle');
  const [live, setLive] = useState<WattbikeLiveMetrics | null>(null);
  const [rpe, setRpe] = useState('');
  const [mapStart, setMapStart] = useState(100);
  const [mapIncrement, setMapIncrement] = useState(25);
  const [driveErg, setDriveErg] = useState(true);

  const [recorder] = useState(() => new WattbikeRecorder());

  const recordingRef = useRef(false);
  const ergTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const def = PROTOCOLS.find((p) => p.value === protocol)!;

  // Pipe the BLE stream into the recorder while recording.
  useEffect(() => {
    const off = wb.client.on('data', (sample) => {
      if (!recordingRef.current) return;
      recorder.add(sample);
      setLive(recorder.liveMetrics());
    });
    return off;
  }, [wb.client, recorder]);

  // Surface client errors as toasts.
  useEffect(() => {
    if (wb.error) {
      toast({
        title: t(locale, 'Fel', 'Error'),
        description: wb.error.message,
        variant: 'destructive',
      });
    }
  }, [wb.error, locale, toast]);

  const clearErgTimer = useCallback(() => {
    if (ergTimerRef.current) {
      clearInterval(ergTimerRef.current);
      ergTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearErgTimer, [clearErgTimer]);

  const handleStart = useCallback(async () => {
    recorder.start();
    setLive(null);
    recordingRef.current = true;
    setPhase('recording');

    // Optionally drive the ERG ramp for MAP tests.
    if (protocol === 'MAP_RAMP' && driveErg && wb.canControl) {
      try {
        await wb.setTargetPower(mapStart);
        let minute = 1;
        ergTimerRef.current = setInterval(() => {
          void wb.setTargetPower(mapStart + mapIncrement * minute).catch(() => {});
          minute += 1;
        }, 60_000);
      } catch {
        /* control failures are non-fatal — coach can adjust resistance manually */
      }
    }
  }, [recorder, protocol, driveErg, wb, mapStart, mapIncrement]);

  const handleStop = useCallback(() => {
    recordingRef.current = false;
    recorder.stop();
    clearErgTimer();
    if (protocol === 'MAP_RAMP' && wb.canControl) {
      void wb.client.reset().catch(() => {});
    }
    setLive(recorder.liveMetrics());
    setPhase('review');
  }, [recorder, clearErgTimer, protocol, wb]);

  const handleDiscard = useCallback(() => {
    recorder.start();
    recorder.stop();
    setLive(null);
    setRpe('');
    setPhase('idle');
  }, [recorder]);

  const buildRawData = useCallback((): WattbikeRawData => {
    switch (protocol) {
      case 'CP_3MIN_ALL_OUT':
        return recorder.cp3MinRawData();
      case 'PEAK_POWER_6S':
        return recorder.peakPowerRawData(6);
      case 'PEAK_POWER_30S':
        return recorder.peakPowerRawData(30);
      case 'MAP_RAMP':
        return recorder.mapRampRawData({ startPower: mapStart, increment: mapIncrement });
      case 'TT_20MIN':
      default:
        return recorder.tt20MinRawData();
    }
  }, [protocol, recorder, mapStart, mapIncrement]);

  const handleSave = useCallback(async () => {
    setPhase('saving');
    try {
      const body = buildErgometerTestRequest(protocol, buildRawData(), {
        clientId,
        rpe: rpe ? Number(rpe) : undefined,
      });
      const result = await submitWattbikeTest(body);
      toast({
        title: t(locale, 'Test sparat', 'Test saved'),
        description: t(locale, 'Resultatet är tillgängligt i atletens profil.', 'The result is available in the athlete profile.'),
      });
      onSaved?.(result);
      handleDiscard();
    } catch (err) {
      toast({
        title: t(locale, 'Kunde inte spara', 'Could not save'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
      setPhase('review');
    }
  }, [protocol, buildRawData, clientId, rpe, locale, toast, onSaved, handleDiscard]);

  // -- Unsupported (iOS) -----------------------------------------------------
  if (!wb.isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t(locale, 'Wattbike-mätning ej tillgänglig här', 'Wattbike capture unavailable here')}
          </CardTitle>
          <CardDescription>
            {t(
              locale,
              'Live-mätning kräver Chrome eller Edge på Android eller dator. På iPhone/iPad: be din coach köra testet på en Android-enhet — resultatet dyker upp här automatiskt.',
              'Live capture needs Chrome or Edge on Android or desktop. On iPhone/iPad, ask your coach to run the test on an Android device — the result appears here automatically.',
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const connected = wb.status === 'connected';
  const elapsed = live?.elapsedSec ?? 0;
  const belowMin = elapsed < def.minSec;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Wattbike
          </span>
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected
              ? wb.deviceName ?? t(locale, 'Ansluten', 'Connected')
              : wb.status === 'connecting' || wb.status === 'reconnecting'
                ? t(locale, 'Ansluter…', 'Connecting…')
                : t(locale, 'Ej ansluten', 'Not connected')}
          </Badge>
        </CardTitle>
        {!connected && (
          <CardDescription>
            {t(locale, 'Anslut cykeln via Bluetooth för att börja mäta.', 'Connect the bike over Bluetooth to start capturing.')}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connect */}
        {!connected && (
          <Button
            onClick={() => void wb.connect()}
            disabled={wb.status === 'connecting' || wb.status === 'reconnecting'}
            className="w-full"
          >
            {wb.status === 'connecting' || wb.status === 'reconnecting' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bluetooth className="mr-2 h-4 w-4" />
            )}
            {t(locale, 'Anslut Wattbike', 'Connect Wattbike')}
          </Button>
        )}

        {/* Protocol picker + start (idle) */}
        {connected && phase === 'idle' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t(locale, 'Testprotokoll', 'Test protocol')}</Label>
              <Select value={protocol} onValueChange={(v) => setProtocol(v as WattbikeProtocol)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(locale, p.sv, p.en)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {protocol === 'MAP_RAMP' && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="map-start">{t(locale, 'Starteffekt (W)', 'Start power (W)')}</Label>
                    <Input
                      id="map-start"
                      type="number"
                      value={mapStart}
                      onChange={(e) => setMapStart(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="map-inc">{t(locale, 'Ökning/min (W)', 'Increment/min (W)')}</Label>
                    <Input
                      id="map-inc"
                      type="number"
                      value={mapIncrement}
                      onChange={(e) => setMapIncrement(Number(e.target.value))}
                    />
                  </div>
                </div>
                {wb.canControl && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={driveErg}
                      onChange={(e) => setDriveErg(e.target.checked)}
                    />
                    {t(locale, 'Styr motståndet automatiskt (ERG)', 'Drive resistance automatically (ERG)')}
                  </label>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => void wb.disconnect()}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                {t(locale, 'Koppla från', 'Disconnect')}
              </button>
              <Button onClick={() => void handleStart()}>
                <Play className="mr-2 h-4 w-4" />
                {t(locale, 'Starta', 'Start')}
              </Button>
            </div>
          </div>
        )}

        {/* Live recording */}
        {phase === 'recording' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">{live?.power ?? 0}</div>
              <div className="text-sm text-muted-foreground">{t(locale, 'watt', 'watts')}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={<Gauge className="h-4 w-4" />} value={live?.cadence ?? '–'} unit="rpm" />
              <Metric icon={<Heart className="h-4 w-4" />} value={live?.heartRate ?? '–'} unit="bpm" />
              <Metric
                icon={null}
                value={fmtTime(elapsed)}
                unit={def.targetSec ? `/ ${fmtTime(def.targetSec)}` : t(locale, 'tid', 'time')}
              />
            </div>
            <Button onClick={handleStop} variant="destructive" className="w-full">
              <Square className="mr-2 h-4 w-4" />
              {t(locale, 'Stoppa', 'Stop')}
            </Button>
          </div>
        )}

        {/* Review + save */}
        {(phase === 'review' || phase === 'saving') && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={null} value={live?.avgPower ?? 0} unit={t(locale, 'snitt W', 'avg W')} />
              <Metric icon={null} value={live?.maxPower ?? 0} unit={t(locale, 'max W', 'peak W')} />
              <Metric icon={null} value={fmtTime(elapsed)} unit={t(locale, 'tid', 'time')} />
            </div>

            {belowMin && (
              <p className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {t(
                  locale,
                  `För kort för ${t(locale, def.sv, def.en)} (minst ${fmtTime(def.minSec)}).`,
                  `Too short for ${t(locale, def.sv, def.en)} (need at least ${fmtTime(def.minSec)}).`,
                )}
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="rpe">{t(locale, 'RPE (1–10, valfritt)', 'RPE (1–10, optional)')}</Label>
              <Input
                id="rpe"
                type="number"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className="w-24"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleDiscard} disabled={phase === 'saving'}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t(locale, 'Förkasta', 'Discard')}
              </Button>
              <Button onClick={() => void handleSave()} disabled={phase === 'saving' || belowMin}>
                {phase === 'saving' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t(locale, 'Spara test', 'Save test')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  value,
  unit,
}: {
  icon: ReactNode;
  value: ReactNode;
  unit: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  );
}
