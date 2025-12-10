/**
 * Program Generation Prompt Templates
 *
 * Sport-specific and methodology-based prompts for AI-powered program generation.
 */

import { SportType } from '@prisma/client';

// Training methodologies with descriptions
export const METHODOLOGIES = {
  POLARIZED: {
    name: 'Polarized (80/20)',
    description: '80% low intensity (Zone 1-2), 20% high intensity (Zone 4-5). Minimal Zone 3.',
    keyPrinciples: [
      'Most training at very easy conversational pace',
      'Hard sessions are truly hard (VO2max or above)',
      'Avoid "gray zone" moderate intensity',
      'Recovery is built into the easy days'
    ]
  },
  NORWEGIAN: {
    name: 'Norwegian Double Threshold',
    description: 'Two threshold sessions per week with lactate monitoring. High volume approach.',
    keyPrinciples: [
      'Two lactate threshold sessions weekly',
      'Sessions at 2-4 mmol/L lactate',
      'Requires lactate monitoring',
      'High total training volume',
      'Long intervals (8-16 min) at threshold'
    ]
  },
  CANOVA: {
    name: 'Canova Method',
    description: 'Marathon-specific preparation with progressive race-pace work.',
    keyPrinciples: [
      'Gradual progression to race-specific work',
      'Long runs with progressive pace increase',
      'Marathon pace as key reference point',
      'Special blocks for specific preparation',
      'Fundamental → Progressive → Specific phases'
    ]
  },
  PYRAMIDAL: {
    name: 'Pyramidal Distribution',
    description: '70% Zone 1, 20% Zone 2-3, 10% Zone 4-5. More threshold work than polarized.',
    keyPrinciples: [
      'More tempo/threshold work than polarized',
      'Gradual intensity progression',
      'Good for runners who respond to steady-state work',
      'Structured build-up through training zones'
    ]
  }
} as const;

