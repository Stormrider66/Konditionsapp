# Periodiseringsprinciper / Periodization Principles

## 1. Introduction: The Science of Planned Variation

Periodisering ar den systematiska planeringen av idrottslig traning med syfte att uppna optimal prestation vid ratt tidpunkt. Konceptet bygger pa en grundlaggande fysiologisk princip: kroppen anpassar sig till stress, men anpassningsformaagan ar begransad. Utan planerad variation leder monoton traning till stagnation, overtrating eller skada. Periodisering ar darfor inte bara en planeringsmetod - det ar en biologisk nodvandighet.

For en AI-baserad traningsmotor ar periodisering den overordnade arkitekturen som styr alla andra beslut. Intensitetsfordelning (polariserad, pyramidal, norsk), passtyper, volymstyrning och aterhamtning ar alla underordnade periodiseringens makrostruktur. Algoritmen maste forsta att ett perfekt designat enskilt pass ar meningslost om det inte placeras korrekt i ett periodiseringsramverk.

Denna kunskapsbank tacker periodiseringens teorier fran klassisk (Matveyev) till modern blockperiodisering (Issurin), samt praktiska verktyg som ATL/CTL/TSB-modellen for daglig belastningsstyrning.

## 2. The Hierarchy of Training Cycles

### 2.1 Macrocycle (Makrocykel / Arsplan)

Makrocykeln ar den langsta planeringsenheten och omspanner typiskt 6-12 manader (en hel sasong eller ett halvt ar). Den definierar de overgripande faserna i atletens traningsar och identifierar nackeltidpunkter (target competitions).

**Typiska makrocykelstrukturer:**

**Enkel periodisering (1 tavlingsperiod):**
For idrotter med en tavlingssasong (t.ex. langdskidakning, maraton):
- Grundperiod: 3-4 manader
- Uppbyggnadsperiod: 2-3 manader
- Tavlingsperiod: 2-3 manader
- Aterhamtning/transition: 1 manad

**Dubbel periodisering (2 tavlingsperioder):**
For idrotter med tva sasonger (t.ex. banlop inne + ute, simning korta + langa banan):
- Grundperiod 1: 2 manader
- Uppbyggnad + Tavling 1: 2-3 manader
- Kort transition: 2-3 veckor
- Grundperiod 2: 6-8 veckor
- Uppbyggnad + Tavling 2: 2-3 manader
- Aterhamtning: 3-4 veckor

**Trippel periodisering:**
Anvands av elitatleter med fler tavlingstoppar (t.ex. trekoppsloppare i cykel, elitlangdakare med Tour de Ski + VM + saongsfinal). Kraver hog traningsalder och erfarenhet.

### 2.2 Mesocycle (Mesocykel / Traningsblock)

Mesocykeln ar det primara traningsblocket och varar typiskt 3-6 veckor. Varje mesocykel har ett specifikt traningsfokus och foljer en intern progressionslogik.

**Struktur:**
- Vecka 1: Introduktion/adaptation (70-80% av blockts toppbelastning)
- Vecka 2: Progression (85-95% av toppbelastning)
- Vecka 3: Toppbelastning/overreaching (100%)
- Vecka 4: Avlastning/deload (50-60% av toppbelastning)

**Vanliga mesocykeltyper:**

| Mesocykeltyp | Fokus | Duration | Typisk for |
|---|---|---|---|
| Grundblock | Aerob bas, volym | 4-6 veckor | Tidig forberedelse |
| Styrkeblock | Maxstyrka, hypertrofi | 3-4 veckor | Grundperiod |
| Intensitetsblock | VO2max, intervaller | 3-4 veckor | Uppbyggnad |
| Troskelblock | Laktatroskel, tempo | 3-4 veckor | Sen uppbyggnad |
| Specifikt block | Tavlingsspecifik traning | 3-4 veckor | Fore-tavling |
| Tapering | Formtopp | 2-3 veckor | Tavlingsperiod |
| Aterhamtning | Aktiv vila, variation | 1-2 veckor | Transition |

