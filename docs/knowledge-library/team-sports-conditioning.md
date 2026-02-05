# Konditionering for Lagidrotter / Team Sports Conditioning

## Introduction

Konditionstraning for lagidrotter skiljer sig fundamentalt fran uthallighetsidrottens metodologi. Medan en lopare eller cyklist primart tranar for att optimera en enskild fysiologisk egenskap (t.ex. VO2max, laktatroskel), maste lagidrottaren utveckla ett brett spektrum av fysiska kvaliteter: aerob kapacitet, sprintformaga, upprepade sprintformaga (RSA), styrka, explosivitet, retningsforandring (COD), och decelerationsformaga -- allt inom ramen for en lang tavlingssasong med 1-3 matcher per vecka.

Modern lagidrottskonditraning ar i hog grad datadriven. GPS-trackers, accelerometrar och hjarfrekvensmonitorer ger realtidsdata som maste tolkas och anvandas for att styra traningsbelastning, minska skaderisk och optimera prestation pa matchdag. Denna kunskapsbas tacker de centrala koncepten for fysisk traning i lagidrotter, med sarskilt fokus pa fotboll (soccer), men principerna ar tillampbara pa de flesta invasionslagidrotter (handboll, hockey, rugby, lacrosse, etc.).

For en AI-baserad traningsmotor ar forstaelsen av matchdagscykeln (MD-systemet), GPS-metriker och positionsspecifika kravprofiler avgörande for att generera individuellt anpassade program som respekterar lagets kalender och spelarens belastningshistorik.

---

## GPS Metrics and Thresholds

### Oversikt over GPS-metriker

GPS-baserad belastningsmonitorering ar standarden for professionella lagidrotter. Data samlas typiskt in med 10 Hz GPS-enheter (t.ex. Catapult, STATSports, Kinexon) som bars i en vast mellan skulderbladen. Foljande metriker ar centrala:

**Total Distance (Total distans)**
- Grundlaggande volymmetrik som mater den totala strackan spelaren springer under ett pass eller en match
- Typiska matchvarden fotboll: 9-13 km (positionsberoende)
- Anvands framst for att kvantifiera traningsvolym och jamfora med matchbelastning
- Begransning: sager inget om intensiteten -- en spelare kan springa 12 km i lag fart utan nagon hogintensiv aktivitet

**High-Speed Running (HSR / Hogintensiv lopning)**
- Definieras som lopning over 5.5 m/s (19.8 km/h)
- En av de mest kritiska metrikerna for bade prestation och skaderisk
- Hogintensiv lopning belastar hamstringsmuskulaturen excentrikt och ar starkt korrelerad med hamstringsskador
- Typiska matchvarden: 400-1200 m beroende pa position och spelniva
- **Veckolig HSR-exponering ar en av de viktigaste parametrarna att monitorera.** Spelare som inte exponeras for tillracklig HSR under traning har hogre skaderisk pa matchdag (den sa kallade "underpreparedness paradoxen")

**Sprinting (Sprint)**
- Definieras som lopning over 7.0 m/s (25.2 km/h)
- Representerar maximal eller nara-maximal lopning
- Typiska matchvarden: 100-400 m total sprintdistans
- Sarskilt viktigt for forwards och ytterbackar
- Sprint-exponering bor planeras in i varje traningsvecka for att bibehalla neuromuskulor beredskap och minska skaderisk

**Accelerationer och Decelerationer**
- Rakneras som antal acceleration- eller decelerationshandelser over specificerade groansvarden
- Typiska trösklar: >2 m/s2 (moderat), >3 m/s2 (hog), >4 m/s2 (mycket hog)
- Hogintensiva accelerationer kraver stor koncetrisk kraftutveckling
- Hogintensiva decelerationer kraver stor excentrisk kraftutveckling och ar sarskilt belastande for knaleder, quadriceps och ACL
- Accel/decel-metriker ar ofta bättre indikatorer pa metabol belastning an total distans

**Metabolic Power (Metabol effekt)**
- Ett beraknat matt som kombinerar hastighet och acceleration for att uppskatta energiforbrukning
- Fanger den metabola kostnaden av accelerationer och decelerationer, inte bara lopning vid konstant hastighet
- Uttrycks i Watt/kg
- Ger en mer komplett bild av den totala fysiologiska belastningen an enbart distansbaserade matt

