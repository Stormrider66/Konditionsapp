# Skadeförebyggande & ACWR / Injury Prevention & ACWR

## Introduction

Skadeförebyggande arbete är en av de mest värdeskapande insatserna en tränare eller idrottsfysiolog kan göra. Att förstöra en hel säsong på grund av en överbelastningsskada är inte bara fysiskt utan även psykiskt förödande för en idrottare. Modern belastningsmonitorering, framför allt genom Acute:Chronic Workload Ratio (ACWR), ger oss verktyg att objektivt bedöma skaderisk och fatta datadrivna beslut om träningsbelastning.

Denna kunskapsbas täcker principerna bakom ACWR (inklusive EWMA vs rolling average, coupled vs uncoupled modeller), praktiska implementeringsriktlinjer, Delaware pain rules för rehabilitering, screeningverktyg, psykologiska faktorer, åldersspecifika hänsyn, teknologi för monitorering, och load management-strategier för olika idrotter.

---

## The Acute:Chronic Workload Ratio (ACWR) Concept

### Grundprincip

ACWR är ett förhållande mellan den akuta träningsbelastningen (senaste 7 dagarna) och den kroniska träningsbelastningen (senaste 28 dagarna). Konceptet bygger på idén att kroppen anpassar sig till den belastning den vants vid (kronisk), och att plötsliga ökningar utöver denna anpassningsnivå (akut) ökar skaderisken.

**Formel (Rolling Average):**
```
ACWR = Akut belastning (7-dagars summa / 7) / Kronisk belastning (28-dagars summa / 28)
```

**Exponentially Weighted Moving Average (EWMA):**
En mer sofistikerad metod där nyligare träningspass vägs tyngre än äldre. EWMA-modellen anses ge bättre prognostisk validitet än den enkla rolling average-modellen:

```
EWMA_idag = Belastning_idag * lambda + (1 - lambda) * EWMA_igår

lambda_akut = 2 / (7 + 1) = 0.25
lambda_kronisk = 2 / (28 + 1) = 0.069
```

### EWMA vs Rolling Average: When to Use Each

**Rolling Average (RA):**
- Enklare att beräkna och förstå
- Alla dagar inom fönstret viktas lika
- Reagerar långsammare på plötsliga belastningsförändringar
- Lämplig för grundläggande monitorering av motionärer och amatöridrottare

**Praktiskt beräkningsexempel (Rolling Average):**
Om en löpare tränar följande sRPE-belastning under 7 dagar: 300, 0, 400, 200, 0, 500, 300:
- Akut belastning = (300+0+400+200+0+500+300) / 7 = 243 AU/dag
- Om kronisk belastning (28-dagars) = 200 AU/dag
- ACWR = 243 / 200 = 1.21 (OPTIMAL zon)

**EWMA:**
- Nyligare dagar viktas exponentiellt tyngre
- Reagerar snabbare på belastningsförändringar
- Bättre prognostisk validitet enligt Williams et al. (2017)
- Rekommenderas för elitidrottare och lagidrotter med varierande matchscheman

**Praktiskt beräkningsexempel (EWMA):**
```
Dag 1: EWMA_akut = 300 (startvärde)
Dag 2: EWMA_akut = 0 * 0.25 + 0.75 * 300 = 225
Dag 3: EWMA_akut = 400 * 0.25 + 0.75 * 225 = 269
Dag 4: EWMA_akut = 200 * 0.25 + 0.75 * 269 = 252
...
```

EWMA-modellen fångar bättre upp den akuta belastningstoppen och ger en mer realistisk bild av kroppens aktuella belastningsstatus.

### Coupled vs Uncoupled ACWR Models

**Coupled model (traditionell):**
- Den akuta belastningen (7 dagar) ingår i den kroniska beräkningen (28 dagar)
- Problem: matematisk koppling gör att ACWR aldrig kan nå extremvärden
- Vid konstant belastning tenderar ACWR alltid mot 1.0
- Kan dölja verkliga risksignaler

**Uncoupled model (rekommenderad):**
- Kronisk belastning beräknas från dag 8-35 (exkluderar den akuta perioden)
- Eliminerar den matematiska kopplingen
- Ger mer känsliga och kliniskt relevanta värden
- Lolli et al. (2019) visade att uncoupled-modellen hade bättre prognostisk validitet

**Rekommendation för AI-motorn:** Använd uncoupled EWMA-modellen som standard, med möjlighet att jämföra med coupled rolling average för transparens.

### Belastningsmått (Load Metrics)

