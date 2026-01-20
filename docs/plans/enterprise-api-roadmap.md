# Enterprise API Roadmap

> Planning document for enterprise gym API features and integrations.
> Created: 2026-01-20

---

## Current State

### Existing External API (`/api/external/v1/`)

| Endpoint | Method | Scope | Description |
|----------|--------|-------|-------------|
| `/athletes` | GET | `read:athletes` | List/search athletes |
| `/athletes/:id` | GET | `read:athletes` | Get athlete details + recent tests |
| `/tests` | GET | `read:tests` | List tests with filtering |
| `/tests/:id` | GET | `read:tests` | Full test data with stages |
| `/referrals` | GET | `read:analytics` | Partner referral stats |

### Authentication
- API keys with `bak_` prefix
- SHA-256 hashed storage
- Configurable rate limits (per-minute, per-day)
- Scope-based permissions
- Business-level data isolation

---

## Phase 1: Foundation (Q1)

### 1.1 Webhook System

**Priority**: Critical - enables all event-driven integrations

**Endpoints**:
```
POST   /api/external/v1/webhooks           - Register webhook
GET    /api/external/v1/webhooks           - List webhooks
DELETE /api/external/v1/webhooks/:id       - Remove webhook
POST   /api/external/v1/webhooks/:id/test  - Send test event
```

**Events**:
| Event | Payload | Use Case |
|-------|---------|----------|
| `member.created` | Member data | Sync to gym management |
| `member.checked_in` | Member, location, timestamp | Door access, app notification |
| `workout.completed` | Workout summary, member | Update app, trigger badge |
| `test.completed` | Test results, member | Send to PT, update profile |
| `wod.generated` | WOD data, member | Display on kiosk |
| `injury.reported` | Injury type, severity | Alert coaches |
| `goal.achieved` | Goal, member | Celebration, social share |
| `subscription.expiring` | Member, days remaining | Sales outreach |
| `challenge.joined` | Challenge, member | Leaderboard update |
| `challenge.entry` | Entry data, rank change | Live display update |

**Technical Requirements**:
- Webhook signature verification (HMAC-SHA256)
- Retry logic with exponential backoff (3 attempts)
- Event log with delivery status
- Webhook health monitoring
- Rate limiting per webhook endpoint

**Database Schema**:
```prisma
model BusinessWebhook {
  id            String   @id @default(uuid())
  businessId    String
  url           String
  secret        String   // For HMAC signing
  events        String[] // Events to subscribe to
  isActive      Boolean  @default(true)

  // Health tracking
  lastDeliveryAt    DateTime?
  lastDeliveryStatus String?  // "success", "failed"
  failureCount      Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  business Business @relation(fields: [businessId], references: [id])
}

model WebhookDelivery {
  id          String   @id @default(uuid())
  webhookId   String
  event       String
  payload     Json
  status      String   // "pending", "delivered", "failed"
  statusCode  Int?
  attempts    Int      @default(0)
  lastAttempt DateTime?
  error       String?

  createdAt DateTime @default(now())
}
```

---

### 1.2 Member Check-In with Personalized WOD

**Priority**: High - immediate member value

**Endpoints**:
```
POST /api/external/v1/check-in
  Body: { memberId, locationId, equipmentPrefs? }
  Returns: { checkIn, personalizedWod?, readinessScore }

GET /api/external/v1/members/:id/daily-wod
  Query: { locationId, duration?, focus? }
  Returns: { wod, equipment, alternatives }
```

**Flow**:
```
1. Member scans QR / badge at gym entrance
2. Gym system calls POST /check-in with member ID
3. System checks:
   - Member's readiness score (from daily check-in)
   - Recent workouts (avoid overtraining)
   - Active injuries (exclude exercises)
   - Equipment at location (use available only)
   - Time of day (morning = energizing, evening = recovery)
4. Returns personalized WOD or "rest day" recommendation
5. Triggers webhook: member.checked_in
```

**Integration Points**:
- Door access systems (Kisi, Brivo, Salto)
- Mobile apps (push WOD notification)
- Kiosk displays (show WOD on screen)

