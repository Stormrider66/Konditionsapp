/**
 * Crohn's Disease — Training & Nutrition Knowledge Document
 *
 * Evidence-based coaching guide for athletes with Crohn's disease.
 * Used as a RAG knowledge document for AI coaching.
 *
 * Sources: Karolinska Institutet HIIT trials, Blackwell et al. (2023),
 * PREHAB Crohn Study, Wiroth et al. longitudinal studies.
 */

export const CROHNS_KNOWLEDGE_DOCUMENT_NAME = 'Träning & Näring vid Inflammatorisk Tarmsjukdom (IBD)'
export const CROHNS_KNOWLEDGE_DOCUMENT_NAME_EN = 'Training & Nutrition for Athletes with Inflammatory Bowel Disease'

export const CROHNS_KNOWLEDGE_DESCRIPTION = `
Evidensbaserad guide för träningsanpassning och näringsstrategi för idrottare med Crohns sjukdom
och inflammatorisk tarmsjukdom (IBD). Täcker fysiologisk påverkan, träningsprogrammering,
ACWR-anpassning, näringsoptimering, återhämtning, medicininteraktioner och röda flaggor.
Fokuserar på praktisk, bemyndigande coaching som betonar vad atleten KAN göra.
`

export const CROHNS_KNOWLEDGE_DESCRIPTION_EN = `
Evidence-based guide for adapting training and nutrition strategy for athletes with Crohn's disease
and inflammatory bowel disease (IBD). Covers physiological impact, programming, ACWR adjustments,
nutrition optimization, recovery, medication interactions, and red flags. Focuses on practical,
empowering coaching that emphasizes what the athlete CAN do.
`

export const CROHNS_KNOWLEDGE_KEYWORDS = [
  // Swedish
  'crohn', 'ibd', 'inflammatorisk', 'tarmsjukdom', 'tarm', 'mag',
  'magproblem', 'buksmärta', 'diarré', 'inflammation', 'skov',
  'malabsorption', 'järnbrist', 'anemi', 'b12', 'vitamin d',
  'bentäthet', 'osteoporos', 'biologiska', 'kortison',
  'antiinflammatorisk', 'glutenfri', 'laktosintolerans',
  // English
  'crohns', 'inflammatory', 'bowel', 'gut', 'gi-sensitivity',
  'flare', 'malabsorption', 'iron-deficiency', 'anemia',
  'anti-inflammatory', 'biologics', 'corticosteroids',
]

/**
 * The full knowledge content, structured for chunking and RAG retrieval.
 * Written in a coaching-oriented, practical tone.
 */
