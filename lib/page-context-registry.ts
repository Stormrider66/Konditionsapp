// lib/page-context-registry.ts
// Maps URL patterns to page descriptions + relevant concept keys for AI context

import { getInfoEntriesByKeys, type InfoEntry } from '@/lib/info-content'

export interface CardContext {
  id: string
  title: string
  conceptKey?: string
}

export interface PageContextConfig {
  pageTitle: string
  description: string
  concepts: string[]
  cards?: CardContext[]
}

export const PAGE_CONTEXT_REGISTRY: Record<string, PageContextConfig> = {
  // ============ COACH ROUTES ============
  'coach/dashboard': {
    pageTitle: 'Coach Dashboard',
    description: 'Översikt med atletberedskap, aktiva varningar, träningsbelastning och kommande aktiviteter.',
    concepts: ['readiness', 'tss', 'acwr', 'coachAlerts'],
    cards: [
      { id: 'readiness-overview', title: 'Beredskap idag', conceptKey: 'readiness' },
      { id: 'alerts', title: 'Varningar', conceptKey: 'coachAlerts' },
      { id: 'training-load', title: 'Träningsbelastning', conceptKey: 'tss' },
    ],
  },
  'coach/monitoring': {
    pageTitle: 'Atletövervakning',
    description: 'Detaljerad monitorering av atleters HRV, vilopuls, beredskap och träningstrender.',
    concepts: ['readiness', 'hrv', 'tss', 'acwr', 'trainingZones', 'rhrDeviation'],
    cards: [
      { id: 'hrv-trend', title: 'HRV-trend', conceptKey: 'hrv' },
      { id: 'readiness', title: 'Beredskap', conceptKey: 'readiness' },
      { id: 'training-load', title: 'Belastning', conceptKey: 'tss' },
      { id: 'acwr', title: 'ACWR', conceptKey: 'acwr' },
    ],
  },
  'coach/athletes': {
    pageTitle: 'Atleter',
    description: 'Lista och hantering av coachens atleter med snabb statusöversikt.',
    concepts: ['readiness', 'subscriptionTiers'],
  },
  'coach/athletes/[id]': {
    pageTitle: 'Atletprofil',
    description: 'Detaljerad profil med testresultat, träningshistorik, program och beredskapsdata.',
    concepts: ['readiness', 'vo2max', 'trainingZones', 'tss', 'acwr'],
  },
  'coach/tests': {
    pageTitle: 'Tester',
    description: 'Laktat- och VO2max-tester med tröskeldetektering och zonberäkning.',
    concepts: ['vo2max', 'dmax', 'trainingZones'],
  },
  'coach/tests/[id]': {
    pageTitle: 'Testresultat',
    description: 'Detaljerat testresultat med laktatkurva, tröskelvärden och beräknade zoner.',
    concepts: ['vo2max', 'dmax', 'trainingZones', 'criticalPower'],
  },
  'coach/programs': {
    pageTitle: 'Program',
    description: 'Översikt av träningsprogram med periodisering och metodikval.',
    concepts: ['periodization', 'methodologies', 'trainingZones'],
  },
  'coach/programs/[id]': {
    pageTitle: 'Programdetaljer',
    description: 'Detaljerad programvy med veckoplan, faser och träningspass.',
    concepts: ['periodization', 'methodologies', 'trainingZones', 'tss'],
  },
  'coach/strength': {
    pageTitle: 'Styrketräning',
    description: 'Styrketräningsplanering med övningsbibliotek, periodisering och progressionsregler.',
    concepts: ['oneRM', 'twoForTwo', 'strengthPhases', 'rpe'],
    cards: [
      { id: '1rm-overview', title: '1RM-översikt', conceptKey: 'oneRM' },
      { id: 'progression', title: 'Progression', conceptKey: 'twoForTwo' },
      { id: 'phases', title: 'Träningsfaser', conceptKey: 'strengthPhases' },
    ],
  },
  'coach/injury-prevention': {
    pageTitle: 'Skadeprevention',
    description: 'ACWR-monitorering, skaderiskbedömning och Delaware-smärtregler.',
    concepts: ['acwr', 'delawarePain', 'rehabPhases'],
    cards: [
      { id: 'acwr-monitor', title: 'ACWR-risk', conceptKey: 'acwr' },
      { id: 'pain-rules', title: 'Smärtregler', conceptKey: 'delawarePain' },
    ],
  },
  'coach/ai-studio': {
    pageTitle: 'AI Studio',
    description: 'AI-assisterad programgenerering med dokumentkunskap och multimöjlighetsstöd.',
    concepts: ['aiModels', 'ragDocuments', 'methodologies', 'periodization'],
  },
  'coach/video-analysis': {
    pageTitle: 'Videoanalys',
    description: 'AI-driven analys av rörelseteknik med MediaPipe och Gemini.',
    concepts: ['videoAnalysisScores'],
  },
  'coach/video-analysis/[id]': {
    pageTitle: 'Videoanalysresultat',
    description: 'Detaljerat resultat från videoanalys med teknikpoäng och förbättringsförslag.',
    concepts: ['videoAnalysisScores'],
  },
  'coach/settings/ai': {
    pageTitle: 'AI-inställningar',
    description: 'Konfigurera AI-modeller, API-nycklar och token-budgetar.',
    concepts: ['aiModels', 'tokenBudget', 'ragDocuments'],
  },
  'coach/documents': {
    pageTitle: 'Kunskapsdokument',
    description: 'Hantera kunskapsdokument som AI:n kan referera till via RAG.',
    concepts: ['ragDocuments', 'aiModels'],
  },
  'coach/live-hr': {
    pageTitle: 'Live-pulsmonitorering',
    description: 'Realtidsövervakning av atleters hjärtfrekvens under grupppass.',
    concepts: ['liveHrZones', 'trainingZones', 'hrv'],
    cards: [
      { id: 'live-grid', title: 'Live HR-grid', conceptKey: 'liveHrZones' },
      { id: 'zones', title: 'Pulszonfördelning', conceptKey: 'trainingZones' },
    ],
  },
  'coach/body-composition': {
    pageTitle: 'Kroppssammansättning',
    description: 'Spåra atleters vikt, fettprocent och muskelmasseförändringar över tid.',
    concepts: ['bodyComposition', 'wattsPerKg'],
  },
  'coach/cross-training': {
    pageTitle: 'Cross-training',
    description: 'Planera alternativ träning med modalitetsekvivalenser och fitnessprojektion.',
    concepts: ['crossTraining', 'detraining', 'interferenceWarnings'],
  },
  'coach/subscription': {
    pageTitle: 'Prenumeration',
    description: 'Hantera din coachprenumeration och se tillgängliga funktioner per nivå.',
    concepts: ['subscriptionTiers'],
  },
  'coach/wod': {
    pageTitle: 'WOD-generator',
    description: 'Skapa dagens pass (Workout of the Day) anpassat efter atleternas beredskap.',
    concepts: ['wodFormats', 'readiness', 'rpe'],
  },
  'coach/calculators': {
    pageTitle: 'Beräkningsverktyg',
    description: 'VDOT-kalkylator, zonberäkningar och andra träningsberäkningar.',
    concepts: ['vdot', 'trainingZones', 'criticalPower'],
  },

  // ============ ATHLETE ROUTES ============
  'athlete/dashboard': {
    pageTitle: 'Atlet Dashboard',
    description: 'Personlig översikt med beredskap, veckans träning, belastning och kommande pass.',
    concepts: ['readiness', 'tss', 'rpe', 'trainingZones'],
    cards: [
      { id: 'readiness', title: 'Beredskap', conceptKey: 'readiness' },
      { id: 'training-load', title: 'Veckobelastning', conceptKey: 'tss' },
      { id: 'zones', title: 'Zonfördelning', conceptKey: 'trainingZones' },
    ],
  },
  'athlete/training': {
    pageTitle: 'Träning',
    description: 'Träningslogg med genomförda pass, RPE-rapportering och progressionsspårning.',
    concepts: ['rpe', 'tss', 'trainingZones'],
  },
  'athlete/tests': {
    pageTitle: 'Mina tester',
    description: 'Testresultat med laktatkurvor, VO2max och beräknade träningszoner.',
    concepts: ['vo2max', 'dmax', 'trainingZones'],
  },
  'athlete/programs': {
    pageTitle: 'Mina program',
    description: 'Aktiva och tidigare träningsprogram med veckoschema.',
    concepts: ['periodization', 'methodologies', 'trainingZones'],
  },
  'athlete/wod': {
    pageTitle: 'Dagens pass (WOD)',
    description: 'Ditt anpassade dagliga träningspass baserat på beredskap och program.',
    concepts: ['wodFormats', 'readiness', 'rpe', 'workoutSections'],
  },
  'athlete/injury-prevention': {
    pageTitle: 'Skadeprevention',
    description: 'Din personliga skaderisk, ACWR-status och smärtrapportering.',
    concepts: ['acwr', 'delawarePain'],
    cards: [
      { id: 'acwr-gauge', title: 'ACWR', conceptKey: 'acwr' },
      { id: 'pain-rules', title: 'Smärtregler', conceptKey: 'delawarePain' },
    ],
  },
  'athlete/readiness': {
    pageTitle: 'Beredskap',
    description: 'Detaljerad beredskapsstatus med HRV, sömn, muskelömhet och trendanalys.',
    concepts: ['readiness', 'hrv', 'rhrDeviation', 'sleepBreakdown'],
    cards: [
      { id: 'readiness-score', title: 'Beredskapspoäng', conceptKey: 'readiness' },
      { id: 'hrv', title: 'HRV', conceptKey: 'hrv' },
      { id: 'sleep', title: 'Sömn', conceptKey: 'sleepBreakdown' },
    ],
  },
  'athlete/ergometer': {
    pageTitle: 'Ergometer',
    description: 'Ergometertester och resultat med CP/FTP-beräkningar och W\'.',
    concepts: ['criticalPower', 'ftp', 'wprime'],
  },
  'athlete/cycling': {
    pageTitle: 'Cykling',
    description: 'Cykelprestanda med FTP, W/kg, zonfördelning och träningshistorik.',
    concepts: ['ftp', 'wattsPerKg', 'criticalPower', 'trainingZones'],
  },
  'athlete/strength': {
    pageTitle: 'Styrketräning',
    description: 'Styrketräningslogg med 1RM-progression, VBT och periodisering.',
    concepts: ['oneRM', 'twoForTwo', 'rpe', 'strengthPhases'],
  },
  'athlete/calendar': {
    pageTitle: 'Kalender',
    description: 'Träningskalender med planerade och genomförda pass, tester och tävlingar.',
    concepts: ['calendarEventTypes', 'periodization'],
  },
  'athlete/video-analysis': {
    pageTitle: 'Videoanalys',
    description: 'Dina videoanalyser med teknikpoäng och AI-feedback.',
    concepts: ['videoAnalysisScores'],
  },
  'athlete/settings': {
    pageTitle: 'Inställningar',
    description: 'Profilinställningar, integrationskopplingar och dataexport.',
    concepts: ['exportFormats', 'agentConsent'],
  },
  'athlete/chat': {
    pageTitle: 'AI-chatt',
    description: 'Chatta med din AI-tränare om träning, kost och återhämtning.',
    concepts: ['aiModels', 'tokenBudget', 'agentConsent'],
  },
  'athlete/body-composition': {
    pageTitle: 'Kroppssammansättning',
    description: 'Spåra din vikt, fettprocent och muskelmasseförändringar.',
    concepts: ['bodyComposition', 'wattsPerKg'],
  },

  // ============ PHYSIO ROUTES ============
  'physio/dashboard': {
    pageTitle: 'Fysioterapeut Dashboard',
    description: 'Översikt med aktiva patienter, rehabiliteringsprogram och restriktioner.',
    concepts: ['rehabPhases', 'delawarePain', 'soapNotes', 'careTeamPriority'],
  },
  'physio/patients': {
    pageTitle: 'Patienter',
    description: 'Patientlista med skadestatus och rehabiliteringsframsteg.',
    concepts: ['rehabPhases', 'delawarePain'],
  },
  'physio/patients/[id]': {
    pageTitle: 'Patientjournal',
    description: 'Detaljerad patientvy med behandlingshistorik, SOAP-anteckningar och restriktioner.',
    concepts: ['rehabPhases', 'soapNotes', 'delawarePain', 'careTeamPriority'],
  },
  'physio/treatments': {
    pageTitle: 'Behandlingar',
    description: 'Behandlingssessioner med SOAP-dokumentation.',
    concepts: ['soapNotes', 'rehabPhases'],
  },
  'physio/care-team': {
    pageTitle: 'Vårdteam',
    description: 'Trådbaserad kommunikation mellan fysioterapeut, coach och atlet med prioritetsnivåer.',
    concepts: ['careTeamPriority', 'rehabPhases'],
  },

  // ============ SHARED ROUTES ============
  'admin/ai-models': {
    pageTitle: 'AI-modellhantering',
    description: 'Administrera AI-modeller, leverantörer och åtkomstkontroll.',
    concepts: ['aiModels', 'tokenBudget', 'subscriptionTiers'],
  },
  'admin/pricing': {
    pageTitle: 'Prishantering',
    description: 'Hantera prenumerationsnivåer och funktionslåsning.',
    concepts: ['subscriptionTiers'],
  },
}

