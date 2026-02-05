# Cykelträning / Cycling Training

## Introduction

Cykling är unikt bland uthållighetssporterna tack vare den exakta kvantifierbarheten av prestation genom wattmätare (power meters). Ingen annan sport tillåter så precis monitorering av träningsbelastning och prestationsutveckling i realtid. Functional Threshold Power (FTP), Critical Power (CP), powerzonmodeller och Training Stress Score (TSS) ger cykelträare och idrottare ett kraftfullt ramverk för träningsplanering och -uppföljning.

Denna kunskapsbas täcker fysiologiska principer, träningsmetodik, testning, näring och tävlingsförberedelse för cykling, från amatörnivå till elit.

---

## Functional Threshold Power (FTP)

### Definition

FTP definieras som den högsta genomsnittliga effekten (watt) som en cyklist kan upprätthålla i en approximativt steady-state under 60 minuter (Coggan & Allen, 2010). FTP approximerar mjölksyratröskeln (MLSS - Maximal Lactate Steady State).

### Testmetoder

**20-minuters test (standard):**
1. 20 min uppvärmning (progressiv)
2. 5 min all-out (rensa benen, aktivera anaerobt system)
3. 10 min återhämtning
4. 20 min all-out (jämn pacing)
5. FTP = 20-min genomsnittswatt × 0.95

**Ramp test (alternativ):**
1. Börja vid låg watt (ex. 100W)
2. Öka med 20W per minut till utmattning
3. FTP = Sista slutförda minutens watt × 0.75
4. Snabbare, men mindre noggrant för alla cyklisttyper

**60-minuters test (guldstandard):**
- Full 60-minuters time trial
- Genomsnittswatt = FTP direkt
- Krävande och opraktiskt för de flesta

**8-minuters test:**
1. Två 8-minuters all-out insatser med vila emellan
2. FTP = Bästa 8-min genomsnitt × 0.90
3. Lämpar sig för de som kämpar med pacing på 20 minuter

### FTP-normer

| Nivå | Män (W/kg) | Kvinnor (W/kg) |
|------|-----------|---------------|
| Nybörjare | 1.5-2.5 | 1.2-2.0 |
| Rekreation | 2.5-3.5 | 2.0-2.8 |
| Avancerad amatör | 3.5-4.2 | 2.8-3.5 |
| Elit amatör | 4.2-5.0 | 3.5-4.2 |
| Professionell | 5.0-6.5 | 4.2-5.5 |

---

## Critical Power (CP) Model

### Definition och Relation till FTP

Critical Power (CP) är den asymptotiska effekten som en cyklist teoretiskt kan upprätthålla på obestämd tid utan att ackumulera trötthet. CP bestäms genom matematisk modellering av flera maximala insatser vid olika durationer (typiskt 3, 7 och 12 minuter). Till skillnad från FTP, som baseras på ett enskilt test, bygger CP på en tvåparametersmodell som ger både CP och W' (W prime).

**Relation till FTP:**
- CP ligger typiskt 3-8% högre än FTP (Brickley et al., 2002)
- FTP underskattar ofta den verkliga tröskeln hos vältränade cyklister
- CP anses fysiologiskt mer välgrundad eftersom den baseras på hela power-duration-förhållandet
- I praktiken används FTP bredare på grund av enklare testning

### W' (W prime) - Anaerob Arbetskapacitet

W' representerar den finita mängden arbete (i kilojoule) som kan utföras ovanför CP innan utmattning. Tänk på W' som en "energireservoar" ovanför tröskeln:

- **Typiska W'-värden:** 10-25 kJ för tränade cyklister
- **Förbrukning:** W' förbrukas exponentiellt vid arbete ovanför CP
- **Återfyllning:** W' återfylls under arbete under CP, men inte fullständigt under korta viloperidoder
- **Intervalldesign:** W' styr hur länge en cyklist kan arbeta ovanför CP och hur lång vila som krävs

**Praktisk tillämpning för intervalldesign:**
- Korta VO2max-intervaller (3 min @ 120% FTP): Förbrukar ~40-60% av W' per intervall
- Längre tröskelhållsintervaller (8 min @ 105% FTP): Förbrukar nästan hela W'
- Vilolängd bör tillåta minst 50-70% W'-återfyllning för produktiva intervaller
- Cyklister med låg W' bör undvika ryckig pacing i tävling

