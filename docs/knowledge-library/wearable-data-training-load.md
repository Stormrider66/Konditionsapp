# Wearable-data & Traningsbelastning / Wearable Data & Training Load

## Introduction

Moderna wearables och sensorer genererar enorme mangder data om en idrottares traning, aterhamtning och fysiologiska status. For tranare och idrottsfysiologer ar utmaningen inte langre brist pa data utan att filtrera, tolka och omvandla denna information till kliniskt och praktiskt relevanta beslut. Denna kunskapsbas tacker de viktigaste metriska systemen for traningsbelastning, HRV-monitorering, proprietara plattformsmetrik, GPS- och effektmatardata samt praktiska strategier for att anvanda data utan att overtanka.

Ratt anvand kan wearable-data ge en tranare objektiv feedback som kompletterar subjektiv bedomning och coaching-intuition. Felaktigt anvand kan den skapa overdriven analys, sjalvdiagnostik och beslut som styrs av algoritmer snarare an fysiologisk forstaelse.

---

## Training Stress Score (TSS) and TRIMP

### TSS - Training Stress Score

Training Stress Score (TSS) utvecklades av Andrew Coggan som en del av hans arbete med effektbaserad traningsanalys for cykling. TSS kvantifierar den totala fysiologiska belastningen fran ett enskilt traningspass relativt till idrottarens funktionella troskelvarde (FTP).

**Formel:**
```
TSS = (Duration_sekunder x NP x IF) / (FTP x 3600) x 100
```

Dar:
- **Duration** = total passtid i sekunder
- **NP (Normalized Power)** = en algoritmiskt justerad genomsnittseffekt som viktar hogre intensitet tyngre an jamn anstrangning. NP beruknar ett 30-sekunders rullande medeleffektvarde, hojer till fjarde potensen, tar medelvarde, och sedan fjarderotsvaerdet. Detta gor att NP battre aterspeglar den metabola kostnaden av ett variabelt pass jamfort med enkel medeleffekt.
- **IF (Intensity Factor)** = NP / FTP. En IF pa 1.0 innebar att normaliserad effekt matchar FTP.
- **FTP (Functional Threshold Power)** = den maximala effekt som kan hallas i ungefar 60 minuter. Ofta estimerad som 95% av ett 20-minuterstest.

**Referensvarden for TSS:**
| TSS | Beskrivning | Aterhamtning |
|-----|-------------|--------------|
| < 150 | Lagt - medelbelastande pass | Normalt nasta dag |
| 150-300 | Medel - kravande pass | Viss trotthet nasta dag |
| 300-450 | Hogt - mycket tufft pass | Trotthet 2 dagar |
| > 450 | Extremt - elitniva lang distans | Kan kreva flera dagars vila |

Ett TSS pa exakt 100 motsvarar ett pass pa en timmes duration vid exakt FTP - det ar referenspunkten for hela skalan.

**Begraensningar:** TSS kraver en effektmatare och ett giltigt FTP-varde. Om FTP ar felaktigt estimerad (vanligt med inaktuella tester) blir alla TSS-berekningar missvisande. TSS ar ocksa primart utvecklat for cykling. For lopning finns run TSS (rTSS), och for simning swim TSS (sTSS), men dessa ar approximationer och saknar samma precisionsniva.

### TRIMP - Training Impulse

TRIMP (TRaining IMPulse), utvecklat av Eric Banister pa 1970-talet, ar en hjarfrekvensbaserad belastningsmetrik. TRIMP ar vaerdefullt for idrotter utan effektmatare, exempelvis lopning, langdskidakning, lagidrotter och simning.

**Banisters TRIMP-formel:**
```
TRIMP = Duration (min) x Delta HR x e^(b x Delta HR)

Delta HR = (HRpass - HRvila) / (HRmax - HRvila)
b = 1.92 for man, 1.67 for kvinnor
```

