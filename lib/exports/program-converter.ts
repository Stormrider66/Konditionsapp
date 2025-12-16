/**
 * Program Converter
 *
 * Converts database TrainingProgram format to ParsedProgram format for export.
 */

import type { ParsedProgram, ParsedPhase, ParsedWorkout } from '@/lib/ai/program-parser';
import type { ProgramWithWeeks, WeekWithDays, WorkoutWithSegments } from '@/types/prisma-types';

// Day keys for weekly template
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/**
 * Convert a database workout to a ParsedWorkout
 */
function convertWorkout(workout: WorkoutWithSegments): ParsedWorkout {
  return {
    type: (workout.type as ParsedWorkout['type']) || 'OTHER',
    name: workout.name || undefined,
    description: workout.description || workout.name || workout.type || '',
    duration: workout.duration || undefined,
    intensity: workout.intensity as ParsedWorkout['intensity'] || undefined,
    // Extract pace/HR from segments if available (DB fields: pace, heartRate, zone)
    targetPace: workout.segments?.[0]?.pace || undefined,
    targetHR: workout.segments?.[0]?.heartRate || undefined,
    zone: workout.segments?.[0]?.zone || undefined,
    segments: workout.segments?.map((seg, index) => ({
      order: seg.order || index + 1,
      type: (seg.type as 'warmup' | 'cooldown' | 'work' | 'interval' | 'rest' | 'exercise') || 'work',
      duration: seg.duration || undefined,
      pace: seg.pace || undefined,
      zone: seg.zone || undefined,
      heartRate: seg.heartRate || undefined,
      description: seg.description || undefined,
    })),
  };
}

/**
 * Build weekly template from a week's days and workouts
 */
function buildWeeklyTemplate(
  week: WeekWithDays
): ParsedPhase['weeklyTemplate'] {
  const template: ParsedPhase['weeklyTemplate'] = {};

  for (const day of week.days) {
    // Day numbers are 1-7 (Monday-Sunday)
    const dayIndex = (day.dayNumber - 1) % 7;
    const dayKey = DAY_KEYS[dayIndex];

    if (day.workouts && day.workouts.length > 0) {
      // Use the first workout for the template
      const workout = day.workouts[0];
      template[dayKey] = convertWorkout(workout);
    } else {
      // Rest day
      template[dayKey] = { type: 'REST' };
    }
  }

  return template;
}

/**
 * Group weeks by phase
 */
function groupWeeksByPhase(weeks: WeekWithDays[]): Map<string, WeekWithDays[]> {
  const phaseMap = new Map<string, WeekWithDays[]>();

  for (const week of weeks) {
    const phaseName = week.phase || 'Träning';
    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, []);
    }
    phaseMap.get(phaseName)!.push(week);
  }

  return phaseMap;
}

/**
 * Convert database TrainingProgram to ParsedProgram for export
 */
export function convertDatabaseProgramToParsed(
  program: ProgramWithWeeks
): ParsedProgram {
  const weeks = program.weeks || [];
  const phaseMap = groupWeeksByPhase(weeks);

  // Build phases from grouped weeks
  const phases: ParsedPhase[] = [];

  for (const [phaseName, phaseWeeks] of phaseMap) {
    // Sort weeks by week number
    phaseWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

    const startWeek = phaseWeeks[0].weekNumber;
    const endWeek = phaseWeeks[phaseWeeks.length - 1].weekNumber;

    // Use the first week's structure as the template for the phase
    const templateWeek = phaseWeeks[0];
    const weeklyTemplate = buildWeeklyTemplate(templateWeek);

    // Extract key workouts from all weeks in this phase
    const keyWorkouts: string[] = [];
    for (const week of phaseWeeks) {
      for (const day of week.days) {
        for (const workout of day.workouts) {
          if (
            workout.intensity === 'THRESHOLD' ||
            workout.intensity === 'INTERVAL' ||
            workout.intensity === 'MAX'
          ) {
            const name = workout.name || workout.type;
            if (!keyWorkouts.includes(name)) {
              keyWorkouts.push(name);
            }
          }
        }
      }
    }

    phases.push({
      name: phaseName,
      weeks: startWeek === endWeek ? `${startWeek}` : `${startWeek}-${endWeek}`,
      focus: phaseWeeks[0].focus || phaseName,
      weeklyTemplate,
      keyWorkouts: keyWorkouts.length > 0 ? keyWorkouts : undefined,
      volumeGuidance: phaseWeeks[0].notes || undefined,
    });
  }

  // Calculate sessions per week from first week
  let sessionsPerWeek = 0;
  if (weeks.length > 0) {
    const firstWeek = weeks[0];
    for (const day of firstWeek.days) {
      if (day.workouts && day.workouts.length > 0) {
        // Count days with non-recovery workouts
        const hasActiveWorkout = day.workouts.some((w) => w.type !== 'RECOVERY');
        if (hasActiveWorkout) {
          sessionsPerWeek++;
        }
      }
    }
  }

  return {
    name: program.name,
    description: program.description || program.name || '',
    totalWeeks: weeks.length,
    methodology: undefined, // Not stored in database
    weeklySchedule: {
      sessionsPerWeek,
    },
    phases,
    notes: program.description || undefined,
  };
}