---

## Power Zone Models

### Coggan 7-Zone Model

Mest använda modellen i strukturerad cykelträning:

| Zon | Namn | % FTP | Karaktär |
|-----|------|-------|----------|
| Z1 | Active Recovery | < 55% | Återhämtning, lätt cykling |
| Z2 | Endurance | 56-75% | Aerob grundträning, lång duration |
| Z3 | Tempo | 76-90% | "Sweet spot" närliggande, kontrollerat hårt |
| Z4 | Lactate Threshold | 91-105% | FTP-arbete, 8-30 min intervaller |
| Z5 | VO2max | 106-120% | Hög syreupptagning, 3-8 min intervaller |
| Z6 | Anaerobic Capacity | 121-150% | Korta explosiva insatser, 30s-3min |
| Z7 | Neuromuscular Power | > 150% | Maximal sprint, <30s |

### Seiler 3-Zone Model

Baserad på Stephen Seilers forskning om intensitetsfördelning:

| Zon | Namn | Markör |
|-----|------|--------|
| Zon 1 | Low Intensity | Under VT1 (ventilatory threshold 1) |
| Zon 2 | Threshold | Mellan VT1 och VT2 |
| Zon 3 | High Intensity | Över VT2 |

**Polariserad fördelning:** 80% Zon 1, 0-5% Zon 2, 15-20% Zon 3

### Sweet Spot

"Sweet spot" är intervallet 84-97% av FTP (överlapp Coggan Z3-Z4). Populärt för att:
- Ge hög träningseffekt per tidsenhet
- Vara hållbart för längre intervaller (10-30 min)
- Minimera återhämtningskostnaden jämfört med ren FTP-träning
- Särskilt värdefullt för tidsbegränsade cyklister

---

## Normalized Power, Variability Index and Intensity Factor

### Normalized Power (NP) - Beräkning och Betydelse

Normalized Power är ett viktat effektmedelvärde som bättre reflekterar den fysiologiska kostnaden av ett cykelpass än enkelt medelvärde. NP tar hänsyn till att den metabola kostnaden av variabel effekt är högre än konstant effekt vid samma medelvärde.

**Beräkningssteg:**
1. Gör ett 30-sekunders rullande medelvärde av effektdata
2. Höj varje värde till fjärde potensen
3. Beräkna medelvärdet av alla fjärdepotenserna
4. Ta fjärderoten ur resultatet

**Varför NP är viktigt:**
- Ett pass med ojämn pacing (backar, stopp, fartändringar) har högre NP än genomsnittseffekt
- NP ger en rättvis jämförelse mellan ett kuperat lopp och en platt TT
- TSS baseras på NP, inte genomsnittseffekt, vilket ger mer korrekt belastningskvantifiering

### Variability Index (VI)

VI = NP / genomsnittseffekt. Variability Index kvantifierar hur jämn pacingen var under ett pass:

| VI | Tolkning |
|----|----------|
| 1.00-1.02 | Mycket jämn pacing (ERG-mode, flat TT) |
| 1.02-1.06 | Bra pacing, måttlig variation |
| 1.06-1.13 | Kuperad terräng eller oregelbunden fart |
| > 1.13 | Mycket variabel (kriterium, MTB) |

**Praktisk tillämpning:**
- Vid time trials bör VI vara <1.05 för optimal prestation
- Hög VI i ett lopp där det kunde ha pacerats jämnare indikerar taktiska misstag
- I gruppåkning är hög VI oundviklig men bör minimeras genom smart positionering

### Intensity Factor (IF)

IF = NP / FTP. Ger en snabb överblick över hur intensivt passet var relativt FTP:

| IF | Typiskt pass |
|----|-------------|
| < 0.75 | Återhämtning, lätt Z2 |
| 0.75-0.85 | Uthållighetspass, lång tur |
| 0.85-0.95 | Tempo, sweet spot |
| 0.95-1.05 | Tröskelarbete, kort tävling |
| > 1.05 | Intervaller, kort intensivt lopp |

