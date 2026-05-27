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

type SportPromptLocale = 'en' | 'sv';

type SportPromptSection = {
  systemContext: string;
  zoneGuidance: string;
  sessionTypes: string[];
  periodizationNotes: string;
};

// Sport-specific prompt sections
export const SPORT_PROMPTS: Record<SportType, SportPromptSection> = {
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
  },

  FUNCTIONAL_FITNESS: {
    systemContext: `Du skapar funktionell fitness-program med fokus på CrossFit-liknande träning.

NYCKELPRINCIPER FÖR FUNKTIONELL FITNESS:
- Konstant varierat, funktionellt, utfört med hög intensitet
- Blandning av gymnastik, olympiska lyft och metabolisk kondition
- Periodisering av skills och styrka
- Balans mellan push/pull, övre/underkropp
- Teknik före belastning, särskilt i olympiska lyft
- Benchmark-workouts för att mäta framsteg`,
    zoneGuidance: `TRÄNINGSFOKUS:
- Styrka: Grundläggande lyft (squat, deadlift, press)
- Olympiska lyft: Clean, snatch, jerk
- Gymnastik: Pull-ups, muscle-ups, HSPU, T2B
- Metabolisk kondition: WODs, intervaller
- Skills: Double-unders, rope climbs, handstands

INTENSITET:
- Styrkepass: 70-90% 1RM, 3-5 reps
- WODs: Skalad för att hålla hög intensitet
- Skills: Tekniskt fokus, inte tidspressad`,
    sessionTypes: [
      'WOD (For Time, AMRAP, EMOM)',
      'Styrkepass (Back Squat, Deadlift, Press)',
      'Olympiska lyftpass (Clean, Snatch, Jerk)',
      'Gymnastik-skills (Pull-ups, HSPU, Muscle-ups)',
      'Metabolisk kondition (Assault Bike, Row, SkiErg)',
      'Benchmark (Fran, Grace, Murph)',
      'Active Recovery (Mobilitet, lätt cardio)'
    ],
    periodizationNotes: `PERIODISERING FUNKTIONELL FITNESS:
- Vecka 1-4: Grundteknik, volymuppbyggnad
- Vecka 5-8: Progressiv styrkeökning, skill-utveckling
- Vecka 9-12: Intensifiering, test av benchmarks
- Deload var 4-5 vecka
- Skills: Öva dagligen innan WOD
- Olympiska lyft: Teknikfokus 2-3x/vecka`
  },

  TEAM_FOOTBALL: {
    systemContext: `Du skapar träningsprogram för fotbollsspelare.

NYCKELPRINCIPER FÖR FOTBOLL:
- Matchdagsperiodisering (MD+/MD-)
- Explosivitet och sprintkapacitet
- Aerob och anaerob uthållighet
- Förebyggande av hamstringsskador
- Teknisk träning integrerad med kondition`,
    zoneGuidance: `INTENSITETSZONER FOTBOLL:
- Återhämtning: <70% maxHR, aktiv återhämtning
- Aerob bas: 70-80% maxHR, längre pass
- Tempo: 80-88% maxHR, spelformationer
- Hög intensitet: 88-95% maxHR, spelmoment
- Sprint: >95% maxHR, explosiva moment`,
    sessionTypes: [
      'Taktikträning (spelmoment med bollar)',
      'Konditionspass (smålagsspel 4v4-8v8)',
      'Sprintträning (10-40m intervaller)',
      'Styrketräning (explosivitet focus)',
      'Återhämtningspass (lätt jogg/pool)',
      'Teknikträning (bollkontroll)',
      'Matchförberedelse (taktik genomgång)'
    ],
    periodizationNotes: `PERIODISERING FOTBOLL:
- Försäsong (4-6 veckor): Bygg aerob bas och styrka
- Tävlingssäsong: MD-baserad veckoplanering
- MD-3/MD-4: Högintensiva pass
- MD-2: Reducerad volym, taktik
- MD-1: Lätt aktivering
- MD+1: Aktiv återhämtning
- Uppehåll: Underhållsträning`
  },

  TEAM_ICE_HOCKEY: {
    systemContext: `Du skapar träningsprogram för ishockeyspelare.

NYCKELPRINCIPER FÖR ISHOCKEY:
- Intervallbaserad sport (40-60 sek byten)
- Explosiv kraft och acceleration
- Återhämtning mellan byten
- Skadeförebyggande (höft, ljumske)
- On-ice och off-ice balans`,
    zoneGuidance: `INTENSITETSZONER ISHOCKEY:
- Återhämtning: Lätt skridsko, <70% maxHR
- Aerob bas: 70-80% maxHR, längre intervaller
- Tröskelnivå: 80-90% maxHR, 30-60 sek arbete
- Anaerob: 90-95% maxHR, bytessimuleringar
- Max: >95% maxHR, explosiva spurter`,
    sessionTypes: [
      'On-ice intervaller (30/30 sek arbete/vila)',
      'Off-ice kondition (cykel, löpning)',
      'Explosiv styrka (power cleans, box jumps)',
      'Skridskospecifik styrka (sidosteg)',
      'Återhämtning (pool, stretching)',
      'Teknikträning (stickhandling)',
      'Spelmoment (powerplay, boxplay)'
    ],
    periodizationNotes: `PERIODISERING ISHOCKEY:
- Off-season: Aerob bas, styrka, rörlighet
- Pre-season: Sport-specifik kondition, explosivitet
- In-season: Underhåll, matchfokus
- Matchdag: Aktivering, taktik
- Playoff: Reducerad volym, hög intensitet`
  },

  TEAM_HANDBALL: {
    systemContext: `Du skapar träningsprogram för handbollsspelare.

NYCKELPRINCIPER FÖR HANDBOLL:
- Intermittent högintensiv sport
- Kast- och hoppkraft
- Snabba riktningsförändringar
- Axel- och knäförebyggande
- Taktisk spelförståelse`,
    zoneGuidance: `INTENSITETSZONER HANDBOLL:
- Återhämtning: <70% maxHR, lätt aktivitet
- Aerob: 70-80% maxHR, uthållighetsträning
- Tempo: 80-88% maxHR, spelformer
- Anspel: 88-95% maxHR, intensiva moment
- Max: >95% maxHR, sprinter och hopp`,
    sessionTypes: [
      'Spelformationer (6v6, 5v5)',
      'Konditionsträning (intervaller)',
      'Styrketräning (överkropp, kast)',
      'Hoppträning (plyometrics)',
      'Teknikträning (skott, passningar)',
      'Taktikpass (försvar, anfall)',
      'Återhämtningspass (lätt aktivitet)'
    ],
    periodizationNotes: `PERIODISERING HANDBOLL:
- Försäsong: Bygg kondition och styrka
- Uppbyggnad: Sport-specifik träning
- Tävlingssäsong: Matchbaserad planering
- Matchvecka: Reducera volym mot match
- Återhämtning: Aktiv vila efter match`
  },

  TEAM_FLOORBALL: {
    systemContext: `Du skapar träningsprogram för innebandyspelare.

NYCKELPRINCIPER FÖR INNEBANDY:
- Intervallsport med snabba byten
- Sprintkapacitet och acceleration
- Låg kroppsvikt, hög explosivitet
- Rörlighet i höft och rygg
- Teknik med klubba och boll`,
    zoneGuidance: `INTENSITETSZONER INNEBANDY:
- Återhämtning: <70% maxHR, lätt löpning
- Aerob bas: 70-80% maxHR, grundkondition
- Tempo: 80-88% maxHR, spelformer
- Hög intensitet: 88-95% maxHR, spelmoment
- Sprint: >95% maxHR, explosiva byten`,
    sessionTypes: [
      'Spelträning (olika formationer)',
      'Intervallöpning (20-40 sek)',
      'Styrketräning (benexplosivitet)',
      'Teknikpass (bollkontroll, skott)',
      'Snabbhetsträning (reaktion, acceleration)',
      'Taktikträning (positioner)',
      'Återhämtning (stretching, pool)'
    ],
    periodizationNotes: `PERIODISERING INNEBANDY:
- Sommarträning: Aerob bas, styrka
- Försäsong: Sport-specifik kondition
- Säsong: Matchanpassad träning
- Matchvecka: Minska volym mot match
- Återhämtning: Vila och underhåll`
  },

  TEAM_BASKETBALL: {
    systemContext: `Du skapar träningsprogram för basketspelare.

NYCKELPRINCIPER FÖR BASKET:
- Explosiv vertikal hopp- och sprintkraft
- Snabba riktningsändringar och sidorörelse
- Aerob och anaerob uthållighet
- Handkoordination och skotteknik
- Förebyggande av fotleds- och knäskador`,
    zoneGuidance: `INTENSITETSZONER BASKET:
- Återhämtning: <70% maxHR, lätt aktivitet
- Aerob bas: 70-80% maxHR, grundkondition
- Tempo: 80-88% maxHR, spelövningar
- Hög intensitet: 88-95% maxHR, intensiva drills
- Max: >95% maxHR, sprinter och hopp`,
    sessionTypes: [
      'Spelträning (5v5, 3v3)',
      'Skottträning (olika positioner)',
      'Agility och sidorörelse',
      'Vertikalt hoppträning (plyometrics)',
      'Styrketräning (ben, core)',
      'Konditionsintervaller (suicides, court sprints)',
      'Återhämtning (stretching, foam rolling)'
    ],
    periodizationNotes: `PERIODISERING BASKET:
- Off-season: Styrka, explosivitet, teknik
- Pre-season: Spelformsuppbyggnad
- In-season: Matchfokus, underhåll
- Matchvecka: Reducera volym mot match
- Playoff: Hög intensitet, optimal återhämtning`
  },

  TEAM_VOLLEYBALL: {
    systemContext: `Du skapar träningsprogram för volleybollspelare.

NYCKELPRINCIPER FÖR VOLLEYBOLL:
- Explosiv vertikalkraft för hopp och block
- Snabb reaktionsförmåga
- Axel- och skulderstyrka för slag
- Landningsteknik för knäskydd
- Sidorörelse och footwork`,
    zoneGuidance: `INTENSITETSZONER VOLLEYBOLL:
- Återhämtning: <70% maxHR, lätt aktivitet
- Aerob bas: 70-80% maxHR, allmän kondition
- Tempo: 80-88% maxHR, tekniska övningar
- Hög intensitet: 88-95% maxHR, intensiva drills
- Max: >95% maxHR, explosiva hopp och slag`,
    sessionTypes: [
      'Spelträning (6v6, rotation)',
      'Serve- och mottagningsträning',
      'Blockträning och nätspel',
      'Plyometrisk hoppträning',
      'Styrketräning (axlar, ben, core)',
      'Agility och reaktionsövningar',
      'Återhämtning (stretching, axelrörlighet)'
    ],
    periodizationNotes: `PERIODISERING VOLLEYBOLL:
- Off-season: Grundstyrka, explosivitet
- Pre-season: Teknisk finslipning, spelform
- In-season: Matchförberedelse, underhåll
- Matchvecka: Taktik, lätt aktivering
- Återhämtning: Vila efter intensiva perioder`
  },

  TENNIS: {
    systemContext: `Du skapar träningsprogram för tennisspelare.

NYCKELPRINCIPER FÖR TENNIS:
- Explosiv rörelse och snabba riktningsändringar
- Axel- och armbågsprevention
- Core-stabilitet för rotation
- Aerob och anaerob uthållighet
- Mental uthållighet för långa matcher`,
    zoneGuidance: `INTENSITETSZONER TENNIS:
- Återhämtning: <70% maxHR, lätt aktivitet
- Aerob bas: 70-80% maxHR, grundkondition
- Tempo: 80-88% maxHR, rallys och drills
- Hög intensitet: 88-95% maxHR, intensiva poäng
- Max: >95% maxHR, explosiva sprinter`,
    sessionTypes: [
      'Teknisk träning (slag, serve)',
      'Matchträning och taktik',
      'Footwork och rörelseövningar',
      'Intervallträning (on-court drills)',
      'Styrketräning (rotationsövningar)',
      'Konditionsträning (löpning, cykling)',
      'Återhämtning (stretching, axelrörlighet)'
    ],
    periodizationNotes: `PERIODISERING TENNIS:
- Off-season: Styrka, konditionsbas, teknikutveckling
- Pre-season: Tävlingsförberedelse, matchhärdning
- In-season: Matchperiodisering, underhåll
- Mellan turneringar: Återhämtning och specifik träning
- Taper: Reducera volym inför viktiga turneringar`
  },

  PADEL: {
    systemContext: `Du skapar träningsprogram för padelspelare.

NYCKELPRINCIPER FÖR PADEL:
- Explosiva sidorörelser och riktningsändringar
- Reaktionssnabbhet och anticipation
- Axel- och armbågsprevention
- Uthållighet för långa matcher
- Väggspel och positionering`,
    zoneGuidance: `INTENSITETSZONER PADEL:
- Återhämtning: <70% maxHR, lätt aktivitet
- Aerob bas: 70-80% maxHR, grundkondition
- Tempo: 80-88% maxHR, rallys och poängspel
- Hög intensitet: 88-95% maxHR, intensiva byten
- Max: >95% maxHR, explosiva reaktioner`,
    sessionTypes: [
      'Teknisk träning (slag, volleys, väggspel)',
      'Matchträning och taktik',
      'Footwork och sidorörelse',
      'Reaktionsträning',
      'Styrketräning (core, ben, axlar)',
      'Konditionsintervaller',
      'Återhämtning (stretching, mobilitet)'
    ],
    periodizationNotes: `PERIODISERING PADEL:
- Off-season: Styrka, rörlighet, teknikutveckling
- Pre-season: Spelformsuppbyggnad, matchhärdning
- In-season: Matchfokus, underhållsträning
- Mellan turneringar: Återhämtning och specifik träning
- Viktiga turneringar: Taper och mental förberedelse`
  },
  NUTRITION: {
    systemContext: `Du ger kostråd och näringscoaching.

NYCKELPRINCIPER FÖR KOST:
- Energibalans anpassad efter mål (viktnedgång, viktökning, underhåll)
- Makrofördelning baserad på aktivitetsnivå och mål
- Måltidstiming och frekvens
- Mikronutrienter och kostfiber
- Hållbara kostvanor framför extrema dieter`,
    zoneGuidance: `NÄRINGSRIKTLINJER:
- Protein: 1.6-2.2g/kg kroppsvikt beroende på mål
- Kolhydrater: Anpassat efter aktivitetsnivå
- Fett: 0.8-1.2g/kg kroppsvikt minimum
- Fiber: 25-35g per dag
- Vätska: 30-40ml/kg kroppsvikt`,
    sessionTypes: [
      'Måltidsplanering',
      'Makrospårning',
      'Kostanalys',
      'Matlagning och mealprep',
    ],
    periodizationNotes: `KOSTPERIODISERING:
- Viktnedgång: Måttligt kaloriunderskott (300-500 kcal/dag)
- Viktökning: Överskott med fokus på protein
- Underhåll: Balanserat energiintag
- Body recomp: Högt protein med cyklat energiintag`
  }
};

