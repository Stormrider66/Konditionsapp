# Simtraning / Swimming Training

## 1. Introduction: The Physiology of Competitive Swimming

Simning ar en unik uthallighetsidrett dar prestation bestams av en komplex samverkan mellan fysiologisk kapacitet, teknisk effektivitet och hydrodynamisk formaga. Till skillnad fran landbaserade idrotter sker simning i ett medium med cirka 800 gangers hogre densitet an luft, vilket innebar att energikostnaden for framdrivning domineras av vattenmotstandet snarare an kroppsvikt. En forbattring av stromlinjeform (streamline) pa bara 1-2% kan ge storre prestandavinster an veckor av fysiologisk traning.

Elitsimmare uppnar typiskt VO2max-varden pa 60-75 ml/kg/min for man och 55-65 ml/kg/min for kvinnor -- lagre an lopare och cyklister, men med hogre mekanisk effektivitet i vatten tack vare aratal av teknikspecifik anpassning. Simningens horisontella kroppslage paverkar hemodynamiken: det hydrostatiska trycket pa brostkorg och lungor okar venost aterflode och slagvolym, medan hjartfrekvensen typiskt ar 10-15 slag lagre i vatten an vid motsvarande anstrangning pa land (diving reflex-effekten). Darfor kan inte pulszoner fran lopning eller cykling direkt overforas till simning.

For AI-baserad traningsplanering ar det centralt att forsta att simprestation regleras av tre parallella system: (1) energiproduktion (aerob/anaerob kapacitet), (2) energikostnad (teknik, hydrodynamik, drag) och (3) framdrivningseffektivitet (simtagets mekanik, catch, kick-bidrag). En effektiv traningsalgoritm maste balansera alla tre dimensioner.

---

## 2. Critical Swim Speed (CSS) -- Kritisk Simhastighet

### 2.1 Definition

Critical Swim Speed (CSS) ar det mest anvanda truoskelmattet i simtraning. CSS approximerar den hogsta hastighet en simmare kan upprätthalla i steady-state utan progressiv laktatackumulation, och fungerar som en praktisk surrogatmarkur for Maximal Lactate Steady State (MLSS) och den anaeroba trosskeln. Konceptet utvecklades av Wakayoshi et al. (1992) och ar analogt med Critical Power i cykling.

### 2.2 Testprotokoll

**Standardtest (400m + 200m):**

1. Grundlig uppvarmning: 400-600m blandad simning, inklusive tekniktovningar och 4x50m progressivt okande tempo
2. 400m Time Trial -- maximal ansträangning med jamn pacing
3. Full aterhamtning: minst 15-20 minuter (aktiv aterhamtning, latt simning)
4. 200m Time Trial -- maximal anstrangning

**Berakning:**

```
CSS (m/sek) = (D2 - D1) / (T2 - T1)
CSS (m/sek) = (400 - 200) / (T400 - T200)

Tempo per 100m = 100 / CSS
```

**Exempel:** En simmare som simmar 400m pa 5:20 (320 sek) och 200m pa 2:32 (152 sek):
- CSS = 200 / (320 - 152) = 200 / 168 = 1.190 m/s
- Tempo/100m = 100 / 1.190 = 84.0 sek = 1:24/100m

### 2.3 Alternativa CSS-tester

**200m + 100m test (for korttidssimmare):**
- Mer lamplig for sprinters och simmare under 200m
- CSS = 100 / (T200 - T100)

**800m + 200m test (for langdistanssimmare):**
- Hogre noggrannhet for distansorienterade simmare
- CSS = 600 / (T800 - T200)

### 2.4 CSS-normer och validitet

| Niva | CSS-tempo/100m (25m bassang) | Kommentar |
|------|------------------------------|-----------|
| Nyborjare | > 2:15 | Teknikbegransad, inte fysiologiskt styrd |
| Motionssimmare | 1:45-2:15 | CSS-testet ar meningsfullt fran denna niva |
| Avancerad amatoor | 1:25-1:45 | God korrelation med MLSS |
| Klubbelit | 1:10-1:25 | Hog tillforlitlighet i testresultat |
| Nationell elit | 1:00-1:10 | CSS underestimerar MLSS nagot |
| Internationell elit | < 1:00 | Bor kompletteras med laktatprofil |

