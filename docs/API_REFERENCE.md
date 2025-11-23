# API Reference

Complete documentation for all 52 API endpoints in the Konditionstest Training Platform.

**Base URL**: `http://localhost:3000` (development) or your production domain

**Authentication**: All endpoints (except `/api/send-report-email` for email delivery) require Supabase authentication via session cookies.

**Response Format**: All endpoints return JSON unless otherwise specified.

---

## 📋 Table of Contents

1. [Testing APIs](#testing-apis) (10 endpoints)
2. [Training Engine APIs](#training-engine-apis) (17 endpoints)
3. [Program APIs](#program-apis) (8 endpoints)
4. [Exercise APIs](#exercise-apis) (7 endpoints)
5. [Strength Training APIs](#strength-training-apis) (6 endpoints)
6. [Client & Team APIs](#client--team-apis) (4 endpoints)
7. [Race Results APIs](#race-results-apis) (2 endpoints)
8. [Messaging APIs](#messaging-apis) (2 endpoints)
9. [User APIs](#user-apis) (1 endpoint)
10. [Error Responses](#error-responses)

---

## Testing APIs

### 1. Create Test

**Endpoint**: `POST /api/tests`

**Description**: Create a new physiological test (running, cycling, or skiing)

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "testType": "RUNNING" | "CYCLING" | "SKIING",
  "date": "2025-01-15T10:00:00Z",
  "location": "Star Lab Stockholm",
  "testLeader": "Henrik Thomson",
  "status": "DRAFT" | "COMPLETED" | "ARCHIVED",
  "testStages": [
    {
      "sequence": 1,
      "speed": 8.0,        // km/h (for RUNNING)
      "power": null,       // watt (for CYCLING)
      "pace": null,        // min/km (for SKIING)
      "incline": 1.0,      // % or degrees
      "inclineUnit": "PERCENT",
      "heartRate": 140,
      "lactate": 1.2,
      "vo2": 35.5,
      "cadence": null,     // rpm (for CYCLING)
      "duration": 300      // seconds
    }
    // ... more stages
  ]
}
```

**Response**: `201 Created`
```json
{
  "id": "test-uuid",
  "clientId": "client-uuid",
  "testType": "RUNNING",
  "date": "2025-01-15T10:00:00Z",
  "status": "COMPLETED",
  "testStages": [...],
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

### 2. Get Test by ID

**Endpoint**: `GET /api/tests/[id]`

**Description**: Retrieve a specific test with all stages and calculations

**Response**: `200 OK`
```json
{
  "id": "test-uuid",
  "client": {
    "id": "client-uuid",
    "name": "Joakim Hällgren",
    "age": 35,
    "gender": "MALE"
  },
  "testType": "RUNNING",
  "testStages": [...],
  "thresholdCalculations": [...],
  "report": {...}
}
```

---

### 3. Update Test

**Endpoint**: `PUT /api/tests/[id]`

**Description**: Update test metadata or stages

**Request Body**: Same as Create Test

**Response**: `200 OK`

---

### 4. Delete Test

**Endpoint**: `DELETE /api/tests/[id]`

**Description**: Delete a test (cascades to test stages and report)

**Response**: `204 No Content`

---

### 5. List Templates

**Endpoint**: `GET /api/templates`

**Description**: Get all test templates

**Response**: `200 OK`
```json
[
  {
    "id": "template-uuid",
    "name": "Standard Running Test",
    "testType": "RUNNING",
    "stages": [...]
  }
]
```

---

### 6. Submit Field Test

**Endpoint**: `POST /api/field-tests`

**Description**: Submit non-lab threshold test (30-min TT, HR drift, Critical Velocity)

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "testType": "TIME_TRIAL_30" | "HR_DRIFT" | "CRITICAL_VELOCITY",
  "date": "2025-01-15T10:00:00Z",
  "avgPace": "4:30",           // min/km
  "avgHeartRate": 175,
  "maxHeartRate": 185,
  "distance": 10000,            // meters
  "duration": 2700,             // seconds
  "conditions": {
    "temperature": 15,
    "wind": "calm",
    "terrain": "flat"
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "field-test-uuid",
  "derivedThresholds": {
    "lt1": { "pace": "5:15", "hr": 160 },
    "lt2": { "pace": "4:40", "hr": 172 }
  },
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "valid": true,
  "validationWarnings": []
}
```

---

### 7. Calculate Thresholds

**Endpoint**: `POST /api/calculations/thresholds`

**Description**: Calculate thresholds from raw test data

**Request Body**:
```json
{
  "testStages": [
    { "speed": 8.0, "heartRate": 140, "lactate": 1.2 },
    { "speed": 10.0, "heartRate": 155, "lactate": 2.1 },
    { "speed": 12.0, "heartRate": 170, "lactate": 4.3 }
  ],
  "method": "LINEAR_INTERPOLATION" | "DMAX"
}
```

**Response**: `200 OK`
```json
{
  "aerobicThreshold": {
    "speed": 9.5,
    "heartRate": 150,
    "lactate": 2.0
  },
  "anaerobicThreshold": {
    "speed": 11.2,
    "heartRate": 165,
    "lactate": 4.0
  }
}
```

---

### 8. Calculate Training Zones

**Endpoint**: `POST /api/calculations/zones`

**Description**: Calculate 5-zone training zones from thresholds

**Request Body**:
```json
{
  "maxHeartRate": 194,
  "anaerobicThreshold": {
    "heartRate": 175,
    "speed": 14.0
  }
}
```

**Response**: `200 OK`
```json
{
  "zones": [
    {
      "zone": 1,
      "name": "Recovery",
      "hrMin": 97,
      "hrMax": 116,
      "speedMin": 8.0,
      "speedMax": 10.5
    }
    // ... zones 2-5
  ]
}
```

---

### 9. Calculate VDOT

**Endpoint**: `POST /api/calculations/vdot`

**Description**: Calculate VDOT from race performance (Jack Daniels tables)

**Request Body**:
```json
{
  "distance": 10000,      // meters
  "time": 2700,           // seconds (45:00)
  "unit": "METRIC"
}
```

**Response**: `200 OK`
```json
{
  "vdot": 52.3,
  "paces": {
    "easy": "5:30-6:00",
    "marathon": "4:45",
    "threshold": "4:20",
    "interval": "4:00",
    "repetition": "3:40"
  },
  "equivalentTimes": {
    "5k": "20:30",
    "10k": "42:45",
    "halfMarathon": "1:35:20",
    "marathon": "3:20:45"
  }
}
```

---

### 10. Environmental Calculations

**Endpoint**: `POST /api/calculations/environmental`

**Description**: Calculate WBGT heat stress, altitude, and wind adjustments

**Request Body**:
```json
{
  "temperature": 28,       // Celsius
  "humidity": 75,          // %
  "windSpeed": 10,         // km/h
  "altitude": 1500,        // meters
  "calculationType": "WBGT" | "ALTITUDE" | "WIND"
}
```

**Response**: `200 OK`
```json
{
  "wbgt": 26.5,
  "category": "HIGH_RISK",
  "paceAdjustment": "+15-20 sec/km",
  "altitudeEffect": "-3.5% VO2max",
  "recommendations": [
    "Reduce intensity by 20%",
    "Increase hydration"
  ]
}
```

---

## Training Engine APIs

### 11. Submit Daily Check-In

**Endpoint**: `POST /api/daily-checkin`

**Description**: Quick daily readiness check-in (<2 minutes)

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "date": "2025-01-15",
  "hrv": 65,                    // optional
  "rhr": 52,                    // optional
  "sleepQuality": 8,            // 1-10
  "muscleSoreness": 3,          // 1-10
  "energyLevel": 7,             // 1-10
  "mood": 8,                    // 1-10
  "stress": 4,                  // 1-10
  "painLevel": 0,               // 0-10
  "painLocation": null,
  "notes": "Feeling good"
}
```

**Response**: `201 Created`
```json
{
  "id": "checkin-uuid",
  "readinessScore": 78,          // 0-100
  "readinessLevel": "GOOD",
  "readinessDecision": "PROCEED",
  "workoutModification": null,
  "redFlags": [],
  "yellowFlags": []
}
```

---

### 12. Get Athlete Readiness

**Endpoint**: `GET /api/monitoring/readiness?clientId=xxx&days=30`

**Description**: Get readiness history and current status

**Response**: `200 OK`
```json
{
  "current": {
    "score": 78,
    "level": "GOOD",
    "decision": "PROCEED"
  },
  "history": [
    {
      "date": "2025-01-15",
      "score": 78,
      "level": "GOOD"
    }
    // ... last 30 days
  ],
  "trends": {
    "avgScore": 75,
    "improving": true
  }
}
```

---

### 13. Submit Self-Reported Lactate

**Endpoint**: `POST /api/lactate/self-reported`

**Description**: Athlete submits home lactate test for coach validation

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "testDate": "2025-01-15",
  "stages": [
    {
      "sequence": 1,
      "pace": "5:00",
      "heartRate": 145,
      "lactate": 1.8,
      "photoUrl": "https://..."
    }
    // ... 4+ stages required
  ],
  "notes": "Home test on track"
}
```

**Response**: `201 Created`
```json
{
  "id": "lactate-uuid",
  "validated": false,
  "estimatedThresholds": {
    "lt1": { "pace": "5:15", "lactate": 2.0 },
    "lt2": { "pace": "4:30", "lactate": 4.0 }
  },
  "validationWarnings": [
    "Stage 3 lactate seems high - please verify photo"
  ]
}
```

---

### 14. Validate Self-Reported Lactate

**Endpoint**: `PUT /api/lactate/[id]/validate`

**Description**: Coach validates or rejects athlete lactate submission

**Request Body**:
```json
{
  "validated": true,
  "validatedBy": "coach-user-id",
  "notes": "Looks good, updating zones"
}
```

**Response**: `200 OK`

---

### 15. Assess Injury

**Endpoint**: `POST /api/injury/assess`

**Description**: Submit injury assessment using University of Delaware pain rules

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "injuryType": "PLANTAR_FASCIITIS" | "ACHILLES" | "IT_BAND" | "PATELLOFEMORAL" | "SHIN_SPLINTS" | "STRESS_FRACTURE" | "HAMSTRING" | "CALF" | "HIP_FLEXOR",
  "painLevel": 6,               // 0-10
  "gaitAffected": false,
  "functionalTests": {
    "singleLegHop": "PAIN",
    "toeTaps": "NO_PAIN"
  },
  "onsetDate": "2025-01-10"
}
```

**Response**: `201 Created`
```json
{
  "id": "injury-uuid",
  "assessment": "MODERATE",
  "recommendation": "CROSS_TRAINING_ONLY",
  "returnToRunProtocol": {
    "phase": 1,
    "duration": "1 week",
    "activities": ["Walking only"]
  },
  "crossTrainingRecommendations": [
    {
      "modality": "DWR",
      "retention": 98,
      "reason": "Ideal for plantar fasciitis"
    }
  ]
}
```

---

### 16. Process Injury from Check-In

**Endpoint**: `POST /api/injury/process-checkin`

**Description**: Automatically process injury detection from daily check-in

**Request Body**:
```json
{
  "checkInId": "checkin-uuid",
  "clientId": "client-uuid"
}
```

**Response**: `200 OK`
```json
{
  "injuryDetected": true,
  "workoutsModified": 5,
  "crossTrainingGenerated": 3,
  "coachNotified": true
}
```

---

### 17. Convert to Cross-Training

**Endpoint**: `GET /api/cross-training/convert?workoutId=xxx&modality=DWR`

**Description**: Convert running workout to cross-training with TSS equivalency

**Query Parameters**:
- `workoutId`: Workout to convert
- `modality`: `DWR` | `CYCLING` | `ELLIPTICAL` | `SWIMMING` | `ALTERG` | `ROWING`

**Response**: `200 OK`
```json
{
  "original": {
    "type": "RUNNING",
    "duration": 60,
    "tss": 100
  },
  "converted": {
    "modality": "DWR",
    "duration": 60,
    "tss": 98,
    "retention": 98,
    "instructions": "Deep water running for 60 minutes at moderate effort"
  }
}
```

---

### 18. Norwegian Method Eligibility

**Endpoint**: `POST /api/norwegian-singles/eligibility`

**Description**: Check if athlete meets Norwegian Method prerequisites

**Request Body**:
```json
{
  "clientId": "string (UUID)"
}
```

**Response**: `200 OK`
```json
{
  "eligible": false,
  "requirements": [
    { "criterion": "Training age ≥2 years", "met": true },
    { "criterion": "Aerobic base ≥60 km/week", "met": false },
    { "criterion": "Recent lactate test", "met": true },
    { "criterion": "Lactate meter access", "met": true },
    { "criterion": "Coach supervision", "met": true }
  ],
  "transitionPlan": null,
  "estimatedWeeks": null
}
```

---

### 19. Generate Norwegian Singles Workout

**Endpoint**: `POST /api/norwegian-singles/generate`

**Description**: Generate Norwegian Method threshold workout

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "thresholdPace": "4:20",
  "volume": 8000               // meters
}
```

**Response**: `201 Created`
```json
{
  "workout": {
    "warmup": "15 min easy",
    "main": "8 km @ 4:20/km (LT2, 2-3 mmol/L)",
    "cooldown": "10 min easy",
    "targetLactate": "2.0-3.0 mmol/L",
    "notes": "Check lactate 2x during session"
  }
}
```

---

### 20. System Validation

**Endpoint**: `GET /api/system-validation?clientId=xxx`

**Description**: Multi-system validation cascade (INJURY → READINESS → FIELD_TESTS → NORWEGIAN → PROGRAM → WORKOUT)

**Response**: `200 OK`
```json
{
  "valid": false,
  "blockers": [
    {
      "system": "INJURY",
      "message": "Active injury detected",
      "action": "Pause Norwegian Method"
    }
  ],
  "warnings": [
    {
      "system": "READINESS",
      "message": "Low readiness score (45)",
      "action": "Recommend easy day"
    }
  ],
  "recommendations": [
    "Switch to cross-training-only protocol"
  ]
}
```

---

### 21-27. Additional Training Engine Endpoints

- `POST /api/daily-metrics` - Submit full daily metrics (legacy comprehensive version)
- `GET /api/monitoring/hrv-rhr` - Get HRV/RHR baseline and trends
- `POST /api/training-load` - Log training load (TSS/TRIMP)
- `GET /api/training-load/acwr` - Get ACWR (Acute:Chronic Workload Ratio)
- `POST /api/workouts/modify` - Modify workout based on readiness
- `GET /api/field-tests/[id]` - Get field test results
- `PUT /api/field-tests/[id]` - Update field test

---

## Program APIs

### 28. Generate Training Program

**Endpoint**: `POST /api/programs/generate`

**Description**: Generate complete training program with periodization

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "goalType": "MARATHON" | "HALF_MARATHON" | "10K" | "5K" | "FITNESS" | "CYCLING" | "SKIING" | "CUSTOM",
  "methodology": "POLARIZED" | "NORWEGIAN" | "CANOVA" | "PYRAMIDAL" | "LYDIARD",
  "raceDate": "2025-06-01",
  "startDate": "2025-01-15",
  "weeksToRace": 20,
  "currentWeeklyVolume": 50,     // km/week
  "targetRaceTime": "3:30:00",    // marathon time
  "sessionsPerWeek": 5,
  "includeStrength": true,
  "includeCrossTraining": false
}
```

**Response**: `201 Created`
```json
{
  "id": "program-uuid",
  "clientId": "client-uuid",
  "phases": [
    {
      "name": "BASE",
      "weeks": 8,
      "weeklyVolume": "50-65 km"
    },
    {
      "name": "BUILD",
      "weeks": 8,
      "weeklyVolume": "65-80 km"
    },
    {
      "name": "PEAK",
      "weeks": 3,
      "weeklyVolume": "80 km"
    },
    {
      "name": "TAPER",
      "weeks": 1,
      "weeklyVolume": "40 km"
    }
  ],
  "totalWeeks": 20,
  "totalWorkouts": 100,
  "generatedAt": "2025-01-15T10:00:00Z"
}
```

---

### 29. Edit Training Program

**Endpoint**: `PUT /api/programs/[id]/edit`

**Description**: Edit program components (day/workout/reorder/segments)

**Query Parameters**:
- `type`: `day` | `workout` | `reorder` | `segments`

**Request Body** (for `type=workout`):
```json
{
  "workoutId": "workout-uuid",
  "updates": {
    "type": "RUNNING",
    "intensity": "THRESHOLD",
    "duration": 60,
    "segments": [...]
  }
}
```

**Response**: `200 OK`

---

### 30. Add Workout to Program Day

**Endpoint**: `POST /api/programs/[id]/edit`

**Description**: Add a workout to a specific day

**Request Body**:
```json
{
  "dayId": "day-uuid",
  "workout": {
    "type": "RUNNING",
    "intensity": "EASY",
    "duration": 45,
    "description": "Easy recovery run"
  }
}
```

**Response**: `201 Created`

---

### 31. Delete Workout

**Endpoint**: `DELETE /api/programs/[id]/edit?workoutId=xxx`

**Description**: Remove workout from program

**Response**: `204 No Content`

---

### 32-35. Additional Program Endpoints

- `GET /api/programs/[id]` - Get program details
- `GET /api/programs?clientId=xxx` - List all programs for client
- `POST /api/programs/[id]/generate-report` - Generate program report PDF
- `DELETE /api/programs/[id]` - Delete program

---

## Exercise APIs

### 36. List Exercises

**Endpoint**: `GET /api/exercises`

**Description**: Get exercise library with filtering

**Query Parameters**:
- `search`: Text search
- `pillar`: Biomechanical pillar filter
- `level`: Progression level (1/2/3)
- `category`: Exercise category
- `equipment`: Equipment filter
- `difficulty`: BEGINNER | INTERMEDIATE | ADVANCED
- `sortBy`: Field to sort by
- `sortOrder`: asc | desc
- `page`: Page number (default 1)
- `limit`: Items per page (default 20)

**Response**: `200 OK`
```json
{
  "exercises": [
    {
      "id": "exercise-uuid",
      "nameSv": "Knäböj",
      "nameEn": "Back Squat",
      "category": "STRENGTH",
      "pillar": "KNEE_DOMINANCE",
      "level": "LEVEL_2",
      "equipment": "BARBELL",
      "difficulty": "INTERMEDIATE",
      "targetMuscles": ["Quadriceps", "Glutes"],
      "instructions": "...",
      "videoUrl": "https://..."
    }
  ],
  "total": 84,
  "page": 1,
  "totalPages": 5
}
```

---

### 37. Get Single Exercise

**Endpoint**: `GET /api/exercises/[id]`

**Description**: Get complete exercise details

**Response**: `200 OK`

---

### 38. Create Custom Exercise

**Endpoint**: `POST /api/exercises`

**Description**: Create custom exercise

**Request Body**:
```json
{
  "nameSv": "Min Anpassade Övning",
  "nameEn": "My Custom Exercise",
  "category": "STRENGTH",
  "pillar": "POSTERIOR_CHAIN",
  "level": "LEVEL_2",
  "equipment": "DUMBBELL",
  "difficulty": "INTERMEDIATE",
  "instructions": "...",
  "coachingCues": ["Keep back straight", "Push through heels"],
  "videoUrl": "https://youtube.com/..."
}
```

**Response**: `201 Created`

---

### 39. Update Exercise

**Endpoint**: `PUT /api/exercises/[id]`

**Description**: Update exercise details

**Response**: `200 OK`

---

### 40. Delete Exercise

**Endpoint**: `DELETE /api/exercises/[id]`

**Description**: Delete custom exercise (cannot delete library exercises)

**Response**: `204 No Content`

---

### 41. Get Alternative Exercises

**Endpoint**: `GET /api/exercises/[id]/alternatives`

**Description**: Get exercises with same biomechanical pillar

**Response**: `200 OK`
```json
{
  "alternatives": [
    {
      "id": "alt-uuid",
      "nameSv": "Front Squat",
      "nameEn": "Front Squat",
      "pillar": "KNEE_DOMINANCE",
      "level": "LEVEL_2"
    }
  ]
}
```

---

### 42. Get Progression Path

**Endpoint**: `GET /api/exercises/[id]/progression-path`

**Description**: Get easier/harder progression for exercise

**Response**: `200 OK`
```json
{
  "easier": {
    "id": "easier-uuid",
    "nameSv": "Goblet Squat",
    "level": "LEVEL_1"
  },
  "current": {
    "id": "current-uuid",
    "nameSv": "Back Squat",
    "level": "LEVEL_2"
  },
  "harder": {
    "id": "harder-uuid",
    "nameSv": "Front Squat",
    "level": "LEVEL_3"
  }
}
```

---

## Strength Training APIs

### 43. Get Progression History

**Endpoint**: `GET /api/clients/[id]/progression/[exerciseId]?limit=20`

**Description**: Get progression tracking for specific exercise

**Response**: `200 OK`
```json
{
  "exerciseId": "exercise-uuid",
  "exerciseName": "Back Squat",
  "progression": [
    {
      "date": "2025-01-15",
      "sets": 3,
      "reps": 8,
      "load": 100,
      "rpe": 7,
      "estimated1RM": 125,
      "confidence": "HIGH"
    }
  ],
  "current1RM": 125,
  "status": "ON_TRACK" | "PLATEAU" | "REGRESSING",
  "readyForIncrease": true,
  "plateauWeeks": 0,
  "improvement": "+15% since start"
}
```

---

### 44. Calculate Progression

**Endpoint**: `POST /api/clients/[id]/progression/[exerciseId]`

**Description**: Log workout and calculate progression (1RM, 2-for-2 rule, plateau detection)

**Request Body**:
```json
{
  "date": "2025-01-15",
  "sets": 3,
  "reps": 10,        // 2 extra reps beyond target (8)
  "load": 100,
  "rpe": 7,
  "notes": "Felt strong today"
}
```

**Response**: `201 Created`
```json
{
  "id": "tracking-uuid",
  "estimated1RM": 133,     // Epley/Brzycki average
  "confidence": "HIGH",
  "twoForTwoStatus": {
    "session1": true,      // 2+ extra reps
    "session2": null,      // Need 1 more session
    "readyForIncrease": false
  },
  "plateauCheck": {
    "weeksWithoutProgress": 0,
    "status": "ON_TRACK"
  },
  "recommendation": "Continue with current load for 1 more session"
}
```

---

### 45. Log Workout

**Endpoint**: `POST /api/workouts/[id]/log`

**Description**: Log completed workout with exercise-by-exercise data

**Request Body**:
```json
{
  "completedAt": "2025-01-15T18:00:00Z",
  "duration": 65,          // minutes
  "rpe": 7,
  "exercises": [
    {
      "exerciseId": "exercise-uuid",
      "sets": 3,
      "reps": 8,
      "load": 100,
      "rpe": 7,
      "skipped": false
    }
  ],
  "notes": "Great session",
  "fileUrls": []
}
```

**Response**: `201 Created`
```json
{
  "id": "log-uuid",
  "progressionResults": [
    {
      "exerciseId": "exercise-uuid",
      "new1RM": 125,
      "readyForIncrease": false
    }
  ]
}
```

---

### 46-48. Additional Strength Endpoints

- `GET /api/strength-templates` - Get pre-built strength program templates
- `GET /api/clients/[id]/progression` - Get all progression tracking for client
- `POST /api/progression/calculate` - Standalone progression calculator

---

## Client & Team APIs

### 49. Get Clients

**Endpoint**: `GET /api/clients?search=xxx&teamId=xxx`

**Description**: List all clients for authenticated coach

**Response**: `200 OK`
```json
{
  "clients": [
    {
      "id": "client-uuid",
      "name": "Joakim Hällgren",
      "email": "joakim@example.com",
      "age": 35,
      "gender": "MALE",
      "height": 186,
      "weight": 88,
      "athleteAccount": {...}
    }
  ]
}
```

---

### 50-52. Additional Client/Team Endpoints

- `POST /api/clients` - Create client
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client (cascades to all data)
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `PUT /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team

---

## Race Results APIs

### 53. Create/List Race Results

**Endpoint**: `POST /api/race-results`

**Description**: Create race result with auto-VDOT calculation

**Request Body**:
```json
{
  "clientId": "string (UUID)",
  "date": "2025-06-01",
  "distance": 10000,       // meters
  "time": 2700,            // seconds (45:00)
  "raceName": "Stockholm 10K",
  "classification": "A" | "B" | "C",
  "goalTime": 2640,        // seconds (44:00)
  "conditions": "Good"
}
```

**Response**: `201 Created`
```json
{
  "id": "race-uuid",
  "vdot": 52.3,
  "assessment": "CLOSE",   // EXCEEDED | MET | CLOSE | MISSED
  "equivalentTimes": {...},
  "paceRecommendations": {...}
}
```

---

### 54. Get/Update/Delete Race

**Endpoint**: `GET/PUT/DELETE /api/race-results/[id]`

**Description**: CRUD operations for race results

---

## Messaging APIs

### 55. Send/List Messages

**Endpoint**: `POST /api/messages`

**Description**: Send message from coach to athlete or vice versa

**Request Body**:
```json
{
  "recipientId": "user-uuid",
  "clientId": "client-uuid",
  "subject": "Training Question",
  "content": "How should I adjust for the heat?",
  "replyToId": null         // for threading
}
```

**Response**: `201 Created`

---

### 56. Get/Update/Delete Message

**Endpoint**: `GET/PUT/DELETE /api/messages/[id]`

**Description**: CRUD operations for messages

---

## User APIs

### 57. Get Current User

**Endpoint**: `GET /api/users/me`

**Description**: Get authenticated user profile

**Response**: `200 OK`
```json
{
  "id": "user-uuid",
  "email": "coach@example.com",
  "role": "COACH",
  "name": "Henrik Thomson",
  "subscription": {...},
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": {
    "field": "testType",
    "message": "Must be RUNNING, CYCLING, or SKIING"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please log in to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied",
  "message": "You don't have permission to access this client's data"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "Test with ID 'xxx' not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Common Patterns

### Pagination

Endpoints that return lists support pagination:
```
GET /api/exercises?page=2&limit=20
```

Response includes:
```json
{
  "items": [...],
  "total": 84,
  "page": 2,
  "totalPages": 5,
  "hasMore": true
}
```

### Filtering

Use query parameters for filtering:
```
GET /api/clients?search=joakim&teamId=xxx
GET /api/exercises?pillar=POSTERIOR_CHAIN&level=2
```

### Sorting

Use `sortBy` and `sortOrder`:
```
GET /api/tests?clientId=xxx&sortBy=date&sortOrder=desc
```

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting for production deployment.

---

## Webhooks

Currently not implemented. Future consideration for external integrations.

---

## SDK / Client Libraries

Currently no official SDK. All endpoints are standard REST APIs that can be consumed with `fetch` or any HTTP client.

**TypeScript Example**:
```typescript
const response = await fetch('/api/tests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientId: '...', testType: 'RUNNING', ... })
})
const test = await response.json()
```

---

## Changelog

- **2025-11-22**: Initial API documentation (52 endpoints)
- Future updates will be tracked here

---

**For questions or issues**, see `/CLAUDE.md` or contact the development team.
