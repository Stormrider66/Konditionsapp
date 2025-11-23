# Cykelstöd - Implementeringssammanfattning

## Översikt
Komplett stöd för cykeltester har implementerats i konditionstest-appen med FTP-beräkningar, power zones och watt/kg-utvärdering.

## Skapade Filer

### 1. `/lib/calculations/cycling.ts` (171 rader)
Kärnan i cykelberäkningarna med följande funktioner:

- **`calculateFTP(anaerobicThreshold: Threshold): number`**
  - Beräknar FTP från anaerob tröskel (4 mmol/L laktat)
  - FTP = watt vid laktattröskel

- **`calculatePowerZones(ftp: number): PowerZone[]`**
  - Genererar 7 power zones baserat på FTP
  - Följer standard cykelträningsmodellen (Active Recovery → Neuromuscular)

- **`calculateWattsPerKg(power: number, weight: number): number`**
  - Beräknar effekt per kg kroppsvikt
  - Nyckeltal för att bedöma cykelprestation

- **`evaluateCyclingPower(wattsPerKg: number, age: number, gender: Gender): string`**
  - Bedömer cykelkraft baserat på W/kg och kön
  - Returnerar beskrivning från "Nybörjare" till "Elitnivå"

- **`calculateCyclingData(...): CyclingData`**
  - Huvudfunktion som samlar alla cykelberäkningar
  - Returnerar FTP, W/kg, zones och utvärdering

- **`calculateStageWattsPerKg(stages: TestStage[], weight: number): TestStage[]`**
  - Beräknar W/kg för varje teststeg
  - Används för detaljerad analys

### 2. `/components/charts/PowerChart.tsx` (219 rader)
Specialiserad visualisering för cykeltester:

- **Två diagram:**
  1. Effekt och Kadens (Watt, RPM, Puls)
  2. Effekt och Laktat (Watt, mmol/L, W/kg)

- **Features:**
  - FTP-referenslinje (gul streckad linje)
  - Dubbla Y-axlar för olika mätvärden
  - Responsiv design med Recharts
  - Hover-tooltips med all data

### 3. `/app/cycling-test/page.tsx` (179 rader)
Demo-sida för cykeltester:

- **Sample Data:**
  - Kvinnlig cyklist: Emma Andersson, 37 år, 62 kg
  - 6 teststeg: 100W → 250W
  - Realistiska värden för laktat, puls, kadens
  - FTP ~210W (3.39 W/kg) = Vältränad nivå

- **Funktionalitet:**
  - En-klick rapport-generering
  - Visar förväntade resultat innan test
  - Print/PDF-export
  - Fullständig rapport med alla cykel-features

### 4. `/CYCLING-SUPPORT.md` (188 rader)
Omfattande dokumentation:

- Funktionsbeskrivningar
- Power zones-tabell med % FTP
- W/kg bedömningskriterier för män och kvinnor
- Användningsinstruktioner
- Teknisk implementation-guide
- Beräkningsexempel
- Jämförelse löpning vs cykling
- Referenser till standardverk

### 5. `/test-cycling.js` (159 rader)
Verifieringsskript för att testa beräkningar:

- 3 testfall:
  1. Kvinnlig vältränad (210W, 62kg → 3.39 W/kg)
  2. Manlig motionär (220W, 85kg → 2.59 W/kg)
  3. Manlig elit (400W, 72kg → 5.56 W/kg)

- Verifierar:
  - FTP-beräkningar
  - W/kg-beräkningar
  - Power zones-generering
  - Könsbaserad utvärdering

## Modifierade Filer

### 1. `/types/index.ts`
**Tillagda interfaces:**

```typescript
export interface PowerZone {
  zone: number          // 1-7
  name: string         // "Active Recovery", etc
  percentMin: number   // % av FTP
  percentMax: number
  powerMin: number     // watt
  powerMax: number
  description: string
}

export interface CyclingData {
  ftp: number              // Functional Threshold Power
  wattsPerKg: number       // Genomsnittlig W/kg
  powerZones: PowerZone[]  // 7 zoner
  evaluation: string       // Bedömning
}
```

**Uppdaterad interface:**
```typescript
export interface TestCalculations {
  // ... befintliga fält
  cyclingData?: CyclingData  // Nytt!
}
```

### 2. `/lib/calculations/index.ts`
**Tillagda imports:**
```typescript
import { calculateCyclingData, calculateStageWattsPerKg } from './cycling'
```

**Ny logik i performAllCalculations():**
```typescript
// Cykeldata (endast för cykling)
let cyclingData
if (test.testType === 'CYCLING') {
  cyclingData = calculateCyclingData(
    stages,
    anaerobicThreshold,
    client.weight,
    age,
    client.gender
  )

  // Beräkna watt/kg för alla stages
  const stagesWithWattsPerKg = calculateStageWattsPerKg(stages, client.weight)
  test.testStages = stagesWithWattsPerKg
}
```

**Uppdaterad return:**
```typescript
return {
  // ... befintliga fält
  cyclingData,  // Nytt!
}
```

### 3. `/components/reports/ReportTemplate.tsx`
**Nya imports:**
```typescript
import { PowerChart } from '../charts/PowerChart'
```

**Nya sektioner:**

