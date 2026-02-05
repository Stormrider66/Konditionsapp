# Periodiseringsprinciper / Periodization Principles

## 1. Introduction: The Science of Planned Variation

Periodisering är den systematiska planeringen av idrottslig träning med syfte att uppnå optimal prestation vid rätt tidpunkt. Konceptet bygger på en grundläggande fysiologisk princip: kroppen anpassar sig till stress, men anpassningsförmågan är begränsad. Utan planerad variation leder monoton träning till stagnation, överträning eller skada. Periodisering är därför inte bara en planeringsmetod - det är en biologisk nödvändighet.

För en AI-baserad träningsmotor är periodisering den överordnade arkitekturen som styr alla andra beslut. Intensitetsfördelning (polariserad, pyramidal, norsk), passtyper, volymstyrning och återhämtning är alla underordnade periodiseringens makrostruktur. Algoritmen måste förstå att ett perfekt designat enskilt pass är meningslöst om det inte placeras korrekt i ett periodiseringsramverk.

Denna kunskapsbank täcker periodiseringens teorier från klassisk (Matveyev) till modern blockperiodisering (Issurin), ondulerande periodisering, konjugatmetoden, fraktal periodisering och praktiska verktyg som ATL/CTL/TSB-modellen för daglig belastningsstyrning. Dessutom behandlas autoregulering, långsiktig atletutveckling (LTAD), miljöanpassning och tävlingsplanering bakåt från målloppet.

## 2. The Hierarchy of Training Cycles

### 2.1 Macrocycle (Makrocykel / Årsplan)

Makrocykeln är den längsta planeringsenheten och omspänner typiskt 6-12 månader (en hel säsong eller ett halvt år). Den definierar de övergripande faserna i atletens träningsår och identifierar nyckeltidpunkter (target competitions).

**Typiska makrocykelstrukturer:**

**Enkel periodisering (1 tävlingsperiod):**
För idrotter med en tävlingssäsong (t.ex. längdskidåkning, maraton):
- Grundperiod: 3-4 månader
- Uppbyggnadsperiod: 2-3 månader
- Tävlingsperiod: 2-3 månader
- Återhämtning/transition: 1 månad

**Dubbel periodisering (2 tävlingsperioder):**
För idrotter med två säsonger (t.ex. banlopp inne + ute, simning korta + långa banan):
- Grundperiod 1: 2 månader
- Uppbyggnad + Tävling 1: 2-3 månader
- Kort transition: 2-3 veckor
- Grundperiod 2: 6-8 veckor
- Uppbyggnad + Tävling 2: 2-3 månader
- Återhämtning: 3-4 veckor

**Exempel dubbel periodisering – elitmedeldistanslöpare (månad för månad):**

| Månad | Fas | Fokus |
|---|---|---|
| November | Grundperiod 1 | Hög löpvolym zon 1-2, grundstyrka |
| December | Grundperiod 1 | Ökad volym, introduktion tempolöpning |
| Januari | Uppbyggnad 1 | VO2max-intervaller, specifik styrka |
| Februari | Tävling 1 | Inomhustävlingar, reducerad volym |
| Mars | Transition | 2-3 veckor aktiv vila, alternativ träning |
| April | Grundperiod 2 | Återuppbyggnad av volym, teknisk löpning |
| Maj | Uppbyggnad 2 | Tröskelfokus, ökad intensitet |
| Juni-Juli | Tävling 2 | Utomhustävlingar, tapering |
| Augusti | Återhämtning | Aktiv vila, mental förnyelse |

**Trippel periodisering:**
Används av elitatleter med fler tävlingstoppar (t.ex. trekoppslöpare i cykel, elitlängdåkare med Tour de Ski + VM + säsongsfinal). Kräver hög träningsålder och erfarenhet.

**Exempel trippel periodisering – elitlängdåkare:**

| Månad | Fas | Fokus |
|---|---|---|
| Maj-Juni | Grundperiod | Hög volym rullskidor/löpning, grundstyrka |
| Juli-Augusti | Uppbyggnad 1 | Specifik styrka, VO2max, höghöjdsläger |
| September | Transition 1 | Kort avlastning, snöträning |
| Oktober-November | Uppbyggnad 2 | Snöträning, tävlingsspecifik, fart |
| December | Tävling 1 | Tour de Ski, formtopp 1 |
| Januari | Mini-grund | Volym, återuppbyggnad |
| Februari | Uppbyggnad 3 | Specifik toppform |
| Mars | Tävling 2 | VM, formtopp 2 |
| April | Tävling 3 | Säsongsfinaler, formtopp 3 |

### 2.2 Mesocycle (Mesocykel / Träningsblock)

Mesocykeln är det primära träningsblocket och varar typiskt 3-6 veckor. Varje mesocykel har ett specifikt träningsfokus och följer en intern progressionslogik.

