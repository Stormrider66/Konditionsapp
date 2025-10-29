# Konditionstest Rapportgenerator

En webbaserad applikation för att automatiskt generera professionella konditionstestrapporter från fysiologiska testdata.

## Funktioner (MVP - Fas 1)

✅ **Grundläggande formulär för datainmatning**
- Flexibel inmatning av testdata (hastighet/watt, puls, laktat, VO2)
- Stöd för löptester och cykeltester
- Validering med Zod och React Hook Form

✅ **Beräkningsmotor**
- BMI-beräkning
- Aerob tröskel (≈2 mmol/L laktat)
- Anaerob tröskel (≈4 mmol/L laktat)
- VO2max identifiering
- Garmin träningszoner (5 zoner)
- Löpekonomi för löptester

✅ **Diagram och visualisering**
- Interaktivt diagram med Recharts
- Puls och laktat mot hastighet/watt
- Responsiv design

✅ **HTML-rapportgenerering**
- Professionell rapportmall
- Klientinformation
- Testresultat och tröskelvärden
- Träningszoner
- Utskriftsvänlig layout

## Tech Stack

- **Frontend:** Next.js 15 med App Router
- **Språk:** TypeScript
- **Styling:** Tailwind CSS
- **Diagram:** Recharts
- **Formulär:** React Hook Form + Zod
- **Datum:** date-fns

## Installation

```bash
# Installera dependencies
npm install

# Starta development server
npm run dev

# Öppna i webbläsaren
http://localhost:3000
```

## Användning

1. Navigera till `/test` för att skapa ett nytt konditionstest
2. Fyll i testdata steg för steg:
   - Hastighet/effekt
   - Puls
   - Laktat
   - VO2 (valfritt)
3. Klicka på "Generera Rapport"
4. Rapporten genereras automatiskt med alla beräkningar
5. Skriv ut eller spara som PDF via webbläsarens utskriftsfunktion

## Projektstruktur

```
konditionstest-app/
├── app/                    # Next.js App Router
│   ├── test/              # Testsida
│   ├── globals.css        # Global styling
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Startsida
├── components/            # React komponenter
│   ├── forms/            # Formulärkomponenter
│   ├── charts/           # Diagramkomponenter
│   └── reports/          # Rapportmallar
├── lib/                   # Utilities och logik
│   ├── calculations/     # Beräkningsmotorn
│   └── validations/      # Zod schemas
└── types/                # TypeScript types
```

## Beräkningslogik

### Tröskelvärden
- **Aerob tröskel:** Interpolerar värden runt 2 mmol/L laktat
- **Anaerob tröskel:** Interpolerar värden runt 4 mmol/L laktat (andra övergången)

### Träningszoner (Garmin 5-zons modell)
- Zon 1: 50-60% av max puls (Återhämtning)
- Zon 2: 60-70% av max puls (Grundkondition)
- Zon 3: 70-80% av max puls (Aerob kapacitet)
- Zon 4: 80-90% av max puls (Anaerob tröskel)
- Zon 5: 90-100% av max puls (VO₂max)

### Löpekonomi
- Beräknas som: (VO2 × 60) / hastighet = ml/kg/km
- Bedömning baseras på kön och värde

## Kommande funktioner (Fas 2-4)

- Databas integration (Supabase)
- Klientregister
- PDF-export
- Historisk jämförelse
- Användarhantering
- Anpassningsbara rapportmallar

## Licens

Proprietär - Star by Thomson
