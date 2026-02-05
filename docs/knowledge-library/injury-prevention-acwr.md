# Skadeforebyggande & ACWR / Injury Prevention & ACWR

## Introduction

Skadeforebyggande arbete ar en av de mest vardeskapande insatserna en tranare eller idrottsfysiolog kan gora. Att forstora en hel sasong pa grund av en overbelastningsskada ar inte bara fysiskt utan aven psykiskt devastrerande for en idrottare. Modern belastningsmonitorering, framfor allt genom Acute:Chronic Workload Ratio (ACWR), ger oss verktyg att objektivt bedoma skaderisk och fatta datadrivna beslut om traningsbelastning.

Denna kunskapsbas tacker principerna bakom ACWR, praktiska implementeringsriktlinjer, Delaware pain rules for rehabilitering, och load management-strategier for olika idrotter.

---

## The Acute:Chronic Workload Ratio (ACWR) Concept

### Grundprincip

ACWR ar ett forhallande mellan den akuta traningsbelastningen (senaste 7 dagarna) och den kroniska traningsbelastningen (senaste 28 dagarna). Konceptet bygger pa ideen att kroppen anpassar sig till den belastning den vants vid (kronisk), och att plotsliga okning ar utover denna anpassningsniva (akut) okar skaderisken.

**Formel (Rolling Average):**
```
ACWR = Akut belastning (7-dagars summa / 7) / Kronisk belastning (28-dagars summa / 28)
```

**Exponentially Weighted Moving Average (EWMA):**
En mer sofistikerad metod dar nyligare traningspass vags tyngre an aldre. EWMA-modellen anses ge battre prognostisk validitet an den enkla rolling average-modellen:

```
EWMA_idag = Belastning_idag * lambda + (1 - lambda) * EWMA_igar

lambda_akut = 2 / (7 + 1) = 0.25
lambda_kronisk = 2 / (28 + 1) = 0.069
```

### Belastningsmatt (Load Metrics)

Belastning kan kvantifieras pa flera satt:

- **sRPE (session Rating of Perceived Exertion):** RPE (1-10) x duration (min). Enkel, billig, validerad.
- **Traning Impulse (TRIMP):** Baserat pa hjarfrekvens och duration. Edward's TRIMP eller Banister's TRIMP.
- **External load:** GPS-baserad distance, accelerationer, high-speed running meters, antal hopp.
- **Power-baserad:** TSS (Training Stress Score) for cykling, rTSS for lopning.

For lagidrotter ar kombinationen av intern (sRPE) och extern belastning (GPS) optimal. For uthallighet racker ofta sRPE eller TRIMP.

---

## ACWR Risk Zones

### OPTIMAL Zone (0.8 - 1.3)

Denna zon representerar den "sweet spot" dar idrottaren tranar tillrackligt for att stimulera anpassning utan att overstiga kroppens aterhamtningskapacitet. Forskning av Gabbett (2016) visar att idrottare i denna zon har lagst skaderisk.

- Traningsbelastningen ar i linje med vad kroppen ar van vid
- Tillater progressiv overbelastning inom sakra gränser
- Optimal for bade prestationsutveckling och skadefrihet

### CAUTION Zone (1.3 - 1.5)

Forhojd skaderisk. Idrottaren tranar markbart mer an vanligt.

- Kan vara acceptabelt under korta perioder (t.ex. traningslager)
- Kraver okad monitorering: somn, HRV, subjektiv troetthet
- Traningsanpassningar bor overvagas: reducera intensitet eller volym
- Extra fokus pa aterhamtning: naring, somn, kompression

### DANGER Zone (> 1.5)

Betydande skaderisk. Belastningsokning ar for snabb.

- 2-4 ganger forhojd skaderisk jamfort med optimal zon
- Omedelbar justering av traningsplan kravs
- Minska volym och/eller intensitet
- Monitorera symptom dagligen
- Overväg att ta bort hogintensiva pass helt tillfälligt

### CRITICAL Zone (> 2.0)