// Sport-specific prompt sections
export const SPORT_PROMPTS: Record<SportType, {
  systemContext: string;
  zoneGuidance: string;
  sessionTypes: string[];
  periodizationNotes: string;
}> = {
  RUNNING: {
    systemContext: `Du skapar löpprogram för uthållighetsidrottare.

NYCKELPRINCIPER FÖR LÖPNING:
- Träningszoner baserade på laktattröskel eller VDOT
- Progressiv överbelastning med 10% ökning per vecka max
- Återhämtning är lika viktigt som belastning
- Varierad terräng och underlag för skadeprevention
- Styrketräning 2x/vecka för löpare`,
    zoneGuidance: `LÖPZONER (baserat på laktattest eller VDOT):
- Zon 1 (Återhämtning): <75% maxHR, lätt jogg, samtalstempo
- Zon 2 (Aerob bas): 75-85% maxHR, grundträning
- Zon 3 (Tempo): 85-90% maxHR, "comfortably hard"
- Zon 4 (Tröskel/LT2): 90-95% maxHR, tävlingstakt för längre distanser
- Zon 5 (VO2max): 95-100% maxHR, intervaller 3-5 min`,
    sessionTypes: [
      'Långpass (90-150 min, Zon 1-2)',
      'Tempopass (20-40 min i Zon 3)',
      'Tröskelintervaller (4-6 x 5-8 min i Zon 4)',
      'VO2max-intervaller (5-8 x 3-4 min i Zon 5)',
      'Fartlek (varierad intensitet)',
      'Backintervaller (kort och explosivt)',
      'Återhämtningspass (30-45 min, Zon 1)'
    ],
    periodizationNotes: `PERIODISERING LÖPNING:
- Basperiod (8-12 veckor): Bygg aerob kapacitet, 80% Zon 1-2
- Byggperiod (6-8 veckor): Introducera tempo och tröskelhöjande pass
- Tävlingsspecifik (4-6 veckor): Race-pace work, specifika intervaller
- Taper (1-3 veckor): Minska volym 40-60%, behåll intensitet
- Återhämtning (1-2 veckor): Endast lätt träning efter tävling`
  },

  CYCLING: {
    systemContext: `Du skapar cykelprogram baserat på FTP (Functional Threshold Power).

NYCKELPRINCIPER FÖR CYKLING:
- FTP är central för alla zonberäkningar
- Watt/kg viktigt för backprestanda
- Kadensvariation för olika anpassningar
- Indoor/outdoor balans
- Aerodynamik för tempoträning`,
    zoneGuidance: `CYKELZONER (baserat på FTP):
- Zon 1 (Återhämtning): <55% FTP
- Zon 2 (Uthållighet): 56-75% FTP
- Zon 3 (Tempo): 76-90% FTP
- Zon 4 (Tröskel): 91-105% FTP
- Zon 5 (VO2max): 106-120% FTP
- Zon 6 (Anaerobisk kapacitet): >120% FTP
- Zon 7 (Neuromuscular): Max effort sprints`,
    sessionTypes: [
      'Uthållighetspass (2-4 tim, Zon 2)',
      'Sweet Spot (2 x 20 min, 88-93% FTP)',
      'Tröskelintervaller (3-4 x 10-15 min, 95-105% FTP)',
      'VO2max-intervaller (5-6 x 3-5 min, 106-120% FTP)',
      'Over-unders (alternerande 95% och 105% FTP)',
      'Sprintintervaller (8-12 x 20-30 sek)',
      'Backrep (10-20 min klättring i Zon 4)'
    ],
    periodizationNotes: `PERIODISERING CYKLING:
- Basperiod: Volymfokus, Zon 2, teknikövningar
- Byggperiod: Sweet spot och tröskelarbete
- Tävlingsspecifik: Race-simuleringar, VO2max-arbete
- Taper: Minska volym, behåll korta intensiva pass
- Off-season: Cross-training, styrka, rörlighet`
  },

  SWIMMING: {
    systemContext: `Du skapar simprogram baserat på CSS (Critical Swim Speed).

NYCKELPRINCIPER FÖR SIMNING:
- CSS är tröskeltemot för simning
- Teknik är avgörande för effektivitet
- Drill-arbete varje pass
- Varierad simsätt för balans
- Landträning kompletterar vattenträning`,
    zoneGuidance: `SIMZONER (baserat på CSS):
- CSS-6 (Återhämtning): CSS + 12-15 sek/100m
- CSS-5 (Uthållighet): CSS + 8-12 sek/100m
- CSS-4 (Tempo): CSS + 4-8 sek/100m
- CSS-3 (Tröskel): CSS-tempo
- CSS-2 (VO2max): CSS - 3-5 sek/100m
- CSS-1 (Sprint): All-out, max effort`,
    sessionTypes: [
      'Uthållighetspass (2500-4000m, CSS-5/6)',
      'Tröskelset (10 x 100m på CSS-tempo)',
      'VO2max-set (5 x 200m, CSS-2)',
      'Sprintträning (20 x 25m, full fart)',
      'Teknik/Drill-pass (fokus på effektivitet)',
      'Pull/Paddles-pass (överkroppsstyrka)',
      'Kickset (benarbete och kondition)'
    ],
    periodizationNotes: `PERIODISERING SIMNING:
- Basperiod: Teknik, volym, aerob grund
- Byggperiod: Gradvis ökad intensitet, race-pace introduktion
- Tävlingsspecifik: Distansspecifik träning, starts, vändningar
- Taper: Kort, intensiv träning, vila inför tävling`
  },

  TRIATHLON: {
    systemContext: `Du skapar triathlonprogram som balanserar tre discipliner.

NYCKELPRINCIPER FÖR TRIATHLON:
- Balans mellan sim/cykel/löp
- "Brick"-pass (cykel→löp övergång)
- Prioritera svagaste disciplin
- Undvik överträning - tre sporter = mer stress
- Tävlingsspecifik träning viktigt`,
    zoneGuidance: `TRIATHLON TRÄNINGSZONER:
- Använd disciplinspecifika zoner (CSS, FTP, VDOT)
- Brick-sessions tränar övergångar
- Fokusera på race-pace för måldistans
- Olympic: Mer intensitet
- Ironman: Mer uthållighet och nutrition`,
    sessionTypes: [
      'Brick-pass (cykel→löp)',
      'Open Water Sim (om möjligt)',
      'Race-pace sim/cykel/löp',
      'Kombinerade styrkepass',
      'Övergångsträning (T1/T2)',
      'Lång cykel med löp efter',
      'Teknikfokuserade pass alla tre'
    ],
    periodizationNotes: `PERIODISERING TRIATHLON:
- Off-season: Styrka, teknik, basuthållighet
- Basperiod: Bygg volym gradvis i alla tre
- Byggperiod: Introducera brick-sessions och intensitet
- Tävlingsspecifik: Race-pace, övergångar, mental förberedelse
- Taper: 2-3 veckor beroende på distans`
  },

  HYROX: {
    systemContext: `Du skapar HYROX-program som kombinerar löpning och funktionella stationer.

NYCKELPRINCIPER FÖR HYROX:
- 8 x 1km löpning + 8 funktionella stationer
- Balans mellan löpkondition och stationsstyrka
- Övergångseffektivitet är avgörande
- Race-pace träning viktig
- Grip-uthållighet kritisk för senare stationer`,
    zoneGuidance: `HYROX TRÄNINGSFOKUS:
- Löpning: Race-pace ~85% maxHR
- Stationer: Effektivt tempo, inte max
- Övergångar: Snabb återhämtning
- Pacing: Jämnt tempo genom hela racet`,
    sessionTypes: [
      'HYROX-simulering (alla stationer)',
      'Station-specifik träning',
      '8 x 1km intervaller på race-pace',
      'Sled/SkiErg/RowErg kondition',
      'Grip-uthållighet (farmers walks, dead hangs)',
      'Wall Ball + Burpee Broad Jump combo',
      'Löp-station-löp brick-sessions'
    ],
    periodizationNotes: `PERIODISERING HYROX:
- Basperiod: Aerob löpkapacitet + grundstyrka
- Byggperiod: Stationsspecifik styrka och uthållighet
- Tävlingsspecifik: Race-simuleringar, pacing-strategi
- Taper: Minska volym, behåll stationsbekantskap
- Stationsprioritet: Sled Push, Wall Balls, Rowing (ofta limiters)`
  },

  SKIING: {
    systemContext: `Du skapar skidprogram för längdskidåkning (klassisk/fristil).

NYCKELPRINCIPER FÖR LÄNGDSKIDOR:
- Teknik avgörande för effektivitet
- Dubbelstakning = kraftkälla
- Terränganpassning
- Rullskidor för barmarkssäsong
- Styrka i överkropp och core kritiskt`,
    zoneGuidance: `SKIDÅKNINGSZONER:
- Zon 1-2: Lugn skidåkning, teknikfokus
- Zon 3: Distansintervaller
- Zon 4: Tröskelintervaller
- Zon 5: Sprintintervaller
- Tekniksessioner: Isolerade moment`,
    sessionTypes: [
      'Distanspass (klassisk/fristil)',
      'Dubbelstakningsintervaller',
      'Sprintträning (korta intervaller)',
      'Teknikdrill (isolerade moment)',
      'Rullskidpass (barmark)',
      'Skogslöpning med stavar',
      'Backlöpning (specifik styrka)'
    ],
    periodizationNotes: `PERIODISERING SKIDOR:
- Vår: Återhämtning, grundstyrka
- Sommar: Rullskidor, löpning, cykling
- Höst: Snöcamp, intensifiering
- Vinter: Tävlingssäsong
- Dubbelstakning: År-runt prioritet`
  },

  GENERAL_FITNESS: {
    systemContext: `Du skapar generella konditions- och hälsoprogram med integrerad kostplanering.

NYCKELPRINCIPER FÖR ALLMÄN FITNESS:
- Balans mellan styrka och kondition
- Hållbar livsstil i fokus
- Progressiv överbelastning
- Rörlighet och rörelse
- Anpassat till livssituation

NÄRINGSPRINCIPER:
- Kaloribalans är nyckeln till viktförändring
- Protein: 1.6-2.2g/kg för muskeluppbyggnad, 1.2-1.6g/kg för viktnedgång
- 7700 kcal = 1 kg kroppsvikt (teoretiskt)
- Max 0.5-1 kg viktnedgång per vecka för hållbarhet
- Mätning med bioimpedans ger bättre precision än endast BMI`,
    zoneGuidance: `GENERELL TRÄNING:
- Lätt: Kan prata bekvämt
- Måttlig: Kan prata men ansträngt
- Intensiv: Svårt att prata
- Styrka: RPE 6-8 för hypertrofi
- HIIT: Korta burst med vila

NÄRINGSREKOMMENDATIONER:
- Viktnedgång: TDEE minus 300-500 kcal, hög protein
- Muskeluppbyggnad: TDEE plus 200-400 kcal, hög protein
- Bibehåll: Balanserad kost vid TDEE
- Timing: Protein vid varje måltid (20-40g)`,
    sessionTypes: [
      'Konditionspass (30-45 min, lätt-måttlig)',
      'Styrketräning (helbody eller split)',
      'HIIT-session (20-30 min)',
      'Rörlighetspass (yoga/stretching)',
      'Aktiv återhämtning (promenad, lätt sim)',
      'Cirkelträning (styrka + kondition)',
      'Sportaktivitet (valfri sport för variation)'
    ],
    periodizationNotes: `PROGRESSION ALLMÄN FITNESS:
- Vecka 1-4: Etablera vana, grundteknik, kostloggning
- Vecka 5-8: Öka volym gradvis, justera kalorier
- Vecka 9-12: Introducera intensitet, optimera makros
- Underhållsfas: Bibehåll med variation
- Deload: Var 4-6 vecka, minska belastning`
  },

  STRENGTH: {
    systemContext: `Du skapar styrketräningsprogram med fokus på periodisering och progression.

NYCKELPRINCIPER FÖR STYRKETRÄNING:
- 5-fas periodisering: AA → Max Strength → Power → Maintenance → Taper
- 1RM-estimation utan maxtest (Epley/Brzycki)
- 2-for-2 progression: 2+ extra reps i 2 sessioner = öka belastning 5-10%
- Deload var 4-6 vecka (40-50% volymreduktion)
- 84-övningsbibliotek med biomechanisk balans`,
    zoneGuidance: `STYRKEZONER (baserat på 1RM):
- Anatomisk Anpassning (AA): 60-70% 1RM, 12-15 reps, 2-3 set
- Hypertrofi: 70-80% 1RM, 8-12 reps, 3-4 set
- Max Styrka: 80-90% 1RM, 4-6 reps, 4-5 set
- Power: 50-70% 1RM, 3-5 reps explosivt, 3-5 set
- Underhåll: 70-85% 1RM, 6-8 reps, 2-3 set`,
    sessionTypes: [
      'Helbody (3x/vecka för nybörjare)',
      'Upper/Lower Split (4x/vecka)',
      'Push/Pull/Legs (6x/vecka avancerad)',
      'Plyometrisk träning (60-300 kontakter)',
      'Core-stabilitet (plank, pallof press, dead bug)',
      'Unilateralt arbete (Bulgarian split squat, lunges)',
      'Deload-pass (minska volym 40-50%)'
    ],
    periodizationNotes: `PERIODISERING STYRKA (Bompa & Haff):
- AA-fas (4-6 veckor): Grundläggande teknik och anpassning
- Max Strength-fas (6-8 veckor): Progressiv överbelastning
- Power-fas (3-4 veckor): Explosivitet och specifik kraft
- Underhållsfas (4-24 veckor): Bibehåll styrka under tävlingssäsong
- Taper-fas (1-2 veckor): Minska volym inför tävling

BIOMECHANISK BALANS:
- Posterior Chain (RDL, Nordic Hamstring)
- Knee Dominance (Squat varianter)
- Unilateral (Lunges, Step-ups)
- Foot/Ankle (Calf raises)
- Core (Stabilitet)
- Upper Body (Push/Pull)`
  }
};

