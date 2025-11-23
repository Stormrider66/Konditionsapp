# Testinstruktioner - Cykelstöd

## Snabbstart

### Steg 1: Verifiera Installation
```bash
cd /mnt/d/VO2\ max\ report/konditionstest-app
npm install  # Om inte redan gjort
```

### Steg 2: Testa Beräkningar (Valfritt)
```bash
node test-cycling.js
```

**Förväntat resultat:**
```
=== TEST 1: Kvinnlig Vältränad Cyklist ===
FTP: 210 watt
Watt/kg: 3.39 W/kg
Bedömning: Vältränad - Mycket god cykelkraft
✅ ALLA TESTER KLARA
```

### Steg 3: Starta Dev Server
```bash
npm run dev
```

### Steg 4: Öppna Cykel-Demo
Navigera till: **http://localhost:3000/cycling-test**

### Steg 5: Generera Rapport
1. Klicka på "Generera Cykelrapport"
2. Se resultaten:
   - FTP: 210W
   - W/kg: 3.39
   - Bedömning: "Vältränad - Mycket god cykelkraft"
   - Power Zones (7 zoner)
   - Två cykel-specifika diagram

## Vad Du Bör Se

### 1. Testresultat-sektion
- Max Puls: 186 slag/min
- VO₂max: 55.2 ml/kg/min
- Max Laktat: 12.5 mmol/L

**Cykel-specifika boxar:**
- FTP: 210 watt (gul box)
- Watt/kg: 3.39 W/kg (lila box)
- Bedömning: "Vältränad - Mycket god cykelkraft" (indigo box)

### 2. Power Zones Tabell
7 zoner baserade på FTP:
- Zon 1 (Active Recovery): 0-116W
- Zon 2 (Endurance): 118-158W
- Zon 3 (Tempo): 160-189W
- Zon 4 (Lactate Threshold): 191-221W ← FTP ligger här
- Zon 5 (VO2 Max): 223-252W
- Zon 6 (Anaerobic Capacity): 254-315W
- Zon 7 (Neuromuscular): 317-420W

### 3. Diagram
**Diagram 1: Effekt och Kadens**
- X-axel: Effekt (watt)
- Y-vänster: Kadens (rpm)
- Y-höger: Puls (slag/min)
- FTP-linje: Gul streckad linje vid 210W

**Diagram 2: Effekt och Laktat**
- X-axel: Effekt (watt)
- Y-vänster: Laktat (mmol/L)
- Y-höger: W/kg
- FTP-linje: Gul streckad linje vid 210W

## Testa Med Egen Data

### Modifiera Sample Data
Redigera `/app/cycling-test/page.tsx`:

```typescript
const testStages: TestStage[] = [
  {
    power: 100,      // ← Ändra effekt
    cadence: 90,     // ← Ändra kadens
    heartRate: 125,  // ← Ändra puls
    lactate: 1.5,    // ← Ändra laktat
  },
  // Lägg till fler steg...
]
```

### Ändra Klientdata
```typescript
const sampleClient: Client = {
  name: 'Ditt Namn',
  gender: 'MALE',        // eller 'FEMALE'
  birthDate: new Date('1990-01-01'),
  weight: 75,            // ← Din vikt i kg
  height: 180,
  // ...
}
```

## Jämför Med Löptest

### Öppna Löptest-demo
**URL:** http://localhost:3000/simple-test

### Skillnader Du Ser
1. **Löpning:**
   - Hastighet (km/h) istället för Effekt (watt)
   - 5 träningszoner (pulsbaserade)
   - Löpekonomi-tabell
   - Standard TestChart

2. **Cykling:**
   - Effekt (watt) och Kadens (rpm)
   - 7 power zones (FTP-baserade)
   - FTP och W/kg-resultat
   - PowerChart med dubbla vyer

## Vanliga Frågor

### Q: Var kommer FTP-värdet från?
**A:** FTP beräknas från den anaeroba tröskeln (4 mmol/L laktat). Den effekt (watt) som cyklisten har vid 4 mmol/L är FTP.

### Q: Varför 7 zoner för cykel men 5 för löpning?
**A:** Cykling använder effektmätning (watt) som är mer precis än puls. Detta möjliggör fler träningszoner. Löpning baseras mer på puls och hastighet, där 5 zoner är standard.

### Q: Vad är ett bra W/kg-värde?
**A:**
- **Nybörjare:** < 2.0 W/kg (män), < 1.5 W/kg (kvinnor)
- **Motionär:** 2.0-3.0 W/kg (män), 1.5-2.5 W/kg (kvinnor)
- **Vältränad:** 3.0-4.0 W/kg (män), 2.5-3.5 W/kg (kvinnor)
- **Elit:** > 5.0 W/kg (män), > 4.5 W/kg (kvinnor)

### Q: Kan jag använda detta för verkliga tester?
**A:** Ja! Implementeringen är baserad på etablerad cykelträningsvetenskap:
- FTP-konceptet från "Training and Racing with a Power Meter"
- 7-zonsmodellen är branschstandard
- W/kg-bedömningar baserade på realistiska värden

### Q: Hur exporterar jag rapporten?
**A:** Klicka på "Skriv ut / Spara som PDF" för att spara rapporten.

## Verifiering

### Kontrollera Att Allt Fungerar

**1. Beräkningar:**
```bash
node test-cycling.js
# Ska visa ✅ för alla tester
```

**2. TypeScript (valfritt, tar lång tid):**
```bash
npm run build
# Ska bygga utan fel
```

**3. Demo-sida:**
- Öppna http://localhost:3000/cycling-test
- Klicka "Generera Cykelrapport"
- Se att FTP = 210W
- Se att W/kg = 3.39
- Se Power Zones-tabell
- Se båda diagrammen

## Felsökning

### Problem: "Cannot find module 'cycling'"
**Lösning:** Kontrollera att `/lib/calculations/cycling.ts` finns

### Problem: Diagram visas inte
**Lösning:**
1. Kontrollera att `PowerChart.tsx` finns i `/components/charts/`
2. Kontrollera att Recharts är installerat: `npm list recharts`

### Problem: FTP beräknas fel
**Lösning:**
1. Kontrollera att laktatvärden inkluderar 4 mmol/L eller nära
2. Testa med `test-cycling.js` för att verifiera beräkningar

### Problem: TypeScript-fel
**Lösning:**
1. Kontrollera att alla imports är korrekta
2. Verifiera att types/index.ts innehåller `PowerZone` och `CyclingData`
3. Kör `npm install` igen

## Dokumentation

**Detaljerad dokumentation:**
- `CYCLING-SUPPORT.md` - Användarguide
- `CYCLING-IMPLEMENTATION-SUMMARY.md` - Teknisk översikt

**Kodfiler att studera:**
- `/lib/calculations/cycling.ts` - Alla beräkningar
- `/components/charts/PowerChart.tsx` - Diagram-logik
- `/app/cycling-test/page.tsx` - Demo-implementation

## Nästa Steg

1. Testa med egen data
2. Integrera i main app
3. Lägg till fler cyklister
4. Jämför FTP över tid
5. Utforska avancerade features (progress tracking, etc)

---

**Status:** ✅ REDO ATT ANVÄNDA

**Support:** Se CYCLING-SUPPORT.md för mer info