**Struktur:**
- Vecka 1: Introduktion/adaptation (70-80% av blockets toppbelastning)
- Vecka 2: Progression (85-95% av toppbelastning)
- Vecka 3: Toppbelastning/overreaching (100%)
- Vecka 4: Avlastning/deload (50-60% av toppbelastning)

**Vanliga mesocykeltyper:**

| Mesocykeltyp | Fokus | Duration | Typisk för |
|---|---|---|---|
| Grundblock | Aerob bas, volym | 4-6 veckor | Tidig förberedelse |
| Styrkeblock | Maxstyrka, hypertrofi | 3-4 veckor | Grundperiod |
| Intensitetsblock | VO2max, intervaller | 3-4 veckor | Uppbyggnad |
| Tröskelblock | Laktattröskel, tempo | 3-4 veckor | Sen uppbyggnad |
| Specifikt block | Tävlingsspecifik träning | 3-4 veckor | Före-tävling |
| Tapering | Formtopp | 2-3 veckor | Tävlingsperiod |
| Återhämtning | Aktiv vila, variation | 1-2 veckor | Transition |

### 2.3 Microcycle (Mikrocykel / Veckoplan)

Mikrocykeln är den dagliga planeringsnivån och representerar typiskt en vecka (7 dagar). Det är här de enskilda passen placeras i förhållande till varandra.

**Nyckelprinciper för mikrocykeldesign:**
1. **Hårt-lätt-principen:** Aldrig två hårda pass i rad utan tillräcklig återhämtning emellan (minimum 48 timmar mellan högintensiva pass)
2. **Specificitet före trötthet:** Placera de viktigaste passen tidigt i veckan när atleten är utvilad
3. **Komplementaritet:** Para ihop kompatibla stimuli (t.ex. styrka + låg aerob på samma dag snarare än styrka + HIIT)
4. **Sömnhänsyn:** Undvik högintensiva pass sent på kvällen (höjer kortisol, försvårar insomning)

**Typisk mikrocykelstruktur (6 dagar):**

| Dag | Huvudpass | Intensitet | Syfte |
|---|---|---|---|
| Måndag | Intervaller/HIIT | Hög (zon 4-5) | Primär stimulusdag |
| Tisdag | Distans zon 1 | Låg | Återhämtning + volym |
| Onsdag | Tröskel/tempo | Medel-hög (zon 3) | Sekundär stimulusdag |
| Torsdag | Aktiv vila / mobilitet | Mycket låg | Full återhämtning |
| Fredag | Styrketräning | Variabel | Neuromuskulär stimulus |
| Lördag | Långpass zon 1-2 | Låg-medel | Aerob volym |
| Söndag | Vila | - | Återhämtning |

## 3. Classical Periodization (Matveyev Model)

### 3.1 Theoretical Foundation

Lev Matveyevs klassiska periodiseringsmodell från 1960-talet är grunden för all modern periodisering. Modellen bygger på principen att volym och intensitet har ett omvänt förhållande: när volymen är hög är intensiteten låg, och tvärtom.

**Faserna i klassisk periodisering:**

1. **Allmän förberedelseperiod:** Hög volym, låg intensitet. Bygger aerob bas och allmän styrka. Bred repertoar av träningsformer.
2. **Specifik förberedelseperiod:** Volymen börjar minska, intensiteten ökar. Träningen blir mer tävlingsspecifik.
3. **Tävlingsperiod:** Låg volym, hög intensitet. Atleten är "vass" och formtoppad.
4. **Övergångsperiod:** Låg volym, låg intensitet. Återhämtning och mental förnyelse.

### 3.2 Strengths and Limitations

**Styrkor:**
- Enkel att förstå och implementera
- Väl lämpad för nybörjare och medelnivåatleter
- Bevisad effektivitet för idrotter med en tävlingstopp

**Begränsningar:**
- Svårt att formtoppa flera gånger under en säsong
- För lång tid mellan utveckling av fysiska egenskaper (dekonditioneringsrisk)
- Utvecklades för olympiska idrottare med en tävling per år - matchar inte modern tävlingskalender
- Försummar det faktum att aerob kapacitet börjar avta redan efter 3-4 veckors reducerad träning

## 4. Block Periodization (Issurin Model)

### 4.1 Core Concept

Vladimir Issurins blockperiodisering adresserar den klassiska modellens begränsningar genom att koncentrera träningsstimuli i kortare, mer fokuserade block (2-4 veckor per block). Istället för att träna alla fysiska egenskaper parallellt, fokuserar varje block på 1-2 primära egenskaper.

**De tre blocktyperna:**

1. **Ackumulationsblock (Accumulation):**
   - Duration: 2-4 veckor
   - Fokus: Aerob bas, styrka, teknisk grundläggning
   - Volym: Hög
   - Intensitet: Låg till medel
   - Exempel: 4 veckor med hög löpvolym och grundstyrka