Den exponentiella viktningen ar central: tid vid hog hjarfrekvens bidrar oproportionerligt mycket till TRIMP-vardet. Ett 30-minuterspass vid 90% av HRmax genererar vasentligt hogre TRIMP an ett 30-minuterspass vid 70% av HRmax - inte dubbelt sa mycket, utan betydligt mer, pa grund av den exponentiella funktionen.

**Edwards TRIMP (Zonal TRIMP):**
En forenklad variant som multiplicerar tid i respektive hjartfrekvenszon med en zonavhangig viktningsfaktor:
```
TRIMP = (tid i zon 1 x 1) + (tid i zon 2 x 2) + (tid i zon 3 x 3) + (tid i zon 4 x 4) + (tid i zon 5 x 5)
```

Edwards TRIMP ar enklare att berakna och kraver inte korrektion for kon, men saknar den fysiologiska precis som Banisters modell erbjuder.

**Jamforelse TSS vs TRIMP:**
- TSS ar att foredraga nar effektdata finns tillganglig (cykling, rodd med effektmatare)
- TRIMP ar det basta alternativet for hjarfrekvensbaserade idrotter utan effektmatning
- For lagidrotter med GPS ar extern belastning (meter vid hog hastighet, accelerationer) ett battre komplement an enbart TRIMP
- Bada metriken kraver korrekta individuella referensvarden (FTP respektive HRmax/HRvila)

---

## The PMC Model (Performance Management Chart)

### Grundkoncept

Performance Management Chart (PMC) ar en visuell och matematisk modell for att overvaka forhalladet mellan traning, trotthet och form over tid. Modellen bygger pa Banisters fitness-fatigue-modell fran 1975 och implementerades praktiskt av Andrew Coggan och Hunter Allen i TrainingPeaks.

PMC bestar av tre huvudkomponenter:

### CTL - Chronic Training Load ("Fitness")

CTL representerar den kroniska traningsbelastningen - ett exponentiellt viktat rullande medelvardet av dagligt TSS over de senaste 42 dagarna. CTL kan betraktas som en proxy for "fitness" i den meningen att det aterspeglar den traningsvolym kroppen har anpassat sig till.

```
CTL_idag = CTL_igar + (TSS_idag - CTL_igar) / 42
```

**Tolkning:**
- Stigande CTL = okande traningsbelastning, fitness byggs
- Stabil CTL = underhallstraning
- Sjunkande CTL = detraining eller tapering
- Typiskt CTL for serioesa motionarer: 50-80 TSS/dag
- Typiskt CTL for elitcyklister: 100-150 TSS/dag

### ATL - Acute Training Load ("Fatigue")

ATL ar det exponentiellt viktade rullande medelvardet av TSS over de senaste 7 dagarna. ATL representerar den akuta trottheten fran den senaste veckans traning.

```
ATL_idag = ATL_igar + (TSS_idag - ATL_igar) / 7
```

ATL reagerar snabbt pa belastningsforandringar. En enstaka tuff traningsvecka hojer ATL markant, medan en vilovecka snabbt sanker det.

### TSB - Training Stress Balance ("Form")

TSB ar skillnaden mellan CTL och ATL:

```
TSB = CTL - ATL
```

**Tolkningsguide:**
| TSB | Status | Beskrivning |
|-----|--------|-------------|
| +10 till +30 | Fresh / Tapered | Utvilad, formtopp mojlig. Optimalt for tavling. |
| +5 till +10 | Funktionell overresning | Latt troett men valanpassad. Bra for kvalitetspass. |
| -10 till -30 | Produktiv traning | Normal belastning, kroppen anpassar sig. |
| < -30 | Overbelastningsrisk | For stor akut belastning relativt kronisk anpassning. |

**Varning:** TSB ar inte en exakt predictor for prestationsform. Det ar en forenklad modell som inte tar hansyn till samntyp, stress utanfor traning, sjukdom, naring eller psykologiska faktorer. Anvand TSB som en av manga informationskallor, inte som ensam beslutsgrund.

### Periodiserad PMC-analys

