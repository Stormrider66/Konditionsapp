# Ergometertest / Ergometer Testing

## 1. Introduction: Principles of Ergometer-Based Assessment

Ergometertestning utgor ryggraden i fysiologisk prestandabedomning for uthallighetsidrottare, lagidrottare och funktionella fitnessutvoare. Till skillnad fran falttest erbjuder ergometrar en kontrollerad, reproducerbar miljo dar variabler som luftmotstand, underlag och vaader elimineras. Detta gor ergometerdata idealiska for longitudinell uppfoljning av traningsanpassning och for precise zonberakning.

For en AI-baserad traningsmotor ar ergometerdata sarskilt vardefulla eftersom de levererar objektiva wattvarden snarare an subjektiva anstrangningsnivaer. Watt ar en absolut maatenhet som inte paverkas av kroppsvikt, vaader eller dagsform pa samma satt som tid eller hastighet. Dock maste algoritmen forsta att wattproduktion pa en roddmaskin inte ar ekvivalent med watt pa en cykel eller SkiErg pa grund av skillnader i aktiv muskelmassa, mekanisk effektivitet och biomekaniska begransningar.

Denna kunskapsbank tacker testprotokoll for de vanligaste ergometrarna: Concept2 RowErg, Concept2 SkiErg, Concept2 BikeErg, Wattbike och Air Bikes (Assault/Echo). Varje protokoll beskrivs med standardisering, genomforande, resultatanalys och praktisk tillampning.

## 2. Concept2 PM5 Display: Metrics and Interpretation

### 2.1 PM5 Monitor Overview

Concept2 PM5-monitorn levererar realtidsdata som ar central for bade testning och traning. Forstaelse av varje matvardes betydelse ar avgurande for korrekt testning.

**Primare matvarden:**

| Matvarde | Enhet | Beskrivning |
|---|---|---|
| Pace / Split | tid/500m | Tid att ro/skida 500 meter vid aktuell intensitet. Primara prestandamatet. |
| Watts | W | Mekanisk effekt. Beraknas fran svanghjulets retardation. |
| Stroke Rate / SPM | slag/min | Strakningscykler per minut. Hogre ar inte alltid battre. |
| Calories/hour | cal/h | Uppskattad energiforbrukning. OBS: Concept2:s formel overskattar for latta och underskattar for tunga. |
| Heart Rate | bpm | Visas om pulsbelte ar anslutet via ANT+ eller Bluetooth. |

**Sekundara matvarden (via menyn):**

| Matvarde | Betydelse |
|---|---|
| Drive Length | Langd pa dragfasen (meter). Optimal for rodd: 1.3-1.5 m. |
| Drive Time | Tid for dragfasen. Kortare relativt aterhamtningsfasen = battre ratio. |
| Drag Factor | Aktuellt luftmotstand (se sektion 7). |
| Force Curve | Kraftapplikation genom strakningscykeln. Jamn, bred kurva ar idealet. |

### 2.2 Interpreting Force Curves

PM5 kan visa en kraftkurva for varje strakning - ett vaardefullt diagnostiskt verktyg:
- **Jamn, bred kurva (klockform):** Optimal kraftapplikation
- **Smal, hog topp:** Explosivt men kort drag - vanligt hos styrketranade utan roddteknik
- **Dubbeltopp:** "Lucka" i kraftkedjan, ofta dalig rygg-ben-koordination
- **Avfallande kurva:** Kraftforlust i slutet av draget - utmattning eller for hog drag factor

### 2.3 Pace vs Watts

Watt rekommenderas for testning da relationen pace-watt ar kubisk:
$$\text{Watts} = 2.80 / (\text{pace i sekunder per 500m} / 500)^3$$

En forbattring fran 2:00 till 1:55 pace representerar en mycket storre wattforhoojning an fran 2:10 till 2:05. Watt ger en linjar och rattvisande jamforelse over tid.

## 3. Concept2 RowErg: Test Protocols

### 3.1 The 2K Row Test (Standardized Performance Test)

2000-metertestet ar det mest etablerade prestandatestet inom roddvarlden och anvands brett for allman aerob och anaerob kapacitetsbedomning.

**Fysiologisk profil:** Testet varar typiskt 6-8 minuter vid intensitet strax over VO2max. Ungefar 75-80% aerob energi, 20-25% anaerob.

