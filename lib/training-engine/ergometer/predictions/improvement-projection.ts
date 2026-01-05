/**
 * Ergometer Improvement Projection
 *
 * Projects future performance improvements based on:
 * - Current CP/W' values
 * - Training load trends (CTL/ATL)
 * - Historical test progression
 * - Experience level
 *
 * Uses research-based improvement rates for different experience levels.
 */

import { ErgometerType } from '@prisma/client';

export interface TrainingLoadData {
  ctl: number;           // Chronic Training Load (fitness)
  atl: number;           // Acute Training Load (fatigue)
  tsb: number;           // Training Stress Balance (form)
  weeklyTSS: number;     // Weekly training stress score
  consistency: number;   // 0-1 training consistency
}

export interface HistoricalTest {
  date: Date;
  criticalPower: number;
  wPrime: number;
}

export interface ImprovementProjection {
  currentCP: number;
  projectedCP: number;
  cpImprovement: number;
  cpImprovementPercent: number;

  currentWPrime: number;
  projectedWPrime: number;
  wPrimeImprovement: number;

  projectionWeeks: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0-1

  factors: ImprovementFactor[];
  recommendations: string[];

  // Predicted times for standard distances
  predicted2KTime?: string;
  predicted2KImprovement?: string;
}

export interface ImprovementFactor {
  name: string;
  impact: number;        // -1 to 1 (negative = limiting, positive = enhancing)
  description: string;
  category: 'training' | 'recovery' | 'experience' | 'physiological';
}

// Monthly improvement rates by experience level (% per month)
const IMPROVEMENT_RATES = {
  BEGINNER: { cpRate: 3.0, wPrimeRate: 2.0 },      // <6 months structured training
  INTERMEDIATE: { cpRate: 1.5, wPrimeRate: 1.0 },  // 6 months - 2 years
  ADVANCED: { cpRate: 0.8, wPrimeRate: 0.5 },      // 2-5 years
  ELITE: { cpRate: 0.3, wPrimeRate: 0.2 },         // 5+ years
};

// Max realistic improvement caps (% per year)
const MAX_ANNUAL_IMPROVEMENT = {
  BEGINNER: 25,
  INTERMEDIATE: 12,
  ADVANCED: 6,
  ELITE: 3,
};

/**
 * Determine experience level based on training history
 */
function determineExperienceLevel(
  historicalTests: HistoricalTest[],
  monthsTraining?: number
): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' {
  // If explicit training months provided
  if (monthsTraining !== undefined) {
    if (monthsTraining < 6) return 'BEGINNER';
    if (monthsTraining < 24) return 'INTERMEDIATE';
    if (monthsTraining < 60) return 'ADVANCED';
    return 'ELITE';
  }

  // Infer from test history
  if (historicalTests.length === 0) return 'BEGINNER';

  const testSpanMonths = historicalTests.length > 1
    ? (historicalTests[0].date.getTime() - historicalTests[historicalTests.length - 1].date.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 0;

  if (testSpanMonths < 6) return 'BEGINNER';
  if (testSpanMonths < 24) return 'INTERMEDIATE';
  if (testSpanMonths < 60) return 'ADVANCED';
  return 'ELITE';
}

/**
 * Analyze training load impact on improvement
 */
function analyzeTrainingImpact(trainingLoad: TrainingLoadData): {
  multiplier: number;
  factors: ImprovementFactor[];
} {
  const factors: ImprovementFactor[] = [];
  let multiplier = 1.0;

  // CTL (fitness) impact
  if (trainingLoad.ctl > 80) {
    multiplier *= 1.15;
    factors.push({
      name: 'Hög träningsbelastning',
      impact: 0.5,
      description: `CTL på ${Math.round(trainingLoad.ctl)} indikerar stark träningsanpassning`,
      category: 'training',
    });
  } else if (trainingLoad.ctl < 40) {
    multiplier *= 0.7;
    factors.push({
      name: 'Låg träningsbelastning',
      impact: -0.4,
      description: 'Ökad träningsvolym rekommenderas för snabbare framsteg',
      category: 'training',
    });
  }

  // Consistency impact
  if (trainingLoad.consistency > 0.85) {
    multiplier *= 1.2;
    factors.push({
      name: 'Utmärkt träningskonsistens',
      impact: 0.6,
      description: `${Math.round(trainingLoad.consistency * 100)}% konsistens - optimal för anpassning`,
      category: 'training',
    });
  } else if (trainingLoad.consistency < 0.6) {
    multiplier *= 0.6;
    factors.push({
      name: 'Inkonsekvent träning',
      impact: -0.5,
      description: 'Oregelbunden träning begränsar framsteg',
      category: 'training',
    });
  }

  // Form (TSB) impact
  if (trainingLoad.tsb < -20) {
    multiplier *= 0.9;
    factors.push({
      name: 'Hög trötthet',
      impact: -0.3,
      description: 'Negativ form - prestation kan vara undertryckt',
      category: 'recovery',
    });
  } else if (trainingLoad.tsb > 10) {
    factors.push({
      name: 'God form',
      impact: 0.2,
      description: 'Positiv form - redo för prestation',
      category: 'recovery',
    });
  }

  return { multiplier, factors };
}

