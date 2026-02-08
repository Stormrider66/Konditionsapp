// lib/info-content.ts
// Central content store for concept definitions used by InfoTooltip and AI chat context

export type UserRole = 'COACH' | 'ATHLETE' | 'PHYSIO' | 'ADMIN'

export interface InfoEntry {
  key: string
  title: string        // Swedish title
  short: string        // 1-liner for popover
  detailed: string     // Full paragraph for "Läs mer" / AI context
  roles: UserRole[]    // Empty = all roles
  tier: 1 | 2 | 3
}

export const INFO_CONTENT: Record<string, InfoEntry> = {
  // ============ TIER 1 - Core concepts (18) ============
  acwr: {
    key: 'acwr',
    title: 'ACWR (Akut:Kronisk Belastningskvot)',
    short: 'Förhållandet mellan din senaste veckans träningsbelastning och genomsnittet över 4 veckor.',
    detailed: 'ACWR (Acute:Chronic Workload Ratio) jämför din akuta belastning (senaste 7 dagarna) med din kroniska belastning (28-dagars rullande medelvärde). Ett värde mellan 0.8–1.3 anses optimalt. Under 0.8 innebär underträning, över 1.5 innebär kraftigt ökad skaderisk. Beräknas med exponentiellt viktat glidande medelvärde (EWMA) för bättre precision.',
    roles: [],
    tier: 1,
  },
  dmax: {
    key: 'dmax',
    title: 'D-max (Tröskeldetektering)',
    short: 'Matematisk metod för att hitta din anaeroba tröskel från laktattestdata.',
    detailed: 'D-max-metoden identifierar den anaeroba tröskeln genom att hitta den punkt på laktatkurvan som har störst avstånd från en rät linje mellan kurvans start- och slutpunkt. Modified D-max (Bishop) använder 1 mmol/L-ökning som startpunkt istället. Smart D-max väljer automatiskt bästa metoden baserat på dina testdata.',
    roles: ['COACH', 'PHYSIO'],
    tier: 1,
  },
  trainingZones: {
    key: 'trainingZones',
    title: 'Träningszoner',
    short: 'Intensitetszoner baserade på dina tröskelvärdena – styr hur hårt du ska träna.',
    detailed: 'Träningszoner beräknas från dina testresultat (laktattröskel, VO2max, hjärtfrekvens). Typiskt 5–7 zoner från lätt aerob (zon 1) till maximal intensitet (zon 5+). Zonerna hjälper dig träna med rätt intensitet för önskat fysiologiskt stimulus. Varje metodik (polariserad, norsk, Canova, pyramidal) fördelar träningstid mellan zonerna olika.',
    roles: [],
    tier: 1,
  },
  readiness: {
    key: 'readiness',
    title: 'Beredskap',
    short: 'Ett samlat mått (0–100) på hur redo din kropp är för träning idag.',
    detailed: 'Beredskapspoängen kombinerar flera faktorer: sömnkvalitet, vilopuls (RHR), hjärtfrekvensvariabilitet (HRV), subjektiv energinivå, muskelömhet och stressnivå. Poäng över 70 indikerar god förmåga att hantera hög belastning. Under 40 rekommenderas vila eller lätt träning. Trenden över tid är viktigare än enskilda värden.',
    roles: [],
    tier: 1,
  },
  hrv: {
    key: 'hrv',
    title: 'HRV (Hjärtfrekvensvariabilitet)',
    short: 'Variationen i tid mellan dina hjärtslag – indikerar återhämtning och stressnivå.',
    detailed: 'HRV mäter millisekundvariationen mellan hjärtslag (RMSSD). Högre HRV indikerar bättre återhämtning och parasympatisk aktivitet. Trender analyseras som 7-dagars rullande medelvärde. En plötslig minskning (>1 standardavvikelse under baslinjen) kan signalera överträning, sjukdom eller otillräcklig återhämtning. Mät alltid vid samma tidpunkt (morgon, liggande).',
    roles: [],
    tier: 1,
  },
  oneRM: {
    key: 'oneRM',
    title: '1RM (En Repetitions Maximum)',
    short: 'Den maximala vikt du kan lyfta en enda gång med korrekt teknik.',
    detailed: '1RM beräknas via submaximal testning med formler som Epley (vikt × (1 + reps/30)) eller Brzycki. Används för att sätta träningsintensitet i procent av 1RM: t.ex. 70% för hypertrofi, 85%+ för maxstyrka. VBT (Velocity Based Training) kan ge mer precisa estimat genom att mäta stånghastighet vid olika belastningar.',
    roles: [],
    tier: 1,
  },
  twoForTwo: {
    key: 'twoForTwo',
    title: '2-för-2-regeln',
    short: 'Progressionsregel: öka vikten när du klarar 2 extra reps i sista setet, 2 träningar i rad.',
    detailed: '2-för-2-regeln är en evidensbaserad progressionsmetod för styrketräning. Om du klarar 2 eller fler repetitioner utöver målreps i ditt sista set, två träningspass i följd, ökar du belastningen nästa pass. Typisk ökning: 2.5–5 kg för överkropp, 5–10 kg för underkropp. Systemet förhindrar för snabb progression som ökar skaderisken.',
    roles: [],
    tier: 1,
  },
  rpe: {
    key: 'rpe',
    title: 'RPE (Upplevd ansträngning)',
    short: 'Skala 1–10 för hur ansträngande du upplevde passet eller setet.',
    detailed: 'RPE (Rate of Perceived Exertion) är en subjektiv skala: RPE 6 = kunde gjort 4 reps till, RPE 8 = kunde gjort 2 reps till, RPE 10 = maximalt. Session-RPE (1–10) multiplicerat med passvaraktighet ger träningsbelastning (sRPE). RPE används för att autoregulera träning – om RPE är oväntat högt kan det indikera bristande återhämtning.',
    roles: [],
    tier: 1,
  },
  tss: {
    key: 'tss',
    title: 'TSS (Träningsbelastningspoäng)',
    short: 'Ett standardiserat mått på det totala stresset ett träningspass ger din kropp.',
    detailed: 'TSS (Training Stress Score) kombinerar intensitet och varaktighet till ett enda tal. TSS 100 = ett maxtest på 1 timme. Beräknas från hjärtfrekvens, puls eller RPE beroende på datatyp. Vecko-TSS under 300 är lågt, 300–500 moderat, 500–700 högt, över 700 mycket högt. Plötsliga ökningar >30% vecka till vecka ökar skaderisken.',
    roles: [],
    tier: 1,
  },
  vo2max: {
    key: 'vo2max',
    title: 'VO2max (Maximal syreupptagning)',
    short: 'Det maximala mängden syre din kropp kan använda – det bästa måttet på uthållighet.',
    detailed: 'VO2max mäts i ml/kg/min och är den starkaste prediktorn för uthållighetsprestanda. Mäts via progressivt arbetstest till utmattning med gasanalys. Elitlöpare: 70–85+ ml/kg/min, motionärer: 35–50. Förbättras med strukturerad uthållighetsträning, särskilt intervallträning nära VO2max-intensitet (90–100% av max).',
    roles: [],
    tier: 1,
  },
  criticalPower: {
    key: 'criticalPower',
    title: 'Kritisk Effekt (CP) / FTP',
    short: 'Den högsta effekt (watt) du kan hålla uthålligt – gränsen för aerob kapacitet.',
    detailed: 'Critical Power (CP) är den asymptotiska effekten i power-duration-modellen – den högsta effektnivån som kan upprätthållas utan progressiv trötthet. FTP (Functional Threshold Power) är det praktiska estimatet: ~95% av 20-min maxtest. W\' (W-prime) är den anaeroba kapaciteten ovanför CP, mätt i kJ. Tillsammans bestämmer CP och W\' din prestation på alla varaktigheter.',
    roles: [],
    tier: 1,
  },
  periodization: {
    key: 'periodization',
    title: 'Periodisering',
    short: 'Systematisk planering av träningen i faser för att nå toppform vid rätt tidpunkt.',
    detailed: 'Periodisering delar in årets träning i makrocykler (månader), mesocykler (veckor) och mikrocykler (dagar). Faserna inkluderar: Grundperiod (bas aerob kapacitet), Uppbyggnadsperiod (ökad intensitet), Tävlingsperiod (specifik skärpa), och Återhämtningsperiod (deload). Varje fas har specifika mål för volym, intensitet och frekvens.',
    roles: [],
    tier: 1,
  },
  methodologies: {
    key: 'methodologies',
    title: 'Träningsmetodiker',
    short: 'Olika vetenskapliga ansatser för att fördela träningsintensiteten: polariserad, norsk, pyramidal, Canova.',
    detailed: 'Polariserad (80/20): ~80% låg intensitet, ~20% hög intensitet, lite i mellanzonen. Norsk (dubbeltröskel): Fokus på tröskelintervaller (4×16 min vid laktattröskel). Canova (maraton-specifik): Procentbaserad på målmaraton-tempo. Pyramidal: Mest låg intensitet, minskande volym vid ökad intensitet. Valet beror på sport, nivå och tävlingsmål.',
    roles: ['COACH'],
    tier: 1,
  },
  vdot: {
    key: 'vdot',
    title: 'VDOT',
    short: 'Jack Daniels löparindex som beräknar din kapacitetsnivå och optimala träningsfarter.',
    detailed: 'VDOT är ett index (30–85) som baseras på din bästa tävlingstid. Från VDOT beräknas träningsfarter: Easy (E), Marathon (M), Threshold (T), Interval (I) och Repetition (R). T.ex. VDOT 50 ger 5K på ~20:46, E-tempo ~5:30/km, T-tempo ~4:33/km, I-tempo ~4:08/km. Högre VDOT = bättre löpkapacitet.',
    roles: [],
    tier: 1,
  },
  rehabPhases: {
    key: 'rehabPhases',
    title: 'Rehabiliteringsfaser',
    short: 'Skadebehandling delas in i 5 faser från akut vård till return-to-sport.',
    detailed: 'Fas 1 AKUT: Smärtkontroll, skydd, optimal belastning (POLICE). Fas 2 SUBAKUT: Gradvis rörelseåterställning, isometrisk styrka. Fas 3 REMODELLERING: Progressiv belastning, funktionell styrka. Fas 4 FUNKTIONELL: Sportspecifika rörelser, plyometri. Fas 5 RETURN-TO-SPORT: Full träning, psykologisk beredskap, klara testbatterier. Varje fas har specifika kriterier för progression.',
    roles: ['COACH', 'PHYSIO'],
    tier: 1,
  },
  soapNotes: {
    key: 'soapNotes',
    title: 'SOAP-anteckningar',
    short: 'Standardformat för klinisk dokumentation: Subjektivt, Objektivt, Analys, Plan.',
    detailed: 'S (Subjektivt): Patientens egna upplevelser, symtom, smärtbeskrivning. O (Objektivt): Mätbara fynd – ROM, styrketester, palpation, specialtester. A (Analys): Klinisk bedömning, diagnos, orsaksanalys. P (Plan): Behandlingsplan, övningar, frekvens, mål, kriterier för progression. SOAP säkerställer konsekvent och komplett dokumentation.',
    roles: ['PHYSIO'],
    tier: 1,
  },
  delawarePain: {
    key: 'delawarePain',
    title: 'Delaware-smärtregler',
    short: 'Protokoll för att bedöma om smärta under träning är acceptabel eller kräver anpassning.',
    detailed: 'Delaware-smärtreglerna klassificerar smärta 0–10: 0–2 = Acceptabel, träna normalt. 3–4 = Modifiera aktivitet, minska intensitet. 5–6 = Signifikant, byt till alternativ aktivitet. 7+ = Stoppa och konsultera. Dessutom: smärta som ökar under aktivitet eller kvarstår >24h efter träning kräver anpassning oavsett initial nivå.',
    roles: ['COACH', 'PHYSIO', 'ATHLETE'],
    tier: 1,
  },
  wattsPerKg: {
    key: 'wattsPerKg',
    title: 'Watt per Kilo (W/kg)',
    short: 'Din effekt i förhållande till kroppsvikt – avgörande för prestanda i backar.',
    detailed: 'W/kg = FTP (eller CP) delat med kroppsvikt. Världsklasscyklister: 6.0+ W/kg, amatörer: 2.5–4.0. W/kg är det mest relevanta måttet för klättringsprestanda och för att jämföra cyklister oavsett kroppsvikt. En ökning på 0.1 W/kg kan ge ~30 sekunders skillnad per km uppförsbacke.',
    roles: [],
    tier: 1,
  },

  // ============ TIER 2 - Extended concepts (14) ============
  wodFormats: {
    key: 'wodFormats',
    title: 'WOD-format',
    short: 'Olika passstrukturer: AMRAP, EMOM, For Time, Chipper, Tabata med mera.',
    detailed: 'AMRAP (As Many Rounds As Possible): Max antal rundor på en viss tid. EMOM (Every Minute On the Minute): Utför uppgiften varje minut. For Time: Slutför allt så fort som möjligt. Chipper: Lång lista övningar, en gång igenom. Tabata: 20s arbete / 10s vila × 8. Varje format ger olika metaboliskt stimulus och är lämpligt för olika träningsmål.',
    roles: [],
    tier: 2,
  },
  strengthPhases: {
    key: 'strengthPhases',
    title: 'Styrketräningsfaser',
    short: '5 faser: anatomisk anpassning → hypertrofi → maxstyrka → kraft/power → underhåll.',
    detailed: 'Fas 1 Anatomisk anpassning: Höga reps (12–15), lägre vikt, grundteknik. Fas 2 Hypertrofi: 8–12 reps, 65–75% 1RM, muskeluppbyggnad. Fas 3 Maxstyrka: 3–6 reps, 80–90% 1RM, neurala anpassningar. Fas 4 Kraft/Power: 1–5 reps explosivt, 30–60% 1RM, maximal hastighet. Fas 5 Underhåll: 2×/vecka, 3–6 reps vid 80% 1RM. Varje fas varar 3–6 veckor.',
    roles: [],
    tier: 2,
  },
  interferenceWarnings: {
    key: 'interferenceWarnings',
    title: 'Interferensvarningar',
    short: 'När uthållighets- och styrketräning krockar och hämmar varandras effekt.',
    detailed: 'Interferenseffekten uppstår främst när uthållighetspas görs nära styrkepass. AMPK-aktivering (uthållighet) hämmar mTOR-signalering (hypertrofi). Rekommendationer: Minst 6–8 timmar mellan pass. Styrka före uthållighet om samma dag. Undvik högvolym löpning samma dag som benträning. Cykling har lägre interferens än löpning.',
    roles: ['COACH'],
    tier: 2,
  },
  crossTraining: {
    key: 'crossTraining',
    title: 'Cross-training',
    short: 'Träning i en annan modalitet för att bibehålla fitness vid skada eller variation.',
    detailed: 'Cross-training använder modalities-ekvivalenser: 1 min löpning ≈ 1.2 min cykling ≈ 1.0 min simning (anpassat för intensitet). Bevarar aerob kapacitet vid skada – du kan behålla ~90% av VO2max med alternativ träning i 4–6 veckor. Vattenjogging, roddmaskin och crosstrainer är effektiva substitut vid löparskador.',
    roles: [],
    tier: 2,
  },
  benchmarkTiers: {
    key: 'benchmarkTiers',
    title: 'Prestandanivåer',
    short: 'Klassificering av prestanda: nybörjare, motionär, avancerad, elit, världsklass.',
    detailed: 'Nivåerna baseras på sportspecifika referensvärden. Löpning 5K: Nybörjare >30 min, Motionär 22–30 min, Avancerad 18–22 min, Elit 14–18 min, Världsklass <14 min. Cykling FTP: Nybörjare <2 W/kg, Motionär 2–3, Avancerad 3–4, Elit 4.5–5.5, Världsklass 6+. Nivåerna hjälper att sätta realistiska mål och jämföra med peers.',
    roles: [],
    tier: 2,
  },
  detraining: {
    key: 'detraining',
    title: 'Avträning (Detraining)',
    short: 'Förlust av träningsanpassningar vid uppehåll – olika system tappar olika snabbt.',
    detailed: 'VO2max minskar ~7% efter 2 veckor, ~14% efter 4 veckor utan träning. Styrka bibehålls bättre: ~5% förlust efter 3 veckor. Plasma-volym minskar inom dagar. Enzymatisk kapacitet (mitokondrier) halveras på ~4 veckor. Minimum underhåll: 2 pass/vecka vid >70% intensitet bevarar ~90% av anpassningarna i upp till 12 veckor.',
    roles: [],
    tier: 2,
  },
  aiModels: {
    key: 'aiModels',
    title: 'AI-modeller',
    short: 'Plattformen stöder flera AI-leverantörer: Claude (Anthropic), Gemini (Google), GPT (OpenAI).',
    detailed: 'Varje AI-modell har styrkor: Claude är bra på nyanserade träningsråd och svenska. Gemini har multimodal kapacitet (video, bild). GPT-4 har bred kunskap. Coaches kan konfigurera vilken modell som används. BYOK (Bring Your Own Key) stöds. Token-budgetar nollställs dagligen. Atleters chattar använder coachens AI-nycklar.',
    roles: ['COACH'],
    tier: 2,
  },
  ragDocuments: {
    key: 'ragDocuments',
    title: 'Kunskapsdokument (RAG)',
    short: 'Ladda upp egna dokument som AI:n kan söka i och referera till i sina svar.',
    detailed: 'RAG (Retrieval-Augmented Generation) låter dig ladda upp PDF:er, artiklar och protokoll. Dokumenten delas upp i segment som vektoriseras (pgvector). När du ställer en fråga söker AI:n först bland dina dokument för relevanta avsnitt, sedan genererar svaret med den kontexten. Ger mer precisa, anpassade svar baserade på din kunskapsbank.',
    roles: ['COACH'],
    tier: 2,
  },
  coachAlerts: {
    key: 'coachAlerts',
    title: 'Coachvarningar',
    short: 'Automatiska notiser om atleter som behöver uppmärksamhet: skadevarningar, missade pass, avvikande data.',
    detailed: 'Systemet genererar varningar baserat på: ACWR utanför optimal zon, HRV-avvikelse >1 SD, missade check-ins 3+ dagar, smärtrapporter >4/10, stora TSS-ökningar (>30%), delawareregelbrott. Varningarna prioriteras som LÅG/MEDEL/HÖG/KRITISK och visas på coachens dashboard med rekommenderade åtgärder.',
    roles: ['COACH'],
    tier: 2,
  },
  videoAnalysisScores: {
    key: 'videoAnalysisScores',
    title: 'Videoanalyspoäng',
    short: 'AI-bedömd teknikpoäng (0–100) från automatisk videoanalys av rörelsemönster.',
    detailed: 'Videoanalys använder MediaPipe för pose-detektering och Gemini för tolkning. Poängen (0–100) baseras på ledvinklar, symmetri, rörelsekvalitet och sportspecifika kriterier. Löpning bedömer: stegfrekvens, fotisättning, höftextension, armföring. Identifierar tekniska brister med konkreta förbättringsförslag.',
    roles: ['COACH'],
    tier: 2,
  },
  bodyComposition: {
    key: 'bodyComposition',
    title: 'Kroppssammansättning',
    short: 'Förhållandet mellan muskelmassa, fettmassa och andra vävnader i kroppen.',
    detailed: 'Kroppssammansättning mäts via DXA (guldstandard), bioimpedans, hudvecksmätning eller NAVY-metoden. Relevanta parametrar: Fettprocent (män elit: 6–12%, kvinnor elit: 14–20%), Fettfri massa (FFM), och Skelettmuskelindex (SMI). W/kg-optimering kräver balans: för låg fettprocent försämrar immunförvar och hormonprofil.',
    roles: [],
    tier: 2,
  },
  liveHrZones: {
    key: 'liveHrZones',
    title: 'Live-pulszoner',
    short: 'Realtidsövervakning av atleters hjärtfrekvens i förhållande till deras individuella zoner.',
    detailed: 'Live-pulszoner visar var atleten tränar just nu relativt sina individuella trösklar. Grön (zon 1–2): Aerob bas. Gul (zon 3): Tempo. Orange (zon 4): Tröskel. Röd (zon 5): VO2max. Coacher kan monitorera flera atleter simultant och identifiera om någon under- eller överbelastar sig under grupppass.',
    roles: ['COACH'],
    tier: 2,
  },
  subscriptionTiers: {
    key: 'subscriptionTiers',
    title: 'Prenumerationsnivåer',
    short: 'Funktioner låses upp baserat på prenumerationsnivå: Free, Basic, Pro, Enterprise.',
    detailed: 'Coach: FREE (1 atlet, test) → BASIC (5 atleter, AI-chatt) → PRO (50 atleter, video, RAG) → ENTERPRISE (obegränsat, API). Atlet: FREE (grundvy) → STANDARD (WOD, AI-chatt) → PRO (avancerad analys, obegränsad AI). Alla nya konton får 14 dagars provperiod på Pro-nivå.',
    roles: ['COACH'],
    tier: 2,
  },
  workoutSections: {
    key: 'workoutSections',
    title: 'Passektioner',
    short: 'Ett strukturerat pass delas in i uppvärmning, huvuddel, nedvarvning och tillbehör.',
    detailed: 'Uppvärmning: 10–15 min progressiv aktivering, mobilitet, dynamisk stretching. Huvuddel: Primärt träningsmål (styrka, intervaller, tekniktrimma). Tillbehör: Kompletterande övningar (core, prevention, svaga punkter). Nedvarvning: Gradvis sänkt intensitet, stretching, andningsövningar. Strukturen minskar skaderisk och optimerar träningseffekt.',
    roles: [],
    tier: 2,
  },

  // ============ TIER 3 - Specialized concepts (12) ============
  splitPace: {
    key: 'splitPace',
    title: 'Splitfart (Split Pace)',
    short: 'Tempo per kilometer eller per varv – visar fartfördelningen under ett lopp eller pass.',
    detailed: 'Splitfart analyseras som positiv split (långsammare avslutning), negativ split (snabbare avslutning) eller jämn split. Negativ split är oftast optimalt för distanslopp. Stor variation (>5% mellan splits) indikerar pacing-problem. Elite-löpare håller typiskt <2% variation i tempokörningar.',
    roles: [],
    tier: 3,
  },
  cadence: {
    key: 'cadence',
    title: 'Kadans',
    short: 'Steg per minut (löpning) eller pedalvarv per minut (cykling).',
    detailed: 'Löpning: Optimal kadans ~170–185 steg/min, minskar stötbelastning per steg. Under 160 ökar skaderisken. Cykling: Optimal 80–100 rpm. Låg kadans (<70) belastar knän mer. Hög kadans (>100) belastar kardiovaskulärt mer. Kadansträning förbättrar löpekonomi och minskar skaderisk.',
    roles: [],
    tier: 3,
  },
  rhrDeviation: {
    key: 'rhrDeviation',
    title: 'Vilopulsavvikelse',
    short: 'Skillnad mot din normala morgonpuls – tidig indikator på sjukdom eller överträning.',
    detailed: 'En ökning >5 slag/min över baslinjen (7-dagars medelvärde) kan indikera: sjukdom (infektion), otillräcklig återhämtning, dehydrering, eller stress. Tre dagars förhöjd vilopuls i rad bör leda till anpassad träning. Mät alltid vid samma tidpunkt, liggande, efter 2 min vila.',
    roles: [],
    tier: 3,
  },
  sleepBreakdown: {
    key: 'sleepBreakdown',
    title: 'Sömnfördelning',
    short: 'Fördelning mellan djupsömn, REM-sömn och lätt sömn under natten.',
    detailed: 'Djupsömn (20–25%): Fysisk återhämtning, tillväxthormon. REM-sömn (20–25%): Kognitiv återhämtning, minne. Lätt sömn (50–60%): Övergångsfaser. Atleter behöver 7–9 timmar totalt, med extra djupsömn efter hård träning. Alkohol minskar djupsömn drastiskt. Konsekvent läggtid förbättrar sömnkvaliteten.',
    roles: [],
    tier: 3,
  },
  checkinStreak: {
    key: 'checkinStreak',
    title: 'Check-in-streak',
    short: 'Antal dagar i rad du rapporterat morgondata (puls, sömn, beredskap).',
    detailed: 'Dagliga check-ins ger AI:n och din coach bättre beslutsunderlag. Längre streak = mer pålitliga trender och medelvärden. HRV-baslinjen kräver minst 14 dagars data. ACWR-beräkningar kräver 28 dagar. Systemet skickar påminnelser efter 2 missade dagar och justerar beredskapsberäkningarna vid datuluckor.',
    roles: [],
    tier: 3,
  },
  tokenBudget: {
    key: 'tokenBudget',
    title: 'Token-budget (AI)',
    short: 'Daglig gräns för hur mycket AI-chatt du kan använda, nollställs varje dag.',
    detailed: 'Tokens är enheten AI-modeller använder för text (~0.75 ord/token). Daglig budget beror på prenumerationsnivå. FREE: 5K tokens, STANDARD: 50K, PRO: 200K, ENTERPRISE: obegränsat. Budget nollställs kl 00:00 UTC. En typisk fråga + svar ≈ 1–3K tokens. Programgenerering kan använda 5–15K tokens.',
    roles: [],
    tier: 3,
  },
  careTeamPriority: {
    key: 'careTeamPriority',
    title: 'Vårdteam-prioritet',
    short: 'Trådbaserad kommunikation mellan fysioterapeut, coach och atlet med prioritetsnivåer.',
    detailed: 'Meddelanden i vårdteamet prioriteras: NORMAL (rutinuppdateringar), VIKTIGT (behöver svar inom 24h), BRÅDSKANDE (akut, samma dag). Fysioterapeuter kan sätta träningsrestriktioner som automatiskt integreras i atletens WOD och coachens programplanering. Alla i teamet ser restriktioner och framsteg.',
    roles: ['PHYSIO', 'COACH'],
    tier: 3,
  },
  calendarEventTypes: {
    key: 'calendarEventTypes',
    title: 'Kalendertyper',
    short: 'Olika händelsetyper i kalendern: pass, tävlingar, tester, vila, rehab.',
    detailed: 'Kalendern integrerar: Planerade pass (från program), Loggade pass (genomförda), Tävlingar (med taper-beräkning), Tester (laktat, VO2max, styrka), Vilodag (planerad), Rehabpass (från fysioterapeut), Importerade pass (Strava/Garmin). Drag-and-drop för omplanering. Färgkodade efter typ och intensitet.',
    roles: [],
    tier: 3,
  },
  exportFormats: {
    key: 'exportFormats',
    title: 'Exportformat',
    short: 'Data kan exporteras som PDF-rapporter, CSV-filer eller delbart via länk.',
    detailed: 'PDF: Fullständiga testrapporter med grafer, laktatkurvor, zontabeller. CSV: Rå data för egen analys i Excel/Google Sheets. Delbar länk: Tidsbegränsad URL för att dela resultat med extern mottagare. GDPR: Export inkluderar all persondata (dataportalitet, artikel 20). Bulk-export tillgänglig för coaches.',
    roles: [],
    tier: 3,
  },
  agentConsent: {
    key: 'agentConsent',
    title: 'AI-samtycke (GDPR)',
    short: 'Atletens samtycke krävs innan träningsdata kan skickas till extern AI-tjänst.',
    detailed: 'Enligt GDPR artikel 9 kräver behandling av hälsodata uttryckligt samtycke. Atleten måste godkänna: 1) Databehandling (träningshistorik skickas till AI), 2) Hälsodata (beredskap, skador, fysiologiska mätvärden). Samtycke kan återkallas när som helst via inställningar. Utan samtycke kan AI-chatten inte referera till atletens data.',
    roles: [],
    tier: 3,
  },
  ftp: {
    key: 'ftp',
    title: 'FTP (Functional Threshold Power)',
    short: 'Den effekt (watt) du kan hålla i ungefär en timme – ditt funktionella tröskelvärde.',
    detailed: 'FTP uppskattas vanligtvis som 95% av ett 20-minuters maxtest. Alternativt via ramptest (75% av maxeffekt) eller 2×8 min (90% av medel). FTP definierar dina träningszoner: Z1 <55%, Z2 56–75%, Z3 76–90%, Z4 91–105%, Z5 106–120%, Z6 >121%. Retest var 4–6:e vecka för att anpassa zonerna till din aktuella form.',
    roles: [],
    tier: 3,
  },
  wprime: {
    key: 'wprime',
    title: 'W\' (W-prime)',
    short: 'Din anaeroba energireserv ovanför Critical Power – mätt i kilojoule.',
    detailed: 'W\' representerar det begränsade arbetet du kan utföra ovanför din CP. Typiskt 15–25 kJ för tränade cyklister. Tömning sker vid arbete >CP, återladdning sker vid arbete <CP (exponentiellt, tau ≈ 300–600s). Strategisk användning av W\' är avgörande i tävling: intervaller, klättringar och spurter tömmer reserven.',
    roles: [],
    tier: 3,
  },
}

// Helper functions

export function getInfoEntry(key: string): InfoEntry | undefined {
  return INFO_CONTENT[key]
}

export function getInfoEntriesForRole(role: UserRole): InfoEntry[] {
  return Object.values(INFO_CONTENT).filter(
    (entry) => entry.roles.length === 0 || entry.roles.includes(role)
  )
}

export function getInfoEntriesByKeys(keys: string[]): InfoEntry[] {
  return keys
    .map((key) => INFO_CONTENT[key])
    .filter((entry): entry is InfoEntry => !!entry)
}