Belastning kan kvantifieras på flera sätt:

- **sRPE (session Rating of Perceived Exertion):** RPE (1-10) x duration (min). Enkel, billig, validerad.
- **Träning Impulse (TRIMP):** Baserat på hjärtfrekvens och duration. Edward's TRIMP eller Banister's TRIMP.
- **External load:** GPS-baserad distance, accelerationer, high-speed running meters, antal hopp.
- **Power-baserad:** TSS (Training Stress Score) för cykling, rTSS för löpning.

För lagidrotter är kombinationen av intern (sRPE) och extern belastning (GPS) optimal. För uthållighet räcker ofta sRPE eller TRIMP.

---

## ACWR Risk Zones

### OPTIMAL Zone (0.8 - 1.3)

Denna zon representerar den "sweet spot" där idrottaren tränar tillräckligt för att stimulera anpassning utan att överstiga kroppens återhämtningskapacitet. Forskning av Gabbett (2016) visar att idrottare i denna zon har lägst skaderisk.

- Träningsbelastningen är i linje med vad kroppen är van vid
- Tillåter progressiv överbelastning inom säkra gränser
- Optimal för både prestationsutveckling och skadefrihet

### CAUTION Zone (1.3 - 1.5)

Förhöjd skaderisk. Idrottaren tränar markbart mer än vanligt.

- Kan vara acceptabelt under korta perioder (t.ex. träningsläger)
- Kräver ökad monitorering: sömn, HRV, subjektiv trötthet
- Träningsanpassningar bör övervägas: reducera intensitet eller volym
- Extra fokus på återhämtning: näring, sömn, kompression

### DANGER Zone (> 1.5)

Betydande skaderisk. Belastningsökning är för snabb.

- 2-4 gånger förhöjd skaderisk jämfört med optimal zon
- Omedelbar justering av träningsplan krävs
- Minska volym och/eller intensitet
- Monitorera symptom dagligen
- Överväg att ta bort högintensiva pass helt tillfälligt

### CRITICAL Zone (> 2.0)

Extremt hög skaderisk. Akut belastning är mer än dubbelt mot den kroniska.

- Scenariot uppstår ofta vid: återgång från skada/sjukdom, plötslig träningsstart, turneringsperioder
- Omedelbar reduktion av träningsbelastning
- Fokusera enbart på lågintensiv aktivitet
- Kräver daglig symptommonitorering

### Underdosering (ACWR < 0.8)

Även för låg belastning är problematisk:

- Kronisk belastning sjunker över tid, vilket gör idrottaren mer sårbar för framtida belastningsökning
- "Detraining effect" minskar kroppens tolerans
- Vid återgång till normal träning kan ACWR spikas snabbt
- Särskilt riskabelt under skaderehab där träningsvolymen ofta är låg

---

## Age-Specific Injury Risk Factors and Modified Thresholds

### Ungdomsidrottare (< 18 år)

- Tillväxtspurten ökar skaderisken (apofysiter, epifysplattor)
- ACWR-trösklar bör vara konservativare: CAUTION redan vid 1.2, DANGER vid 1.4
- Undvik hög belastningsmonotoni - variation är extra skyddande
- Tillväxtrelaterade skador (Osgood-Schlatter, Severs sjukdom) kräver belastningsanpassning snarare än total vila

### Veteranidrottare (> 40 år)

- Längre återhämtningstid kräver mer konservativa belastningsökningar (max 5-8% per vecka)
- Ökad risk för senskador (achilles, patella) pga minskad kollagensyntes
- ACWR-trösklar: CAUTION vid 1.2, DANGER vid 1.4 (likt ungdomar men av andra skäl)
- Regelbunden excentrisk senträning som prevention
- Styrketräning för att motverka sarkopenirelaterad skaderisk

---

## Travel, Jet Lag, and Injury Risk

### Reserelaterade riskfaktorer

Resor och tidszonsförflyttning ökar skaderisken genom flera mekanismer:

- **Sömnstörning:** Varje tidszon som korsas kräver ~1 dag för anpassning
- **Stillasittande:** Långa flygresor → muskelstyvhet, minskad neuromuskulär kontroll
- **Dehydrering:** Flygplansmiljöns låga luftfuktighet → ökad vätskeförlust
- **Immunsuppression:** Stresshormon + trångt utrymme → ökad infektionsrisk

### Praktiska riktlinjer

