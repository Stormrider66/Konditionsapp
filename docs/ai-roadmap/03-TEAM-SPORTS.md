# Plan C: Team Sports

> Hockey and Football (Soccer) with GPS Integration

## Overview

Expand support for team sport athletes with focus on:
1. **Hockey** - Off-season training, in-season recovery, match schedule integration
2. **Football** - Full support with GPS data integration for load monitoring

**Key Principle**: This app is a training & recovery companion, not team management software.

---

## Part 1: Hockey Implementation

### Scope Definition

```
What this app does for hockey players:
✅ Off-season training programs (strength, conditioning)
✅ In-season physical training & recovery
✅ Match schedule awareness (from external hockey app)
✅ Position-specific training recommendations
✅ Season phase periodization
✅ AI coaching for physical preparation

What this app does NOT do:
❌ Team management
❌ Tactics and plays
❌ On-ice drills
❌ Match statistics
❌ Line combinations
(These belong in the separate hockey app)
```

### Database Schema

```prisma
// Update SportProfile with hockey settings
model SportProfile {
  // ... existing fields

  hockeySettings Json? // HockeySettings
}

// External match schedule integration
model ExternalMatchSchedule {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  externalMatchId String   // ID from hockey app
  opponent        String
  isHome          Boolean
  scheduledDate   DateTime
  venue           String?

  // Result (updated after match)
  result          String?  // "4-2", null if not played
  minutesPlayed   Float?   // Ice time

  // Generated calendar events
  calendarEventId String?  // Link to CalendarEvent

  // Sync tracking
  externalSource  String   @default("hockey_app")
  lastSyncedAt    DateTime @default(now())

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([clientId, externalMatchId])
  @@index([clientId, scheduledDate])
}
```

### Hockey Settings Interface

```typescript
interface HockeySettings {
  // Position (affects training focus)
  position: 'CENTER' | 'WINGER' | 'DEFENSE' | 'GOALIE';
  shootingSide: 'left' | 'right';

  // Team context
  teamName: string;
  leagueLevel: 'SHL' | 'HockeyAllsvenskan' | 'HockeyEttan' | 'J20' | 'J18' | 'Division_1' | 'Division_2' | 'Other';

  // Load context
  averageIceTimeMinutes: number;  // Typical game minutes
  typicalGamesPerWeek: number;    // 1-4

  // Season tracking
  seasonPhase: 'OFF_SEASON' | 'PRE_SEASON' | 'IN_SEASON' | 'PLAYOFFS';
  seasonStartDate: string;  // ISO date
  seasonEndDate: string;

  // Training context
  hasTeamStrengthCoach: boolean;  // If true, AI is more advisory
  primaryGymAccess: 'team_gym' | 'commercial_gym' | 'home';
  homeEquipment: string[];

  // Integration
  externalHockeyAppConnected: boolean;
  externalHockeyAppId?: string;

  // Goals
  offSeasonGoals: string[];  // "Öka styrka", "Förbättra explosivitet"
  physicalLimiters: string[]; // "Höftrörlighet", "Skottfart"
}
```

### Season-Aware AI

```typescript
// lib/ai/hockey-season-context.ts

export function buildHockeySeasonContext(
  settings: HockeySettings,
  upcomingMatches: ExternalMatchSchedule[]
): string {
  const nextMatch = upcomingMatches[0];
  const daysToMatch = nextMatch
    ? differenceInDays(new Date(nextMatch.scheduledDate), new Date())
    : null;

  if (settings.seasonPhase === 'OFF_SEASON') {
    return `
SÄSONGSFAS: Off-season (${settings.seasonStartDate} - ${settings.seasonEndDate})

FOKUS:
- Bygg styrka och kondition
- Åtgärda svagheter: ${settings.physicalLimiters.join(', ')}
- Inga matchhänsyn - full träning möjlig
- Mål: ${settings.offSeasonGoals.join(', ')}

PERIODISERING:
- Fas 1 (v1-3): Aktiv vila, läkning
- Fas 2 (v4-9): Basbygge, hypertrofi
- Fas 3 (v10-14): Specifik styrka, power
- Fas 4 (v15-16): Pre-season övergång
    `;
  }

  if (settings.seasonPhase === 'IN_SEASON') {
    let matchContext = '';
    if (daysToMatch !== null) {
      if (daysToMatch === 0) {
        matchContext = `MATCHDAG IDAG mot ${nextMatch.opponent}. Endast aktivering och mental förberedelse.`;
      } else if (daysToMatch === 1) {
        matchContext = `MD-1: Match imorgon mot ${nextMatch.opponent}. Lätt aktivering endast.`;
      } else if (daysToMatch === 2) {
        matchContext = `MD-2: Moderat träning OK. Match om 2 dagar.`;
      } else {
        matchContext = `${daysToMatch} dagar till nästa match. Normal träning möjlig.`;
      }
    }

    return `