**Viktigt:** CSS overskattar typiskt MLSS-hastighet med 3-5% i kortbassang (25m) pa grund av vandningarna. I langbassang (50m) ar korrelationen starkare.

---

## 3. Swimming Energy Zones -- Energizoner for Simning

Simningens traningszoner baseras pa CSS som ankarmarkur, liknande hur FTP anvands i cykling eller laktattroskel i lopning. Det internationella zonssystemet (utvecklat av forra australiensiska landslagscoachen Bill Sweetenham och vidareutvecklat av British Swimming) ar det mest utbredda:

### 3.1 Zondefinitioner

| Zon | Namn | Intensitet | Tempo relativt CSS | Typisk duration |
|-----|------|-----------|--------------------|-----------------|
| EN1 | Aerobic Endurance | Lag | CSS + 4-8 sek/100m | 20-60 min kontinuerligt |
| EN2 | Anaerobic Threshold | Moderat-Hog | CSS +/- 2 sek/100m | 20-40 min totalt arbete |
| EN3 | VO2max Training | Hog | CSS - 3-6 sek/100m | 8-20 min totalt arbete |
| SP1 | Lactate Production | Maxnara | Maxhastighet, 25-75m | 2-6 min totalt arbete |
| SP2 | Lactate Tolerance | Submaximal | 85-95% maxhastighet, 100-200m | 4-10 min totalt arbete |
| SP3 | Race Pace | Tavlingspecifik | Malhastighet for tavling | Varierar |
| REC | Recovery | Mycket lag | > CSS + 10 sek/100m | 15-30 min |

### 3.2 Nyckelpass per zon

**EN1 -- Aerob basuthallighet:**
- 15x200m @ CSS + 5-6 sek/100m, 20 sek vila
- 6x400m @ CSS + 6-8 sek/100m, 30 sek vila
- 3000m kontinuerlig simning @ CSS + 5 sek/100m
- Syftet ar att utveckla aerob kapacitet, mitokondriell densitet och fettoxidation

**EN2 -- Troskelsimning:**
- 10x100m @ CSS, 15-20 sek vila (standardpasset for EN2)
- 5x200m @ CSS, 20-30 sek vila
- 3x300m @ CSS + 1-2 sek/100m, 30 sek vila
- 30 min kontinuerlig simning @ CSS + 2 sek/100m
- Syftet ar att hoja anaerob troskel och forbattra laktatclearance

**EN3 -- VO2max-traning:**
- 8x100m @ CSS - 3-4 sek/100m, 45-60 sek vila (1:1 arbete:vila)
- 5x200m @ CSS - 2-3 sek/100m, 2 min vila
- 16x50m @ CSS - 5-6 sek/100m, 30 sek vila
- Syftet ar att maximera VO2-stimulans och utveckla aerob power

**SP1 -- Laktatproduktion (sprint):**
- 8x25m all-out, 2 min vila
- 4x50m all-out, 3 min vila
- 6x25m med start fran vattnet, maximal hastighet, 90 sek vila
- Syftet ar att utveckla maximal anaerob effekt och neuromuskulara rekrytering

**SP2 -- Laktattolerans:**
- 4x100m @ 90-95% maxhastighet, 3-4 min vila
- 3x150m @ 85-90% max, 5 min vila
- Syftet ar att forbattra buffertkapacitet och tolerans for hog laktatackumulation

---

## 4. Stroke Mechanics Fundamentals -- Teknikgrunder

### 4.1 Frisim (Freestyle / Front Crawl)

Frisim ar den snabbaste och mest energieffektiva simstilen och utgor 70-80% av traningsvolymen for de flesta tavlingssimmare.

**Kroppslage och rotation:**
Kroppen ska ligga hogt och horisontellt i vattnet med en naturlig rotation kring langdaxeln pa 30-45 grader at varje sida. Rotationen drivs fran balen (core) och hofterna, inte fran axlarna isolerat. Ett vanligt fel ar att rotera for lite, vilket begroansar armslagets rackvidd och okar drag.