1. **Cykel-specifika resultat (rad 104-120):**
   - FTP-box (gul)
   - W/kg-box (lila)
   - Bedömnings-box (indigo)

2. **Conditional diagram (rad 226-234):**
   ```typescript
   {test.testType === 'CYCLING' ? (
     <PowerChart
       data={test.testStages}
       ftp={calculations.cyclingData?.ftp}
       powerZones={calculations.cyclingData?.powerZones}
     />
   ) : (
     <TestChart data={test.testStages} testType={test.testType} />
   )}
   ```

3. **Power Zones-tabell (rad 237-270):**
   - Visas endast för CYCLING
   - 7 zoner med %, watt-intervall och beskrivningar
   - Snygg tabellformatering

## Testresultat

### Verifiering av Beräkningar
```bash
$ node test-cycling.js
✅ FTP-beräkningar fungerar
✅ Watt/kg-beräkningar fungerar
✅ Power zones genereras korrekt
✅ Utvärdering baserad på kön fungerar
```

### Demo-sida Exempel
**URL:** `http://localhost:3000/cycling-test`

**Resultat för Emma Andersson (62 kg):**
- FTP: 210W
- W/kg: 3.39
- Bedömning: "Vältränad - Mycket god cykelkraft"
- Power Zones:
  - Zon 1: 0-116W (Recovery)
  - Zon 2: 118-158W (Endurance)
  - Zon 3: 160-189W (Tempo)
  - Zon 4: 191-221W (Threshold) ← FTP här
  - Zon 5: 223-252W (VO2max)
  - Zon 6: 254-315W (Anaerobic)
  - Zon 7: 317-420W (Sprint)

## Användning

### 1. Besök Demo-sidan
```bash
npm run dev
# Gå till http://localhost:3000/cycling-test
```

### 2. Skapa Eget Cykeltest
```typescript
const stages = [
  { power: 100, cadence: 90, heartRate: 125, lactate: 1.5 },
  { power: 150, cadence: 92, heartRate: 142, lactate: 2.1 },
  // ... fler steg
]

const test = {
  testType: 'CYCLING',
  testStages: stages,
  // ...
}
```

### 3. Generera Rapport
```typescript
const calculations = await performAllCalculations(test, client)
// calculations.cyclingData innehåller FTP, zones, etc
```

## Krav Uppfyllda

✅ **Alla cykelberäkningar implementerade**
- FTP från anaerob tröskel
- Power zones (7-zonsmodell)
- W/kg för alla stages
- Utvärdering baserad på kön och ålder

✅ **Power zones med FTP**
- 7 standardzoner
- Baserat på % av FTP
- Watt-intervall för varje zon
- Beskrivande namn och användning

✅ **Dedikerad cykelrapport**
- Smart conditional rendering i ReportTemplate
- Cykel-specifika resultatboxar
- Power zones-tabell
- FTP prominent

✅ **Diagram för effektkurva**
- PowerChart med dubbla vyer
- Effekt, kadens, puls, laktat, W/kg
- FTP-referenslinje
- Professionell visualisering

✅ **Validering och exempel-data**
- Realistisk sample data
- Demo-sida med förklaringar
- Testskript för verifiering

✅ **TypeScript strict**
- Alla nya interfaces definierade
- Type-safe funktioner
- Korrekt export/import

✅ **Testad med sample data**
- 3 testfall verifierade
- Demo-sida fungerar
- Beräkningar korrekta

## Sammanfattning

### Statistik
- **Nya filer:** 5 (cycling.ts, PowerChart.tsx, page.tsx, 2x .md)
- **Modifierade filer:** 3 (types, calculations/index, ReportTemplate)
- **Nya funktioner:** 6 i cycling.ts
- **Nya interfaces:** 2 (PowerZone, CyclingData)
- **Kodrader totalt:** ~750 nya rader

### Nyckelfeatures
1. FTP-beräkning från laktattröskel
2. 7-zons power zones
3. W/kg-utvärdering könsbaserad
4. Dubbla cykeldiagram
5. Komplett rapportintegration
6. Demo-sida med sample data

### Teknisk Implementation
- Clean code med TypeScript strict
- Separation of concerns
- Återanvändbar kod
- Conditional rendering för flexibilitet
- Professional chart library (Recharts)

### Dokumentation
- Omfattande CYCLING-SUPPORT.md
- Inline kommentarer i kod
- Exempel och användningsfall
- Jämförelse med löpning

## Nästa Steg (Framtida Förbättringar)

1. **Effektprofil-analys**
   - 5s, 1min, 5min, 20min max power
   - Identifiera styrkor/svagheter

2. **Comparison Feature**
   - Jämför med andra cyklister
   - Percentile-ranking

3. **Progress Tracking**
   - FTP-utveckling över tid
   - Säsongsjämförelser

4. **Aerodynamik**
   - W/CdA beräkningar
   - Effektivitetsanalys

5. **Träningsplanering**
   - Automatiska träningspass baserat på FTP
   - Periodisering

---

**Status:** ✅ KOMPLETT IMPLEMENTERING KLAR

**Testresultat:** ✅ ALLA TESTER PASSED

**Dokumentation:** ✅ FULLSTÄNDIG
