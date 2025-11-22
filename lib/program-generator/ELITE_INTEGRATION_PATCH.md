# Elite Pace System Integration - Program Generator Patch

This document describes the exact changes needed to integrate the elite pace system into the existing program generator (`lib/program-generator/index.ts`).

## Summary of Changes

The integration adds:
1. **Elite pace fetching** from the comprehensive pace selector API
2. **Automatic fallback** to legacy zone calculation if API unavailable
3. **Enhanced logging** for debugging and transparency
4. **Methodology auto-selection** based on athlete classification
5. **Zone confidence warnings** for coaches

## Required Changes

### 1. Add Import at Top of File

```typescript
// ADD THIS IMPORT (around line 4, with other imports)
import {
  fetchElitePaces,
  validateEliteZones,
  getRecommendedMethodology,
  getZoneConfidenceWarnings,
  formatZoneSummary,
  type EliteZonePaces,
} from './elite-pace-integration'
```

### 2. Update generateBaseProgram Function

**Location:** Around line 132 (start of `generateBaseProgram` function)

**REPLACE THIS:**
```typescript
export async function generateBaseProgram(
  test: Test,
  client: Client,
  params: ProgramGenerationParams
): Promise<CreateTrainingProgramDTO> {
  // Validate inputs
  if (!test.trainingZones || test.trainingZones.length === 0) {
    throw new Error('Test must have training zones calculated')
  }
```

**WITH THIS:**
```typescript
export async function generateBaseProgram(
  test: Test,
  client: Client,
  params: ProgramGenerationParams
): Promise<CreateTrainingProgramDTO> {
  console.log('=====================================')
  console.log('PROGRAM GENERATION: Starting')
  console.log('=====================================\n')

  // NEW: Fetch elite paces from comprehensive pace selector
  console.log('[1/6] Fetching elite paces...')
  let elitePaces: EliteZonePaces | null = null

  try {
    elitePaces = await fetchElitePaces(client.id)

    if (elitePaces && validateEliteZones(elitePaces)) {
      console.log('✓ Elite paces fetched successfully')
      console.log('  Source:', elitePaces.source)
      console.log('  Confidence:', elitePaces.confidence)
      console.log('  Athlete Level:', elitePaces.athleteLevel)
      if (elitePaces.metabolicType) {
        console.log('  Metabolic Type:', elitePaces.metabolicType)
      }

      // Check for warnings
      const warnings = getZoneConfidenceWarnings(elitePaces)
      if (warnings.length > 0) {
        console.log('\n⚠️  Zone Confidence Warnings:')
        warnings.forEach((w) => console.log('   -', w))
      }
    } else {
      console.log('⚠️  Elite paces not available, using legacy zone calculation')
    }
  } catch (error) {
    console.error('❌ Error fetching elite paces:', error)
    console.log('   Using legacy zone calculation from test')
  }

  // Validate inputs (updated to allow elite paces OR test zones)
  if (!elitePaces && (!test.trainingZones || test.trainingZones.length === 0)) {
    throw new Error('Test must have training zones calculated OR client must have race results/lactate data')
  }
```

### 3. Update Zone Calculation

**Location:** Around line 192 (zone calculation)

**REPLACE THIS:**
```typescript
  // Get training paces/powers from test zones
  const zones = test.testType === 'CYCLING'
    ? calculateZonePowers(test.trainingZones)
    : calculateZonePaces(test.trainingZones)
```

**WITH THIS:**
```typescript
  // Get training paces/powers (elite or legacy)
  console.log('\n[2/6] Determining training zones...')
  const zones = (elitePaces && validateEliteZones(elitePaces))
    ? elitePaces.legacy // Use elite-calculated paces
    : (test.testType === 'CYCLING'
        ? calculateZonePowers(test.trainingZones)
        : calculateZonePaces(test.trainingZones))

  if (elitePaces && validateEliteZones(elitePaces)) {
    console.log('✓ Using ELITE pace system')
    console.log('  Marathon pace:', elitePaces.core.marathon)
    console.log('  Threshold pace:', elitePaces.core.threshold)
  } else {
    console.log('✓ Using LEGACY zone calculation')
    console.log('  Zone 2 (Marathon):', zones.zone2)
    console.log('  Zone 3 (Threshold):', zones.zone3)
  }
```

### 4. Update Methodology Selection

**Location:** Around line 145 (methodology selection)

**REPLACE THIS:**
```typescript
  if (params.methodology === 'AUTO' || !params.methodology) {
    // Auto-select methodology based on athlete level and goal
    if (athleteLevel === 'ELITE' || athleteLevel === 'ADVANCED') {
      if (params.goalType === 'marathon' || params.goalType === 'half-marathon') {
        methodology = 'CANOVA' // Best for advanced marathoners
      } else {
        methodology = 'POLARIZED' // Best for general elite training
      }
    } else {
      methodology = 'POLARIZED' // Safe default for beginners/recreational
    }
  }
```

