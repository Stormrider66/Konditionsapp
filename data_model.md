# Datamodell Specifikation

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Gender {
  MALE
  FEMALE
}

enum TestType {
  RUNNING
  CYCLING
}

enum TestStatus {
  DRAFT
  COMPLETED
  ARCHIVED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      String   @default("tester")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tests     Test[]
}

model Client {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  gender    Gender
  birthDate DateTime
  height    Float    // cm
  weight    Float    // kg
  notes     String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tests     Test[]
  
  @@index([name])
  @@index([email])
}

model Test {
  id         String     @id @default(uuid())
  clientId   String
  userId     String
  testDate   DateTime
  testType   TestType
  status     TestStatus @default(DRAFT)
  
  // Beräknade värden
  maxHR      Int?
  maxLactate Float?
  vo2max     Float?
  
  // Tröskelvärden
  aerobicThreshold    Json?  // {hr: number, value: number, unit: string}
  anaerobicThreshold  Json?  // {hr: number, value: number, unit: string}
  
  // Träningszoner
  trainingZones Json?  // Array av zoner
  
  // Anteckningar
  notes         String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  client     Client      @relation(fields: [clientId], references: [id])
  user       User        @relation(fields: [userId], references: [id])
  testStages TestStage[]
  report     Report?
  
  @@index([clientId])
  @@index([userId])
  @@index([testDate])
}

model TestStage {
  id       String @id @default(uuid())
  testId   String
  sequence Int    // Ordning i testet
  
  // Gemensamma fält
  duration    Float  // minuter
  heartRate   Int    // slag/min
  lactate     Float  // mmol/L
  vo2         Float? // ml/kg/min
  
  // Löpspecifika
  speed       Float? // km/h
  incline     Float? // procent
  
  // Cykelspecifika
  power       Float? // watt
  cadence     Int?   // rpm
  
  // Beräknade värden
  economy     Float? // ml/kg/km för löpning
  wattsPerKg  Float? // watt/kg för cykling
  
  createdAt DateTime @default(now())
  
  test Test @relation(fields: [testId], references: [id], onDelete: Cascade)
  
  @@index([testId])
  @@index([sequence])
}

model Report {
  id        String   @id @default(uuid())
  testId    String   @unique
  
  // Rapportdata
  htmlContent String  @db.Text
  pdfUrl      String?
  
  // Metadata
  generatedAt DateTime @default(now())
  generatedBy String
  
  // Anpassningar
  customNotes     String?
  recommendations String?
  
  test Test @relation(fields: [testId], references: [id], onDelete: Cascade)
}
```

## TypeScript Types

```typescript
// types/index.ts

// Bas-typer
export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: Date
  height: number // cm
  weight: number // kg
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

// Test-typer
export type TestType = 'RUNNING' | 'CYCLING'
export type TestStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED'

export interface Test {
  id: string
  clientId: string
  userId: string
  testDate: Date
  testType: TestType
  status: TestStatus
  maxHR?: number
  maxLactate?: number
  vo2max?: number
  aerobicThreshold?: Threshold
  anaerobicThreshold?: Threshold
  trainingZones?: TrainingZone[]
  notes?: string
  client?: Client
  user?: User
  testStages: TestStage[]
}

export interface TestStage {
  id: string
  testId: string
  sequence: number
  duration: number // minuter
  heartRate: number
  lactate: number
  vo2?: number
  // Löpning
  speed?: number // km/h
  incline?: number // %
  // Cykling
  power?: number // watt
  cadence?: number // rpm
  // Beräknade
  economy?: number // ml/kg/km
  wattsPerKg?: number // watt/kg
}

// Tröskel-typer
export interface Threshold {
  heartRate: number
  value: number // hastighet eller watt
  unit: 'km/h' | 'watt'
  lactate?: number
  percentOfMax: number
}

// Träningszon-typer
export interface TrainingZone {
  zone: number // 1-5
  name: string // "Mycket lätt", "Lätt", etc
  intensity: string
  hrMin: number
  hrMax: number
  percentMin: number
  percentMax: number
  // Löpning
  speedMin?: number
  speedMax?: number
  // Cykling
  powerMin?: number
  powerMax?: number
  effect: string // "Återhämtning", "Grundkondition", etc
}

// Beräkningsresultat
export interface TestCalculations {
  bmi: number
  aerobicThreshold: Threshold
  anaerobicThreshold: Threshold
  trainingZones: TrainingZone[]
  vo2max: number
  maxHR: number
  maxLactate: number
  economyData?: EconomyData[]
}

export interface EconomyData {
  speed?: number
  power?: number
  vo2: number
  economy: number // ml/kg/km för löpning
  efficiency: 'Utmärkt' | 'Mycket god' | 'God' | 'Acceptabel' | 'Behöver förbättring'
}

