import { describe, expect, it } from 'vitest'
import {
  mergeImportedWorkoutDraftInput,
  type ImportedWorkoutDraftInput,
} from '@/lib/ai/athlete-workout-import'

const baseDraft: ImportedWorkoutDraftInput = {
  version: 1,
  source: {
    kind: 'text',
    filename: null,
  },
  workoutType: 'STRENGTH',
  assignedDate: '2026-06-26',
  name: 'Original strength',
  notes: null,
  parsedWorkout: {
    workoutType: 'STRENGTH',
    name: 'Original strength',
    exercises: [
      {
        exerciseName: 'Back Squat',
        sets: 5,
        reps: 5,
      },
    ],
  },
  mappings: {
    'Back Squat': 'exercise-1',
  },
  candidateLookup: {
    'Back Squat': 'Back Squat',
  },
  warnings: [],
  modelUsed: 'Test Model',
  inputKind: 'text',
}

describe('mergeImportedWorkoutDraftInput', () => {
  it('applies the supported light edits without touching parsed workout details', () => {
    const result = mergeImportedWorkoutDraftInput(baseDraft, {
      assignedDate: '2026-06-27',
      name: 'Edited name',
      workoutType: 'STRENGTH',
      notes: 'Bring lifting shoes',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.input.assignedDate).toBe('2026-06-27')
    expect(result.input.name).toBe('Edited name')
    expect(result.input.notes).toBe('Bring lifting shoes')
    expect(result.input.parsedWorkout).toEqual(baseDraft.parsedWorkout)
  })

  it('rejects invalid edit payloads', () => {
    const result = mergeImportedWorkoutDraftInput(baseDraft, {
      assignedDate: 'tomorrow',
    })

    expect(result.success).toBe(false)
  })

  it('keeps the original draft when no edits are supplied', () => {
    const result = mergeImportedWorkoutDraftInput(baseDraft, undefined)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.input).toEqual(baseDraft)
  })
})
