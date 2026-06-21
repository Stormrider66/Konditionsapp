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

type AppLocale = 'en' | 'sv'
type PageContextText = Pick<PageContextConfig, 'pageTitle' | 'description'> & {
  cards?: Pick<CardContext, 'id' | 'title'>[]
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
  'coach/hockey-tests': {
    pageTitle: 'Hockey testcockpit',
    description: 'Hockeyspecifik testinmatning för is-sprint, 5-10-5, 7x40 m, MuscleLab/VBT, Wingate 30 s, styrka, hopp, grepp, beep test och VO2max/ramp med LT1, LT2, laktat, maxpuls och ramptid. Resultaten sparas till HockeyPhysicalTest och används i spelarprofil, teammatris, rapporter, normer, pathway och SIMCA-export.',
    concepts: ['vo2max', 'trainingZones', 'wattsPerKg', 'oneRM'],
    cards: [
      { id: 'hockey-ice-tests', title: 'Is-tester' },
      { id: 'hockey-musclelab', title: 'MuscleLab / VBT', conceptKey: 'wattsPerKg' },
      { id: 'hockey-aerobic-lab', title: 'VO2max / ramp', conceptKey: 'vo2max' },
      { id: 'hockey-strength', title: 'Styrka', conceptKey: 'oneRM' },
    ],
  },
  'coach/teams/[id]/tests': {
    pageTitle: 'Hockey team tests',
    description: 'Lagets testvy med hockeymatris, rankings, percentiler, position-z-score, norm gaps, quality flags, leaders, history, development pathway, coach action plan, PDF-rapporter och SIMCA-ready CSV-export. Is-sprint visas även som km/h och 7x40 m tolkas med best, average, worst, fatigue drop och resistance score.',
    concepts: ['vo2max', 'wattsPerKg', 'oneRM', 'trainingZones'],
    cards: [
      { id: 'hockey-test-matrix', title: 'Hockey testmatris' },
      { id: 'hockey-action-plan', title: 'Coach action plan' },
      { id: 'hockey-pathway', title: 'Development pathway' },
      { id: 'hockey-simca-export', title: 'SIMCA-export' },
      { id: 'hockey-aerobic-profile', title: 'Aerob profil', conceptKey: 'vo2max' },
    ],
  },
  'coach/teams/[id]/capture': {
    pageTitle: 'Lagkondition',
    description: 'Lagbaserad konditionssida där coachen väljer ett Cardio-/Hybridpass, bygger banor/startgrupper/rundor/stationer, startar masterklockan och använder station receivers för Concept2 PM5, Wattbike/air bikes samt Garmin/manuell timing för löpning och vila.',
    concepts: ['trainingZones', 'liveHrZones', 'tss', 'hrv'],
    cards: [
      { id: 'team-capture-template', title: 'Passmall och stationer', conceptKey: 'trainingZones' },
      { id: 'team-capture-lanes', title: 'Banor, startgrupper och startlista' },
      { id: 'team-capture-receivers', title: 'Bluetooth station receivers', conceptKey: 'liveHrZones' },
      { id: 'team-capture-review', title: 'Post-session review och Workout Evaluation', conceptKey: 'tss' },
    ],
  },
  'coach/teams/[id]/kiosk': {
    pageTitle: 'Lagstyrka',
    description: 'Lagbaserad styrkesida där spelare väljer sitt namn på en gemensam skärm och loggar dagens tilldelade styrkepass, set, belastning, reps och pass-RPE.',
    concepts: ['oneRM', 'readiness', 'tss'],
    cards: [
      { id: 'team-strength-roster', title: 'Spelarlista och dagens styrkepass' },
      { id: 'team-strength-logging', title: 'Setloggning med vikt, reps och RPE', conceptKey: 'oneRM' },
      { id: 'team-strength-progress', title: 'Genomförande och status' },
    ],
  },
  'coach/teams/[id]/multivariate': {
    pageTitle: 'Hockey multivariate analysis',
    description: 'MVA/SIMCA-vy för teamdata. Används för PCA/PLS/SIMCA-arbete med hockeyvariabler, outliers, score/loadings, VIP, positionkluster och export/import av analysartefakter.',
    concepts: ['vo2max', 'wattsPerKg', 'trainingZones'],
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
    description: 'Strength Studio: Övningsbibliotek (250+ övningar, 6 biomechaniska pelare), auto-generering av enskilda pass eller veckoprogram (A/B/C), atletmedveten generering med restriktioner och kalendermedvetenhet, periodisering (5 faser), progressionsspårning med 1RM och 2-for-2-regeln.',
    concepts: ['oneRM', 'twoForTwo', 'strengthPhases', 'rpe', 'biomechanicalPillars'],
    cards: [
      { id: '1rm-overview', title: '1RM-översikt', conceptKey: 'oneRM' },
      { id: 'progression', title: 'Progression', conceptKey: 'twoForTwo' },
      { id: 'phases', title: 'Träningsfaser', conceptKey: 'strengthPhases' },
      { id: 'auto-generate', title: 'Auto-generering', conceptKey: 'strengthPhases' },
      { id: 'pillars', title: 'Biomechaniska pelare', conceptKey: 'biomechanicalPillars' },
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
    description: 'Konfigurera AI-modeller, API-nycklar och AI-kostnadsbudgetar.',
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

const PAGE_CONTEXT_EN: Record<string, PageContextText> = {
  'coach/dashboard': {
    pageTitle: 'Coach Dashboard',
    description: 'Overview of athlete readiness, active alerts, training load, and upcoming activity.',
    cards: [
      { id: 'readiness-overview', title: 'Readiness today' },
      { id: 'alerts', title: 'Alerts' },
      { id: 'training-load', title: 'Training load' },
    ],
  },
  'coach/monitoring': {
    pageTitle: 'Athlete Monitoring',
    description: 'Detailed monitoring of athlete HRV, resting heart rate, readiness, and training trends.',
    cards: [
      { id: 'hrv-trend', title: 'HRV trend' },
      { id: 'readiness', title: 'Readiness' },
      { id: 'training-load', title: 'Load' },
      { id: 'acwr', title: 'ACWR' },
    ],
  },
  'coach/athletes': {
    pageTitle: 'Athletes',
    description: 'List and manage coach athletes with a quick status overview.',
  },
  'coach/athletes/[id]': {
    pageTitle: 'Athlete Profile',
    description: 'Detailed profile with test results, training history, programs, and readiness data.',
  },
  'coach/tests': {
    pageTitle: 'Tests',
    description: 'Lactate and VO2max tests with threshold detection and zone calculations.',
  },
  'coach/tests/[id]': {
    pageTitle: 'Test Result',
    description: 'Detailed test result with lactate curve, threshold values, and calculated zones.',
  },
  'coach/hockey-tests': {
    pageTitle: 'Hockey Test Cockpit',
    description: 'Hockey-specific test entry for ice sprint, 5-10-5, 7x40 m, MuscleLab/VBT, Wingate, strength, jumps, grip, beep test, and VO2max/ramp data.',
    cards: [
      { id: 'hockey-ice-tests', title: 'Ice tests' },
      { id: 'hockey-musclelab', title: 'MuscleLab / VBT' },
      { id: 'hockey-aerobic-lab', title: 'VO2max / ramp' },
      { id: 'hockey-strength', title: 'Strength' },
    ],
  },
  'coach/teams/[id]/tests': {
    pageTitle: 'Hockey Team Tests',
    description: 'Team testing view with hockey matrix, rankings, percentiles, quality flags, development pathway, coach action plan, reports, and SIMCA-ready CSV export.',
    cards: [
      { id: 'hockey-test-matrix', title: 'Hockey test matrix' },
      { id: 'hockey-action-plan', title: 'Coach action plan' },
      { id: 'hockey-pathway', title: 'Development pathway' },
      { id: 'hockey-simca-export', title: 'SIMCA export' },
      { id: 'hockey-aerobic-profile', title: 'Aerobic profile' },
    ],
  },
  'coach/teams/[id]/capture': {
    pageTitle: 'Team cardio',
    description: 'Team cardio page where the coach picks a Cardio/Hybrid workout, builds lanes/start groups/rounds/stations, starts one master clock, and uses station receivers for Concept2 PM5, Wattbike/air bikes plus Garmin/manual timing for running and rest.',
    cards: [
      { id: 'team-capture-template', title: 'Workout template and stations' },
      { id: 'team-capture-lanes', title: 'Lanes, start groups, and startlist' },
      { id: 'team-capture-receivers', title: 'Bluetooth station receivers' },
      { id: 'team-capture-review', title: 'Post-session review and Workout Evaluation' },
    ],
  },
  'coach/teams/[id]/kiosk': {
    pageTitle: 'Team strength',
    description: 'Team strength page where players choose their name on a shared screen and log today’s assigned strength workout, sets, load, reps, and session RPE.',
    cards: [
      { id: 'team-strength-roster', title: 'Player roster and today’s strength work' },
      { id: 'team-strength-logging', title: 'Set logging with weight, reps, and RPE' },
      { id: 'team-strength-progress', title: 'Completion and status' },
    ],
  },
  'coach/teams/[id]/multivariate': {
    pageTitle: 'Hockey Multivariate Analysis',
    description: 'MVA/SIMCA view for team data, including PCA/PLS/SIMCA workflows, outliers, score/loadings, VIP, position clusters, and analysis artifact import/export.',
  },
  'coach/programs': {
    pageTitle: 'Programs',
    description: 'Overview of training programs with periodization and methodology choices.',
  },
  'coach/programs/[id]': {
    pageTitle: 'Program Details',
    description: 'Detailed program view with weekly plan, phases, and workouts.',
  },
  'coach/strength': {
    pageTitle: 'Strength Training',
    description: 'Strength Studio with exercise library, workout and weekly program generation, athlete-aware restrictions, periodization, 1RM, and 2-for-2 progression tracking.',
    cards: [
      { id: '1rm-overview', title: '1RM overview' },
      { id: 'progression', title: 'Progression' },
      { id: 'phases', title: 'Training phases' },
      { id: 'auto-generate', title: 'Auto-generation' },
      { id: 'pillars', title: 'Biomechanical pillars' },
    ],
  },
  'coach/injury-prevention': {
    pageTitle: 'Injury Prevention',
    description: 'ACWR monitoring, injury-risk assessment, and Delaware pain rules.',
    cards: [
      { id: 'acwr-monitor', title: 'ACWR risk' },
      { id: 'pain-rules', title: 'Pain rules' },
    ],
  },
  'coach/ai-studio': {
    pageTitle: 'AI Studio',
    description: 'AI-assisted program generation with document knowledge and multimodal support.',
  },
  'coach/video-analysis': {
    pageTitle: 'Video Analysis',
    description: 'AI-driven movement technique analysis with MediaPipe and Gemini.',
  },
  'coach/video-analysis/[id]': {
    pageTitle: 'Video Analysis Result',
    description: 'Detailed video analysis result with technique score and improvement suggestions.',
  },
  'coach/settings/ai': {
    pageTitle: 'AI Settings',
    description: 'Configure AI models, API keys, and AI cost budgets.',
  },
  'coach/documents': {
    pageTitle: 'Knowledge Documents',
    description: 'Manage knowledge documents that AI can reference through RAG.',
  },
  'coach/live-hr': {
    pageTitle: 'Live Heart-Rate Monitoring',
    description: 'Real-time monitoring of athlete heart rate during group sessions.',
    cards: [
      { id: 'live-grid', title: 'Live HR grid' },
      { id: 'zones', title: 'Heart-rate zone distribution' },
    ],
  },
  'coach/body-composition': {
    pageTitle: 'Body Composition',
    description: 'Track athlete weight, body-fat percentage, and muscle-mass changes over time.',
  },
  'coach/cross-training': {
    pageTitle: 'Cross-Training',
    description: 'Plan alternative training with modality equivalents and fitness projection.',
  },
  'coach/subscription': {
    pageTitle: 'Subscription',
    description: 'Manage your coach subscription and view available features by tier.',
  },
  'coach/wod': {
    pageTitle: 'WOD Generator',
    description: 'Create Workout of the Day sessions adapted to athlete readiness.',
  },
  'coach/calculators': {
    pageTitle: 'Calculators',
    description: 'VDOT calculator, zone calculations, and other training calculators.',
  },
  'athlete/dashboard': {
    pageTitle: 'Athlete Dashboard',
    description: 'Personal overview of readiness, weekly training, load, and upcoming sessions.',
    cards: [
      { id: 'readiness', title: 'Readiness' },
      { id: 'training-load', title: 'Weekly load' },
      { id: 'zones', title: 'Zone distribution' },
    ],
  },
  'athlete/training': {
    pageTitle: 'Training',
    description: 'Training log with completed sessions, RPE reporting, and progression tracking.',
  },
  'athlete/tests': {
    pageTitle: 'My Tests',
    description: 'Test results with lactate curves, VO2max, and calculated training zones.',
  },
  'athlete/programs': {
    pageTitle: 'My Programs',
    description: 'Active and previous training programs with weekly schedules.',
  },
  'athlete/wod': {
    pageTitle: 'Workout of the Day',
    description: 'Your adapted daily workout based on readiness and program context.',
  },
  'athlete/injury-prevention': {
    pageTitle: 'Injury Prevention',
    description: 'Your personal injury risk, ACWR status, and pain reporting.',
    cards: [
      { id: 'acwr-gauge', title: 'ACWR' },
      { id: 'pain-rules', title: 'Pain rules' },
    ],
  },
  'athlete/readiness': {
    pageTitle: 'Readiness',
    description: 'Detailed readiness status with HRV, sleep, muscle soreness, and trend analysis.',
    cards: [
      { id: 'readiness-score', title: 'Readiness score' },
      { id: 'hrv', title: 'HRV' },
      { id: 'sleep', title: 'Sleep' },
    ],
  },
  'athlete/ergometer': {
    pageTitle: 'Ergometer',
    description: "Ergometer tests and results with CP/FTP calculations and W'.",
  },
  'athlete/cycling': {
    pageTitle: 'Cycling',
    description: 'Cycling performance with FTP, W/kg, zone distribution, and training history.',
  },
  'athlete/strength': {
    pageTitle: 'Strength Training',
    description: 'Strength training log with 1RM progression, VBT, and periodization.',
  },
  'athlete/calendar': {
    pageTitle: 'Calendar',
    description: 'Training calendar with planned and completed sessions, tests, and races.',
  },
  'athlete/video-analysis': {
    pageTitle: 'Video Analysis',
    description: 'Your video analyses with technique scores and AI feedback.',
  },
  'athlete/settings': {
    pageTitle: 'Settings',
    description: 'Profile settings, integration connections, and data export.',
  },
  'athlete/chat': {
    pageTitle: 'AI Chat',
    description: 'Chat with your AI coach about training, nutrition, and recovery.',
  },
  'athlete/body-composition': {
    pageTitle: 'Body Composition',
    description: 'Track your weight, body-fat percentage, and muscle-mass changes.',
  },
  'physio/dashboard': {
    pageTitle: 'Physiotherapist Dashboard',
    description: 'Overview of active patients, rehabilitation programs, and restrictions.',
  },
  'physio/patients': {
    pageTitle: 'Patients',
    description: 'Patient list with injury status and rehabilitation progress.',
  },
  'physio/patients/[id]': {
    pageTitle: 'Patient Record',
    description: 'Detailed patient view with treatment history, SOAP notes, and restrictions.',
  },
  'physio/treatments': {
    pageTitle: 'Treatments',
    description: 'Treatment sessions with SOAP documentation.',
  },
  'physio/care-team': {
    pageTitle: 'Care Team',
    description: 'Thread-based communication between physiotherapist, coach, and athlete with priority levels.',
  },
  'admin/ai-models': {
    pageTitle: 'AI Model Management',
    description: 'Administer AI models, providers, and access control.',
  },
  'admin/pricing': {
    pageTitle: 'Pricing Management',
    description: 'Manage subscription tiers and feature gating.',
  },
}

function localizePageContext(
  key: string,
  config: PageContextConfig,
  locale: AppLocale = 'en'
): PageContextConfig {
  if (locale === 'sv') return config
  const english = PAGE_CONTEXT_EN[key]
  if (!english) return config

  const cards = config.cards?.map((card) => {
    const override = english.cards?.find((candidate) => candidate.id === card.id)
    return override ? { ...card, title: override.title } : card
  })

  return {
    ...config,
    pageTitle: english.pageTitle,
    description: english.description,
    ...(cards ? { cards } : {}),
  }
}

/**
 * Resolves page context from a pathname by stripping the business slug
 * and matching against the registry.
 */
export function resolvePageContext(
  pathname: string,
  locale: AppLocale = 'en'
): PageContextConfig | undefined {
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
    return localizePageContext(path, PAGE_CONTEXT_REGISTRY[path], locale)
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
    return localizePageContext(dynamicPath, PAGE_CONTEXT_REGISTRY[dynamicPath], locale)
  }

  return undefined
}

/**
 * Builds a markdown string from page context config for injection into AI system prompt.
 */
export function buildPageContextForAI(config: PageContextConfig, locale: 'en' | 'sv' = 'en'): string {
  const configKey = Object.entries(PAGE_CONTEXT_REGISTRY).find(([, value]) => value === config)?.[0] ?? ''
  const localizedConfig = locale === 'sv' ? config : localizePageContext(configKey, config, locale)
  const entries: InfoEntry[] = getInfoEntriesByKeys(localizedConfig.concepts, locale)

  let md = locale === 'sv' ? `## Aktuell sida: ${localizedConfig.pageTitle}\n` : `## Current page: ${localizedConfig.pageTitle}\n`
  md += `${localizedConfig.description}\n`

  if (entries.length > 0) {
    md += locale === 'sv' ? `\n### Relevanta begrepp på denna sida:\n` : `\n### Relevant concepts on this page:\n`
    for (const entry of entries) {
      md += `\n**${entry.title}**: ${entry.detailed}\n`
    }
  }

  if (localizedConfig.cards && localizedConfig.cards.length > 0) {
    md += locale === 'sv' ? `\n### Synliga kort/sektioner:\n` : `\n### Visible cards/sections:\n`
    for (const card of localizedConfig.cards) {
      md += `- ${card.title}\n`
    }
  }

  return md
}