### Groansvarden och Individualisering

Det ar viktigt att notera att de ovan angivna hastighetsgranserna (5.5 m/s for HSR, 7.0 m/s for sprint) ar generella standarder. For optimal monitorering bor groansvardena individualiseras baserat pa spelarens maximala sprintkapacitet:

- **HSR-tröskel**: 60-70% av maximal sprinthastighet
- **Sprint-tröskel**: 80-85% av maximal sprinthastighet
- **Maximal sprinthastighet**: Bor testas regelbundet (t.ex. 30-40 m flygande start)

Individualiserade zoner ger battre korrelation med skaderisk och mer rattvisa jamforelser mellan spelare med olika fysiska profiler.

---

## The Game Day Minus (MD-) System

### Mikrocykelplanering runt matchdag

MD-systemet ar det dominerande ramverket for veckoplanering i professionell lagidrottskonditraning. Varje dag definieras i forhallande till matchdagen (MD = Match Day), och traningens karaktar, volym och intensitet foljer ett strukturerat monster for att optimera bade traningseffekt och aterhamtning.

Systemet utvecklades framst inom professionell fotboll (Premier League, La Liga) och har darefter spridits till i stort sett alla professionella lagidrotter. Grundprincipen ar att skapa en forutsagbar fysiologisk belastningsprofil over veckan, dar spelaren ankommar till matchdag med fullstandig fysisk och mental beredskap.

### Typisk veckostruktur (1 match/vecka)

**MD+1 (Dagen efter match): Recovery / Aterhamtning**
- Typ: Aktiv aterhamtning
- Aktiviteter: Latt cykling, pool-session, promenerande aterhamtning
- Volym: Mycket lag (15-25 min aktiv tid)
- Intensitet: Under 65% maxpuls
- Syfte: Framja blodflode for metabol clearance utan att addera mekanisk belastning
- Styrketraning: Ingen (eventuellt latt mobilitet)
- Tillaggsatgarder: Kryoterapi, kompressionsklader, sömn- och nutritionsoptimering

**MD-4: Strength & Loading / Styrka och belastning**
- Typ: Hogsta traningsbelastning under veckan
- Aktiviteter: Styrketraning (underkropp + overkropp), kompletterande lopning med HSR-exponering
- Volym: Hog (60-90 min total session)
- Intensitet: Hog styrkeintensitet (75-90% 1RM), moderat-hog lopintensitet
- GPS-mal: Inkludera tillracklig HSR-distans (150-300 m) genom accelerationslop eller spelformer
- Styrketraning: Knatboj, marklyft, hip thrust, benpress, nordisk hamstring-curl
- Motivering: Fyra dagar till matchdag ger tillracklig aterhamtningstid for neuromuskulor recovery

**MD-3: Endurance & Tactical / Uthalliget och taktik**
- Typ: Aerob kapacitet med taktisk inlarning
- Aktiviteter: Stora spelformer (8v8, 9v9, 10v10), laggenomgangar
- Volym: Moderat-hog (total distans kan nara matchniva)
- Intensitet: Moderat (genomsnittspuls 75-85% maxpuls)
- GPS-mal: Total distans i linje med matchbelastning, men lagre HSR/sprint
- Syfte: Aerob uthallighet, taktisk inkörning av matchplan, positionering
- Spelformernas storlek ger langre lopstrackor, lagre intensitetstoppar

**MD-2: Speed & Reaction / Snabbhet och reaktion**
- Typ: Neuromuskulor kvalitet, snabbhet, reaktion
- Aktiviteter: Sma spelformer (3v3, 4v4, 5v5), retningsandringsoevningar, korta sprinter
- Volym: Lag (40-60 min total session)
- Intensitet: Hog toppintensitet, lag total volym
- GPS-mal: Hogt antal accelerationer/decelerationer, lag total distans
- Syfte: CNS-aktivering, snabba reaktioner, taight decision-making under tidspress
- Sma spelformer ger hog intensitet per minut men lag totalbelastning

