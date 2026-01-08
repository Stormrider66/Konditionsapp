# Databas & Klientregister - Setup Guide

## Vad har implementerats (Fas 2)

### 1. Databas-struktur
- **Prisma schema** (`prisma/schema.prisma`) - Komplett datamodell med:
  - User, Client, Test, TestStage, Report modeller
  - Rätt relationer och index
  - PostgreSQL som databas

### 2. Mock Database (Temporär lösning)
- **Mock implementation** (`lib/db-mock.ts`) - In-memory databas för testning
- Fungerar utan riktig databas-anslutning
- Automatisk sample data (2 klienter vid start)
- Kan enkelt ersättas med riktig Prisma senare

### 3. API Endpoints
Alla endpoints implementerade enligt spec:

**Klienter:**
- `GET /api/clients` - Hämta alla klienter
- `POST /api/clients` - Skapa ny klient
- `GET /api/clients/[id]` - Hämta specifik klient med tester
- `PUT /api/clients/[id]` - Uppdatera klient
- `DELETE /api/clients/[id]` - Ta bort klient

**Tester:**
- `GET /api/tests` - Hämta alla tester (optional ?clientId filter)
- `POST /api/tests` - Skapa nytt test med stages
- `GET /api/tests/[id]` - Hämta specifikt test
- `PUT /api/tests/[id]` - Uppdatera test (för beräkningsresultat)
- `DELETE /api/tests/[id]` - Ta bort test

### 4. Klientregister UI
**Sidor:**
- `/clients` - Lista alla klienter med sök och filter
- `/clients/new` - Skapa ny klient (komplett formulär med validering)
- `/clients/[id]` - Visa klientdetaljer och testhistorik

**Features:**
- React Hook Form + Zod validering
- Sökfunktion
- Statistik (ålder, BMI, etc.)
- Testhistorik per klient
- Direkt länk till "Nytt test" för klient

### 5. Uppdaterad startsida
- Navigation till alla funktioner
- Live statistik (antal klienter, tester)
- Visuella ikoner och bättre UX

## Hur man testar (utan riktig databas)

### 1. Starta development server
```bash
cd "/mnt/d/VO2 max report/konditionstest-app"
npm run dev
```

### 2. Öppna i webbläsare
```
http://localhost:3000
```

### 3. Testa funktionalitet
1. **Startsida** - Se statistik (2 sample klienter finns redan)
2. **Klientregister** (`/clients`) - Se befintliga klienter
3. **Ny klient** - Klicka "Ny Klient" och fyll i formuläret
4. **Klientdetaljer** - Klicka på en klient för att se detaljer
5. **Nytt test** - Från klientdetaljer, klicka "Nytt Test"

### 4. Sample data
Mock-databasen innehåller redan:
- **Joakim Hällgren** - Man, 186cm, 88kg
- **Anna Svensson** - Kvinna, 170cm, 65kg

## Nästa steg: Koppla på riktig Supabase

### 1. Skapa Supabase projekt
1. Gå till https://supabase.com
2. Skapa ett nytt projekt
3. Vänta på att det provisioneras (ca 2 min)

### 2. Hämta connection strings
Från Supabase Dashboard > Project Settings > API:
- `NEXT_PUBLIC_SUPABASE_URL` - Din project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Din anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - Din service role key (hemlig!)

Från Supabase Dashboard > Project Settings > Database:
- `DATABASE_URL` - Connection string (välj "connection pooler" mode)

### 3. Uppdatera .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
```

### 4. Kör Prisma migrations
```bash
npx prisma db push
npx prisma generate
```

### 5. Ersätt mock med Prisma
I API routes, ersätt:
```typescript
// Gammalt (mock)
import { mockDb } from '@/lib/db-mock'
const clients = await mockDb.client.findMany()

// Nytt (riktig databas)
import { prisma } from '@/lib/prisma'
const clients = await prisma.client.findMany()
```

Skapa först `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 6. Uppdatera alla API routes
För varje route i `app/api/`:
1. Importera `prisma` istället för `mockDb`
2. Använd Prisma syntax (nästan identisk med mock)
3. Hantera relationer (include, select)

Exempel:
```typescript
// Mock
const client = await mockDb.client.findUnique(id)

// Prisma
const client = await prisma.client.findUnique({
  where: { id },
  include: {
    tests: {
      include: {
        testStages: true
      }
    }
  }
})
```

## Troubleshooting

### Mock databas försvinner vid server restart
- Detta är förväntat - data är in-memory
- Lösning: Använd riktig databas (Supabase)

### "Database not configured" fel
- Kontrollera att .env.local finns
- Kontrollera att miljövariabler är korrekta
- Starta om development server

### TypeScript fel
- Kör `npx prisma generate` efter schema-ändringar
- Starta om TypeScript server i VS Code

### API returnerar 500 error
- Kolla console logs för detaljer
- Verifiera att data matchar Zod schemas
- Testa med Postman/Thunder Client först

## Filstruktur

```
konditionstest-app/
├── app/
│   ├── api/
│   │   ├── clients/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PUT, DELETE)
│   │   └── tests/
│   │       ├── route.ts (GET, POST)
│   │       └── [id]/route.ts (GET, PUT, DELETE)
│   ├── clients/
│   │   ├── page.tsx (lista)
│   │   ├── new/page.tsx (skapa)
│   │   └── [id]/page.tsx (detaljer)
│   └── page.tsx (startsida med stats)
├── lib/
│   ├── db-mock.ts (temporär mock)
│   ├── supabase.ts (Supabase client)
│   └── validations/schemas.ts (Zod schemas)
├── prisma/
│   └── schema.prisma (datamodell)
└── .env.local (miljövariabler)
```

## Nästa fas (Fas 3)

Efter att databas är kopplad:
1. Implementera autentisering (Supabase Auth)
2. Row Level Security (RLS) policies
3. Multi-user support
4. Test-jämförelser över tid
5. PDF-export av rapporter
6. Avancerad statistik och grafer

## Support

Vid problem:
1. Kolla console logs (både browser och terminal)
2. Verifiera att alla npm packages är installerade
3. Se till att .env.local är korrekt konfigurerad
4. Testa API endpoints direkt med curl/Postman först
