# Ergometertest / Ergometer Testing

## 1. Introduction: Principles of Ergometer-Based Assessment

Ergometertestning utgor ryggraden i fysiologisk prestandabedomning for uthallighetsidrottare, lagidrottare och funktionella fitnessutvoare. Till skillnad fran falttest erbjuder ergometrar en kontrollerad, reproducerbar miljo dar variabler som luftmotstand, underlag och vaader elimineras. Detta gor ergometerdata idealiska for longitudinell uppfoljning av traningsanpassning och for precise zonberakning.

For en AI-baserad traningsmotor ar ergometerdata sarskilt vardefulla eftersom de levererar objektiva wattvarden snarare an subjektiva anstrangningsnivaer. Watt ar en absolut maatenhet som inte paverkas av kroppsvikt, vaader eller dagsform pa samma satt som tid eller hastighet. Dock maste algoritmen forsta att wattproduktion pa en roddmaskin inte ar ekvivalent med watt pa en cykel eller SkiErg pa grund av skillnader i aktiv muskelmassa, mekanisk effektivitet och biomekaniska begransningar.

Denna kunskapsbank tacker testprotokoll for de vanligaste ergometrarna: Concept2 RowErg, Concept2 SkiErg, Concept2 BikeErg, Wattbike och Air Bikes (Assault/Echo). Varje protokoll beskrivs med standardisering, genomforande, resultatanalys och praktisk tillampning.

## 2. Concept2 RowErg: Test Protocols

### 2.1 The 2K Row Test (Standardized Performance Test)

2000-metertestet pa roddmaskin ar det mest etablerade prestandatestet inom roddvarlden och anvands brett aven utanfor rodden for allman aerob och anaerob kapacitetsbedomning.

**Fysiologisk profil:** Testet varar typiskt 6-8 minuter och representerar en intensitet strax over VO2max. Ungefar 75-80% av energin kommer fran aeroba system och 20-25% fran anaeroba. Det testar saledes bade maximal syreupptagning och glykolytisk kapacitet.

**Standardiseringskrav:**
- Drag factor: 120-130 for man, 110-120 for kvinnor (motsvarar ungefar dampare 5-6)
- Uppvarmning: 10 minuter rodd i lag intensitet (zon 1), 3x10 strakningar i okande fart, 2 minuters vila
- Miljo: 18-22 grader C, sval ventilation
- Forkontroller: Monitor nollstalld, PM5/PM3-kalibrering kontrollerad
- Foddehallare: Inspeckt just over tarna

**Genomforande:**
1. Stall in distans pa 2000 meter pa monitorn
2. Startkommando: "Ready, attention, row"
3. Strategi: Negativt split (andra halftan snabbare) rekommenderas for optimalt resultat
4. Typisk indelning: Forsta 500m 1-2 sek snabbare an jamnpace, mellersta 1000m i jamnpace, sista 500m allout

**Normativa varden (allman fitness, 2K tid):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit roddare | < 6:00 | < 6:50 |
| Valdigt bra | 6:00-6:30 | 6:50-7:30 |
| Bra | 6:30-7:15 | 7:30-8:15 |
| Medel | 7:15-8:00 | 8:15-9:00 |
| Nybojare | > 8:00 | > 9:00 |

**Resultatanalys:**
- Genomsnittlig watt beraknas automatiskt av PM5-monitorn
- Pace uttrycks som tid per 500 meter (split)
- Stroke rate: Optimal for 2K ar typiskt 28-34 slag/minut for tranlade, 24-28 for motionsroddare
- Jamfor med tidigare test for progressionsbedomning (watt ar battre an tid for jamforelse)

### 2.2 4x4 Minute Submaximal Interval Test

Det submaximala intervalltestet ar designat for att bedoma aerob kapacitet utan att krava maximal anstrangning. Det ar idealiskt for regelbunden uppfoljning under traningssasongen.

**Protokoll:**
1. **Steg 1:** 4 minuter vid 50% av 2K-watt (eller RPE 3/10)
2. **Steg 2:** 4 minuter vid 60% av 2K-watt (eller RPE 5/10)
3. **Steg 3:** 4 minuter vid 70% av 2K-watt (eller RPE 7/10)
4. **Steg 4:** 4 minuter vid 80% av 2K-watt (eller RPE 8-9/10)
- Vila mellan steg: 1 minut (rodd i mycket lag intensitet)