**MD-1: Activation / Aktivering**
- Typ: CNS-potentiering, mental forberedelse
- Aktiviteter: Korta sprinter (3-5 x 10-20 m), bollcirkulation, fastbollsspel, set pieces
- Volym: Mycket lag (20-35 min total tid pa plan)
- Intensitet: 2-3 korta maximala sprinter for att "vakna upp" det neuromuskulara systemet
- GPS-mal: Minimal total distans (<3 km), nagra fa explosiva aktioner
- Syfte: Fysiologisk aktivering utan uttrottning, mentalt fokus
- **Ingen styrketraning.** Inget som genererar muskelomhet.

**MD: Match Day / Matchdag**
- Toppbelastning for veckan
- Typiska GPS-varden: 9-13 km total, 400-1200 m HSR, 100-400 m sprint
- All data dokumenteras for veckoanalys och ACWR-berakningar

### Variationer: Dubbelmatchveckor

Vid 2 matcher per vecka (t.ex. tisdag + lordag) komprimeras cykeln. Huvudprinciperna kvarstar men med farre traningsdagar:

- MD+1 ar alltid aterhamtning
- Styrketraning reduceras kraftigt eller elimineras
- En "speed day" (MD-2) prioriteras over en "endurance day" (MD-3)
- HSR-exponering maste integreras i spelformer snarare an i isolerade loppass

---

## Repeated Sprint Ability (RSA)

### Begreppet RSA

Repeated Sprint Ability (upprepade sprintformaga) ar formaagan att genomfora multipla maximala sprinter med kort aterhamtning daremmellan. RSA ar en avgörande fysisk egenskap i lagidrotter dar spelaren upprepade ganger maste sprinta, aterhamta sig, och sprinta igen under en 60-90 minuters match.

RSA beror pa ett samspel av:
- **Aerob kapacitet (VO2max)**: Paverkar aterhamtningshastigheten mellan sprinter. Hogre VO2max = snabbare PCr-resyntes
- **Anaerob kapacitet**: Avgor prestationen i varje enskild sprint
- **Buffertkapacitet**: Formaaga att hantera vatejonackumulation (pH-senkning)
- **Neuromuskulor effektivitet**: Muskelaktiveringsmonster, fedtfiber-rekrytering

### Testprotokoll

**Standardiserat RSA-test (Bangsbo)**
- 6 x 40 m sprinter med 20 sekunders passiv vila
- Mater: Basta tid, snamsta tid, genomsnittstid, fatigue index (procentuell prestationsforlust)
- Fatigue index = ((samsta tid - basta tid) / basta tid) x 100
- Vardering: Fatigue index <5% = utmarkt, 5-10% = bra, >10% = bor forbattras

**Alternativa protokoll:**
- 6 x 30 m + 5 m deceleration med 20 s vila
- 10 x 20 m pendellop med 30 s vila (inkluderar retningsandring)
- Yo-Yo Intermittent Recovery Test nivaa 1 och 2 (validerat falttest med hog korrelation till matchprestationsmetriker)

### Traningsmetoder for RSA

**Extensiv RSA-traning (Aerob power-baserad)**
- Protokoll: 15 s sprint / 15 s vila, upprepat 10-15 ganger, 2-3 serier
- Intensitet: 85-95% av maximal sprinthastighet
- Syfte: Utveckla den aeroba bidraget till aterhamtning mellan sprinter
- Anpassning: Foerbattrad mitokondriell funktion, PCr-resyntes, fettsyraoxidation
- Timing i veckan: MD-3 eller MD-4

**Intensiv RSA-traning**
- Protokoll: Shuttle runs med retningsandringar, 20-30 m sträckor med 180-graders vandning
- Intensitet: Maximal eller nara-maximal
- Vila: 15-25 s (arbete:vila-kvot 1:3 till 1:5)
- Antal: 6-10 sprinter per serie, 2-3 serier med 3-4 min vila mellan serier
- Syfte: Sport-specifik RSA med eccentrisk belastning fran inbromsning

**Integrerad RSA (Small-Sided Games)**
- RSA-kapaciteten kan ocksa utvecklas genom sma spelformer (se SSG-sektionen nedan)
- 3v3 och 4v4 pa sma ytor ger naturlig RSA-stimulus
- Fordel: Teknisk-taktisk traning kombinerad med fysisk utveckling
- Nackdel: Svarare att kontrollera exakt dosering