Erfarna tranare anvander PMC for att planera periodisering:
1. **Basfas**: CTL stiger gradvis (2-5 TSS/vecka), TSB latt negativt
2. **Byggfas**: CTL stiger mer aggressivt, TSB mer negativt (-20 till -30)
3. **Tapering**: TSS reduceras, ATL sjunker snabbare an CTL, TSB stiger mot positivt
4. **Tavling**: TSB +10 till +25, maximalt formtillstand

---

## Heart Rate Variability (HRV)

### Grundfysiologi

Heart Rate Variability (HRV) mater variationen i tidsintervallet mellan hjartslag (R-R intervall). Tvart emot vad manga tror ar hog variabilitet ett tecken pa god halsa och aterhamtning, medan lag variabilitet indikerar fysiologisk stress.

HRV styrs av det autonoma nervsystemet (ANS):
- **Parasympatiska nervsystemet (vagusnerven)**: Saktar ner hjartfrekvensen, okar variabiliteten. Dominerar vid vila och aterhamtning.
- **Sympatiska nervsystemet**: Okar hjartfrekvensen, minskar variabiliteten. Dominerar vid stress, anstrangning, sjukdom.

### rMSSD - Guldstandarden

rMSSD (Root Mean Square of Successive Differences) ar den rekommenderade metriken for daglig HRV-monitorering hos idrottare:

```
rMSSD = sqrt(mean((RR_n+1 - RR_n)^2))
```

rMSSD mater korttidsvariabilitet och aterspeglar primart parasympatisk aktivitet. Hogre rMSSD = hogre parasympatisk tonus = battre aterhamtning.

**Varfor rMSSD over andra HRV-metrik:**
- Mindre kanslig for andningsmonstret an HF (High Frequency) power
- Kraver kortare matperiod (1-3 minuter racker)
- Hogre dag-till-dag reliabilitet an SDNN eller LF/HF-kvot
- Validerat specifikt for idrottarmonitorering i forskning

### Tolkning av HRV-data

**Enskilda matningar ar i stort sett meningslosa.** HRV maste tolkas som trend over tid:

- **Normalt variationsband (CV):** Daglig HRV varierar naturligt med 5-15%. Matningar inom denna normalvariation ar inte meningsfulla forandringar.
- **7-dagars rullande medelvardet:** Trender over minst 7 dagar ar mer informativa an enskilda dagsvarden.
- **Undertryckningstrend:** Om 7-dagarsmedlet sjunker under individens normalvarde i mer an 3-5 dagar signalerar det ackumulerad trotthet, sjukdom eller overtraning.
- **Forhojningstrend:** Gradvis okande HRV-baseline indikerar positiv anpassning och forbattrad aterhamtningskapacitet.

### Parasympatisk Mattnadseffekt (Parasympathetic Saturation)

Ett viktigt fenomen hos valtranade uthallighetsidrottare: vid mycket hog aerob kapacitet kan HRV (rMSSD) na ett tak dar ytterligare forbattringar i fitness inte langre reflekteras i hogre HRV. Hos dessa idrottare ar HRV fortfarande vaerdefull for att detektera nedgang (overtraning, sjukdom), men hogre HRV-varden ska inte tolkas som "annu battre".

Praktiskt innebar detta att HRV-baserade rekommendationer maste kalibreras individuellt. En elit-lopare med rMSSD pa 120 ms som tappar till 90 ms ar troligen overtrottad, medan en motionar med rMSSD pa 40 ms som gar ner till 30 ms visar samma signalvardet i proportion.

---

## Setting Up Reliable HRV Monitoring (Morning Protocol)

### Matningsprotokoll

For att HRV-data ska vara tillforlitlig och jamforbar over tid kravs strikt konsistens i matningsprotokoll:

