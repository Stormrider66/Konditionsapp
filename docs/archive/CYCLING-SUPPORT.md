# Cykeltest-stöd i Konditionstest-appen

Applikationen har nu fullt stöd för cykeltester med FTP-beräkningar, power zones och watt/kg-utvärdering.

## Funktioner

### 1. FTP-beräkningar (Functional Threshold Power)
- FTP beräknas automatiskt från den anaeroba tröskeln (4 mmol/L laktat)
- FTP motsvarar effekten vid laktattröskel
- Används som bas för alla power zones

### 2. Power Zones (7-zonsmodell)
Applikationen använder den etablerade 7-zonsmodellen för cykling:

| Zon | Namn | % av FTP | Beskrivning |
|-----|------|----------|-------------|
| 1 | Active Recovery | 0-55% | Aktiv återhämtning |
| 2 | Endurance | 56-75% | Grundträning, LSD |
| 3 | Tempo | 76-90% | Tempo, aerob kapacitet |
| 4 | Lactate Threshold | 91-105% | Laktattröskel, sweet spot |
| 5 | VO2 Max | 106-120% | VO2 max intervaller |
| 6 | Anaerobic Capacity | 121-150% | Anaerob kapacitet |
| 7 | Neuromuscular | 151-200% | Sprint, neuromuskulär |

### 3. Watt/kg Utvärdering
Applikationen bedömer cykelkraft baserat på watt per kg kroppsvikt:

**Män:**
- < 2.0 W/kg: Nybörjare
- 2.0-3.0 W/kg: Motionär
- 3.0-4.0 W/kg: Vältränad
- 4.0-5.0 W/kg: Mycket vältränad (tävlingsnivå)
- \> 5.0 W/kg: Elitnivå

**Kvinnor:**
- < 1.5 W/kg: Nybörjare
- 1.5-2.5 W/kg: Motionär
- 2.5-3.5 W/kg: Vältränad
- 3.5-4.5 W/kg: Mycket vältränad (tävlingsnivå)
- \> 4.5 W/kg: Elitnivå

### 4. Cykel-specifika Diagram
Två specialiserade diagram för cykeltester:
- **Effekt och Kadens**: Visar effekt (W), kadens (rpm) och puls
- **Effekt och Laktat**: Visar effekt (W), laktat (mmol/L) och watt/kg

Båda diagrammen visar FTP som referenslinje.

## Användning

### Demo-sida
Besök `/cycling-test` för att se en komplett cykeltest-demo med realistisk data:
- Sample data: Kvinnlig cyklist, 62 kg
- Test: 6 steg från 100W till 250W
- FTP: ~200-210W (3.2-3.4 W/kg)
- Nivå: Vältränad

### Skapa eget cykeltest
```typescript
const testStages: TestStage[] = [
  {
    duration: 4,
    heartRate: 125,
    lactate: 1.5,
    power: 100,
    cadence: 90,
  },
  // ... fler steg
]

const test: Test = {
  testType: 'CYCLING',
  testStages,
  // ... övriga fält
}
```

## Teknisk Implementation

### Nya filer
1. **`lib/calculations/cycling.ts`**
   - `calculateFTP()` - Beräkna FTP från tröskel
   - `calculatePowerZones()` - Generera 7 power zones
   - `calculateWattsPerKg()` - Beräkna watt/kg
   - `evaluateCyclingPower()` - Bedöm cykelkraft
   - `calculateCyclingData()` - Huvudfunktion för alla cykelberäkningar

2. **`components/charts/PowerChart.tsx`**
   - Visualisering av effekt, kadens, puls och laktat
   - FTP-referenslinje
   - Dubbla y-axlar för olika mätvärden

3. **`app/cycling-test/page.tsx`**
   - Demo-sida för cykeltester
   - Realistisk sample data
   - Komplett rapport-generering

### Uppdaterade filer
1. **`types/index.ts`**
   - Nya interfaces: `PowerZone`, `CyclingData`
   - Utökad `TestCalculations` med `cyclingData`

2. **`lib/calculations/index.ts`**
   - Integration av cykelberäkningar
   - Automatisk watt/kg-beräkning för alla stages

3. **`components/reports/ReportTemplate.tsx`**
   - Conditional rendering för cykel vs löpning
   - FTP-visning
   - Power zones-tabell
   - PowerChart för cykeltester

## Rapportinnehåll för Cykeltest

En cykelrapport innehåller:
1. Klientinformation (namn, ålder, vikt, etc)
2. Testresultat
   - Max puls
   - VO2max
   - Max laktat
   - **FTP (watt)**
   - **Watt/kg**
   - **Bedömning av cykelkraft**
3. Tröskelvärden (aerob och anaerob i watt)
4. Träningszoner (pulsbaserade)
5. **Power Zones (FTP-baserade, 7 zoner)**
6. **Cykel-specifika diagram**

## Beräkningsexempel

För ett test där laktattröskel (4 mmol/L) ligger vid 210W:
- **FTP**: 210W
- **För cyklist på 62 kg**: 3.39 W/kg
- **Bedömning**: "Vältränad - Mycket god cykelkraft"

**Power Zones:**
- Zon 1 (Recovery): 0-116W
- Zon 2 (Endurance): 118-158W
- Zon 3 (Tempo): 160-189W
- Zon 4 (Threshold): 191-221W ← FTP här
- Zon 5 (VO2max): 223-252W
- Zon 6 (Anaerobic): 254-315W
- Zon 7 (Sprint): 317-420W

## Skillnader Löpning vs Cykling

| Aspekt | Löpning | Cykling |
|--------|---------|---------|
| Tröskelindikator | km/h vid 4 mmol/L | Watt vid 4 mmol/L (FTP) |
| Huvudzoner | 5 pulszoner | 7 power zones |
| Nyckeltal | Löpekonomi (ml/kg/km) | Watt/kg |
| Diagram | Hastighet-laktat-puls | Effekt-laktat-kadens |
| Träningsrekommendation | Baserad på puls och hastighet | Baserad på FTP och watt |

## Framtida förbättringar
- Effektprofil-analys (5s, 1min, 5min, 20min power)
- Comparison med andra cyklister
- Seasongsuppföljning av FTP
- Watts per CdA (aerodynamisk effektivitet)
- Effektbaserad träningsplanering

## Referenser
- Hunter Allen & Andrew Coggan: "Training and Racing with a Power Meter"
- 7-zonsmodellen är standard inom modern cykelträning
- FTP-test är guldstandard för cyklister