**Armtag -- De fyra faserna:**
1. **Entry och Extension:** Handen gar i vattnet framfor axeln med fingertopparna forst, lat vinkel. Armen stracks fullt ut framfor kroppen under vattenytan (catch-up position). Overracking overkroppsmittlinjen ar ett vanligt fel som orsakar axelproblem.
2. **Catch (fangst):** Den kritiska fasen for framdrivning. Handen och underarmen bojs nedat till vertikal position -- Early Vertical Forearm (EVF). Armbagen forblir hog medan handen far nedat och bakat. God EVF ar den enskilt viktigaste tekniska faktornen for framdrivning.
3. **Pull och Push:** Handen drar under kroppen i en svagt S-formad bana. I pull-fasen bojer armbagen till cirka 90 grader. I push-fasen stracks armen bakat forbi hoften for fullstandig kraftoverforing.
4. **Recovery:** Armen lyfts ur vattnet med hog armbag (high elbow recovery). Handen ar avslappnad och passerar nara kroppssidan. Fingertopparna far lag nara vattenytan innan entry.

**Benspark (Kick):**
Frisimssparken ar en kompakt, snabb alternerande spark fran hoften med latt bojda knan. Sparken bidrar med 10-15% av framdrivningen hos elitsimmare men ar viktigare for kroppslage och balans. For langdistanssimmare anvands ofta en tvaslag (2-beat kick) for att spara energi, medan sprintare anvander sexslag (6-beat kick) for maximal kraft.

### 4.2 Ryggsim (Backstroke)

Ryggsim delar manga biomekaniska principer med frisim men utfors i rygglige:

- **Kroppslage:** Hofterna hogt, huvudet still i neutral position, oronen delvis under vattenytan
- **Armtag:** Lillfingret gar i forst vid entry, catch sker med boijd armbag och handflatan vand mot fotterna
- **Rotation:** 40-50 grader rotation ar optimal -- mer an i frisim
- **Benspark:** Alternerande spark fran hoften, toppen av sparken ska precis bryta vattenytan

### 4.3 Brostsim (Breaststroke)

Brostsim ar den langsammaste tavlingsstilen men den mest tekniskt komplexa:

- **Timing:** "Pull - Breathe - Kick - Glide" ar grundsekvensen. Armdrag och benspark overlappar aldrig -- nar armarna drar ar benen samlade, nar benen sparkar ar armarna framstrackt
- **Benspark:** Knana dras upp mot kroppen, fotterna roteras utat (dorsiflexion + eversion), och sparken gar utat-bakat-ihop i en piskliknande rorelse. Sparkens bredd och timing ar avgoorande
- **Armtag:** Kort, explosivt utatsveep foljt av inatsveep med hoga armbaagar. Handerna dras aldrig forbi axellinjen
- **Streamline:** Maximal streamline-position efter varje spark -- har forlooras eller vinns loppet
- **Undulering:** Modern brostsimsteknik inkluderar en kroppsvag (undulation) fran brost till hoft som minskar drag och forbattrar timing

---

## 5. Technique Drills -- Teknikovningar

### 5.1 Frisimovningar

| Ovning | Syfte | Utforande |
|--------|-------|-----------|
| Fingertip Drag | Hog armbag i recovery, minska axelbelastning | Dra fingertopparna langs vattenytan under recovery-fasen. Armbagen leds hogt. |
| Catch-Up | Timing, streamline, forlangd framdrivningsfas | Bada handerna moots framfor huvudet innan nasta armtag borjar. Haller en hand framstrackt tills den andra nuddar den. |
| Fist Drill | Sensorisk medvetenhet, engagera underarmen for EVF | Sim frisim med knutna navar. Tvingar simmaren att anvanda underarmen som paddel -- utvecklar EVF-kansla. |
| Single Arm | Isolera armtagets faser, identifiera asymmetrier | Sim med en arm i taget, andra armen framstrackt. Fokusera pa catch och pull. |
| 6-3-6 | Rotation och balans | 6 sparkar pa sidan, 3 armtag, 6 sparkar pa andra sidan. Traanar kroppsrotation och sparkbalans. |
| Sculling | Vattenkansla och catch-position | Handerna ror sig i 8-formade monster i olika positioner (front scull, mid scull, back scull). |
| Kick on Side | Kroppslage och rotation | Ligg pa sidan med underarmen framstrackt, sparka med ansiktet halvt i vattnet. Trana horisontellt lage. |
| Tarzan Drill | Huvudlage och hog armbagsposition | Sim frisim med huvudet ovanfor vattenytan, ogonen framaat. Utvecklar hog catch och stark pull. |

### 5.2 Teknikverktyg