/**
 * Resolves page context from a pathname by stripping the business slug
 * and matching against the registry.
 */
export function resolvePageContext(pathname: string): PageContextConfig | undefined {
  // Strip leading slash
  let path = pathname.replace(/^\//, '')

  // Strip business slug: /my-gym/coach/dashboard → coach/dashboard
  // Pattern: first segment is the business slug if followed by coach|athlete|physio
  const segments = path.split('/')
  if (segments.length >= 2 && ['coach', 'athlete', 'physio'].includes(segments[1])) {
    path = segments.slice(1).join('/')
  }

  // Direct match first
  if (PAGE_CONTEXT_REGISTRY[path]) {
    return PAGE_CONTEXT_REGISTRY[path]
  }

  // Try dynamic segment matching: replace UUIDs/IDs with [id]
  const dynamicPath = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/[id]'
  ).replace(
    /\/[a-z0-9]{20,}/gi,  // Also match cuid-style IDs
    '/[id]'
  )

  if (PAGE_CONTEXT_REGISTRY[dynamicPath]) {
    return PAGE_CONTEXT_REGISTRY[dynamicPath]
  }

  return undefined
}

/**
 * Builds a markdown string from page context config for injection into AI system prompt.
 */
export function buildPageContextForAI(config: PageContextConfig): string {
  const entries: InfoEntry[] = getInfoEntriesByKeys(config.concepts)

  let md = `## Aktuell sida: ${config.pageTitle}\n`
  md += `${config.description}\n`

  if (entries.length > 0) {
    md += `\n### Relevanta begrepp på denna sida:\n`
    for (const entry of entries) {
      md += `\n**${entry.title}**: ${entry.detailed}\n`
    }
  }

  if (config.cards && config.cards.length > 0) {
    md += `\n### Synliga kort/sektioner:\n`
    for (const card of config.cards) {
      md += `- ${card.title}\n`
    }
  }

  return md
}