1. **Tidpunkt**: Mat HRV varje morgon inom 5 minuter efter att du vaknat. Innan du gar upp ur sangen ar idealiskt.
2. **Position**: Liggande (supine) ar att foredraga. Om sittande anvands, var konsekvent - byt aldrig position mellan matningar.
3. **Duration**: Minimum 60 sekunders stabil matning. 2-3 minuter rekommenderas for hogre precision.
4. **Andning**: Andas normalt, forsok inte kontrollera andningen. Djupandning eller guidad andning paverkar HRV markant och gor matningen oanvandbar for tranangsmonitorering.
5. **Sensor**: Brostband (Polar H10, Garmin HRM-Pro) ger betydligt hogre precision an optisk matning pa handled. For seriosa idrottare rekommenderas alltid brostband for HRV.
6. **Undvik**: Koffein, mat eller fysisk aktivitet innan matning. Aven en kort promenad till badrummet kan paverka resultatet.

### Applikationsval

- **HRV4Training**: Validerad i forskning, bra for individuell trendanalys, fungerar med bade brostband och telefonfotoplethysmografi (pPG)
- **Elite HRV**: Gratis grundversion, morgonavlasning med brostband
- **Oura Ring / Whoop**: Mater HRV automatiskt under natten (se nedan)

### Vanliga Felkallor

- Inkonsekvent metningstid (matning kl 06:00 vs 09:00 ger inte jamforbara varden)
- Byte mellan sensorer (optisk vs brostband)
- Alkoholkonsumtion kvallen fore (sanker HRV dramatiskt i 24-48 timmar)
- Byte av sovposition (rygg vs sida paverkar autonom balans)
- Sen kvallsmatid (matsmaltning okar sympatisk aktivitet under samnnen)

---

## Wearable Platform Metrics (Whoop, Oura, Polar)

### Whoop

**Recovery Score (0-100%):**
Whoops dagliga aterhamtningsscore baseras pa HRV (rMSSD), vilopuls, andningsfrekvens och somnkvalitet. Algoritmens exakta viktning ar proprietar och inte publicerad.

- **Gront (67-100%)**: Full aterhamtning, kroppen ar redo for hog belastning
- **Gult (34-66%)**: Delvis aterhaptad, monitorera under traning
- **Rott (0-33%)**: Otillracklig aterhamtning, prioritera vila

**Strain Score (0-21):**
Baseras pa procentuell tid i olika hjartfrekvenszoner under dygnet. Skalan ar logaritmisk - att ga fran 18 till 20 kraver oproportionerligt mer anstrangning an fran 10 till 12.

**Begransningar:** Whoop mater enbart via optisk sensor pa handleden, vilket ger lagre R-R-intervallprecision an brostband. For hogt valtranade idrottare med lag vilopuls kan Whoops optiska sensor ha svarare att detektera korrekta R-R-intervall.

### Oura Ring

**Readiness Score (0-100):**
Ouras readiness-score baseras pa nattlig HRV, kroppstemperatur, vilopuls, somnstadieforderling och aktivitetsniva foregaende dag.

- **Kroppstemperatur**: Oura mater fingertemperatur och anvander avvikelser fran personlig baseline. Forhojd temperatur kan indikera sjukdom innan symptom upptrader.
- **Somnstadier**: Oura categoriserar somn i djupsomn, REM-somn och latt somn baserat pa rorelsesensor och hjarfrekvens.
- **HRV Balance**: Jamfor nattlig HRV mot 2-veckorsmedel.

**Styrka:** Excellent for somnmonitorering och daglig aterhamtningsbedomning. Formfaktorn (ring) ger mindre stoerd samnm an handledsburna enheter.

**Begransningar:** Liten batteristorlek (3-7 dagar), ingen realtids-hjarfrekvens under traning, begransad tranigsanalys.

### Polar (H10 + Polar Flow / Vantage V3)

**Nightly Recharge:**
Polars nattliga aterhamtningsmatt som inkluderar ANS-ladding (HRV under somn) och somnladding (somnmengd och kvalitet).

- **ANS-ladding**: Jamfor nattlig HRV mot 28-dagars baseline. Resultatet presenteras pa en skala fran -10 till +10.
- **Somnladding**: Baserat pa somnlangd, kontinuitet och tidpunkt relativt till beraeknad optimal samnperiod.

