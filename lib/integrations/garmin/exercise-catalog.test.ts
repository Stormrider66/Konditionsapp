import { describe, expect, it } from 'vitest'
import { resolveGarminExercise, extractWeightKg } from './exercise-catalog'

describe('resolveGarminExercise', () => {
  // Henrik's actual EMOM stations (the bug report)
  it("maps Henrik's EMOM stations to the right Garmin enums", () => {
    expect(resolveGarminExercise('Assault bike', '15 cal')).toEqual({ exerciseCategory: 'INDOOR_BIKE', exerciseName: 'ASSAULT_BIKE' })
    expect(resolveGarminExercise('Clean and jerk', '6 @ 40 kg')).toEqual({ exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'CLEAN_AND_JERK' })
    expect(resolveGarminExercise('Row', '15 cal')).toEqual({ exerciseCategory: 'ROW', exerciseName: 'INDOOR_ROW' })
    expect(resolveGarminExercise('Toes to bar')).toEqual({ exerciseCategory: 'CRUNCH', exerciseName: 'TOES_TO_BAR' })
    expect(resolveGarminExercise('Walking lunge', '10 @ 40 kg')).toEqual({ exerciseCategory: 'LUNGE', exerciseName: 'WALKING_LUNGE' })
  })

  it('returns category-only CARDIO for ski erg (no FIT enum exists) and never rowing', () => {
    const ref = resolveGarminExercise('Ski erg', '15 cal')
    expect(ref).toEqual({ exerciseCategory: 'CARDIO' })
    expect(ref?.exerciseName).toBeUndefined()
    // must NOT be misidentified as rowing despite sharing "erg"
    expect(resolveGarminExercise('SkiErg')?.exerciseCategory).not.toBe('ROW')
  })

  it('prefers the compound movement over the generic word it contains', () => {
    // "clean and jerk" must not resolve to plain CLEAN
    expect(resolveGarminExercise('clean and jerk')?.exerciseName).toBe('CLEAN_AND_JERK')
    // "air squat" must not resolve to assault/air bike, and stays a squat
    expect(resolveGarminExercise('air squat')).toEqual({ exerciseCategory: 'SQUAT', exerciseName: 'AIR_SQUAT' })
    // "assault bike" must beat generic bike
    expect(resolveGarminExercise('assault bike')?.exerciseName).toBe('ASSAULT_BIKE')
    // "box jump" beats "box step"
    expect(resolveGarminExercise('box jump')?.exerciseName).toBe('BOX_JUMP')
    // "front squat" beats generic back squat
    expect(resolveGarminExercise('front squat')?.exerciseName).toBe('BARBELL_FRONT_SQUAT')
  })

  it('matches Swedish names', () => {
    expect(resolveGarminExercise('Roddmaskin')?.exerciseCategory).toBe('ROW')
    expect(resolveGarminExercise('Boxhopp')?.exerciseName).toBe('BOX_JUMP')
    expect(resolveGarminExercise('Utfallssteg')?.exerciseCategory).toBe('LUNGE')
    expect(resolveGarminExercise('Marklyft')?.exerciseName).toBe('BARBELL_DEADLIFT')
    expect(resolveGarminExercise('Knäböj')?.exerciseCategory).toBe('SQUAT')
  })

  it('maps common functional-fitness movements', () => {
    expect(resolveGarminExercise('Thruster')?.exerciseName).toBe('THRUSTERS')
    expect(resolveGarminExercise('Wall ball')?.exerciseName).toBe('WALL_BALL')
    expect(resolveGarminExercise('Burpees')?.exerciseName).toBe('BURPEE')
    expect(resolveGarminExercise('Kettlebell swing')?.exerciseName).toBe('KETTLEBELL_SWING')
    expect(resolveGarminExercise('Pull-ups')?.exerciseName).toBe('PULL_UP')
    expect(resolveGarminExercise('Push up')?.exerciseName).toBe('PUSH_UP')
  })

  it('returns null for unmapped / empty text (no regression, description-only)', () => {
    expect(resolveGarminExercise('')).toBeNull()
    expect(resolveGarminExercise(null, undefined)).toBeNull()
    expect(resolveGarminExercise('some obscure mobility drill xyz')).toBeNull()
  })
})

describe('extractWeightKg', () => {
  it('parses kg from free text', () => {
    expect(extractWeightKg('6 clean and jerk 40 kg')).toBe(40)
    expect(extractWeightKg('40kg')).toBe(40)
    expect(extractWeightKg('lunge', '10 @ 22.5 kg')).toBe(22.5)
    expect(extractWeightKg('10 @ 22,5 kg')).toBe(22.5)
  })
  it('returns undefined when no kg present', () => {
    expect(extractWeightKg('15 cal')).toBeUndefined()
    expect(extractWeightKg('10 reps')).toBeUndefined()
    expect(extractWeightKg('')).toBeUndefined()
  })
})