**Standardiseringskrav:**
- Drag factor: 120-130 for man, 110-120 for kvinnor (ungefar dampare 5-6)
- Uppvarmning: 10 min zon 1, 3x10 strakningar i okande fart, 2 min vila
- Miljo: 18-22 grader C, sval ventilation
- Foddehallare: Inspeckt just over tarna

**Genomforande:**
1. Stall in 2000 meter pa monitorn
2. Startkommando: "Ready, attention, row"
3. Strategi: Negativt split rekommenderas
4. Typisk indelning: Forsta 500m 1-2 sek snabbare an jamnpace, mellersta 1000m i jamnpace, sista 500m allout

**Normativa varden (allman fitness, 2K tid):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit roddare | < 6:00 | < 6:50 |
| Valdigt bra | 6:00-6:30 | 6:50-7:30 |
| Bra | 6:30-7:15 | 7:30-8:15 |
| Medel | 7:15-8:00 | 8:15-9:00 |
| Nybojare | > 8:00 | > 9:00 |

**Normativa varden uppdelade pa alder och kon (Concept2 rankingdata):**

| Aldersgrupp | Man (Bra) | Man (Elit) | Kvinnor (Bra) | Kvinnor (Elit) |
|---|---|---|---|---|
| 19-29 | 6:30-7:00 | < 6:10 | 7:30-8:00 | < 7:00 |
| 30-39 | 6:40-7:15 | < 6:20 | 7:40-8:15 | < 7:10 |
| 40-49 | 6:55-7:30 | < 6:35 | 8:00-8:40 | < 7:30 |
| 50-59 | 7:10-7:50 | < 6:50 | 8:20-9:00 | < 7:50 |
| 60-69 | 7:30-8:15 | < 7:10 | 8:50-9:30 | < 8:15 |
| 70+ | 8:00-9:00 | < 7:40 | 9:20-10:15 | < 8:50 |

*Tungvikt (>75 kg kvinnor / >85 kg man) tenderar att ha snabbare absoluttider, medan lattviktare presterar battre i W/kg.*

**Resultatanalys:**
- Genomsnittlig watt beraknas automatiskt av PM5
- Pace uttrycks som tid per 500 meter (split)
- Stroke rate: 28-34 slag/min for tranlade, 24-28 for motionsroddare
- Jamfor watt (inte tid) mellan testtillfallen for rattvis progressionsbedomning

### 3.2 4x4 Minute Submaximal Interval Test

Designat for att bedoma aerob kapacitet utan maximal anstrangning. Idealiskt for regelbunden uppfoljning.

**Protokoll:**
1. **Steg 1:** 4 min vid 50% av 2K-watt (RPE 3/10)
2. **Steg 2:** 4 min vid 60% av 2K-watt (RPE 5/10)
3. **Steg 3:** 4 min vid 70% av 2K-watt (RPE 7/10)
4. **Steg 4:** 4 min vid 80% av 2K-watt (RPE 8-9/10)
- Vila mellan steg: 1 minut

**Datainsamling:** Puls kontinuerligt (brostrem), genomsnittlig watt per steg, slutpuls per steg, eventuellt laktat.

**Resultatanalys:**
- Puls-watt-kurva: vansterforskjutning over tid = forbattrad aerob kapacitet
- Deflection point indikerar laktatroskel
- Om laktat matts: identifiera troskelwatt vid 2.0 mmol/L (LT1) och 4.0 mmol/L (LT2)

### 3.3 3-Minute All-Out Test (Critical Power / Anaerobic Capacity)

Vetenskapligt validerad metod for att bestamma CP och W' i en enda session.

**Protokoll:**
1. Uppvarmning: 10 min lag intensitet + 3 spurter a 10 sek
2. Vila: 3 minuter
3. All-out maximal anstrangning i exakt 3 minuter
4. VIKTIGT: Genuint all-out fran forsta strakningarna - atleten far inte "spara sig"

**Berakning:**
- **CP = Genomsnittlig watt under sista 30 sekunderna**
- **W' = (medelwatt hela testet - CP) x 180 sek**

**Typiska varden (RowErg):**

| Parameter | Valtranad man | Valtranad kvinna |
|---|---|---|
| CP | 250-350 W | 180-250 W |
| W' | 15,000-25,000 J | 10,000-18,000 J |

