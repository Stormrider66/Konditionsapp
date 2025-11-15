/**
 * Automatic Load Reduction Algorithms
 *
 * Integrates with workout modification system to automatically adjust
 * training based on injury severity and ACWR status
 */

import { InjuryDecision, ACWRAssessment, TrainingModification } from './types';

/**
 * Calculate load reduction based on injury severity
 *
 * Severity levels:
 * - Mild (pain 3-4/10, no gait): 30% reduction, 1-2 weeks
 * - Moderate (pain 5-6/10, mild gait): 50% reduction, 2-4 weeks
 * - Severe (pain 7+/10, significant gait): 100% reduction, medical evaluation
 */
export function calculateLoadReduction(
  injuryDecision: InjuryDecision,
  currentWeeklyVolume: number,
  acwrStatus: ACWRAssessment
): TrainingModification[] {

  const modifications: TrainingModification[] = [];

  // Base reduction from injury
  switch (injuryDecision.severity) {
    case 'GREEN':
      // No injury-based reduction
      break;

    case 'YELLOW':
      modifications.push({
        type: 'VOLUME_REDUCTION',
        percentage: 20,
        duration: '1_WEEK',
        alternatives: ['Consider cross-training for 30% of volume']
      });
      modifications.push({
        type: 'INTENSITY_REDUCTION',
        percentage: 30,
        duration: '1_WEEK'
      });
      break;

    case 'RED':
      modifications.push({
        type: 'VOLUME_REDUCTION',
        percentage: 50,
        duration: '2_WEEKS',
        alternatives: ['Replace 50% with deep water running or cycling']
      });
      modifications.push({
        type: 'INTENSITY_REDUCTION',
        percentage: 60,
        duration: '2_WEEKS'
      });
      break;

    case 'CRITICAL':
      modifications.push({
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE',
        alternatives: []
      });
      break;
  }

  // Additional reduction from ACWR if needed
  if (acwrStatus.zone === 'DANGER' || acwrStatus.zone === 'CRITICAL') {
    const acwrReduction = acwrStatus.zone === 'CRITICAL' ? 40 : 25;

    modifications.push({
      type: 'VOLUME_REDUCTION',
      percentage: acwrReduction,
      duration: '1_WEEK',
      alternatives: [`ACWR-based reduction due to ${acwrStatus.zone} zone (${acwrStatus.acwr})`]
    });
  }

  return modifications;
}

/**
 * Apply injury-specific workout modifications
 */
export function applyInjurySpecificModifications(
  workout: any,
  injuryLocation?: string
): any {
  if (!injuryLocation) return workout;

  const modifications: { [key: string]: any } = {};

  switch (injuryLocation) {
    case 'PLANTAR_FASCIITIS':
      modifications.surfaceRecommendation = 'Avoid concrete, prefer track or trails';
      modifications.footwearNote = 'Ensure proper arch support and cushioning';
      modifications.avoidActivities = ['Hill running', 'Barefoot running', 'Minimal shoes'];
      break;

    case 'ACHILLES_TENDINOPATHY':
      modifications.surfaceRecommendation = 'Flat surfaces only, avoid hills';
      modifications.morningNote = 'Monitor morning stiffness - stop if >15 minutes';
      modifications.avoidActivities = ['Hill running', 'Speed work', 'Plyometrics'];
      break;

    case 'IT_BAND_SYNDROME':
      modifications.surfaceRecommendation = 'Avoid cambered roads, prefer flat surfaces';
      modifications.cadenceNote = 'Increase cadence 5-10% to reduce hip adduction';
      modifications.avoidActivities = ['Downhill running', 'Track turns (same direction)'];
      break;

    case 'PATELLOFEMORAL_PAIN':
      modifications.surfaceRecommendation = 'Avoid steep hills and stairs';
      modifications.cadenceNote = 'Increase cadence to reduce impact forces';
      modifications.avoidActivities = ['Hill repeats', 'Long downhills', 'Track intervals'];
      break;

    case 'STRESS_FRACTURE':
      modifications.surfaceRecommendation = 'Soft surfaces only (grass, trails, track)';
      modifications.criticalNote = 'Any return of pain requires immediate cessation';
      modifications.avoidActivities = ['Concrete/asphalt', 'High-impact activities'];
      break;

    case 'MEDIAL_TIBIAL_STRESS':
      modifications.surfaceRecommendation = 'Soft surfaces preferred';
      modifications.cadenceNote = 'Increase cadence 5-10%';
      modifications.avoidActivities = ['High-volume running', 'Hard surfaces'];
      break;

    case 'HIP_FLEXOR_STRAIN':
      modifications.surfaceRecommendation = 'Flat terrain only';
      modifications.strideNote = 'Avoid overstriding';
      modifications.avoidActivities = ['Hill sprints', 'Excessive hip flexion'];
      break;

    case 'HAMSTRING_STRAIN':
      modifications.surfaceRecommendation = 'Flat surfaces only';
      modifications.speedNote = 'Avoid high-speed running until cleared';
      modifications.avoidActivities = ['Sprints', 'Hill running', 'Deep stretching'];
      break;
  }

  return {
    ...workout,
    injuryModifications: modifications
  };
}