---

## W/kg: Weight-Normalized Power

### Betydelse

W/kg (watt per kilogram kroppsvikt) är det viktigaste prestationsmåttet i cykling, särskilt för:

- **Klättringsförmåga:** Gravitationens inverkan gör att W/kg är avgörande
- **Jämförelser mellan cyklister:** En lätt cyklist med 250W kan vara snabbare uppför än en tung med 300W
- **Prestationsutveckling:** Ger en mer rättvis bild än råa watt, särskilt vid viktförändringar

### Beräkning vid klättring

```
Hastighet uppför ~ (Power - Rolling resistance - Aero drag) / (Massa * Gravity * Gradient)
```

Vid branta backar (>5%) dominerar W/kg över aerodynamik. Vid flack terräng dominerar råa watt och aerodynamik.

---

## Pedaling Dynamics

### Vänster/Höger-Balans

De flesta wattmätare med dubbelsidiga sensorer mäter kraftfördelning mellan vänster och höger ben:

- **Idealt:** 50/50 fördelning (±2%)
- **Normalt:** Upp till 52/48 anses normalt
- **Obalans >55/45:** Bör utredas, kan indikera skada, svaghet eller biomekanisk asymmetri
- **OBS:** Balansen varierar med intensitet och trötthet - analysera vid stabil steady-state

### Pedalslänthet (Pedal Smoothness)

Pedal smoothness mäter hur jämnt kraft appliceras genom hela pedalvarvet (0-360°):
- Höga värden (>20%) indikerar mer cirkulär trampning
- Låga värden indikerar "stamping"-mönster med kraft mest i nedtryckningen
- Professionella cyklister har typiskt 18-25% pedal smoothness
- Förbättras med enbenstrampning och fokusövningar

### Torque Effectiveness

Torque effectiveness mäter andelen av pedalvarvet där positiv kraft produceras:
- Mäts som procentandel av positiv vs negativ kraftapplikation
- Värden >60% anses bra för stillastående cykling
- Vid hög kadens minskar typiskt torque effectiveness
- Cleat-position och sadelposition påverkar torque effectiveness

---

## Indoor Training: ERG Mode and Specificity

### ERG-mode

ERG-mode på smarta trainers låser effekten vid ett målvärde oavsett kadens:
- Trampar man långsammare ökar motståndet
- Trampar man snabbare minskar motståndet
- Fördelar: Exakt watt-styrning, omöjligt att "fuska"
- Nackdelar: Kan vara för rigid, missar naturliga kraftvariationer

### Inomhus vs utomhus

- Inomhus: Kontrollerat, effektivt, väderberoende
- Power är vanligtvis 5-15% lägre inomhus än utomhus (värme, ventilation, monotoni)
- Justera zonerna 5-10% nedåt för inomhus-FTP om testat utomhus

### Plattformar

- **Zwift:** Gamifierad träning med virtuell värld
- **TrainerRoad:** Strukturerade träningsplaner, adaptivt
- **Wahoo SYSTM:** Videobaserade pass med proffsscener
- **Rouvy:** AR-rutter från verkliga vägar

---

## Power Meter Types / Wattmätartyper

### Jämförelse

| Typ | Placering | Noggrannhet | Fördelar | Nackdelar |
|-----|-----------|------------|----------|-----------|
| Crankarm (Stages, 4iiii) | Vänster crankarm | ±1.5-2% | Prisvärd, lätt att flytta | Ensidig mätning (dubblar vänster), missar obalans |
| Dubbelsidig crank (Shimano, SRAM) | Båda crankarmar | ±1-1.5% | V/H-balans, hög noggrannhet | Dyrare, krävs kompatibel vev |
| Spider (Quarq, Power2Max) | Kedjekransspindel | ±1-1.5% | Total kraftmätning, robust | Pris, kompatibilitet |
| Pedaler (Garmin Rally, Favero Assioma) | Pedalerna | ±1-1.5% | Lätt att flytta mellan cyklar, V/H-balans | Kräver kompatibla skor/cleats |
| Nav (PowerTap) | Bakhjulsnav | ±1.5% | Mäter all kraft som når hjulet | Bunden till ett hjul, tunga |
| Trainer (Wahoo, Tacx) | Smart trainer | ±2-3% | Inget extra köp om man har trainer | Bara inomhus, lägre noggrannhet |