- Räkna med 20-30% reducerad träningskapacitet de första 1-2 dagarna efter lång resa (>3 tidszoner)
- Inkludera resetid i ACWR-beräkningar som vilodag eller mycket låg belastning
- Östlig resa (framåt i tid) är svårare att anpassa till än västlig
- Planera lättare träning vid ankomst, öka gradvis över 2-3 dagar
- Exponering för naturligt ljus vid rätt tidpunkt hjälper cirkadisk anpassning

---

## Psychological Factors in Injury Prevention

### Stressrelaterad skaderisk

Williams & Andersens stressskademodell (1998) visar att psykologisk stress är en oberoende riskfaktor för idrottsskador:

- **Livsbelastning:** Stora livshändelser (flytt, separation, ekonomisk stress) ökar skaderisken med 2-5 gånger
- **Sömnbrist:** < 7 timmars sömn per natt ökar skaderisken med 1.7 gånger (Milewski et al., 2014)
- **Psykologisk trötthet:** Mental utbrändhet minskar uppmärksamhet och reaktionsförmåga
- **Rädsla för återskada:** Efter skada kan rädsla leda till förändrad rörelsemeknik och kompensationsmönster

### Monitorering av psykologiska faktorer

Inkludera i daglig wellness-enkät:
- Sömnkvalitet (1-10)
- Stressnivå (1-10)
- Humör/motivation (1-10)
- Upplevd energi (1-10)
- Livshändelser (ja/nej med fritext)

**AI-motorns uppgift:** Vikta psykologiska faktorer i beredskapsberäkningen. En idrottare med ACWR 1.2 + hög livsstress + dålig sömn bör behandlas som CAUTION snarare än OPTIMAL.

---

## The Fitness-Fatigue Model (Banister)

### Koncept

Banisters fitness-fatigue-modell (1975) är en tvåkomponentmodell som förklarar hur träning påverkar prestation över tid:

**Performance = Fitness - Fatigue**

- **Fitness (positiv komponent):** Byggs upp långsammare, varar längre. Representerar träningsanpassningar (aerob kapacitet, styrka, muskeluthållighet).
- **Fatigue (negativ komponent):** Byggs upp snabbare, försvinner snabbare. Representerar akut trötthet (muskelskada, glykogenuttömning, CNS-trötthet).

### Praktisk tillämpning

Modellen förklarar varför tapering fungerar: genom att minska träningen före tävling minskar fatigue snabbare än fitness, vilket ger en prestandatopp. Den förklarar även överträning: när fatigue ackumuleras snabbare än fitness byggs upp.

För ACWR-sammanhanget: en hög ACWR indikerar att fatigue-komponenten är oproportionerligt hög relativt fitness, vilket ökar skaderisken.

---

## Monotony Index and Strain

### Beräkning

**Monotoni** mäter hur enformig träningen är:

```
Monotoni = Veckans medelbelastning / Standardavvikelse av daglig belastning
```

Hög monotoni (>2.0) indikerar att varje dag är liknande, vilket paradoxalt ökar risken för överträning. Variation är skyddande.

**Strain** är produkten av total belastning och monotoni:

```
Strain = Veckobelastning * Monotoni
```

Hög strain (hög belastning OCH hög monotoni) är starkt associerat med sjukdom och skada. Foster et al. visade att sjukdomsincidens ökade kraftigt när strain översteg kritiska nivåer.

### Praktisk riktlinje

- Variera träningsintensitet och typ över veckan
- Inkludera minst 1-2 lätta dagar per vecka
- Undvik att köra samma pass dag efter dag
- Eftersträva en blandning av låga, måttliga och höga belastningar

---

## Delaware Pain Rules for Rehabilitation

### Principer

Delaware pain rules är ett evidensbaserat ramverk för att styra rehabilitering baserat på smärtrespons:

**Regel 1: Smärtnivå under aktivitet**
- 0-2/10: Acceptabelt. Fortsätt med nuvarande belastning eller öka.
- 3-4/10: Varningssignal. Behåll nuvarande belastning, öka inte.
- 5+/10: Oacceptabelt. Minska belastningen.

**Regel 2: Smärta 24 timmar efter aktivitet**
- Om smärtan återgår till baslinjenivå inom 24 timmar: OK att fortsätta.
- Om smärtan är förhöjd >24 timmar efter aktivitet: Belastningen var för hög, backa ett steg.

**Regel 3: Svullnad/inflammation**
- Nytillkommen svullnad efter aktivitet indikerar för hög belastning
- Kräver reduktion och eventuell medicinsk bedömning

### Implementering i träningsprogram

