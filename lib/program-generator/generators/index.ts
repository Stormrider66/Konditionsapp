// lib/program-generator/generators/index.ts
// Re-export all sport generators

export { generateCyclingProgram, type CyclingProgramParams } from './cycling-generator'
export { generateSkiingProgram, type SkiingProgramParams } from './skiing-generator'
export { generateSwimmingProgram, type SwimmingProgramParams } from './swimming-generator'
export { generateTriathlonProgram, type TriathlonProgramParams } from './triathlon-generator'
export { generateHyroxProgram, type HyroxProgramParams } from './hyrox-generator'
export { generateStrengthProgram, type StrengthProgramParams } from './strength-generator'