// Prompt for generating a full training program
export function generateProgramPrompt(
  sport: SportType,
  methodology?: keyof typeof METHODOLOGIES,
  programWeeks?: number,
  goalDescription?: string
): string {
  const sportInfo = SPORT_PROMPTS[sport];
  const methodInfo = methodology ? METHODOLOGIES[methodology] : null;

  let prompt = `## UPPGIFT: SKAPA TRÄNINGSPROGRAM

Du ska skapa ett strukturerat träningsprogram för en atlet.

${sportInfo.systemContext}

${sportInfo.zoneGuidance}

### SESSIONSTYPER ATT ANVÄNDA:
${sportInfo.sessionTypes.map(s => `- ${s}`).join('\n')}

${sportInfo.periodizationNotes}
`;

  if (methodInfo) {
    prompt += `
### TRÄNINGSMETODIK: ${methodInfo.name}
${methodInfo.description}

NYCKELPRINCIPER:
${methodInfo.keyPrinciples.map(p => `- ${p}`).join('\n')}
`;
  }

  if (programWeeks) {
    prompt += `
### PROGRAMLÄNGD: ${programWeeks} veckor
`;
  }

  if (goalDescription) {
    prompt += `
### ATLETENS MÅL:
${goalDescription}
`;
  }

  prompt += `
### OUTPUT FORMAT

Strukturera programmet som JSON med följande format:

\`\`\`json
{
  "name": "Programnamn",
  "description": "Kort beskrivning",
  "totalWeeks": 12,
  "methodology": "POLARIZED",
  "weeklySchedule": {
    "sessionsPerWeek": 5,
    "restDays": [0, 3]  // 0=måndag, 6=söndag
  },
  "phases": [
    {
      "name": "Basperiod",
      "weeks": "1-4",
      "focus": "Aerob bas och teknik",
      "weeklyTemplate": {
        "monday": { "type": "REST", "description": "Vila" },
        "tuesday": {
          "type": "RUNNING",
          "name": "Grundträning",
          "duration": 60,
          "zone": "2",
          "description": "Lugn löpning i Zon 2"
        },
        // ... fler dagar
      }
    }
  ],
  "notes": "Generella kommentarer om programmet"
}
\`\`\`

Var specifik med tider, distanser, intensiteter och zonhänvisningar.
Anpassa efter atletens nivå och tillgängliga tid.
`;

  return prompt;
}