- **Paddles:** Okar motstandet, forstarker catch och pull. Borja med sma paddles for att undvika axelskador. Anvand inte mer an 20-25% av total volym.
- **Pull Buoy:** Eliminerar bensparken och hojer hofterna, isolerar overkroppens framdrivning. Avsloojar om simmaren ar beroende av spark for kroppslage.
- **Snorkel (front-mounted):** Tar bort andningsrotationen, tillater fokus pa symmetrisk teknik och kroppslage.
- **Fenor (Fins):** Okar sparkeffektiviteten och tillater hogre hastighet for teknikinlarning. Korta fenor ar att foredra for tavlingssimmare.

---

## 6. Periodization for Competitive Swimmers -- Periodisering

### 6.1 Makrocykel (Arscykel)

Simningens sasong foljer typiskt en dubbelperiodiserad modell med tva tavlingsperioder (kort- och langbane-SM) eller en enkel periodisering med en huvudtavling:

**Fas 1: General Preparation (4-6 veckor)**
- Fokus: Aerob basuppbyggnad, allman styrka, teknikarbete
- Volym: 70-80% av toppvolym, lag intensitet dominerar
- Traningsfordelning: 80% EN1, 15% EN2, 5% teknik/sprint
- Typisk vecka: 7-9 simpass, 2-3 landtraning, total 25-35 km simning (seniorelitsniva)

**Fas 2: Specific Preparation (4-8 veckor)**
- Fokus: Zonspecifik traning, okad intensitet, tavlingsspecifik styrka
- Volym: 90-100% av toppvolym (hogsta volymen i cykeln)
- Traningsfordelning: 60% EN1, 20% EN2, 10% EN3, 10% SP1-SP3
- Denna period inkluderar de tuffaste traningsveckorna med hog volym och intensitet

**Fas 3: Competition Preparation (3-4 veckor)**
- Fokus: Tavlingshastighet, race pace-arbete, minskat avstand men okad kvalitet
- Volym: 80-90% av toppvolym, minskande mot slutet
- Traningsfordelning: 50% EN1, 15% EN2, 15% EN3, 20% SP/Race Pace

**Fas 4: Taper och Tavling (2-3 veckor)**
- Fokus: Maximal aterhamtning med bibehallen intensitet och redukterad volym
- Volym: Minskar progressivt till 40-60% av toppvolym
- Tapering-strategi: Behall frekvens (antal pass), behall intensitet, minska avstand per pass med 50-70%
- Forvaantad prestandafoorbattring fran taper: 2-4% (Mujika et al., 2004)

**Fas 5: Recovery / Transition (2-4 veckor)**
- Aktiv aterhamtning, annan fysisk aktivitet, mental avlastning
- Volym: 30-50% av normal, ostrukturerad

### 6.2 Mikrocykel (Veckoplanering)

En typisk traningsvecka for en senior klubbsimmare (40-50 km/vecka):

| Dag | Morgonpass | Eftermiddagspass |
|-----|-----------|------------------|
| Mandag | EN1 3000m + teknik | EN2 troskelsats + SP1 sprint |
| Tisdag | EN1 4000m langpass | Landtraning (styrka) |
| Onsdag | EN3 VO2max-sats | EN1 3000m aterhamtning |
| Torsdag | EN1 3500m + pull | Landtraning + teknik |
| Fredag | EN2 troskelsats | SP2/SP3 tavlingsspecifik |
| Lordag | EN1 5000m langpass | Vila |
| Sondag | Vila | Vila eller latt aterhamtning |

---

## 7. Training Volume Guidelines -- Volymriktlinjer

### 7.1 Volym per niva och alder

| Niva / Alder | Pass/vecka | Km/vecka | Landtraning/vecka |
|-------------|-----------|---------|-------------------|
| Ungdom 10-12 ar | 4-6 | 10-18 km | 1-2 (allman motorik) |
| Ungdom 13-15 ar | 6-8 | 18-30 km | 2 (grundstyrka) |
| Junior 16-18 ar | 8-10 | 30-45 km | 2-3 (simspecifik styrka) |
| Senior klubbniva | 7-9 | 35-50 km | 2-3 |
| Senior nationell elit | 9-11 | 50-70 km | 3-4 |
| Senior internationell elit | 10-12 | 60-80 km | 3-4 |
| Masterssimmare | 3-6 | 10-25 km | 1-2 |
| Motionssimmare | 2-4 | 6-15 km | 0-1 |