/**
 * Analyze historical test progression
 */
function analyzeHistoricalProgression(tests: HistoricalTest[]): {
  trend: 'improving' | 'stable' | 'declining';
  monthlyRate: number;
  factors: ImprovementFactor[];
} {
  if (tests.length < 2) {
    return {
      trend: 'stable',
      monthlyRate: 0,
      factors: [],
    };
  }

  // Sort by date (most recent first)
  const sorted = [...tests].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate CP change rate
  const first = sorted[sorted.length - 1];
  const last = sorted[0];
  const monthsElapsed = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsElapsed < 1) {
    return { trend: 'stable', monthlyRate: 0, factors: [] };
  }

  const cpChange = last.criticalPower - first.criticalPower;
  const monthlyRate = (cpChange / first.criticalPower) * 100 / monthsElapsed;

  const factors: ImprovementFactor[] = [];
  let trend: 'improving' | 'stable' | 'declining';

  if (monthlyRate > 0.5) {
    trend = 'improving';
    factors.push({
      name: 'Positiv trend',
      impact: 0.4,
      description: `CP har ökat med ${monthlyRate.toFixed(1)}%/månad`,
      category: 'physiological',
    });
  } else if (monthlyRate < -0.5) {
    trend = 'declining';
    factors.push({
      name: 'Negativ trend',
      impact: -0.6,
      description: 'CP har minskat - överväg träningsanpassningar',
      category: 'physiological',
    });
  } else {
    trend = 'stable';
    factors.push({
      name: 'Stabil prestation',
      impact: 0,
      description: 'CP är relativt oförändrad',
      category: 'physiological',
    });
  }

  return { trend, monthlyRate, factors };
}

/**
 * Convert watts to 2K time (Concept2 formula)
 */
function wattsTo2KTime(watts: number): number {
  // P = 2.80 / (pace/500)³
  // pace = 500 × (2.80 / P)^(1/3)
  const pace = 500 * Math.pow(2.80 / watts, 1 / 3);
  return pace * 4; // 2K = 4 × 500m
}

/**
 * Format seconds to M:SS.s
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Project future improvement
 */
