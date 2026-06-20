/**
 * Read-only platform guidance tools for coach chat.
 */

import { tool } from 'ai'
import { z } from 'zod'

import { toolText, type CoachToolContext } from './shared'

type CaptureGuideTopic =
  | 'ALL'
  | 'TEAM_CAPTURE'
  | 'WORKOUT_EVALUATION'
  | 'GARMIN'
  | 'CONCEPT2_PM5'
  | 'WATTBIKE'
  | 'BLUETOOTH_HR'
  | 'TROUBLESHOOTING'

interface CaptureGuideSection {
  title: string
  bullets: string[]
}

interface CaptureGuide {
  success: true
  topic: CaptureGuideTopic
  title: string
  message: string
  workflow: string[]
  supportedEquipmentKeys: string[]
  captureMethods: Array<{
    method: string
    usedFor: string
    notes: string
  }>
  dataMergeRules: string[]
  limitations: string[]
  sections: CaptureGuideSection[]
  suggestedQuestions: string[]
}

export function buildTrainingCaptureGuide(
  topic: CaptureGuideTopic,
  locale: 'en' | 'sv'
): CaptureGuide {
  if (locale === 'sv') {
    return {
      success: true,
      topic,
      title: 'Team Capture, Garmin och Bluetooth-fångst',
      message: 'Här är den praktiska modellen för hur Trainomics Team Capture, Garmin och ergometerdata fungerar tillsammans.',
      workflow: [
        'Skapa passet i Cardio Studio, Hybrid Studio eller via AI-chatten med tydliga stationer och equipment keys.',
        'Öppna lagets Team Capture-sida och välj passmallen. Systemet bygger banor, rundor, stationer, vila och mottagarbehov från passet.',
        'Coach startar masterklockan för hela laget. Atleterna följer startlista/bana och behöver inte ha telefonen på sig.',
        'Stationplattor/mottagare paras med BikeErg, RowErg, SkiErg, Wattbike eller air bike och skickar maskindata till rätt bana/tidsfönster.',
        'Atleterna startar Garmin-klockan för puls, belastning och eventuell varvtid. Inomhuslöpning kan registreras via Garmin lap eller manuell split.',
        'Efter passet löser coachen eventuella byten/missade stationer i review, sedan skapas Workout Evaluation per atlet.',
      ],
      supportedEquipmentKeys: ['BIKE_ERG', 'ROW', 'SKI_ERG', 'WATTBIKE', 'ASSAULT_BIKE', 'ECHO_BIKE', 'AIR_BIKE', 'RUN', 'REST'],
      captureMethods: [
        {
          method: 'BLUETOOTH_STATION',
          usedFor: 'BikeErg, RowErg, SkiErg, Wattbike och air bikes',
          notes: 'Använd fast stationplatta/mottagare per maskin eller station när webbläsar-Bluetooth inte räcker.',
        },
        {
          method: 'GARMIN_LAP_OR_MANUAL',
          usedFor: 'Inomhuslöpning, löpsegment och andra icke-Bluetooth-stationer',
          notes: 'Garmin kan bidra med puls och lap-markeringar; coachen kan komplettera med manuell split vid behov.',
        },
        {
          method: 'REST',
          usedFor: 'Vila mellan rundor',
          notes: 'Används för HR recovery mellan rundor och för att tolka pulsfallet efter arbete.',
        },
      ],
      dataMergeRules: [
        'Samma verkliga pass ska bli en Workout Evaluation per atlet, inte flera dubbletter.',
        'Maskindata från stationmottagare används för watt, pace, kadens/stroke rate, distans och kalorier när det finns.',
        'Garmin används främst för puls, HR-zoner, belastning, HRV/sömn/stress/RHR och sena synkar efter passet.',
        'Om Garmin-data kommer efter Team Capture uppdateras evalueringen och tidslinjen matchas mot rundor/segment.',
        'Fokus-/Team Capture-timing styr segmentgränserna; Garmin-laps och maskindata används för att fylla faktisk prestation.',
      ],
      limitations: [
        'iPad/Safari har inte tillförlitligt Web Bluetooth-stöd; native station receiver eller Android/Chrome är bättre för direkt maskinfångst.',
        'En Bluetooth-mottagare kan i praktiken bara hantera ett begränsat antal stabila maskinanslutningar samtidigt.',
        'Inomhuslöpning saknar ofta exakt GPS; använd planerad distans plus Garmin lap/manuell split om inget bättre sensorsystem finns.',
        'Garmin-synk kan komma sent. Evalueringen ska därför kunna räknas om efter passet.',
      ],
      sections: localizedSections(topic, 'sv'),
      suggestedQuestions: [
        'Hur sätter jag upp 6 banor med BikeErg och rodd?',
        'Vilka stationer behöver Bluetooth-mottagare?',
        'Hur kombineras Garmin-puls med Concept2-data?',
        'Vad gör vi om någon byter bana eller en mottagare tappar kontakt?',
      ],
    }
  }

  return {
    success: true,
    topic,
    title: 'Team Capture, Garmin, and Bluetooth capture',
    message: 'Here is the practical model for how Trainomics Team Capture, Garmin, and ergometer data work together.',
    workflow: [
      'Create the workout in Cardio Studio, Hybrid Studio, or through AI chat with explicit stations and equipment keys.',
      'Open the team Team Capture page and choose the workout template. The system builds lanes, rounds, stations, rest, and receiver needs from the workout.',
      'The coach starts one master clock for the team. Athletes follow the startlist/lane plan and do not need phones during the session.',
      'Station tablets/receivers pair with BikeErg, RowErg, SkiErg, Wattbike, or air bikes and stream machine data into the right lane/time window.',
      'Athletes start Garmin watches for HR, load, and optional lap timing. Indoor run splits can come from Garmin lap or manual review.',
      'After the session, the coach fixes swaps/missing station data in review, then one Workout Evaluation is built per athlete.',
    ],
    supportedEquipmentKeys: ['BIKE_ERG', 'ROW', 'SKI_ERG', 'WATTBIKE', 'ASSAULT_BIKE', 'ECHO_BIKE', 'AIR_BIKE', 'RUN', 'REST'],
    captureMethods: [
      {
        method: 'BLUETOOTH_STATION',
        usedFor: 'BikeErg, RowErg, SkiErg, Wattbike, and air bikes',
        notes: 'Use a fixed station tablet/receiver per machine or station when browser Bluetooth is not enough.',
      },
      {
        method: 'GARMIN_LAP_OR_MANUAL',
        usedFor: 'Indoor run segments and other non-Bluetooth stations',
        notes: 'Garmin can provide HR and lap markers; the coach can add manual splits when needed.',
      },
      {
        method: 'REST',
        usedFor: 'Rest between rounds',
        notes: 'Used for HR recovery between rounds and to interpret HR drop after work.',
      },
    ],
    dataMergeRules: [
      'One real-world workout should become one Workout Evaluation per athlete, not duplicate workouts.',
      'Station receiver data is preferred for watts, pace, cadence/stroke rate, distance, and calories when available.',
      'Garmin is primarily used for HR, HR zones, load, HRV/sleep/stress/RHR, and late post-session syncs.',
      'If Garmin data arrives after Team Capture, the evaluation is recalculated and aligned to the round/segment timeline.',
      'Focus/Team Capture timing defines segment boundaries; Garmin laps and machine data fill in actual performance.',
    ],
    limitations: [
      'iPad/Safari does not provide reliable Web Bluetooth support; a native station receiver or Android/Chrome is better for direct machine capture.',
      'One Bluetooth receiver can only handle a limited number of stable machine connections at once.',
      'Indoor running often lacks exact GPS; use planned distance plus Garmin lap/manual split unless a better indoor sensor exists.',
      'Garmin sync can arrive late. Evaluations must be able to recalculate after the session.',
    ],
    sections: localizedSections(topic, 'en'),
    suggestedQuestions: [
      'How should I set up 6 lanes with BikeErg and RowErg?',
      'Which stations need Bluetooth receivers?',
      'How is Garmin HR merged with Concept2 data?',
      'What do we do if someone swaps lane or a receiver disconnects?',
    ],
  }
}