export const CROHNS_KNOWLEDGE_CONTENT = `
# Träning & Näring vid Inflammatorisk Tarmsjukdom — Evidensbaserad Coachingguide

## 1. FYSIOLOGISK PÅVERKAN PÅ TRÄNING

### Energimetabolism och Syreupptagning
Energitillgängligheten hos IBD-atleter kan vara nedsatt på grund av malabsorption i tunntarmen och ökad metabolisk kostnad av kronisk inflammation. Tunntarmen ansvarar för absorption av makro- och mikronäringsämnen som driver citronsyracykeln och elektrontransportkedjan. När tarmbarriären är komprometterad kan effektiviteten av kolhydrat- och fettoxidation minska, vilket potentiellt leder till tidigare övergång till anaerob glykolys.

Kardiorespiratorisk fitness (VO2max) kan vara lägre hos IBD-populationen på grund av kronisk trötthet och systemisk inflammation, även under remission. Studier med högintensiv intervallträning (HIIT) visar dock att VO2peak kan förbättras med +2.4 mL/kg/min jämfört med +0.7 vid måttlig intensitet, vilket tyder på att det kardiovaskulära systemet behåller hög plasticitet om stimulansen tajmas rätt.

### Muskelåterhämtning och Träningsanpassning
IBD-relaterad sarkopeni med minskat skelettmuskelindex (SMI) och försämrad muskelkvalitet drivs av systemiska cytokiner som interfererar med mTOR-signalvägen (viktig för muskelhypertrofi och reparation). Kronisk inflammation i kombination med protein-energi-malnutrition kan leda till fördröjd återhämtning efter intensiv uthållighets- eller styrketräning.

Träning har dock antiinflammatorisk effekt: muskelkontraktioner frisätter myokiner (framför allt IL-6) som i ett träningssammanhang stimulerar produktion av IL-10 och IL-1ra samtidigt som TNF-alpha hämmas. Denna "träningsinducerade antiinflammatoriska kaskad" kan skydda tarmslemhinnan och minska frekvensen av symtomatiska skov.

### Inflammatoriska markörer och träningseffekt
- TNF-alpha: Primär drivkraft i tarminflammation → hämmas av muskelderiverat IL-6 vid träning
- IL-6 (systemiskt): Proinfammatorisk markör → moduleras transiellt av träning
- IL-10: Antiinflammatorisk cytokin → ökar efter strukturerad träning
- CRP: Markör för systemisk inflammatorisk belastning → sänks vid regelbunden aktivitet
- Fekalt kalprotektin: Markör för lokal tarminflammation → stabil eller minskad vid måttlig intensitet

### Trötthetshantering
Det är kritiskt att skilja mellan träningsrelaterad och sjukdomsrelaterad trötthet. Träningsrelaterad trötthet lokaliseras till perifera muskler och går över med standard vila (24-48 timmar). IBD-relaterad trötthet påverkar 53-76% av patienter med aktiv sjukdom och är ett flerdimensionellt tillstånd med psykologiska, centrala och perifera faktorer. Denna trötthet korrelerar inte alltid med inflammationsmarkörer.

Under skov kan atleten uppleva "sömnlöshet av smärta," urgency-relaterad sömnbrist och betydande minskning i kraftproduktion. Under remission kan atleten prestera på nivåer jämförbara med friska kamrater, men kräver mer noggrann återhämtning.

### Järnbrist och Anemi
Järnbrist är en allvarlig komplikation för IBD-atleter, orsakad av ockult blodförlust, malabsorption i duodenum/jejunum och "kronisk sjukdomsanemi" där inflammation blockerar järnutnyttjandet. Låga ferritinnivåer leder till minskat hemoglobin, vilket försämrar blodets syretransportkapacitet. Detta resulterar i högre fysiologisk kostnad vid submaximal ansträngning, förhöjd puls och högre laktatansamling vid lägre effekter.

### Värmereglering och Hydrering
Kronisk diarré och malabsorption skapar ett basalt dehydreringstillstånd som minskar plasmavolym och svettfrekvens. Så lite som 2% minskning av total kroppsvätska kan öka kärntemperatur och hjärtfrekvens, vilket markant minskar maximal arbetskapacitet. Proaktiv, schemalagd hydrering behövs istället för att förlita sig på törstsignaler.

## 2. TRÄNINGSANPASSNING & PROGRAMMERING

### Intensitetsriktlinjer efter inflammationsstatus

**Under remission:**
- Aerob: 3-5 dagar/vecka, 20-60 minuter vid 60-85% av VO2max/HRmax
- Styrketräning: 2-3 gånger/vecka med fokus på 60-80% av 1-RM
- HIIT-intervaller tolereras väl och ger bättre resultat än måttlig kontinuerlig träning

**Under aktivt skov:**
- Fokusera på lågintensiv rörelse (Zon 1): promenader, mjuk simning
- Prioritera rörlighet, mobility och återhämtning
- Reducera all träning med hög mekanisk belastning

### ACWR-anpassning för IBD-atleter
ACWR (Acute:Chronic Workload Ratio) är centralt för belastningshantering:
- < 0.8: Underträning/Återhämtning — lämpligt under skov, annars risk för avträning
- 0.8-1.3: Optimal "sweet spot" — bygger fitness och minimerar skovrisk
- 1.3-1.5: Överbelastning — övervaka noggrant för IBD-symtom, prioritera sömn
- > 1.5: Farozon — signifikant ökad risk för skada eller symtomförvärring

Vid återgång från skov har den kroniska belastningen sjunkit. Använd EWMA-modellen (Exponentially Weighted Moving Average) istället för rullande medelvärde för att säkerställa gradvis återgång.

### Polariserad träning (80/20) — Anpassning
- Lågintensivt (80%): Strikt Zon 1-2 för att bevara tarmgenomblödning och hålla systemisk stress låg
- Högintensivt (20%): HIIT-intervaller (t.ex. 10×1 min) tolereras bättre än uthålliga tröskelpass, då återhämtningsintervallerna förhindrar långvarig intestinal ischemi
- Tröskelvarning: Uthålliga ansträngningar nära laktattröskeln kan minska mesenterisk blodflöde med upp till 80%, vilket potentiellt utlöser GI-besvär

### Återhämtning
- Sömnkvalitet är primärt försvar mot trötthet — konsekventa sömnrutiner är kritiska
- Stresshantering (mindfulness, yoga) är prestationshöjande strategier via hjärna-tarm-axeln
- Vila mellan set i styrketräning: 2-3 minuter rekommenderas för att hantera central trötthet

### IBD-specifika beredskapsindikatorer
Utöver HRV och sömndata bör följande övervakas:
- Avföringskvalitet (Bristol Stool Scale): Plötslig förskjutning till typ 6-7 signalerar behov av reducerad intensitet
- Nattlig urgency: >2 gånger/natt → nästa dags träning bör vara aktiv återhämtning
- Buksmärta: Smärta >3/10 under träningspass → pausa eller modifiera passet
- Subjektiv trötthet (MFI-20/DFIS): Identifierar "central" trötthet som kan föregå kliniskt skov

### Periodisering kring medicinering
- Biologiska (Infliximab, Adalimumab): 24-48 timmar efter infusion kan medföra systemisk trötthet. Schemalägg högintensiva pass till "toppen" av cykeln
- Kortikosteroider (Prednison): Förhöjd risk för senor. Högre repetitioner, lägre belastning — undvik explosiv plyometrik
- Immunosuppressiva: Träna i välventilerade miljöer under influensasäsonger

### Styrketräning för bentäthet
30-60% av Crohn-patienter har låg bentäthet, vilket gör styrketräning till en icke-förhandlingsbar del:
- Multiledslaster: Knäböj, utfall och marklyft stimulerar osteoblastaktivitet
- Kärnstabilitet: Bäckenbottenträning (Kegel) stärker stödet kring rektum och blåsa
- Ledskydd: Gummiband under perioder med perifer artrit bevarar muskelmassa utan ledbelastning

## 3. NÄRINGSSTRATEGI

### Makronäringsämnen
- Protein: 1.2-1.5 g/kg under remission, 1.8-2.0 g/kg under återhämtning från skov. Vassleprotein fungerar väl, men laktosfria eller växtbaserade isolat (soja, ärt) tolereras ofta bättre under symtomatiska perioder
- Kolhydrater: Fokusera på lågfiber, hög-glukos/maltodextrin-källor 2 timmar före träning. Begränsa fruktos vid malabsorption
- Fett: Omega-3-fettsyror (fisk, lin) har antiinflammatoriska effekter. Undvik fettrika måltider direkt före och under träning (fördröjer magsäckstömning)

### Mikronäringsämnen — Vanliga brister och strategier
- Vitamin B12: Risk vid ileal sjukdom/kirurgi → sublingual eller injektion
- Järn: Risk vid aktiv blödning → kombinera med C-vitamin, undvik med mejeriprodukter
- Vitamin D: Risk vid kortisonbehandling → supplementera till >30 ng/mL
- Zink: Risk vid kronisk diarré → 15-30 mg under skovperioder
- Kalcium: Risk vid laktosintolerans/steroider → laktosfri mejeri, tofu, sardiner
- Magnesium: Risk vid kronisk diarré → topikal eller oral om tolererat

### Måltidstiming — "Sandwich-metoden"
- Före träning (60 min): 2 dadlar, en banan eller vitt bröd med lite mandelssmör
- Under träning (>60 min): Flytande kolhydrater (5-8% koncentration) eller lågfruktos-geler. 2-3 klunkar var 15-20 minut
- Efter träning (inom 30-60 min): Smoothie med vassle/ärtprotein och banan — blandat format reducerar matsmältningsenergin

### Hydrering och Elektrolyter
IBD-atleter har hög risk för hypoton hypovolemi. Rent vatten passerar ibland genom systemet för snabbt.

Hemgjord ORS (Oral Rehydration Solution) vid skov/hög svettning:
- 1 liter vatten
- 6 teskedar socker (ger glukostransportör)
- 0.5 tesked salt (ger natrium)
- Skvätt apelsin- eller citronjuice för smak och kalium

Mål: 2-5 dl vätska per måltid + 7 dl per träningstimme.

### Antiinflammatoriska kostmönster
- Medelhavskost: Starkast evidens för långsiktig hälsa med omega-3 och fibre som tolereras
- CDED (Crohn's Disease Exclusion Diet): Exkluderar livsmedelstillsatser, emulgeringsmedel och vissa fibrer. Studier från Karolinska Institutet visar att CDED + PEN (Partial Enteral Nutrition) signifikant minskar CRP och främjar slemhinneläkning
- SCD (Specific Carbohydrate Diet): Begränsar polysackarider och disackarider. Idrottare måste vara försiktiga med risk för oavsiktlig viktnedgång och LEA (Low Energy Availability)

## 4. PSYKOLOGISKA & PRAKTISKA ASPEKTER

### Kommunikationsriktlinjer för AI-coachen
- Använd bemyndigande språk. Istället för "din sjukdom blossar upp" → "din kropp prioriterar just nu inre läkning, så vi anpassar träningsfokus för att stödja den processen"
- Fokusera på "kan göra": Skifta narrativet från "jag kan inte springa idag" till "jag fokuserar på min rörlighet och återhämtning idag för att bli starkare imorgon"
- Var ärlig om behovet att "hålla tillbaka" för långsiktiga framsteg
- Betona att vila är ett proaktivt träningsval, inte ett passivt misslyckande
- Undvik att överbetona diagnosen — fokusera på anpassningar som en del av smart coaching

### Praktisk logistik
- Toalettillgång: #1 praktiska barriären. Planera "nav-och-eker"-rutter med korta loopar
- Gymval: Välj anläggningar med tillgängliga, rena toaletter
- Nödkit: Våtservetter, ombyte, elektrolyter ger trygghet vid längre pass utomhus

## 5. RÖDA FLAGGOR & MEDICINSKA GRÄNSER

### Symtom som kräver omedelbar träningsavslutning
- GI: Ny eller ökad rektalblödning, svår buksmärta som förvärras vid rörelse, ihållande kräkningar
- Systemiskt: Feber (>38°C), nattsvettningar, oförklarad viktnedgång (>5% av kroppsvikt)
- Neurologiskt/kardiellt: Svimning, extrem yrsel, bröstsmärta, oproportionerlig andfåddhet

### Medicin-träningsinteraktioner
- Biologiska: Inom 24 timmar efter infusion (Infliximab) finns ökad risk — intensiv träning är kontraindicerad
- Kortikosteroider: Kronisk användning ökar risken för avaskulär nekros och stressfrakturer. DXA-screening var 2-3 år
- Immunosuppressiva: Ökad infektionsrisk — hög hygienstandard, träna i ventilerade lokaler

### När gastroenterolog bör konsulteras
- Symtom normaliseras inte inom 48 timmar efter belastningssänkning
- Ihållande förhöjd vilopuls eller sänkt HRV som inte normaliseras med vila
- Innan nya ergogena tillskott påbörjas (kreatin, höga doser NSAIDs som ibuprofen — ofta kontraindicerade vid IBD)

## 6. EVIDENSBAS

### Nyckelstudier
- Karolinska Institutet HIIT Trials (2022-2024): HIIT är säkert och förbättrar VO2peak signifikant mer än måttlig träning vid inflammatorisk sjukdom
- Blackwell et al. (2023) RCT: HIIT-intervaller ledde till 20% reduktion i sjukdomsaktivitet (CDAI)
- PREHAB Crohn Study: Högprotein (1.5-1.8 g/kg) + övervakad träning före kirurgi förbättrar postoperativ återhämtning
- Wiroth et al.: CD-patienter har lägre kraftproduktion men behåller samma relativa förmåga att anpassa sig till träning som friska individer

### Forskningsgap
- Kvinnospecifik RED-S-data: Forskning om hur IBD-relaterad malabsorption accelererar Female Athlete Triad saknas
- Mikrobiomsanpassning: Specifika "träningsresponsiva" bakteriestammar som stödjer remission identifieras fortfarande
- Ultradistanssäkerhet: Långtidsdata för maratonlöpare och triatleter med IBD begränsat till fallrapporter

### Expertsamförstånd
Risken med inaktivitet överväger avsevärt risken med strukturerad aktivitet för Crohn-patienter. Med en "begränsningsstyrd" approach till träning och "malabsorptionsmedveten" approach till näring kan atleter med Crohns sjukdom inte bara delta i sport utan utmärka sig på högsta nivåer.
`