**WITH THIS:**
```typescript
  console.log('\n[3/6] Selecting training methodology...')
  if (params.methodology === 'AUTO' || !params.methodology) {
    // Auto-select using elite classification if available
    if (elitePaces && validateEliteZones(elitePaces)) {
      methodology = getRecommendedMethodology(
        elitePaces.athleteLevel,
        elitePaces.metabolicType,
        params.goalType
      )
      console.log(`✓ Auto-selected: ${methodology} (from elite classification)`)
    } else {
      // Fallback to legacy rule-based selection
      if (athleteLevel === 'ELITE' || athleteLevel === 'ADVANCED') {
        if (params.goalType === 'marathon' || params.goalType === 'half-marathon') {
          methodology = 'CANOVA'
        } else {
          methodology = 'POLARIZED'
        }
      } else {
        methodology = 'POLARIZED'
      }
      console.log(`✓ Auto-selected: ${methodology} (legacy rules)`)
    }
  } else {
    console.log(`✓ Using specified: ${methodology}`)
  }
```

### 5. Update buildWeek Calls

**Location:** Around line 270 (buildWeek call)

**REPLACE THIS:**
```typescript
    const week = await buildWeek(
      weekNum + 1,
      weekData.phase,
      adjustedVolume,
      trainingDays,
      zones as any,
      test.trainingZones,
      params.experienceLevel,
      params.goalType,
      weekData.focus,
      methodologyConfig,
      athleteLevel,
      weekInPhase,
      test,
      params
    )
```

**WITH THIS:**
```typescript
    const week = await buildWeek(
      weekNum + 1,
      weekData.phase,
      adjustedVolume,
      trainingDays,
      zones as any,
      test.trainingZones,
      params.experienceLevel,
      params.goalType,
      weekData.focus,
      methodologyConfig,
      athleteLevel,
      weekInPhase,
      test,
      params,
      elitePaces // ADD THIS PARAMETER
    )
```

### 6. Update buildWeek Function Signature

**Location:** Around line 312 (buildWeek function)

**REPLACE THIS:**
```typescript
async function buildWeek(
  weekNumber: number,
  phase: PeriodPhase,
  volumePercentage: number,
  trainingDays: number,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  focus: string,
  methodologyConfig: MethodologyConfig,
  athleteLevel: AthleteLevel,
  weekInPhase: number,
  test: Test,
  params: ProgramGenerationParams
): Promise<CreateTrainingWeekDTO> {
```

**WITH THIS:**
```typescript
async function buildWeek(
  weekNumber: number,
  phase: PeriodPhase,
  volumePercentage: number,
  trainingDays: number,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  focus: string,
  methodologyConfig: MethodologyConfig,
  athleteLevel: AthleteLevel,
  weekInPhase: number,
  test: Test,
  params: ProgramGenerationParams,
  elitePaces: EliteZonePaces | null // ADD THIS PARAMETER
): Promise<CreateTrainingWeekDTO> {
```

### 7. Add Logging at End of buildWeek

**Location:** Inside buildWeek function, after workouts are created

**ADD THIS:**
```typescript
  // Log elite pace usage for this week
  if (elitePaces) {
    console.log(`  Week ${weekNumber}: Using ${elitePaces.source} paces (${elitePaces.confidence} confidence)`)
  }
```

## Testing the Integration

After making these changes:

1. **Test with race data:**
   ```typescript
   // Client has recent race results
   // Should see: "Using ELITE pace system"
   // Should see: VDOT-based paces
   ```

2. **Test with lactate data:**
   ```typescript
   // Client has lactate test, no race
   // Should see: "Using ELITE pace system"
   // Should see: Individual ratio method paces
   ```

3. **Test with no data:**
   ```typescript
   // Client has only test zones
   // Should see: "Using LEGACY zone calculation"
   // Should see: Original zone-based paces
   ```

4. **Check console output:**
   ```
   =====================================
   PROGRAM GENERATION: Starting
   =====================================

   [1/6] Fetching elite paces...
   ✓ Elite paces fetched successfully
     Source: VDOT
     Confidence: HIGH
     Athlete Level: ADVANCED
     Metabolic Type: FAST_TWITCH_ENDURANCE

   [2/6] Determining training zones...
   ✓ Using ELITE pace system
     Marathon pace: 4:26/km
     Threshold pace: 4:04/km

   [3/6] Selecting training methodology...
   ✓ Auto-selected: CANOVA (from elite classification)
   ```

## Benefits

1. **Race-based precision**: 1:28 HM athlete gets 4:25-4:30/km marathon pace (not wrong 4:13/km)
2. **Individual lactate ratios**: Works for Paula Radcliffe (2 mmol LT2) and high-lactate athletes (10 mmol LT2)
3. **Automatic fallback**: System degrades gracefully if elite data unavailable
4. **Enhanced logging**: Coaches can see exactly which paces are being used
5. **Methodology optimization**: Auto-selects best training system for athlete profile

## Rollback Plan

If issues occur, remove the elite pace integration by:
1. Remove `fetchElitePaces()` call
2. Set `elitePaces = null` at the start
3. System will use legacy calculation automatically

The integration is **backward compatible** and **safe to deploy**.