export const SPORT_PROMPTS_EN: Record<SportType, SportPromptSection> = {
  RUNNING: {
    systemContext: `You create running programs for endurance athletes.

KEY PRINCIPLES FOR RUNNING:
- Training zones based on lactate threshold or VDOT
- Progressive overload with a maximum 10% weekly increase
- Recovery is as important as workload
- Varied terrain and surfaces for injury prevention
- Strength training twice per week for runners`,
    zoneGuidance: `RUNNING ZONES (based on lactate test or VDOT):
- Zone 1 (Recovery): <75% maxHR, easy jog, conversational pace
- Zone 2 (Aerobic base): 75-85% maxHR, base training
- Zone 3 (Tempo): 85-90% maxHR, comfortably hard
- Zone 4 (Threshold/LT2): 90-95% maxHR, race pace for longer distances
- Zone 5 (VO2max): 95-100% maxHR, 3-5 minute intervals`,
    sessionTypes: [
      'Long run (90-150 min, Zone 1-2)',
      'Tempo run (20-40 min in Zone 3)',
      'Threshold intervals (4-6 x 5-8 min in Zone 4)',
      'VO2max intervals (5-8 x 3-4 min in Zone 5)',
      'Fartlek (varied intensity)',
      'Hill intervals (short and explosive)',
      'Recovery run (30-45 min, Zone 1)',
    ],
    periodizationNotes: `RUNNING PERIODIZATION:
- Base phase (8-12 weeks): Build aerobic capacity, 80% Zone 1-2
- Build phase (6-8 weeks): Introduce tempo and threshold-developing sessions
- Race-specific phase (4-6 weeks): Race-pace work and specific intervals
- Taper (1-3 weeks): Reduce volume 40-60%, maintain intensity
- Recovery (1-2 weeks): Easy training only after racing`,
  },
  CYCLING: {
    systemContext: `You create cycling programs based on FTP (Functional Threshold Power).

KEY PRINCIPLES FOR CYCLING:
- FTP is central for all zone calculations
- Watts per kilogram matters for climbing performance
- Cadence variation drives different adaptations
- Balance indoor and outdoor work
- Aerodynamics matter for time-trial training`,
    zoneGuidance: `CYCLING ZONES (based on FTP):
- Zone 1 (Recovery): <55% FTP
- Zone 2 (Endurance): 56-75% FTP
- Zone 3 (Tempo): 76-90% FTP
- Zone 4 (Threshold): 91-105% FTP
- Zone 5 (VO2max): 106-120% FTP
- Zone 6 (Anaerobic capacity): >120% FTP
- Zone 7 (Neuromuscular): Max-effort sprints`,
    sessionTypes: [
      'Endurance ride (2-4 hours, Zone 2)',
      'Sweet spot (2 x 20 min, 88-93% FTP)',
      'Threshold intervals (3-4 x 10-15 min, 95-105% FTP)',
      'VO2max intervals (5-6 x 3-5 min, 106-120% FTP)',
      'Over-unders (alternating 95% and 105% FTP)',
      'Sprint intervals (8-12 x 20-30 sec)',
      'Climbing repeat (10-20 min climb in Zone 4)',
    ],
    periodizationNotes: `CYCLING PERIODIZATION:
- Base phase: Volume focus, Zone 2, technique drills
- Build phase: Sweet spot and threshold work
- Race-specific phase: Race simulations and VO2max work
- Taper: Reduce volume, keep short intense efforts
- Off-season: Cross-training, strength, mobility`,
  },
  SWIMMING: {
    systemContext: `You create swim programs based on CSS (Critical Swim Speed).

KEY PRINCIPLES FOR SWIMMING:
- CSS is the threshold pace for swimming
- Technique is decisive for efficiency
- Include drill work in every session
- Vary strokes for balance
- Dryland training complements water training`,
    zoneGuidance: `SWIM ZONES (based on CSS):
- CSS-6 (Recovery): CSS + 12-15 sec/100m
- CSS-5 (Endurance): CSS + 8-12 sec/100m
- CSS-4 (Tempo): CSS + 4-8 sec/100m
- CSS-3 (Threshold): CSS pace
- CSS-2 (VO2max): CSS - 3-5 sec/100m
- CSS-1 (Sprint): All-out, max effort`,
    sessionTypes: [
      'Endurance swim (2500-4000m, CSS-5/6)',
      'Threshold set (10 x 100m at CSS pace)',
      'VO2max set (5 x 200m, CSS-2)',
      'Sprint training (20 x 25m, full speed)',
      'Technique/drill session (efficiency focus)',
      'Pull/paddles session (upper-body strength)',
      'Kick set (leg work and conditioning)',
    ],
    periodizationNotes: `SWIMMING PERIODIZATION:
- Base phase: Technique, volume, aerobic foundation
- Build phase: Gradually increased intensity, race-pace introduction
- Race-specific phase: Distance-specific training, starts, turns
- Taper: Short, intense training and rest before competition`,
  },
  TRIATHLON: {
    systemContext: `You create triathlon programs that balance three disciplines.

KEY PRINCIPLES FOR TRIATHLON:
- Balance swim, bike, and run
- Brick sessions train bike-to-run transitions
- Prioritize the weakest discipline
- Avoid overtraining: three sports create more total stress
- Race-specific training is important`,
    zoneGuidance: `TRIATHLON TRAINING ZONES:
- Use discipline-specific zones (CSS, FTP, VDOT)
- Brick sessions train transitions
- Focus on race pace for the target distance
- Olympic distance: More intensity
- Ironman distance: More endurance and nutrition`,
    sessionTypes: [
      'Brick session (bike-to-run)',
      'Open-water swim when possible',
      'Race-pace swim, bike, and run work',
      'Combined strength sessions',
      'Transition practice (T1/T2)',
      'Long bike with run off the bike',
      'Technique-focused sessions across all three sports',
    ],
    periodizationNotes: `TRIATHLON PERIODIZATION:
- Off-season: Strength, technique, base endurance
- Base phase: Gradually build volume in all three disciplines
- Build phase: Introduce brick sessions and intensity
- Race-specific phase: Race pace, transitions, mental preparation
- Taper: 2-3 weeks depending on race distance`,
  },
  HYROX: {
    systemContext: `You create HYROX programs that combine running and functional stations.

KEY PRINCIPLES FOR HYROX:
- 8 x 1 km running plus 8 functional stations
- Balance running fitness and station strength
- Transition efficiency is decisive
- Race-pace training matters
- Grip endurance is critical in the later stations`,
    zoneGuidance: `HYROX TRAINING FOCUS:
- Running: Race pace around 85% maxHR
- Stations: Efficient pace, not maximal output
- Transitions: Fast recovery between efforts
- Pacing: Even tempo through the full race`,
    sessionTypes: [
      'HYROX simulation (all stations)',
      'Station-specific training',
      '8 x 1 km intervals at race pace',
      'Sled/SkiErg/RowErg conditioning',
      'Grip endurance (farmers walks, dead hangs)',
      'Wall ball plus burpee broad jump combo',
      'Run-station-run brick sessions',
    ],
    periodizationNotes: `HYROX PERIODIZATION:
- Base phase: Aerobic running capacity plus foundational strength
- Build phase: Station-specific strength and endurance
- Race-specific phase: Race simulations and pacing strategy
- Taper: Reduce volume, maintain station familiarity
- Station priority: Sled Push, Wall Balls, Rowing often limit performance`,
  },
  SKIING: {
    systemContext: `You create cross-country skiing programs for classic and skate skiing.

KEY PRINCIPLES FOR CROSS-COUNTRY SKIING:
- Technique is decisive for efficiency
- Double poling is a major power source
- Adapt training to terrain
- Use roller skiing during the dryland season
- Upper-body and core strength are critical`,
    zoneGuidance: `SKIING ZONES:
- Zone 1-2: Easy skiing, technique focus
- Zone 3: Distance intervals
- Zone 4: Threshold intervals
- Zone 5: Sprint intervals
- Technique sessions: Isolated movement skills`,
    sessionTypes: [
      'Distance session (classic or skate)',
      'Double-poling intervals',
      'Sprint training (short intervals)',
      'Technique drills (isolated skills)',
      'Roller-ski session (dryland)',
      'Forest run with poles',
      'Hill running (specific strength)',
    ],
    periodizationNotes: `SKIING PERIODIZATION:
- Spring: Recovery and foundational strength
- Summer: Roller skiing, running, cycling
- Autumn: Snow camp and intensification
- Winter: Competition season
- Double poling: Year-round priority`,
  },
  GENERAL_FITNESS: {
    systemContext: `You create general conditioning and health programs with integrated nutrition planning.

KEY PRINCIPLES FOR GENERAL FITNESS:
- Balance strength and conditioning
- Sustainable lifestyle is the focus
- Progressive overload
- Mobility and movement quality
- Adapt to the athlete's life situation

NUTRITION PRINCIPLES:
- Energy balance drives weight change
- Protein: 1.6-2.2 g/kg for muscle gain, 1.2-1.6 g/kg for weight loss
- 7700 kcal roughly equals 1 kg body weight in theory
- Limit weight loss to 0.5-1 kg per week for sustainability
- Bioimpedance measurement gives better precision than BMI alone`,
    zoneGuidance: `GENERAL TRAINING:
- Easy: Can speak comfortably
- Moderate: Can speak but with effort
- Intense: Difficult to speak
- Strength: RPE 6-8 for hypertrophy
- HIIT: Short bursts with recovery

NUTRITION RECOMMENDATIONS:
- Weight loss: TDEE minus 300-500 kcal with high protein
- Muscle gain: TDEE plus 200-400 kcal with high protein
- Maintenance: Balanced intake around TDEE
- Timing: Protein at each meal (20-40 g)`,
    sessionTypes: [
      'Conditioning session (30-45 min, easy to moderate)',
      'Strength training (full body or split)',
      'HIIT session (20-30 min)',
      'Mobility session (yoga/stretching)',
      'Active recovery (walking or easy swim)',
      'Circuit training (strength plus conditioning)',
      'Sport activity (chosen sport for variety)',
    ],
    periodizationNotes: `GENERAL FITNESS PROGRESSION:
- Weeks 1-4: Establish habits, basic technique, nutrition logging
- Weeks 5-8: Gradually increase volume, adjust calories
- Weeks 9-12: Introduce intensity, optimize macros
- Maintenance phase: Maintain with variation
- Deload: Every 4-6 weeks, reduce load`,
  },
  STRENGTH: {
    systemContext: `You create strength-training programs focused on periodization and progression.

KEY PRINCIPLES FOR STRENGTH TRAINING:
- Five-phase periodization: Anatomical Adaptation, Max Strength, Power, Maintenance, Taper
- Estimate 1RM without max testing (Epley/Brzycki)
- Two-for-two progression: 2+ extra reps in 2 sessions means increase load 5-10%
- Deload every 4-6 weeks with 40-50% volume reduction
- Exercise library should maintain biomechanical balance`,
    zoneGuidance: `STRENGTH ZONES (based on 1RM):
- Anatomical Adaptation: 60-70% 1RM, 12-15 reps, 2-3 sets
- Hypertrophy: 70-80% 1RM, 8-12 reps, 3-4 sets
- Max Strength: 80-90% 1RM, 4-6 reps, 4-5 sets
- Power: 50-70% 1RM, 3-5 explosive reps, 3-5 sets
- Maintenance: 70-85% 1RM, 6-8 reps, 2-3 sets`,
    sessionTypes: [
      'Full-body session (3x/week for beginners)',
      'Upper/lower split (4x/week)',
      'Push/pull/legs split (6x/week for advanced athletes)',
      'Plyometric training (60-300 contacts)',
      'Core stability (plank, Pallof press, dead bug)',
      'Unilateral work (Bulgarian split squat, lunges)',
      'Deload session (reduce volume 40-50%)',
    ],
    periodizationNotes: `STRENGTH PERIODIZATION (Bompa & Haff):
- Anatomical Adaptation phase (4-6 weeks): Basic technique and adaptation
- Max Strength phase (6-8 weeks): Progressive overload
- Power phase (3-4 weeks): Explosiveness and specific force
- Maintenance phase (4-24 weeks): Maintain strength during competition season
- Taper phase (1-2 weeks): Reduce volume before competition

BIOMECHANICAL BALANCE:
- Posterior chain (RDL, Nordic hamstring)
- Knee dominance (squat variations)
- Unilateral work (lunges, step-ups)
- Foot/ankle (calf raises)
- Core stability
- Upper body push/pull`,
  },
  FUNCTIONAL_FITNESS: {
    systemContext: `You create functional fitness programs with CrossFit-style training.

KEY PRINCIPLES FOR FUNCTIONAL FITNESS:
- Constantly varied, functional movement, performed at high intensity
- Mix gymnastics, Olympic lifting, and metabolic conditioning
- Periodize skills and strength
- Balance push/pull and upper/lower body work
- Technique before load, especially in Olympic lifts
- Benchmark workouts track progress`,
    zoneGuidance: `TRAINING FOCUS:
- Strength: Foundational lifts (squat, deadlift, press)
- Olympic lifts: Clean, snatch, jerk
- Gymnastics: Pull-ups, muscle-ups, HSPU, toes-to-bar
- Metabolic conditioning: WODs and intervals
- Skills: Double-unders, rope climbs, handstands

INTENSITY:
- Strength sessions: 70-90% 1RM, 3-5 reps
- WODs: Scaled to maintain high intensity
- Skills: Technical focus, not time pressure`,
    sessionTypes: [
      'WOD (For Time, AMRAP, EMOM)',
      'Strength session (Back Squat, Deadlift, Press)',
      'Olympic lifting session (Clean, Snatch, Jerk)',
      'Gymnastics skills (pull-ups, HSPU, muscle-ups)',
      'Metabolic conditioning (Assault Bike, Row, SkiErg)',
      'Benchmark workout (Fran, Grace, Murph)',
      'Active recovery (mobility, easy cardio)',
    ],
    periodizationNotes: `FUNCTIONAL FITNESS PERIODIZATION:
- Weeks 1-4: Basic technique, volume build
- Weeks 5-8: Progressive strength increase, skill development
- Weeks 9-12: Intensification and benchmark testing
- Deload every 4-5 weeks
- Skills: Practice daily before WOD
- Olympic lifts: Technique focus 2-3x/week`,
  },
  TEAM_FOOTBALL: {
    systemContext: `You create training programs for football players.

KEY PRINCIPLES FOR FOOTBALL:
- Match-day periodization (MD+/MD-)
- Explosiveness and sprint capacity
- Aerobic and anaerobic endurance
- Hamstring injury prevention
- Integrate technical training with conditioning`,
    zoneGuidance: `FOOTBALL INTENSITY ZONES:
- Recovery: <70% maxHR, active recovery
- Aerobic base: 70-80% maxHR, longer sessions
- Tempo: 80-88% maxHR, game patterns
- High intensity: 88-95% maxHR, match-like actions
- Sprint: >95% maxHR, explosive actions`,
    sessionTypes: [
      'Tactical training (game patterns with the ball)',
      'Conditioning session (small-sided games 4v4-8v8)',
      'Sprint training (10-40 m intervals)',
      'Strength training (explosiveness focus)',
      'Recovery session (easy jog/pool)',
      'Technical training (ball control)',
      'Match preparation (tactical walkthrough)',
    ],
    periodizationNotes: `FOOTBALL PERIODIZATION:
- Pre-season (4-6 weeks): Build aerobic base and strength
- Competition season: Match-day based weekly planning
- MD-3/MD-4: High-intensity sessions
- MD-2: Reduced volume, tactics
- MD-1: Light activation
- MD+1: Active recovery
- Breaks: Maintenance training`,
  },
  TEAM_ICE_HOCKEY: {
    systemContext: `You create training programs for ice hockey players.

KEY PRINCIPLES FOR ICE HOCKEY:
- Interval-based sport with 40-60 second shifts
- Explosive power and acceleration
- Recovery between shifts
- Injury prevention for hips and groin
- Balance on-ice and off-ice work`,
    zoneGuidance: `ICE HOCKEY INTENSITY ZONES:
- Recovery: Easy skating, <70% maxHR
- Aerobic base: 70-80% maxHR, longer intervals
- Threshold level: 80-90% maxHR, 30-60 sec work
- Anaerobic: 90-95% maxHR, shift simulations
- Max: >95% maxHR, explosive bursts`,
    sessionTypes: [
      'On-ice intervals (30/30 sec work/rest)',
      'Off-ice conditioning (bike, running)',
      'Explosive strength (power cleans, box jumps)',
      'Skating-specific strength (lateral work)',
      'Recovery (pool, stretching)',
      'Technical training (stickhandling)',
      'Game situations (power play, penalty kill)',
    ],
    periodizationNotes: `ICE HOCKEY PERIODIZATION:
- Off-season: Aerobic base, strength, mobility
- Pre-season: Sport-specific conditioning and explosiveness
- In-season: Maintenance and match focus
- Game day: Activation and tactics
- Playoff: Reduced volume, high intensity`,
  },
  TEAM_HANDBALL: {
    systemContext: `You create training programs for handball players.

KEY PRINCIPLES FOR HANDBALL:
- Intermittent high-intensity sport
- Throwing and jumping power
- Rapid changes of direction
- Shoulder and knee prevention
- Tactical game understanding`,
    zoneGuidance: `HANDBALL INTENSITY ZONES:
- Recovery: <70% maxHR, easy activity
- Aerobic: 70-80% maxHR, endurance training
- Tempo: 80-88% maxHR, game forms
- High-intensity play: 88-95% maxHR, intense actions
- Max: >95% maxHR, sprints and jumps`,
    sessionTypes: [
      'Game forms (6v6, 5v5)',
      'Conditioning training (intervals)',
      'Strength training (upper body, throwing)',
      'Jump training (plyometrics)',
      'Technical training (shooting, passing)',
      'Tactical session (defense, attack)',
      'Recovery session (easy activity)',
    ],
    periodizationNotes: `HANDBALL PERIODIZATION:
- Pre-season: Build conditioning and strength
- Build phase: Sport-specific training
- Competition season: Match-based planning
- Match week: Reduce volume toward match day
- Recovery: Active rest after matches`,
  },
  TEAM_FLOORBALL: {
    systemContext: `You create training programs for floorball players.

KEY PRINCIPLES FOR FLOORBALL:
- Interval sport with fast shifts
- Sprint capacity and acceleration
- Low body mass and high explosiveness
- Hip and back mobility
- Stick and ball technique`,
    zoneGuidance: `FLOORBALL INTENSITY ZONES:
- Recovery: <70% maxHR, easy running
- Aerobic base: 70-80% maxHR, basic conditioning
- Tempo: 80-88% maxHR, game forms
- High intensity: 88-95% maxHR, match-like actions
- Sprint: >95% maxHR, explosive shifts`,
    sessionTypes: [
      'Game training (varied formations)',
      'Interval running (20-40 sec)',
      'Strength training (leg explosiveness)',
      'Technical session (ball control, shooting)',
      'Speed training (reaction, acceleration)',
      'Tactical training (positions)',
      'Recovery (stretching, pool)',
    ],
    periodizationNotes: `FLOORBALL PERIODIZATION:
- Summer training: Aerobic base and strength
- Pre-season: Sport-specific conditioning
- Season: Match-adapted training
- Match week: Reduce volume toward match day
- Recovery: Rest and maintenance`,
  },
  TEAM_BASKETBALL: {
    systemContext: `You create training programs for basketball players.

KEY PRINCIPLES FOR BASKETBALL:
- Explosive vertical jump and sprint power
- Rapid changes of direction and lateral movement
- Aerobic and anaerobic endurance
- Hand coordination and shooting technique
- Ankle and knee injury prevention`,
    zoneGuidance: `BASKETBALL INTENSITY ZONES:
- Recovery: <70% maxHR, easy activity
- Aerobic base: 70-80% maxHR, basic conditioning
- Tempo: 80-88% maxHR, play drills
- High intensity: 88-95% maxHR, intense drills
- Max: >95% maxHR, sprints and jumps`,
    sessionTypes: [
      'Game training (5v5, 3v3)',
      'Shooting practice (varied positions)',
      'Agility and lateral movement',
      'Vertical jump training (plyometrics)',
      'Strength training (legs, core)',
      'Conditioning intervals (suicides, court sprints)',
      'Recovery (stretching, foam rolling)',
    ],
    periodizationNotes: `BASKETBALL PERIODIZATION:
- Off-season: Strength, explosiveness, technique
- Pre-season: Build game fitness
- In-season: Match focus and maintenance
- Match week: Reduce volume toward match day
- Playoff: High intensity, optimal recovery`,
  },
  TEAM_VOLLEYBALL: {
    systemContext: `You create training programs for volleyball players.

KEY PRINCIPLES FOR VOLLEYBALL:
- Explosive vertical power for jumps and blocks
- Fast reaction ability
- Shoulder and scapular strength for hitting
- Landing technique for knee protection
- Lateral movement and footwork`,
    zoneGuidance: `VOLLEYBALL INTENSITY ZONES:
- Recovery: <70% maxHR, easy activity
- Aerobic base: 70-80% maxHR, general conditioning
- Tempo: 80-88% maxHR, technical drills
- High intensity: 88-95% maxHR, intense drills
- Max: >95% maxHR, explosive jumps and hits`,
    sessionTypes: [
      'Game training (6v6, rotation)',
      'Serve and receive practice',
      'Block training and net play',
      'Plyometric jump training',
      'Strength training (shoulders, legs, core)',
      'Agility and reaction drills',
      'Recovery (stretching, shoulder mobility)',
    ],
    periodizationNotes: `VOLLEYBALL PERIODIZATION:
- Off-season: Foundational strength and explosiveness
- Pre-season: Technical polish and game form
- In-season: Match preparation and maintenance
- Match week: Tactics and light activation
- Recovery: Rest after intense periods`,
  },
  TENNIS: {
    systemContext: `You create training programs for tennis players.

KEY PRINCIPLES FOR TENNIS:
- Explosive movement and fast changes of direction
- Shoulder and elbow prevention
- Core stability for rotation
- Aerobic and anaerobic endurance
- Mental endurance for long matches`,
    zoneGuidance: `TENNIS INTENSITY ZONES:
- Recovery: <70% maxHR, easy activity
- Aerobic base: 70-80% maxHR, basic conditioning
- Tempo: 80-88% maxHR, rallies and drills
- High intensity: 88-95% maxHR, intense points
- Max: >95% maxHR, explosive sprints`,
    sessionTypes: [
      'Technical training (strokes, serve)',
      'Match training and tactics',
      'Footwork and movement drills',
      'Interval training (on-court drills)',
      'Strength training (rotation exercises)',
      'Conditioning training (running, cycling)',
      'Recovery (stretching, shoulder mobility)',
    ],
    periodizationNotes: `TENNIS PERIODIZATION:
- Off-season: Strength, conditioning base, technical development
- Pre-season: Competition preparation and match toughness
- In-season: Tournament periodization and maintenance
- Between tournaments: Recovery and specific training
- Taper: Reduce volume before important tournaments`,
  },
  PADEL: {
    systemContext: `You create training programs for padel players.

KEY PRINCIPLES FOR PADEL:
- Explosive lateral movements and changes of direction
- Reaction speed and anticipation
- Shoulder and elbow prevention
- Endurance for long matches
- Wall play and positioning`,
    zoneGuidance: `PADEL INTENSITY ZONES:
- Recovery: <70% maxHR, easy activity
- Aerobic base: 70-80% maxHR, basic conditioning
- Tempo: 80-88% maxHR, rallies and point play
- High intensity: 88-95% maxHR, intense exchanges
- Max: >95% maxHR, explosive reactions`,
    sessionTypes: [
      'Technical training (strokes, volleys, wall play)',
      'Match training and tactics',
      'Footwork and lateral movement',
      'Reaction training',
      'Strength training (core, legs, shoulders)',
      'Conditioning intervals',
      'Recovery (stretching, mobility)',
    ],
    periodizationNotes: `PADEL PERIODIZATION:
- Off-season: Strength, mobility, technical development
- Pre-season: Build game fitness and match toughness
- In-season: Match focus and maintenance training
- Between tournaments: Recovery and specific training
- Important tournaments: Taper and mental preparation`,
  },
  NUTRITION: {
    systemContext: `You provide nutrition advice and nutrition coaching.

KEY PRINCIPLES FOR NUTRITION:
- Energy balance adapted to the goal (weight loss, weight gain, maintenance)
- Macro distribution based on activity level and goal
- Meal timing and frequency
- Micronutrients and dietary fiber
- Sustainable eating habits over extreme diets`,
    zoneGuidance: `NUTRITION GUIDELINES:
- Protein: 1.6-2.2 g/kg body weight depending on goal
- Carbohydrates: Adapt to activity level
- Fat: 0.8-1.2 g/kg body weight minimum
- Fiber: 25-35 g per day
- Fluids: 30-40 ml/kg body weight`,
    sessionTypes: [
      'Meal planning',
      'Macro tracking',
      'Nutrition analysis',
      'Cooking and meal prep',
    ],
    periodizationNotes: `NUTRITION PERIODIZATION:
- Weight loss: Moderate calorie deficit (300-500 kcal/day)
- Weight gain: Surplus with protein focus
- Maintenance: Balanced energy intake
- Body recomposition: High protein with cycled energy intake`,
  },
};

