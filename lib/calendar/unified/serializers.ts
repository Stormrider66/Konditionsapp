import type { CalendarItemsMode, UnifiedCalendarItem } from './types'

type Row = Record<string, unknown>

export function serializeWorkout(
  workout: Row & {
    id: string
    name: string
    status: string
    type: string
    order: number
    day: { date: Date; dayNumber: number }
  },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const w = workout as any
  return {
    id: workout.id,
    type: 'WORKOUT',
    title: workout.name,
    description: itemsMode === 'light' ? null : w.description,
    date: workout.day.date,
    status: workout.status,
    metadata: {
      workoutType: workout.type,
      ...(itemsMode === 'light'
        ? {}
        : {
            intensity: w.intensity,
            duration: w.duration,
            distance: w.distance,
            programId: w.day.week.program.id,
            programName: w.day.week.program.name,
            phase: w.day.week.phase,
            weekNumber: w.day.week.weekNumber,
            segmentCount: w.segments.length,
            isCompleted: w.logs.length > 0 && w.logs[0].completed,
          }),
      dayNumber: workout.day.dayNumber,
      order: workout.order,
    },
  }
}

export function serializeRace(
  race: Row & { id: string; name: string; date: Date },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const r = race as any
  return {
    id: race.id,
    type: 'RACE',
    title: race.name,
    description:
      itemsMode === 'light'
        ? null
        : `${r.distance}${r.distance?.includes('km') ? '' : ' km'} - ${r.classification} Race`,
    date: race.date,
    metadata: {
      distance: r.distance,
      classification: r.classification,
      ...(itemsMode === 'light'
        ? { isCompleted: !!r.actualTime }
        : {
            targetTime: r.targetTime,
            targetPace: r.targetPace,
            actualTime: r.actualTime,
            actualPace: r.actualPace,
            vdot: r.vdot,
            assessment: r.assessment,
            taperWeeks: r.taperWeeks,
            calendarId: r.calendar?.id,
            seasonName: r.calendar?.seasonName,
            isCompleted: !!r.actualTime,
          }),
    },
  }
}

export function serializeFieldTest(
  test: Row & { id: string; testType: string; date: Date; valid: boolean },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const t = test as any
  const results = itemsMode === 'light' ? null : (t.results as Record<string, unknown> | null)
  return {
    id: test.id,
    type: 'FIELD_TEST',
    title: `Fälttest: ${test.testType.replace(/_/g, ' ')}`,
    description: itemsMode === 'light' ? null : (t.notes ?? null),
    date: test.date,
    status: test.valid ? 'VALID' : 'INVALID',
    metadata: {
      testType: test.testType,
      ...(itemsMode === 'light'
        ? {}
        : {
            lt1Pace: t.lt1Pace,
            lt1HR: t.lt1HR,
            lt2Pace: t.lt2Pace,
            lt2HR: t.lt2HR,
            confidence: t.confidence,
            results,
          }),
      valid: test.valid,
    },
  }
}

export function serializeCalendarEvent(
  event: Row & {
    id: string
    title: string
    description: string | null
    startDate: Date
    endDate: Date
    status: string
    type: string
  },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const e = event as any
  return {
    id: event.id,
    type: 'CALENDAR_EVENT',
    title: event.title,
    description: event.description,
    date: event.startDate,
    endDate: event.endDate,
    status: event.status,
    metadata: {
      eventType: event.type,
      trainingImpact: e.trainingImpact,
      allDay: e.allDay,
      color: e.color,
      ...(itemsMode === 'light'
        ? {}
        : {
            impactNotes: e.impactNotes,
            startTime: e.startTime,
            endTime: e.endTime,
            altitude: e.altitude,
            adaptationPhase: e.adaptationPhase,
            illnessType: e.illnessType,
            returnToTrainingDate: e.returnToTrainingDate,
            medicalClearance: e.medicalClearance,
            isReadOnly: e.isReadOnly,
            externalCalendarType: e.externalCalendarType,
            externalCalendarName: e.externalCalendarName,
            createdBy: e.createdBy,
          }),
    },
  }
}