**Rekommendation:** Pedalbaserade wattmätare erbjuder bäst flexibilitet för cyklister med flera cyklar. Spider-baserade ger högst noggrannhet. Ensidiga crankarmsbaserade är bästa budget-alternativet men dubblerar data från ett ben.

**Kalibrering:** Nollställ (zero offset) före varje pass. Temperaturförändringar påverkar mätningen - kalibrera utomhus efter att utrustningen acklimatiserats.

---

## Lab Testing for Cyclists / Labbtestning för Cyklister

### VO2max-testning

Cyklister testar VO2max på cykelergometer med stegrat protokoll:
- Börjar vid ~100W, ökar med 25-30W var 3:e minut
- Mäter gasutbyte, hjärtfrekvens och upplevd ansträngning (RPE)
- VO2max-värden för cyklister: 50-60 ml/kg/min (amatör), 70-85 ml/kg/min (professionell)
- Testar även VT1 och VT2 (ventilatoriska trösklar) för exakt zonindelning

### Laktattestning

Stegvis laktattest ger mer detaljerad tröskelbestämning:
- Blodprov (örsnibb) vid varje steg
- Identifierar LT1 (aerob tröskel, ~2 mmol/L) och LT2 (anaerob tröskel, ~4 mmol/L eller D-max)
- Mer exakt för zonindelning än FTP-test
- Rekommenderas 2-3 gånger per år för seriösa cyklister

### Kroppskomposition

- DEXA-scanning ger noggrann fetttprocentsmätning och regional analys
- Professionella cyklister: 6-10% kroppsfett (män), 12-18% (kvinnor)
- Viktminskning bör ske under basperioden, inte under tävlingssäsongen
- Relativ effektökning (W/kg) kan uppnås genom både ökad kraft och minskad vikt

---

## Typical Training Sessions

### Sweet Spot Intervals
- **2x20 min @ 88-93% FTP** med 5 min vila
- Byggs upp från 2x10, 2x15, 2x20, 3x15, 3x20
- Grundpassen för att bygga FTP över tid

### Over-Unders
- **4x10 min (2 min @ 95% FTP + 1 min @ 105% FTP, upprepat)**
- Tränar laktattolerans och clearance vid tröskelintensitet
- Simulerar racesituationer med accelerationer

### VO2max Intervals
- **5x5 min @ 106-120% FTP** med 5 min aktiv vila
- Maximal stimulering av central och perifer syreupptagning
- Brutalt effektivt för VO2max-förbättring

### Tempo Rides
- **60-90 min @ 76-85% FTP** (Z3)
- Lång kontinuerlig belastning, bygger aerob uthållighet
- Mentalt krävande men fysiologiskt hållbart

### Sprint Intervals
- **8x30 sek all-out** med 4.5 min vila
- Neuromuskulär power och anaerob kapacitet
- Låt kadenserna gå över 110 rpm för maximal effekt

### Endurance Rides
- **2-5 timmar @ 56-75% FTP** (Z2)
- Grundpelaren i all cykelträning
- Bygger mitokondriell densitet, fettoxidationskapacitet, kardiovaskulär anpassning
- Minst 60-70% av total träningsvolym

### Recovery Rides / Återhämtningspass

Återhämtningspass är ofta de pass som cyklister utför felaktigt - för hårt. En korrekt återhämtningstur ska vara genuint lätt:

- **Effekt:** <55% FTP (Z1), idealt 40-50% FTP
- **Duration:** 30-60 minuter (aldrig mer)
- **Kadens:** 85-95 rpm, lätt trampning
- **Hjärtfrekvens:** <65% av maxpuls
- **Upplevd ansträngning:** Ska kunna föra full konversation utan problem
- **Terräng:** Platt eller lätt kuperat, undvik backar som kräver ansträngning
- **Timing:** Dagen efter hårda intervaller eller tävling

**Vanligt misstag:** Många cyklister cyklar återhämtningspass i Z2 (56-75% FTP) vilket ger bristfällig återhämtning utan att vara tillräckligt stimulerande för anpassning. Om det känns "för lätt" gör du rätt.