/**
 * Reduce workout intensity by specified percentage
 */
export function reduceIntensity(currentIntensity: string, reductionPercent: number): string {
  // Convert intensity descriptors to reduced versions
  const intensityMap: { [key: string]: string } = {
    'Z5': 'Z4',
    'Z4': 'Z3',
    'Z3': 'Z2',
    'Z2': 'Z1',
    'THRESHOLD': 'TEMPO',
    'TEMPO': 'EASY',
    'INTERVALS': 'THRESHOLD',
    'HARD': 'MODERATE',
    'MODERATE': 'EASY'
  };

  return intensityMap[currentIntensity] || 'EASY';
}

/**
 * Calculate recommended cross-training alternatives based on injury
 */
export function getCrossTrainingAlternatives(injuryType: string): string[] {
  const alternatives: { [key: string]: string[] } = {
    'PLANTAR_FASCIITIS': ['Cycling', 'Swimming', 'Elliptical'],
    'ACHILLES_TENDINOPATHY': ['Deep water running', 'Swimming', 'Cycling (low resistance)'],
    'IT_BAND_SYNDROME': ['Swimming', 'Elliptical', 'Rowing'],
    'PATELLOFEMORAL_PAIN': ['Swimming', 'Deep water running', 'Cycling (if pain-free)'],
    'MEDIAL_TIBIAL_STRESS': ['Cycling', 'Swimming', 'Deep water running'],
    'STRESS_FRACTURE': ['Deep water running', 'Swimming', 'Upper body ergometer'],
    'HIP_FLEXOR_STRAIN': ['Swimming', 'Cycling (avoid high cadence)', 'Upper body work'],
    'HAMSTRING_STRAIN': ['Swimming', 'Upper body ergometer', 'Easy cycling']
  };

  return alternatives[injuryType] || ['Swimming', 'Cycling', 'Elliptical'];
}

/**
 * Calculate estimated recovery time based on injury type and severity
 */
export function estimateRecoveryTime(
  injuryType: string,
  severity: 'MILD' | 'MODERATE' | 'SEVERE'
): string {
  const recoveryTimes: { [key: string]: { [key in 'MILD' | 'MODERATE' | 'SEVERE']: string } } = {
    'PLANTAR_FASCIITIS': {
      'MILD': '2-4 weeks',
      'MODERATE': '6-12 weeks',
      'SEVERE': '12-24 weeks'
    },
    'ACHILLES_TENDINOPATHY': {
      'MILD': '6-8 weeks',
      'MODERATE': '12-16 weeks',
      'SEVERE': '16-24+ weeks'
    },
    'IT_BAND_SYNDROME': {
      'MILD': '4-6 weeks',
      'MODERATE': '8-12 weeks',
      'SEVERE': '12-16 weeks'
    },
    'PATELLOFEMORAL_PAIN': {
      'MILD': '6-8 weeks',
      'MODERATE': '9-12 weeks',
      'SEVERE': '12-16 weeks'
    },
    'STRESS_FRACTURE': {
      'MILD': '6-8 weeks',
      'MODERATE': '8-12 weeks',
      'SEVERE': '12-20+ weeks'
    }
  };

  return recoveryTimes[injuryType]?.[severity] || '4-12 weeks';
}
