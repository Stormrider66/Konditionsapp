/**
 * HYROX program generator — split per Phase 7 into concern-scoped files:
 *
 *   program.ts           main generator orchestrator
 *   empty-program.ts     custom-goal skeleton
 *   mappers.ts           type / intensity / phase / focus / label mappings
 *   running-segments.ts  warmup + work + cooldown + interval segment builder
 *   stations.ts          HYROX_STATIONS config + full-sim & partial-practice
 *                        segment builder
 *   strength.ts          strength session injection (phase-aware, day-spread)
 *   vdot-paces.ts        race-time → VDOT → EliteZonePaces
 *   types.ts             HyroxProgramParams
 */

export { generateHyroxProgram } from './program'
export { addStrengthWorkoutsToProgram } from './strength'
export type { HyroxProgramParams } from './types'