---

## Periodization for Cycling

### Base Phase (Aerob volym) - 8-12 veckor

- Fokus på Z2-volym (80%+ av total tid)
- Gradvis volymbygge: 5-10% per vecka
- Styrketräning i gymmet: 2-3 pass/vecka (squat, leg press, core)
- Begränsade intervaller: 1 pass/vecka max, lågintensivt

### Build Phase (Sweet spot/tröskelarbete) - 6-8 veckor

- Introducera sweet spot och tröskelintervaller
- Behåll Z2-volym som bas
- 2-3 kvalitetspass/vecka
- Reducera styrketräning till 1-2 pass/vecka (underhåll)

### Peak Phase (Racesspecifikt) - 3-4 veckor

- Specifika intervaller för måltävling
- VO2max-arbete för korta lopp, sweet spot/FTP för längre
- Reducera volym 20-30%, behåll intensitet
- Öppna benen med korta sprints och raceliknande insatser

### Tapering

- Sista veckan: 40-60% av normal volym
- Behåll 2-3 korta, skarpa intervaller
- Extra vila, fokus på näring och hydrering
- Dag före tävling: lätt, 30-45 min med några korta öppnare

### Detaljerad Årsplan med Volymmål

| Period | Veckor | Timmar/vecka | Intensitetsfördelning | Fokus |
|--------|--------|-------------|----------------------|-------|
| Off-season | 4-6 | 4-6h | 100% Z1-Z2 | Vila, styrka, cross-training |
| Base 1 (tidig bas) | 4-6 | 6-8h | 90% Z1-Z2, 10% Z3 | Volymbygge, styrketräning 3x/v |
| Base 2 (sen bas) | 4-6 | 8-12h | 85% Z1-Z2, 10% Z3, 5% Z4+ | Längre pass, sweet spot intro |
| Build 1 | 3-4 | 10-14h | 75% Z1-Z2, 15% Z3-Z4, 10% Z5+ | Tröskelarbete, VO2max intro |
| Build 2 | 3-4 | 10-14h | 70% Z1-Z2, 15% Z4, 15% Z5+ | Specifika intervaller, tävlingssimuleringar |
| Peak | 2-3 | 8-10h | 75% Z1-Z2, 10% Z4, 15% Z5+ | Racespecifik intensitet, volymreduktion |
| Taper | 1-2 | 4-6h | 80% Z1-Z2, 20% Z4-Z5 | Vila, skarpa öppnare |
| Tävling | Variabel | 6-10h | Tävlingsberoende | Prestera, underhåll |

**Notera:** Timmar/vecka varierar stort med ambitionsnivå. Amatörer med begränsad tid kan halvera dessa volymer och fortfarande utvecklas med korrekt intensitetsfördelning.

---

## Power Profile: Sprint to Hour Power

### Konceptet

En cyklists "power profile" är deras maximala genomsnittliga watt över olika tidsperioder:

| Duration | Energisystem | Muskelfibertyp |
|----------|-------------|----------------|
| 5 sek | Neuromuskulär (ATP-PCr) | Type IIx |
| 1 min | Anaerob kapacitet (glykolys) | Type IIa |
| 5 min | VO2max (aerob power) | Type I + IIa |
| 20 min | FTP-approximation | Type I |
| 60 min | FTP/MLSS | Type I |

### Användning

- **Identifiera styrkor:** Hög 5-sek power = sprinter, hög 20-min = time trialist, hög 5-min = klättrare
- **Träningsrekommendation:** Fokusera på svagheter för allround, styrkor för specialisering
- **Tävlingsval:** Sprinter-profil → kriterium, klättrarprofil → bergsetapper

### Mean Maximal Power (MMP) Curve

MMP-kurvan plottar bästa watt över alla tidsperioder (1s till 5h). Över säsongen bör kurvan lyftas uppåt (förbättring på alla tidsskalor). En kurva som förbättras på ett ställe men försämras på ett annat indikerar obalans i träning.

---

## TSS, CTL, ATL: Training Stress Score Model

### Training Stress Score (TSS)