**Orthostatic Test:**
Polars ortostatiska test (liggande-till-staende) ar en validerad metod for att bedoma autonom funktion. Testet mater HRV och hjartefrekvens i bade liggande och staende position, och analyserar skillnaden. Betydligt hogre hjartefrekvensreaktion an normalt kan indikera trotthet eller overtraning.

**Training Load Pro:**
Polars system delar upp belastning i tre kategorier:
- **Cardio Load**: Baserat pa TRIMP/EPOC
- **Muscle Load**: Estimerad fran mekanisk belastning (acceleration, vertikala krafter)
- **Perceived Load**: Subjektiv RPE-inmatning

**Styrka:** Polar H10 ar referensstandarden for optisk hjarfrekvensmotning bland konsumentprodukter. Hogsta R-R-intervallprecision pa marknaden for icke-medicinsk utrustning.

---

## GPS Accuracy and Limitations

### Teknisk Bakgrund

GPS-mottagare i sportklockor anvander signaler fran satellitkonstellationer (GPS, GLONASS, Galileo, BeiDou) for att berukna position. Noggrannheten beror pa antalet synliga satelliter, signalkvalitet och miljo.

### Typiska Noggrannhetsvarden

| Miljo | Noggrannhet | Kommentar |
|-------|-------------|-----------|
| Oppet falt | 2-5 meter | Basta mojliga forhallanden |
| Stadsomrade | 5-15 meter | Signalreflektion fran byggnader ("urban canyon") |
| Skog | 5-20 meter | Tradkronor forsvagar signal |
| Inomhus / tunnel | > 50 m eller tappad signal | GPS ar i princip oanvandbart inomhus |

### Konsekvenser for Traningsdata

- **Distans**: GPS-distans kan avvika 1-5% fran verklig distans beroende pa miljo. Slinga i park: ~1-2% avvikelse. Terranglop i taet skog: upp till 5-8%.
- **Pace/hastighet**: Momentan pace ar ofta ostabil och opalitig, sarskilt vid lag hastighet (< 8 km/h). Anvand snarare genomsnittspace per kilometer eller rullande medelvardet.
- **Hojddata**: Barometrisk hojdmatare (finns i de flesta moderna klockor) ar betydligt battre an GPS-baserad hojd. GPS-hojd kan avvika 10-30 meter.
- **Vertikala roreser**: Sprint, intervaller med plotoiga riktningsandringar och staende pauser genererar GPS-drift som overestimerar distans.

### Multi-Band GPS

Nyare klockor (Garmin Fenix 7+, COROS Vertix 2, Suunto Vertical) stodjer multi-band (dualfrekvens) GPS som anvander bade L1- och L5-frekvensband. Detta forbattrar noggrannheten avsevart i utmanande miljoer (stad, skog) men okar batteriforbuckningen med 30-50%.

### Praktiska Rekommendationer

1. **Kalibrera med kanda distanser** - kor/spring en uppmatt bana och jemfor
2. **Anvand inte momentan pace** for intervalltraning - anvand snarare manuella varvnotingar
3. **Stall in langst "GPS-sak"-tid** pa klockan for battre noggrannhet (vanligtvis "varje sekund")
4. **For bantraning** (400m-bana): anvand bankalibrering om klockan stodjer det, eller rakna varv manuellt
5. **Forvanta dig avvikelser** och lat inte GPS-data overrida subjektiv kensla av anstrangning

---

## Power Meter Calibration and Reliability

### Varfor Kalibrering ar Kritiskt

En effektmatares vardet ligger i dess konsistens over tid. Om effektmataren visar 250 W idag maste den visa 250 W i morgon under identiska forhallanden - annars ar all belastningsberakning (TSS, IF, NP) oanvandbar.

### Kalibreringsprotokoll

1. **Nollstallning fore varje pass**: Lat effektmataren acklimatisera till omgivningstemperaturen i 10-15 minuter, utfor sedan "zero offset" i klockans menu.
2. **Temperaturberomagnet**: Effektmatare anvander strain gauges som paverkas av temperatur. Kalibrering inomhus vs utomhus i kyla ger olika offset.
3. **Statisk kalibrering**: Hang en kand vikt pa vevarmen (t.ex. 10 kg) och verifiera avlasningen. Optimal att gora 1-2 ganger per ar.
4. **Korsvalidering**: Om mojligt, jamfor med en annan effektmatare eller en kand smart trainer.