### 2.3 Microcycle (Mikrocykel / Veckoplan)

Mikrocykeln ar den dagliga planeringsnivan och representerar typiskt en vecka (7 dagar). Det ar har de enskilda passen placeras i forhallande till varandra.

**Nyckelprincipper for mikrocykeldesign:**
1. **Hard-latt-principen:** Aldrig tva harda pass i rad utan tillracklig aterhamtning emellan (minimum 48 timmar mellan hogintensiva pass)
2. **Specificitet fore tratthet:** Placera de viktigaste passen tidigt i veckan nar atleten ar utvilad
3. **Komplementaritet:** Para ihop kompatibla stimuli (t.ex. styrka + lag aerob pa samma dag snarare an styrka + HIIT)
4. **Somnhaansyn:** Undvik hogintensiva pass sent pa kvallen (hojer kortisol, forsvarar insomning)

**Typisk mikrocykelstruktur (6 dagar):**

| Dag | Huvudpass | Intensitet | Syfte |
|---|---|---|---|
| Mandag | Intervaller/HIIT | Hog (zon 4-5) | Primar stimulusdag |
| Tisdag | Distans zon 1 | Lag | Aterhamtning + volym |
| Onsdag | Troskel/tempo | Medel-hog (zon 3) | Sekundar stimulusdag |
| Torsdag | Aktiv vila / mobilitet | Mycket lag | Full aterhamtning |
| Fredag | Styrketraning | Variabel | Neuromuskulair stimulus |
| Lordag | Langpass zon 1-2 | Lag-medel | Aerob volym |
| Sondag | Vila | - | Aterhamtning |

## 3. Classical Periodization (Matveyev Model)

### 3.1 Theoretical Foundation

Lev Matveyevs klassiska periodiseringsmodell fran 1960-talet ar grunden for all modern periodisering. Modellen bygger pa principen att volym och intensitet har ett omvant forhallande: nar volymen ar hog ar intensiteten lag, och tvartom.

**Faserna i klassisk periodisering:**

1. **Allman forberedelseperiod:** Hog volym, lag intensitet. Bygger aerob bas och allman styrka. Bred repertoar av traningsformer.
2. **Specifik forberedelseperiod:** Volymen borjar minska, intensiteten okar. Traningen blir mer tavlingsspecifik.
3. **Tavlingsperiod:** Lag volym, hog intensitet. Atleten ar "vass" och formtoppad.
4. **Overgangsperiod:** Lag volym, lag intensitet. Aterhamtning och mental fornyelse.

### 3.2 Strengths and Limitations

**Styrkor:**
- Enkel att forsta och implementera
- Val lampad for nybojare och medelnivaaatleter
- Bevisad effektivitet for idrotter med en tavlingstopp

**Begransningar:**
- Svart att formtoppa flera ganger under en sasong
- For lang tid mellan utveckling av fysiska egenskaper (dekonditioneringsrisk)
- Utvecklades for olympiska idrottare med en tavling per ar - matchar inte modern tavlingskalender
- Forsummar det faktum att aerob kapacitet borjar avta redan efter 3-4 veckors reducerad traning

## 4. Block Periodization (Issurin Model)

### 4.1 Core Concept

Vladimir Issurins blockperiodisering adresserar den klassiska modellens begransningar genom att koncentrera traningsstimuli i kortare, mer fokuserade block (2-4 veckor per block). Istallet for att traina alla fysiska egenskaper parallellt, fokuserar varje block pa 1-2 primara egenskaper.

**De tre blocktyperna:**

1. **Ackumulationsblock (Accumulation):**
   - Duration: 2-4 veckor
   - Fokus: Aerob bas, styrka, teknisk grundlaggning
   - Volym: Hog
   - Intensitet: Lag till medel
   - Exempel: 4 veckor med hog lopvolym och grundstyrka