---

## Small-Sided Games (SSG) Programming

### Grundprinciper for spelformsmanipulation

Small-Sided Games (sma spelformer) ar det mest effektiva och tidseffektiva verktyget for samtidig utveckling av fysiska, tekniska och taktiska kvaliteter i lagidrotter. Genom att manipulera spelformens parametrar kan tranaren styra den fysiologiska responsen med hog precision.

### Nyckelvariabler och deras effekt

**Planstorlek (Pitch Size)**
- Storre plan (>200 m2/spelare) = mer lopning, hogre total distans, hogre HSR
- Mindre plan (<100 m2/spelare) = fler accelerationer/decelerationer, hogre hjarfrekvens-topp, mer anaerobt
- Tumregel: 100-200 m2 per spelare for balanserad belastning

**Antal spelare (Player Numbers)**
- 3v3 / 4v4: Hogst intensitet per minut, flest bollkontakter, storst anaerob komponent
- 5v5 / 6v6: Balanserad intensitet, bra for bade aerob och anaerob traning
- 7v7 / 8v8: Mer aerob, narmre matchlikt lopmonster, battre for taktisk traning
- 9v9 / 10v10: Matchlik intensitet, anvands framst for taktisk inkörning (MD-3)

**Spelregler (Rule Modifications)**
- Maximalt antal touchar (1-touch, 2-touch): Okar spelets tempo och beslutshastighet
- Man-marking (personlig bevakning): Okar total lopning och HSR avsevert
- Floaters/jokers (neutrala spelare): Skapar overtalssituationer, minskar intensitet marginellt
- No-offside / med offside: Paverkar lagets kompakthet och lopdjup
- Speltid: Kortare perioder (2-4 min) med vila = hogre toppintensitet. Langre perioder (8-15 min) = mer aerob stimulus

**Tranaruppmuntran (Coach Encouragement)**
- Forskning visar att verbal uppmuntran fran tranaren kan hoja hjarfrekvens med 3-5 spm och oka total distans med 5-8% jamfort med tyst spelform
- Relevant for planering: Intensiteten i en spelform ar inte enbart en funktion av regler och storlek

### Progressionsmodell for SSG

| Fas | Spelform | Planstorlek | Duration | Syfte |
|-----|----------|-------------|----------|-------|
| Forsasong | 3v3 / 4v4 | 15x20 m - 25x30 m | 4x3 min | Anaerob kapacitet, RSA |
| Forsasong | 6v6 | 40x30 m | 3x6 min | Aerob power |
| Tidigt insasong | 5v5 + GK | 35x25 m | 4x4 min | Balanserad belastning |
| Insasong (MD-2) | 4v4 | 20x25 m | 3x3 min | Snabbhet, reaktion |
| Insasong (MD-3) | 8v8 / 9v9 | 60x45 m | 3x8 min | Taktik, aerob |

---

## Position-Specific Load Profiles

### Positionsspecifika kravprofiler i fotboll

Varje position pa planen har en unik fysisk kravprofil som avspeglas i GPS-data fran matcher. For att optimera traning maste dessa profiler forsta och respekteras.

**Centerback / Mittback**
- Total distans: 9.0-10.5 km (lagst av utespelarna)
- HSR: 300-600 m (relativt lagt)
- Sprint: 100-250 m
- Accelerationer: Moderata
- Karaktar: Korta explosiva aktioner (huvuddueller, tackningar), positioneringslöpning
- Traningsfokus: Styrka, sprinthastighet over korta distanser (5-15 m), aerob baskapacitet

**Ytterback / Wingback**
- Total distans: 10.0-12.0 km
- HSR: 600-1000 m (bland de hogsta)
- Sprint: 200-400 m (bland de hogsta)
- Accelerationer: Manga, bade offensivt och defensivt
- Karaktar: Upprepade langa lopningar langs sidlinjen, hogintensiva overlappningar
- Traningsfokus: RSA, aerob kapacitet, HSR-exponering, excentrisk hamstringsstyrka