### 7.2 Progressionsprinciper

- **10%-regeln:** Oka inte total veckovolym med mer an 10% per vecka
- **3:1 loading:** Tre progressiva veckor foljt av en aterhamtningsvecka (70-80% volym)
- **Intensitetsfordelning:** Undvik att oka bade volym och intensitet samtidigt. Bygg volym forst, lagg till intensitet darefter
- **Aldersanpassning:** Simmare under 14 ar bor prioritera teknik och allsidig utveckling framfor volym. Tidig specialisering med hog volym ar associerad med okad dropout och overtraningsrisk (Lloyd & Oliver, 2012)

---

## 8. Dryland Training -- Landtraning for Simmare

### 8.1 Mal och principer

Landtraningen for simmare har tva primara mal: (1) utveckla core-stabilitet och rigiditet for att upprätthalla streamline under trotthet, och (2) foorebygga skador, sarskilt i axelkomplexet. Sekundart bidrar styrketraning till okad kraftutveckling i armtaget och sparkeffektivitet.

### 8.2 Nyckelovningar

**Core-stabilitet (varje landtraningspass):**
- Planka (front, sida, rotationsplanka): 3x30-60 sek
- Dead bug: 3x10 per sida
- Pallof press: 3x10 per sida
- Streamline squats: Haller armarna i streamline-position ovanfor huvudet under hela knabojningen. 3x12

**Axelhalsa (prehab, minst 3x/vecka):**
- Internalrotation med gummiband: 3x15
- Externalrotation med gummiband: 3x15
- Y-T-W-L ovningar i buklige: 3x10 per position
- Face pulls: 3x15
- Scapular push-ups: 3x15

**Overkroppsstyrka:**
- Pull-ups / Latsdrag: 3x6-12 (framdrivningsspecifik)
- Dumbbell bench press (neutral grepp): 3x8-12
- Standing cable pull (imiterar armtag): 3x12 per arm
- Triceps dips: 3x8-12
- Bent-over rows: 3x8-12

**Underkroppsstyrka:**
- Knaboj: 3x6-10
- Romanian deadlift: 3x8-10
- Box jumps: 3x6 (explosiv kraft for starter och vandningar)
- Calfraises: 3x15 (relevant for brostsim-spark)

### 8.3 Styrketraningsperiodisering

| Period | Fokus | Satser x Reps | Belastning |
|--------|-------|---------------|------------|
| General Prep | Muskulaar uthaallighet | 3x12-15 | 60-70% 1RM |
| Specific Prep | Hypertrofi / Maxstyrka | 3-4x6-10 | 70-85% 1RM |
| Competition Prep | Kraft/Power | 3-4x3-6 | 80-90% 1RM |
| Taper | Underhall | 2x4-6 | 80-85% 1RM, minskad volym |

---

## 9. Injury Prevention -- Skadeprevention

### 9.1 Simmaraxel (Swimmer's Shoulder)

Simmaraxel ar den vanligaste skadan bland tavlingssimmare och drabbar 40-91% av elitsimmare nagok gang under karriaren (Sein et al., 2010). Tillstandet ar en overbelastningsskada i axelns rotatorkuff och/eller supraspinatus-sena orsakad av repetitiv overhead-rorelse.

**Riskfaktorer:**
- Hog traningsvolym (>35 km/vecka) utan adekvat aterhamtning
- Dalig axelstabilitet (svag rotatorkuff, scapular dyskinesii)
- Tekniska fel: overreach vid entry (hand korsar kroppens mittlinje), tumme-forst entry, lag armbaagsposition i recovery
- Andning atl bara en sida (asymmetrisk belastning)
- Overdriven paddleanvandning (>25% av total volym)

**Forebyggande strategier:**
1. **Bilateral andning:** Anda till bada sidor, minst periodvis, for att utjamna axelbelastning
2. **Rotatorkuff-traning:** Minst 3 gangeer per vecka, intern/extern rotation med band
3. **Scapular stabilitet:** Y-T-W-L, serratus anterior-ovningar, scapular push-ups
4. **Teknikkorrigering:** Eliminera overreach vid entry, sakerstall hog armbag i recovery
5. **Volymhantering:** Gradvis progression, aterhamtningsveckor, varierad simstil
6. **Paddlerestriktion:** Max 20-25% av total volym med paddles, undvik vid axelsmarta