2. **Transmutationsblock (Transmutation):**
   - Duration: 2-3 veckor
   - Fokus: Omvandla grundformaga till specifik kapacitet
   - Volym: Medel
   - Intensitet: Medel till hog
   - Exempel: 3 veckor med troskelintervaller och explosiv styrka

3. **Realisationsblock (Realization):**
   - Duration: 1-2 veckor
   - Fokus: Formtopp, tavlingsforeberedelse, tapering
   - Volym: Lag
   - Intensitet: Hog (men lag total belastning)
   - Exempel: 10 dagar med minskad volym och nagra vassa intervaller

### 4.2 Sequencing Logic

Blocken maste sekvenseras i korrekt ordning: Ackumulation rarr Transmutation rarr Realisation. Denna sekvens kan upprepas 2-3 ganger under en sasong for att skapa flera formtoppar.

**Fordelarna for algoritmen:**
- Varje block har ett tydligt och programmerbart fokus
- Kortare block (2-4 veckor) minskar risken for dekonditionering av andra egenskaper
- Mojliggor flera formtoppar under en sasong
- Lattare att anpassa om atleten blir sjuk eller skadad (hoppa over ett block, inte en hel fas)

## 5. Reverse Periodization (Omvand periodisering)

### 5.1 Concept

Omvand periodisering vanader pa den klassiska modellens logik: intensiteten ar hog tidigt i forberedelseperioden, och volymen okar gradvis mot tavling. Detta ar sarskilt relevant for:

- **Maratonlopare:** Borja med VO2max-block, bygg sedan ut distansen
- **Triatleter:** Utveckla toppfart forst, lagg sedan till uthalliget
- **Atleter med begransad tid:** Korta, intensiva pass ar lattare att passa in tidigt pa sasongen

### 5.2 Physiological Rationale

Intensitetstraningens anpassningar (VO2max, neuromuskulaar rekrytering) avtar snabbare an volymtraningens anpassningar (mitokondrier, kapillarisering) vid reducerad traning. Genom att bygga intensitetskapaciteten forst och sedan lagga volym ovanpa behalller atleten bade egenskaper langre in i tavlingsperioden.

**Varning:** Omvand periodisering kraver en god aerob grundniva. Den ar INTE lampad for nybojare utan traningsbas.

## 6. Deload Weeks (Avlastningsveckor)

### 6.1 Purpose and Timing

Avlastningsveckor ar planerade perioder med reducerad traningsbelastning som tillater supercompensation - den fysiologiska processen dar kroppen anpassar sig och uppnar en hogre prestationsniva efter aterhamtning fran traningsstress.

**Nar ska avlastning planeras?**
- Var 3-4:e vecka i standardperiodisering (3:1 eller 4:1 belastning:avlastning)
- Erfarna atleter kan tolerera 4-5 veckor fore avlastning
- Nybojare kan behova avlastning var 2-3:e vecka
- Extra avlastning vid tecken pa overreaching (se recovery-overtraining.md)

### 6.2 How to Deload

**Volymreduktion (rekommenderat):**
- Minska total traningsvolym med 40-60%
- Bibehall frekvens (antal pass per vecka)
- Bibehall intensitet i de pass som gors (men farreantal reps/intervaller)
- Exempel: Om normalvecka = 5x10 km lopning, avlastningsvecka = 5x5 km lopning med samma zonfordelning

**Intensitetsreduktion (alternativ):**
- Bibehall volym men sank intensiteten med 1-2 zoner
- Alla pass i zon 1
- Mindre psykologiskt tillfredsstaallande men vilsamt for nervsystemet

**Kombinerad reduktion:**
- Minska bade volym (-30%) och intensitet (inga pass over zon 2)
- Anvands vid tecken pa ooverreaching eller infor tavling

### 6.3 Common Deload Mistakes

