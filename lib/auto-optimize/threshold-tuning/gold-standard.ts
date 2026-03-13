/**
 * Gold Standard Dataset
 *
 * Curated lactate test cases with known-correct LT1/LT2 values for
 * evaluating threshold detection algorithm accuracy.
 *
 * Sources: synthetic profiles based on published physiology literature
 * (Billat, Faude, Beneke, Bishop et al.)
 */

import type { GoldStandardCase } from './types'

export const GOLD_STANDARD_CASES: GoldStandardCase[] = [

  // ── ELITE_FLAT Profiles ────────────────────────────────────────

  {
    id: 'elite-marathon-01',
    name: 'Elite Marathon Runner (Radcliffe-type)',
    description: 'Very flat curve to 16 km/h, sharp exponential rise after 17 km/h',
    profileType: 'ELITE_FLAT',
    sport: 'RUNNING',
    data: [
      { intensity: 10, lactate: 0.9, heartRate: 120 },
      { intensity: 11, lactate: 0.9, heartRate: 128 },
      { intensity: 12, lactate: 1.0, heartRate: 135 },
      { intensity: 13, lactate: 1.0, heartRate: 142 },
      { intensity: 14, lactate: 1.1, heartRate: 150 },
      { intensity: 15, lactate: 1.2, heartRate: 158 },
      { intensity: 16, lactate: 1.5, heartRate: 165 },
      { intensity: 17, lactate: 2.2, heartRate: 172 },
      { intensity: 18, lactate: 3.8, heartRate: 180 },
      { intensity: 19, lactate: 6.5, heartRate: 188 },
    ],
    expectedLT1: { intensity: 15.0, lactate: 1.2, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 17.2, lactate: 2.5, toleranceIntensity: 0.5 },
    source: 'Synthetic: based on Billat et al. (2003) elite marathon profile',
  },
  {
    id: 'elite-runner-02',
    name: 'Elite 10K Runner',
    description: 'Low baseline, moderate L-shaped curve',
    profileType: 'ELITE_FLAT',
    sport: 'RUNNING',
    data: [
      { intensity: 12, lactate: 1.1, heartRate: 130 },
      { intensity: 13, lactate: 1.1, heartRate: 138 },
      { intensity: 14, lactate: 1.2, heartRate: 145 },
      { intensity: 15, lactate: 1.3, heartRate: 152 },
      { intensity: 16, lactate: 1.6, heartRate: 160 },
      { intensity: 17, lactate: 2.4, heartRate: 168 },
      { intensity: 18, lactate: 4.2, heartRate: 176 },
      { intensity: 19, lactate: 7.1, heartRate: 184 },
    ],
    expectedLT1: { intensity: 15.5, lactate: 1.4, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 17.0, lactate: 2.4, toleranceIntensity: 0.5 },
    source: 'Synthetic: based on Faude et al. (2009) elite endurance profiles',
  },
  {
    id: 'elite-cyclist-01',
    name: 'Elite Cyclist (FTP ~350W)',
    description: 'Power-based test, flat to 280W then sharp rise',
    profileType: 'ELITE_FLAT',
    sport: 'CYCLING',
    data: [
      { intensity: 150, lactate: 0.8, heartRate: 110 },
      { intensity: 180, lactate: 0.9, heartRate: 120 },
      { intensity: 210, lactate: 0.9, heartRate: 130 },
      { intensity: 240, lactate: 1.0, heartRate: 140 },
      { intensity: 270, lactate: 1.2, heartRate: 150 },
      { intensity: 300, lactate: 1.8, heartRate: 160 },
      { intensity: 330, lactate: 3.2, heartRate: 170 },
      { intensity: 360, lactate: 5.8, heartRate: 178 },
      { intensity: 390, lactate: 9.2, heartRate: 185 },
    ],
    expectedLT1: { intensity: 270, lactate: 1.2, toleranceIntensity: 15 },
    expectedLT2: { intensity: 315, lactate: 2.5, toleranceIntensity: 15 },
    source: 'Synthetic: based on Beneke et al. (2011) elite cycling profile',
  },
  {
    id: 'elite-skier-01',
    name: 'Elite XC Skier',
    description: 'Very low baseline, gradual transition',
    profileType: 'ELITE_FLAT',
    sport: 'RUNNING',
    data: [
      { intensity: 10, lactate: 0.7, heartRate: 115 },
      { intensity: 11, lactate: 0.8, heartRate: 125 },
      { intensity: 12, lactate: 0.8, heartRate: 132 },
      { intensity: 13, lactate: 0.9, heartRate: 140 },
      { intensity: 14, lactate: 1.0, heartRate: 148 },
      { intensity: 15, lactate: 1.3, heartRate: 156 },
      { intensity: 16, lactate: 1.9, heartRate: 164 },
      { intensity: 17, lactate: 3.0, heartRate: 172 },
      { intensity: 18, lactate: 5.5, heartRate: 180 },
    ],
    expectedLT1: { intensity: 14.5, lactate: 1.1, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 16.5, lactate: 2.2, toleranceIntensity: 0.5 },
    source: 'Synthetic: based on Stöggl & Sperlich (2014) elite XC skiing',
  },
  {
    id: 'elite-borderline-01',
    name: 'Borderline Elite / Standard',
    description: 'Baseline near 1.5, requires careful classification',
    profileType: 'ELITE_FLAT',
    sport: 'RUNNING',
    data: [
      { intensity: 10, lactate: 1.3, heartRate: 125 },
      { intensity: 11, lactate: 1.3, heartRate: 133 },
      { intensity: 12, lactate: 1.4, heartRate: 140 },
      { intensity: 13, lactate: 1.5, heartRate: 148 },
      { intensity: 14, lactate: 1.7, heartRate: 155 },
      { intensity: 15, lactate: 2.3, heartRate: 163 },
      { intensity: 16, lactate: 3.5, heartRate: 170 },
      { intensity: 17, lactate: 5.8, heartRate: 178 },
    ],
    expectedLT1: { intensity: 13.5, lactate: 1.6, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 15.5, lactate: 2.8, toleranceIntensity: 0.5 },
    source: 'Synthetic: borderline elite/standard for testing classification',
  },

  // ── STANDARD Profiles ──────────────────────────────────────────

  {
    id: 'standard-runner-01',
    name: 'Trained Club Runner (45 min 10K)',
    description: 'Classic S-curve, moderate baseline',
    profileType: 'STANDARD',
    sport: 'RUNNING',
    data: [
      { intensity: 8, lactate: 1.5, heartRate: 125 },
      { intensity: 9, lactate: 1.6, heartRate: 133 },
      { intensity: 10, lactate: 1.8, heartRate: 142 },
      { intensity: 11, lactate: 2.2, heartRate: 150 },
      { intensity: 12, lactate: 2.8, heartRate: 158 },
      { intensity: 13, lactate: 3.8, heartRate: 166 },
      { intensity: 14, lactate: 5.5, heartRate: 174 },
      { intensity: 15, lactate: 8.2, heartRate: 182 },
    ],
    expectedLT1: { intensity: 10.5, lactate: 2.0, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 12.5, lactate: 3.2, toleranceIntensity: 0.5 },
    source: 'Synthetic: based on typical trained runner (Faude et al. 2009)',
  },
  {
    id: 'standard-runner-02',
    name: 'Trained Runner (Sub-1:40 HM)',
    description: 'Good aerobic fitness, clean curve',
    profileType: 'STANDARD',
    sport: 'RUNNING',
    data: [
      { intensity: 9, lactate: 1.7, heartRate: 128 },
      { intensity: 10, lactate: 1.8, heartRate: 136 },
      { intensity: 11, lactate: 2.0, heartRate: 144 },
      { intensity: 12, lactate: 2.3, heartRate: 152 },
      { intensity: 13, lactate: 2.9, heartRate: 160 },
      { intensity: 14, lactate: 3.8, heartRate: 168 },
      { intensity: 15, lactate: 5.5, heartRate: 176 },
      { intensity: 16, lactate: 8.0, heartRate: 184 },
    ],
    expectedLT1: { intensity: 11.0, lactate: 2.0, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 13.5, lactate: 3.3, toleranceIntensity: 0.5 },
    source: 'Synthetic: trained sub-elite runner',
  },
  {
    id: 'standard-cyclist-01',
    name: 'Trained Cyclist (FTP ~250W)',
    description: 'Power-based test, standard S-curve',
    profileType: 'STANDARD',
    sport: 'CYCLING',
    data: [
      { intensity: 100, lactate: 1.6, heartRate: 110 },
      { intensity: 130, lactate: 1.7, heartRate: 120 },
      { intensity: 160, lactate: 1.9, heartRate: 130 },
      { intensity: 190, lactate: 2.3, heartRate: 140 },
      { intensity: 220, lactate: 3.0, heartRate: 150 },
      { intensity: 250, lactate: 4.2, heartRate: 160 },
      { intensity: 280, lactate: 6.5, heartRate: 170 },
      { intensity: 310, lactate: 10.0, heartRate: 178 },
    ],
    expectedLT1: { intensity: 175, lactate: 2.1, toleranceIntensity: 15 },
    expectedLT2: { intensity: 235, lactate: 3.4, toleranceIntensity: 15 },
    source: 'Synthetic: trained cyclist profile',
  },
  {
    id: 'standard-short-test',
    name: 'Standard Runner (Short 5-stage test)',
    description: 'Minimum viable test with only 5 stages',
    profileType: 'STANDARD',
    sport: 'RUNNING',
    data: [
      { intensity: 9, lactate: 1.8, heartRate: 135 },
      { intensity: 11, lactate: 2.2, heartRate: 150 },
      { intensity: 13, lactate: 3.5, heartRate: 165 },
      { intensity: 15, lactate: 6.0, heartRate: 178 },
      { intensity: 17, lactate: 10.5, heartRate: 190 },
    ],
    expectedLT1: { intensity: 10.5, lactate: 2.0, toleranceIntensity: 1.0 },
    expectedLT2: { intensity: 12.5, lactate: 3.2, toleranceIntensity: 1.0 },
    source: 'Synthetic: minimal test with wider tolerance',
  },

  // ── RECREATIONAL Profiles ──────────────────────────────────────

  {
    id: 'recreational-runner-01',
    name: 'Recreational Runner (60 min 10K)',
    description: 'High baseline, steep exponential rise',
    profileType: 'RECREATIONAL',
    sport: 'RUNNING',
    data: [
      { intensity: 6, lactate: 2.0, heartRate: 130 },
      { intensity: 7, lactate: 2.3, heartRate: 140 },
      { intensity: 8, lactate: 2.8, heartRate: 150 },
      { intensity: 9, lactate: 3.5, heartRate: 160 },
      { intensity: 10, lactate: 4.8, heartRate: 168 },
      { intensity: 11, lactate: 7.2, heartRate: 176 },
      { intensity: 12, lactate: 10.5, heartRate: 184 },
    ],
    expectedLT1: { intensity: 7.5, lactate: 2.5, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 9.5, lactate: 4.0, toleranceIntensity: 0.5 },
    source: 'Synthetic: recreational runner with high baseline',
  },
  {
    id: 'recreational-runner-02',
    name: 'Beginner Runner',
    description: 'Very high baseline, rapid lactate accumulation',
    profileType: 'RECREATIONAL',
    sport: 'RUNNING',
    data: [
      { intensity: 5, lactate: 2.5, heartRate: 135 },
      { intensity: 6, lactate: 2.8, heartRate: 145 },
      { intensity: 7, lactate: 3.5, heartRate: 155 },
      { intensity: 8, lactate: 4.5, heartRate: 165 },
      { intensity: 9, lactate: 6.5, heartRate: 174 },
      { intensity: 10, lactate: 9.0, heartRate: 182 },
      { intensity: 11, lactate: 12.0, heartRate: 190 },
    ],
    expectedLT1: { intensity: 6.0, lactate: 2.8, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 8.0, lactate: 4.5, toleranceIntensity: 0.5 },
    source: 'Synthetic: beginner runner profile',
  },
  {
    id: 'recreational-cyclist-01',
    name: 'Recreational Cyclist (FTP ~150W)',
    description: 'Power-based test, steep rise from low power',
    profileType: 'RECREATIONAL',
    sport: 'CYCLING',
    data: [
      { intensity: 60, lactate: 2.2, heartRate: 120 },
      { intensity: 80, lactate: 2.5, heartRate: 132 },
      { intensity: 100, lactate: 3.0, heartRate: 144 },
      { intensity: 120, lactate: 3.8, heartRate: 155 },
      { intensity: 140, lactate: 5.2, heartRate: 165 },
      { intensity: 160, lactate: 7.5, heartRate: 174 },
      { intensity: 180, lactate: 11.0, heartRate: 182 },
    ],
    expectedLT1: { intensity: 90, lactate: 2.7, toleranceIntensity: 10 },
    expectedLT2: { intensity: 125, lactate: 4.0, toleranceIntensity: 10 },
    source: 'Synthetic: recreational cyclist profile',
  },

  // ── Edge Cases ─────────────────────────────────────────────────

  {
    id: 'edge-elevated-baseline',
    name: 'Elevated First Stage (contamination)',
    description: 'Stage 1 has elevated lactate from sweat/anxiety, true baseline at stage 2',
    profileType: 'STANDARD',
    sport: 'RUNNING',
    data: [
      { intensity: 8, lactate: 3.1, heartRate: 130 },  // contaminated
      { intensity: 9, lactate: 1.9, heartRate: 138 },  // true baseline
      { intensity: 10, lactate: 2.1, heartRate: 146 },
      { intensity: 11, lactate: 2.5, heartRate: 154 },
      { intensity: 12, lactate: 3.2, heartRate: 162 },
      { intensity: 13, lactate: 4.5, heartRate: 170 },
      { intensity: 14, lactate: 6.8, heartRate: 178 },
    ],
    expectedLT1: { intensity: 10.5, lactate: 2.3, toleranceIntensity: 0.5 },
    expectedLT2: { intensity: 12.5, lactate: 3.5, toleranceIntensity: 0.5 },
    source: 'Synthetic: elevated baseline from sweat contamination',
  },
]

/**
 * Get the full gold standard dataset.
 */
export function getGoldStandard(): GoldStandardCase[] {
  return GOLD_STANDARD_CASES
}

/**
 * Get gold standard cases filtered by profile type.
 */
export function getGoldStandardByProfile(
  profileType: 'ELITE_FLAT' | 'STANDARD' | 'RECREATIONAL'
): GoldStandardCase[] {
  return GOLD_STANDARD_CASES.filter(c => c.profileType === profileType)
}
