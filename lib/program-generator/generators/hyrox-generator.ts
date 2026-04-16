// lib/program-generator/generators/hyrox-generator.ts
//
// Barrel: the implementation lives under ./hyrox/ after the Phase 7
// decomposition. Keeping this file as the historical import path so
// consumers (see ./index.ts) don't have to change.

export { generateHyroxProgram, addStrengthWorkoutsToProgram } from './hyrox'
export type { HyroxProgramParams } from './hyrox'