**Central mittfaltare**
- Total distans: 10.5-12.5 km (hogst av alla positioner)
- HSR: 500-900 m
- Sprint: 150-350 m
- Accelerationer: Mycket hoga (bade korta och medellanga)
- Karaktar: Box-to-box lopning, kontinuerligt arbete i bada riktningarna
- Traningsfokus: Aerob kapacitet (VO2max), RSA, uthallighet vid moderat intensitet

**Ytter / Winger**
- Total distans: 9.5-11.5 km
- HSR: 700-1200 m (hogst av alla positioner)
- Sprint: 250-450 m (hogst av alla positioner)
- Accelerationer: Manga explosiva aktioner, retningsandringar
- Karaktar: Korta explosiva spurter, dribbling, 1-mot-1 situationer
- Traningsfokus: Maximal sprinthastighet, acceleration, retningsandring (COD), HSR-tolerans

**Center forward / Anfallare**
- Total distans: 9.0-11.0 km (relativt lagt)
- HSR: 500-900 m
- Sprint: 200-400 m
- Accelerationer: Fokus pa korta explosiva accelerationer (djupledslöpningar)
- Karaktar: Pressarbete, djupledslöpningar, duellspel
- Traningsfokus: Explosiv acceleration (0-10 m), styrka for dueller, vertikalt hopp

### Praktisk tillampning i traningsplanering

AI-motorn bor anvanda positionskravprofiler for att:
1. **Individualisera GPS-mal** i veckoplanering (t.ex. en ytterback behover mer HSR-exponering an en mittback)
2. **Skraddarsy styrketraning** (excentrisk hamstring for ytterbackar, overkroppsstyrka for anfallare)
3. **Prioritera spelformer** som matchar positonens matchkrav
4. **Monitorera under/overbelastning** genom att jamfora traningsdata mot matchprofilen

---

## In-Season vs Off-Season Conditioning

### Sasongsfaser och traningens karaktar

**Forsasong (Pre-Season) -- 4-8 veckor**

Forsasongen ar den enda perioden dar spelaren kan gora stora fysiologiska framsteg. Har byggs den fysiska basen for hela sasongen.

- Vecka 1-2: Aerob bas, progressiv volymökning, anatomisk styrkeadaptation
- Vecka 3-4: Okad intensitet, RSA-introduktion, maxstyrke-traning, agility
- Vecka 5-6: Matchspecifik traning, spelformer, taktisk inkörning, power-traning
- Vecka 7-8: Matchsimulering, avlastning infor sarong

Typiskt traningsschema forsasong: 8-12 pass/vecka (2-3 gym, 4-5 plan, 1-2 aterhamtning)

**Insasong (In-Season) -- 30-40 veckor**

Under sasongen ar huvudmalet att UNDERHALLA de fysiska kvaliteter som byggdes under forsasongen, inte att utveckla nya. Matchbelastningen ar den primara traningsstimulansen.

- Styrketraning: 1-2 pass/vecka, fokus pa kraftunderhall (ej hypertrofi)
- Konditionstraning: Integrerad i spelformer, saellan isolerade loppass
- HSR-exponering: Maste sakerstaellas varje vecka (genom traning + match)
- Belastningsmonitorering: ACWR, wellness, somndata
- Individuella planer: Spelare med lite speltid behover extra konditionstraning

**Mellansasong (Off-Season) -- 3-6 veckor**

Perioden efter sasongens slut. Bor delas i tva faser:

- Fas 1 (1-2 veckor): Fullstandig vila fran organiserad traning. Cross-training tillaten (simning, cykling). Mental aterhamtning prioriteras.
- Fas 2 (2-4 veckor): Gradvis atergang till traning. Allmankondition, grundstyrka, mobilitet. Spelaren bor aterkomma till forsasongen i "acceptable fitness" -- inte toppform men ej heller detranerad.

---

## Deceleration Training for Injury Prevention

### Decelerationens betydelse for skadeprevention

Deceleration (inbromsning) ar en av de mest skadegenerande rorelserna i lagidrotter. ACL-skador, hamstringsskador och vristskador intraffar ofta under hoghastighetsdecelerationer, sarskilt i kombination med retningsandringar. Trots detta ar deceleration den mest forsuammade komponenten i de flesta traningsprogram.