export function projectImprovement(
  currentCP: number,
  currentWPrime: number,
  ergometerType: ErgometerType,
  projectionWeeks: number,
  options: {
    trainingLoad?: TrainingLoadData;
    historicalTests?: HistoricalTest[];
    monthsTraining?: number;
    athleteWeight?: number;
  } = {}
): ImprovementProjection {
  const { trainingLoad, historicalTests = [], monthsTraining, athleteWeight } = options;

  // Determine experience level
  const experienceLevel = determineExperienceLevel(historicalTests, monthsTraining);
  const rates = IMPROVEMENT_RATES[experienceLevel];

  // Base improvement (months)
  const projectionMonths = projectionWeeks / 4.33;
  let cpImprovement = (currentCP * rates.cpRate / 100) * projectionMonths;
  let wPrimeImprovement = (currentWPrime * rates.wPrimeRate / 100) * projectionMonths;

  // Collect all factors
  const allFactors: ImprovementFactor[] = [];

  // Add experience factor
  allFactors.push({
    name: `Erfarenhetsnivå: ${experienceLevel}`,
    impact: experienceLevel === 'BEGINNER' ? 0.5 : experienceLevel === 'ELITE' ? -0.3 : 0,
    description: experienceLevel === 'BEGINNER'
      ? 'Nybörjare har störst potential för snabba framsteg'
      : experienceLevel === 'ELITE'
        ? 'Elitutövare har begränsad förbättringspotential'
        : 'Normal förbättringspotential för nivån',
    category: 'experience',
  });

  // Apply training load adjustments
  let trainingMultiplier = 1.0;
  if (trainingLoad) {
    const { multiplier, factors } = analyzeTrainingImpact(trainingLoad);
    trainingMultiplier = multiplier;
    allFactors.push(...factors);
  }

  // Apply historical trend adjustments
  if (historicalTests.length >= 2) {
    const { trend, factors } = analyzeHistoricalProgression(historicalTests);
    allFactors.push(...factors);

    if (trend === 'improving') trainingMultiplier *= 1.1;
    if (trend === 'declining') trainingMultiplier *= 0.7;
  }

  // Apply multiplier
  cpImprovement *= trainingMultiplier;
  wPrimeImprovement *= trainingMultiplier;

  // Cap at maximum realistic improvement
  const maxAnnualPercent = MAX_ANNUAL_IMPROVEMENT[experienceLevel];
  const maxProjectedPercent = (maxAnnualPercent / 12) * projectionMonths;
  const maxCPImprovement = currentCP * (maxProjectedPercent / 100);

  cpImprovement = Math.min(cpImprovement, maxCPImprovement);

  // Calculate projections
  const projectedCP = Math.round(currentCP + cpImprovement);
  const projectedWPrime = Math.round(currentWPrime + wPrimeImprovement);

  // Calculate confidence
  let confidenceScore = 0.5;

  // More data = higher confidence
  if (trainingLoad) confidenceScore += 0.15;
  if (historicalTests.length >= 3) confidenceScore += 0.15;
  if (historicalTests.length >= 5) confidenceScore += 0.1;

  // Shorter projection = higher confidence
  if (projectionWeeks <= 8) confidenceScore += 0.1;
  if (projectionWeeks > 16) confidenceScore -= 0.1;
  if (projectionWeeks > 24) confidenceScore -= 0.1;

  confidenceScore = Math.max(0.2, Math.min(0.95, confidenceScore));

  let confidence: ImprovementProjection['confidence'];
  if (confidenceScore >= 0.7) confidence = 'HIGH';
  else if (confidenceScore >= 0.5) confidence = 'MEDIUM';
  else confidence = 'LOW';

  // Generate recommendations
  const recommendations: string[] = [];

  if (trainingLoad && trainingLoad.consistency < 0.7) {
    recommendations.push('Öka träningskonsistensen för bättre resultat');
  }
  if (trainingLoad && trainingLoad.ctl < 50) {
    recommendations.push('Bygg gradvis upp träningsvolymen');
  }
  if (experienceLevel === 'BEGINNER') {
    recommendations.push('Fokusera på grundläggande teknik och regelbunden träning');
  }
  if (historicalTests.length < 3) {
    recommendations.push('Genomför regelbundna tester (var 6-8 vecka) för bättre uppföljning');
  }

  // Calculate 2K time predictions for Concept2
  const isConcept2 = ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
  let predicted2KTime: string | undefined;
  let predicted2KImprovement: string | undefined;

  if (isConcept2) {
    const current2K = wattsTo2KTime(currentCP * 1.05); // ~105% CP for 7-min effort
    const projected2K = wattsTo2KTime(projectedCP * 1.05);
    predicted2KTime = formatTime(projected2K);
    const improvement = current2K - projected2K;
    predicted2KImprovement = improvement > 0 ? `-${improvement.toFixed(1)}s` : `+${Math.abs(improvement).toFixed(1)}s`;
  }

  return {
    currentCP,
    projectedCP,
    cpImprovement: Math.round(cpImprovement),
    cpImprovementPercent: Math.round((cpImprovement / currentCP) * 1000) / 10,

    currentWPrime,
    projectedWPrime,
    wPrimeImprovement: Math.round(wPrimeImprovement),

    projectionWeeks,
    confidence,
    confidenceScore: Math.round(confidenceScore * 100) / 100,

    factors: allFactors,
    recommendations,

    predicted2KTime,
    predicted2KImprovement,
  };
}

/**
 * Generate multi-week projection curve
 */
export function generateProjectionCurve(
  currentCP: number,
  currentWPrime: number,
  ergometerType: ErgometerType,
  options: {
    trainingLoad?: TrainingLoadData;
    historicalTests?: HistoricalTest[];
    monthsTraining?: number;
  } = {}
): Array<{ week: number; projectedCP: number; projectedWPrime: number }> {
  const weeks = [4, 8, 12, 16, 20, 24];

  return weeks.map((week) => {
    const projection = projectImprovement(currentCP, currentWPrime, ergometerType, week, options);
    return {
      week,
      projectedCP: projection.projectedCP,
      projectedWPrime: projection.projectedWPrime,
    };
  });
}