SÄSONGSFAS: In-season

${matchContext}

KOMMANDE MATCHER:
${upcomingMatches.slice(0, 5).map(m =>
  `- ${formatDate(m.scheduledDate)}: vs ${m.opponent} (${m.isHome ? 'hemma' : 'borta'})`
).join('\n')}

IN-SEASON PRINCIPER:
- Återhämtning är prioritet #1
- Behåll styrka, bygg inte (2x/vecka max)
- Aldrig tung styrka MD-1
- Sömn 8+ timmar kritiskt
- ${settings.hasTeamStrengthCoach ? 'Följ lagets styrkeprogram' : 'AI föreslår styrkepass vid lämpliga tillfällen'}
    `;
  }

  return '';
}
```

### Position-Specific Training

```typescript
// lib/ai/hockey-position-training.ts

export const positionTrainingFocus = {
  CENTER: {
    strengthPriorities: ['core rotation', 'lower body power', 'grip strength'],
    conditioningFocus: 'repeated sprint, lactate tolerance',
    mobilityFocus: ['hip flexors', 'thoracic spine'],
    typicalShiftLength: '45-60 seconds',
    recoveryNeeds: 'moderate - high skating volume'
  },
  WINGER: {
    strengthPriorities: ['acceleration', 'shot power', 'board battles'],
    conditioningFocus: 'explosive repeats, speed endurance',
    mobilityFocus: ['hip flexors', 'shoulders'],
    typicalShiftLength: '40-50 seconds',
    recoveryNeeds: 'moderate - emphasis on speed maintenance'
  },
  DEFENSE: {
    strengthPriorities: ['lateral power', 'upper body strength', 'core stability'],
    conditioningFocus: 'backwards skating endurance, positional recovery',
    mobilityFocus: ['hips (lateral)', 'ankles', 'shoulders'],
    typicalShiftLength: '50-70 seconds',
    recoveryNeeds: 'high - longest ice time, most physical'
  },
  GOALIE: {
    strengthPriorities: ['hip strength', 'reaction', 'recovery between saves'],
    conditioningFocus: 'short burst recovery, not aerobic',
    mobilityFocus: ['hips (extreme ROM)', 'groin', 'thoracic'],
    typicalShiftLength: 'full period',
    recoveryNeeds: 'unique - mental recovery as important as physical'
  }
};
```

### External Hockey App Integration

```typescript
// app/api/integrations/hockey-schedule/route.ts

// POST - Receive match schedule from hockey app
export async function POST(req: Request) {
  const { clientId, matches } = await req.json();

  // Validate client exists and has hockey sport profile

  for (const match of matches) {
    // Upsert match schedule
    await prisma.externalMatchSchedule.upsert({
      where: {
        clientId_externalMatchId: {
          clientId,
          externalMatchId: match.externalMatchId
        }
      },
      update: {
        opponent: match.opponent,
        isHome: match.isHome,
        scheduledDate: new Date(match.scheduledDate),
        venue: match.venue,
        result: match.result,
        minutesPlayed: match.minutesPlayed,
        lastSyncedAt: new Date()
      },
      create: {
        clientId,
        externalMatchId: match.externalMatchId,
        opponent: match.opponent,
        isHome: match.isHome,
        scheduledDate: new Date(match.scheduledDate),
        venue: match.venue
      }
    });

    // Create/update calendar event
    await createMatchCalendarEvent(clientId, match);
  }

  return Response.json({ success: true, matchesProcessed: matches.length });
}

async function createMatchCalendarEvent(clientId: string, match: MatchImport) {
  // Create COMPETITION calendar event
  // Also create MD-1 and MD+1 events with appropriate training impacts
}
```

### Hockey Onboarding