2. **Transmutationsblock (Transmutation):**
   - Duration: 2-3 veckor
   - Fokus: Omvandla grundförmåga till specifik kapacitet
   - Volym: Medel
   - Intensitet: Medel till hög
   - Exempel: 3 veckor med tröskelintervaller och explosiv styrka

3. **Realisationsblock (Realization):**
   - Duration: 1-2 veckor
   - Fokus: Formtopp, tävlingsförberedelse, tapering
   - Volym: Låg
   - Intensitet: Hög (men låg total belastning)
   - Exempel: 10 dagar med minskad volym och några vassa intervaller

### 4.2 Sequencing Logic

Blocken måste sekvenseras i korrekt ordning: Ackumulation → Transmutation → Realisation. Denna sekvens kan upprepas 2-3 gånger under en säsong för att skapa flera formtoppar.

**Fördelarna för algoritmen:**
- Varje block har ett tydligt och programmerbart fokus
- Kortare block (2-4 veckor) minskar risken för dekonditionering av andra egenskaper
- Möjliggör flera formtoppar under en säsong
- Lättare att anpassa om atleten blir sjuk eller skadad (hoppa över ett block, inte en hel fas)

## 5. Undulating Periodization (Ondulerande periodisering)

### 5.1 Daily Undulating Periodization (DUP)

Daglig ondulerande periodisering varierar träningsstimulus från dag till dag istället för vecka till vecka. Denna modell har starkt forskningsstöd, särskilt för styrketräning, men kan även tillämpas på uthållighetsträning.

**Princip:** Istället för att dedikera hela veckor till en egenskap (t.ex. "hypertrofivecka"), varieras fokus varje pass:

| Dag | Styrka | Uthållighet |
|---|---|---|
| Måndag | Maxstyrka (3x3 @85%) | VO2max-intervaller (5x4 min) |
| Tisdag | - | Låg zon 1 distans |
| Onsdag | Hypertrofi (4x10 @70%) | Tempo/tröskel (20 min zon 3) |
| Torsdag | - | Vila / mobilitet |
| Fredag | Power (5x3 @75% explosivt) | Fartlek (blandad intensitet) |
| Lördag | - | Långpass zon 1-2 |

**Fördelar:**
- Undviker monotoni och mental uttröttning
- Flera stimuli per vecka ger mer frekvent adaptation
- Lägre risk för överbelastning av ett enskilt system
- Väl lämpad för atleter med begränsad tid som behöver maximera varje pass

### 5.2 Weekly Undulating Periodization (WUP)

Veckovis ondulerande periodisering varierar fokus vecka för vecka i ett roterande mönster, men med tydligare tematiska veckor än DUP.

**Exempel – 4-veckors rotation:**
- Vecka 1: Volymorienterad (hög volym, låg intensitet)
- Vecka 2: Intensitetsorienterad (VO2max-intervaller, maxstyrka)
- Vecka 3: Tröskelfokus (tempo, sweetspot, styrkeuthållighet)
- Vecka 4: Avlastning

Denna cykel upprepas genom hela mesocykeln med progressiv ökning av belastning vid varje rotation.

## 6. Conjugate Periodization (Konjugatmetoden)

### 6.1 Concept

Konjugatperiodisering, ursprungligen utvecklad av Louie Simmons (Westside Barbell) för styrkelyft, innebär att flera fysiska egenskaper tränas parallellt genom hela cykeln. Till skillnad från blockperiodisering, som sekvenserar egenskaper, betonar konjugatmetoden att alla egenskaper alltid är närvarande men med varierande betoning.

### 6.2 Adaptation for Endurance

För uthållighetsidrotter kan konjugatmetoden anpassas:
- **Maximal effort-dagar:** VO2max-intervaller eller race-pace-sessioner (roteras varannan vecka för att undvika stagnation)
- **Dynamic effort-dagar:** Korta, explosiva intervaller, sprintdrag, fartsprång
- **Repetition effort-dagar:** Tröskelarbete, tempo, uthållighetsstyrka

**Nyckelinsikt:** Övningarna roteras var 1-3 veckor för att undvika ackommodation (att kroppen anpassar sig och slutar respondera). En löpare byter t.ex. mellan 5x4 min VO2max, 3x8 min intervaller och 8x2 min hill sprints.

## 7. Reverse Periodization (Omvänd periodisering)

### 7.1 Concept

Omvänd periodisering vänder på den klassiska modellens logik: intensiteten är hög tidigt i förberedelseperioden, och volymen ökar gradvis mot tävling. Detta är särskilt relevant för:

- **Maratonlöpare:** Börja med VO2max-block, bygg sedan ut distansen
- **Triatleter:** Utveckla toppfart först, lägg sedan till uthålligheten
- **Atleter med begränsad tid:** Korta, intensiva pass är lättare att passa in tidigt på säsongen