### Vanliga Effektmatartyper

| Typ | Precision | Fordelar | Nackdelar |
|-----|-----------|----------|-----------|
| Dubbel-sidig (vev) | +/- 1% | Mater bada benen, hogst precision | Dyrast |
| Enkel-sidig (vev) | +/- 2% | Billigare, lattmonterad | Antar symmetrisk kraftfordelning |
| Pedalbaserad | +/- 1-2% | Flyttes enkelt mellan cyklar | Behover kompatibla pedaler |
| Nav-baserad | +/- 1% | Stabilt, ingen drift | Kan inte flytta mellan hjul |
| Kedjering (power spider) | +/- 1.5% | Brett kompatibilitetsstod | Kraver specifik vev |

### Driftproblem och Felkallor

- **Batteriniva**: Laga batterier ger felaktiga avlasningar - byt batteri regelbundet
- **Firmware**: Hall firmware uppdaterad - tillverkare korrigerar kalibreringsbuggar
- **Montering**: Felaktigt atdragningsmoment pa vevarm kan ge inkonsekvent data
- **Skador**: Mikrosprickor i strain gauges efter stot eller fall ger gradvis drift

---

## Using Data vs. Overthinking Data (Practical Coaching Perspective)

### Datans Roll i Tranarens Verktygslada

Data fran wearables ar ett verktyg - inte en ersattning for coaching-kompetens, fysiologisk kunskap och idrottarkannedom. De mest framgangsrika tranarna anvander data for att bekrafta eller utmana sina observationer, inte for att automatisera beslutsfattande.

### Nar Data Hjalper

- **Objektiv overbelastningsmonitorering**: TSS/TRIMP-trender avslojad gradvis overbelastning som tranaren kanske inte noterar i enstaka pass
- **Aterhamtningsvalidering**: HRV-trender bekraftar om en vilovecka faktiskt gett aterhamtning
- **Periodiseringsverifiering**: PMC-modellen validerar att tapering uppnar onskad formtopp
- **Kommunikation med idrottaren**: Data ger ett gemensamt sprak for att diskutera traningsbelastning

### Nar Data Vilseleder

- **"Nummerberoende" idrottare**: Idrottare som vagrar trana hart nar deras HRV ar "lag" eller som vagrar vila nar deras TSB ar "for positivt"
- **Algoritmstyrda tavlingsbeslut**: Att stalla in tavling baserat pa TSB snarare an traningsplan och intuition
- **Proprietara poangtyper som sanning**: Whoops Recovery Score eller Garmins Body Battery ar approximationer, inte fysiologiska fakta
- **Overanalys av daglig variation**: Enstaka HRV-matning som ar 5% lagre an normalt ar meningslos - det ar trenden som ratknas

### Hierarki for Beslutsfattande

1. **Idrottarens kommunikation**: Hur kanner du dig? Sovit bra? Stressad? Sjuk? Motiverad?
2. **Tranarens observation**: Rorelsekvalitet, engagemang, tecken pa trotthet under uppvarmning
3. **Objektiv datatrend**: HRV 7-dagarsmedel, CTL-trend, ACWR
4. **Enskild dagsdatapunkt**: Dagens HRV, somnpoang, Recovery Score

Denna hierarki innebar att om en idrottare sager "jag kanns bra och redo" men dagens HRV ar latt sunkt, sa tranar vi som planerat. Om trenden over 5 dagar visar sjunkande HRV OCH idrottaren rapporterar trotthet och dalig somn - da justerar vi.

### Roda Flaggor for "Data-overtank"

- Idrottaren kollar klockan/appen innan han/hon bestammer om det blir traning
- Tranarens programplanering andras dagligen baserat pa algoritmscore
- Diskussioner om traning kretsar kring siffror snarare an kansla och utveckling
- Idrottaren blar missnojd nar "numren inte stammer" trots bra prestation