```
components/onboarding/HockeyOnboarding.tsx

Steps:
1. Position & Team
   - Position selection (with visual)
   - Team name
   - League level

2. Season Information
   - Current season phase
   - Season dates
   - Typical games per week

3. Physical Profile
   - Average ice time
   - Physical limiters/goals
   - Injury history

4. Training Setup
   - Has team strength coach?
   - Gym access
   - Home equipment

5. Hockey App Integration
   - Connect external app (optional)
   - Or manual schedule entry

6. Review & Generate Program
   - Based on season phase
   - Position-appropriate focus
```

### Hockey Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ HOCKEY DASHBOARD - In-Season                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ NÄSTA MATCH                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏒 Lördag 18:00 vs Frölunda (borta)                    │ │
│ │                                                         │ │
│ │ Dagar kvar: 2                                           │ │
│ │ Träningsstatus: Moderat träning OK idag                │ │
│ │                                                         │ │
│ │ Countdown: ██████████░░░░░░░░░░                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ VECKANS SCHEMA                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Mån │ Tis  │ Ons   │ Tor  │ Fre   │ Lör   │ Sön  │     │
│ │     │      │       │      │       │       │      │     │
│ │ 💪  │ 🏃   │ 🏒    │ 🧘   │ ⚡    │ 🏒    │ 😴   │     │
│ │Styrka│Lätt │Match  │Vila  │Aktiv. │Match  │Vila  │     │
│ │     │kond. │       │      │       │       │      │     │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ READINESS                                                   │
│ Idag: 7.2/10 ✅ Bra för moderat träning                    │
│                                                             │
│ POSITION: Center                                            │
│ Fokusområden: Core rotation, explosivitet                  │
│                                                             │
│ [Dagens pass] [Chatta med AI] [Matchförberedelse]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 2: Football Implementation

### Database Schema

```prisma
model SportProfile {
  // ... existing fields

  footballSettings Json? // FootballSettings
}

// GPS data import
model GPSSessionData {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  sessionDate     DateTime
  sessionType     GPSSessionType

  // Core metrics
  totalDistanceM      Float
  highSpeedRunningM   Float   // >19.8 km/h
  sprintDistanceM     Float   // >25.2 km/h
  minutesPlayed       Int

  // Intensity metrics
  accelerations       Int?    // >3 m/s²
  decelerations       Int?    // <-3 m/s²
  playerLoad          Float?  // Arbitrary units

  // Speed data
  maxSpeedKmh         Float?
  avgSpeedKmh         Float?

  // Heart rate (if available)
  avgHeartRate        Int?
  maxHeartRate        Int?
  timeInZone4Plus     Int?    // Minutes

  // Calculated
  metersPerMinute     Float?
  loadScore           Float?  // Calculated composite

  // Source
  gpsProvider         String  // CATAPULT, STATSPORTS, POLAR, GPEXE
  externalSessionId   String?

  // Match context (if match)
  matchId             String?
  opponent            String?
  wasStarting         Boolean?
  minutesOnField      Int?

  createdAt           DateTime @default(now())

  @@index([clientId, sessionDate])
  @@index([clientId, sessionType])
}

enum GPSSessionType {
  MATCH
  FULL_TRAINING
  TACTICAL_SESSION
  RECOVERY_SESSION
  FRIENDLY
}
```

### Football Settings Interface

```typescript
interface FootballSettings {
  // Position
  position: 'GOALKEEPER' | 'CENTER_BACK' | 'FULL_BACK' | 'WING_BACK' |
            'DEFENSIVE_MID' | 'CENTRAL_MID' | 'ATTACKING_MID' |
            'WINGER' | 'STRIKER';
  preferredFoot: 'left' | 'right' | 'both';
  secondaryPosition?: string;

  // Team context
  teamName: string;
  leagueLevel: string;

  // Typical metrics (for comparison)
  avgMatchDistanceKm: number;
  avgHighSpeedRunningM: number;
  avgSprintDistanceM: number;
  avgMinutesPlayed: number;

  // Season
  seasonPhase: 'OFF_SEASON' | 'PRE_SEASON' | 'IN_SEASON';
  matchesPerWeek: number;  // Typically 1-2

  // GPS integration
  gpsProvider?: 'CATAPULT' | 'STATSPORTS' | 'POLAR' | 'GPEXE' | 'OTHER';
  hasGPSAccess: boolean;

  // Training
  hasTeamCoach: boolean;
  teamTrainingDaysPerWeek: number;
  additionalTrainingAllowed: boolean;
}
```

### GPS-Powered ACWR

