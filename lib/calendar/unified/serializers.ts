import type { CalendarItemsMode, UnifiedCalendarItem } from './types'

type Row = Record<string, unknown>

function getScheduledWorkoutSource(event: Row) {
  const e = event as any
  const strengthAssignment = e.strengthAssignments?.[0]
  if (strengthAssignment) {
    return {
      kind: 'strength',
      assignmentId: strengthAssignment.id,
      sourceId: strengthAssignment.sessionId,
      sourceName: strengthAssignment.session?.name ?? null,
      status: strengthAssignment.status,
      assignedDate: strengthAssignment.assignedDate,
      completedAt: strengthAssignment.completedAt,
      isCompleted: strengthAssignment.status === 'COMPLETED' || !!strengthAssignment.completedAt,
      resultSummary: {
        duration: strengthAssignment.duration,
        rpe: strengthAssignment.rpe,
      },
    }
  }

  const cardioAssignment = e.cardioAssignments?.[0]
  if (cardioAssignment) {
    return {
      kind: 'cardio',
      assignmentId: cardioAssignment.id,
      sourceId: cardioAssignment.sessionId,
      sourceName: cardioAssignment.session?.name ?? null,
      status: cardioAssignment.status,
      assignedDate: cardioAssignment.assignedDate,
      completedAt: cardioAssignment.completedAt,
      isCompleted: cardioAssignment.status === 'COMPLETED' || !!cardioAssignment.completedAt,
      resultSummary: {
        actualDuration: cardioAssignment.actualDuration,
        actualDistance: cardioAssignment.actualDistance,
        avgHeartRate: cardioAssignment.avgHeartRate,
      },
    }
  }

  const hybridAssignment = e.hybridAssignments?.[0]
  if (hybridAssignment) {
    return {
      kind: 'hybrid',
      assignmentId: hybridAssignment.id,
      sourceId: hybridAssignment.workoutId,
      sourceName: hybridAssignment.workout?.name ?? null,
      status: hybridAssignment.status,
      assignedDate: hybridAssignment.assignedDate,
      completedAt: hybridAssignment.completedAt,
      resultId: hybridAssignment.resultId,
      isCompleted: hybridAssignment.status === 'COMPLETED' || !!hybridAssignment.completedAt,
    }
  }

  const agilityAssignment = e.agilityAssignments?.[0]
  if (agilityAssignment) {
    return {
      kind: 'agility',
      assignmentId: agilityAssignment.id,
      sourceId: agilityAssignment.workoutId,
      sourceName: agilityAssignment.workout?.name ?? null,
      status: agilityAssignment.status,
      assignedDate: agilityAssignment.assignedDate,
      completedAt: agilityAssignment.completedAt,
      isCompleted: agilityAssignment.status === 'COMPLETED' || !!agilityAssignment.completedAt,
    }
  }

  return null
}

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
        ? {
            isCompleted: Array.isArray(w.logs) && w.logs.length > 0 && w.logs[0].completed,
            completedAt: Array.isArray(w.logs) ? (w.logs[0]?.completedAt ?? null) : null,
          }
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
            completedAt: w.logs[0]?.completedAt ?? null,
          }),
      dayNumber: workout.day.dayNumber,
      order: workout.order,
    },
  }
}

export function serializeStandaloneScheduledAssignment(
  assignment: Row & {
    id: string
    kind: 'strength' | 'cardio' | 'hybrid' | 'agility'
    assignedDate: Date
    status: string
    completedAt: Date | null
  },
  itemsMode: CalendarItemsMode
): UnifiedCalendarItem {
  const a = assignment as any
  const source = a.session ?? a.workout ?? null
  const sourceId = a.sessionId ?? a.workoutId ?? source?.id ?? null
  const sourceName = source?.name ?? 'Schemalagt pass'
  const isCompleted = Boolean(
    a.completedAt ||
      a.resultId ||
      a.status === 'COMPLETED' ||
      a.status === 'SKIPPED'
  )

  return {
    id: `scheduled-assignment:${assignment.kind}:${assignment.id}`,
    type: 'CALENDAR_EVENT',
    title: sourceName,
    description: itemsMode === 'light' ? (a.notes ?? null) : (a.notes ?? source?.description ?? null),
    date: assignment.assignedDate,
    endDate: assignment.assignedDate,
    status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
    metadata: {
      eventType: 'SCHEDULED_WORKOUT',
      trainingImpact: 'NORMAL',
      allDay: !a.startTime,
      color: null,
      isReadOnly: false,
      isVirtualAssignment: true,
      startTime: a.startTime,
      endTime: a.endTime,
      locationName: a.locationName,
      teamBroadcastId: a.teamBroadcastId,
      teamId: a.teamBroadcast?.team?.id ?? null,
      teamName: a.teamBroadcast?.team?.name ?? null,
      responsibleCoach: a.responsibleCoach ?? null,
      scheduledWorkoutSource: {
        kind: assignment.kind,
        assignmentId: assignment.id,
        sourceId,
        sourceName,
        status: assignment.status,
        assignedDate: assignment.assignedDate,
        completedAt: assignment.completedAt,
        isCompleted,
      },
      ...(itemsMode === 'light'
        ? {}
        : {
            format: source?.format,
            duration: source?.estimatedDuration ?? source?.totalDuration ?? source?.totalMinutes ?? null,
            timeCap: source?.timeCap,
            distance: source?.totalDistance,
          }),
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
  const scheduledWorkoutSource = event.type === 'SCHEDULED_WORKOUT'
    ? getScheduledWorkoutSource(event)
    : null

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
      isReadOnly: e.isReadOnly,
      startTime: e.startTime,
      endTime: e.endTime,
      scheduledWorkoutSource,
      ...(itemsMode === 'light'
        ? {}
        : {
            impactNotes: e.impactNotes,
            altitude: e.altitude,
            adaptationPhase: e.adaptationPhase,
            illnessType: e.illnessType,
            returnToTrainingDate: e.returnToTrainingDate,
            medicalClearance: e.medicalClearance,
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
