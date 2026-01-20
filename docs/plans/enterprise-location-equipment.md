# Enterprise Location & Equipment System Plan

## Overview

Enable enterprise customers (gym chains) to manage multiple locations with different equipment, services, and capabilities. Each location can have a unique setup while sharing the same business branding and athlete database.

---

## 1. Schema Changes

### New Models

```prisma
// Equipment catalog - master list of all possible equipment
model Equipment {
  id          String @id @default(uuid())
  name        String // "Concept2 RowErg"
  nameSv      String? // "Concept2 Roddmaskin"
  category    EquipmentCategory
  brand       String? // "Concept2", "Technogym"
  description String?
  imageUrl    String?

  // What this equipment enables
  enablesTests     String[] // ["rowing_2k", "rowing_cp"]
  enablesExercises String[] // Exercise IDs or categories

  isActive  Boolean @default(true)
  createdAt DateTime @default(now())

  locations LocationEquipment[]

  @@index([category])
}

enum EquipmentCategory {
  CARDIO_MACHINE    // RowErg, SkiErg, BikeErg, Wattbike, Treadmill
  STRENGTH_MACHINE  // Cable machine, Leg press
  FREE_WEIGHTS      // Barbells, Dumbbells, Kettlebells
  RACKS             // Squat rack, Power cage
  TESTING           // Lactate analyzer, VO2max system, Force plates
  ACCESSORIES       // Bands, Boxes, Balls
  RECOVERY          // Massage gun, Foam roller, Sauna
}

// What equipment each location has
model LocationEquipment {
  id          String @id @default(uuid())
  locationId  String
  equipmentId String

  quantity    Int @default(1)
  condition   String? // "Good", "Needs maintenance"
  notes       String?

  // Availability
  isAvailable Boolean @default(true)
  availableFrom DateTime?
  availableTo   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  location  Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  equipment Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@unique([locationId, equipmentId])
  @@index([locationId])
  @@index([equipmentId])
}

// Services offered at each location
model LocationService {
  id          String @id @default(uuid())
  locationId  String

  serviceType ServiceType
  name        String // Custom name override
  description String?

  // Requirements
  requiredEquipment String[] // Equipment IDs needed
  requiredStaff     String[] // Certifications needed

  // Pricing (optional)
  price         Float?
  currency      String @default("SEK")
  pricingModel  String? // "per_session", "monthly", "included"

  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([serviceType])
}

enum ServiceType {
  LACTATE_TESTING
  VO2MAX_TESTING
  BODY_COMPOSITION
  STRENGTH_TRAINING
  CARDIO_TRAINING
  GROUP_CLASSES
  PERSONAL_TRAINING
  REHABILITATION
  NUTRITION_COACHING
  VIDEO_ANALYSIS
  REMOTE_COACHING
}

// Business feature flags - what modules are enabled
model BusinessFeature {
  id         String @id @default(uuid())
  businessId String

  feature    FeatureFlag
  isEnabled  Boolean @default(false)

  // Optional config
  config     Json?

  // Limits
  usageLimit Int?    // -1 = unlimited
  usageCount Int @default(0)

  enabledAt  DateTime?
  expiresAt  DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@unique([businessId, feature])
  @@index([businessId])
}

enum FeatureFlag {
  // Core modules
  LACTATE_TESTING
  ERGOMETER_TESTING
  TRAINING_PROGRAMS
  AI_STUDIO
  VIDEO_ANALYSIS

  // Advanced
  HYBRID_WORKOUTS
  VBT_TRACKING
  NUTRITION_TRACKING
  MENSTRUAL_TRACKING

  // Integrations
  STRAVA_SYNC
  GARMIN_SYNC
  CONCEPT2_SYNC

  // Enterprise
  MULTI_LOCATION
  API_ACCESS
  WHITE_LABEL
  CUSTOM_BRANDING
  SSO_LOGIN

  // Limits
  UNLIMITED_ATHLETES
  UNLIMITED_COACHES
}
```

### Location Model Updates

