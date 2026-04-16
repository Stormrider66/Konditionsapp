// lib/program-generator/sport-router.ts
//
// Barrel — the implementation was decomposed into ./sport-router/ as
// part of Phase 7. Keep this file as the historical import path so the
// two call sites (app/api/programs/generate/route.ts and
// scripts/test-multi-sport-generator.ts) don't need to change.

export { generateSportProgram } from './sport-router/dispatcher'
export type {
  AthleteLevelFromVLT2,
  DataSourceType,
  ExperienceLevel,
  MethodologyPaces,
  RacePaceCoefficients,
  SportProgramParams,
} from './sport-router/types'