### 3.4 CP Test: 3 + 12 Minute Protocol (Monod Model)

Tva separata time trials for CP/W' via linjar regression. Bygger pa Monod och Scherrer (1965):

$$W = CP \times t + W'$$

**Protokoll:**
- **Test 1:** 3 min maximal anstrangning
- Vila: Minimum 30 min, helst separat dag
- **Test 2:** 12 min maximal anstrangning

**Berakning:**
$$CP = \frac{W_{12} \times t_{12} - W_{3} \times t_{3}}{t_{12} - t_{3}}$$
$$W' = t_{3} \times (W_{3} - CP)$$

**Validering:** Berakna forvantad tid for en kand prestation med $t = W' / (P - CP)$. Om den stammer inom 2-3% ar modellpassningen god.

**Begransningar:** Modellen antar att CP kan underhallas indefinitivt (i verkligheten 20-40 min). Rekommenderat forhallande mellan testvaraktigheter: minst 1:3.

## 4. Concept2 SkiErg: Test Protocols

### 4.1 1K SkiErg Test

Standardiserat prestandatest for overkroppsuthalliget - relevant for langdskidakare, kajakpaddlare och funktionell fitness.

**Standardisering:**
- Drag factor: 100-115 for man, 85-100 for kvinnor
- Startposition: Staende, hander ovanfor huvudet
- Teknik: Dubbelstakningsliknande rorelse med tyngdpunktsoverforing

**Normativa varden (1K tid):**

| Niva | Man | Kvinnor |
|---|---|---|
| Elit | < 3:10 | < 3:40 |
| Valdigt bra | 3:10-3:30 | 3:40-4:00 |
| Bra | 3:30-4:00 | 4:00-4:30 |
| Medel | 4:00-4:30 | 4:30-5:00 |
| Nybojare | > 4:30 | > 5:00 |

### 4.2 SkiErg Technique and Testing Considerations

**Teknikaspekter:**
- **Staende position:** Kroppsvikt anvands aktivt genom "fallande" rorelse framat-nedat
- **Dubbelstakning:** Bada armar simultant. Kraft via latissimus dorsi, triceps och core
- **Hofflexion:** Central for hogeffektsproduktion - kroppen bojs framat i hoften simultant med armdrag
- **Benarbete:** Latt knaflexion i nedre draget, extension i aterhamtningsfasen

**Fysiologiska skillnader mot RowErg:**
- Aktiverar ~60-70% av muskelmassa (jamfort med ~85% for rodd)
- Maxpuls typiskt 5-10 slag lagre an vid rodd
- VO2max 10-15% lagre pa SkiErg for de flesta
- Hogre laktatrespons vid samma relativa intensitet
- Overkroppsstyrka ar starkare prediktor an for roddprestation

**Testspecifikt:** SkiErg-resultat paverkas starkt av teknik. Otranlade forbattras snabbt genom teknikinlarning. Initiala test bor anvandas for baslinjesattning, inte ranking.

### 4.3 4x4 Minute SkiErg Interval Test

Identiskt protokoll som RowErg men steg baseras pa procent av 1K-watt (50%, 60%, 70%, 80%). Pulszoner ligger 3-5 slag lagre an vid rodd.

## 5. Concept2 BikeErg: Test Protocols

### 5.1 MAP Ramp Test (Maximal Aerobic Power)

BikeErg lampar sig utmarkt for ramptest da wattmotstandet ar oberoende av trampfrekvens.

**Protokoll:**
1. Uppvarmning: 5 min vid 75-100 W (man) / 50-75 W (kvinnor)
2. Start: 100 W (man) / 75 W (kvinnor)
3. Okning: +25 W varje minut
4. Avslut: Nar atleten inte kan halla trampfrekvens (>10 RPM under mal) i 5 sek
5. MAP = Hogsta watt fullfoljd i en hel minut

Om atleten misslyckas mitt i en minut:
$$MAP = W_{sista\_fulla} + 25 \times \frac{t_{ofullstandig}}{60}$$

**Protokollvarianter:**

| Parameter | Standard | Lattvikt | Nybojare |
|---|---|---|---|
| Startwatt (man) | 100 W | 75 W | 50 W |
| Startwatt (kvinnor) | 75 W | 50 W | 40 W |
| Stegokning | 25 W/min | 20 W/min | 15 W/min |
| Mal-RPM | 80-90 | 80-90 | 70-80 |