function localizedSections(topic: CaptureGuideTopic, locale: 'en' | 'sv'): CaptureGuideSection[] {
  const sections = locale === 'sv' ? svSections : enSections
  if (topic === 'ALL') return sections
  return sections.filter((section) => sectionTopics[section.title]?.includes(topic))
}

const sectionTopics: Record<string, CaptureGuideTopic[]> = {
  'Team Capture workflow': ['TEAM_CAPTURE'],
  'Workout evaluation': ['WORKOUT_EVALUATION'],
  'Garmin role': ['GARMIN'],
  'Concept2 PM5 role': ['CONCEPT2_PM5'],
  'Wattbike and air-bike role': ['WATTBIKE'],
  'Bluetooth HR belts': ['BLUETOOTH_HR'],
  'Troubleshooting': ['TROUBLESHOOTING'],
  'Team Capture-flöde': ['TEAM_CAPTURE'],
  'Workout Evaluation': ['WORKOUT_EVALUATION'],
  'Garmins roll': ['GARMIN'],
  'Concept2 PM5-roll': ['CONCEPT2_PM5'],
  'Wattbike och air bikes': ['WATTBIKE'],
  'Bluetooth-pulsband': ['BLUETOOTH_HR'],
  'Felsökning': ['TROUBLESHOOTING'],
}