export function getSportPrompt(sport: SportType, locale: SportPromptLocale = 'en'): SportPromptSection {
  return locale === 'sv' ? SPORT_PROMPTS[sport] : SPORT_PROMPTS_EN[sport];
}

/**
 * Calendar constraints for program generation
 */
export interface CalendarConstraints {
  blockedDates: string[]
  reducedDates: string[]
  altitudePeriods: {
    start: string
    end: string
    altitude: number
    phase?: string
  }[]
  illnessRecoveryPeriods?: {
    start: string
    end: string
    returnDate: string
  }[]
}

// Prompt for generating a full training program
export function generateProgramPrompt(
  sport: SportType,
  methodology?: keyof typeof METHODOLOGIES,
  programWeeks?: number,
  goalDescription?: string,
  calendarConstraints?: CalendarConstraints
): string {
  const sportInfo = getSportPrompt(sport, 'en');
  const methodInfo = methodology ? METHODOLOGIES[methodology] : null;

  let prompt = `## TASK: CREATE TRAINING PROGRAM

LANGUAGE: Write every user-facing field, explanation, workout name, phase name, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

Create a structured training program for an athlete.

${sportInfo.systemContext}

${sportInfo.zoneGuidance}

### SESSION TYPES TO USE:
${sportInfo.sessionTypes.map(s => `- ${s}`).join('\n')}

${sportInfo.periodizationNotes}
`;

  // Add calendar constraints if provided
  if (calendarConstraints) {
    prompt += buildCalendarConstraintsPrompt(calendarConstraints);
  }

  if (methodInfo) {
    prompt += `
### TRAINING METHODOLOGY: ${methodInfo.name}
${methodInfo.description}

KEY PRINCIPLES:
${methodInfo.keyPrinciples.map(p => `- ${p}`).join('\n')}
`;
  }

  if (programWeeks) {
    prompt += `
### PROGRAM LENGTH: ${programWeeks} weeks
`;
  }

  if (goalDescription) {
    prompt += `
### ATHLETE GOAL:
${goalDescription}
`;
  }

  prompt += `
### OUTPUT FORMAT

Structure the program as JSON using this format:

\`\`\`json
{
  "name": "Program name",
  "description": "Short description",
  "totalWeeks": 12,
  "methodology": "POLARIZED",
  "weeklySchedule": {
    "sessionsPerWeek": 5,
    "restDays": [0, 3]  // 0=Monday, 6=Sunday
  },
  "phases": [
    {
      "name": "Base phase",
      "weeks": "1-4",
      "focus": "Aerobic base and technique",
      "weeklyTemplate": {
        "monday": { "type": "REST", "description": "Rest" },
        "tuesday": {
          "type": "RUNNING",
          "name": "Base training",
          "duration": 60,
          "zone": "2",
          "description": "Easy Zone 2 run"
        },
        // ... more days
      }
    }
  ],
  "notes": "General program notes"
}
\`\`\`

Be specific with times, distances, intensities, and zone references.
Adapt to the athlete's level and available time.
`;

  return prompt;
}