Skalan bör registreras dagligen av idrottaren:
- Före träning: baslinjesmart
- Under träning: maxsmärta
- 24 timmar efter: residualsmärta

Om 24-timmars smärtan är högre än baslinjen två träningar i rad: automatisk varning till tränare.

---

## Return-to-Sport Criteria

### Fasindelning

Återgång till idrott följer en progressiv modell:

1. **ACUTE:** Skyddad belastning, smärthantering, ROM-återhämtning
2. **SUBACUTE:** Progressiv belastning, funktionell styrka, neuromuskulär kontroll
3. **REMODELING:** Idrottsspecifika rörelsemönster, accelererande belastning
4. **FUNCTIONAL:** Full träningsvolym, reaktiv träning, sport-specifik testning
5. **RETURN TO SPORT:** Tävlingsbelastning, psykologisk beredskap

### Objektiva kriterier

- **Styrka:** >90% av friska sidan (isokinetisk testning eller 1RM)
- **Power:** Hop-test >90% av friska sidan (single-leg hop, triple hop, crossover hop)
- **Uthållighet:** Klarar fullständig träningssession utan smärtrespons
- **Funktionell testning:** Sport-specifika agility-tester, reaktionstester
- **Psykologisk beredskap:** ACL-RSI score >56/100 (för knäligament), inga undvikandebeteenden

---

## Specific Rehabilitation Protocols for Common Running Injuries

### Achillestendinopati

**Fas 1 (vecka 1-2): Isometrisk belastning**
- 5x45 sek isometrisk vadpress vid 70% av max, 2 gånger/dag
- Undvik stretching av senan
- Fortsätt med smärtfri aktivitet (cykling, simning)

**Fas 2 (vecka 3-6): Isotonisk progressiv belastning**
- Excentrisk-koncentrisk vadmuskelövningar (Alfredson-protokoll: 3x15 reps, 2 ggr/dag)
- Gradvis introduktion av gång → jogg (från vecka 4 om smärta <3/10)
- Bibehåll alternativträning

**Fas 3 (vecka 6-12): Energilagring och belastningsökning**
- Plyometriska övningar (hoppträning) med progressiv belastning
- Återgång till löpning med ACWR-styrd volymökning (max 10%/vecka)
- Styrkemål: enbensvadpress >90% av friska sidan

### Löparknä (Patellofemoral smärta)

**Protokoll:**
- Quadriceps-stärkande övningar (isometrisk → koncentrisk → excentrisk)
- Höftabduktions- och utåtrotationsstyrka (clamshells, sidliggande höftlyft)
- Knäböj med biofeedback (undvik valgusposition)
- Gradvis återgång till löpning: börja med platt underlag, undvik utförsbackar

### Tibialt stresssyndrom (Shin splints)

- Initialt: viloperiod 2-4 veckor, alternativträning (simning, cykling)
- Gradvis återgång med "walk-run"-program
- Excentrisk tålyftning och vadmuskelstärkande
- Gånganalys för att identifiera biomekaniska riskfaktorer

---

## Pre-Hab Programs: Structured Warm-Up Routines by Sport

### Löpning: Pre-Run Activation (10-15 min)

1. Gångövningar med höga knälyft (2x20 m)
2. Höftkretsar (10/sida)
3. Clamshells med band (15/sida)
4. Enbensstående knäböj (8/sida)
5. Vadpressade tåhävningar (15 reps)
6. Dynamisk stretch: lårsträckare, höftböjare
7. Steg med gradvis ökande fart (4x80 m: 60%, 70%, 80%, 90%)

### Lagidrott: FIFA 11+ (20 min)

Trestegsuppvärmning med bevisad effekt:
1. **Löpning:** 6 löpövningar (rakt framåt, sidleds, parvis)
2. **Styrka/balans/plyometrik:** 6 övningar med 3 svårighetsnivåer (plankor, nordiska hamstrings, enbensstående)
3. **Löpning:** 3 snabba löpövningar (riktningsförändringar, studs, sprint)

### Simning: Skulderaktivering (10 min)

1. Bandade utåtrotationer (15 reps)
2. Y-T-W-L i bukläge (8 reps/position)
3. Skulderbladsretraktioner (15 reps)
4. Thorakal rotation (10/sida)
5. Bandad pull-apart (15 reps)

---

## Screening Tools for Injury Risk Assessment

### Functional Movement Screen (FMS)

