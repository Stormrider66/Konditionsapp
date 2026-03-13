/**
 * Enriched Baseline Template
 *
 * Knowledge-rich prompt variant for program generation with conditional blocks.
 * Uses {{#if_category X}}...{{/endif}} and {{#if_methodology X}}...{{/endif}}
 * blocks that get stripped based on sport type before variable substitution.
 *
 * Distilled from:
 * - docs/hypertrophy_framework.md (MEV/MAV/MRV, volume periodization)
 * - docs/Autoregulation_RPE_RIR_Guide.md (RPE/RIR mapping, autoregulation)
 * - lib/training-engine/* (methodologies, sport-specific modules)
 */

export const ENRICHED_BASELINE_TEMPLATE = `## UPPGIFT: SKAPA TRÄNINGSPROGRAM

Du är en erfaren tränare och idrottsfysiolog med djup kunskap inom periodisering, biomekanik och prestationsoptimering. Skapa ett individualiserat, vetenskapligt grundat träningsprogram.

**Sport:** {{sport}}
**Metodik:** {{methodology}}
**Programlängd:** {{totalWeeks}} veckor
**Pass per vecka:** {{sessionsPerWeek}}
**Erfarenhetsnivå:** {{experienceLevel}}
**Mål:** {{goal}}

---

## PERIODISERINGSPRINCIPER (ALLA SPORTER)

Programmet MÅSTE följa korrekt periodisering:

### Faser (anpassa längd efter totalt antal veckor):
- **Basfas (30-40% av programmet):** Bygg aerob kapacitet/grundstyrka, låg intensitet, hög volym
- **Uppbyggnadsfas (30-40%):** Öka intensitet gradvis, introducera specifika pass
- **Toppfas/Specifik (15-25%):** Hög intensitet, specifik träning, minskad volym
- **Avtrappning (5-10%):** Minska volym 40-60%, BEHÅLL intensitet (exponentiell nedtrappning)

### Progressionsregler:
- **10%-regeln:** Max 10% volymökning per vecka
- **Step-back veckor:** Var 3-4:e vecka, minska volym 20-30% för återhämtning
- **2-for-2 regeln (styrka):** Om atleten klarar 2 extra reps i sista setet 2 sessioner i rad → öka belastning (5% överkropp, 5-10% underkropp)

---

## SKADEPREVENTION (ALLA SPORTER)

### Inkludera i VARJE program:
- **Nordic Hamstring Curls:** 51% reduktion av hamstringskador
- **Copenhagen Planks:** 41% reduktion av ljumskskador
- **Höft-abduktion/extern rotation:** Förebygger IT-band, PFPS
- **Unilateralt arbete:** Förebygger obalanser

### Delaware smärtregler:
- Smärta >5/10: Vila eller cross-training
- Smärta 3-5: Modifierad träning, 50% reduktion
- Smärta <3: Försiktig progression

### ACWR (Akut:Kronisk Arbetsbelastning): Håll <1.3 under uppbyggnad, <1.5 acceptabelt kort

---

## RAMP UPPVÄRMNING (ALLA SPORTER)

Varje pass MÅSTE börja med RAMP-protokoll:
1. **Raise** (3-5 min): Höj puls med lätt cardio
2. **Activate** (3-5 min): Aktivera nyckelmuskulatur med band/lätta vikter
3. **Mobilize** (2-3 min): Dynamisk rörlighet för dagens rörelsemönster
4. **Potentiate** (2-3 min): Progressiv belastning mot arbetsbelastning

---

{{#if_category STRENGTH_GYM}}
## STYRKETRÄNING & GYMPROGRAM

### Periodiseringsfaser för styrka (Bompa & Haff):
| Fas | Veckor | Intensitet | Reps | Set | Vila | Tempo |
|-----|--------|-----------|------|-----|------|-------|
| Anatomisk Anpassning (AA) | 4-6 | 40-60% 1RM | 12-20 | 2-3 | 60-90s | 2-0-2 |
| Hypertrofi | 4-6 | 70-80% 1RM | 8-12 | 3-4 | 60-90s | 3-0-1 |
| Max Styrka | 6-8 | 80-95% 1RM | 3-6 | 3-5 | 2-3 min | 2-1-X |
| Power | 3-4 | 30-60% 1RM (explosivt) | 4-6 | 3-5 | 3-5 min | X-0-X |
| Underhåll | Löpande | 70-85% 1RM | 6-8 | 2 | 2 min | 2-0-1 |

### Tempoangivelse: Ange som "3-0-X" (3 sek excentrisk, 0 paus, X = explosiv koncentrisk)

### Volymlandmärken (set per muskelgrupp per vecka):
- **MEV (Minimum Effective Volume):** 6-10 set — startpunkt för mesocykel
- **MAV (Maximum Adaptive Volume):** 10-20 set — optimal tillväxtzon
- **MRV (Maximum Recoverable Volume):** 20-25 set — överstiger detta → regression

**Per muskelgrupp:**
| Muskelgrupp | MEV | MAV | MRV | Frekvens/vecka | Optimala reps |
|------------|-----|-----|-----|----------------|---------------|
| Bröst | 10 | 12-20 | 22+ | 2-3 | 8-12 |
| Rygg/Lats | 10 | 14-22 | 25+ | 2-4 | 6-20 (blandad) |
| Axlar (sida/bak) | 8 | 16-22 | 26+ | 2-6 | 10-20 |
| Quadriceps | 8 | 12-18 | 20+ | 2-3 | 8-15 |
| Hamstrings | 6 | 10-16 | 20+ | 2-3 | 5-10 |
| Biceps | 8 | 14-20 | 26+ | 2-6 | 8-15 |
| Triceps | 6 | 10-14 | 18+ | 2-4 | 6-15 |

### Biomechanisk balans (inkludera ALLA kategorier i programmet):
1. **Posterior Chain:** RDL, Hip Thrust, Kettlebell Swing, Nordic Hamstring
2. **Knädominant:** Knäböj (goblet/back/front), Bulgarian Split Squat, Benspress
3. **Unilateralt:** Utfallssteg, Step-ups, Single-Leg RDL
4. **Core (anti-rotation):** Pallof Press, Planka med lyft, Suitcase Carry, Dead Bug
5. **Överkropp Push/Pull:** Bänkpress, Press, Rodd, Chins/Pull-ups
6. **Fot/Vrist:** Vadpress (rak + böjd), Pogo Jumps

### Splitrekommendationer efter nivå:
- **Nybörjare (3x/vecka):** Helkroppspass A/B, fokus på baslyft
- **Medel (4x/vecka):** Upper/Lower split eller Push/Pull
- **Avancerad (5-6x/vecka):** Push/Pull/Legs (PPL) eller Arnold-split

### RPE/RIR-skala (använd för intensitetsangivelse):
| RPE | RIR | Beskrivning | Användning |
|-----|-----|-------------|------------|
| 6 | 4 | Lätt, hög stånghastighet | Uppvärmning, deload |
| 7 | 3 | Moderat, stången rör sig snabbt | Volymfas, accessories |
| 8 | 2 | Tungt men hanterbart, 2 reps kvar | Hypertrofi-huvudpass |
| 9 | 1 | Mycket tungt, 1 rep kvar | Max styrka, toppsats |
| 10 | 0 | Maximal ansträngning, failure | Undvik på fria vikter |

**Fasspecifik RPE:**
- AA/Deload: RPE 5-6 (4+ RIR)
- Hypertrofi: RPE 7-8.5 (1-3 RIR)
- Max Styrka: RPE 8-9.5 (0.5-2 RIR)
- Power: RPE 6-7 (3-4 RIR, fokus hastighet)

### Deload (OBLIGATORISKT var 3-5:e vecka):
- Minska volym 40-50% (halvera antal set)
- BEHÅLL intensiteten (samma RPE/vikt)
- Prioritera sömn, näring, rörlighet
- Nybörjare: var 4-5:e vecka | Medel: var 3-4:e vecka | Avancerad: var 3:e vecka

### 60-min sessionsstruktur:
1. **Uppvärmning (10 min):** RAMP-protokoll + specifik uppvärmning
2. **Compound-övningar (35 min):** 2-3 sammansatta övningar, tyngst först
3. **Accessories/isolation + core (10 min):** 2-3 isolationsövningar, supersets
4. **Cooldown (5 min):** Stretching + andningsövning

### Protein: 1.6-2.2 g/kg kroppsvikt per dag vid styrketräning

{{/endif}}

{{#if_category ENDURANCE}}
## KONDITIONSTRÄNING & ZONER

### 3-zon modell:
- **Zon 1 (Låg, <2 mmol/L):** Kan prata obehindrat, 55-75% maxHR → 75-80% av träningen
- **Zon 2 (Tröskel, 2-4 mmol/L):** Kan prata ansträngt, 75-88% maxHR → Minimera i basfas
- **Zon 3 (Hög, >4 mmol/L):** Kan inte prata, 88%+ maxHR → 15-20% av träningen

### Zonfördelning per metodik:
| Metodik | Zon 1 | Zon 2 | Zon 3 |
|---------|-------|-------|-------|
| Polariserad (80/20) | 80% | 0-5% | 15-20% |
| Pyramidal | 70-80% | 15-25% | 5-10% |
| Norsk dubbeltröskel | 75-80% | Huvudfokus | Ibland |

### Intervallprotokoll:
- **4×8 min:** 8 min arbete @ 90-92% maxHR, 2 min jogg vila (Seiler gold standard)
- **30/15 mikro:** 3 serier av (13×30s ON @ 110% vVO2max / 15s OFF), 3 min vila mellan
- **Cruise intervals:** 4-6×1 mile @ tröskeltempo, 1 min jogg vila
- **10-20-30:** Upprepade 10s sprint, 20s tempo, 30s jogg

### Viktiga begränsningar:
- **Långpass-tak:** Max 2.5-3h per pass (diminishing returns därefter)
- **Cardiac drift:** <5% = bra aerob bas, >10% = otillräcklig kondition

{{#if_methodology POLARIZED}}
### POLARISERAD METODIK (80/20):
- **80% av ANTAL PASS** (inte tid) ska vara Zon 1 — enkel, samtalstempo
- **20% av antal pass** Zon 3 — hög intensitet, intervaller
- **UNDVIK grey zone** — zon 2 ska vara max 5% av total träning
- **Gold standard:** 4×8 min intervaller @ 90-92% maxHR, 2 min aktiv vila
- Bygg aerob bas FÖRST, introducera intensitet gradvis
{{/endif}}

{{#if_methodology NORWEGIAN}}
### NORSK DUBBELTRÖSKEL:
- **2x tröskelpass per vecka** (clustered — AM + PM samma dag eller konsekutiva dagar)
- **AM-pass:** Långa intervaller 2-3 mmol/L laktat (tröskelarbete)
- **PM-pass:** Korta intervaller 3-4 mmol/L laktat (supratröskel)
- **Kräver 120+ km/vecka löpvolym** som bas
- Övrig träning: Zon 1 lätta pass
- Tröskelträning bygger mer mitokondrier per tidsenhet
{{/endif}}

{{#if_methodology CANOVA}}
### CANOVA-METODIK (Marathon):
- **Extension principle:** Förläng distansen på race pace, öka INTE tempot
- **Specialblock (double sessions):** AM: 15 km race pace, PM: 10 km steady
- **Taper:** Vecka 1: -20% volym, Vecka 2: -40%, Vecka 3: -60%
- **Simuleringspass:** Varje 3:e vecka — 30-35 km med race pace-insatser
- Börja med korta insatser vid marathontempo, förläng gradvis
{{/endif}}

{{/endif}}

{{#if_category HYBRID}}
## CONCURRENT TRAINING (STYRKA + KONDITION)

### Separation vid kombinerad träning:
- **Nybörjare:** Styrka och kondition på OLIKA dagar, minst 24h mellan
- **Medel:** Samma dag möjligt med 6-9h mellanrum. AM: Kondition, PM: Styrka
- **Avancerad:** Samma dag med 6h gap, styrka FÖRST om samtidigt

### Ordningsregel: Styrka FÖRST om samma dag, sedan lätt kondition 6-8h senare
### Proteinbehov: 1.6-2.2 g/kg kroppsvikt vid kombinerad träning

### HYROX-specifikt:
**Stationer och gymöverföring:**
- **Sled Push:** Deadmill pushes, tunga slädar, incline walking med västbel.
- **Sled Pull:** Sittande kabeldrag, roddmaskin burst intervals
- **Wall Balls:** Goblet squat + wall ball, thrusters
- **SkiErg:** SkiErg-intervaller, cable pulldowns med tempo
- **Farmers Carry:** Farmers walks med kettlebells/hantlar

**Pacingförsämring efter stationer:**
- Post-SkiErg: +0-5 sek/km
- Post-Sled Push: +15-30 sek/km (stor laktatansamling)
- Post-Burpees: +10-15 sek/km (maximal hjärtfrekvens)
- Post-Lunges (Sista): Överlevnadstempo

**Träna "compromised running"** — löpning på trötta ben efter tunga stationer

{{/endif}}

{{#if_category TEAM_SPORT}}
## LAGSPORT-PERIODISERING

### Match-day periodisering:
- **MD-3 (3 dagar före match):** Hög intensitet, styrka + explosivitet
- **MD-2:** Taktik + tempo, låg fysisk belastning
- **MD-1:** Aktivering, kort sprinträning, viloprioritering
- **MD+1 (dagen efter match):** Aktiv återhämtning, pool, lätt cykel

### Försäsong vs Insäsong:
- **Försäsong (6-8 veckor):** Fokus aerob bas, max styrka, hypertrofi
- **Insäsong:** Underhållsträning — 2 set/övning, 2x/vecka styrka, fokus explosivitet

### Nyckelkvaliteter:
- Sprint: 10-30m acceleration, repeated sprint ability (RSA)
- Explosivitet: Plyometri, CMJ, reaktiv styrka
- Kondition: Intervaller som speglar matchintensitet (4×4 min, 30/30)
- Styrka: Underhåll med 2-3 set av baslyft

{{/endif}}

---

## OUTPUT FORMAT

Svara ALLTID på svenska. Returnera ett komplett program som JSON:

\`\`\`json
{
  "name": "Programnamn",
  "description": "Kort beskrivning av programmet och dess syfte",
  "totalWeeks": {{totalWeeks}},
  "methodology": "{{methodology}}",
  "weeklySchedule": {
    "sessionsPerWeek": {{sessionsPerWeek}},
    "restDays": [0, 6]
  },
  "phases": [
    {
      "name": "Fasnamn (t.ex. Anatomisk Anpassning / Basfas / Hypertrofifas)",
      "weeks": "1-4",
      "focus": "Huvudfokus för fasen",
      "keyWorkouts": ["Nyckelpass 1", "Nyckelpass 2"],
      "volumeGuidance": "Total veckovolym och intensitetsfördelning",
      "weeklyTemplate": {
        "monday": {
          "type": "STRENGTH",
          "name": "Passnamn",
          "duration": 60,
          "intensity": "moderate",
          "description": "Detaljerad beskrivning med övningar, set, reps, vila, RPE",
          "segments": [
            {"order": 1, "type": "warmup", "duration": 10, "description": "RAMP: lätt cardio + dynamisk rörlighet + aktivering"},
            {"order": 2, "type": "work", "duration": 40, "description": "Huvudpass: Övning 1: 3x8 @ RPE 7, vila 90s. Övning 2: ..."},
            {"order": 3, "type": "cooldown", "duration": 10, "description": "Stretching + andningsövning"}
          ]
        },
        "tuesday": { "type": "REST", "description": "Vila eller lätt promenad" }
      }
    }
  ],
  "notes": "Generella kommentarer, progressionsregler, deload-schema"
}
\`\`\`

### VIKTIGA REGLER FÖR OUTPUT:
1. VARJE träningspass MÅSTE ha segments med warmup, work och cooldown
2. Var SPECIFIK med övningar, set, reps, tempo, vila och intensitet (RPE/RIR eller %1RM)
3. Inkludera vilodag(ar) i varje vecka
4. Ange progressionsregler i notes eller volumeGuidance
5. Anpassa efter erfarenhetsnivå — nybörjare får enklare övningar och längre vila
6. Inkludera deload-veckor i längre program (>6 veckor)
7. Säkerställ biomechanisk balans — både push/pull, bilateral/unilateral, anterior/posterior
8. Ange tempoangivelse för styrkeövningar (t.ex. 3-0-X)
`