---

## Weekly and Monthly Review Patterns for Coaches

### Veckovis Review (15-20 minuter per idrottare)

Varje vecka bor tranaren granska foljande for varje idrottare:

**Belastningsoversikt:**
- Total vecko-TSS/TRIMP jemfort med planerad belastning
- ACWR-berakning: hamnar idrottaren i optimal zon (0.8-1.3)?
- Intensitetsfordelning: stammer faktisk zon-fordelning med planerad?

**Aterhamtningsmarkoerer:**
- HRV 7-dagarsmedel: trend uppat, stabil, eller sjunkande?
- Vilopuls-trend: plotolig okning (> 5 slag/min over baseline) ar varningssignal
- Subjektiv wellness: somnkvalitet, energiniva, motivationsniva

**Traningsefterlevnad:**
- Genomforde idrottaren de planerade passen?
- Finns det monster av uteblivna pass (oftast hogintensiva eller tidigt pa morgonen)?
- Var avvikelserna motiverade (sjukdom, arbete) eller signalerar de motivationsbrist?

### Manadsvis Review (30-45 minuter per idrottare)

Varje manad bor en djupare analys goras:

**CTL-trend:**
- Foljer CTL den planerade periodiseringskurvan?
- Har det forekommit oplanerade belastningsdippar (sjukdom, resor)?
- Ar CTL-okningen rimlig (generellt max 5-7 TSS/vecka for de flesta idrottare)?

**Prestandatester och Nyckelpass:**
- Effekt/pace vid troskelhjartefrekvens: forbattring, stillastarnde, forsemring?
- Intervalltider vid given anstnengningsniva: utvecklas de i ratt riktning?
- Tavlingsresultat relativt till traningsperiod

**Langsiktiga HRV-trender:**
- Har HRV-baseline forattrats under perioden?
- Forekommer monster av HRV-suppressioner kopplat till specifika traningsfaser?
- Aterhamtningstid efter belastningsveckor: snabbare eller langsammare an tidigare?

**Skade- och Sjukdomsregister:**
- Har idrottaren haft nigra skadeforstoerelser eller sjukdomsepisoder?
- Korrelerar dessa med identifierbara belastningsmonster?
- Behover preventiva atgarder vidtas?

### Kvartalsvis Strategisk Review

Var tredje manad: oversyn av den overgraipande periodiseringsplanen, uppdatering av troeskelvaraden och zoner baserat pa nya tester, justering av arsmalet om nodvandigt.

---

## Key Terminology / Nyckeltermer

| Term | Forkortning | Forklaring (Svenska) | Forklaring (English) |
|------|-------------|----------------------|----------------------|
| Training Stress Score | TSS | Effektbaserat belastningsmatt, 100 = 1h vid FTP | Power-based load metric, 100 = 1h at FTP |
| Training Impulse | TRIMP | Hjarfrekvensbaserat belastningsmatt med exponentiell viktning | HR-based load metric with exponential weighting |
| Normalized Power | NP | Algoritmiskt justerad medeleffekt som aterspeglar metabol kostnad | Algorithmically adjusted average power reflecting metabolic cost |
| Intensity Factor | IF | NP / FTP, mattar passintensitet relativt till troeskel | NP / FTP, measures session intensity relative to threshold |
| Functional Threshold Power | FTP | Maximal effekt over ~60 minuter | Maximum sustainable power for ~60 minutes |
| Chronic Training Load | CTL | 42-dagars exponentiellt viktat medelvardet av TSS ("fitness") | 42-day exponentially weighted TSS average ("fitness") |
| Acute Training Load | ATL | 7-dagars exponentiellt viktat medelvardet av TSS ("trotthet") | 7-day exponentially weighted TSS average ("fatigue") |
| Training Stress Balance | TSB | CTL - ATL, indikerar formtillstand | CTL - ATL, indicates form/freshness |
| Heart Rate Variability | HRV | Variation i tid mellan hjartslag, mater autonom nervaktivitet | Variation in time between heartbeats, measures autonomic nervous activity |
| rMSSD | rMSSD | Root Mean Square of Successive Differences, guldstandard HRV-metrik | Root Mean Square of Successive Differences, gold standard HRV metric |
| Acute:Chronic Workload Ratio | ACWR | Forhallande mellan akut och kronisk belastning, skaderiskindikator | Ratio of acute to chronic load, injury risk indicator |
| Rate of Perceived Exertion | RPE | Subjektiv upplevd anstrangning pa 1-10-skala | Subjective perceived effort on 1-10 scale |
| Session RPE | sRPE | RPE x duration (min), enkel belastningsmetrik | RPE x duration (min), simple load metric |
| Performance Management Chart | PMC | Visuell modell av CTL/ATL/TSB over tid | Visual model of CTL/ATL/TSB over time |
| Parasympathetic Saturation | - | Fenomen dar HRV natt tak hos hogtranade idrottare | Phenomenon where HRV plateaus in highly trained athletes |
| Multi-Band GPS | - | Dualfrekvens GPS (L1+L5) for foerbattrad noggrannhet | Dual-frequency GPS (L1+L5) for improved accuracy |