1. **Ingen avlastning alls:** Vanligaste felet. Atleter kanmer sig starka vecka 3 och okar istallet. Resulterar i plataaer och overtraning.
2. **Full vila:** Att ta en hel vecka ledigt ar for mycket - dekonditionering borjar efter 5-7 dagars inaktivitet. Aktiv avlastning ar overlangset.
3. **Avlastning med ny traning:** Att byta till en ny traningsform (t.ex. crossfit) under avlastningsveckan ar INTE vila - det ar ny stress.

## 7. Tapering: Pre-Competition Peaking

### 7.1 The Science of Tapering

Tapering ar den sista fasen fore tavling dar traningsbelastningen systematiskt reduceras for att optimera prestation. Forskning visar att korrekt tapering kan forbattra prestation med 2-6% - en enorm marginal pa elit- och subelitniva.

### 7.2 Tapering Parameters

**Duration:**
- Sprint/kraftidrotter: 7-10 dagar
- Mellankistanslop (5K-10K): 10-14 dagar
- Maratonlop: 14-21 dagar
- Langre ultra: 21-28 dagar
- Langre tapering for aldre atleter (> 40 ar)

**Volymreduktion:**
- Total volym minskas med 40-60% over taperperioden
- Progressiv minskning (inte abrupt): -20% forsta veckan, ytterligare -20% andra veckan
- Exponentiell taper (storre reduktion mot slutet) ger battre resultat an linjar taper

**Intensitetshansyn:**
- BEHALL intensiteten! Detta ar den viktigaste regeln vid tapering.
- Gor farre men lika vassa intervaller
- Exempel: Normalvecka 8x4 min zon 4 rarr Tapervecka 4x4 min zon 4
- Att ta bort all intensitet leder till "desharpenering" och trog kansla pa tavlingsdagen

**Frekvens:**
- Minska antal traningstillfallen med 20-30%
- Behall 1-2 intensitetspass per vecka under tapering

### 7.3 Tapering Timeline Example (Marathon)

| Vecka fore lopp | Langpass | Intervaller | Total volym |
|---|---|---|---|
| 3 veckor | 25-28 km | 2 pass/v | 85% av normal |
| 2 veckor | 18-20 km | 1-2 pass/v | 65% av normal |
| 1 vecka | 10-12 km | 1 pass (kort) | 40% av normal |
| Lopdag | - | - | Lopp |

## 8. Supercompensation Principle

### 8.1 The Model

Supercompensation ar den biologiska principen bakom all periodisering. Modellen beskriver fyra faser:

1. **Traning (stimulus):** Traningspasset sander stress som temporart sanker prestationsformaagan.
2. **Aterhamtning:** Kroppen reparerar och aterstaller.
3. **Supercompensation:** Kroppen overcompenserar - prestationsformaagan overstiger ursprungsnivan.
4. **Detraining:** Om ingen ny stimulus tillkommer avtar supercompensationen tillbaka till baseline.

**Kritisk insikt for algoritmen:** Nasta traningspass maste timas for att sammanfalla med supercompensationsfonstret. For tidigt = overtraning. For sent = fortappd anpassning.

### 8.2 Practical Application

- **Lakta pass (zon 1-2):** Supercompensation inom 24-48 timmar
- **Hogintensiva pass (zon 4-5):** Supercompensation inom 48-72 timmar
- **Maximal styrka:** Supercompensation inom 72-96 timmar
- **Langpass (> 2 timmar):** Supercompensation inom 48-72 timmar

## 9. Monotony and Strain: Quantification

### 9.1 Calculation

Foster's traningsmonotoni och strain-modell ar ett kraftfullt verktyg for att overvaka belastning:

**Training Load (TL) per session:**
$$TL = RPE \times duration\_i\_minuter$$

**Weekly Load:**
$$\text{Weekly Load} = \sum TL_{alla\_pass}$$