---

### 1.3 Bulk Operations

**Priority**: Medium - essential for onboarding

**Endpoints**:
```
POST /api/external/v1/athletes/bulk
  Body: { athletes: [...], options: { updateExisting: boolean } }
  Returns: { created: n, updated: n, errors: [...] }

POST /api/external/v1/tests/bulk
  Body: { tests: [...] }
  Returns: { created: n, errors: [...] }

GET /api/external/v1/export/athletes
  Query: { format: "csv" | "json", fields?: [...] }
  Returns: File download or JSON array

GET /api/external/v1/export/tests
  Query: { format, dateFrom?, dateTo?, testType? }
  Returns: File download or JSON array
```

**Validation**:
- Schema validation with detailed error messages
- Duplicate detection (by email or external ID)
- Batch size limits (max 1000 per request)
- Async processing for large imports (return job ID)

---

## Phase 2: Engagement (Q2)

### 2.1 Challenges & Leaderboards

**Priority**: High - drives engagement and retention

**Endpoints**:
```
# Challenge Management
POST   /api/external/v1/challenges
GET    /api/external/v1/challenges
GET    /api/external/v1/challenges/:id
PUT    /api/external/v1/challenges/:id
DELETE /api/external/v1/challenges/:id

# Participation
POST   /api/external/v1/challenges/:id/join
POST   /api/external/v1/challenges/:id/entries
GET    /api/external/v1/challenges/:id/leaderboard
GET    /api/external/v1/challenges/:id/my-progress
```

**Challenge Types**:
| Type | Metric | Example |
|------|--------|---------|
| `distance` | Total meters | "January 100K Row" |
| `time` | Total duration | "60 Hours of Cardio" |
| `workouts` | Workout count | "30 Workouts in 30 Days" |
| `pr_count` | Personal records | "PR Hunter Month" |
| `consistency` | Streak days | "Perfect Attendance" |
| `team` | Team aggregate | "Location vs Location" |
| `improvement` | % change | "Most Improved VO2max" |

**Database Schema**:
```prisma
model Challenge {
  id          String   @id @default(uuid())
  businessId  String

  name        String
  description String?
  type        ChallengeType
  metric      String   // "rowing_meters", "workout_count", etc.
  target      Float?   // Optional goal (e.g., 100000 meters)

  startDate   DateTime
  endDate     DateTime

  // Scope
  locationIds String[] // Empty = all locations
  isPublic    Boolean  @default(true)

  // Team settings
  isTeamChallenge Boolean @default(false)
  teamSize        Int?

  // Rewards
  prizes      Json?    // { "1": "Free month", "2": "T-shirt" }
  badgeId     String?  // Badge awarded on completion

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  business     Business @relation(fields: [businessId], references: [id])
  participants ChallengeParticipant[]
  entries      ChallengeEntry[]
}

model ChallengeParticipant {
  id          String   @id @default(uuid())
  challengeId String
  clientId    String
  teamId      String?

  // Cached stats (updated on new entry)
  totalValue  Float    @default(0)
  rank        Int?

  joinedAt  DateTime @default(now())

  challenge Challenge @relation(fields: [challengeId], references: [id])
  client    Client    @relation(fields: [clientId], references: [id])
}

model ChallengeEntry {
  id            String   @id @default(uuid())
  challengeId   String
  clientId      String

  value         Float    // The metric value
  source        String   // "manual", "workout_log", "ergometer", "strava"
  sourceId      String?  // Reference to source record

  createdAt DateTime @default(now())

  challenge Challenge @relation(fields: [challengeId], references: [id])
  client    Client    @relation(fields: [clientId], references: [id])
}

enum ChallengeType {
  INDIVIDUAL
  TEAM
  LOCATION_VS_LOCATION
}
```