```typescript
// lib/training-engine/gps-load-calculator.ts

interface GPSLoadCalculation {
  sessionLoad: number;
  acuteLoad: number;      // Last 7 days
  chronicLoad: number;    // Last 28 days
  acwr: number;
  riskZone: 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL';
}

export function calculateGPSLoad(session: GPSSessionData): number {
  // Weighted formula based on research
  const distanceLoad = session.totalDistanceM * 0.01;
  const hsrLoad = session.highSpeedRunningM * 0.5;
  const sprintLoad = session.sprintDistanceM * 1.0;
  const accelLoad = (session.accelerations || 0) * 2;
  const decelLoad = (session.decelerations || 0) * 2;

  return distanceLoad + hsrLoad + sprintLoad + accelLoad + decelLoad;
}

export async function calculateGPSBasedACWR(clientId: string): Promise<GPSLoadCalculation> {
  const last28Days = await prisma.gPSSessionData.findMany({
    where: {
      clientId,
      sessionDate: { gte: subDays(new Date(), 28) }
    },
    orderBy: { sessionDate: 'desc' }
  });

  const acuteLoad = last28Days
    .filter(s => differenceInDays(new Date(), s.sessionDate) <= 7)
    .reduce((sum, s) => sum + calculateGPSLoad(s), 0) / 7;

  const chronicLoad = last28Days
    .reduce((sum, s) => sum + calculateGPSLoad(s), 0) / 28;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  return {
    sessionLoad: calculateGPSLoad(last28Days[0]),
    acuteLoad,
    chronicLoad,
    acwr,
    riskZone: getACWRZone(acwr)
  };
}
```

### Position Benchmarks

```typescript
// lib/ai/football-position-benchmarks.ts

export const positionBenchmarks = {
  CENTRAL_MIDFIELDER: {
    avgDistanceKm: 11.5,
    avgHighSpeedM: 850,
    avgSprintsM: 250,
    avgAccelerations: 45,
    pattern: 'Highest total distance, box-to-box coverage',
    trainingFocus: ['aerobic capacity', 'repeated sprint', 'passing under fatigue']
  },
  WINGER: {
    avgDistanceKm: 10.5,
    avgHighSpeedM: 1100,
    avgSprintsM: 400,
    avgAccelerations: 55,
    pattern: 'High-speed running dominant, explosive',
    trainingFocus: ['speed endurance', 'acceleration', 'agility']
  },
  FULL_BACK: {
    avgDistanceKm: 10.8,
    avgHighSpeedM: 950,
    avgSprintsM: 320,
    avgAccelerations: 50,
    pattern: 'High volume with overlapping runs',
    trainingFocus: ['aerobic + speed', 'recovery between runs', 'defensive transitions']
  },
  CENTER_BACK: {
    avgDistanceKm: 9.5,
    avgHighSpeedM: 450,
    avgSprintsM: 180,
    avgAccelerations: 35,
    pattern: 'Lower volume, explosive defensive actions',
    trainingFocus: ['strength', 'aerial power', 'short sprint recovery']
  },
  STRIKER: {
    avgDistanceKm: 9.8,
    avgHighSpeedM: 750,
    avgSprintsM: 350,
    avgAccelerations: 48,
    pattern: 'Sprint-focused, pressing bursts',
    trainingFocus: ['explosive power', 'finishing under fatigue', 'pressing endurance']
  },
  GOALKEEPER: {
    avgDistanceKm: 5.5,
    avgHighSpeedM: 50,
    avgSprintsM: 30,
    avgAccelerations: 15,
    pattern: 'Explosive short actions, distribution',
    trainingFocus: ['reaction', 'diving power', 'distribution', 'mental focus']
  }
};
```

### GPS Data Import API

```typescript
// app/api/integrations/gps-data/route.ts

export async function POST(req: Request) {
  const {
    clientId,
    sessionDate,
    sessionType,
    gpsProvider,
    metrics
  } = await req.json();

  // Validate client and football sport profile

  const session = await prisma.gPSSessionData.create({
    data: {
      clientId,
      sessionDate: new Date(sessionDate),
      sessionType,
      gpsProvider,
      totalDistanceM: metrics.totalDistanceM,
      highSpeedRunningM: metrics.highSpeedRunningM,
      sprintDistanceM: metrics.sprintDistanceM,
      minutesPlayed: metrics.minutesPlayed,
      accelerations: metrics.accelerations,
      decelerations: metrics.decelerations,
      playerLoad: metrics.playerLoad,
      maxSpeedKmh: metrics.maxSpeedKmh,
      avgHeartRate: metrics.avgHeartRate,
      maxHeartRate: metrics.maxHeartRate,
      loadScore: calculateGPSLoad(metrics)
    }
  });

  // Update ACWR
  const acwrData = await calculateGPSBasedACWR(clientId);

  // Generate alerts if needed
  if (acwrData.riskZone === 'DANGER' || acwrData.riskZone === 'CRITICAL') {
    await createLoadAlert(clientId, acwrData);
  }

  return Response.json({
    success: true,
    sessionId: session.id,
    loadScore: session.loadScore,
    currentACWR: acwrData.acwr,
    riskZone: acwrData.riskZone
  });
}
```