**Monotony (Monotoni):**
$$\text{Monotoni} = \frac{\overline{TL_{dag}}}{\sigma_{TL_{dag}}}$$

Dar medelvarde divideras med standardavvikelse for dagliga belastningsvarden.

**Strain:**
$$\text{Strain} = \text{Weekly Load} \times \text{Monotoni}$$

### 9.2 Interpretation

| Varde | Tolkning | Atgard |
|---|---|---|
| Monotoni < 1.5 | Bra variation | Fortsatt planerat |
| Monotoni 1.5-2.0 | Forhojd risk | Oka variation i passtyper |
| Monotoni > 2.0 | Hog risk for overtraning | Omedelbar justering |
| Strain > 5000 (godtyckliga enheter) | Varningsniva | Planera avlastning |

**AI-motorns uppgift:** Berakna monotoni och strain veckovis och flagga automatiskt nar vardena narmar sig riskniver.

## 10. ATL/CTL/TSB Model (Performance Manager)

### 10.1 Definitions

- **ATL (Acute Training Load):** Kortsiktig traningsbelastning, typiskt 7-dagars exponentiellt viktat medelvarde av daglig Training Stress Score (TSS)
- **CTL (Chronic Training Load):** Langsiktig traningsbelastning, typiskt 42-dagars exponentiellt viktat medelvarde
- **TSB (Training Stress Balance):** Formvarde = CTL - ATL

### 10.2 Practical Interpretation

$$TSB = CTL - ATL$$

| TSB-varde | Tolkning | Konsekvens |
|---|---|---|
| TSB > +20 | Utvilad/detranerad | Bra for tavling, risk for formforlust vid langvarigt |
| TSB 0 till +20 | Positiv form | Optimal tavlingsform |
| TSB -10 till 0 | Neutral | Produktiv traning |
| TSB -30 till -10 | Funktionell overreaching | Normal under harda traningsblock |
| TSB < -30 | Riskzon | Risk for icke-funktionell overreaching |

### 10.3 Practical Application for the AI Engine

- **Under grundperiod:** TSB bor oscillera mellan -20 och +5 med avlastningsveckor som aterstaller till +5 till +15
- **Under uppbyggnad:** TSB kan tillatas sjunka till -25 under belastningsveckor
- **Fore tavling (tapering):** TSB bor stiga till +10 till +25 pa tavlingsdagen
- **Varningssystem:** Om CTL sjunker mer an 15% pa 2 veckor utan planerad avlastning rarr flagga for overtraning eller sjukdom

## 11. Adaptation for Multi-Sport Athletes

### 11.1 Triathlon Periodization

Triatleter maste periodisera tre discipliner simultant. Huvudprinciper:

- **Fokusblock:** Varje mesocykel betonar 1-2 discipliner medan den tredje underhalls
- **Brick sessions:** Kombinerade pass (cykel + lop) simulerar tavlingsbelastning
- **Prioritetsordning:** Forbattra svagaste disciplinen under grundperioden; forstarsk starkaste under tavlingsperioden

### 11.2 HYROX Periodization

HYROX-periodisering kraver balans mellan lopning, funktionell styrka och uthallighet:

- **Grundperiod:** Aerob bas (lopning) + grundstyrka (squat, deadlift, press)
- **Uppbyggnad:** Specifika HYROX-stationer (sled push/pull, wall balls, farmers carry) + troskellopning
- **Tavling:** Fullstandiga eller delsimulationer, tapering

### 11.3 General Multi-Sport Principles

1. **Periodisera disciplinerna asymmetriskt:** Alla discipliner behover inte vara i samma fas
2. **Identifiera limiters:** Fokusera pa den svagaste lanken
3. **Anpassa avlastning:** Avlasta alla discipliner samtidigt for full aterhamtning
4. **Cross-transfer:** Aerob kapacitet transfererar mellan discipliner, styrka och teknik gor det inte