Extremt hog skaderisk. Akut belastning ar mer an dubbelt mot den kroniska.

- Scenariot uppstar ofta vid: atergang fran skada/sjukdom, plotslig traningsstart, turneringsperioder
- Omedelbar reduktion av traningsbelastning
- Fokusera enbart pa laginteniva aktivitet
- Krav daglig symptommonitorering

### Underdosering (ACWR < 0.8)

Aven for lag belastning ar problematisk:

- Kronisk belastning sjunker over tid, vilket gor idrottaren mer sarbar for framtida belastningsokning
- "Detraining effect" minskar kroppens tolerans
- Vid atergang till normal traning kan ACWR spikas snabbt
- Sarskilt riskabelt under skaderehab dar traningsvolymen ofta ar lag

---

## The Fitness-Fatigue Model (Banister)

### Koncept

Banisters fitness-fatigue-modell (1975) ar en tvakompnentmodell som forklarar hur traning paverkar prestation over tid:

**Performance = Fitness - Fatigue**

- **Fitness (positiv komponent):** Byggs upp langsammare, varar langre. Representerar traningsanpassningar (aerob kapacitet, styrka, muskeluthallighet).
- **Fatigue (negativ komponent):** Byggs upp snabbare, forsvinner snabbare. Representerar akut troetthet (muskelskada, glykogenuttomning, CNS-troetthet).

### Praktisk tillampning

Modellen forklarar varfor tapering fungerar: genom att minska traningen fore tavling minskar fatigue snabbare an fitness, vilket ger en prestandatopp. Den forklarar aven overtraning: nar fatigue ackumuleras snabbare an fitness byggs upp.

For ACWR-sammanhanget: en hog ACWR indikerar att fatigue-komponenten ar oproportionerligt hog relativt fitness, vilket okar skaderisken.

---

## Monotony Index and Strain

### Berakning

**Monotoni** mattar hur enformig traningen ar:

```
Monotoni = Veckans medelbelastning / Standardavvikelse av daglig belastning
```

Hog monotoni (>2.0) indikerar att varje dag ar liknande, vilket paradoxalt okar risken for overtraning. Variation ar skyddande.

**Strain** ar produkten av total belastning och monotoni:

```
Strain = Veckobelastning * Monotoni
```

Hog strain (hog belastning OCH hog monotoni) ar starkt associerat med sjukdom och skada. Foster et al. visade att sjukdomsincidens okade kraftigt nar strain oversteg kritiska nivåer.

### Praktisk riktlinje

- Variera traningsintensitet och typ over veckan
- Inkludera minst 1-2 latta dagar per vecka
- Undvik att kora samma pass dag efter dag
- Eftersträva en blandning av laga, måttliga och hoga belastningar

---

## Delaware Pain Rules for Rehabilitation

### Principer

Delaware pain rules ar ett evidensbaserat ramverk for att styra rehabilitering baserat pa smartrespons:

**Regel 1: Smartnivå under aktivitet**
- 0-2/10: Acceptabelt. Fortatt med nuvarande belastning eller oka.
- 3-4/10: Varningssignal. Behall nuvarande belastning, oka inte.
- 5+/10: Oacceptabelt. Minska belastningen.

**Regel 2: Smarta 24 timmar efter aktivitet**
- Om smartan atergår till baslinjenivå inom 24 timmar: OK att fortsatta.
- Om smartan ar forhojd >24 timmar efter aktivitet: Belastningen var for hog, backa ett steg.

**Regel 3: Svallnad/inflammation**
- Nytillkommen svallnad efter aktivitet indikerar for hog belastning
- Krav reduktion och eventuell medicinsk bedomning

### Implementering i traningsprogram

Skalan bor registreras dagligen av idrottaren:
- Fore traning: baslinjesmart
- Under traning: maxsmart
- 24 timmar efter: residualsmart

Om 24-timmars smartan ar hogre an baslinjen tva traning i rad: automatisk varning till tranare.

---

## Return-to-Sport Criteria

### Fasindelning

Atergang till idrott foljer en progressiv modell:

1. **ACUTE:** Skyddad belastning, smarthantering, ROM-aterhamtning
2. **SUBACUTE:** Progressiv belastning, funktionell styrka, neuromuskulär kontroll
3. **REMODELING:** Idrottsspecifika rorelsemonster, accelererande belastning
4. **FUNCTIONAL:** Full traningsvolym, reaktiv traning, sport-specifik testning
5. **RETURN TO SPORT:** Tavlingsbelastning, psykologisk beredskap

### Objektiva kriterier

- **Styrka:** >90% av friska sidan (isokinetisk testning eller 1RM)
- **Power:** Hop-test >90% av friska sidan (single-leg hop, triple hop, crossover hop)
- **Uthallighet:** Klarar fullstandig traningsession utan smartrespons
- **Funktionell testning:** Sport-specifika agility-tester, reaktionstester
- **Psykologisk beredskap:** ACL-RSI score >56/100 (for knaligament), inga undvikandebeteenden

---

## Load Management Principles

### Veckovolymökning: 10%-regeln

Den mest etablerade riktlinjen ar att oka traningsvolymen med max 10% per vecka. Detta galler primärt for:

- Total lopvolym (km/vecka)
- Total tranings-sRPE
- Antal hogintensiva pass

### Undvik belastningshopp >30%

Forskning visar att en vecka-till-vecka okning pa >30% i total belastning ger markant okad skaderisk, oavsett absolut belastningsniva. Detta ar sarskilt relevant vid:

- Atergang fran semester/uppehall
- Atergang fran sjukdom
- Traningslagerperioder
- Tavlingsintensifiering

### Hogintensitetshantering

Hogintensiv traning (>85% HRmax, RPE >7) ar den enskilt storsta riskfaktorn for overbelastningsskador. Riktlinjer:

- Max 2-3 hogintensiva pass per vecka for de flesta idrottare
- Minst 48 timmar mellan hogintensiva pass
- Nar total veckobelastning okas, oka volym fore intensitet
- Behall antal hogintensiva pass konstant vid volymökning

---

## Common Injury Scenarios by Sport

### Löpning
- **Patellofemoral smart (loparkna):** For snabb volymokning, bristande quadriceps/glutealstyrka
- **Akillestendinopati:** Plotslig okning av loppvolym eller intervalltraning, bristande vadmuskelstyrka
- **Tibial stress fracture:** Hog belastning + lag energitillganglighet (RED-S), bristande bentathet
- **IT-band syndrom:** Repetitiv belastning, bristande hoftrotationskapacitet

### Cykling
- **Knasmarta (patellofemoralt):** Felaktig sadelposition, for tung utvaxling, hog kadenz-variation
- **Landryggssmarta:** Bristande core-stabilitet, aggressiv aeroposition
- **Handledsneropati:** Langt hog belastning pa handlederna, bristande cykelfitting

### Lagidrotter (fotboll, handboll)
- **Hamstringsskada:** Hog sprinthastighet med for lag eccentrisk styrka, ACWR >1.5
- **Fremre korsband (ACL):** Landningsvalgus, troetthet, for lag neuromuskulär kontroll
- **Ljumskesmarta:** For snabb okning av riktningsforandringar och sprint

### Triathlon
- **Multisportbelastning:** Total ACWR maste beraknas over alla tre discipliner
- **Axelproblem:** Simvolym i kombination med aeroposition pa cykel
- **Stressfraktur:** Kombinerad lopning + dålig naring ar hograskgrupp

---

## Practical Guidelines Summary

### Daglig monitorering
1. Registrera sRPE och duration for varje traningspass
2. Mata vilohjarfrekvens och/eller HRV morgon
3. Subjektiv valmaendeskattning (somn, troetthet, stress, muskelomhet)
4. Smartskattning (Delaware-skalan) vid pagaende rehabilitering

### Veckovis analys
1. Berakna ACWR for varje idrottare
2. Flagga idrottare i CAUTION/DANGER/CRITICAL zoner
3. Granskning av monotoni och strain
4. Jamfor planerad vs faktisk belastning