### Football Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ FOOTBALL DASHBOARD                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SENASTE MATCH: vs IFK Göteborg (1-1)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Total distans    │ High-speed       │ Sprinter         │ │
│ │ 10.8 km          │ 890 m            │ 32 st            │ │
│ │ ↑ 6% vs snitt    │ ↑ 14% vs snitt   │ = normal         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ BELASTNING (GPS)                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ACWR: 1.18                                   OPTIMAL ✅ │ │
│ │ [████████████████░░░░] 1.18                            │ │
│ │  0.8      1.0      1.3    1.5      2.0                 │ │
│ │  Under-   Optimal  Caution Danger  Critical            │ │
│ │  trained                                                │ │
│ │                                                         │ │
│ │ Akut belastning (7d): 2,450 AU                         │ │
│ │ Kronisk belastning (28d): 2,076 AU                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ POSITION: Mittfältare (central)                            │
│ Jämfört med positionssnitt:                                │
│ • Distans: +6% ↑  (du springer mer)                       │
│ • High-speed: +14% ↑ (stark på löpningar)                 │
│ • Sprinter: genomsnitt                                     │
│                                                             │
│ 🤖 AI REKOMMENDATION:                                      │
│ "Du sprang 14% mer high-speed än vanligt. Prioritera      │
│  återhämtning idag. Lätt cykel 20 min, stretch, sömn 8h." │
│                                                             │
│ [Importera GPS-data] [Se historik] [Chatta med AI]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### GPS Integration UI

```
┌─────────────────────────────────────────────────────────────┐
│ GPS DATA IMPORT                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Välj GPS-leverantör:                                        │
│                                                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ Catapult  │ │ STATSports│ │ Polar     │ │ Gpexe     │   │
│ │    ✓      │ │           │ │           │ │           │   │
│ │  Ansluten │ │ [Anslut]  │ │ [Anslut]  │ │ [Anslut]  │   │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
│ SENASTE SESSIONER (från Catapult)                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑️ 14 jan - Match vs IFK Göteborg         10.8 km     │ │
│ │ ☑️ 12 jan - Full träning                   8.2 km     │ │
│ │ ☑️ 11 jan - Taktisk session                5.1 km     │ │
│ │ ☐ 10 jan - Återhämtning                   3.2 km     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Importera valda] [Importera alla]                         │
│                                                             │
│ MANUELL INMATNING                                           │
│ Har du inte automatisk sync? [Mata in manuellt]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Shared Team Sport Features

### Match Schedule View

```
components/athlete/team-sports/
├── MatchScheduleWidget.tsx    # Upcoming matches
├── MatchDayCountdown.tsx      # Days to next match
├── WeeklyScheduleView.tsx     # Week with matches + training
├── PostMatchRecovery.tsx      # Recovery recommendations
└── SeasonOverview.tsx         # Full season calendar
```

### Training Around Matches

```typescript
// lib/training-engine/match-day-training.ts