### 7.2 Physiological Rationale

Intensitetsträningens anpassningar (VO2max, neuromuskulär rekrytering) avtar snabbare än volymträningens anpassningar (mitokondrier, kapillarisering) vid reducerad träning. Genom att bygga intensitetskapaciteten först och sedan lägga volym ovanpå behåller atleten båda egenskaper längre in i tävlingsperioden.

**Varning:** Omvänd periodisering kräver en god aerob grundnivå. Den är INTE lämpad för nybörjare utan träningsbas.

## 8. Autoregulation: RPE, Readiness Scores, and HRV-Guided Training

### 8.1 RPE-Based Progression

Autoregulering innebär att träningsbelastningen justeras i realtid baserat på atletens dagliga tillstånd, snarare än att strikt följa en förutbestämd plan.

**RPE-skalan (Rate of Perceived Exertion):**
- RPE 6-7: Kan göra 3-4 repetitioner till (lätt)
- RPE 8: Kan göra 2 repetitioner till (måttligt)
- RPE 9: Kan göra 1 repetition till (hårt)
- RPE 10: Maximalt (ingen rep kvar)

**Praktisk tillämpning:** Istället för att föreskriva "4x5 @80 kg" kan algoritmen föreskriva "4x5 @RPE 8" och låta atleten justera vikten baserat på dagsform. Om 80 kg känns som RPE 9 en dag, sänks till 75 kg. Om det känns som RPE 7, höjs till 82,5 kg.

### 8.2 Readiness Scores

Beredskapsvärden kombinerar flera datapunkter för att ge ett samlat mått på atletens träningsberedskap:

- **HRV-status:** Jämförelse med individuell baslinje (7-dagars rullande medelvärde)
- **Sömnkvalitet:** Timmar, djupsömn, uppvakningar
- **Subjektiv trötthet:** 1-10 skala morgonenkät
- **Muskelömhet:** 1-10 skala
- **Psykologisk stress:** Livsbelastning utanför idrotten

**Beslutsmatris:**
- Beredskap > 80%: Kör planerat pass, överväg progression
- Beredskap 60-80%: Kör planerat pass men reducera volym 10-20%
- Beredskap 40-60%: Ersätt högintensivt pass med medel, reducera volym 30%
- Beredskap < 40%: Aktiv vila eller lätt pass zon 1

### 8.3 HRV-Guided Training

HRV-guidad träning (HRVG) använder dagliga HRV-mätningar för att bestämma om atleten ska köra ett hårt eller lätt pass. Studier av Kiviniemi et al. (2007) och Vesterinen et al. (2016) visar att HRV-guidad träning ger lika bra eller bättre resultat än traditionell periodisering med färre överträningsepisoder.

**Algoritm:** Om dagens HRV är inom eller över det individuella 7-dagars normalintervallet → kör planerat pass. Om HRV är mer än 0,5 SD under normalen → ersätt med lågt pass. Om HRV är mer än 1 SD under normalen → aktiv vila.

## 9. Fractal Periodization (Martin Buchheit)

### 9.1 Concept

Fraktal periodisering, beskriven av Martin Buchheit, är en modern metod som ifrågasätter behovet av fasta, linjära block. Konceptet bygger på att belastningsmönster bör vara "fraktala" - det vill säga att variation existerar på alla nivåer (dag, vecka, block, säsong) och att överdrivet strikt planering är kontraproduktiv.

### 9.2 Practical Application

- **Flexibilitet:** Veckoplanerna skrivs med inbyggda beslutsgrenar (om HRV hög → pass A; om låg → pass B)
- **Stokastisk variation:** Belastning varierar mer slumpmässigt inom ramen, liknande verklighetens krav
- **Individualisering:** Atleten har mer inflytande över sin egen träning baserat på känsla och data
- **Minskad monotonicitet:** Den naturliga variationen minskar överträningsrisken

**AI-motorns roll:** Fraktal periodisering är idealisk för algoritmer eftersom den kräver kontinuerlig dataanalys och beslutsfattande snarare än statisk planering. Motorn kan justera daglig träning baserat på inkommande data utan att förlora den långsiktiga planen.

## 10. Long-Term Athlete Development (LTAD) and Career Stage Considerations

### 10.1 Periodization at Different Career Stages

Periodisering måste anpassas till atletens utvecklingsstadium:

**Nybörjare (0-2 års träningsålder):**
- Enkel periodisering med tydliga faser
- Längre grundperioder, kortare intensitetsfaser
- Avlastning var 2-3:e vecka
- Fokus på teknik, allsidig fysisk utveckling
- Undvik specialisering och tidig formtoppning

**Medelnivå (2-5 år):**
- Block- eller ondulerande periodisering
- 3:1 belastning:avlastning
- Gradvis ökad specificitet
- Introduktion av dubbel periodisering om tävlingskalendern kräver det