### Beslutsstod
- ACWR OPTIMAL + lag monotoni: Fortsatt som planerat, overväg progressiv okning
- ACWR OPTIMAL + hog monotoni: Variera traning, behall total belastning
- ACWR CAUTION: Reducera planerade hogintensiva pass, oka aterhamtning
- ACWR DANGER: Omedelbar reduktion, ersatt med lagintensiv traning
- ACWR CRITICAL: Individuell bedomning, overväg fullstandig vila

### Sasongplanering
- **Forsasong:** Gradvis uppbygging, max 10%/vecka, ACWR mal 0.9-1.1
- **Tavlingsperiod:** Behall kronisk belastning stabil, planera for matchbelastning
- **Off-season:** Kontrollerad nedtrappning, behall minst 50% av sasongsbelastning
- **Rehabilitering:** Foljande ACWR som guide for progressiv atergang

---

## The Training-Injury Prevention Paradox

### Gabbetts paradox

En av de mest inflytelserika insikterna inom modern idrottsmedicin ar Gabbetts "training-injury prevention paradox" (2016). Paradoxen sammanfattas:

**Hog traningsbelastning ar bade den storsta riskfaktorn for skada OCH den storsta skyddsfaktorn mot skada.**

Forklaringen ar att kronisk belastning bygger kroppens tolerans. En idrottare som regelbundet tranar pa hog niva (hog kronisk belastning) har en kropp som ar anpassad till denna belastning. Skaderisken okar inte pa grund av hog absolut belastning, utan pa grund av snabba relativa forandringar (hog ACWR).

### Praktisk konsekvens

- Undvik att halla idrottare borta fran traning "for sakerhets skull" - det sander den kroniska belastningen och gor dem mer sarbara
- Under skaderehab: upprätthall sa hog traningsbelastning som mojligt inom smartfria gränser
- Under viloperioder: behall minst 50% av normal belastning for att skydda kronisk fitness
- Build physical robustness through progressive exposure, not avoidance

### Evidens

Studier pa australiensk cricket (Hulin et al., 2014) och australiensisk fotboll (Gabbett, 2010) visar konsekvent att idrottare med hogre kronisk belastning har LAGRE skaderisk, förutsatt att belastningsokningen sker gradvis. Idrottare som hoppade over 18+ traningsveckor under forsasongen hade 2-4 ganger hogre skaderisk under tavlingsperioden, aven efter kontroll for andra faktorer.

---

## Heart Rate Variability (HRV) for Injury Prevention

### HRV som monitoreringsverktyg

Hjarfrekvensvariabilitet (HRV) mattar variationen i tid mellan hjartslagen och reflekterar det autonoma nervssystemets balans mellan sympatikus (fight-or-flight) och parasympatikus (rest-and-digest).

**Relevans for skadeprevention:**
- Ssjunkande HRV-trend over dagar/veckor indikerar ackumulerad troetthet
- Plotslig HRV-minskning (>15% under personlig baslinje) kan indikera sjukdom, overtraning eller forhojd skaderisk
- HRV-guidad traning (HRVG) har visat positiva resultat i flera studier

### Praktisk anvandning

- Mata HRV varje morgon (fore uppstigande eller direkt efter uppvaknande)
- Anvand 7-dagars rullande medelvarde for att identifiera trender
- Kombinera med sRPE och subjektiv valmaende for helhetsbild
- Individuella baslinjer ar viktigast - jamfor alltid med idrottarens egna normer

### HRV och ACWR i kombination

Den mest effektiva monitoreringsstragein kombinerar:
1. **ACWR** for extern/intern belastningsmonitorering (prospektiv risk)
2. **HRV** for autonom nervssystemrespons (kroppens faktiska reaktion)
3. **Subjektiva matt** (somn, troetthet, stress) for psykosocial kontext

Nar ACWR ar i CAUTION-zon OCH HRV sjunker, ar risken avsevaart forhojd och omedelbara atgarder bor vidtas.

---