TSS kvantifierar träningsbelastningen för ett enskilt cykelpass:

```
TSS = (Duration_sek * NP * IF) / (FTP * 3600) * 100
```

Där:
- **NP (Normalized Power):** Viktat genomsnitt som reflekterar den fysiologiska kostnaden bättre än enkelt genomsnitt
- **IF (Intensity Factor):** NP / FTP

**Riktmärken:**
| TSS | Återhämtning |
|-----|-------------|
| < 150 | Låg belastning, snabb återhämtning |
| 150-300 | Medel, trötthet nästa dag |
| 300-450 | Hög, trötthet 2-3 dagar |
| > 450 | Extremt, trötthet upp till 5 dagar |

### Chronic Training Load (CTL) = "Fitness"

42-dagars exponentiellt viktat rullande medelvärde av daglig TSS.
- Högre CTL = högre träningsanpassning/fitness
- Byggs gradvis: max 5-7 TSS/vecka i CTL-ökning

### Acute Training Load (ATL) = "Fatigue"

7-dagars exponentiellt viktat rullande medelvärde av daglig TSS.
- Högre ATL = mer akut trötthet
- Reagerar snabbare än CTL på träningsändringar

### Training Stress Balance (TSB) = "Form"

```
TSB = CTL - ATL
```

- **TSB positiv (> +10):** Utvilad, redo för prestation. För högt = detrained.
- **TSB runt 0:** Funktionellt tränat, balanserat.
- **TSB negativ (< -10):** Overreached, hög trötthet. Nödvändigt för träningsanpassning.
- **TSB < -30:** Risk för överträning eller sjukdom.

### Praktisk användning

- **Tävlingsberedskap:** Planera tapering så TSB är +10 till +25 på tävlingsdagen
- **Träningsperioder:** Build-perioder med TSB -10 till -30 i 2-3 veckor, följt av återhämtningsvecka
- **Övervakning:** Om ATL > 1.5 * CTL, risk för överbelastning (korrelerar med ACWR > 1.5)

---

## Nutrition for Cycling / Näring för Cykling

### Kolhydrater under Cykling

Modern forskning har dramatiskt ändrat rekommendationerna för kolhydratintag under prestation:

| Passlängd | Kolhydratbehov | Källa |
|-----------|---------------|-------|
| < 60 min | Inget nödvändigt | Vatten räcker |
| 60-90 min | 30 g/h | Sportdryck eller gel |
| 90-150 min | 60 g/h | Gel + dryck, eller bar + dryck |
| 150-180 min | 60-80 g/h | Multipla transportabla kolhydrater (glukos + fruktos) |
| > 180 min | 80-120 g/h | Glukos:fruktos 2:1 eller 1:0.8, kräver tarmträning |

**Tarmträning:** Höga kolhydratintag (>60 g/h) kräver systematisk tarmträning under 2-4 veckor. Börja med 40 g/h och öka gradvis med 10 g/h per vecka. Använd samma produkter i träning som i tävling.

### Hydrering

- **Grundregel:** 500-800 ml/h beroende på värme och svettmängd
- **Elektrolyter:** Natrium 500-1000 mg/L i sportdrycken
- **Viktförlust:** Acceptabel dehydrering upp till 2% av kroppsvikten under lopp. Överviktning (hyperhydrering) ger mag-tarmproblem.

### Daglig Näring för Cyklister

- **Hög träningsdag (3+ timmar):** 8-12 g kolhydrater/kg/dag
- **Medel träningsdag (1-2 timmar):** 5-7 g kolhydrater/kg/dag
- **Vilodag:** 3-5 g kolhydrater/kg/dag
- **Protein:** 1.6-2.0 g/kg/dag, jämnt fördelat över 4-5 måltider
- **Carb loading:** 10-12 g/kg/dag i 24-48h före viktig tävling

---

## Cycling Position and Aerodynamics

### Aerodynamisk påverkan

Luftmotstånd står för 80-90% av motståndet vid >30 km/h på plan väg. Cykelposition är den största påverkande faktorn:

- **CdA (Drag coefficient × frontal area):** Måttet på aerodynamiskt motstånd
- **Typiska CdA-värden:**
  - Upprest position: 0.35-0.40 m²
  - Race-position (drops): 0.28-0.32 m²
  - TT-position (aerostyre): 0.22-0.27 m²
  - Pro TT (optimerad): 0.20-0.23 m²

### Positionsoptimering

- **Sadelhöjd:** Knävinkel 25-35 grader vid nedre dödpunkt
- **Reach:** Armlängd till styrhandtag, påverkar ryggens vinkel
- **Drop:** Höjddifferens sadel till styre, mer drop = mer aero men kräver flexibilitet
- **Bike fit:** Professionell fitting rekommenderas för att balansera aerodynamik, komfort och kraftproduktion

---

## Gravel and Cyclocross Training / Grus- och Cyclocrossträning

### Specifika Krav

Gravel och cyclocross ställer unika krav som skiljer sig från landsvägscykling:

- **Varierande underlag:** Grus, lera, sand, singel kräver högre W/kg och teknisk skicklighet
- **Intensitetsprofil:** Mer stokastisk (ryckig) effektprofil med högre VI
- **Överkropp:** Större krav på överkroppsstyrka för styrning och vibrationsmotstånd
- **Av-på-cykel (CX):** Hinder, löpning med cykel, start/stopp kräver anaerob kapacitet

### Träningsanpassningar

- **Intervalltyp:** Korta VO2max-intervaller (30/30, 40/20) simulerar bättre racedynamik
- **Teknikträning:** Dedikerade teknikpass med kurvtagning, lösa underlag, barriärövning (CX)
- **Styrketräning:** Prioritera överkropp och core mer än rena landsvägsåkare
- **Uthållighet:** Gravelrace kan vara 4-12 timmar, kräver solid Z2-bas och nutritionsstrategi
- **Ekipering:** Träna med tävlingsdäck och tryck för att vänja sig vid känsla och rullmotstånd

---

## Climate Adaptation

### Värmeacklimatisering

Prestation försämras avsevärt i värme (>30°C):
- Ökad hjärtfrekvens vid given power
- Minskad FTP med 5-10% vid >35°C
- Ökad dehydreringsrisk

**Acklimatiseringsprotokoll:**
- 10-14 dagar i värme för full anpassning
- Alternativt: 5-7 dagars värmeexponering (bastu, överdressing under träning)
- Effekter: ökad plasmavolym, tidigarelagd svettning, lägre kroppstemperatur

### Höjdträning

Höjdträning kan ge betydande prestationsvinster för cyklister genom ökad hemoglobinmassa och syretransportkapacitet:

- Över 1500m påverkas syresättning
- FTP minskar med ca 1-2% per 300m över 1500m
- **Live High, Train Low (LHTL):** Bo på >2000m, träna på <1200m
- Alternativt: Höjdtält för nattlig hypoxisk exponering
- Optimal exponering: 3-4 veckor på 2000-2500m

**Detaljerade riktlinjer:**
- **Första veckan:** Reducera träningsintensitet med 10-15%, kroppen anpassar sig
- **EPO-respons:** Erytropoetin ökar inom 24h, hemoglobinökning mätbar efter 2-3 veckor
- **Hemma-alternativ:** Hypoxiska tält (simulerad höjd 2500-3000m), 10-12h/natt, minst 28 nätter
- **Tidslinje efter höjdvistelse:** Prestationstopp typiskt 2-3 veckor efter nedstigning
- **Individuell respons:** Ca 50% av atleter är "responders" - mät retikulocyter och hemoglobinmassa för att bekräfta
- **Järnstatus:** Kontrollera ferritin före höjdläger - ferritin >30 μg/L rekommenderas, supplementera vid behov

---

## Race Preparation

### Tempo / Time Trial

- Jämn pacing är optimalt för platt TT
- Negativ split (första halvan 1-2% under FTP, andra halvan FTP+) för kuperad TT
- Aerodynamisk position är prioritet
- Recea kursen i förväg för att lära sig vägar och kurvor

### Criterium

- Snabba accelerationer, hög anaerob kapacitet krävs
- Positionering i klungan är avgörande
- Sprint-finish: timing, drafting, acceleration
- Träning: korta intervaller, sprint, taktisk medvetenhet