```prisma
model Location {
  id         String  @id @default(uuid())
  businessId String
  name       String
  slug       String? // For URL: /star-by-thomson/locations/nordstan

  // Contact
  city       String?
  address    String?
  postalCode String?
  phone      String?
  email      String?

  // Coordinates
  latitude  Float?
  longitude Float?

  // Operating hours
  openingHours Json? // { "monday": "06:00-22:00", ... }

  // Capabilities (computed from equipment/services)
  capabilities String[] // ["lactate_testing", "strength_training"]

  // Stats
  totalTests Int @default(0)
  lastTestAt DateTime?

  // Settings
  isActive Boolean @default(true)
  isPrimary Boolean @default(false) // HQ/main location
  settings Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  business   Business            @relation(fields: [businessId], references: [id], onDelete: Cascade)
  tests      Test[]
  equipment  LocationEquipment[]
  services   LocationService[]
  staff      LocationStaff[]

  @@unique([businessId, slug])
  @@index([businessId])
  @@index([city])
}

// Staff assigned to locations
model LocationStaff {
  id         String @id @default(uuid())
  locationId String
  userId     String

  role       String // "Manager", "Coach", "Tester"
  isPrimary  Boolean @default(false) // Their main location

  // Availability
  schedule   Json? // Weekly schedule

  createdAt DateTime @default(now())

  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([locationId, userId])
  @@index([locationId])
  @@index([userId])
}
```

---

## 2. Business Logic

### Equipment-Aware Exercise Filtering

```typescript
// lib/equipment/exercise-filter.ts
export async function getAvailableExercises(
  locationId: string,
  coachId?: string
): Promise<Exercise[]> {
  // Get location's equipment
  const locationEquipment = await prisma.locationEquipment.findMany({
    where: { locationId, isAvailable: true },
    include: { equipment: true }
  })

  const availableEquipmentNames = locationEquipment.map(
    le => le.equipment.name.toLowerCase()
  )

  // Filter exercises that can be done with available equipment
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { equipment: null }, // Bodyweight
        { equipment: '' },
        { equipment: { in: availableEquipmentNames } }
      ],
      // Include coach's custom exercises
      OR: [
        { isPublic: true },
        { coachId: coachId }
      ]
    }
  })

  return exercises
}
```

### Service Availability Check

```typescript
// lib/services/availability.ts
export async function canLocationProvideService(
  locationId: string,
  serviceType: ServiceType
): Promise<{ available: boolean; missingEquipment?: string[] }> {
  const service = await prisma.locationService.findFirst({
    where: { locationId, serviceType, isActive: true }
  })

  if (!service) {
    return { available: false }
  }

  // Check required equipment
  const locationEquipment = await prisma.locationEquipment.findMany({
    where: { locationId, isAvailable: true },
    select: { equipmentId: true }
  })

  const availableIds = locationEquipment.map(e => e.equipmentId)
  const missingEquipment = service.requiredEquipment.filter(
    id => !availableIds.includes(id)
  )

  return {
    available: missingEquipment.length === 0,
    missingEquipment
  }
}
```

---

## 3. UI Components

### Location Management (Business Admin)

```
/[businessSlug]/coach/admin
  └── Locations Tab
       ├── Location List (cards with stats)
       ├── Add Location Dialog
       └── Location Detail Panel
            ├── Basic Info (name, address, hours)
            ├── Equipment Inventory
            │    ├── Add Equipment (from catalog)
            │    ├── Set quantity
            │    └── Mark availability
            ├── Services Offered
            │    ├── Enable/disable services
            │    └── Set pricing
            └── Staff Assignment
                 ├── Assign coaches
                 └── Set schedules
```

### Equipment Selection in Workouts

```tsx
// When creating workout, filter by location
<ExerciseSelector
  locationId={selectedLocation}
  showUnavailable={false}
  onSelect={handleExerciseSelect}
/>

// Show equipment badge on exercises
<ExerciseBadge
  exercise={exercise}
  locationEquipment={locationEquipment}
  status={isAvailable ? 'available' : 'unavailable'}
/>
```

### Athlete Location Selection

```tsx
// Athletes can set their preferred location
<LocationSelector
  businessId={businessId}
  value={preferredLocationId}
  onChange={setPreferredLocation}
  showEquipment={true}
  showServices={true}
/>
```

---

## 4. API Routes

### Equipment Management