**Avancerad (5-10 år):**
- Komplex periodisering med flera block och formtoppar
- 4:1 eller 5:1 belastning:avlastning
- Hög grad av autoregulering
- Konjugat- eller fraktalmetoder kan tillämpas

**Elit (10+ år):**
- Individuellt anpassad periodisering baserad på åratal av data
- Trippel periodisering möjlig
- Hög tolerans för belastningsvariation
- Träningsobservationer och mönsterigenkänning från tidigare säsonger styr planeringen

### 10.2 Masters Athletes (Veteraner, 40+ år)

Äldre atleter behöver modifierad periodisering:
- Längre återhämtningsperioder (48-72 timmar mellan hårda pass istället för 24-48)
- Längre tapering (2-3 veckor extra jämfört med yngre atleter)
- Fokus på underhåll av styrka och power (sjunker snabbare med ålder)
- Ökad risk för överbelastningsskador kräver försiktigare progression
- Avlastning var 2-3:e vecka snarare än var 3-4:e

## 11. Environmental Periodization

### 11.1 Seasonal Adjustments

Miljöfaktorer bör integreras i periodiseringen:

**Vinter (november-februari, Norden):**
- Begränsat dagsljus → påverkar dygnsrytm, motivation, D-vitaminproduktion
- Kyla → längre uppvärmning, ökad energiförbrukning, ökad risk för luftvägsinfektioner
- Alternativa träningsformer (inomhus, skidåkning, simning)

**Sommar (juni-augusti):**
- Värme → ökad vätskeförlust, högre kardiovaskulär belastning, reducerad prestationsförmåga vid hög temperatur
- Längre dagar → möjlighet till mer utomhusträning, men risk för överträning pga motivation
- Planera högintensiva pass till svalare tidpunkter (morgon, kväll)

### 11.2 Altitude Periodization

Höghöjdsträning bör planeras 3-4 veckor före en viktig tävling. "Live high, train low"-modellen (1800-2500 m sömn, <1200 m träning) är den mest evidensbaserade. Erytropoetisk effekt märks typiskt 2-3 veckor efter höghöjdslägret.

## 12. Competition Modeling: Planning Backwards from Target Race

### 12.1 Reverse Planning Approach

Tävlingsplanering börjar med målloppet och räknar bakåt:

1. **Fastställ tävlingsdatum** och önskat TSB-värde på tävlingsdagen (+10 till +25)
2. **Tapering:** 2-3 veckor (maraton) eller 1-2 veckor (5K-10K) direkt före lopp
3. **Specifikt block:** 3-4 veckor tävlingsspecifik träning
4. **Uppbyggnadsblock:** 4-6 veckor ökande intensitet
5. **Grundblock:** Resterande tid fylls med basträning

**Exempel – maraton den 5 oktober:**

| Period | Veckor | Datum | Fokus |
|---|---|---|---|
| Grundperiod | v1-12 | 1 maj – 25 juli | Volymuppbyggnad, grundstyrka |
| Uppbyggnad | v13-18 | 28 juli – 7 sept | Tröskellöpning, tempolöp, långpass med fart |
| Specifikt | v19-22 | 8 sept – 5 okt | MP-intervaller, dress rehearsal, tapering |
| Tävling | v22 | 5 oktober | Maraton |

### 12.2 Multiple Competition Planning

Vid flera tävlingar under en säsong prioriteras A-, B- och C-tävlingar:
- **A-tävling:** Huvudmål, full tapering och formtopp
- **B-tävling:** Viktig men inte huvudmål, delvis tapering (volymreduktion utan fullständig taper)
- **C-tävling:** Träningslopp, ingen taper, körs som hårt träningspass

## 13. Overreaching vs Overtraining: Periodization as Prevention

### 13.1 Planned Overreaching

Funktionell overreaching (FOR) är ett planerat verktyg inom periodisering. Genom att medvetet överbelasta atleten under 1-2 veckor och sedan ge adekvat återhämtning uppnås supercompensation.

**Säkerhetsregler:**
- Planerad overreaching-period bör inte överstiga 2 veckor
- Avlastningsveckan efter måste vara genuint avlastande (50-60% reduktion)
- Monitorera HRV, sömnkvalitet och subjektivt mående dagligen
- Abort om prestationen sjunker >10% eller HRV sjunker >20% under baslinje

### 13.2 Periodization as Protection

Korrekt periodisering är det främsta skyddet mot överträning. Nyckelaspekter:
- **Regelbundna avlastningsveckor** förhindrar ackumulering av trötthet
- **Variation i träningsstimuli** minskar monotoni och strain
- **Progressiv belastningsökning** (max 10% per vecka) ger kroppen tid att anpassa sig
- **Transition-perioder** efter tävlingssäsongen ger fullständig mental och fysisk återhämtning

