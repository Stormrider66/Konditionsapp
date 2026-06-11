/**
 * Erg Web Bluetooth integration (FTMS).
 *
 * Live power / cadence / speed from a Wattbike Atom or any FTMS bike, and
 * live power / pace / stroke rate from a Concept2 PM5 (RowErg / SkiErg), plus
 * optional ERG (target-power) control for ramp / FTP protocols. Capture-only
 * on Chrome/Edge/Android — see ./README.md for the iOS constraint.
 */

export { WattbikeClient } from './client';

export type {
  WattbikeStatus,
  WattbikeSource,
  WattbikeSample,
  MachineKind,
  ControlResponse,
  WattbikeEvents,
  WattbikeClientOptions,
} from './types';

export {
  WattbikeRecorder,
  buildErgometerTestRequest,
  submitWattbikeTest,
} from './recorder';

export type {
  WattbikePeakPowerRawData,
  WattbikeCP3MinRawData,
  WattbikeTT20MinRawData,
  WattbikeMapRampRawData,
  WattbikeMapRampStage,
  WattbikeRawData,
  WattbikeLiveMetrics,
  WattbikeTestMeta,
  WattbikeErgometerTestBody,
} from './recorder';