## Overtraining Syndrome (OTS) vs Overreaching

### Terminologi och differentiering

Det ar viktigt att skilja mellan funktionell och icke-funktionell overreaching, samt overtranigssyndrom:

**Funktionell overreaching (FOR):**
- Kortvarig prestationsminskning (dagar till 1-2 veckor)
- Aterhamtning med 1-2 veckors reduceraad traning
- Normal del av traningsprocessen (supercompensation)
- Planerad i periodisering (t.ex. overreaching-vecka foljd av vila)

**Icke-funktionell overreaching (NFOR):**
- Langvarig prestationsminskning (veckor till manader)
- Krav 2-4 veckors aterhamtning
- Hormonella forandringar (sank testosteron, forhojt kortisol)
- Stalld immunfunktion, okad sjuklighet

**Overtranignssyndrom (OTS):**
- Allvarligt, lang aterhamtning (manader till ar)
- Systemisk funktionsnedsattning
- Diagnos genom exklusion
- Extremt svart att skilja fran andra medicinska tilstand

### Varningssignaler

Tidiga tecken pa NFOR/OTS som bor flaggas:
- Prestationsminskning trots upplevd ansstraning
- Persistent trrotthet som inte svarar pa vila
- Soomnstoringar (svart att somna, tidig uppvakning)
- Aptitforlust eller okad irritabilitet
- Okad vilopuls (>5 slag over baslinje over flera dagar)
- Sjunkande HRV-trend
- Upprepad sjukdom (forkylningar, infektioner)

---

## Sport-Specific Injury Prevention Strategies

### Lopning: Forebyggande styrkeprogram

For lopare ar ett minimalt forebyggande program:
- **Excentrisk vadmuskeltraning:** 3x15 reps, bade rak och bojd kna, dagligen
- **Nordisk hamstringscurl:** 3x5 reps, 2-3 ganger/vecka
- **Single-leg calf raises:** 3x12 per sida
- **Hip abductor work:** Side-lying hip abduction, banded walks
- **Core:** Planks, pallof press, bird-dogs

### Lagidrott: FIFA 11+ och liknande program

Strukturerade uppvarmningsprogram som FIFA 11+ har visat:
- 30-50% reduktion av overbelastningsskador
- 50-70% reduktion av korsbandsskador (hos kvinnor)
- Effekten beror pa compliance: programmet maste goras regelbundet

### Cykling: Positionsoptimering

For cyklister ar den framsta skadeforebyggande insatsen professionell bikefitting:
- Korrekt sadelhojd forebygger knaskador
- Korrekt reach forebygger ryggproblem
- Cleat-position paverkar kna- och fotledsbelastning

---

## Key Terminology

| Svenska | English | Definition |
|---------|---------|------------|
| Akut belastning | Acute workload | Senaste 7 dagarnas traningsbelastning |
| Kronisk belastning | Chronic workload | Senaste 28 dagarnas traningsbelastning |
| Skaderisk | Injury risk | Sannolikheten for skada baserat pa belastningsmönster |
| Overbelastningsskada | Overuse injury | Skada orsakad av repetitiv belastning utan tillracklig aterhamtning |
| Atergang till idrott | Return to sport | Progressiv process for att sakert aterga till full traning/tavling |
| Belastningsmonitorering | Load monitoring | Systematisk tracking av traningsbelastning |
| Tapering | Tapering | Kontrollerad belastningsreduktion fore tavling |
| Troetthet | Fatigue | Tillfällig reduktion av prestationsformaga |

---

## References and Evidence Base

Denna kunskapsbas bygger pa forskning fran:
- Gabbett TJ (2016): The training-injury prevention paradox
- Blanch P, Gabbett TJ (2016): Has the athlete trained enough to return to play safely?
- Hulin BT et al. (2014): The acute:chronic workload ratio predicts injury
- Foster C (1998): Monitoring training in athletes with reference to overtraining syndrome
- Banister EW (1991): Modeling elite athletic performance
- Crossley KM et al. (2016): Delaware pain rules and clinical reasoning