**Leaderboard Response**:
```json
{
  "challenge": { "id": "...", "name": "January 100K Row", "endsAt": "..." },
  "leaderboard": [
    { "rank": 1, "member": { "id": "...", "name": "Anna S." }, "value": 87500, "progress": 87.5 },
    { "rank": 2, "member": { "id": "...", "name": "Erik L." }, "value": 72300, "progress": 72.3 }
  ],
  "myPosition": { "rank": 15, "value": 23400, "progress": 23.4 },
  "totalParticipants": 156
}
```

---

### 2.2 Embeddable Widgets

**Priority**: Medium - enhances gym atmosphere

**Endpoints**:
```
GET /api/external/v1/widgets/daily-wod
  Query: { locationId, theme?: "dark" | "light" }
  Returns: { html, css, wod }

GET /api/external/v1/widgets/leaderboard
  Query: { challengeId, limit?, theme? }
  Returns: { html, css, leaderboard }

GET /api/external/v1/widgets/achievements
  Query: { locationId, period?: "day" | "week", theme? }
  Returns: { html, css, achievements }

GET /api/external/v1/widgets/equipment-status
  Query: { locationId }
  Returns: { html, css, equipment }
```

**Widget Types**:
| Widget | Display Use | Refresh Rate |
|--------|-------------|--------------|
| Daily WOD | Gym entrance, locker room | On demand |
| Leaderboard | Competition area | 5 min |
| Achievements | Social wall | 1 min |
| Equipment Status | Gym floor | 30 sec |
| Class Schedule | Reception | 15 min |
| Member Count | Entrance | 1 min |

**Technical Approach**:
- Return self-contained HTML/CSS (no external dependencies)
- Support iframe embedding
- Auto-refresh with configurable interval
- Responsive design for different screen sizes
- Optional JavaScript for live updates via WebSocket

---

### 2.3 Equipment Telemetry Integration

**Priority**: Medium - automatic data capture

**Endpoints**:
```
POST /api/external/v1/equipment/sessions
  Body: { equipmentId, memberId, data: { distance, time, avgPower, ... } }
  Returns: { sessionId, workout?, achievements? }

GET /api/external/v1/equipment/:id/status
  Returns: { inUse, currentUser?, startedAt?, metrics? }

POST /api/external/v1/equipment/:id/start
  Body: { memberId }
  Returns: { sessionId }

POST /api/external/v1/equipment/:id/end
  Body: { sessionId, data }
  Returns: { workout, achievements }
```

**Supported Equipment Protocols**:
| Brand | Protocol | Data Available |
|-------|----------|----------------|
| Concept2 | PM5 API / Logbook | Distance, pace, power, stroke rate |
| Assault | Bluetooth | Distance, calories, RPM |
| Rogue Echo | Bluetooth | Distance, calories |
| Technogym | Mywellness API | Full workout data |
| Life Fitness | LFconnect API | Heart rate, calories, distance |
| Peloton | Web API | Power, cadence, resistance |

**Auto-Import Flow**:
```
1. Member starts session (badge tap or app)
2. Equipment streams data during workout
3. On completion, data sent to API
4. System matches to member, creates workout log
5. Updates challenge entries if applicable
6. Triggers webhook: workout.completed
```

---

## Phase 3: Intelligence (Q3)

### 3.1 Predictive Analytics

**Priority**: High - retention impact

**Endpoints**:
```
GET /api/external/v1/analytics/churn-risk
  Query: { threshold?: number, limit? }
  Returns: { atRiskMembers: [...], insights }

GET /api/external/v1/analytics/engagement
  Query: { period: "week" | "month", locationId? }
  Returns: { metrics, trends, comparisons }

GET /api/external/v1/analytics/capacity
  Query: { locationId, date?, hourly?: boolean }
  Returns: { predictions, recommendations }

GET /api/external/v1/members/:id/health-score
  Returns: { score, factors, recommendations }
```

**Churn Risk Factors**:
| Factor | Weight | Threshold |
|--------|--------|-----------|
| Days since last visit | 30% | >10 days = high risk |
| Visit frequency trend | 25% | -50% vs previous month |
| Workout completion rate | 15% | <50% = warning |
| App engagement | 10% | No opens in 7 days |
| Social activity | 10% | Left challenges/groups |
| Payment issues | 10% | Failed payment = critical |