FMS är ett standardiserat screeningverktyg med 7 rörelsemönster, poängsatta 0-3:
1. Djup knäböj
2. Häcköverkliv
3. Inline lunge
4. Skulderrörlighet
5. Aktiv rakt benlyft
6. Trunk stability push-up
7. Rotationsstabilitet

**Tolkning:** Total poäng <14/21 eller asymmetrier >1 poäng mellan sidor → ökad skaderisk. Identifiera svaga länkar och åtgärda med specifika korrigerande övningar.

### Y-Balance Test

Dynamisk balanstest som mäter räckvidd i tre riktningar (anterior, posteromedial, posterolateral) stående på ett ben:
- Asymmetri >4 cm mellan höger/vänster → förhöjd skaderisk
- Anteriort räckvidd <65% av benlängd → 2.5x ökad risk för nedre extremitetsskador
- Används för att identifiera neuromuskulära underskott efter skada

### Single-Leg Hop Battery

Fyra hopptester som mäter kraftutveckling, stabilitet och kontroll:
1. **Single hop for distance:** Max hopp framåt, landa stabilt
2. **Triple hop for distance:** Tre sammanlänkade hopp
3. **Crossover hop:** Hopp diagonalt över en linje
4. **6-meter timed hop:** Tid för att hoppa 6 meter på ett ben

**Return-to-sport-kriterium:** Limb Symmetry Index (LSI) >90% för alla fyra tester.

---

## Technology for Injury Monitoring

### GPS och accelerometri

- **GPS-enheter (10 Hz+):** Mäter distans, hastighet, accelerationer, dekelerationer, high-speed running (>19.8 km/h)
- **Accelerometrer:** Player Load (Catapult), Body Load - mäter total mekanisk belastning
- **Tillämpning:** Kombinera GPS-data med sRPE för komplett intern + extern belastningsbild

### Kraftplattor och belastningsmätning

- **Kraftplattor:** Mäter ground reaction forces, asymmetrier vid hopp, isometrisk styrka
- **Countermovement jump (CMJ):** Daglig/veckovis CMJ-höjd som neuromuskulär beredskapsmarkör
- CMJ-reduktion >10% från baslinje → varningssignal för ackumulerad trötthet
- Asymmetri >10% mellan ben → förhöjd skaderisk

### Wearable-enheter

- **HRV-mätare:** WHOOP, Oura Ring, Garmin - daglig autonom beredskap
- **Sömntracking:** Objektiv sömndata kompletterar subjektiv rapportering
- **Temperatur:** Hudtemperaturavvikelse kan indikera sjukdom 24-48 timmar före symtom
- **Integrering:** AI-motorn bör kunna ta emot data från vanliga wearables via API

---

## Load Management Principles

### Veckovolymökning: 10%-regeln

Den mest etablerade riktlinjen är att öka träningsvolymen med max 10% per vecka. Detta gäller primärt för:

- Total löpvolym (km/vecka)
- Total tränings-sRPE
- Antal högintensiva pass

### Undvik belastningshopp >30%

Forskning visar att en vecka-till-vecka ökning på >30% i total belastning ger markant ökad skaderisk, oavsett absolut belastningsnivå. Detta är särskilt relevant vid:

- Återgång från semester/uppehåll
- Återgång från sjukdom
- Träningslägersperioder
- Tävlingsintensifiering

### Högintensitetshantering

Högintensiv träning (>85% HRmax, RPE >7) är den enskilt största riskfaktorn för överbelastningsskador. Riktlinjer:

- Max 2-3 högintensiva pass per vecka för de flesta idrottare
- Minst 48 timmar mellan högintensiva pass
- När total veckobelastning ökas, öka volym före intensitet
- Behåll antal högintensiva pass konstant vid volymökning

---

## Common Injury Scenarios by Sport

### Löpning
- **Patellofemoral smärta (löparknä):** För snabb volymökning, bristande quadriceps/glutealstyrka
- **Achillestendinopati:** Plötslig ökning av löpvolym eller intervallträning, bristande vadmuskelstyrka
- **Tibial stress fracture:** Hög belastning + låg energitillgänglighet (RED-S), bristande bentäthet
- **IT-band syndrom:** Repetitiv belastning, bristande höftrotationskapacitet

### Cykling
- **Knäsmärta (patellofemoralt):** Felaktig sadelposition, för tung utväxling, hög kadensvariation
- **Ländryggsmärta:** Bristande core-stabilitet, aggressiv aeroposition
- **Handledsneuropati:** Lång hög belastning på handlederna, bristande cykelfitting

