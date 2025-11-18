/**
 * Training Engine - Core Calculations, Monitoring & Methodologies
 *
 * Export all training engine modules for easy importing
 *
 * @module training-engine
 */

// Calculation modules
export * from './calculations/dmax'
export * from './calculations/tss-trimp'

// Utility modules
export * from './utils/polynomial-fit'
export * from './utils/interpolation'

// Monitoring modules
export * from './monitoring'

// Methodology modules
export * from './methodologies'

// Field testing modules (Phase 4)
export * from './field-tests'

// Self-reported lactate modules (Phase 5)
export * from './self-reported-lactate'

// Workout modification engine (Phase 8)
export * from './workout-modifier'

// Injury management system (Phase 15)
export * from './injury-management'

// Quality programming modules (Phase 17)
export * from './quality-programming'

// Cross-training integration (Phase 18)
export * from './cross-training'

// Advanced features (Phase 16)
export * from './advanced-features'

// Integration & validation cascades (Phase 12)
export * from './integration/norwegian-validation'
export * from './integration/injury-management'
export * from './integration/multi-system-validation'

// Program generator bridge (Phase 7)
export * from '../program-generator'