**Testtid bor vara 8-14 minuter.** For kort (<8 min): aeroba system hinner inte aktiveras fullt. For langt (>14 min): perifer muskeltrotthet begransar fore kardiovaskular kapacitet. Justera startwatt och steg darefter.

**Avbrytningskriterier:** Kan inte halla RPM, signalerar stopp, tekniskt sammanbrott i trampning, sakerhetsindikationer (yrsel, illaamaende, brostsmaarta).

### 5.2 BikeErg vs Road Cycling: Power Comparison

BikeErg anvander luftmotstand medan traditionella trainers/wattmatare anvander magnetiskt motstand.

**Nyckelskillnader:**
- BikeErg-watt ar i genomsnitt 3-8% lagre an vag/trainer-watt (varierar individuellt)
- BikeErg-watt ar RPM-oberoende (som en riktig cykelmotstandare), till skillnad fran Air Bikes
- Ingen lateral vagning ur sadeln begransar maximal sprintwatt
- Luftmotstand ger annorlunda inertialkansla an vagcykel

**For AI-motorn:** Anvand INTE BikeErg som direkt ekvivalent till vagcykeldata. Berakna individuell konverteringsfaktor om bade BikeErg- och vagdata finns.

### 5.3 FTP Estimation from MAP

$$FTP \approx MAP \times 0.72\text{ till }0.77$$

Hogre kvot (0.77) for uthallighetsanpassade atleter, lagre (0.72) for sprintvana.

## 6. Wattbike: Test Protocols and Power Profile

### 6.1 FTP Test (20-Minute Protocol)

1. Uppvarmning: 15 min med 3x30 sek i zon 3
2. All-out: 20 min maximal jamn anstrangning
3. FTP = Genomsnittlig watt x 0.95

**Wattbikes unika bidrag - Pedaling Effectiveness (Polar View):**
- **Jordgubbsform:** Ideal - jamn kraftapplikation
- **Attsidesvald:** Hog kraft pa nertrampen, lag pa upptrampen - ineffektiv
- **Assymetrisk:** Skadeindicator - ett ben producerar betydligt mer kraft

### 6.2 6-Second Sprint Test (Peak Power)

Sittande start fran 3-klockposition pa dominerande ben. Maximal sprint i 6 sek.

| Niva | Man | Kvinnor |
|---|---|---|
| Elit cyklist | > 1500 W | > 1000 W |
| Val tranad | 1200-1500 W | 800-1000 W |
| Tranad | 900-1200 W | 600-800 W |
| Motionsar | 600-900 W | 400-600 W |

## 7. Air Bikes: Assault and Echo Bike Protocols

### 7.1 Calibration and Standardization

Motstandet okar kubiskt med hastigheten (P proportionellt mot RPM^3).

**Maskinskillnader:**
- **Assault AirBike (kedjedrift):** "Ghost riding" - svanghjulet snurrar vidare. 15-20% hogre kalorital an Echo.
- **Rogue Echo Bike (remdrift):** Omedelbar deceleration. Kalorier bara under aktiv anstrangning.

$$\text{Echo kalorier} \approx \text{Assault kalorier} \times 0.80$$

### 7.2 MAP Ramp Test for Air Bikes

Start: Man 40 RPM / Kvinnor 35 RPM. Okning: +3 RPM/min. Avslut: RPM faller >5 under mal i 10 sek.

### 7.3 10-Minute Max Calorie Test

| Niva | Man | Kvinnor |
|---|---|---|
| Elit funktionell fitness | > 250 cal | > 180 cal |
| Avancerad | 200-250 cal | 150-180 cal |
| Intermediar | 150-200 cal | 110-150 cal |
| Nybojare | < 150 cal | < 110 cal |

## 8. Drag Factor: Significance and Standardization

### 8.1 What is Drag Factor?

Drag factor ar ett maat pa luftmotstandet i Concept2-maskiner. Bestams av damparpositionen men paverkas aven av maskinens rengoringstillstand, lufttemperatur/fuktighet och slitage.

**Kritiskt:** Dampare 5 pa en maskin ger INTE samma drag factor som dampare 5 pa en annan. Standardisera drag factor (inte dampare) vid testning.