// Prompt for modifying an existing program
export function modifyProgramPrompt(
  modification: string,
  currentWeekSummary: string
): string {
  return `## TASK: MODIFY TRAINING PROGRAM

LANGUAGE: Write every user-facing field, explanation, workout name, phase name, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

Modify an existing training program based on the coach's instruction.

### CURRENT WEEK:
${currentWeekSummary}

### REQUESTED CHANGE:
${modification}

### INSTRUCTIONS:
1. Keep the program's overall structure
2. Make the requested change in a physiologically sound way
3. Adjust adjacent sessions when needed for balance
4. Briefly explain why you made the specific changes

### OUTPUT FORMAT:
Return the modified week in the same JSON format as above, plus a short explanation.
`;
}

// Quick workout suggestion prompt
export function quickWorkoutPrompt(
  sport: SportType,
  duration: number,
  intensity: 'easy' | 'moderate' | 'hard',
  constraints?: string
): string {
  const sportInfo = getSportPrompt(sport, 'en');

  return `## QUICK WORKOUT: ${sport}

LANGUAGE: Write every user-facing field, workout name, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

Create a ${duration}-minute ${intensity} session.

${sportInfo.sessionTypes.slice(0, 4).map(s => `- ${s}`).join('\n')}

${constraints ? `Constraints: ${constraints}` : ''}

Return the workout in this format:
\`\`\`json
{
  "name": "Workout name",
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
  return `## INJURY MODIFICATION

LANGUAGE: Write every user-facing field, explanation, workout name, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

An athlete has reported:
- Injury type: ${injuryType}
- Pain level: ${painLevel}/10

Original workout:
${originalWorkout}

### UNIVERSITY OF DELAWARE PAIN RULES:
- Pain >5: Rest or cross-training only
- Pain 3-5: Modified training with 50% reduction
- Pain <3: Careful progression back

### TASK:
Adapt the workout according to pain level. If pain is >5, suggest an alternative cross-training session.

Return the modified workout in JSON format with an explanation.
`;
}

export type ProgramPromptOptions = {
  sport: SportType;
  methodology?: keyof typeof METHODOLOGIES;
  programWeeks?: number;
  goalDescription?: string;
  calendarConstraints?: CalendarConstraints;
};

/**
 * Build calendar constraints section for program generation prompt
 */
function buildCalendarConstraintsPrompt(constraints: CalendarConstraints): string {
  let prompt = `
### CALENDAR CONSTRAINTS - IMPORTANT!

You MUST respect the following calendar constraints when planning training:
`;

  // Blocked dates
  if (constraints.blockedDates.length > 0) {
    prompt += `
#### Blocked days (NO training allowed)
${formatDateList(constraints.blockedDates)}

**CRITICAL**: NEVER place training sessions on these dates. They are fully blocked for training.
`;
  }

  // Reduced dates
  if (constraints.reducedDates.length > 0) {
    prompt += `
#### Reduced-capacity days
${formatDateList(constraints.reducedDates)}

On these days, training should be:
- Reduced volume (max 70% of normal)
- Low to moderate intensity (Zone 1-2)
- Recovery only or light mobility
`;
  }

  // Altitude periods
  if (constraints.altitudePeriods.length > 0) {
    prompt += `
#### Altitude camp
`;
    for (const period of constraints.altitudePeriods) {
      prompt += `
**${period.start} - ${period.end}** (${period.altitude}m)
- Day 1-3: Reduce intensity to 60%, volume to 50%
- Day 4-5: Increase to 70% intensity, 60% volume
- Day 6-10: 80% intensity, 75% volume
- Day 11+: 90-95% of normal training
- Avoid VO2max intervals for the first 5 days
- Focus on aerobic base training initially
`;
    }
  }

  // Illness recovery
  if (constraints.illnessRecoveryPeriods && constraints.illnessRecoveryPeriods.length > 0) {
    prompt += `
#### Illness recovery
`;
    for (const period of constraints.illnessRecoveryPeriods) {
      prompt += `
**${period.start} - ${period.returnDate}**: Gradual return to training
- First 2-3 days after illness: Walking/light movement only
- Day 4-7: Light training (50% volume, Zone 1-2 only)
- Week 2: Gradual increase to 75%
- Week 3+: Normal training if symptom-free
`;
    }
  }

  prompt += `
### INSTRUCTIONS FOR CALENDAR-AWARE PLANNING

1. **Do not place sessions on blocked dates** - move them to the nearest available day
2. **Do not move key sessions** to reduced-capacity days - choose fully available days
3. **Plan recovery sessions** before and after longer blocked periods
4. **During altitude camps**: Follow the adaptation protocol exactly
5. **After illness**: Prioritize gradual progression over "catching up"
6. **Be flexible**: If there are many blocked dates, focus on quality over quantity
`;

  return prompt;
}

/**
 * Format a list of dates for display in prompt
 */
function formatDateList(dates: string[]): string {
  if (dates.length === 0) return '';

  // Group consecutive dates
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  const sortedDates = [...dates].sort();

  for (const date of sortedDates) {
    if (currentGroup.length === 0) {
      currentGroup.push(date);
    } else {
      const lastDate = new Date(currentGroup[currentGroup.length - 1]);
      const currentDate = new Date(date);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentGroup.push(date);
      } else {
        groups.push(currentGroup);
        currentGroup = [date];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Format groups
  return groups.map(group => {
    if (group.length === 1) {
      return `- ${group[0]}`;
    } else {
      return `- ${group[0]} to ${group[group.length - 1]} (${group.length} days)`;
    }
  }).join('\n');
}

/**
 * Generate calendar-aware workout suggestion
 */
export function calendarAwareWorkoutPrompt(
  sport: SportType,
  targetDate: string,
  calendarContext: {
    isBlocked: boolean;
    isReduced: boolean;
    inAltitude: boolean;
    altitudeDay?: number;
    recentIllness: boolean;
    daysSinceIllness?: number;
  }
): string {
  const sportInfo = getSportPrompt(sport, 'en');

  if (calendarContext.isBlocked) {
    return `## REST DAY: ${targetDate}

LANGUAGE: Write every user-facing field, suggestion, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

This day is blocked in the athlete's calendar. No training should be planned.

Suggest instead:
- Short mobility session (10-15 min)
- Mental visualization
- Equipment maintenance
`;
  }

  let intensityGuide = '';
  let sessionRecommendation = '';

  if (calendarContext.inAltitude && calendarContext.altitudeDay) {
    const day = calendarContext.altitudeDay;
    if (day <= 3) {
      intensityGuide = 'Only light aerobic training (Zone 1). Max 60% of normal volume.';
      sessionRecommendation = 'Easy jog, walk, or stretching';
    } else if (day <= 5) {
      intensityGuide = 'Light to moderate intensity (Zone 1-2). Max 70% volume.';
      sessionRecommendation = 'Base training, technique focus';
    } else if (day <= 10) {
      intensityGuide = 'Can introduce tempo (Zone 3). Max 80% volume.';
      sessionRecommendation = 'Base training with tempo elements';
    } else {
      intensityGuide = 'Near-normal training (90% intensity and volume)';
      sessionRecommendation = 'Normal training according to plan';
    }
  } else if (calendarContext.recentIllness && calendarContext.daysSinceIllness) {
    const days = calendarContext.daysSinceIllness;
    if (days <= 3) {
      intensityGuide = 'Walking or light mobility only';
      sessionRecommendation = 'Short walk (20-30 min)';
    } else if (days <= 7) {
      intensityGuide = 'Light training (50% volume, Zone 1)';
      sessionRecommendation = 'Easy jog or cycling';
    } else if (days <= 14) {
      intensityGuide = 'Gradual increase (75% volume, Zone 1-2)';
      sessionRecommendation = 'Base training, avoid intervals';
    } else {
      intensityGuide = 'Normal training if symptom-free';
      sessionRecommendation = 'Normal training';
    }
  } else if (calendarContext.isReduced) {
    intensityGuide = 'Reduced training (max Zone 2, 70% volume)';
    sessionRecommendation = 'Easy recovery session or mobility';
  }

  return `## WORKOUT FOR ${targetDate}

LANGUAGE: Write every user-facing field, workout name, and note in English. Some legacy context below may contain Swedish examples; translate their meaning and do not copy Swedish into the generated output.

${intensityGuide ? `**Constraint**: ${intensityGuide}` : ''}

**Recommended**: ${sessionRecommendation || 'Normal training according to plan'}

Available session types for ${sport}:
${sportInfo.sessionTypes.slice(0, 4).map(s => `- ${s}`).join('\n')}

Return the workout in JSON format.
`;
}