**Response Example**:
```json
{
  "atRiskMembers": [
    {
      "member": { "id": "...", "name": "Johan K.", "email": "..." },
      "riskScore": 0.78,
      "riskLevel": "high",
      "daysSinceVisit": 14,
      "factors": [
        { "factor": "visit_frequency", "impact": "high", "detail": "Down 60% from last month" },
        { "factor": "app_engagement", "impact": "medium", "detail": "No app opens in 12 days" }
      ],
      "recommendedActions": [
        "Send personal check-in message",
        "Offer complimentary PT session",
        "Invite to upcoming challenge"
      ]
    }
  ],
  "summary": {
    "totalAtRisk": 23,
    "highRisk": 8,
    "mediumRisk": 15,
    "potentialMonthlyLoss": 18500  // SEK
  }
}
```

---

### 3.2 Smart Class Management

**Priority**: Medium - coach efficiency

**Endpoints**:
```
GET /api/external/v1/classes/:id/attendees/summary
  Returns: { count, fitnessLevels, injuries, preferences }

POST /api/external/v1/classes/:id/generate-workout
  Body: { duration, focus?, intensity? }
  Returns: { workout, scalingOptions, injuryNotes }

GET /api/external/v1/coaches/:id/schedule-optimization
  Returns: { suggestions, conflicts, coverage }
```

**Class Fitness Summary**:
```json
{
  "classId": "...",
  "attendeeCount": 12,
  "fitnessDistribution": {
    "beginner": 3,
    "intermediate": 6,
    "advanced": 3
  },
  "avgReadiness": 7.2,
  "injuries": [
    { "type": "knee", "count": 2, "recommendation": "Avoid jumping, offer step-ups" },
    { "type": "shoulder", "count": 1, "recommendation": "Modify overhead movements" }
  ],
  "equipmentNeeds": {
    "dumbbells": { "light": 3, "medium": 6, "heavy": 3 },
    "kettlebells": 8,
    "boxes": 10
  },
  "suggestedScaling": {
    "rx": { "weight": "24/16kg KB", "reps": "15" },
    "scaled": { "weight": "16/12kg KB", "reps": "12" },
    "beginner": { "weight": "12/8kg KB", "reps": "10" }
  }
}
```

---

### 3.3 Corporate Wellness API

**Priority**: Medium - new revenue stream

**Endpoints**:
```
# Company Management
POST   /api/external/v1/corporate/companies
GET    /api/external/v1/corporate/companies
GET    /api/external/v1/corporate/companies/:id

# Employee Management
POST   /api/external/v1/corporate/:companyId/employees/bulk
GET    /api/external/v1/corporate/:companyId/employees

# Challenges & Reporting
POST   /api/external/v1/corporate/:companyId/challenges
GET    /api/external/v1/corporate/:companyId/reports/participation
GET    /api/external/v1/corporate/:companyId/reports/health-metrics
```

**Corporate Health Report** (anonymized):
```json
{
  "company": { "id": "...", "name": "Tech Corp AB" },
  "period": { "from": "2026-01-01", "to": "2026-01-31" },
  "participation": {
    "totalEmployees": 150,
    "activeMembers": 89,
    "participationRate": 59.3,
    "avgVisitsPerMember": 8.2
  },
  "healthMetrics": {
    "avgReadinessScore": 7.1,
    "avgWorkoutsPerWeek": 2.4,
    "mostPopularActivities": ["Strength", "HIIT", "Yoga"],
    "peakHours": ["07:00-08:00", "17:00-18:00"]
  },
  "trends": {
    "participationChange": "+5.2%",
    "fitnessImprovement": "+8.1%"
  },
  "challengeResults": {
    "active": 2,
    "completed": 1,
    "totalParticipants": 67
  }
}
```

---

## Phase 4: Advanced Integrations (Q4)

### 4.1 Third-Party Gym Software Sync