### 9.2 Knarskador i Brostsim (Breaststroker's Knee)

Brostsimmets spark utsatter knats mediala kollateralligament (MCL) och mediala menisken for upprepat valgus-stress. 50-75% av brostsimmare rapporterar knasmarta.

**Prevention:**
- VMO-starkande ovningar (vastus medialis oblique)
- Begransat antal brostsimssparkar per pass (max 30-40% av total sparkvolym)
- Teknisk korrekhet i sparkens utforande -- undvik for bred spark
- Streaching av hofadduktorer och quadriceps

### 9.3 Overtraningssyndrom

Simmare ar sarskilt utsatta for overtraning pa grund av den hoga traningsvolymen och monotona karaktaren. Tecken att overvaka:
- Morgonpuls forhojd >5 slag over normalt
- Somnstorningar
- Persistentent muskeloamhet langre an 48 timmar
- Stagnerad eller fallande prestation trots okad traning
- Hummorforandringar, motivation sjunker

**ACWR-monitorering:** Anvand Acute:Chronic Workload Ratio dar acute = senaste 7 dagars belastning och chronic = glidande 28 dagars snitt. Optimal zon: 0.8-1.3. Over 1.5 innebar forhojd skaderisk (Gabbett, 2016).

---

## 10. Open Water Swimming -- Oppetvattenssimning

### 10.1 Grundlaggande skillnader mot bassangsimning

Oppetvattenssimning (OWS) staller fundamentalt annorlunda krav an bassangsimning. Avsaknaden av banlinjer, vaggor och klimatkontroll innebar att simmaren maste beharska navigation, temperaturhantering och taktiskt simning i grupp.

**Fysiska utmaningar:**
- Ingen vandning: Sparkmonster och rytm andras, hogre krav pa kontinuerlig framdrivning
- Vagor och strom: Kraver anpassad teknik och hogre kraftutveckling
- Temperatur: Kalla vatten (under 18 grader Celsius) paverkar prestation, andning och motorik
- Langre distanser: 1.5 km (olympisk triathlon) till 25 km (marathon swimming)

### 10.2 Sighting (Orientering)

Sighting ar tekniken for att navigera mot bojar eller landmarks utan att forlora fart:

- **Alligator-sighting:** Lyft bara ogonen (inte hela huvudet) ovanfor vattenytan framat, sedan rotera at sidan for att anda. Integrerat i den normala andningscykeln.
- **Frekvens:** Var 6:e till 12:e armtag beroende pa forhallanden. I lugnt vatten racker var 20:e-30:e meter, i oppet hav kan varje 8-10 tag kraavas.
- **Taktik:** Identifiera sekundara landmarks (trad, byggnader) i linje med bojen for att navigera mellan sightingarna.

### 10.3 Drafting (Leesimning)

Forskning visar att drafting minskar energikostnaden med 18-25% (Chollet et al., 2000):

- **Hip drafting:** Sim brevid och strax bakom en annan simmares hoft. Mest effektivt, minskar drag med ca 20%.
- **Feet drafting:** Sim direkt bakom en annan simmares fotter, pa 0-50 cm avstand. Minskar drag med ca 10-15%.
- **Taktik:** Valj en simmare med liknande eller nagot hogre hastighet. Undvik att simma direkt pa sidan -- det ar minst effektivt och kan leda till diskvalificering vid kroppskontakt.

### 10.4 Vatdraktsovervaganden (Wetsuit Considerations)

Vatdrrakter ar tillagna i de flesta oppetvattenstavlingar under 20 grader Celsius vattentemperatur och forbjudna over 24 grader (FINA-regler):

- **Flytkraft:** Vatdrakten okar flytkraften, sarskilt i hoefter och ben, vilket forbattrar kroppslaget och minskar drag med 5-10%
- **Hastighetsokning:** Typiskt 3-8% snabbare med vatdrakt jamfort med utan
- **Kompromisser:** Reducerad axelrorlighet, forandrad catch-kansla, potentiellt overhetning i varmt vatten
- **Val:** For tavling valj tunna overarmspartier (1.5-2mm) och tjockare baal (4-5mm) for optimal balans mellan rorlighet och flytkraft