### Biomekanisk bakgrund

Under deceleration:
- Quadriceps arbetar excentrisk for att bromsa kroppens framtrorelse
- Belatstningen pa ACL okar exponentiellt med decelerationshastigheten
- Asymmetrisk deceleration (mer kraft pa ett ben) ar en stark prediktor for ACL-skada
- Trunk-kontroll (baltestabilitet) ar avgörande for att distribuera bromskrafter jamt

### Progressionsmodell for decelerationstraning

**Fas 1: Isolerad deceleration (Vecka 1-3)**
- Linjara inbromsningar fran jogginghastighet till stopp
- Fokus: Kroppslutning (forward lean), stegmönster, bilateral belastning
- Tempo: Kontrollerat, lagintensivt
- Volym: 6-8 repetitioner, 2-3 set

**Fas 2: Moderat hastighet + riktningsandring (Vecka 4-6)**
- Inbromsning fran moderat hastighet (60-70% max) med 45- eller 90-graders riktningsandring
- Fokus: Excentrisk kontroll, knastabilitet, fotsattning
- Introduktion av reaktiva element (visuell signal for riktning)
- Volym: 8-10 repetitioner, 2-3 set

**Fas 3: Hogintensiv sport-specifik deceleration (Vecka 7+)**
- Maximal eller nara-maximal hastighet foljd av abrupt inbromsning
- Kombination med retningsandring, motstandare-stimulus, bollmottagning
- Oforutsagbara scenario (reagerande pa motstandare eller bollbana)
- Integration i spelformer och agility-ovningar
- Volym: 5-8 repetitioner hogintensivt, integrerat i normala pass

### Nyckelövningar

- **Deceleration wall drill**: Sprint mot vagg, progressivt avstand
- **1080 Sprint bromslop**: Om tillgang till 1080 Sprint, programmerad motstands-deceleration
- **Drop-and-stop**: Spurt fran stilla staende, inbromsning vid markering
- **Reactive COD**: Sprint med visuell signal for riktningsandring (ljussystem eller tranarsignal)
- **Nordisk hamstringscurl**: Excentrisk hamstringsstyrka, direkt overforbar till decelerationskapacitet

---

## Monitoring Wellness and Readiness

### Wellnessmonitorering i lagmiljo

I en lagidrottsmiljo ar det opraktiskt att genomfora omfattande fysiologiska tester dagligen. Istallet anvands enkla, validerade verktyg for att monitorera spelarnas beredskap och identifiera dem som behover modifierad traning.

### Dagligt wellnessformular

Ett typiskt dagligt wellnessformular (ifylls pa morgonen via app) omfattar:

| Parameter | Skala | Vad det mater |
|-----------|-------|---------------|
| Somnkvalitet | 1-5 | Subjektiv somnupplevelse |
| Somnduration | Timmar | Total somntid |
| Muskelomhet | 1-5 | Delayed onset muscle soreness (DOMS) |
| Energiniva | 1-5 | Allman upplevd energi |
| Humör / Stress | 1-5 | Psykiskt valbefinnande |
| Trotthetsniva | 1-5 | Upplevd allman trotthet |

**Totalpoang**: Summerat varde (6-30). Trend over tid ar viktigare an enskilda dagsvarden.

**Flaggningssystem:**
- Gron (25-30): Normal beredskap, full traning
- Gul (18-24): Moderat nedsattning, monitorera under pass, eventuell volymreduktion
- Rod (<18): Signifikant nedsattning, individuell bedomning, eventuellt vilodags eller latt aterhamtning

### Kompletterande mätningar

- **HRV (Heart Rate Variability)**: Morgon-HRV med smartphone-app (t.ex. HRV4Training, Elite HRV). 7-dagars rullande medelvarde jamfort med individuell baslinje. Vagalsympatisk aktivitet som indikator pa aterhamtningsstatus.
- **CMJ (Countermovement Jump)**: Hopptest pa kraftplatta. Nedsattning >10% fran baslinje indikerar neuromuskulor trotthet. Kan genomforas som del av uppvarmningen.
- **Adduktortest (Copenhagen squeeze)**: Sarskillt relevant for fotbollsspelare. Kraftminskning i adduktorerna ar en tidig varningssignal for ljumskskada.
- **sRPE (session RPE)**: Spelarens subjektiva bedomning av passintensitet (1-10) x passduration (min) = sessionsbelastning. Grunddata for ACWR-berakningar.