const enSections: CaptureGuideSection[] = [
  {
    title: 'Team Capture workflow',
    bullets: [
      'Use Team Capture for group hybrid/interval sessions where the coach starts one shared timer.',
      'Saved Cardio and Hybrid workouts can drive the capture template automatically.',
      'AI-created workouts should use captureReady=true and explicit equipment keys so the capture page can adapt.',
      'The lane plan assigns athletes by lane, heat, round, station, and time window.',
    ],
  },
  {
    title: 'Workout evaluation',
    bullets: [
      'Completed Team Capture sessions export one sensor capture per athlete.',
      'Workout Evaluation merges Team Capture timing, station data, Garmin HR/load, focus logs, and manual corrections.',
      'The athlete Monitoring area shows HR curves, zone time, power/pace, segment compliance, HR recovery, fatigue, and source confidence.',
    ],
  },
  {
    title: 'Garmin role',
    bullets: [
      'Garmin is strongest for HR, HR zones, training load, sleep, stress, resting HR, HRV, and watch lap markers.',
      'For indoor running, ask athletes to press lap on the run segment if you want a watch-side split.',
      'Garmin data can arrive after the session; the evaluation layer should merge and recalculate when it syncs.',
    ],
  },
  {
    title: 'Concept2 PM5 role',
    bullets: [
      'Concept2 PM5 covers BikeErg, RowErg, and SkiErg station data such as watts, pace, stroke/cadence, distance, and calories.',
      'The preferred team setup is fixed station receivers, not athlete phones during the session.',
      'Station data is first attached to lane/time window, then attributed to the scheduled athlete unless the coach overrides it.',
    ],
  },
  {
    title: 'Wattbike and air-bike role',
    bullets: [
      'Wattbike and supported air-bike station data should use the same station receiver pattern as Concept2.',
      'Use equipment keys WATTBIKE, ASSAULT_BIKE, ECHO_BIKE, or AIR_BIKE in Cardio/Hybrid/AI-created workouts.',
      'If a bike has no reliable Bluetooth capture, the station can still be reviewed manually while Garmin supplies HR/load.',
    ],
  },
  {
    title: 'Bluetooth HR belts',
    bullets: [
      'Bluetooth HR belt streams are a strong live HR source when captured by a compatible receiver.',
      'For team sessions without athlete phones, Garmin watches remain the practical HR/load source in v1.',
      'When both HR belt and Garmin HR exist, the evaluation engine should prefer the higher-confidence stream for the curve.',
    ],
  },
  {
    title: 'Troubleshooting',
    bullets: [
      'If a receiver disconnects, keep the master clock running and fix the missing station in post-session review.',
      'If athletes swap lane, use the attribution override after the session.',
      'If Garmin is late, resolve station data first and recalculate evaluations after Garmin sync.',
      'If indoor run data is weak, use planned distance plus lap/manual split and be clear about source confidence.',
    ],
  },
]