### 10.5 OWS-specifik traning

- **Simning utan vandning:** Langre set utan paus vid vaggen -- ex. 4x500m med simning forbi vaggen
- **Sighting-ovningar:** Sim med huvudet upp var 6:e tag i 200m set
- **Gruppsimning:** Trana i grupp for att ova kroppskontakt, drafting och positionering
- **Temperaturanpassning:** Gradvis exponering for kallt vatten, borja med 5-10 min och oka progressivt

---

## 11. Pool vs Open Water Training -- Bassang vs Oppetvatten

| Aspekt | Bassangsimning | Oppetvattenssimning |
|--------|---------------|---------------------|
| Pacing | Exakt via klocka och vangar | Varierande, paverkas av strom och vagor |
| Teknik | Optimal streamline, vandningsteknik | Robust teknik, sighting, hogre armtagsfrekvens |
| Energisystem | Precist zonarbete mojligt | Mer varierande intensitet, stady-state fokus |
| Navigation | Banlinjer, korsmarken | Bojar, landmarks, kompass |
| Taktik | Individuell prestation | Gruppdinamik, drafting, positionering |
| Utrustning | Minimal (badbyxa/drakt) | Vatdrakt, simbuffe, gps-klocka |
| Sakkerhet | Bottenkontakt, livvakter | Eskortoat, simbuffe, aldrig ensam |
| Tempokontroll | Klocka per 50/100m | GPS-klocka, perceptionbaserat tempo |

**Rekommendation for triatleter och oppetvattenssimmare:**
- 70-80% av traningsvolymen i bassang (for strukturerat zonarbete och teknikutveckling)
- 20-30% i oppet vatten (for specifik anpassning, sarskilt nara tavling)
- Minst en OWS-session per vecka under sasongen (maj-september i Norden)

---

## 12. Key Terminology -- Nyckelterminologi

| Term (EN) | Term (SV) | Definition |
|-----------|-----------|------------|
| CSS (Critical Swim Speed) | Kritisk simhastighet | Beraaknad troskelhastighet baserad pa tidskvoten mellan tva maxdistanser |
| EVF (Early Vertical Forearm) | Tidig vertikal underarm | Catch-teknik dar underarmen nar vertikal position tidigt i armtaget |
| MLSS (Maximal Lactate Steady State) | Maximal laktat steady state | Hogsta intensitet dar laktatproduktion = laktateliminering |
| DPS (Distance Per Stroke) | Avstand per armtag | Matt pa simeffektivitet -- langre ar generellt battre |
| Stroke Rate (SR) | Armtagsfrekvens | Antal armtagscykler per minut, typiskt 50-80 for frisim |
| Streamline | Stromlinjeposition | Kroppens hydrodynamiska position med utstrackt kropp, armarna ovanfor huvudet |
| Catch | Fangst | Fasen dar handen "griper" vattnet och borjar generera framdrivning |
| Pull | Drag | Den kraftgenererande fasen av armtaget under vattnet |
| Recovery | Aterforingsfas | Armens rorelse ovanfor vattnet tillbaka till entry-position |
| Negative Split | Negativ split | Simma andra halften snabbare an forsta -- optimal pacing-strategi |
| Descend | Fallande | Progressivt okande hastighet per repetition i ett set |
| Paddles | Handpaddlar | Traningsredskap som okar motstandet i armtaget |
| Pull Buoy | Pullbuoy | Flytelement mellan benen for att isolera overkroppens simning |
| Taper | Nedtrappning | Systematisk volymminskning fore tavling for maximal prestation |
| SWOLF | SWOLF | Simeffektivitetsindex: tid + antal armtag per langd (lagre = battre) |
| Kick Set | Sparksats | Traningsset med enbart benspark, oftast med sparkbrada |
| Drill | Teknikovning | Isolerad ovning for att forbattra specifik teknisk komponent |
| IM (Individual Medley) | Medley | Alla fyra simsatt i ordning: fjarilsim, ryggsim, brostsim, frisim |
| T-pace | T-tempo | Troskeltempo, anvands synonymt med CSS-tempo |
| Broken Swim | Bruten simning | Tavlingsdistans uppdelad i delar med kort vila, for att ova race pace |
| Hypoxic Training | Hypoxisk traning | Begransad andning (ex. var 5:e eller 7:e tag) for att oka CO2-tolerans |

