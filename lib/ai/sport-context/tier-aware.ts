import type { AthleteSubscriptionTier } from '@prisma/client'
import type { AthleteData } from './types'
import { SPORT_PROMPTS } from '../program-prompts'
import { buildBasicProfileContext, buildTestContext } from './basic'
import { buildStravaContext, buildGarminContext } from './integrations'
import { buildReadinessContext } from './readiness'
import { buildVideoAnalysisContext } from './video-analysis'
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
 * Tier configuration for AI context access
 */
const TIER_CONTEXT_CONFIG = {
  FREE: {
    includeBasicProfile: true,
    includeTests: false, // View only, no AI analysis
    includeVideoAnalysis: false,
    includeIntegrations: false,
    includeAdvancedMetrics: false,
    includeNutrition: false,
    maxContextLength: 0, // No AI access
  },
  STANDARD: {
    includeBasicProfile: true,
    includeTests: true,
    includeVideoAnalysis: false,
    includeIntegrations: true, // basic integration data
    includeAdvancedMetrics: false,
    includeNutrition: true,
    maxContextLength: 4000, // Limited context
  },
  PRO: {
    includeBasicProfile: true,
    includeTests: true,
    includeVideoAnalysis: true,
    includeIntegrations: true,
    includeAdvancedMetrics: true,
    includeNutrition: true,
    maxContextLength: -1, // Unlimited
  },
} as const;

type TierContextConfigKey = keyof typeof TIER_CONTEXT_CONFIG
export type TierContextConfig = (typeof TIER_CONTEXT_CONFIG)[TierContextConfigKey]

function resolveTierContextConfigKey(tier: AthleteSubscriptionTier): TierContextConfigKey {
  if (tier in TIER_CONTEXT_CONFIG) {
    return tier as TierContextConfigKey
  }
  // Forward compatibility for tiers that should inherit the richest athlete context.
  return 'PRO'
}

/**
 * Get context configuration for a subscription tier
 */
export function getTierContextConfig(tier: AthleteSubscriptionTier): TierContextConfig {
  return TIER_CONTEXT_CONFIG[resolveTierContextConfigKey(tier)]
}

/**
 * Check if tier has AI access enabled
 */
export function tierHasAIAccess(tier: AthleteSubscriptionTier): boolean {
  return TIER_CONTEXT_CONFIG[resolveTierContextConfigKey(tier)].maxContextLength !== 0
}

/**
 * Build tier-aware context for AI chat
 *
 * Filters athlete data based on subscription tier to respect feature gates.
 */
export function buildTierAwareContext(
  athlete: AthleteData,
  tier: AthleteSubscriptionTier,
  locale: 'en' | 'sv' = 'en'
): string {
  const config = getTierContextConfig(tier);

  // FREE tier has no AI access
  if (!tierHasAIAccess(tier)) {
    return '';
  }

  let context = '';

  // Basic profile is always included for paid tiers
  if (config.includeBasicProfile) {
    context += buildBasicProfileContext(athlete);
  }

  // Sport-specific context
  const primarySport = athlete.sportProfile?.primarySport;
  if (primarySport) {
    const sportPrompt = SPORT_PROMPTS[primarySport];
    context += `\n${sportPrompt.systemContext}\n`;

    // Add sport-specific data based on tier
    switch (primarySport) {
      case 'RUNNING':
        context += buildRunningContext(athlete, locale);
        break;
      case 'CYCLING':
        context += buildCyclingContext(athlete);
        break;
      case 'SWIMMING':
        context += buildSwimmingContext(athlete);
        break;
      case 'TRIATHLON':
        context += buildTriathlonContext(athlete);
        break;
      case 'HYROX':
        context += buildHyroxContext(athlete);
        break;
      case 'SKIING':
        context += buildSkiingContext(athlete);
        break;
      case 'GENERAL_FITNESS':
        context += buildGeneralFitnessContext(athlete);
        break;
      case 'FUNCTIONAL_FITNESS':
        context += buildFunctionalFitnessContext(athlete);
        break;
      case 'TEAM_ICE_HOCKEY':
        context += buildHockeyContext(athlete);
        break;
      case 'TEAM_FOOTBALL':
        context += buildFootballContext(athlete);
        break;
    }
  }

  // Test data (for STANDARD and PRO)
  if (config.includeTests && athlete.tests.length > 0) {
    context += buildTestContext(athlete.tests, locale);
  }

  // Video analysis (PRO only)
  if (config.includeVideoAnalysis && athlete.videoAnalyses && athlete.videoAnalyses.length > 0) {
    context += buildVideoAnalysisContext(athlete.videoAnalyses, locale);
  }

  // Readiness data (for STANDARD and PRO)
  if (config.includeAdvancedMetrics && athlete.dailyCheckIns && athlete.dailyCheckIns.length > 0) {
    context += buildReadinessContext(athlete.dailyCheckIns);
  }

  // Integration data (PRO tier only - with full depth, STANDARD gets summary)
  if (config.includeIntegrations) {
    // Strava data
    if (athlete.stravaActivities && athlete.stravaActivities.length > 0) {
      if (tier === 'PRO') {
        // Full context for PRO
        context += buildStravaContext(athlete.stravaActivities, locale);
      } else {
        // Summary for STANDARD
        const totalDistance = athlete.stravaActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;
        const activityCount = athlete.stravaActivities.length;
        context += `\n## Strava-sammanfattning\n`;
        context += `- **Aktiviteter (14 dagar)**: ${activityCount}\n`;
        context += `- **Total distans**: ${totalDistance.toFixed(1)} km\n`;
        context += `*Uppgradera till Pro för detaljerad träningsanalys*\n`;
      }
    }

    // Garmin data
    if (athlete.garminMetrics) {
      if (tier === 'PRO') {
        // Full context for PRO
        context += buildGarminContext(athlete.garminMetrics, locale);
      } else {
        // Summary for STANDARD
        context += `\n## Garmin-sammanfattning\n`;
        if (athlete.garminMetrics.readinessScore !== null) {
          context += `- **Beredskapspoäng**: ${athlete.garminMetrics.readinessScore}/100\n`;
        }
        context += `*Uppgradera till Pro för fullständig hälsoanalys*\n`;
      }
    }
  }

  // Truncate if needed for STANDARD tier
  if (config.maxContextLength > 0 && context.length > config.maxContextLength) {
    context = context.substring(0, config.maxContextLength) + '\n\n[Kontext trunkerad - uppgradera till Pro för fullständig AI-analys]';
  }

  return context;
}
