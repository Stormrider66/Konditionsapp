# API Reference

Complete documentation for all 126 API endpoints in the Konditionstest Training Platform.

**Base URL**: `http://localhost:3000` (development) or your production domain

**Authentication**: All endpoints require Supabase Auth. Include JWT in Authorization header.

**Response Format**: All endpoints return JSON with `{ success: boolean, data?: any, error?: string }`

---

## Table of Contents

1. [AI & Chat](#ai--chat-endpoints) (14 endpoints)
2. [Client Management](#client-management-endpoints) (8 endpoints)
3. [Testing & Calculations](#testing--calculations-endpoints) (10 endpoints)
4. [Field Tests](#field-tests-endpoints) (3 endpoints)
5. [Training Programs](#training-programs-endpoints) (7 endpoints)
6. [Workouts](#workouts-endpoints) (10 endpoints)
7. [Exercise Library](#exercise-library-endpoints) (6 endpoints)
8. [Strength Training](#strength-training-endpoints) (9 endpoints)
9. [Hybrid/HYROX](#hybridhyrox-endpoints) (10 endpoints)
10. [Race Results](#race-results-endpoints) (5 endpoints)
11. [Monitoring & Readiness](#monitoring--readiness-endpoints) (4 endpoints)
12. [Injury Management](#injury-management-endpoints) (4 endpoints)
13. [Cross-Training](#cross-training-endpoints) (4 endpoints)
14. [Messaging](#messaging-endpoints) (5 endpoints)
15. [Documents & Knowledge](#documents--knowledge-endpoints) (6 endpoints)
16. [Body Composition](#body-composition-endpoints) (4 endpoints)
17. [Sport Profile](#sport-profile-endpoints) (3 endpoints)
18. [Norwegian Method](#norwegian-method-endpoints) (2 endpoints)
19. [Video Analysis](#video-analysis-endpoints) (10 endpoints)
20. [Settings & API Keys](#settings-endpoints) (5 endpoints)
21. [System & Admin](#system--admin-endpoints) (10 endpoints)

---

## AI & Chat Endpoints

### `POST /api/ai/chat`
Stream AI responses with multi-model support (Claude Opus 4.5, Gemini 2.5 Pro).

**Body:**
```json
{
  "conversationId": "string (optional)",
  "messages": [{ "role": "user|assistant", "content": "string" }],
  "model": "claude-opus-4-5-20251101 | gemini-2.5-pro",
  "provider": "ANTHROPIC | GOOGLE",
  "athleteId": "string (optional)",
  "documentIds": ["string"],
  "webSearchEnabled": true,
  "pageContext": {}
}
```

### `GET /api/ai/conversations`
List AI conversations for authenticated user.

### `POST /api/ai/conversations`
Create new AI conversation.

### `GET /api/ai/conversations/[id]`
Get conversation with messages.

### `PUT /api/ai/conversations/[id]`
Update conversation metadata.

### `DELETE /api/ai/conversations/[id]`
Delete conversation.

### `POST /api/ai/conversations/[id]/message`
Send message to existing conversation.

### `POST /api/ai/save-program`
Parse and save AI-generated training program to database.

### `POST /api/ai/nutrition-plan`
Generate nutrition recommendations based on athlete data.

### `POST /api/ai/generate-chart`
Generate dynamic training/performance charts.

### `POST /api/ai/lactate-ocr`
Extract lactate values from test report images via OCR.

### `GET /api/ai/models`
List available AI models.

### `POST /api/ai/advanced-intelligence/patterns`
Analyze training patterns from historical data.

### `POST /api/ai/advanced-intelligence/predictions`
Predict performance goals and race times.

### `POST /api/ai/advanced-intelligence/injury-risk`
Calculate injury risk from training load.

### `POST /api/ai/advanced-intelligence/periodization`
Auto-adjust periodization based on response.

### `POST /api/ai/advanced-intelligence/coach-style`
Extract coaching style preferences.

---

## Client Management Endpoints

### `GET /api/clients`
List all clients for authenticated coach.

### `POST /api/clients`
Create new client.

**Body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "gender": "MALE | FEMALE",
  "birthDate": "ISO date",
  "height": 180,
  "weight": 75,
  "notes": "string",
  "teamId": "string"
}
```

### `GET /api/clients/[id]`
Get client details with tests and programs.

### `PUT /api/clients/[id]`
Update client information.

### `DELETE /api/clients/[id]`
Delete client (cascades to all data).

### `GET /api/clients/[id]/context-summary`
Get comprehensive client context for AI features.

### `GET /api/clients/[id]/paces`
Calculate elite training paces using hierarchical source system.

**Response:**
```json
{
  "marathonPace": { "pace": "4:30", "kmh": 13.3 },
  "thresholdPace": { "pace": "4:10", "kmh": 14.4 },
  "zones": {
    "daniels": { "easy": {}, "marathon": {}, "threshold": {}, "interval": {}, "repetition": {} },
    "canova": { "fundamental": {}, "progressive": {}, "marathon": {}, "specific": {}, "threshold": {}, "fiveK": {}, "oneK": {} },
    "norwegian": { "green": {}, "threshold": {}, "red": {} }
  },
  "primarySource": "VDOT | LACTATE | HR | PROFILE",
  "confidence": "VERY_HIGH | HIGH | MEDIUM | LOW"
}
```

### `GET /api/clients/[id]/progression/[exerciseId]`
Get exercise progression tracking.

---

## Testing & Calculations Endpoints

### `GET /api/tests`
List tests. Query: `?clientId=string`

### `POST /api/tests`
Create physiological test.

**Body:**
```json
{
  "clientId": "string",
  "testDate": "ISO date",
  "testType": "RUNNING | CYCLING | SKIING",
  "stages": [{
    "sequence": 1,
    "speed": 10.0,
    "heartRate": 140,
    "lactate": 1.2,
    "vo2": 35.5
  }]
}
```

### `GET /api/tests/[id]`
Get test with stages and calculations.

### `PUT /api/tests/[id]`
Update test.

### `DELETE /api/tests/[id]`
Delete test (cascades to stages, report).

### `POST /api/calculations/thresholds`
Calculate lactate thresholds using D-max method.

**Response:**
```json
{
  "aerobicThreshold": { "speed": 12.5, "heartRate": 145, "lactate": 2.0 },
  "anaerobicThreshold": { "speed": 15.0, "heartRate": 172, "lactate": 4.0 },
  "dmaxResult": { "intensity": 14.2, "lactate": 3.2, "rSquared": 0.98 }
}
```

### `POST /api/calculations/zones`
Calculate training zones from thresholds.

### `POST /api/calculations/vdot`
Calculate VDOT from race performance.

**Body:**
```json
{
  "distance": 10000,
  "timeMinutes": 45.0,
  "age": 35,
  "gender": "MALE"
}
```

### `POST /api/calculations/environmental`
Apply WBGT, altitude, wind corrections.

### `GET /api/templates`
List test templates.

---

## Field Tests Endpoints

### `POST /api/field-tests`
Submit field test (30-min TT, HR drift, Critical Velocity).

**Body:**
```json
{
  "clientId": "string",
  "testType": "THIRTY_MIN_TT | HR_DRIFT | CRITICAL_VELOCITY | RACE_BASED",
  "testDate": "ISO date",
  "distance": 10000,
  "duration": 1800,
  "avgHeartRate": 175,
  "maxHeartRate": 185
}
```

### `GET /api/field-tests/[id]/analysis`
Get detailed field test analysis.

### `GET /api/field-tests/progression/[clientId]`
Get field test progression history.

---

## Training Programs Endpoints

### `GET /api/programs`
List programs. Query: `?clientId=string`

### `POST /api/programs`
Create training program.

### `GET /api/programs/[id]`
Get program with weeks, days, workouts.

### `PUT /api/programs/[id]/edit`
Update program structure.

### `POST /api/programs/[id]/days/[dayId]/add-workout`
Add workout to training day.

### `GET /api/programs/[id]/zones`
Get training zones for program.

### `POST /api/programs/generate`
Auto-generate training program.

**Body:**
```json
{
  "clientId": "string",
  "goalType": "marathon | half_marathon | 10k | 5k",
  "methodology": "POLARIZED | NORWEGIAN | CANOVA | PYRAMIDAL",
  "raceDate": "ISO date",
  "startDate": "ISO date",
  "sessionsPerWeek": 5,
  "includeStrength": true
}
```

---

## Workouts Endpoints

### `GET /api/workouts/[id]`
Get workout with segments.

### `PUT /api/workouts/[id]`
Update workout.

### `POST /api/workouts/[id]/log`
Log completed workout.

**Body:**
```json
{
  "completedAt": "ISO date",
  "duration": 60,
  "exerciseLogs": [{
    "exerciseId": "string",
    "sets": [{ "reps": 10, "weight": 50, "rpe": 7 }]
  }],
  "painLevel": 0,
  "notes": "string"
}
```

### `GET /api/workouts/[id]/logs`
Get workout log history.

### `PUT /api/workouts/[id]/logs/[logId]`
Update workout log.

### `POST /api/workouts/[id]/change-type`
Change workout type.

### `POST /api/workouts/create`
Create standalone workout.

### `POST /api/workouts/modify`
Modify workout based on readiness.

### `GET /api/workouts/modifications`
List pending modifications.

### `PUT /api/workouts/modifications/[id]/review`
Coach review of modification.

---

## Exercise Library Endpoints

### `GET /api/exercises`
List 84-exercise library with filtering.

**Query:**
- `search`: text search
- `pillar`: POSTERIOR_CHAIN | KNEE_DOMINANCE | UNILATERAL | FOOT_ANKLE | CORE | UPPER_BODY
- `level`: LEVEL_1 | LEVEL_2 | LEVEL_3
- `difficulty`: BEGINNER | INTERMEDIATE | ADVANCED
- `limit`, `offset`: pagination

### `POST /api/exercises`
Create custom exercise.

### `GET /api/exercises/[id]`
Get exercise details.

### `PUT /api/exercises/[id]`
Update exercise.

### `GET /api/exercises/[id]/alternatives`
Get exercises from same pillar.

### `GET /api/exercises/[id]/progression-path`
Get easier/harder variations.

---

## Strength Training Endpoints

### `GET /api/strength-sessions`
List strength sessions.

### `POST /api/strength-sessions`
Create strength session.

### `GET /api/strength-sessions/[id]`
Get session details.

### `PUT /api/strength-sessions/[id]`
Update session.

### `POST /api/strength-sessions/[id]/assign`
Assign to client.

### `GET /api/strength-templates`
List pre-built templates.

### `POST /api/strength-pr`
Log personal record.

### `GET /api/progression/history`
Get progression history.

### `POST /api/progression/calculate`
Calculate 1RM and progression (Epley/Brzycki, 2-for-2 rule).

---

## Hybrid/HYROX Endpoints

### `GET /api/hybrid-workouts`
List hybrid workouts.

**Query:**
- `format`: AMRAP | FOR_TIME | EMOM | TABATA | CHIPPER | HYROX_SIM
- `scalingLevel`: RX | SCALED | FOUNDATIONS
- `benchmarkOnly`: boolean
- `search`: text

### `POST /api/hybrid-workouts`
Create hybrid workout.

### `GET /api/hybrid-workouts/[id]`
Get workout details.

### `PUT /api/hybrid-workouts/[id]`
Update workout.

### `POST /api/hybrid-workouts/[id]/results`
Submit workout results.

### `GET /api/hybrid-workouts/[id]/versions`
Get version history.

### `GET /api/hybrid-movements`
List HYROX stations/movements.

### `POST /api/hybrid-assignments`
Assign workout to athlete.

### `GET /api/hybrid-assignments/[id]`
Get assignment.

### `POST /api/hybrid-analytics`
Analyze performance by station.

---

## Race Results Endpoints

### `GET /api/race-results`
List race results. Query: `?clientId=string`

### `POST /api/race-results`
Create race with auto-VDOT.

**Body:**
```json
{
  "clientId": "string",
  "raceName": "Stockholm Marathon",
  "raceDate": "ISO date",
  "distance": 42195,
  "timeMinutes": 210,
  "temperature": 18,
  "conditions": "Good"
}
```

### `GET /api/race-results/[id]`
Get race details.

### `PUT /api/race-results/[id]`
Update race.

### `DELETE /api/race-results/[id]`
Delete race.

---

## Monitoring & Readiness Endpoints

### `POST /api/daily-metrics`
Save daily check-in.

**Body:**
```json
{
  "clientId": "string",
  "date": "ISO date",
  "hrvRMSSD": 65,
  "restingHR": 52,
  "sleepQuality": 8,
  "sleepHours": 7.5,
  "muscleSoreness": 3,
  "energyLevel": 7,
  "mood": 8,
  "stress": 4,
  "injuryPain": 0
}
```

### `GET /api/daily-metrics`
Get historical metrics. Query: `?clientId=string&days=30`

### `GET /api/readiness`
Calculate readiness score.

**Response:**
```json
{
  "readinessScore": 78,
  "trend": "IMPROVING | STABLE | DECLINING",
  "recommendation": "PROCEED | REDUCE | EASY | REST"
}
```

### `POST /api/training-load/warnings`
Get ACWR-based warnings.

---

## Injury Management Endpoints

### `POST /api/injury/assess`
University of Delaware pain assessment.

**Body:**
```json
{
  "athleteId": "string",
  "injuryType": "ACHILLES | PLANTAR_FASCIA | ITB | PATELLA | HAMSTRING | CALF | SHIN | HIP | ANKLE",
  "painLevel": 6,
  "painTiming": "DURING | AFTER | NEXT_DAY",
  "symptomDuration": 7,
  "currentACWR": 1.2
}
```

### `POST /api/injury/process-checkin`
Process injury from daily check-in.

### `GET /api/injury/alerts`
Get injury alerts.

### `PUT /api/injury/alerts/[id]/resolve`
Resolve alert.

---

## Cross-Training Endpoints

### `POST /api/cross-training/convert`
Convert workout with TSS equivalency.

**Modalities:** DWR (98%), Cycling (75%), Swimming (45%), Elliptical (65%), AlterG (variable), Rowing (70%)

### `GET /api/cross-training/substitutions/[clientId]`
Get cross-training alternatives.

### `GET /api/cross-training/preferences/[clientId]`
Get modality preferences.

### `GET /api/cross-training/fitness-projection/[clientId]`
Project fitness from cross-training.

---

## Messaging Endpoints

### `GET /api/messages`
List messages. Query: `?filter=inbox|sent&conversationWith=clientId`

### `POST /api/messages`
Send message.

**Body:**
```json
{
  "receiverId": "string",
  "content": "string",
  "workoutId": "string (optional)"
}
```

### `GET /api/messages/[id]`
Get message.

### `PUT /api/messages/[id]`
Mark as read.

### `DELETE /api/messages/[id]`
Delete message.

---

## Documents & Knowledge Endpoints

### `GET /api/documents`
List documents. Query: `?fileType=PDF|EXCEL|VIDEO`

### `POST /api/documents/upload`
Upload file (max 50MB).

### `GET /api/documents/[id]`
Get document.

### `DELETE /api/documents/[id]`
Delete document.

### `POST /api/documents/[id]/embed`
Generate embeddings for RAG.

### `POST /api/knowledge/search`
Semantic search in documents.

**Body:**
```json
{
  "query": "string",
  "documentIds": ["string"],
  "matchThreshold": 0.7
}
```

---

## Body Composition Endpoints

### `GET /api/body-composition`
List records. Query: `?clientId=string`

### `POST /api/body-composition`
Record bioimpedance.

**Body:**
```json
{
  "clientId": "string",
  "measurementDate": "ISO date",
  "weightKg": 75,
  "bodyFatPercent": 12,
  "muscleMassKg": 35,
  "visceralFat": 8,
  "waterPercent": 55,
  "bmrKcal": 1800
}
```

### `GET /api/body-composition/[id]`
Get measurement.

### `PUT /api/body-composition/[id]`
Update measurement.

---

## Sport Profile Endpoints

### `GET /api/sport-profile/[clientId]`
Get sport profile.

### `PUT /api/sport-profile/[clientId]`
Update sport settings.

**Body:**
```json
{
  "primarySport": "RUNNING | CYCLING | SWIMMING | TRIATHLON | HYROX | SKIING | GENERAL_FITNESS",
  "secondarySports": ["CYCLING"],
  "runningSettings": { "vdot": 50, "weeklyKm": 60 },
  "cyclingSettings": { "ftp": 280 },
  "swimmingSettings": { "css": "1:45" },
  "onboardingCompleted": true
}
```

### `POST /api/sport-profile`
Create new sport profile.

---

## Norwegian Method Endpoints

### `GET /api/norwegian-singles/eligibility/[clientId]`
Check 5 prerequisites for Norwegian Method.

**Response:**
```json
{
  "eligible": true,
  "prerequisites": {
    "trainingAge": { "met": true, "value": 3, "required": 2 },
    "baseVolume": { "met": true, "value": 70, "required": 60 },
    "recentLactateTest": { "met": true },
    "lactateMeter": { "met": true },
    "coachSupervision": { "met": true }
  }
}
```

### `POST /api/norwegian-singles/generate`
Generate Norwegian double-threshold workouts.

---

## Video Analysis Endpoints

### `POST /api/video-analysis/upload`
Upload video (max 100MB).

### `GET /api/video-analysis`
List analyses.

### `GET /api/video-analysis/[id]`
Get analysis.

### `POST /api/video-analysis/[id]/analyze`
Analyze with Gemini + MediaPipe.

### `GET /api/video-analysis/[id]/landmarks`
Get skeletal landmarks.

### `POST /api/video-analysis/analyze-pose-data`
Analyze raw pose data.

---

## Settings Endpoints

### `GET /api/settings/api-keys`
Get API key status (not keys).

### `POST /api/settings/api-keys`
Save encrypted BYOK keys.

### `POST /api/settings/api-keys/validate`
Validate API key.

### `GET /api/settings/default-model`
Get default AI model.

### `PUT /api/settings/default-model`
Set default model.

---

## System & Admin Endpoints

### `GET /api/users/me`
Get current user.

### `GET /api/users`
List users (admin).

### `POST /api/users`
Create user.

### `GET /api/teams`
List teams.

### `POST /api/teams`
Create team.

### `GET /api/teams/[id]`
Get team.

### `PUT /api/teams/[id]`
Update team.

### `DELETE /api/teams/[id]`
Delete team.

### `POST /api/send-report-email`
Email test report.

### `POST /api/system-validation`
Multi-system validation cascade (Injury -> Readiness -> Field Tests -> Norwegian -> Program -> Workouts).

### `POST /api/cron/calculate-acwr`
Calculate ACWR for all athletes (cron).

### `POST /api/cron/injury-digest`
Send injury digest emails (cron).

---

## Error Responses

All endpoints return consistent errors:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Error |

---

## Rate Limiting

- Calculation endpoints: 60/min
- AI endpoints: 20/min
- Standard: 100/min

---

## Changelog

- **2024-12-21**: Updated to 126 endpoints (AI Studio, Hybrid, Video Analysis, Multi-Sport)
- **2024-11-22**: Initial 52 endpoints

---

*Total Endpoints: 126 | Last Updated: December 2024*