### Integrerad beslutsprocess

Wellnessdata bor integreras med GPS-data och ACWR for att skapa en helhetsbild:
1. Wellness formular flaggar rod for en spelare
2. ACWR visar 1.4 (CAUTION zone)
3. CMJ ar 8% under baslinje
4. **Beslut**: Spelaren deltar med modifierad belastning (reducerad volym, ingen HSR-exponering) eller genomfor alternativt pass

---

## Communication Between S&C and Head Coach

### Kommunikation mellan fystranare och huvudtranare

En av de storsta utmaningarna i professionell lagidrottskonditraning ar inte fysiologisk -- den ar organisatorisk. Fystranaren (S&C coach) maste effektivt kommunicera komplex fysiologisk data till en huvudtranare som primart tanker i taktiska och matchstrategiska termer.

### Principer for effektiv kommunikation

**1. Oversatt data till handlingsbara insikter**
- Saeg inte: "Spelarens ACWR ar 1.52 med en HSR av 2.3 SD over genomsnitt"
- Saeg istallet: "Spelaren har traenat markbart mer an vanligt de senaste dagarna. Jag rekommenderar reducerad belastning idag for att minska skaderisken infor lordagens match."

**2. Anvand trafikljussystem**
- Presentera spelarberedskap i gront/gult/rott format
- Huvudtranare behover snabba, visuella beslutsstoed, inte datatabeller
- Dashboards bor visa 3-5 nyckelmetriker, inte 20

**3. Forhandla, inte diktera**
- Fystranaren ager den fysiologiska expertisen men huvudtranaren ager laguppstallningen
- Presentera risker och rekommendationer, inte ultimatum
- Skapa en gemensam forstaelse for att kortsiktig prestation ibland maste vagas mot langsiktig spelarhalsa

**4. Skapa veckorutin**
- Mandag morgon: Genomgang av helgens matchdata och spelarnas wellness
- Onsdag: Uppdaterad beredskapsrapport infor veckan
- Fredag (MD-1): Final statusrapport for varje spelare infor match
- Post-match: Belastningsrapport och aterhamtningsprognos

### Data som bor delas med huvudtranaren

| Datatyp | Format | Frekvens |
|---------|--------|----------|
| Spelarberedskap | Gron/Gul/Rod | Dagligen |
| Matchbelastningsrapport | Sammanfattning + highlights | Varje match |
| Veckolig belastningstrend | Graf med ACWR per spelare | Veckovis |
| Skaderiskvarning | Specifik rekommendation | Vid behov |
| Forsasongsresultat | Jamforelse mot mallvarden | Forsasong |

---

## Key Terminology / Nyckelterminologi

| Term (EN) | Term (SV) | Definition |
|-----------|-----------|------------|
| HSR (High-Speed Running) | Hogintensiv lopning | Lopning over 5.5 m/s (19.8 km/h) |
| Sprint threshold | Sprintgroansvarde | Lopning over 7.0 m/s (25.2 km/h) |
| RSA (Repeated Sprint Ability) | Upprepade sprintformaga | Formagan att sprintra upprepade ganger med kort vila |
| ACWR | Akut:Kronisk belastningskvot | Kvoten mellan senaste veckans och senaste manadens belastning |
| sRPE | Sessionsbaserad anstrangningsgrad | RPE x duration, matt pa traningsbelastning |
| SSG (Small-Sided Games) | Sma spelformer | Reducerade spelformer (3v3 till 8v8) for traning |
| MD- (Match Day Minus) | Matchdagsminus | Dagsbenamning relativt matchdag (MD-1 = dagen fore) |
| COD (Change of Direction) | Retningsandring | Formagan att snabbt andra rorelseriktning |
| Metabolic Power | Metabol effekt | Beraknad energiforbrukning baserad pa hastighet + acceleration |
| CMJ (Countermovement Jump) | Mothopp | Standardiserat hopptest for neuromuskulor beredskap |
| GPS Load | GPS-belastning | Samlingsbegrepp for extern belastning matt med GPS-tracker |
| Fatigue Index | Trötthetindex | Procentuell prestationsforlust over upprepade sprinter |
| HRV (Heart Rate Variability) | Hjartfrekvensvariabilitet | Matt pa autonom nervaktivitet, indikator pa aterhamtning |
| Eccentric Load | Excentrisk belastning | Muskelarbete under forlangning, sarskilt vid inbromsning |
| Periodization | Periodisering | Systematisk planering av traningsbelastning over tid |
| Detraining | Detranering | Forlust av fysiska anpassningar vid upphor av traning |
| Tapering | Nedtrappning | Planerad belastningsreduktion infor tavling eller sasongstart |