export const CROHNS_KNOWLEDGE_CONTENT_EN = `
# Training & Nutrition for Athletes with Inflammatory Bowel Disease - Evidence-Based Coaching Guide

## 1. Physiological Impact on Training

### Energy metabolism and oxygen uptake
Athletes with IBD can have reduced energy availability because of small-intestine malabsorption and the increased metabolic cost of chronic inflammation. The small intestine absorbs the macro- and micronutrients that support the citric acid cycle and electron transport chain. When the gut barrier is compromised, carbohydrate and fat oxidation can become less efficient, which may lead to an earlier shift toward anaerobic glycolysis.

Cardiorespiratory fitness can be lower in IBD populations because of fatigue and systemic inflammation, even during remission. Trials using high-intensity interval training show that VO2peak can still improve meaningfully, which suggests that the cardiovascular system keeps strong adaptive potential when the stimulus is timed well.

### Muscle recovery and adaptation
IBD-related sarcopenia, lower skeletal muscle index, and reduced muscle quality are driven partly by systemic cytokines that interfere with mTOR signaling. Chronic inflammation combined with protein-energy malnutrition can delay recovery after hard endurance or strength training.

Training can also have anti-inflammatory effects. Muscle contractions release myokines, especially IL-6 in an exercise context, that stimulate IL-10 and IL-1ra while reducing TNF-alpha. This exercise-induced anti-inflammatory cascade may support gut mucosa and reduce symptomatic flare frequency when load is appropriate.

### Inflammatory markers and training effects
- TNF-alpha: key driver of gut inflammation that may be inhibited by muscle-derived IL-6 during training.
- IL-6: systemic inflammatory marker that is transiently modulated by exercise.
- IL-10: anti-inflammatory cytokine that increases after structured training.
- CRP: systemic inflammatory-load marker that can decrease with regular activity.
- Fecal calprotectin: local gut inflammation marker that is usually stable or lower with moderate activity.

### Fatigue management
Distinguish training-related fatigue from disease-related fatigue. Training fatigue is usually local to working muscles and improves with standard recovery in 24-48 hours. IBD-related fatigue can be multidimensional, with psychological, central, and peripheral components, and it does not always correlate neatly with inflammatory markers.

During flares, the athlete may experience pain-related insomnia, urgency-related sleep loss, and a marked drop in power production. During remission, performance can approach healthy peers, but recovery needs to be monitored more carefully.

### Iron deficiency, thermoregulation, and hydration
Iron deficiency is a serious complication for IBD athletes, caused by occult blood loss, malabsorption, and inflammation-blocked iron utilization. Low ferritin and hemoglobin reduce oxygen transport capacity, increasing heart rate and lactate accumulation at lower workloads.

Chronic diarrhea and malabsorption can create baseline dehydration, reducing plasma volume and sweat response. A 2% loss of total body water can raise core temperature and heart rate enough to reduce maximal work capacity. Proactive scheduled hydration is safer than relying on thirst alone.

## 2. Training Adaptation and Programming

### Intensity guidelines by inflammation status
During remission:
- Aerobic work: 3-5 days per week, 20-60 minutes at roughly 60-85% VO2max or HRmax.
- Strength training: 2-3 times per week, usually 60-80% of 1RM.
- HIIT intervals are often tolerated and may produce stronger fitness gains than moderate continuous training.

During an active flare:
- Focus on low-intensity movement in Zone 1, such as walking or gentle swimming.
- Prioritize mobility, relaxation, and recovery.
- Reduce high mechanical-load training until symptoms stabilize.

### ACWR adjustments for IBD athletes
ACWR can guide load management:
- Below 0.8: detraining/recovery range. Appropriate during flares, but a detraining risk during stable periods.
- 0.8-1.3: optimal sweet spot for building fitness while limiting flare and injury risk.
- 1.3-1.5: overload range. Monitor IBD symptoms closely and prioritize sleep.
- Above 1.5: danger zone with higher risk of injury or symptom aggravation.

When returning from a flare, chronic load is often reduced. Use gradual progression rather than trying to catch up quickly.

### Polarized training adaptation
- Low intensity: keep strictly in Zone 1-2 to preserve gut blood flow and keep systemic stress low.
- High intensity: short HIIT intervals can be better tolerated than sustained threshold work because recovery intervals limit prolonged intestinal ischemia.
- Threshold warning: long efforts near lactate threshold may reduce mesenteric blood flow and trigger GI symptoms.

### Recovery and IBD-specific readiness
- Sleep quality is the primary defense against IBD-related fatigue.
- Stress management through mindfulness, breathing, or yoga can improve performance through the gut-brain axis.
- Strength-training rest periods of 2-3 minutes are often appropriate to manage central fatigue.
- Monitor stool quality, nocturnal urgency, abdominal pain, and subjective fatigue alongside HRV and sleep.
- Pain above 3/10 during training should pause or modify the session.

### Medication periodization
- Biologics such as infliximab or adalimumab can create systemic fatigue 24-48 hours after infusion. Schedule hard sessions during the best part of the medication cycle when possible.
- Corticosteroids increase tendon and bone risk. Use higher repetitions, lower load, and avoid aggressive plyometrics.
- Immunosuppressants increase infection risk. Prefer well-ventilated environments and strong hygiene routines.

### Strength training for bone density
Low bone density is common in Crohn's disease, making strength training an important part of care:
- Multi-joint loading such as squats, lunges, and deadlifts stimulates bone adaptation.
- Trunk and pelvic-floor stability can support pelvic control and confidence.
- Bands and low-joint-load options can preserve muscle during periods of peripheral arthritis.

## 3. Nutrition Strategy

### Macronutrients
- Protein: about 1.2-1.5 g/kg during remission, and 1.8-2.0 g/kg during recovery from a flare. Whey can work well, but lactose-free or plant isolates are often better tolerated during symptoms.
- Carbohydrates: use lower-fiber, higher-glucose or maltodextrin sources before training. Limit fructose if malabsorption is suspected.
- Fat: omega-3-rich foods may support an anti-inflammatory pattern. Avoid high-fat meals immediately before and during training.

### Common micronutrient risks
- Vitamin B12: higher risk with ileal disease or surgery. Sublingual or injected forms may be needed.
- Iron: higher risk with active bleeding. Pair with vitamin C and avoid taking it with dairy.
- Vitamin D: higher risk with corticosteroids. Supplement to clinician-guided targets.
- Zinc, calcium, and magnesium losses can increase with diarrhea, lactose intolerance, steroid exposure, or reduced intake.

### Meal timing and hydration
- Pre-training: low-fiber carbohydrate about 60 minutes before training.
- During training longer than 60 minutes: liquid carbohydrate at 5-8% concentration or low-fructose gels, taken in small regular doses.
- Post-training: a blended recovery option with whey or pea protein and banana can reduce digestive load.
- Use electrolytes or oral rehydration strategies during flares or heavy sweating.

### Anti-inflammatory nutrition patterns
- Mediterranean-style eating has the strongest long-term health evidence when fiber is tolerated.
- Crohn's Disease Exclusion Diet can reduce specific additives and problematic fibers under professional guidance.
- Specific Carbohydrate Diet can help some people, but athletes must watch for unintended weight loss and low energy availability.

## 4. Psychological and Practical Coaching

### Communication principles
- Use empowering language: "your body is prioritizing internal healing, so we adapt the training focus to support that process."
- Focus on what the athlete can do today.
- Be honest when holding back is necessary for long-term progress.
- Frame rest as a proactive training choice, not a failure.
- Avoid overemphasizing the diagnosis; focus on individualized coaching adjustments.

### Practical logistics
- Bathroom access is often the main barrier. Plan looped routes with short options.
- Choose gyms and training venues with clean accessible bathrooms.
- A small emergency kit with wipes, clothes, and electrolytes increases confidence for longer sessions.

## 5. Red Flags and Medical Boundaries

Stop training and seek medical guidance for:
- New or increased rectal bleeding, severe abdominal pain, or persistent vomiting.
- Fever, night sweats, or unexplained weight loss.
- Fainting, severe dizziness, chest pain, or disproportionate breathlessness.

Consult a gastroenterologist when:
- Symptoms do not normalize within 48 hours after reducing load.
- Resting heart rate stays elevated or HRV stays suppressed despite rest.
- The athlete plans new ergogenic supplements or NSAID use.

## 6. Evidence Base

Key themes from current evidence:
- HIIT can be safe and effective in inflammatory disease when symptoms are stable and load is controlled.
- Higher protein plus supervised exercise can support surgical preparation and recovery.
- Crohn's patients may have lower absolute power but can still adapt to training.
- Research gaps remain for female-specific RED-S interaction, microbiome responses, and long-distance endurance safety.

Expert consensus: the risk of inactivity is usually greater than the risk of structured activity when the athlete is monitored. With constraint-led training and malabsorption-aware nutrition, athletes with Crohn's disease can participate meaningfully and, in some cases, perform at high levels.
`