---

## 13. Platform Integration -- Platformsintegration

### 13.1 CSS-testning i systemet

CSS-testet kan implementeras som ett testprotokoll i plattformens fysiologiska testmodul. Relevanta datamodeller:
- **TestType:** 'SWIMMING' (kraver eventuell utvidgning av befintlig TestType-enum)
- **Nyckelvarden:** T400 (sekunder), T200 (sekunder), CSS (m/sek), CSS-tempo (sek/100m)
- **Zonberakning:** Baserat pa CSS-tempo med offset per zon (se sektion 3.1)

### 13.2 AI-traningsprogram

Vid generering av simprogram bor AI-motorn:
- Krova CSS-testresultat som input for alla zonberakningar
- Specificera tempo per 100m (inte bara zon) for varje set i ett pass
- Inkludera uppvarmning (typiskt 600-1000m) och nedvarvning (200-400m) i varje pass
- Anvanda korrekt simterminologi (set, reps, tempo, vila, simsatt)
- Anpassa totalvolym per pass och vecka till simmarens niva (se sektion 7)

### 13.3 Extern integration

- **Garmin Swim / COROS:** Importera distans, tempo, SWOLF, armtagsfrekvens
- **Formfaktor:** Spara stroke rate, DPS, och SWOLF for trenderanalys over tid
- **Manuell inmatning:** For bassaangspass utan GPS-klocka -- ange distans, tid, simstil

---

## 14. References -- Referenser

1. Wakayoshi, K., Ikuta, K., Yoshida, T., et al. (1992). Determination and validity of critical velocity as an index of swimming performance in the competitive swimmer. *European Journal of Applied Physiology*, 64(2), 153-157.

2. Dekerle, J., Sidney, M., Hespel, J.M., & Pelayo, P. (2002). Validity and reliability of critical speed, critical stroke rate, and anaerobic capacity in relation to front crawl swimming performances. *International Journal of Sports Medicine*, 23(2), 93-98.

3. Mujika, I., Chatard, J.C., & Geyssant, A. (1996). Effects of training and taper on blood leucocyte populations in competitive swimmers: Relationships with cortisol and performance. *International Journal of Sports Medicine*, 17(3), 213-217.

4. Mujika, I., Padilla, S., & Pyne, D. (2004). Swimming performance changes during the final 3 weeks of training leading to the Sydney 2000 Olympic Games. *International Journal of Sports Medicine*, 23(8), 582-587.

5. Sein, M.L., Walton, J., Linklater, J., et al. (2010). Shoulder pain in elite swimmers: Primarily due to swim-volume-induced supraspinatus tendinopathy. *British Journal of Sports Medicine*, 44(2), 105-113.

6. Gabbett, T.J. (2016). The training-injury prevention paradox: Should athletes be training smarter and harder? *British Journal of Sports Medicine*, 50(5), 273-280.

7. Chollet, D., Hue, O., Auclair, F., Millet, G., & Chatard, J.C. (2000). The effects of drafting on stroking variations during swimming in elite male triathletes. *European Journal of Applied Physiology*, 82(5-6), 413-417.

8. Sweetenham, B., & Atkinson, J. (2003). *Championship Swim Training*. Human Kinetics.

9. Maglischo, E.W. (2003). *Swimming Fastest: The Essential Reference on Technique, Training, and Program Design*. Human Kinetics.

10. Lloyd, R.S., & Oliver, J.L. (2012). The Youth Physical Development Model: A New Approach to Long-Term Athletic Development. *Strength and Conditioning Journal*, 34(3), 61-72.

11. Toussaint, H.M., & Beek, P.J. (1992). Biomechanics of competitive front crawl swimming. *Sports Medicine*, 13(1), 8-24.

12. Chatard, J.C., & Wilson, B. (2003). Effect of fastskin suits on performance, drag, and energy cost of swimming. *Medicine and Science in Sports and Exercise*, 35(7), 1116-1125.

13. Costill, D.L., Maglischo, E.W., & Richardson, A.B. (1992). *Swimming: Handbook of Sports Medicine and Science*. Blackwell Scientific Publications.

14. Pyne, D.B., & Sharp, R.L. (2014). Physical and energy requirements of competitive swimming events. *International Journal of Sport Nutrition and Exercise Metabolism*, 24(4), 351-359.
