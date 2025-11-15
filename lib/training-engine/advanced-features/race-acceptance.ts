/**
 * Race Acceptance Decision Engine
 *
 * Evaluates whether to add a proposed race based on recovery status,
 * workload, proximity to A-races, current training phase, and motivation.
 */

import { RaceDecisionInput, RaceDecision, DecisionFactor } from './types';

/**
 * Evaluate whether to accept a proposed race
 */
export function evaluateRaceDecision(input: RaceDecisionInput): RaceDecision {
  const { proposedRace, currentStatus, upcomingARace } = input;
  const factors: DecisionFactor[] = [];

  // Factor 1: Recovery from last race
  if (currentStatus.daysSinceLastRace < 7) {
    factors.push({
      factor: 'Insufficient recovery from last race',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: 'Less than 7 days since previous race – injury risk elevated'
    });
  } else if (currentStatus.daysSinceLastRace < 14) {
    factors.push({
      factor: 'Limited recovery from last race',
      weight: 'MEDIUM',
      recommendation: proposedRace.classification === 'C' ? 'CONSIDER' : 'SKIP',
      reasoning: `${currentStatus.daysSinceLastRace} days since last race – acceptable for C-race only`
    });
  }

  // Factor 2: ACWR (Acute:Chronic Workload Ratio)
  if (currentStatus.ACWR > 1.3) {
    factors.push({
      factor: 'High acute:chronic workload ratio',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: `ACWR ${currentStatus.ACWR.toFixed(2)} indicates elevated injury risk`
    });
  } else if (currentStatus.ACWR > 1.2) {
    factors.push({
      factor: 'Elevated workload ratio',
      weight: 'MEDIUM',
      recommendation: proposedRace.classification === 'C' ? 'CONSIDER' : 'SKIP',
      reasoning: `ACWR ${currentStatus.ACWR.toFixed(2)} shows moderate risk`
    });
  } else if (currentStatus.ACWR < 0.8) {
    factors.push({
      factor: 'Low recent training load',
      weight: 'MEDIUM',
      recommendation: 'CONSIDER',
      reasoning: `ACWR ${currentStatus.ACWR.toFixed(2)} suggests you may be undertrained for this race`
    });
  }

  // Factor 3: Proximity to A-race
  if (upcomingARace) {
    const daysToARace = Math.floor(
      (upcomingARace.date.getTime() - proposedRace.date.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysToARace > 0 && daysToARace < 14) {
      factors.push({
        factor: 'Very close to A-race (taper period)',
        weight: 'HIGH',
        recommendation: 'SKIP',
        reasoning: `${daysToARace} days before goal race – interferes with taper`
      });
    } else if (daysToARace >= 14 && daysToARace < 21) {
      factors.push({
        factor: 'Close to A-race',
        weight: 'MEDIUM',
        recommendation: proposedRace.classification === 'C' ? 'CONSIDER' : 'SKIP',
        reasoning: `${daysToARace} days before goal race – may interfere with final buildup`
      });
    } else if (daysToARace >= 21 && daysToARace < 42) {
      factors.push({
        factor: 'Moderate proximity to A-race',
        weight: 'LOW',
        recommendation: proposedRace.classification === 'A' ? 'SKIP' : 'ACCEPT',
        reasoning: `${daysToARace} days before goal race – B or C race acceptable as tune-up`
      });
    }
  }

  // Factor 4: Current training phase goals
  if (currentStatus.phaseGoals.includes('volume_building')) {
    factors.push({
      factor: 'Currently in base-building phase',
      weight: 'LOW',
      recommendation: proposedRace.classification === 'C' ? 'ACCEPT' : 'SKIP',
      reasoning: 'Racing interrupts volume accumulation unless treated as workout'
    });
  }

  if (currentStatus.phaseGoals.includes('recovery')) {
    factors.push({
      factor: 'Currently in recovery phase',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: 'Recovery phase requires reduced intensity – racing is counterproductive'
    });
  }

  if (currentStatus.phaseGoals.includes('competition_phase')) {
    factors.push({
      factor: 'In competition phase',
      weight: 'MEDIUM',
      recommendation: 'ACCEPT',
      reasoning: 'Competition phase appropriate for racing'
    });
  }

  if (currentStatus.phaseGoals.includes('taper')) {
    factors.push({
      factor: 'Currently tapering for A-race',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: 'Taper phase should not include additional races'
    });
  }

  // Factor 5: Motivation and psychological factors
  if (currentStatus.motivationLevel === 'low' && proposedRace.classification === 'B') {
    factors.push({
      factor: 'Low motivation + B-race',
      weight: 'MEDIUM',
      recommendation: 'CONSIDER',
      reasoning: 'B-race could provide motivational boost if desire is genuine'
    });
  }

  if (currentStatus.motivationLevel === 'high') {
    factors.push({
      factor: 'High motivation for racing',
      weight: 'LOW',
      recommendation: 'ACCEPT',
      reasoning: 'High motivation supports good race performance'
    });
  }

  if (currentStatus.motivationLevel === 'low' && proposedRace.classification === 'A') {
    factors.push({
      factor: 'Low motivation for A-race',
      weight: 'MEDIUM',
      recommendation: 'SKIP',
      reasoning: 'A-races require peak motivation – consider rescheduling or downgrading'
    });
  }

  // Decision logic: Combine factors
  const highWeightSkips = factors.filter(f => f.weight === 'HIGH' && f.recommendation === 'SKIP').length;
  const skipVotes = factors.filter(f => f.recommendation === 'SKIP').length;
  const acceptVotes = factors.filter(f => f.recommendation === 'ACCEPT').length;
  const considerVotes = factors.filter(f => f.recommendation === 'CONSIDER').length;

  let finalRecommendation: RaceDecision['finalRecommendation'];
  let reasoning: string;

  if (highWeightSkips > 0) {
    finalRecommendation = 'SKIP_RACE';
    reasoning = 'High-weight negative factors present – prioritize health and A-race goals';
  } else if (skipVotes > acceptVotes + considerVotes) {
    finalRecommendation = 'LIKELY_SKIP';
    reasoning = 'More negative than positive factors – consider skipping';
  } else if (acceptVotes > skipVotes) {
    finalRecommendation =
      proposedRace.classification === 'C' ? 'ACCEPT_AS_TRAINING_RUN' : 'ACCEPT_WITH_TAPER';
    reasoning = 'Factors align favorably for racing';
  } else {
    // Equal or mostly "CONSIDER" votes
    finalRecommendation =
      proposedRace.classification === 'C' ? 'ACCEPT_AS_TRAINING_RUN' : 'LIKELY_SKIP';
    reasoning = 'Mixed factors – proceed with caution if accepting';
  }

  return {
    race: proposedRace,
    factors,
    finalRecommendation,
    reasoning
  };
}