## 14. Deload Weeks (Avlastningsveckor)

### 14.1 Purpose and Timing

Avlastningsveckor är planerade perioder med reducerad träningsbelastning som tillåter supercompensation - den fysiologiska processen där kroppen anpassar sig och uppnår en högre prestationsnivå efter återhämtning från träningsstress.

**När ska avlastning planeras?**
- Var 3-4:e vecka i standardperiodisering (3:1 eller 4:1 belastning:avlastning)
- Erfarna atleter kan tolerera 4-5 veckor före avlastning
- Nybörjare kan behöva avlastning var 2-3:e vecka
- Extra avlastning vid tecken på overreaching (se recovery-overtraining.md)

### 14.2 How to Deload

**Volymreduktion (rekommenderat):**
- Minska total träningsvolym med 40-60%
- Bibehåll frekvens (antal pass per vecka)
- Bibehåll intensitet i de pass som görs (men färre antal reps/intervaller)
- Exempel: Om normalvecka = 5x10 km löpning, avlastningsvecka = 5x5 km löpning med samma zonfördelning

**Intensitetsreduktion (alternativ):**
- Bibehåll volym men sänk intensiteten med 1-2 zoner
- Alla pass i zon 1
- Mindre psykologiskt tillfredsställande men vilsamt för nervsystemet

**Kombinerad reduktion:**
- Minska både volym (-30%) och intensitet (inga pass över zon 2)
- Används vid tecken på överreaching eller inför tävling

### 14.3 Practical Deload Week Example (Day by Day)

**Normal vecka (uthållighetsatlet, 10 timmar/vecka):**

| Dag | Pass | Volym | Intensitet |
|---|---|---|---|
| Måndag | VO2max-intervaller 6x4 min | 75 min | Zon 4-5 |
| Tisdag | Lätt löpning | 60 min | Zon 1 |
| Onsdag | Tröskeltempo 3x10 min | 70 min | Zon 3 |
| Torsdag | Vila | - | - |
| Fredag | Styrketräning + lätt löpning | 90 min | Varierad |
| Lördag | Långpass | 120 min | Zon 1-2 |
| Söndag | Vila | - | - |

**Avlastningsvecka (samma atlet, ~6 timmar/vecka):**

| Dag | Pass | Volym | Intensitet |
|---|---|---|---|
| Måndag | VO2max-intervaller 3x4 min | 50 min | Zon 4-5 (halverad volym) |
| Tisdag | Lätt löpning | 40 min | Zon 1 |
| Onsdag | Tempo 1x10 min | 45 min | Zon 3 (reducerad) |
| Torsdag | Vila / promenad | 30 min | Zon 1 |
| Fredag | Lätt styrka + mobilitet | 45 min | Reducerad last |
| Lördag | Medellångt pass | 70 min | Zon 1-2 |
| Söndag | Vila | - | - |

### 14.4 Common Deload Mistakes

1. **Ingen avlastning alls:** Vanligaste felet. Atleter känner sig starka vecka 3 och ökar istället. Resulterar i platåer och överträning.
2. **Full vila:** Att ta en hel vecka ledigt är för mycket - dekonditionering börjar efter 5-7 dagars inaktivitet. Aktiv avlastning är överlägset.
3. **Avlastning med ny träning:** Att byta till en ny träningsform (t.ex. crossfit) under avlastningsveckan är INTE vila - det är ny stress.

## 15. Tapering: Pre-Competition Peaking

### 15.1 The Science of Tapering

Tapering är den sista fasen före tävling där träningsbelastningen systematiskt reduceras för att optimera prestation. Forskning visar att korrekt tapering kan förbättra prestation med 2-6% - en enorm marginal på elit- och subelitnivå.

### 15.2 Tapering Parameters

**Duration:**
- Sprint/kraftidrotter: 7-10 dagar
- Mellankistanslopp (5K-10K): 10-14 dagar
- Maratonlopp: 14-21 dagar
- Längre ultra: 21-28 dagar
- Längre tapering för äldre atleter (> 40 år)

**Volymreduktion:**
- Total volym minskas med 40-60% över taperperioden
- Progressiv minskning (inte abrupt): -20% första veckan, ytterligare -20% andra veckan
- Exponentiell taper (större reduktion mot slutet) ger bättre resultat än linjär taper

**Intensitetshänsyn:**
- BEHÅLL intensiteten! Detta är den viktigaste regeln vid tapering.
- Gör färre men lika vassa intervaller
- Exempel: Normalvecka 8x4 min zon 4 → Tapervecka 4x4 min zon 4
- Att ta bort all intensitet leder till "desharpening" och trög känsla på tävlingsdagen

**Frekvens:**
- Minska antal träningstillfällen med 20-30%
- Behåll 1-2 intensitetspass per vecka under tapering

### 15.3 Tapering Timeline Example (Marathon)

