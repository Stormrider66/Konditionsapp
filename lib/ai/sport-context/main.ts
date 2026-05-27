import type { AthleteData } from './types'
import { SPORT_PROMPTS } from '../program-prompts'
import { buildReadinessContext } from './readiness'
import { buildVideoAnalysisContext } from './video-analysis'
import {
  buildAthleteProfileContextForCoach,
  buildCoachNotesContext,
  buildComplianceContextForCoach,
  buildStrengthContextForCoach,
  buildTrainingLoadContextForCoach,
} from './coach-context'
import {
  buildRunningContext,
  buildCyclingContext,
  buildSwimmingContext,
  buildTriathlonContext,
  buildSkiingContext,
} from './sports/endurance'
import {
  buildHyroxContext,
  buildGeneralFitnessContext,
  buildFunctionalFitnessContext,
} from './sports/functional'
import { buildHockeyContext, buildFootballContext } from './sports/team'

/**
 * Main function: Build complete sport-specific context
 */
export function buildSportSpecificContext(athlete: AthleteData, locale: 'en' | 'sv' = 'en'): string {
  const primarySport = athlete.sportProfile?.primarySport;

  if (!primarySport) {
    return '';
  }

  // Get sport-specific prompt info
  const sportPrompt = SPORT_PROMPTS[primarySport];

  let context = `\n${sportPrompt.systemContext}\n`;
  context += `\n${sportPrompt.zoneGuidance}\n`;

  // Add sport-specific data
  switch (primarySport) {
    case 'RUNNING':
      context += buildRunningContext(athlete, locale);
      break;
    case 'HYROX':
      context += buildHyroxContext(athlete, locale);
      break;
    case 'CYCLING':
      context += buildCyclingContext(athlete);
      break;
    case 'SWIMMING':
      context += buildSwimmingContext(athlete);
      break;
    case 'TRIATHLON':
      context += buildTriathlonContext(athlete);
      context += buildSwimmingContext(athlete); // Include swim data
      context += buildCyclingContext(athlete); // Include cycling data
      context += buildRunningContext(athlete, locale); // Include running data
      break;
    case 'SKIING':
      context += buildSkiingContext(athlete);
      break;
    case 'GENERAL_FITNESS':
      context += buildGeneralFitnessContext(athlete, locale);
      break;
    case 'FUNCTIONAL_FITNESS':
      context += buildFunctionalFitnessContext(athlete, locale);
      break;
    case 'STRENGTH':
      // Strength uses general fitness context + strength experience
      context += buildGeneralFitnessContext(athlete, locale);
      if (athlete.sportProfile?.strengthExperience) {
        context += `\n- **${locale === 'sv' ? 'Styrketräningserfarenhet' : 'Strength training experience'}**: ${athlete.sportProfile.strengthExperience}\n`;
      }
      break;
    case 'TEAM_ICE_HOCKEY':
      context += buildHockeyContext(athlete, locale);
      break;
    case 'TEAM_FOOTBALL':
      context += buildFootballContext(athlete, locale);
      break;
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
      // Use generic team sport info for now
      break;
  }

  // Pose/video findings can explain load tolerance, asymmetry, mobility limits, and injury risk
  // across sports, not only in running-gait contexts.
  if (athlete.videoAnalyses && athlete.videoAnalyses.length > 0) {
    context += buildVideoAnalysisContext(athlete.videoAnalyses, locale);
  }

  // Add readiness context if available
  if (athlete.dailyCheckIns && athlete.dailyCheckIns.length > 0) {
    context += buildReadinessContext(athlete.dailyCheckIns, locale);
  }

  // Add training load / ACWR context if available (NEW)
  if (athlete.trainingLoad) {
    context += buildTrainingLoadContextForCoach(athlete.trainingLoad, locale);
  }

  // Add compliance rate if available (NEW)
  if (athlete.complianceRate !== undefined) {
    context += buildComplianceContextForCoach(athlete.complianceRate, locale);
  }

  // Add strength training context if available (NEW)
  if (athlete.strengthSessions && athlete.strengthSessions.length > 0) {
    context += buildStrengthContextForCoach(athlete.strengthSessions, locale);
  }

  // Add athlete self-description if available (NEW)
  if (athlete.athleteProfile) {
    context += buildAthleteProfileContextForCoach(athlete.athleteProfile, athlete.sportProfile ?? undefined, locale);
  }

  // Add coach notes if available (NEW)
  if (athlete.coachNotes && athlete.coachNotes.length > 0) {
    context += buildCoachNotesContext(athlete.coachNotes, locale);
  }

  // Add session types and periodization notes
  context += `\n### ${locale === 'sv' ? 'Rekommenderade passtyper' : 'Recommended Session Types'}\n`;
  for (const session of sportPrompt.sessionTypes.slice(0, 6)) {
    context += `- ${session}\n`;
  }

  context += `\n${sportPrompt.periodizationNotes}\n`;

  return context;
}