### 8.2 Setting Drag Factor

Pa PM5: "More Options" > "Display Drag Factor" > ro nagra strakningar > avlas > justera damparen.

**Rekommenderade varden:**

| Maskin | Man | Kvinnor | Latt/Nybojare |
|---|---|---|---|
| RowErg | 120-130 | 105-120 | 95-105 |
| SkiErg | 100-115 | 85-100 | 75-85 |
| BikeErg | 80-100 | 65-85 | 55-65 |

### 8.3 Optimal Drag Factor by Body Size

| Kroppsvikt | RowErg DF | Motivering |
|---|---|---|
| < 60 kg | 95-110 | Saknar muskelmassa for tungt svanghjul. Lagre DF = hogre slagfrekvens. |
| 60-75 kg | 105-120 | Passar de flesta motions- och loppanpassade roddare. |
| 75-90 kg | 115-130 | Starkare atleter kan applicera mer kraft per strakning. |
| > 90 kg | 120-140 | Oka gradvis, aldrig direkt till 140. |

**Varning:** Hog drag factor okar belastningen pa korsrygg och skuldror. For nybojare/ryggproblem: hall DF lagre (95-110 oavsett vikt). Elitroddare ror sjallan over 130.

### 8.4 Impact on Test Results

Drag factor maste vara identisk mellan test. Aven small andring (120 vs 130) kan paverka 2K-tid med 3-5 sekunder.

## 9. Heart Rate Monitoring During Ergometer Tests

### 9.1 Equipment and Setup

- **Pulsbelte (brostrem):** Polar H10, Garmin HRM-Pro, Wahoo TICKR - rekommenderas for all testning
- **Optisk (handled):** INTE for testning (for stor felmarginal vid hog intensitet)
- **Anslutning:** PM5 stodjer ANT+ och Bluetooth

**Setup:** Fukta elektroder, kontrollera att beltet sitter stadigt under brostmuskulaturen, parkoppla med PM5 fore uppvarmning, verifiera pulsvisning.

### 9.2 Heart Rate Data in Test Interpretation

**Submaximala test:** Registrera genomsnittspuls sista 60 sek per steg. Minskning >5 slag vid samma watt = forbattrad aerob kapacitet. Heart Rate Recovery (pulsfall 60 sek efter avslut) >25 bpm/min ar normalt for tranade.

**Maximala test:** Maxpuls pa RowErg ar typiskt 2-5 slag hogre an BikeErg/SkiErg. Om maxpuls ar >5 slag lagre an tidigare: misstank submaximalt genomforande eller overtraning.

**Kardiovaskular drift:** Under konstant watt okar pulsen gradvis (3-5 slag over 4 min vid moderat intensitet). Drift >10 slag indikerar dehydrering, overtraning eller for hog intensitet.

## 10. Warm-Up Protocols for Ergometer Testing

### 10.1 Maximal Tests (2K, 3-min All-Out, MAP)

| Fas | Tid | Intensitet | Syfte |
|---|---|---|---|
| Generell uppvarmning | 5-8 min | Zon 1, lagfart | Hoja muskeltemperatur |
| Progressiv okning | 3 min | Zon 1 till zon 3 | Aktivera aeroba enzymsystem |
| Korta spurter | 3 x 10 sek | 90-95%, 30 sek vila | Neuromuskulara systemet |
| Aktiv vila | 2-3 min | Mycket latt | Laktatclearance, mental forberedelse |

Total: 13-20 min. Langre an 20 min riskerar glycogenuttomning.

### 10.2 Submaximal Tests (4x4 min)

5 min latt + mobilitetsoovningar + 1 min vila (forsta steget fungerar som uppvarmning).

### 10.3 Sprint Tests (6-sek)

5 min generellt + 3 x 5 sek progressiv intensitet (70%, 80%, 90%) med 60 sek vila + 2-3 min vila.

## 11. Test Standardization: Environment and Protocol

### 11.1 Pre-Test Standardization

- **Kost:** Undvik tunga maltider 2-3h fore. Ingen alkohol 24h fore.
- **Somn:** Minimum 7 timmar natten fore.
- **Traning:** Ingen hog intensitet 48h fore maxtest, ingen traning 24h fore.
- **Koffein:** Standardisera (alltid med eller alltid utan). 1-3 mg/kg, 60 min fore.
- **Hydration:** 500 ml vatten 2h fore test.