| Vecka före lopp | Långpass | Intervaller | Total volym |
|---|---|---|---|
| 3 veckor | 25-28 km | 2 pass/v | 85% av normal |
| 2 veckor | 18-20 km | 1-2 pass/v | 65% av normal |
| 1 vecka | 10-12 km | 1 pass (kort) | 40% av normal |
| Loppdag | - | - | Lopp |

## 16. Supercompensation Principle

### 16.1 The Model

Supercompensation är den biologiska principen bakom all periodisering. Modellen beskriver fyra faser:

1. **Träning (stimulus):** Träningspasset sänder stress som temporärt sänker prestationsförmågan.
2. **Återhämtning:** Kroppen reparerar och återställer.
3. **Supercompensation:** Kroppen överkompenserar - prestationsförmågan överstiger ursprungsnivån.
4. **Detraining:** Om ingen ny stimulus tillkommer avtar supercompensationen tillbaka till baseline.

**Kritisk insikt för algoritmen:** Nästa träningspass måste timas för att sammanfalla med supercompensationsfönstret. För tidigt = överträning. För sent = förtappad anpassning.

### 16.2 Practical Application

- **Lätta pass (zon 1-2):** Supercompensation inom 24-48 timmar
- **Högintensiva pass (zon 4-5):** Supercompensation inom 48-72 timmar
- **Maximal styrka:** Supercompensation inom 72-96 timmar
- **Långpass (> 2 timmar):** Supercompensation inom 48-72 timmar

## 17. Monotony and Strain: Quantification

### 17.1 Calculation

Fosters träningsmonotoni och strain-modell är ett kraftfullt verktyg för att övervaka belastning:

**Training Load (TL) per session:**
$$TL = RPE \times duration\_i\_minuter$$

**Weekly Load:**
$$\text{Weekly Load} = \sum TL_{alla\_pass}$$

**Monotony (Monotoni):**
$$\text{Monotoni} = \frac{\overline{TL_{dag}}}{\sigma_{TL_{dag}}}$$

Där medelvärde divideras med standardavvikelse för dagliga belastningsvärden.

**Strain:**
$$\text{Strain} = \text{Weekly Load} \times \text{Monotoni}$$

### 17.2 Interpretation

| Värde | Tolkning | Åtgärd |
|---|---|---|
| Monotoni < 1.5 | Bra variation | Fortsätt planerat |
| Monotoni 1.5-2.0 | Förhöjd risk | Öka variation i passtyper |
| Monotoni > 2.0 | Hög risk för överträning | Omedelbar justering |
| Strain > 5000 (godtyckliga enheter) | Varningsnivå | Planera avlastning |

**AI-motorns uppgift:** Beräkna monotoni och strain veckovis och flagga automatiskt när värdena närmar sig risknivåer.

## 18. ATL/CTL/TSB Model (Performance Manager)

### 18.1 Definitions

- **ATL (Acute Training Load):** Kortsiktig träningsbelastning, typiskt 7-dagars exponentiellt viktat medelvärde av daglig Training Stress Score (TSS)
- **CTL (Chronic Training Load):** Långsiktig träningsbelastning, typiskt 42-dagars exponentiellt viktat medelvärde
- **TSB (Training Stress Balance):** Formvärde = CTL - ATL

### 18.2 Practical Interpretation

$$TSB = CTL - ATL$$

| TSB-värde | Tolkning | Konsekvens |
|---|---|---|
| TSB > +20 | Utvilad/detränad | Bra för tävling, risk för formförlust vid långvarigt |
| TSB 0 till +20 | Positiv form | Optimal tävlingsform |
| TSB -10 till 0 | Neutral | Produktiv träning |
| TSB -30 till -10 | Funktionell overreaching | Normal under hårda träningsblock |
| TSB < -30 | Riskzon | Risk för icke-funktionell overreaching |

### 18.3 Practical Application for the AI Engine

- **Under grundperiod:** TSB bör oscillera mellan -20 och +5 med avlastningsveckor som återställer till +5 till +15
- **Under uppbyggnad:** TSB kan tillåtas sjunka till -25 under belastningsveckor
- **Före tävling (tapering):** TSB bör stiga till +10 till +25 på tävlingsdagen
- **Varningssystem:** Om CTL sjunker mer än 15% på 2 veckor utan planerad avlastning → flagga för överträning eller sjukdom

## 19. Adaptation for Multi-Sport Athletes

### 19.1 Triathlon Periodization

Triatleter måste periodisera tre discipliner simultant. Huvudprinciper:

- **Fokusblock:** Varje mesocykel betonar 1-2 discipliner medan den tredje underhålls
- **Brick sessions:** Kombinerade pass (cykel + löp) simulerar tävlingsbelastning
- **Prioritetsordning:** Förbättra svagaste disciplinen under grundperioden; förstärk starkaste under tävlingsperioden