// Form DTOs
export interface CreateClientDTO {
  name: string
  email?: string
  phone?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  height: number
  weight: number
  notes?: string
}

export interface CreateTestDTO {
  clientId: string
  testDate: string
  testType: TestType
  stages: CreateTestStageDTO[]
  notes?: string
}

export interface CreateTestStageDTO {
  duration: number
  heartRate: number
  lactate: number
  vo2?: number
  speed?: number
  incline?: number
  power?: number
  cadence?: number
}

// Rapport-typer
export interface Report {
  id: string
  testId: string
  htmlContent: string
  pdfUrl?: string
  generatedAt: Date
  generatedBy: string
  customNotes?: string
  recommendations?: string
}

export interface ReportData {
  client: Client
  test: Test
  calculations: TestCalculations
  testLeader: string
  organization: string
  reportDate: Date
}

// Filter-typer
export interface TestFilters {
  clientId?: string
  testType?: TestType
  dateFrom?: Date
  dateTo?: Date
  status?: TestStatus
}

export interface ClientFilters {
  search?: string
  gender?: Gender
  ageMin?: number
  ageMax?: number
}

// Jämförelse-typer
export interface TestComparison {
  testIds: string[]
  metrics: ComparisonMetric[]
}

export interface ComparisonMetric {
  name: string
  unit: string
  values: {
    testId: string
    value: number
    date: Date
    change?: number // Procentuell förändring
  }[]
}

// Konfiguration
export interface AppConfig {
  organization: string
  testLeader: string
  defaultTestType: TestType
  units: {
    weight: 'kg' | 'lbs'
    height: 'cm' | 'inches'
    speed: 'km/h' | 'mph'
  }
  thresholds: {
    aerobicLactate: number // Default 2.0
    anaerobicLactate: number // Default 4.0
  }
}

// Response-typer
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

## Validation Schemas (Zod)

```typescript
// lib/validations/schemas.ts
import { z } from 'zod'

// Klient-validering
export const clientSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken').max(100),
  email: z.string().email('Ogiltig e-postadress').optional().or(z.literal('')),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().refine((date) => {
    const age = new Date().getFullYear() - new Date(date).getFullYear()
    return age >= 10 && age <= 100
  }, 'Ålder måste vara mellan 10 och 100 år'),
  height: z.number().min(100, 'Längd måste vara minst 100 cm').max(250),
  weight: z.number().min(30, 'Vikt måste vara minst 30 kg').max(300),
  notes: z.string().optional()
})

// Test-stage validering
export const testStageSchema = z.object({
  duration: z.number().min(0.1).max(60),
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  vo2: z.number().min(10).max(100).optional(),
  speed: z.number().min(0).max(30).optional(),
  incline: z.number().min(0).max(20).optional(),
  power: z.number().min(0).max(1000).optional(),
  cadence: z.number().min(0).max(200).optional()
})

// Test-validering
export const createTestSchema = z.object({
  clientId: z.string().uuid(),
  testDate: z.string(),
  testType: z.enum(['RUNNING', 'CYCLING']),
  stages: z.array(testStageSchema).min(3, 'Minst 3 steg krävs'),
  notes: z.string().optional()
})

// Löptest-specifik validering
export const runningTestSchema = createTestSchema.extend({
  testType: z.literal('RUNNING'),
  stages: z.array(
    testStageSchema.extend({
      speed: z.number().min(3, 'Hastighet måste vara minst 3 km/h').max(30)
    })
  )
})

// Cykeltest-specifik validering
export const cyclingTestSchema = createTestSchema.extend({
  testType: z.literal('CYCLING'),
  stages: z.array(
    testStageSchema.extend({
      power: z.number().min(20, 'Effekt måste vara minst 20 watt').max(1000)
    })
  )
})
```

## Exempeldata

```typescript
// lib/sample-data.ts

export const sampleClient: Client = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Joakim Hällgren",
  gender: "MALE",
  birthDate: new Date("1992-01-01"),
  height: 186,
  weight: 88,
  createdAt: new Date(),
  updatedAt: new Date()
}

export const sampleRunningTest: Test = {
  id: "456e7890-e89b-12d3-a456-426614174000",
  clientId: "123e4567-e89b-12d3-a456-426614174000",
  userId: "789e0123-e89b-12d3-a456-426614174000",
  testDate: new Date("2025-09-02"),
  testType: "RUNNING",
  status: "COMPLETED",
  maxHR: 191,
  maxLactate: 14.0,
  vo2max: 49.2,
  testStages: [
    {
      id: "1",
      testId: "456e7890-e89b-12d3-a456-426614174000",
      sequence: 1,
      duration: 4,
      heartRate: 145,
      lactate: 3.3,
      vo2: 27.3,
      speed: 8.0
    },
    // ... fler steg
  ]
}
```