const svSections: CaptureGuideSection[] = [
  {
    title: 'Team Capture-flöde',
    bullets: [
      'Använd Team Capture för lagpass där coachen startar en gemensam timer.',
      'Sparade Cardio- och Hybridpass kan automatiskt styra capture-mallen.',
      'AI-skapade pass ska använda captureReady=true och tydliga equipment keys så capture-sidan kan anpassa sig.',
      'Startlistan kopplar atlet till bana, heat, runda, station och tidsfönster.',
    ],
  },
  {
    title: 'Workout Evaluation',
    bullets: [
      'Slutförda Team Capture-pass exporterar en sensor capture per atlet.',
      'Workout Evaluation slår ihop Team Capture-timing, stationsdata, Garmin-puls/load, focus logs och manuella korrigeringar.',
      'Atletens Monitoring-vy visar pulskurva, zontid, watt/pace, segmentträff, HR recovery, fatigue och source confidence.',
    ],
  },
  {
    title: 'Garmins roll',
    bullets: [
      'Garmin är starkast för puls, pulszoner, training load, sömn, stress, vilopuls, HRV och lap-markeringar.',
      'För inomhuslöpning kan atleterna trycka lap på löpsegmentet om ni vill ha klocksplit.',
      'Garmin kan synka sent; evaluation-lagret ska slå ihop och räkna om när datan kommer.',
    ],
  },
  {
    title: 'Concept2 PM5-roll',
    bullets: [
      'Concept2 PM5 täcker BikeErg, RowErg och SkiErg med watt, pace, stroke/kadens, distans och kalorier.',
      'Bästa lagupplägget är fasta stationmottagare, inte atletens telefon under passet.',
      'Stationsdata kopplas först till bana/tidsfönster och sedan till planerad atlet om coachen inte ändrar attribution.',
    ],
  },
  {
    title: 'Wattbike och air bikes',
    bullets: [
      'Wattbike och stödda air bikes bör använda samma station receiver-mönster som Concept2.',
      'Använd equipment keys WATTBIKE, ASSAULT_BIKE, ECHO_BIKE eller AIR_BIKE i Cardio/Hybrid/AI-pass.',
      'Om cykeln saknar stabil Bluetooth kan stationen granskas manuellt medan Garmin ger puls/load.',
    ],
  },
  {
    title: 'Bluetooth-pulsband',
    bullets: [
      'Bluetooth-pulsband är en stark livepuls-källa när de fångas av kompatibel mottagare.',
      'För lagpass utan atletens telefon är Garmin-klockor den praktiska HR/load-källan i v1.',
      'När både HR-band och Garmin finns bör evaluation-motorn välja den högre confidence-strömmen för kurvan.',
    ],
  },
  {
    title: 'Felsökning',
    bullets: [
      'Om en mottagare tappar kontakt: låt masterklockan gå och korrigera stationen i review efteråt.',
      'Om spelare byter bana: använd attribution override efter passet.',
      'Om Garmin är sen: lös stationsdata först och räkna om evalueringar efter Garmin-synk.',
      'Om inomhuslöpning är svag: använd planerad distans plus lap/manuell split och var tydlig med source confidence.',
    ],
  },
]

export function createPlatformHelpTools(ctx: CoachToolContext) {
  const { locale } = ctx

  return {
    getTrainingCaptureGuide: tool({
      description: toolText(
        locale,
        'Read-only guide for explaining Trainomics Team Capture, Workout Evaluation, Garmin merge behavior, Concept2 PM5, Wattbike/air-bike Bluetooth station receivers, HR belts, source confidence, and troubleshooting. Use whenever a coach asks how capture, Garmin, Concept2, Wattbike, Bluetooth, or team hybrid sessions work.',
        'Läsverktyg som förklarar Trainomics Team Capture, Workout Evaluation, Garmin-merge, Concept2 PM5, Wattbike/air-bike Bluetooth-stationer, pulsband, source confidence och felsökning. Använd när coachen frågar hur capture, Garmin, Concept2, Wattbike, Bluetooth eller laghybridpass fungerar.'
      ),
      inputSchema: z.object({
        topic: z.enum([
          'ALL',
          'TEAM_CAPTURE',
          'WORKOUT_EVALUATION',
          'GARMIN',
          'CONCEPT2_PM5',
          'WATTBIKE',
          'BLUETOOTH_HR',
          'TROUBLESHOOTING',
        ]).default('ALL').describe('Specific capture/integration topic to explain.'),
      }),
      execute: async ({ topic }) => buildTrainingCaptureGuide(topic, locale),
    }),
  }
}