### 19.2 HYROX Periodization

HYROX-periodisering kräver balans mellan löpning, funktionell styrka och uthållighet:

- **Grundperiod:** Aerob bas (löpning) + grundstyrka (squat, deadlift, press)
- **Uppbyggnad:** Specifika HYROX-stationer (sled push/pull, wall balls, farmers carry) + tröskellöpning
- **Tävling:** Fullständiga eller delsimulationer, tapering

### 19.3 General Multi-Sport Principles

1. **Periodisera disciplinerna asymmetriskt:** Alla discipliner behöver inte vara i samma fas
2. **Identifiera limiters:** Fokusera på den svagaste länken
3. **Anpassa avlastning:** Avlasta alla discipliner samtidigt för full återhämtning
4. **Cross-transfer:** Aerob kapacitet transfererar mellan discipliner, styrka och teknik gör det inte

## 20. Key Terminology

| Svenska | English | Definition |
|---------|---------|------------|
| Periodisering | Periodization | Systematisk planering av träning i cykler för att optimera prestation |
| Makrocykel | Macrocycle | Längsta planeringsenheten (6-12 månader), hela säsongen |
| Mesocykel | Mesocycle | Medellång cykel (3-6 veckor) med specifikt fokus |
| Mikrocykel | Microcycle | Kortaste cykeln, typiskt 1 vecka |
| Avlastningsvecka | Deload week | Planerad vecka med reducerad belastning för återhämtning |
| Tapering | Tapering | Kontrollerad belastningsreduktion inför tävling |
| Formtopp | Peaking | Uppnå maximal prestation vid specifikt tillfälle |
| Blockperiodisering | Block periodization | Koncentrerad träning i korta block med 1-2 fokusegenskaper |
| Ondulerande periodisering | Undulating periodization | Varierande träningsstimulus dag för dag eller vecka för vecka |
| Konjugatmetoden | Conjugate method | Parallell träning av flera egenskaper med roterade övningar |
| Autoregulering | Autoregulation | Justering av träning baserat på daglig beredskap och RPE |
| Supercompensation | Supercompensation | Fysiologisk process där kroppen överkompenserar efter träningsstress |
| Monotoni | Monotony | Mått på träningens enformighet (medel/standardavvikelse) |
| Överträning | Overtraining | Kronisk obalans mellan belastning och återhämtning |
| Funktionell overreaching | Functional overreaching | Planerad kortvarig överbelastning som leder till supercompensation |
| Tävlingsperiod | Competition period | Fas med högt tävlingsfokus och reducerad träningsvolym |
| Övergångsperiod | Transition period | Vila- och återhämtningsfas mellan säsonger |
| Fraktal periodisering | Fractal periodization | Flexibel periodisering med datadriven daglig variation |
| Belastningsstyrning | Load management | Systematisk kontroll av träningsbelastningens progression |

## 21. References

- Matveyev, L.P. (1981). *Fundamentals of Sports Training*. Progress Publishers, Moscow.
- Issurin, V.B. (2010). New horizons for the methodology and physiology of training periodization. *Sports Medicine*, 40(3), 189-206.
- Bompa, T.O. & Haff, G.G. (2009). *Periodization: Theory and Methodology of Training*. 5th ed. Human Kinetics.
- Buchheit, M. (2017). Want to see my new approach to periodization? Here it is. *Sport Performance & Science Reports*, #1.
- Kiviniemi, A.M. et al. (2007). Endurance training guided individually by daily heart rate variability measurements. *European Journal of Applied Physiology*, 101(6), 743-751.
- Vesterinen, V. et al. (2016). Individual endurance training prescription with heart rate variability. *Medicine & Science in Sports & Exercise*, 48(7), 1347-1354.
- Foster, C. (1998). Monitoring training in athletes with reference to overtraining syndrome. *Medicine & Science in Sports & Exercise*, 30(7), 1164-1168.
- Banister, E.W. (1991). Modeling elite athletic performance. In *Physiological Testing of the High-Performance Athlete*. Human Kinetics, 403-424.
- Mujika, I. & Padilla, S. (2003). Scientific bases for precompetition tapering strategies. *Medicine & Science in Sports & Exercise*, 35(7), 1182-1187.
- Rhea, M.R. et al. (2002). A comparison of linear and daily undulating periodized programs with equated volume and intensity for strength. *Journal of Strength and Conditioning Research*, 16(2), 250-255.
- Simmons, L. (2007). *The Westside Barbell Book of Methods*. Westside Barbell.
- Balyi, I. & Hamilton, A. (2004). Long-term athlete development: Trainability in childhood and adolescence. *Olympic Coach*, 16(1), 4-9.
- Meeusen, R. et al. (2013). Prevention, diagnosis and treatment of the overtraining syndrome. *European Journal of Sport Science*, 13(1), 1-24.