---

## References

### Vetenskapliga Publikationer

1. **Coggan, A.R.** (2003). Training and racing with a power meter. *VeloPress*. - Grundlaggande verk om TSS, NP, IF och PMC-modellen.

2. **Banister, E.W.** (1991). Modeling elite athletic performance. In *Physiological Testing of the High-Performance Athlete*, pp. 403-424. - Ursprunglig fitness-fatigue-modell och TRIMP.

3. **Plews, D.J., Laursen, P.B., Stanley, J., Kilding, A.E., & Buchheit, M.** (2013). Training adaptation and heart rate variability in elite endurance athletes: Opening the door to effective monitoring. *Sports Medicine*, 43(9), 773-781. - Nyckelreferens for HRV-monitorering hos idrottare.

4. **Plews, D.J., Laursen, P.B., Kilding, A.E., & Buchheit, M.** (2012). Heart rate variability in elite triathletes, is variation in variability the key to effective training? A case comparison. *European Journal of Applied Physiology*, 112(11), 3729-3741. - Parasympatisk mattnadseffekt och individuell HRV-tolkning.

5. **Gabbett, T.J.** (2016). The training-injury prevention paradox: should athletes be training smarter and harder? *British Journal of Sports Medicine*, 50(5), 273-280. - ACWR-modellens tillamning for skadeprevention.

6. **Buchheit, M.** (2014). Monitoring training status with HR measures: Do all roads lead to Rome? *Frontiers in Physiology*, 5, 73. - Comprehensive oversikt av hjarfrekvensbaserad traningsmonitorering.

7. **Allen, H. & Coggan, A.R.** (2010). Training and Racing with a Power Meter (2nd ed.). *VeloPress*. - Standardverk for effektbaserad traningsanalys inklusive PMC.

8. **Flatt, A.A. & Esco, M.R.** (2016). Evaluating individual training adaptation with smartphone-derived heart rate variability in a collegiate female soccer team. *Journal of Strength and Conditioning Research*, 30(2), 378-385. - Validering av smartphone-baserad HRV-matning.

9. **Edwards, S.** (1993). *The Heart Rate Monitor Book*. Polar Electro Oy. - Edwards TRIMP-metoden.

10. **Bourdon, P.C., et al.** (2017). Monitoring athlete training loads: Consensus statement. *International Journal of Sports Physiology and Performance*, 12(s2), S2-161. - Konsensus for belastningsmonitorering.

### Resurser och Verktyg

- **TrainingPeaks**: PMC-modellens primaera implementering, WKO5 for avancerad analys
- **HRV4Training**: Validerad HRV-applikation for daglig monitorering
- **Intervals.icu**: Gratisverktyg for PMC-analys med Strava/Garmin-integration
- **Golden Cheetah**: Open source-verktyg for effektanalys (cykling)