### 11.2 Environmental Standardization

- 18-22 grader C. Flakt riktad mot atleten (konsekvent).
- Testa alltid vid samma tid (prestationen varierar 3-5% over dygnet, peak kl 15-18).

### 11.3 Test Order for Battery Testing

1. **Forst:** Sprint/peak power (6 sek, kravs utvilad)
2. **Sedan:** Kort maxtest (3 min, 1K) - 20 min vila
3. **Sist:** Langre test (2K, FTP) - 30+ min vila
4. **ALDRIG:** Submaxtest fore maxtest

## 12. Results Analysis: CP, W', and Zone Calculation

### 12.1 Critical Power Model

- **CP:** Watt som kan underhallas ~30-60 min. Aerob troskelkapacitet.
- **W':** Total anaerob arbetskapacitet (joule) ovanfor CP. Nar W' = 0 = utmattning.

**Praktisk tolkning:**
- Hog CP + lag W': Uthallighetsatlet
- Lag CP + hog W': Sprintatlet
- Hog CP + hog W': Elitprestanda i bade korta och langa format

### 12.2 Zone Calculation from Ergometer Data

| Zon | Namn | Watt-range (CP) | Watt-range (FTP) | Laktat |
|---|---|---|---|---|
| 1 | Aterhamtning | < 55% | < 56% | < 1.5 mmol/L |
| 2 | Grunduthalliget | 55-75% | 56-75% | 1.5-2.0 |
| 3 | Tempo | 75-90% | 76-90% | 2.0-3.5 |
| 4 | Troskel | 90-105% | 91-105% | 3.5-5.0 |
| 5 | VO2max | 105-120% | 106-120% | > 5.0 |
| 6 | Anaerob | > 120% | > 120% | N/A |

### 12.3 Cross-Modality Translation

Watt pa olika ergometrar ar INTE direkt jamforbara:

| Fran | Till | Faktor |
|---|---|---|
| RowErg CP | BikeErg CP | x 0.85-0.90 |
| RowErg CP | SkiErg CP | x 0.70-0.80 |
| Wattbike FTP | BikeErg FTP | x 0.95-1.00 |
| Air Bike MAP | RowErg MAP | x 0.60-0.70 |

Faktorerna varierar beroende pa kroppsammansattning och traningsbakgrund.

## 13. Team Testing Protocols and Leaderboard Systems

### 13.1 Organizing Team Test Sessions

**Logistik:**
- **Stationsrotation:** Med 4+ maskiner, rotera atleter med vilopauser. Maxtest aldrig efter varandra.
- **Tidschema:** ~20-25 min per atlet for 2K (inkl uppvarmning). 20 atleter, 4 maskiner = ca 2 timmar.
- **Dataregistrering:** Anvand PM5:s USB eller ErgData-appen. Manuell registrering ar felkalla nr 1.
- **Heppare:** Okar prestation 2-5%. Standardisera: alla heppar eller ingen.

### 13.2 Normalization and Leaderboard Design

**Normaliseringsmetoder:** W/kg (gynnar latta), absolut watt (gynnar tunga), procentuell forbattring (rattvis for alla), Z-score ($z = (x - \mu) / \sigma$, for jamforelse over ergometertyper).

**Leaderboard-kategorier for AI-plattformen:**
1. **Absolut prestation:** Tid/watt (separat man/kvinnor)
2. **Relativ prestation:** W/kg
3. **Forbattringsrankning:** Procentuell forbattring sedan senaste test
4. **Anstrangningsindex:** Maxpuls-procent + RPE

Visa alltid individens historik bredvid leaderboard. Flagga resultat >2 SD battre an tidigare. Blanda ALDRIG ergometertyper i samma leaderboard.

### 13.3 Retest Frequency and Progression

| Testtyp | Frekvens | Anledning |
|---|---|---|
| 2K maxtest | Var 8-12:e vecka | Hog belastning, kraver tapering |
| Submaximalt 4x4 | Var 4-6:e vecka | Lag belastning |
| 3-min all-out | Var 6-8:e vecka | Maxanstrangning |
| 6-sek sprint | Var 4-6:e vecka | Minimal aterhamtningskostnad |
| FTP 20-min | Var 8-12:e vecka | Hog belastning |
| MAP ramp | Var 6-8:e vecka | Moderat belastning |

