# Teknisk Specifikation - Konditionstest App

## Setup instruktioner

### Initial projektsetup
```bash
# Skapa Next.js projekt med TypeScript
npx create-next-app@latest konditionstest-app --typescript --tailwind --app

# Navigera till projektmappen
cd konditionstest-app

# Installera kärnberoenden
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install prisma @prisma/client
npm install recharts react-hook-form @hookform/resolvers zod
npm install @react-pdf/renderer html2pdf.js
npm install date-fns
npm install lucide-react

# Installera shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label select card table tabs toast
```

### Miljövariabler (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_database_url

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## API Endpoints

### Klient-endpoints
```typescript
// GET /api/clients - Hämta alla klienter
// POST /api/clients - Skapa ny klient
// GET /api/clients/[id] - Hämta specifik klient
// PUT /api/clients/[id] - Uppdatera klient
// DELETE /api/clients/[id] - Ta bort klient

interface ClientEndpoint {
  GET: () => Promise<Client[]>
  POST: (data: CreateClientDTO) => Promise<Client>
  PUT: (id: string, data: UpdateClientDTO) => Promise<Client>
  DELETE: (id: string) => Promise<void>
}
```

### Test-endpoints
```typescript
// GET /api/tests - Hämta alla tester
// POST /api/tests - Skapa nytt test
// GET /api/tests/[id] - Hämta specifikt test
// PUT /api/tests/[id] - Uppdatera test
// DELETE /api/tests/[id] - Ta bort test
// GET /api/tests/client/[clientId] - Hämta alla tester för en klient

interface TestEndpoint {
  GET: (filters?: TestFilters) => Promise<Test[]>
  POST: (data: CreateTestDTO) => Promise<Test>
  PUT: (id: string, data: UpdateTestDTO) => Promise<Test>
  DELETE: (id: string) => Promise<void>
  GET_BY_CLIENT: (clientId: string) => Promise<Test[]>
}
```

### Rapport-endpoints
```typescript
// POST /api/reports/generate - Generera rapport från testdata
// GET /api/reports/[testId] - Hämta rapport för specifikt test
// POST /api/reports/[testId]/pdf - Generera PDF

interface ReportEndpoint {
  GENERATE: (testId: string) => Promise<Report>
  GET_PDF: (testId: string) => Promise<Blob>
}
```

## Komponentstruktur

### Formulärkomponenter
```typescript
// components/forms/TestDataForm.tsx
interface TestDataFormProps {
  clientId?: string
  onSubmit: (data: TestData) => void
  initialData?: Partial<TestData>
  testType: 'running' | 'cycling'
}

// components/forms/ClientForm.tsx
interface ClientFormProps {
  onSubmit: (data: ClientData) => void
  initialData?: Partial<ClientData>
}

// components/forms/TestStageInput.tsx
interface TestStageInputProps {
  index: number
  onChange: (data: TestStage) => void
  onRemove: () => void
  testType: 'running' | 'cycling'
}
```

### Diagramkomponenter
```typescript
// components/charts/TestChart.tsx
interface TestChartProps {
  data: TestStage[]
  testType: 'running' | 'cycling'
  showLegend?: boolean
  height?: number
}

// components/charts/ZonesChart.tsx
interface ZonesChartProps {
  zones: TrainingZone[]
  currentHR?: number
}
```

### Rapportkomponenter
```typescript
// components/reports/ReportTemplate.tsx
interface ReportTemplateProps {
  client: Client
  test: Test
  calculations: TestCalculations
  testLeader: string
  organization: string
}

// components/reports/ReportPreview.tsx
interface ReportPreviewProps {
  testId: string
  editable?: boolean
}
```

## State Management

### Context Providers
```typescript
// contexts/ClientContext.tsx
interface ClientContextValue {
  clients: Client[]
  currentClient: Client | null
  loading: boolean
  error: Error | null
  fetchClients: () => Promise<void>
  selectClient: (id: string) => void
  createClient: (data: CreateClientDTO) => Promise<Client>
  updateClient: (id: string, data: UpdateClientDTO) => Promise<Client>
}

// contexts/TestContext.tsx
interface TestContextValue {
  tests: Test[]
  currentTest: Test | null
  loading: boolean
  error: Error | null
  fetchTests: (clientId?: string) => Promise<void>
  createTest: (data: CreateTestDTO) => Promise<Test>
  updateTest: (id: string, data: UpdateTestDTO) => Promise<Test>
  deleteTest: (id: string) => Promise<void>
}
```

## Säkerhet

### Autentisering
```typescript
// lib/auth.ts
export const authOptions = {
  providers: [
    // Email/password via Supabase
  ],
  callbacks: {
    session: async ({ session, token }) => {
      // Lägg till användardata i session
      return session
    }
  }
}

// middleware.ts
export function middleware(request: NextRequest) {
  // Skydda /dashboard routes
  // Redirect till login om ej autentiserad
}
```

### Validering
```typescript
// lib/validations/test.ts
export const testStageSchema = z.object({
  speed: z.number().min(0).max(30), // km/h för löpning
  power: z.number().min(0).max(1000), // watt för cykling
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  vo2: z.number().min(10).max(100).optional(),
  duration: z.number().min(0).max(60),
  incline: z.number().min(0).max(20).optional()
})

export const clientSchema = z.object({
  name: z.string().min(2).max(100),
  age: z.number().min(10).max(100),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(200),
  gender: z.enum(['male', 'female'])
})
```

## Error Handling

### Global Error Handler
```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Något gick fel!</h2>
      <button onClick={() => reset()}>Försök igen</button>
    </div>
  )
}
```

### API Error Responses
```typescript
// lib/api-errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  // Hantera andra fel
}
```

## Testing

### Unit Tests
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

```typescript
// __tests__/calculations/thresholds.test.ts
describe('Threshold Calculations', () => {
  test('calculates anaerobic threshold correctly', () => {
    const stages = [/* test data */]
    const threshold = calculateAnaerobicThreshold(stages)
    expect(threshold).toBeCloseTo(expectedValue, 1)
  })
})
```

### E2E Tests
```bash
npm install --save-dev playwright @playwright/test
```

```typescript
// e2e/create-test.spec.ts
test('creates new running test', async ({ page }) => {
  await page.goto('/tests/new')
  // Fyll i formulär
  // Verifiera resultat
})
```

## Performance Optimeringar

### Lazy Loading
```typescript
// Lazy load tunga komponenter
const ReportTemplate = dynamic(() => import('@/components/reports/ReportTemplate'), {
  loading: () => <LoadingSpinner />,
  ssr: false
})
```

### Caching
```typescript
// Använd Next.js caching
export const revalidate = 3600 // Revalidera varje timme

// React Query för client-side caching
const { data, error, isLoading } = useQuery({
  queryKey: ['tests', clientId],
  queryFn: () => fetchTests(clientId),
  staleTime: 5 * 60 * 1000, // 5 minuter
})
```

### Database Optimering
```sql
-- Index för vanliga queries
CREATE INDEX idx_tests_client_id ON tests(client_id);
CREATE INDEX idx_tests_test_date ON tests(test_date);
CREATE INDEX idx_test_stages_test_id ON test_stages(test_id);
```

## Deployment Checklist

- [ ] Alla miljövariabler konfigurerade
- [ ] Databas migrationer körda
- [ ] SSL-certifikat konfigurerat
- [ ] Backup-strategi implementerad
- [ ] Monitoring uppsatt (Vercel Analytics)
- [ ] Error tracking (Sentry)
- [ ] Rate limiting på API
- [ ] GDPR-compliance säkerställd