**Target Integrations**:
| System | Type | Sync Direction |
|--------|------|----------------|
| Mindbody | Booking/POS | Bidirectional |
| Gympass | Aggregator | Inbound members |
| ClassPass | Aggregator | Inbound bookings |
| Wodify | CrossFit mgmt | Bidirectional |
| SugarWOD | Programming | Outbound WODs |
| TrainHeroic | Programming | Bidirectional |
| Zen Planner | Gym mgmt | Bidirectional |

**Sync Endpoints**:
```
POST /api/external/v1/integrations/:provider/connect
GET  /api/external/v1/integrations/:provider/status
POST /api/external/v1/integrations/:provider/sync
GET  /api/external/v1/integrations/:provider/logs
```

---

### 4.2 White-Label Mobile SDK

**Components**:
- WOD display component
- Check-in flow
- Progress tracking
- Challenge participation
- Leaderboard view
- Achievement badges

**SDK Platforms**:
- React Native
- Flutter
- Native iOS (Swift)
- Native Android (Kotlin)

---

### 4.3 Real-Time Features

**WebSocket Endpoints**:
```
ws://api/external/v1/realtime

Channels:
- location:{id}:occupancy    - Live member count
- location:{id}:equipment    - Equipment status changes
- challenge:{id}:leaderboard - Live rank updates
- member:{id}:notifications  - Personal notifications
```

---

## Implementation Priority Matrix

| Feature | Business Value | Technical Effort | Priority |
|---------|---------------|------------------|----------|
| Webhooks | Critical | Medium | P0 |
| Check-in + WOD | High | Low | P0 |
| Bulk import/export | Medium | Low | P1 |
| Challenges | High | Medium | P1 |
| Leaderboards | High | Low | P1 |
| Churn analytics | High | Medium | P1 |
| Widgets | Medium | Low | P2 |
| Equipment telemetry | Medium | High | P2 |
| Class management | Medium | Medium | P2 |
| Corporate wellness | Medium | Medium | P2 |
| Third-party sync | High | High | P3 |
| Mobile SDK | Medium | High | P3 |
| Real-time WebSocket | Medium | High | P3 |

---

## API Versioning Strategy

- Current: `v1` - Stable, breaking changes require new version
- Beta features: `v1` with `X-Beta-Features` header
- Deprecation: 6 months notice, sunset header warnings
- Version in URL: `/api/external/v1/`, `/api/external/v2/`

---

## Rate Limiting Tiers

| Tier | Requests/min | Requests/day | WebSocket connections |
|------|--------------|--------------|----------------------|
| Standard | 60 | 10,000 | 5 |
| Professional | 300 | 50,000 | 20 |
| Enterprise | 1,000 | 500,000 | 100 |
| Unlimited | No limit | No limit | No limit |

---

## Security Considerations

1. **API Key Rotation**: Support key rotation without downtime
2. **IP Allowlisting**: Optional IP restrictions per key
3. **Audit Logging**: Full request/response logging for compliance
4. **Data Encryption**: All PII encrypted at rest
5. **GDPR Compliance**: Data export/deletion endpoints
6. **Webhook Security**: HMAC signatures, IP verification

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Adoption | 50% of enterprise customers | Active API keys |
| Integration Time | < 1 week | Time to first API call |
| API Reliability | 99.9% uptime | Error rate monitoring |
| Latency | < 200ms p95 | Response time tracking |
| Developer Satisfaction | > 4.5/5 | Developer surveys |

---

## Documentation Requirements

- OpenAPI 3.0 specification
- Interactive API explorer (Swagger UI)
- Code examples (curl, JavaScript, Python, Ruby)
- Webhook testing tools
- Postman collection
- SDK documentation
- Migration guides

---

## Next Steps

1. [ ] Review and prioritize features with stakeholders
2. [ ] Design webhook system architecture
3. [ ] Create OpenAPI specification for Phase 1
4. [ ] Build webhook infrastructure
5. [ ] Implement check-in + WOD endpoint
6. [ ] Create developer documentation portal
7. [ ] Beta test with 2-3 enterprise customers
8. [ ] Iterate based on feedback