export function serializeCheckIn(
  checkIn: Row & { id: string; date: Date; readinessScore: number | null; readinessDecision: string | null },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const c = checkIn as any
  return {
    id: checkIn.id,
    type: 'CHECK_IN',
    title: 'Daily Check-in',
    description: itemsMode === 'light' ? null : (c.notes ?? null),
    date: checkIn.date,
    metadata: {
      readinessScore: checkIn.readinessScore,
      readinessDecision: checkIn.readinessDecision,
      ...(itemsMode === 'light'
        ? {}
        : {
            sleepQuality: c.sleepQuality,
            sleepHours: c.sleepHours,
            soreness: c.soreness,
            fatigue: c.fatigue,
            stress: c.stress,
            mood: c.mood,
            restingHR: c.restingHR,
            hrv: c.hrv,
          }),
    },
  }
}

export function serializeWOD(
  wod: Row & { id: string; title: string; createdAt: Date; status: string },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const w = wod as any
  return {
    id: wod.id,
    type: 'WOD',
    title: wod.title,
    description: itemsMode === 'light' ? null : (w.subtitle ?? null),
    date: wod.createdAt,
    status: wod.status,
    metadata: {
      requestedDuration: w.requestedDuration,
      primarySport: w.primarySport,
      ...(itemsMode === 'light'
        ? { isCompleted: w.status === 'COMPLETED' }
        : {
            mode: w.mode,
            actualDuration: w.actualDuration,
            intensityAdjusted: w.intensityAdjusted,
            isCompleted: w.status === 'COMPLETED',
            sessionRPE: w.sessionRPE,
          }),
    },
  }
}

export function serializeAdHoc(
  adHoc: Row & {
    id: string
    workoutName: string | null
    workoutDate: Date
    parsedType: string | null
    inputType: string
  },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const parsed = itemsMode === 'light'
    ? null
    : ((adHoc as any).parsedStructure as Record<string, unknown> | null)
  return {
    id: adHoc.id,
    type: 'AD_HOC',
    title: (parsed?.name as string) || adHoc.workoutName || 'Ad-hoc pass',
    description: itemsMode === 'light' ? null : ((parsed?.notes as string) ?? null),
    date: adHoc.workoutDate,
    status: 'CONFIRMED',
    metadata: {
      inputType: adHoc.inputType,
      workoutType: adHoc.parsedType,
      isCompleted: true,
      ...(itemsMode === 'light'
        ? {}
        : {
            duration: parsed?.duration,
            distance: parsed?.distance,
            perceivedEffort: parsed?.perceivedEffort,
            intensity: parsed?.intensity,
            feeling: parsed?.feeling,
            confidence: (adHoc as any).parsingConfidence,
          }),
    },
  }
}

export function serializeGarmin(
  garmin: Row & {
    id: string
    name: string | null
    type: string | null
    mappedType: string | null
    startDate: Date
    distance: number | null
    duration: number | null
    averageHeartrate: number | null
    maxHeartrate: number | null
    averageSpeed: number | null
    averageWatts: number | null
    calories: number | null
    tss: number | null
    deviceName: string | null
    indoor: boolean | null
  }
): UnifiedCalendarItem {
  const distanceKm = garmin.distance ? garmin.distance / 1000 : null
  const durationMin = garmin.duration ? Math.round(garmin.duration / 60) : null

  let pace: string | null = null
  if (garmin.averageSpeed && garmin.distance && garmin.distance > 0) {
    const secPerKm = 1000 / garmin.averageSpeed
    const min = Math.floor(secPerKm / 60)
    const sec = Math.round(secPerKm % 60)
    pace = `${min}:${sec.toString().padStart(2, '0')}/km`
  }

  return {
    id: garmin.id,
    type: 'GARMIN',
    title: garmin.name || garmin.type || 'Garmin Activity',
    description: null,
    date: garmin.startDate,
    status: 'COMPLETED',
    metadata: {
      workoutType: garmin.mappedType || garmin.type,
      garminType: garmin.type,
      isCompleted: true,
      duration: durationMin,
      distance: distanceKm,
      avgHR: garmin.averageHeartrate,
      maxHR: garmin.maxHeartrate,
      pace,
      avgPower: garmin.averageWatts,
      calories: garmin.calories,
      tss: garmin.tss,
      deviceName: garmin.deviceName,
      indoor: garmin.indoor,
      source: 'garmin',
    },
  }
}
