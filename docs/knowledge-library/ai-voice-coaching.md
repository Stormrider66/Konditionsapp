# AI-Röstcoach / AI Live Voice Coaching

## Introduktion

AI-röstcoachen är en realtids bidirektionell röstcoaching-funktion som använder Google Gemini 3.1 Flash Live-modellen. Atleten pratar med en AI-coach under träningspasset via mikrofon och hörlurar — coachen svarar med tal, ger instruktioner, loggar set och kontrollerar passet via röstkommandon.

Funktionen stödjer alla tre träningstyper: **kondition (cardio)**, **styrka** och **hybrid/funktionell träning** (AMRAP, EMOM, FOR_TIME, TABATA, etc.).

---

## Tillgänglighet

- **Prenumerationskrav**: PRO eller ELITE atletprenumeration
- **API-nyckel**: Kräver Google API-nyckel (egen BYOK-nyckel, företagsnyckel, eller plattformsadminnyckel)
- **Webbläsarstöd**: Kräver mikrofon (getUserMedia) — fungerar i Chrome, Safari, Edge, Firefox
- **Enheter**: Fungerar på telefon, surfplatta och dator

---

## Två Användningslägen

### 1. Focus Mode (Fullskärm)
Atleten startar ett pass i Focus Mode och aktiverar röstcoachen via Radio-ikonen i headern. Coachen arbetar tillsammans med passets timer, segmentnavigering och setloggning.

### 2. Headless Mode (Garmin-kompatibelt)
Atleten trycker på Radio-ikonen på passkortets rad — en minimal flytande pille visas längst ner på skärmen. Telefonen kan läggas i fickan med hörlurar anslutna. Perfekt för användning med Garmin-klocka:
- Telefonen kör AI-coachen i fickan
- Garmin-klockan spårar HR, GPS, pace på handleden
- AI coachar via hörlurar, atleten svarar med röst
- Efter passet synkar Garmin-data tillbaka automatiskt

---

## Funktioner

### Grundläggande (alla passtyper)
- **Tvåvägsröst**: Atleten pratar, AI:n svarar med tal
- **Emotionell medvetenhet**: AI:n anpassar ton och energi baserat på atletens röst
- **Puls-integration**: Om HR-monitor är ansluten visar AI:n puls och zon i coachingen ("Du ligger på 165, perfekt för zon 4")
- **Kamerabaserad formcoaching**: Valfri — AI:n ger formtips baserat på kamerabilder
- **Transkription**: Allt som sägs sparas som text för coach-granskning
- **AI-sammanfattning**: Efter passet genereras automatiskt en sammanfattning med nyckelmoment, humör och eventuella smärt-/skadeomnämnanden
- **Coachvarning**: Om atleten nämner smärta/skada under passet skapas automatiskt en CoachAlert med HÖG allvarlighetsgrad
- **Minnesextraktion**: Viktig information (mål, preferenser, skador) sparas i atletens långtidsminne
- **Röstval**: 9 tillgängliga röster — Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Perseus, Zephyr
- **Avsluta med röst**: Atleten kan säga "avsluta coaching" eller "sluta" för att avsluta sessionen

### Röstkommandon (Gemensamma)
| Kommando | Funktion |
|----------|----------|
| "Pausa" / "Paus" | Pausar passets timer |
| "Fortsätt" / "Kör" | Återupptar passet |
| "Vad är min puls?" | Läser upp aktuell puls och zon |
| "Lättare" / "Tyngre" | Noterar intensitetspreferens |
| "Var är jag i passet?" | Läser upp nuvarande status och progress |
| "Avsluta coaching" | Avslutar röstcoachsessionen |

---

## Konditionspass (Cardio)

### Röstcoachens beteende
- Annonserar varje segment: typ, duration, zon
- Ger nedräkningar: 30 sekunder, 10 sekunder, 3-2-1
- Motiverar under hårda intervaller
- Lugnar under återhämtning och nedvarvning

### Röstkommandon
| Kommando | Funktion |
|----------|----------|
| "Hoppa över" / "Nästa segment" | Hoppar till nästa segment |
| "Förläng 30 sekunder" | Lägger till tid på aktuellt segment |
| "Klar med detta" | Markerar segment som slutfört |

---

## Styrkepass (Strength)

### Röstcoachens beteende
- Annonserar varje övning: namn, set × reps × vikt
- Loggar set via röst — atleten säger vikt och reps
- Bekräftar varje set: "Set 3 loggat — 80 kg, 8 reps. Estimerad 1RM: 98 kg. 2 set kvar."
- Påminner om vila: "Vila 90 sekunder."
- Räknar ner vila vid 30s, 10s och 3-2-1
- Annonserar nästa övning när alla set är klara

### Röstkommandon
| Kommando | Funktion |
|----------|----------|
| "80 kilo, 8 reps" | Loggar set med vikt och reps |
| "Klart, RPE 8" | Loggar set (AI frågar om vikt/reps om ej angivet) |
| "Hur många set kvar?" | Visar aktuell övningsstatus |
| "Hoppa övningen" | Går till nästa övning |
| "Klar med övningen" | Markerar övning som slutförd |
| "Starta vila" | Startar vilotimer |

---

## Hybridpass (AMRAP, EMOM, FOR_TIME, TABATA)

### Formatspecifik coaching

**AMRAP** (As Many Rounds As Possible):
- "3, 2, 1, KÖR! 12 wall balls — go!"
- Räknar rundor: "Runda 3 klar! Starta runda 4."
- Tidsuppdateringar: "6 minuter kvar", "Halvvägs!", "Sista minuten!"
- Vid tidsgräns: "Tid! Bra jobbat — X rundor klara."

**EMOM** (Every Minute On the Minute):
- "Minut 3 — 5 power cleans, go!"
- Pausstatus: "15 sekunders vila"
- "3, 2, 1 — ny minut!"

**FOR_TIME / CHIPPER**:
- Kallar aktuell rörelse och reps
- "Klart! Gå till 9 box jumps."
- "Tid! 8 minuter 23 sekunder."

**TABATA**:
- "Jobba! ...Vila! ...Runda 4 av 8."

### Röstkommandon
| Kommando | Funktion |
|----------|----------|
| "Runda klar" / "Done" | Loggar avslutad runda |
| "Hur lång tid?" | Visar elapsed/remaining tid och rundtal |

---

## Teknisk Information

### Säkerhet
- API-nycklar når aldrig webbläsaren — ett tidsbegränsat ephemeral token skapas server-side
- Token är engångs, upphör efter 30 minuter, med låst systeminstruktion och verktyg
- Fungerar med alla nyckeltyper: egen BYOK, företag, eller plattformsadmin

### Kostnadsuppskattning
- 10 minuters session: ~$0.08
- 30 minuters session: ~$0.23
- 60 minuters session: ~$0.45

### Dataspårning
Varje session spårar:
- Total duration, ljudinput/output-tid
- Uppskattad kostnad i USD
- Transkriptioner (atlet + AI)
- AI-genererad sammanfattning
- Extraherade minnen
- Smärt-/skadeflagga

### Coachvy
Coacher kan se:
- Sessionssammanfattning med nyckelmoment
- Full transkription av konversationen
- Eventuella CoachAlerts om smärta/skada nämndes
- Kostnads- och durationsdata