### Simning
- **Simmaraxel (subakromial impingement):** Repetitiv överarmselevation, bristande scapulär stabilitet
- **Knäsmärta (bröstsimsstam):** Repetitiv valgusbelastning vid bröstsimsspark
- **Ländryggsmärta:** Hyperextension vid fjärilssim och delfinspark
- **Prevention:** Skulderaktivering före varje pass, periodisera simvolym, variera simsätt

### Rodd
- **Ländryggsmärta:** Hög kompressiv belastning vid catch-position, dålig teknik under trötthet
- **Revbensstressfraktur:** Hög dragvolym + snabb volymökning
- **Handledsinflammation:** Repetitiv feathering-rörelse
- **Prevention:** Teknikkontroll under trötthet, core-styrketräning, gradvis volymökning

### Längdskidåkning
- **Axelskador:** Stakning med hög intensitet, bristande skulderstabilitet
- **Ländryggsmärta:** Böjd position vid diagonalgång, rotationsbelastning
- **Överbelastning nedre extremitet:** Höga styrkekrafter vid skateteknik
- **Prevention:** Specifik styrketräning för axlar/rygg, periodisera stakvolym, teknikfokus vid trötthet

### Lagidrotter (fotboll, handboll)
- **Hamstringsskada:** Hög sprinthastighet med för låg excentrisk styrka, ACWR >1.5
- **Främre korsband (ACL):** Landningsvalgus, trötthet, för låg neuromuskulär kontroll
- **Ljumskesmärta:** För snabb ökning av riktningsförändringar och sprint

### Triathlon
- **Multisportbelastning:** Total ACWR måste beräknas över alla tre discipliner
- **Axelproblem:** Simvolym i kombination med aeroposition på cykel
- **Stressfraktur:** Kombinerad löpning + dålig näring är högriskgrupp

---

## Practical Guidelines Summary

### Daglig monitorering
1. Registrera sRPE och duration för varje träningspass
2. Mäta vilohjärtfrekvens och/eller HRV morgon
3. Subjektiv välmåendeskattning (sömn, trötthet, stress, muskelömhet)
4. Smärtskattning (Delaware-skalan) vid pågående rehabilitering

### Veckovis analys
1. Beräkna ACWR för varje idrottare
2. Flagga idrottare i CAUTION/DANGER/CRITICAL zoner
3. Granskning av monotoni och strain
4. Jämför planerad vs faktisk belastning

### Beslutsstöd
- ACWR OPTIMAL + låg monotoni: Fortsätt som planerat, överväg progressiv ökning
- ACWR OPTIMAL + hög monotoni: Variera träning, behåll total belastning
- ACWR CAUTION: Reducera planerade högintensiva pass, öka återhämtning
- ACWR DANGER: Omedelbar reduktion, ersätt med lågintensiv träning
- ACWR CRITICAL: Individuell bedömning, överväg fullständig vila

### Säsongsplanering
- **Försäsong:** Gradvis uppbyggnad, max 10%/vecka, ACWR-mål 0.9-1.1
- **Tävlingsperiod:** Behåll kronisk belastning stabil, planera för matchbelastning
- **Off-season:** Kontrollerad nedtrappning, behåll minst 50% av säsongsbelastning
- **Rehabilitering:** Följ ACWR som guide för progressiv återgång

---

## The Training-Injury Prevention Paradox

### Gabbetts paradox

En av de mest inflytelserika insikterna inom modern idrottsmedicin är Gabbetts "training-injury prevention paradox" (2016). Paradoxen sammanfattas:

**Hög träningsbelastning är både den största riskfaktorn för skada OCH den största skyddsfaktorn mot skada.**

Förklaringen är att kronisk belastning bygger kroppens tolerans. En idrottare som regelbundet tränar på hög nivå (hög kronisk belastning) har en kropp som är anpassad till denna belastning. Skaderisken ökar inte på grund av hög absolut belastning, utan på grund av snabba relativa förändringar (hög ACWR).

### Praktisk konsekvens

- Undvik att hålla idrottare borta från träning "för säkerhets skull" - det sänker den kroniska belastningen och gör dem mer sårbara
- Under skaderehab: upprätthåll så hög träningsbelastning som möjligt inom smärtfria gränser
- Under viloperioder: behåll minst 50% av normal belastning för att skydda kronisk fitness
- Build physical robustness through progressive exposure, not avoidance

### Evidens

