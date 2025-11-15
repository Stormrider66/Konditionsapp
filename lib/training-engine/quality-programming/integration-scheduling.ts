/**
 * Integration Scheduling System
 *
 * Optimizes timing of strength/plyometric work relative to running
 * to maximize adaptation while preventing interference effects
 *
 * Key principles:
 * - Same-day sequencing for hard days (6+ hours apart)
 * - Easy days stay truly easy
 * - 48-hour recovery between strength sessions
 * - No strength within 48 hours of key running workouts
 */

import { StrengthPhase, PlyometricIntensity } from './types';

export interface IntegrationSchedule {
  weekStructure: DaySchedule[];
  totalWeeklyMinutes: number;
  interferenceRisk: 'LOW' | 'MODERATE' | 'HIGH';
  recommendations: string[];
}

export interface DaySchedule {
  day: number;               // 1-7 (Monday = 1)
  running: RunningSession | null;
  strength: StrengthSession | null;
  plyometric: PlyometricSession | null;
  drills: DrillSession | null;
  recovery: RecoverySession | null;
  timing: TimingGuidance;
}

export interface TimingGuidance {
  sequence: string[];        // Order of activities
  gaps: number[];            // Hours between activities
  reasoning: string;
  alternatives?: string[];
}

export interface RunningSession {
  type: string;
  duration: number;
  intensity: 'EASY' | 'MODERATE' | 'HARD';
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface StrengthSession {
  phase: StrengthPhase;
  duration: number;
  exercises: string[];
  timing: 'MORNING' | 'EVENING';
}

export interface PlyometricSession {
  contacts: number;
  duration: number;
  intensity: PlyometricIntensity;
}

export interface DrillSession {
  drills: string[];
  duration: number;
  focus: string;
}

export interface RecoverySession {
  type: 'COMPLETE_REST' | 'ACTIVE_RECOVERY';
  activities?: string[];
}

export interface WeeklyRunning {
  [day: number]: {
    type: string;
    duration: number;
    intensity: 'EASY' | 'MODERATE' | 'HARD';
    importance: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface TimeConstraints {
  preferSameDayTraining: boolean;
  maxSessionDuration: number; // minutes
  availableDays: number[];
  morningAvailable: boolean;
  eveningAvailable: boolean;
}

/**
 * Generate optimal integration schedule
 */
export function generateIntegrationSchedule(
  runningProgram: WeeklyRunning,
  strengthPhase: StrengthPhase,
  athleteLevel: string,
  availableDays: number,
  timeConstraints: TimeConstraints
): IntegrationSchedule {

  const weekStructure: DaySchedule[] = [];

  // Identify hard and easy running days
  const hardRunningDays = identifyHardDays(runningProgram);
  const easyRunningDays = identifyEasyDays(runningProgram);

  // Schedule strength training
  const strengthDays = scheduleStrengthTraining(
    hardRunningDays,
    strengthPhase,
    timeConstraints
  );

  // Schedule plyometrics (if not combined with strength)
  const plyometricDays = schedulePlyometrics(
    strengthDays,
    hardRunningDays,
    athleteLevel
  );

  // Schedule drills
  const drillDays = scheduleDrills(
    hardRunningDays,
    easyRunningDays,
    strengthDays
  );

  // Build daily schedules
  for (let day = 1; day <= 7; day++) {
    const daySchedule = buildDaySchedule(
      day,
      runningProgram,
      strengthDays,
      plyometricDays,
      drillDays,
      timeConstraints
    );

    weekStructure.push(daySchedule);
  }

  // Calculate interference risk
  const interferenceRisk = assessInterferenceRisk(weekStructure);

  // Generate recommendations
  const recommendations = generateIntegrationRecommendations(
    weekStructure,
    interferenceRisk,
    athleteLevel
  );

  return {
    weekStructure,
    totalWeeklyMinutes: calculateTotalMinutes(weekStructure),
    interferenceRisk,
    recommendations
  };
}

/**
 * Schedule strength training optimally
 *
 * Preferred approach: Same day as hard running (6+ hours apart)
 * Alternative: Separate days with 48+ hour gap from next hard run
 */
function scheduleStrengthTraining(
  hardRunningDays: number[],
  strengthPhase: StrengthPhase,
  timeConstraints: TimeConstraints
): { day: number; timing: string }[] {

  const strengthSchedule: { day: number; timing: string }[] = [];

  // Frequency based on phase
  const frequency = strengthPhase === 'MAINTENANCE' ? 1 : 2;

  if (timeConstraints.preferSameDayTraining) {
    // Option A: Same day as hard running
    for (let i = 0; i < frequency && i < hardRunningDays.length; i++) {
      strengthSchedule.push({
        day: hardRunningDays[i],
        timing: 'EVENING' // 6+ hours after morning run
      });
    }
  } else {
    // Option B: Separate days
    const availableDays = [1, 2, 3, 4, 5, 6, 7].filter(day =>
      !hardRunningDays.includes(day)
    );

    for (let i = 0; i < frequency && i < availableDays.length; i++) {
      strengthSchedule.push({
        day: availableDays[i],
        timing: 'MORNING_OR_EVENING'
      });
    }
  }

  return strengthSchedule;
}

/**
 * Assess interference risk between running and strength training
 */
function assessInterferenceRisk(weekStructure: DaySchedule[]): 'LOW' | 'MODERATE' | 'HIGH' {
  let riskFactors = 0;

  weekStructure.forEach(day => {
    // Same day with <6 hours gap
    if (day.running && day.strength) {
      const gap = day.timing.gaps[0] || 0;
      if (gap < 6) riskFactors += 2;
    }

    // Strength day before hard running
    const nextDay = weekStructure[(day.day % 7)];
    if (day.strength && nextDay?.running?.intensity === 'HARD') {
      riskFactors += 1;
    }

    // Too many quality days per week
    const qualityCount = weekStructure.filter(d =>
      (d.running?.intensity === 'HARD') || d.strength || d.plyometric
    ).length;
    if (qualityCount > 4) riskFactors += 1;
  });

  if (riskFactors >= 4) return 'HIGH';
  if (riskFactors >= 2) return 'MODERATE';
  return 'LOW';
}

/**
 * Generate integration recommendations based on schedule analysis
 */
function generateIntegrationRecommendations(
  schedule: DaySchedule[],
  interferenceRisk: string,
  athleteLevel: string
): string[] {

  const recommendations: string[] = [];

  if (interferenceRisk === 'HIGH') {
    recommendations.push('⚠️ High interference risk detected');
    recommendations.push('Consider reducing strength frequency or adjusting timing');
    recommendations.push('Monitor recovery closely - may need to drop to maintenance phase');
  }

  if (interferenceRisk === 'MODERATE') {
    recommendations.push('Moderate interference risk - monitor recovery');
    recommendations.push('Ensure minimum 6 hours between running and strength on same days');
  }

  // Athlete-level specific recommendations
  switch (athleteLevel) {
    case 'RECREATIONAL':
      recommendations.push('Focus on consistency over intensity');
      recommendations.push('2x weekly strength training sufficient');
      recommendations.push('Prioritize injury prevention exercises');
      break;

    case 'ADVANCED':
      recommendations.push('Can handle 2-3x weekly strength training');
      recommendations.push('Emphasize maximum strength phase during base training');
      recommendations.push('Maintain strength work year-round');
      break;

    case 'ELITE':
      recommendations.push('Year-round strength training essential');
      recommendations.push('Careful timing around key workouts and competitions');
      recommendations.push('Consider velocity-based training for autoregulation');
      break;
  }

  return recommendations;
}

function identifyHardDays(program: WeeklyRunning): number[] {
  return Object.entries(program)
    .filter(([_, session]) => session.intensity === 'HARD')
    .map(([day, _]) => parseInt(day));
}

function identifyEasyDays(program: WeeklyRunning): number[] {
  return Object.entries(program)
    .filter(([_, session]) => session.intensity === 'EASY')
    .map(([day, _]) => parseInt(day));
}

function schedulePlyometrics(
  strengthDays: { day: number; timing: string }[],
  hardRunningDays: number[],
  athleteLevel: string
): { day: number; timing: string }[] {
  // Combine with strength sessions for efficiency
  return strengthDays.map(s => ({ ...s, timing: 'BEFORE_STRENGTH' }));
}

function scheduleDrills(
  hardRunningDays: number[],
  easyRunningDays: number[],
  strengthDays: { day: number; timing: string }[]
): { day: number; timing: string }[] {
  // Schedule drills on hard running days (before workout) and easy days (after workout)
  return hardRunningDays.map(day => ({ day, timing: 'PRE_WORKOUT' }));
}

function buildDaySchedule(
  day: number,
  runningProgram: WeeklyRunning,
  strengthDays: { day: number; timing: string }[],
  plyometricDays: { day: number; timing: string }[],
  drillDays: { day: number; timing: string }[],
  timeConstraints: TimeConstraints
): DaySchedule {

  const running = runningProgram[day] || null;
  const strengthDay = strengthDays.find(s => s.day === day);
  const plyometricDay = plyometricDays.find(p => p.day === day);
  const drillDay = drillDays.find(d => d.day === day);

  let timing: TimingGuidance = {
    sequence: [],
    gaps: [],
    reasoning: ''
  };

  if (running && strengthDay) {
    timing = {
      sequence: ['Morning: Running', 'Evening: Strength (6+ hours later)'],
      gaps: [6],
      reasoning: 'Same-day training minimizes interference when properly spaced'
    };
  } else if (running) {
    timing = {
      sequence: ['Running only'],
      gaps: [],
      reasoning: 'Focus day for running adaptation'
    };
  } else if (strengthDay) {
    timing = {
      sequence: ['Strength training'],
      gaps: [],
      reasoning: 'Dedicated strength session'
    };
  }

  return {
    day,
    running,
    strength: strengthDay ? {
      phase: 'MAXIMUM_STRENGTH',
      duration: 60,
      exercises: [],
      timing: 'EVENING'
    } : null,
    plyometric: plyometricDay ? {
      contacts: 80,
      duration: 20,
      intensity: 'MODERATE'
    } : null,
    drills: drillDay ? {
      drills: ['Strides'],
      duration: 15,
      focus: 'Neuromuscular activation'
    } : null,
    recovery: !running && !strengthDay ? {
      type: 'COMPLETE_REST'
    } : null,
    timing
  };
}

function calculateTotalMinutes(schedule: DaySchedule[]): number {
  return schedule.reduce((total, day) => {
    let dayMinutes = 0;
    if (day.strength) dayMinutes += day.strength.duration;
    if (day.plyometric) dayMinutes += day.plyometric.duration;
    if (day.drills) dayMinutes += day.drills.duration;
    return total + dayMinutes;
  }, 0);
}