### Climbing / Hill Races

- W/kg är avgörande
- Pacing uppför: jämn power, acceptera variabel hastighet
- Viktkontroll vs styrka-balans
- Specifik klättringsträning: repeterande längre klättringsintervaller (10-20 min)

---

## Key Terminology

| Svenska | English | Definition |
|---------|---------|------------|
| Funktionell tröskeleffekt | Functional Threshold Power (FTP) | Högsta hållbara effekt i ~60 minuter |
| Kritisk effekt | Critical Power (CP) | Asymptotisk effekt från power-duration-modellen |
| W' (W prim) | W prime | Finit arbetskapacitet ovanför CP (kJ) |
| Powerzon | Power zone | Intensitetsintervall baserat på procent av FTP |
| Normaliserad effekt | Normalized Power (NP) | Viktat genomsnitt som reflekterar fysiologisk kostnad |
| Variabilitetsindex | Variability Index (VI) | NP/genomsnittseffekt, mäter pacing-jämnhet |
| Intensitetsfaktor | Intensity Factor (IF) | NP/FTP ratio för ett pass |
| Träningsbelastningspoäng | Training Stress Score (TSS) | Kvantifiering av total passbelastning |
| Kronisk träningsbelastning | Chronic Training Load (CTL) | 42-dagars rullande träningsbelastning ("fitness") |
| Akut träningsbelastning | Acute Training Load (ATL) | 7-dagars rullande träningsbelastning ("trötthet") |
| Träningsbalans | Training Stress Balance (TSB) | CTL - ATL ("form") |
| Kraftprofil | Power profile | Bästa watt över olika tidsperioder |
| Maximal genomsnittseffekt | Mean Maximal Power (MMP) | Bästa genomsnittswatt för varje tidsduration |
| Luftmotstånd | Aerodynamic drag | Motstånd från luft vid cykling |
| Kadens | Cadence | Pedalvarv per minut (rpm) |
| Trampeffektivitet | Torque effectiveness | Andel av pedalvarvet med positiv kraft |
| Pedaljämnhet | Pedal smoothness | Jämnhet i kraftapplikation under pedalvarvet |
| Wattmätare | Power meter | Sensor som mäter effekt i watt |
| Aerob tröskel | Aerobic threshold (VT1/LT1) | Första ventilatoriska/laktattröskeln |
| Anaerob tröskel | Anaerobic threshold (VT2/LT2) | Andra ventilatoriska/laktattröskeln |
| Syreupptagning | VO2max | Maximal syreupptagningsförmåga |

---

## References and Evidence Base

Denna kunskapsbas bygger på forskning från:
- Coggan A, Allen H (2010): Training and Racing with a Power Meter (3rd Edition)
- Seiler S (2010): What is best practice for training intensity and duration distribution?
- Jeukendrup AE (2017): Periodized nutrition for athletes
- Martin JC et al. (2007): Validation of a mathematical model for road cycling power
- Sanders D, Myers T, Akubat I (2017): Training-intensity distribution in road cyclists
- Pinot J, Grappe F (2015): A 6-year monitoring case study of a top-10 cycling Grand Tour finisher
- Brickley G, Doust J, Williams CA (2002): Physiological responses during exercise to exhaustion at critical power
- Jones AM, Vanhatalo A (2017): The critical power concept: Applications to sports performance
- Skiba PF et al. (2012): Modeling the expenditure and reconstitution of work capacity above critical power
- Asker E. Jeukendrup (2014): A step towards personalized sports nutrition: carbohydrate intake during exercise
- Thomas DT, Erdman KA, Burke LM (2016): American College of Sports Medicine Joint Position Statement: Nutrition and Athletic Performance
- Mujika I, Padilla S (2001): Physiological and performance characteristics of male professional road cyclists
- Passfield L et al. (2017): Knowledge is power: Issues of measuring training and performance in cycling
- Maunder E et al. (2021): The cycling power profile: predictive modelling of race performance
- Chapman RF et al. (2014): Defining the dose of altitude training: how high to live for optimal sea level performance enhancement
- Gore CJ et al. (2013): Altitude training and haemoglobin mass from the optimised carbon monoxide rebreathing method
