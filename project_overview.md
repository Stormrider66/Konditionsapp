# Konditionstest Rapportgenerator - Projektöversikt

## Projektbeskrivning
En webbaserad applikation för att automatiskt generera professionella konditionstestrapporter från fysiologiska testdata. Appen ska hantera både löp- och cykeltester, beräkna laktattrösklar, VO2max, träningszoner och producera visuellt tilltalande rapporter.

## Affärsmål
- Reducera rapportgenereringstid från 30-60 minuter till under 1 minut
- Standardisera rapportformat och beräkningar
- Möjliggöra historisk jämförelse av testresultat
- Professionell presentation för Star by Thomson

## Målgrupp
- **Primär:** Henrik Lundholm, testledare på Star by Thomson
- **Sekundär:** Andra testledare inom organisationen
- **Slutanvändare:** Klienter som tar emot rapporterna

## Kärnfunktionalitet

### 1. Datainmatning
- Formulär för klientinformation (namn, ålder, längd, vikt)
- Flexibel inmatning av testdata (hastighet/watt, puls, laktat, VO2)
- Stöd för olika testprotokoll (löpning med/utan lutning, cykel)
- Validering av inmatad data

### 2. Automatiska beräkningar
- BMI från längd och vikt
- Laktattröskel (aerob och anaerob)
- Interpolering för tröskelvärden
- VO2max identifiering
- Löpekonomi (ml/kg/km) för löptester
- Watt/kg för cykeltester
- Garmin träningszoner (5 zoner)

### 3. Visualisering
- Interaktivt diagram för puls och laktat vs hastighet/watt
- Responsiv design för olika skärmstorlekar
- Färgkodade träningszoner

### 4. Rapportgenerering
- Professionell HTML-rapport
- PDF-export funktion
- Anpassningsbar branding (Star by Thomson)
- Automatiskt datum och testledarnamn

### 5. Datahantering
- Spara testresultat i databas
- Klientregister
- Historisk jämförelse mellan tester
- Exportera rådata

## Teknisk stack

### Frontend
- **Framework:** Next.js 14 med App Router
- **Språk:** TypeScript
- **Styling:** Tailwind CSS
- **Komponenter:** shadcn/ui
- **Diagram:** Recharts
- **Formulär:** React Hook Form + Zod
- **PDF:** React-PDF eller html2pdf

### Backend
- **API:** Next.js API Routes
- **Databas:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Autentisering:** Supabase Auth

### Deployment
- **Hosting:** Vercel
- **Databas:** Supabase
- **Domän:** Egen domän via Vercel

## Utvecklingsfaser

### Fas 1: MVP (2-3 veckor)
- [x] Projektsetup med Next.js och TypeScript
- [ ] Grundläggande formulär för datainmatning
- [ ] Beräkningsmotor för trösklar och zoner
- [ ] Enkel HTML-rapportgenerering
- [ ] Grundläggande diagram med Recharts

### Fas 2: Utökad funktionalitet (2-3 veckor)
- [ ] Databas integration med Supabase
- [ ] Klientregister
- [ ] PDF-export
- [ ] Stöd för cykeltester
- [ ] Förbättrad UI med shadcn/ui

### Fas 3: Avancerade funktioner (2-4 veckor)
- [ ] Historisk jämförelse
- [ ] Flera testledare (användarhantering)
- [ ] Anpassningsbara rapportmallar
- [ ] Export/import av data
- [ ] Mobilanpassad inmatning

### Fas 4: Optimering (1-2 veckor)
- [ ] Prestandaoptimering
- [ ] Omfattande testning
- [ ] Dokumentation
- [ ] Utbildningsmaterial

## Projektstruktur
```
konditionstest-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── clients/
│   │   ├── tests/
│   │   │   ├── new/
│   │   │   ├── [id]/
│   │   │   └── history/
│   │   └── reports/
│   ├── api/
│   │   ├── clients/
│   │   ├── tests/
│   │   └── reports/
│   └── layout.tsx
├── components/
│   ├── forms/
│   │   ├── TestDataForm.tsx
│   │   └── ClientForm.tsx
│   ├── charts/
│   │   └── TestChart.tsx
│   ├── reports/
│   │   ├── ReportTemplate.tsx
│   │   └── PDFGenerator.tsx
│   └── ui/
├── lib/
│   ├── calculations/
│   │   ├── thresholds.ts
│   │   ├── zones.ts
│   │   └── economy.ts
│   ├── validations/
│   └── utils/
├── prisma/
│   └── schema.prisma
└── types/
    └── index.ts
```

## Nästa steg
1. Läs igenom alla specifikationsfiler
2. Sätt upp utvecklingsmiljö med Next.js
3. Implementera enligt TECHNICAL_SPEC.md
4. Använd DATA_MODEL.md för databasstruktur
5. Följ CALCULATIONS.md för alla beräkningar
6. Implementera UI enligt UI_SPECIFICATION.md

## Kontaktinformation
- **Projektägare:** Henrik Lundholm
- **Organisation:** Star by Thomson
- **Testdatum för exempel:** 2025-09-02 till 2025-10-02

## Viktiga överväganden
- Alla beräkningar ska vara exakta och vetenskapligt korrekta
- Rapporterna ska se professionella ut för utskrift
- Systemet ska vara enkelt att använda även under pågående test
- Data ska vara säker och backup ska finnas
- Möjlighet att redigera rapporter manuellt innan slutlig export