// Prompt for modifying an existing program
export function modifyProgramPrompt(
  modification: string,
  currentWeekSummary: string
): string {
  return `## UPPGIFT: MODIFIERA TRÄNINGSPROGRAM

Du ska modifiera ett befintligt träningsprogram baserat på coachens instruktion.

### NUVARANDE VECKA:
${currentWeekSummary}

### ÖNSKAD ÄNDRING:
${modification}

### INSTRUKTIONER:
1. Behåll programmets övergripande struktur
2. Gör den begärda ändringen på ett fysiologiskt korrekt sätt
3. Justera angränsande pass om nödvändigt för balans
4. Förklara kort varför du gjort de specifika ändringarna

### OUTPUT FORMAT:
Returnera den modifierade veckan i samma JSON-format som ovan, plus en kort förklaring.
`;
}

// Quick workout suggestion prompt
export function quickWorkoutPrompt(
  sport: SportType,
  duration: number,
  intensity: 'easy' | 'moderate' | 'hard',
  constraints?: string
): string {
  const sportInfo = SPORT_PROMPTS[sport];

  return `## SNABBPASS: ${sport}

Skapa ett ${duration}-minuters ${intensity === 'easy' ? 'lätt' : intensity === 'moderate' ? 'medel' : 'hårt'} pass.

${sportInfo.sessionTypes.slice(0, 4).map(s => `- ${s}`).join('\n')}

${constraints ? `Begränsningar: ${constraints}` : ''}

Returnera passet i format:
\`\`\`json
{
  "name": "Passnamn",
  "duration": ${duration},
  "warmup": { "duration": 10, "description": "..." },
  "main": { "duration": ${duration - 20}, "description": "...", "intervals": [] },
  "cooldown": { "duration": 10, "description": "..." },
  "targetZone": "2",
  "equipment": []
}
\`\`\`
`;
}

// Injury-aware modification prompt
export function injuryModificationPrompt(
  injuryType: string,
  painLevel: number,
  originalWorkout: string
): string {
  return `## SKADEANPASSNING

En atlet har rapporterat:
- Skadetyp: ${injuryType}
- Smärtnivå: ${painLevel}/10

Originalpass:
${originalWorkout}

### UNIVERSITY OF DELAWARE SMÄRTREGLER:
- Smärta >5: Vila eller endast cross-training
- Smärta 3-5: Modifierad träning med 50% reduktion
- Smärta <3: Försiktig progression tillbaka

### UPPGIFT:
Anpassa passet enligt smärtnivån. Om smärta >5, föreslå ett alternativt cross-training pass.

Returnera det modifierade passet i JSON-format med förklaring.
`;
}

export type ProgramPromptOptions = {
  sport: SportType;
  methodology?: keyof typeof METHODOLOGIES;
  programWeeks?: number;
  goalDescription?: string;
};
