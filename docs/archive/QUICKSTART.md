# Quickstart Guide - Fas 2

## Kom igång på 30 sekunder

### 1. Starta servern
```bash
cd "/mnt/d/VO2 max report/konditionstest-app"
npm run dev
```

### 2. Öppna i webbläsare
```
http://localhost:3000
```

### 3. Klicka runt!
- **Startsida** - Se statistik (2 sample klienter finns redan)
- **Klientregister** - Klicka "Klientregister" kortet
- **Ny Klient** - Klicka "Ny Klient" knappen
- **Klientdetaljer** - Klicka på en klient i listan

## Vad fungerar nu?

✅ Komplett klientregister
✅ Skapa/läsa/uppdatera/ta bort klienter
✅ Sök bland klienter
✅ Se klientdetaljer (ålder, BMI, etc.)
✅ API endpoints för klienter och tester
✅ Live statistik på startsidan
✅ Sample data för testning

## Sample klienter (finns redan)

1. **Joakim Hällgren**
   - Man, 33 år
   - 186 cm, 88 kg
   - joakim@example.com

2. **Anna Svensson**
   - Kvinna, 37 år
   - 170 cm, 65 kg
   - anna@example.com

## Skapa din första klient

1. Gå till `/clients`
2. Klicka "Ny Klient"
3. Fyll i formuläret:
   - Namn: "Test Testsson"
   - E-post: "test@example.com"
   - Kön: Man
   - Födelsedatum: 1990-01-01
   - Längd: 180 cm
   - Vikt: 75 kg
4. Klicka "Skapa Klient"
5. Du redirectas automatiskt till klientdetaljer!

## Viktigt att veta

### Data försvinner vid restart
Mock-databasen är in-memory. Data sparas inte permanent.

**Lösning:** Koppla på Supabase (se README-DATABASE.md)

### Inga tester ännu
Klientregistret är klart men du kan inte spara tester än.

**Kommer i nästa steg:** Integrera test-formuläret med klientväljare

## Testa API direkt

### Hämta alla klienter
```bash
curl http://localhost:3000/api/clients
```

### Skapa ny klient
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test",
    "gender": "MALE",
    "birthDate": "1995-05-05",
    "height": 175,
    "weight": 70
  }'
```

## Nästa steg

1. **Testa grundläggande funktionalitet** (5 min)
2. **Läs README-DATABASE.md** för Supabase setup (5 min)
3. **Koppla på Supabase** när du är redo (10 min)

## Problem?

### Servern startar inte
```bash
# Installera dependencies igen
npm install

# Rensa cache
rm -rf .next
npm run dev
```

### Port redan upptagen
```bash
# Använd annan port
npm run dev -- -p 3001
```

### TypeScript errors
```bash
# Generera Prisma client
npx prisma generate
```

## Mer info

- `IMPLEMENTATION-SUMMARY.md` - Detaljerad sammanfattning
- `README-DATABASE.md` - Supabase setup guide
- Inline comments i koden

Lycka till! 🚀