```
GET    /api/equipment                    # Master equipment catalog
GET    /api/coach/admin/locations        # Business locations
GET    /api/coach/admin/locations/[id]   # Location detail
POST   /api/coach/admin/locations        # Create location
PUT    /api/coach/admin/locations/[id]   # Update location
DELETE /api/coach/admin/locations/[id]   # Delete location

GET    /api/coach/admin/locations/[id]/equipment  # Location's equipment
POST   /api/coach/admin/locations/[id]/equipment  # Add equipment
PUT    /api/coach/admin/locations/[id]/equipment/[eqId]  # Update
DELETE /api/coach/admin/locations/[id]/equipment/[eqId]  # Remove

GET    /api/coach/admin/locations/[id]/services   # Location's services
POST   /api/coach/admin/locations/[id]/services   # Add service
PUT    /api/coach/admin/locations/[id]/services/[sId]   # Update
```

### Exercise Filtering

```
GET /api/exercises?locationId=xxx       # Exercises available at location
GET /api/exercises/available?locationId=xxx&category=strength
```

---

## 5. Implementation Phases

### Phase 1: Schema & Core (Week 1)
1. Add Prisma schema changes
2. Create migration
3. Seed equipment catalog
4. Update Location model

### Phase 2: Admin UI (Week 2)
1. Locations tab in Business Admin
2. Equipment inventory management
3. Services management
4. Staff assignment

### Phase 3: Integration (Week 3)
1. Exercise filtering by location
2. Test type availability by location
3. Athlete location preference
4. Workout creation with location context

### Phase 4: Reporting (Week 4)
1. Per-location analytics
2. Equipment utilization reports
3. Service usage tracking
4. Multi-location comparison

---

## 6. Example: Nordic Wellness Setup

```typescript
// Business
{
  name: "Nordic Wellness",
  slug: "nordic-wellness",
  features: [
    { feature: "MULTI_LOCATION", isEnabled: true },
    { feature: "LACTATE_TESTING", isEnabled: true },
    { feature: "AI_STUDIO", isEnabled: true }
  ]
}

// Locations
[
  {
    name: "Nordstan",
    slug: "nordstan",
    city: "Göteborg",
    isPrimary: true,
    equipment: [
      { name: "Concept2 RowErg", quantity: 4 },
      { name: "SkiErg", quantity: 2 },
      { name: "Lactate Analyzer", quantity: 1 },
      { name: "Squat Rack", quantity: 3 }
    ],
    services: [
      { type: "LACTATE_TESTING" },
      { type: "STRENGTH_TRAINING" },
      { type: "PERSONAL_TRAINING" }
    ]
  },
  {
    name: "Kungsbacka",
    slug: "kungsbacka",
    city: "Kungsbacka",
    equipment: [
      { name: "Concept2 RowErg", quantity: 2 },
      { name: "Dumbbells", quantity: 1 }, // Set
      { name: "Cable Machine", quantity: 1 }
    ],
    services: [
      { type: "STRENGTH_TRAINING" },
      { type: "GROUP_CLASSES" }
    ]
    // No lactate testing - no analyzer
  }
]
```

---

## 7. URL Structure

```
/nordic-wellness/coach/dashboard              # Business dashboard
/nordic-wellness/coach/admin                  # Business admin
/nordic-wellness/coach/admin?tab=locations    # Location management
/nordic-wellness/locations/nordstan           # Location detail page (public)
/nordic-wellness/athlete/dashboard            # Athlete portal

# Location-specific athlete views
/nordic-wellness/athlete/dashboard?location=nordstan
```

---

## 8. Feature Gating Example

```typescript
// Check if business has feature enabled
async function requireFeature(businessId: string, feature: FeatureFlag) {
  const bf = await prisma.businessFeature.findUnique({
    where: { businessId_feature: { businessId, feature } }
  })

  if (!bf?.isEnabled) {
    throw new Error(`Feature ${feature} not enabled for this business`)
  }

  // Check expiry
  if (bf.expiresAt && bf.expiresAt < new Date()) {
    throw new Error(`Feature ${feature} has expired`)
  }

  // Check usage limit
  if (bf.usageLimit && bf.usageLimit !== -1 && bf.usageCount >= bf.usageLimit) {
    throw new Error(`Feature ${feature} usage limit reached`)
  }

  return bf
}
```

---

## Summary

This plan enables:
- **21+ locations** per business with unique equipment
- **Equipment-aware** exercise and test filtering
- **Service management** per location
- **Staff assignment** to locations
- **Feature flags** for enterprise customization
- **Analytics** per location

The system scales from a single-gym operator to a 50+ location chain while maintaining data isolation and custom capabilities per location.