export function getTrainingGuidance(
  daysToMatch: number,
  daysFromLastMatch: number,
  sport: 'HOCKEY' | 'FOOTBALL'
): TrainingGuidance {
  // MD-0 (Match day)
  if (daysToMatch === 0) {
    return {
      maxIntensity: 'activation',
      strengthAllowed: false,
      conditioningAllowed: false,
      focusAreas: ['mental prep', 'activation', 'mobility'],
      message: 'Matchdag - endast aktivering och mental förberedelse'
    };
  }

  // MD-1 (Day before match)
  if (daysToMatch === 1) {
    return {
      maxIntensity: 'light',
      strengthAllowed: false,
      conditioningAllowed: false,
      focusAreas: ['light activation', 'mobility', 'rest'],
      message: 'Match imorgon - lätt aktivering endast'
    };
  }

  // MD+1 (Day after match)
  if (daysFromLastMatch === 1) {
    return {
      maxIntensity: 'recovery',
      strengthAllowed: false,
      conditioningAllowed: false,
      focusAreas: ['active recovery', 'pool', 'massage'],
      message: 'Återhämtning efter match - lätt rörelse eller vila'
    };
  }

  // MD-2 or MD+2
  if (daysToMatch === 2 || daysFromLastMatch === 2) {
    return {
      maxIntensity: 'moderate',
      strengthAllowed: true,
      conditioningAllowed: true,
      focusAreas: ['moderate training', 'avoid heavy legs'],
      message: 'Moderat träning OK - undvik utmattning'
    };
  }

  // 3+ days from matches
  return {
    maxIntensity: 'high',
    strengthAllowed: true,
    conditioningAllowed: true,
    focusAreas: ['full training', 'intensity work'],
    message: 'Normal träning - full intensitet möjlig'
  };
}
```

---

## Part 4: Onboarding Flows

### Hockey Onboarding

```
components/onboarding/HockeyOnboarding.tsx

6 steps:
1. Position & Team Info
2. Season Information
3. Physical Profile & Goals
4. Training Setup
5. External App Integration (optional)
6. Program Generation
```

### Football Onboarding

```
components/onboarding/FootballOnboarding.tsx

6 steps:
1. Position & Team Info
2. Season Information
3. GPS Integration (if available)
4. Physical Benchmarks
5. Training Context
6. Program Generation
```

---

## Implementation Timeline

### Sprint 1-2: Hockey Foundation
- [ ] HockeySettings in SportProfile
- [ ] Hockey onboarding flow
- [ ] Season-aware AI context
- [ ] Position-specific prompts
- [ ] Hockey dashboard

### Sprint 3-4: Hockey Integration
- [ ] ExternalMatchSchedule model
- [ ] Hockey app integration API
- [ ] Calendar event generation
- [ ] Match day training guidance
- [ ] Pre/post match protocols

### Sprint 5-6: Football Foundation
- [ ] FootballSettings in SportProfile
- [ ] Football onboarding flow
- [ ] Position benchmarks
- [ ] Football dashboard
- [ ] Match schedule support

### Sprint 7-8: GPS Integration
- [ ] GPSSessionData model
- [ ] GPS import API
- [ ] GPS-based ACWR calculation
- [ ] Load visualization
- [ ] AI recommendations from GPS

### Sprint 9-10: Polish & Optimization
- [ ] Cross-sport shared components
- [ ] Performance optimization
- [ ] Testing with real users
- [ ] Documentation

---

## Files to Create

```
// Prisma schema additions
prisma/schema.prisma

// Hockey
components/onboarding/HockeyOnboarding.tsx
components/athlete/hockey/HockeyDashboard.tsx
components/athlete/hockey/MatchScheduleWidget.tsx
components/athlete/hockey/SeasonPhaseIndicator.tsx
components/coach/sport-views/HockeyAthleteView.tsx
lib/ai/hockey-season-context.ts
lib/ai/hockey-position-training.ts
app/api/integrations/hockey-schedule/route.ts

// Football
components/onboarding/FootballOnboarding.tsx
components/athlete/football/FootballDashboard.tsx
components/athlete/football/GPSLoadWidget.tsx
components/athlete/football/PositionBenchmarks.tsx
components/coach/sport-views/FootballAthleteView.tsx
lib/ai/football-position-benchmarks.ts
lib/training-engine/gps-load-calculator.ts
app/api/integrations/gps-data/route.ts

// Shared
components/athlete/team-sports/MatchDayCountdown.tsx
components/athlete/team-sports/WeeklyScheduleView.tsx
components/athlete/team-sports/PostMatchRecovery.tsx
lib/training-engine/match-day-training.ts
```

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Hockey AI | AI Core (Plan A) |
| Match calendar | Existing CalendarEvent system |
| GPS ACWR | Existing ACWR calculation base |
| Onboarding | Existing onboarding wizard pattern |
| Dashboards | Existing sport dashboard pattern |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hockey Schedule Sync | 90% accuracy | Manual verification |
| GPS Data Import | <1 min to import | Timing |
| ACWR Accuracy | Within 5% of manual | Comparison |
| Match-Day Compliance | 80% follow recommendations | Workout logs |
| Injury Rate | 20% reduction | Injury tracking |