---

## References

1. Gabbett, T. J. (2016). The training-injury prevention paradox: should athletes be training smarter and harder? *British Journal of Sports Medicine*, 50(5), 273-280.

2. Buchheit, M., & Laursen, P. B. (2013). High-intensity interval training, solutions to the programming puzzle. Part I & II. *Sports Medicine*, 43(5), 313-338 & 43(10), 927-954.

3. Bangsbo, J., Iaia, F. M., & Krustrup, P. (2008). The Yo-Yo intermittent recovery test: A useful tool for evaluation of physical performance in intermittent sports. *Sports Medicine*, 38(1), 37-51.

4. Impellizzeri, F. M., Marcora, S. M., & Coutts, A. J. (2019). Internal and external training load: 15 years on. *International Journal of Sports Physiology and Performance*, 14(2), 270-273.

5. Malone, S., Owen, A., Newton, M., Mendes, B., Collins, K. D., & Gabbett, T. J. (2017). The acute:chronic workload ratio in relation to injury risk in professional soccer. *Journal of Science and Medicine in Sport*, 20(6), 561-565.

6. Clemente, F. M., Martins, F. M. L., & Mendes, R. S. (2014). Developing aerobic and anaerobic fitness using small-sided soccer games: methodological proposals. *Strength and Conditioning Journal*, 36(3), 76-87.

7. Harper, D. J., Carling, C., & Kiely, J. (2019). High-intensity acceleration and deceleration demands in elite team sports competitive match play: a systematic review and meta-analysis of observational studies. *Sports Medicine*, 49(12), 1923-1947.

8. Thorpe, R. T., Strudwick, A. J., Buchheit, M., Atkinson, G., Drust, B., & Gregson, W. (2015). Monitoring fatigue during the in-season competitive phase in elite soccer players. *International Journal of Sports Physiology and Performance*, 10(8), 958-964.

9. Akenhead, R., & Nassis, G. P. (2016). Training load and player monitoring in high-level football: current practice and perceptions. *International Journal of Sports Physiology and Performance*, 11(5), 587-593.

10. Owen, A. L., Wong, D. P., Paul, D., & Dellal, A. (2014). Physical and technical comparisons between various-sided games within professional soccer. *International Journal of Sports Medicine*, 35(4), 286-292.

11. Malone, J. J., Di Michele, R., Morgans, R., Burgess, D., Morton, J. P., & Drust, B. (2015). Seasonal training-load quantification in elite English Premier League soccer players. *International Journal of Sports Physiology and Performance*, 10(4), 489-497.

12. Dos'Santos, T., Thomas, C., Comfort, P., & Jones, P. A. (2018). The effect of angle and velocity on change of direction biomechanics: An angle-velocity trade-off. *Sports Medicine*, 48(10), 2235-2253.

13. Saw, A. E., Main, L. C., & Gastin, P. B. (2016). Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review. *British Journal of Sports Medicine*, 50(5), 281-291.

14. Castagna, C., Impellizzeri, F. M., Chaouachi, A., & Manzi, V. (2013). Preseason variations in aerobic fitness and performance in elite-standard soccer players: a team study. *Journal of Strength and Conditioning Research*, 27(11), 2959-2965.

15. Bourdon, P. C., Cardinale, M., Murray, A., Gastin, P., Kellmann, M., Varley, M. C., ... & Cable, N. T. (2017). Monitoring athlete training loads: consensus statement. *International Journal of Sports Physiology and Performance*, 12(s2), S2-161-S2-170.