Studier på australiensisk cricket (Hulin et al., 2014) och australiensisk fotboll (Gabbett, 2010) visar konsekvent att idrottare med högre kronisk belastning har LÄGRE skaderisk, förutsatt att belastningsökningen sker gradvis. Idrottare som hoppade över 18+ träningsveckor under försäsongen hade 2-4 gånger högre skaderisk under tävlingsperioden, även efter kontroll för andra faktorer.

---

## Heart Rate Variability (HRV) for Injury Prevention

### HRV som monitoreringsverktyg

Hjärtfrekvensvariabilitet (HRV) mäter variationen i tid mellan hjärtslagen och reflekterar det autonoma nervsystemets balans mellan sympatikus (fight-or-flight) och parasympatikus (rest-and-digest).

**Relevans för skadeprevention:**
- Sjunkande HRV-trend över dagar/veckor indikerar ackumulerad trötthet
- Plötslig HRV-minskning (>15% under personlig baslinje) kan indikera sjukdom, överträning eller förhöjd skaderisk
- HRV-guidad träning (HRVG) har visat positiva resultat i flera studier

### Praktisk användning

- Mät HRV varje morgon (före uppstigande eller direkt efter uppvaknande)
- Använd 7-dagars rullande medelvärde för att identifiera trender
- Kombinera med sRPE och subjektivt välmående för helhetsbild
- Individuella baslinjer är viktigast - jämför alltid med idrottarens egna normer

### HRV och ACWR i kombination

Den mest effektiva monitoreringsstrategin kombinerar:
1. **ACWR** för extern/intern belastningsmonitorering (prospektiv risk)
2. **HRV** för autonom nervsystemrespons (kroppens faktiska reaktion)
3. **Subjektiva mått** (sömn, trötthet, stress) för psykosocial kontext

När ACWR är i CAUTION-zon OCH HRV sjunker, är risken avsevärt förhöjd och omedelbara åtgärder bör vidtas.

---

## Overtraining Syndrome (OTS) vs Overreaching

### Terminologi och differentiering

Det är viktigt att skilja mellan funktionell och icke-funktionell overreaching, samt överträningssyndrom:

**Funktionell overreaching (FOR):**
- Kortvarig prestationsminskning (dagar till 1-2 veckor)
- Återhämtning med 1-2 veckors reducerad träning
- Normal del av träningsprocessen (supercompensation)
- Planerad i periodisering (t.ex. overreaching-vecka följd av vila)

**Icke-funktionell overreaching (NFOR):**
- Långvarig prestationsminskning (veckor till månader)
- Kräver 2-4 veckors återhämtning
- Hormonella förändringar (sänkt testosteron, förhöjt kortisol)
- Ställd immunfunktion, ökad sjuklighet

**Överträningssyndrom (OTS):**
- Allvarligt, lång återhämtning (månader till år)
- Systemisk funktionsnedsättning
- Diagnos genom exklusion
- Extremt svårt att skilja från andra medicinska tillstånd

### Varningssignaler

Tidiga tecken på NFOR/OTS som bör flaggas:
- Prestationsminskning trots upplevd ansträngning
- Persistent trötthet som inte svarar på vila
- Sömnstörningar (svårt att somna, tidig uppvakning)
- Aptitförlust eller ökad irritabilitet
- Ökad vilopuls (>5 slag över baslinje över flera dagar)
- Sjunkande HRV-trend
- Upprepad sjukdom (förkylningar, infektioner)

---

## Sport-Specific Injury Prevention Strategies

### Löpning: Förebyggande styrkeprogram

För löpare är ett minimalt förebyggande program:
- **Excentrisk vadmuskelträning:** 3x15 reps, både rak och böjd knä, dagligen
- **Nordisk hamstringscurl:** 3x5 reps, 2-3 gånger/vecka
- **Single-leg calf raises:** 3x12 per sida
- **Hip abductor work:** Side-lying hip abduction, banded walks
- **Core:** Planks, pallof press, bird-dogs

### Lagidrott: FIFA 11+ och liknande program

Strukturerade uppvärmningsprogram som FIFA 11+ har visat:
- 30-50% reduktion av överbelastningsskador
- 50-70% reduktion av korsbandsskador (hos kvinnor)
- Effekten beror på compliance: programmet måste göras regelbundet

### Cykling: Positionsoptimering

För cyklister är den främsta skadeförebyggande insatsen professionell bikefitting:
- Korrekt sadelhöjd förebygger knäskador
- Korrekt reach förebygger ryggproblem
- Cleat-position påverkar knä- och fotledsbelastning

---

## Key Terminology