**Datainsamling:**
- Puls registreras kontinuerligt (pulsbelte, inte handled)
- Genomsnittlig watt per steg
- Slutpuls for varje steg
- Eventuellt: laktat fran fingertopp efter varje steg (1 minut in i vila)

**Resultatanalys:**
- Rita puls-watt-kurva: en vansterforskjutning over tid (lagre puls vid samma watt) indikerar forbattrad aerob kapacitet
- Deflection point i puls-watt-kurvan indikerar laktatroskel
- Jamfor steg 3-puls over tid for enkel progressionsspaning
- Om laktat matts: identifiera troskelwatt vid 2.0 mmol/L (LT1) och 4.0 mmol/L (LT2)

### 2.3 3-Minute All-Out Test (Critical Power / Anaerobic Capacity)

3-minuters all-out-testet ar en vetenskapligt validerad metod for att bestamma Critical Power (CP) och anaerob arbetskapacitet (W') i en enda testsession.

**Teoretisk bakgrund:**
Critical Power (CP) representerar den hogsta arbetsintensiteten som kan uppratthallas utan progressiv laktatackumulation - i princip laktatroskelns watt-ekvivalent. W' (uttalas "W-prime") representerar den totala mangden arbete som kan utforas ovanfor CP innan utmattning.

**Protokoll:**
1. Uppvarmning: 10 min rodd i lag intensitet + 3 spurter a 10 sek
2. Vila: 3 minuter
3. Teststart: All-out maximal anstrangning i exakt 3 minuter
4. Instruktion: "Ro sa hart du kan fran start och forsok halla hogsta mojliga watt hela tiden"
5. VIKTIGT: Atleten far inte "spara sig" - det maste vara genuint all-out fran forsta strakningarna

**Berakning:**
- **CP = Genomsnittlig watt under sista 30 sekunderna** (da W' ar i princip forbrukad)
- **W' = Total arbete (joule) ovanfor CP under 3 minuter**
- W' = (genomsnittlig watt for hela testet - CP) x 180 sekunder

**Typiska varden (RowErg):**

| Parameter | Valtranad man | Valtranad kvinna |
|---|---|---|
| CP | 250-350 W | 180-250 W |
| W' | 15,000-25,000 J | 10,000-18,000 J |

### 2.4 CP Test: 3 + 12 Minute Protocol

Det traditionella CP-testet anvander tva separata tidsprestationer (time trials) for att berakna CP och W' via linjar regression. Det ger en mer robust uppskattning an 3-minuters all-out men kraver tva separata maxanstrangningar.

**Protokoll:**
- **Test 1:** 3 minuters maximal anstrangning (maximal medelwatt)
- Vila: Minimum 30 minuter, helst separat dag
- **Test 2:** 12 minuters maximal anstrangning (maximal medelwatt)

**Berakning:**
$$CP = \frac{W_{12} \times t_{12} - W_{3} \times t_{3}}{t_{12} - t_{3}}$$

Dar W = genomsnittlig watt och t = tid i sekunder.

$$W' = t_{3} \times (W_{3} - CP)$$

**Fordelen** med detta protokoll ar att det ger en oberoende validering av CP-vaardet. Om CP beraknat fran 3-min och 12-min-test stammer overens med CP fran 3-min all-out-test, ar vardet robust.

## 3. Concept2 SkiErg: Test Protocols

### 3.1 1K SkiErg Test

SkiErg 1000-metertestet ar det standardiserade prestandatestet for overkroppsuthalliget och ar sarskilt relevant for langdskidakare, kajakpaddlare och funktionella fitnessutvoare.

**Standardisering:**
- Drag factor: 100-115 for man, 85-100 for kvinnor
- Startposition: Staende, hander ovanfor huvudet pa handtagen
- Teknik: Dubbelstakningsliknande rorelse med tyngdpunktsoverforing
- Uppvarmning: 5 min latt skidakning + 3x10 strakningar med okande fart

**Normativa varden (1K tid):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit | < 3:10 | < 3:40 |
| Valdigt bra | 3:10-3:30 | 3:40-4:00 |
| Bra | 3:30-4:00 | 4:00-4:30 |
| Medel | 4:00-4:30 | 4:30-5:00 |
| Nybojare | > 4:30 | > 5:00 |

### 3.2 4x4 Minute SkiErg Interval Test

Identiskt protokoll som for RowErg men anpassat for SkiErg:
- Steg baseras pa procent av 1K-watt (50%, 60%, 70%, 80%)
- Pulszoner ligger typiskt 3-5 slag lagre an vid rodd (mindre aktiv muskelmassa)
- Laktatrespons ar hogre vid samma relativa intensitet jamfort med rodd

## 4. Concept2 BikeErg: Test Protocols

### 4.1 MAP Ramp Test (Maximal Aerobic Power)

BikeErg lampar sig utmarkt for ramptest da wattmotstandet ar oberoende av trampfrekvens (till skillnad fran luftmotstand pa Air Bikes).

**Protokoll:**
1. Uppvarmning: 5 min vid 75-100 W (man) / 50-75 W (kvinnor)
2. Start: 100 W (man) / 75 W (kvinnor)
3. Okning: +25 W varje minut
4. Avslut: Nar atleten inte kan halla angiven trampfrekvens (>10 RPM under mal) i 5 sekunder
5. MAP = Hogsta watt som fullfoljdes i en hel minut

**Alternativt:** Om atleten misslyckas mitt i en minut:
$$MAP = W_{sista\_fulla} + 25 \times \frac{t_{ofullstandig}}{60}$$

### 4.2 FTP Estimation from MAP

Functional Threshold Power (FTP) kan uppskattas fran MAP:
$$FTP \approx MAP \times 0.72\text{ till }0.77$$

Faktorn beror pa atletens uthalliprofil: mer uthallighetsanpassade atleter har hogre kvot (0.77), mer sprintvana lagre (0.72).

## 5. Wattbike: Test Protocols and Power Profile

### 5.1 FTP Test (20-Minute Protocol)

**Protokoll:**
1. Uppvarmning: 15 minuter med 3x30 sek i zon 3
2. All-out: 20 minuter maximal jamn anstrangning
3. FTP = Genomsnittlig watt x 0.95

**Wattbikes unika bidrag - Pedaling Effectiveness:**
Wattbiken mater inte bara total wattproduktion utan aven kraftfordelningen genom trampcykeln. Polar View visar en kraftprofil som avsloojar:
- **Jordgubbsform:** Ideal - jamn kraftapplikation
- **Attsidesvald:** Hog kraft pa nertrampen, lag pa upptrampen - ineffektiv
- **Assymetrisk:** Skadeindicator - ett ben producerar betydligt mer kraft

### 5.2 6-Second Sprint Test (Peak Power)

**Protokoll:**
1. Startposition: 3-klockposition pa dominerande ben
2. Sittande start (ingen "resning")
3. Maximal sprint i 6 sekunder
4. Matvarden: Peak Power (hogsta watt), medelwatt

**Normativa varden (Peak Power):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit cyklist | > 1500 W | > 1000 W |
| Val tranad | 1200-1500 W | 800-1000 W |
| Tranad | 900-1200 W | 600-800 W |
| Motionsar | 600-900 W | 400-600 W |

## 6. Air Bikes: Assault and Echo Bike Protocols

### 6.1 Calibration and Standardization

Air Bikes ar fundamentalt annorlunda an andra ergometrar. Motstandet genereras av luftmotstand mot en flakt, vilket innebar att motstandet okar kubiskt med hastigheten (P proportionellt mot RPM^3).

**Maskinskillnader (kritiskt for jamforelse):**
- **Assault AirBike (kedjedrift):** Svanghjulet fortsatter snurra efter att atleten slutat trampa ("ghost riding"). Kalorier ackumuleras aven under passiv fas. Generellt 15-20% hogre kalorital an Echo Bike.
- **Rogue Echo Bike (remdrift):** Omedelbar deceleration. Ingen "ghost riding". Kalorier ackumuleras bara under aktiv anstrangning.

**Konverteringsformel:**
$$\text{Echo kalorier} \approx \text{Assault kalorier} \times 0.80$$

**Standardiseringskrav:**
- Sadelhojd: Hoflled i full extension vid nedre tramplage
- Armlaangd: Handtag i bekvalm raackhall vid full extension
- Samma maskin for alla test (Assault ELLER Echo, aldrig blnadat)

### 6.2 MAP Ramp Test for Air Bikes

**Protokoll:**
1. Uppvarmning: 3 min vid 30-40 RPM
2. Start: Man 40 RPM / Kvinnor 35 RPM
3. Okning: +3 RPM varje minut (alternativt watt-styrd okning om maskinen stodjer det)
4. Avslut: Nar RPM faller > 5 under mal i 10 sekunder
5. MAP = Hogsta genomsnittliga watt under en fullstandig minut

### 6.3 10-Minute Max Calorie Test

Ett populart funktionellt fitnesstest som fungerar som proxy for laktatroskel:

**Protokoll:**
1. 10 minuters maximal anstrangning for hogsta kalorital
2. Pacing ar kritiskt: borja 5-10% under forvantad jamnpace, oka sista 3 minuterna

**Normativa varden (10 min max cal, Assault Bike):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit funktionell fitness | > 250 cal | > 180 cal |
| Avancerad | 200-250 cal | 150-180 cal |
| Intermediar | 150-200 cal | 110-150 cal |
| Nybojare | < 150 cal | < 110 cal |

## 7. Drag Factor: Significance and Standardization

### 7.1 What is Drag Factor?

Drag factor ar ett maat pa luftmotstandet i Concept2-maskiner. Det bestams av damparpositionen men paverkas aven av:
- Maskinens rengoringstillstand (damm i flakthuset okar motstandet)
- Lufttemperatur och luftfuktighet
- Maskinens alder och slitage

**Kritisk insikt:** Dampare 5 pa en maskin ger INTE samma drag factor som dampare 5 pa en annan maskin. Darfor maste drag factor (inte dampare) standardiseras vid testning.

### 7.2 Setting Drag Factor

Pa Concept2 PM5:
1. Ga till "More Options" > "Display Drag Factor"
2. Ro/skida nagra strakningar
3. Avlas visad drag factor
4. Justera damparen tills onskat varde uppnas

**Rekommenderade drag factor-varden:**

| Maskin | Man | Kvinnor | Latt/Nybojare |
|---|---|---|---|
| RowErg | 120-130 | 105-120 | 95-105 |
| SkiErg | 100-115 | 85-100 | 75-85 |
| BikeErg | 80-100 | 65-85 | 55-65 |

### 7.3 Impact on Test Results

Hogre drag factor okar motstandet per strakningscykel men minskar svanghjulshastigheten. For kraftstarka, langsammare roddare kan hogre drag factor vara fordelaktigt. For ltta, snabba roddare ar lagre drag factor battre.

**Regel:** Drag factor maste vara identisk mellan test for jamforbarhet. Even small andring (t.ex. 120 vs 130) kan paverka 2K-tid med 3-5 sekunder.

## 8. Test Standardization: Environment and Protocol

### 8.1 Pre-Test Standardization

- **Kost:** Undvik tunga maltider 2-3 timmar fore test. Undvik alkohol 24h fore.
- **Somn:** Minimum 7 timmar natten fore.
- **Traning:** Ingen hog intensitet 48h fore maxtest, ingen traning 24h fore.
- **Koffein:** Standardisera: antingen alltid med eller alltid utan (1-3 mg/kg, 60 min fore test ar validerat).
- **Hydration:** Drick 500 ml vatten 2 timmar fore test.

### 8.2 Environmental Standardization

- **Temperatur:** 18-22 grader C ar optimalt
- **Ventilation:** Flakt riktad mot atleten (konsekvent placering)
- **Tid pa dygnet:** Testa alltid vid samma tid (prestationen varierar med 3-5% over dygnet, peak kl 15-18)
- **Uppvarmning:** Standardiserad (identisk varje gang)

### 8.3 Test Order for Battery Testing

Om flera test utfors samma dag:
1. **Forst:** Sprint/peak power-test (6 sek, kravs utvilad)
2. **Sedan:** Kort maxtest (3 min all-out, 1K) - 20 min vila efter sprint
3. **Sist:** Langre test (2K, FTP) - 30+ min vila efter korttestet
4. **ALDRIG:** Submaxtest fore maxtest (trotthet paverkar maximal prestation)

## 9. Results Analysis: CP, W', and Zone Calculation

### 9.1 Critical Power Model

CP-modellen delar upp atletens kapacitet i tva komponenter:

- **CP (Critical Power):** Watt som kan underhallas "indefinitely" (i praktiken 30-60 min). Representerar den aeroba troskelkapaciteten.
- **W' (W-prime):** Total mangd anaerobt arbete (i joule) tillgangligt ovanfor CP. Nar W' ar forbrukad = utmattning.

**Praktisk tolkning:**
- Hog CP + lag W': Uthallighetsatlet - stark aerob bas, begransad anaerob kapacitet
- Lag CP + hog W': Sprintatlet - bra explosivitet men begransad uthalighet
- Hog CP + hog W': Elitprestanda i bade korta och langa format

### 9.2 Zone Calculation from Ergometer Data

Fran CP kan traningszoner beraknas:

| Zon | Namn | Watt-range | Laktat-ekvivalent |
|---|---|---|---|
| Zon 1 | Aterhamtning | < 55% CP | < 1.5 mmol/L |
| Zon 2 | Grunduthalliget | 55-75% CP | 1.5-2.0 mmol/L |
| Zon 3 | Tempo | 75-90% CP | 2.0-3.5 mmol/L |
| Zon 4 | Troskel | 90-105% CP | 3.5-5.0 mmol/L |
| Zon 5 | VO2max | 105-120% CP | > 5.0 mmol/L |
| Zon 6 | Anaerob | > 120% CP | N/A (icke steady-state) |

**Alternativt fran FTP (20-min test):**

| Zon | Watt-range (% av FTP) |
|---|---|
| Zon 1 | < 56% FTP |
| Zon 2 | 56-75% FTP |
| Zon 3 | 76-90% FTP |
| Zon 4 | 91-105% FTP |
| Zon 5 | 106-120% FTP |
| Zon 6 | > 120% FTP |

### 9.3 Cross-Modality Translation

Watt pa olika ergometrar ar INTE direkt jamforbara. Typiska konverteringsfaktorer:

| Fran | Till | Faktor |
|---|---|---|
| RowErg CP | BikeErg CP | x 0.85-0.90 |
| RowErg CP | SkiErg CP | x 0.70-0.80 |
| Wattbike FTP | BikeErg FTP | x 0.95-1.00 |
| Air Bike MAP | RowErg MAP | x 0.60-0.70 |

Dessa faktorer ar approximativa och varierar beroende pa atletens kroppsammansattning och traningsbakgrund. En roddspecialist har hogre RowErg-till-BikeErg-kvot an en cyklist.

## 10. Team Leaderboards and Benchmarking

### 10.1 Normalization for Fair Comparison

For att skapa rattvisa teamjamforelser maste resultat normaliseras:

- **Watt per kilo (W/kg):** Standard for cykel och rodd. Gynnar latta atleter.
- **Absolut watt:** Relevant for rodd (tyngre = langre havaarm) och Air Bike.
- **Procentuell forbattring:** Idealiskt for teamtracking. Jamfor individen mot sig sjalv.
- **Z-score normalisering:** For att jamfora over ergometertyper: $z = (x - \mu) / \sigma$

### 10.2 Retest Frequency

| Testtyp | Rekommenderad frekvens | Anledning |
|---|---|---|
| 2K rodd maxtest | Var 8-12:e vecka | Hog belastning, kraver tapering |
| Submaximalt 4x4 | Var 4-6:e vecka | Lag belastning, kan goras i traning |
| 3-min all-out | Var 6-8:e vecka | Maximal anstrangning, kravs vila |
| 6-sek sprint | Var 4-6:e vecka | Minimal aterhamtningskostnad |
| FTP 20-min | Var 8-12:e vecka | Hog belastning |
| MAP ramp | Var 6-8:e vecka | Moderat belastning |

### 10.3 Progression Benchmarks

Forvantad forbattring for val strukturerad traning:

| Atletens niva | Forvantad forbattring/6 man | Forvantad forbattring/12 man |
|---|---|---|
| Nybojare | 10-20% | 15-30% |
| Intermediar | 5-10% | 8-15% |
| Avancerad | 2-5% | 4-8% |
| Elit | 0.5-2% | 1-3% |

**Praktisk riktlinje for AI-motorn:** Om en atlet inte visar progression pa 12 veckor trots regelbunden traning, bor systemet flagga for programjustering eller oovertraningscreeening.