/**
 * Short AI instruction text for the athlete's Client.aiInstructions field.
 * Discreet, coaching-focused — does not over-emphasize the diagnosis.
 */
export const CROHNS_AI_INSTRUCTIONS = `Denna atlet har en kronisk inflammatorisk tarmsjukdom (IBD/Crohns sjukdom).

VIKTIGA ANPASSNINGAR:
- Anpassa alltid näringråd för GI-känslighet: lågfiber före träning, undvik fruktos, prioritera antiinflammatorisk kost
- Var uppmärksam på järnbrist/anemi-symtom (ökad trötthet, hög puls vid låg belastning)
- Vid tecken på skov (ökad trötthet, GI-besvär, nattlig urgency): rekommendera sänkt intensitet till Zon 1-2
- ACWR-trösklar bör vara mer konservativa (flagga redan vid >1.3)
- Biologisk medicinering kan ge trötthet 24-48h efter infusion — planera inte intensiva pass då
- Styrketräning för bentäthet är extra viktigt (kortisonrisk)
- Hydrering behöver extra uppmärksamhet — rekommendera elektrolytlösningar

KOMMUNIKATION:
- Fokusera på anpassningar och smarta val, inte på diagnosen
- Undvik att ständigt nämna sjukdomen — behandla anpassningarna som en naturlig del av individualiserad coaching
- Använd positiv inramning: "vi optimerar din näringsplan" istället för "du behöver specialkost pga din sjukdom"
- Vid behov av medicinsk rådgivning → hänvisa till gastroenterolog`

export const CROHNS_AI_INSTRUCTIONS_EN = `This athlete has chronic inflammatory bowel disease (IBD/Crohn's disease).

IMPORTANT ADAPTATIONS:
- Adapt nutrition advice for GI sensitivity: lower fiber before training, avoid fructose if poorly tolerated, prioritize anti-inflammatory eating patterns
- Watch for signs of iron deficiency or anemia, such as unusual fatigue or high heart rate at low workloads
- During possible flare signals such as increased fatigue, GI symptoms, or nocturnal urgency, recommend reducing intensity to Zone 1-2
- Use more conservative ACWR thresholds and flag caution earlier, around >1.3
- Biologic medication can cause fatigue for 24-48 hours after infusion; avoid planning hard sessions then
- Strength training for bone density is especially important, particularly with corticosteroid exposure
- Hydration needs extra attention; recommend electrolytes or oral rehydration strategies when appropriate

COMMUNICATION:
- Focus on adaptations and smart choices, not the diagnosis
- Avoid repeatedly mentioning the disease; treat adjustments as a normal part of individualized coaching
- Use positive framing such as "we are optimizing your nutrition plan" instead of "you need a special diet because of your disease"
- When medical advice is needed, refer to a gastroenterologist`