| Svenska | English | Definition |
|---------|---------|------------|
| Akut belastning | Acute workload | Senaste 7 dagarnas träningsbelastning |
| Kronisk belastning | Chronic workload | Senaste 28 dagarnas träningsbelastning |
| Skaderisk | Injury risk | Sannolikheten för skada baserat på belastningsmönster |
| Överbelastningsskada | Overuse injury | Skada orsakad av repetitiv belastning utan tillräcklig återhämtning |
| Återgång till idrott | Return to sport | Progressiv process för att säkert återgå till full träning/tävling |
| Belastningsmonitorering | Load monitoring | Systematisk tracking av träningsbelastning |
| Tapering | Tapering | Kontrollerad belastningsreduktion före tävling |
| Trötthet | Fatigue | Tillfällig reduktion av prestationsförmåga |
| Kopplad modell | Coupled model | ACWR-beräkning där akut period ingår i kronisk |
| Okopplad modell | Uncoupled model | ACWR-beräkning där akut period exkluderas från kronisk |
| Monotoni | Monotony | Mått på träningens enformighet (medel/SD) |
| Belastningshopp | Load spike | Plötslig ökning av träningsbelastning (>30% vecka-till-vecka) |
| Funktionell overreaching | Functional overreaching | Planerad kortvarig överbelastning med efterföljande supercompensation |
| Screeningverktyg | Screening tool | Standardiserat test för att identifiera skaderiskfaktorer |
| Prehab | Pre-habilitation | Förebyggande träning för att förhindra skada |
| Biomekanik | Biomechanics | Studiet av kroppens rörelsemekanik |
| Neuromuskulär kontroll | Neuromuscular control | Nervsystemets förmåga att koordinera muskelaktivering |
| Sömnkvalitet | Sleep quality | Mått på sömnens återhämtningseffekt |
| Beredskapspoäng | Readiness score | Samlat mått på idrottarens träningsberedskap |
| Cirkadisk rytm | Circadian rhythm | Kroppens interna 24-timmarsklocka |

---

## References and Evidence Base

Denna kunskapsbas bygger på forskning från:
- Gabbett TJ (2016): The training-injury prevention paradox. *British Journal of Sports Medicine*, 50(5), 273-280.
- Blanch P, Gabbett TJ (2016): Has the athlete trained enough to return to play safely? *British Journal of Sports Medicine*, 50(8), 471-475.
- Hulin BT et al. (2014): The acute:chronic workload ratio predicts injury: high chronic workload may decrease injury risk in elite rugby league players. *British Journal of Sports Medicine*, 48(3), 196-202.
- Williams S et al. (2017): Better risk assessment: the EWMA approach to ACWR calculation. *British Journal of Sports Medicine*, 51(3), 209-210.
- Lolli L et al. (2019): Mathematical coupling causes spurious correlation within the conventional acute-to-chronic workload ratio calculations. *British Journal of Sports Medicine*, 53(15), 921-922.
- Foster C (1998): Monitoring training in athletes with reference to overtraining syndrome. *Medicine & Science in Sports & Exercise*, 30(7), 1164-1168.
- Banister EW (1991): Modeling elite athletic performance. In *Physiological Testing of the High-Performance Athlete*. Human Kinetics, 403-424.
- Crossley KM et al. (2016): Making patellofemoral pain management more effective. *British Journal of Sports Medicine*, 50(4), 209-215.
- Williams JM, Andersen MB (1998): Psychosocial antecedents of sport injury: review and critique of the stress and injury model. *Journal of Applied Sport Psychology*, 10(1), 5-25.
- Milewski MD et al. (2014): Chronic lack of sleep is associated with increased sports injuries in adolescent athletes. *Journal of Pediatric Orthopedics*, 34(2), 129-133.
- Cook G, Burton L (2006): The Functional Movement Screen. *North American Journal of Sports Physical Therapy*, 1(2), 62-72.
- Plisky PJ et al. (2006): Star Excursion Balance Test as a predictor of lower extremity injury in high school basketball players. *Journal of Orthopaedic & Sports Physical Therapy*, 36(12), 911-919.
- Alfredson H et al. (1998): Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis. *The American Journal of Sports Medicine*, 26(3), 360-366.
- Soligard T et al. (2008): Comprehensive warm-up programme to prevent injuries in young female footballers. *BMJ*, 337, a2469.
- Meeusen R et al. (2013): Prevention, diagnosis and treatment of the overtraining syndrome. *European Journal of Sport Science*, 13(1), 1-24.