**Forvantad forbattring:**

| Niva | 6 manader | 12 manader |
|---|---|---|
| Nybojare | 10-20% | 15-30% |
| Intermediar | 5-10% | 8-15% |
| Avancerad | 2-5% | 4-8% |
| Elit | 0.5-2% | 1-3% |

**For AI-motorn:** Om ingen progression pa 12 veckor trots regelbunden traning, flagga for programjustering eller overtraningscreening.

## 14. Key Terminology / Nyckelterminologi

| Svenska | English | Definition |
|---|---|---|
| Ergometer | Ergometer | Traningsmaskin som mater mekaniskt arbete (watt) |
| Drag factor | Drag factor | Matt pa luftmotstand i Concept2, bestamt av dampare och miljo |
| Dampare | Damper | Ventil pa Concept2 som reglerar luftflode (1-10) |
| Slagfrekvens | Stroke rate (SPM) | Strakningscykler per minut |
| Split / Pace | Split / Pace | Tid per 500 meter vid aktuell intensitet |
| Strakningslangd | Drive length | Langd pa dragfasen i meter |
| Fangstposition | Catch position | Startposition for dragfasen (komprimerad) |
| Slutposition | Finish position | Slutposition for dragfasen (utstrackt) |
| Critical Power (CP) | Critical Power (CP) | Hogsta hallbara watt utan progressiv laktatackumulation (~30-60 min) |
| Anaerob arbetskapacitet (W') | W-prime (W') | Total energi tillganglig ovanfor CP (joule) |
| Maximal aerob effekt (MAP) | Maximal Aerobic Power (MAP) | Hogsta watt vid inkrementellt test till utmattning |
| Funktionell troskeleffekt (FTP) | Functional Threshold Power (FTP) | Hogsta hallbara watt ~60 min, uppskattad fran 20-min test x 0.95 |
| Ramptest | Ramp test | Stegvist okande belastningstest for MAP |
| Negativt split | Negative split | Andra halften genomfors snabbare an forsta |
| Viktnormalisering | Weight normalization | Watt till W/kg for viktoberoende jamforelse |
| Kardiovaskular drift | Cardiovascular drift | Gradvis pulsokning vid konstant arbetsbelastning |
| Pulsaterhamtning | Heart Rate Recovery (HRR) | Pulsminskning 60 sek efter maxanstrangning |
| Svanghjul | Flywheel | Roterande massa som lagrar kinetisk energi |
| Pulsbelte | Heart rate strap | Brostbandsensor for hjartrytm |

## 15. References

1. Monod, H. & Scherrer, J. (1965). The work capacity of a synergic muscular group. *Ergonomics*, 8(3), 329-338.

2. Vanhatalo, A., Doust, J.H. & Burnley, M. (2007). Determination of critical power using a 3-min all-out cycling test. *Medicine and Science in Sports and Exercise*, 39(3), 548-555.

3. Concept2 Inc. (2024). Performance Monitor 5 (PM5) Technical Reference. concept2.com.

4. Klusiewicz, A. et al. (2016). Reference values of maximal aerobic power for Polish rowers. *Biology of Sport*, 33(1), 25-30.

5. Mikulic, P. (2011). Maturation to elite status: a six-year physiological case study of a world champion rowing crew. *European Journal of Applied Physiology*, 111(9), 2363-2382.

6. Riechman, S.E. et al. (2002). Prediction of 2000m indoor rowing performance using a 30s sprint and maximal oxygen uptake. *Journal of Sports Sciences*, 20(9), 681-687.

7. Hill, D.W. (1993). The critical power concept: a review. *Sports Medicine*, 16(4), 237-254.

8. Bourdin, M. et al. (2004). Influence of training status on the relationship between maximal aerobic power and rowing ergometer performance. *Canadian Journal of Applied Physiology*, 29(3), 311-318.

9. Larsson, P. & Henriksson-Larsen, K. (2005). Combined metabolic gas analyser and dGPS analysis of performance in cross-country skiing. *Journal of Sports Sciences*, 23(8), 861-870.

10. Treff, G. et al. (2017). The relationship between Critical Power and FTP in trained cyclists. *International Journal of Sports Physiology and Performance*, 12(7), 980-986.
