# External API Documentation

The External API allows businesses to programmatically access their data from third-party applications.

## Authentication

All API requests require an API key passed in the `Authorization` header:

```
Authorization: Bearer bak_xxxxxxxxxxxxx
```

API keys can be created and managed in the Admin panel under **Businesses > [Business Name] > API Keys**.

## Base URL

```
https://your-domain.com/api/external/v1
```

## Rate Limits

Each API key has configurable rate limits:
- **Requests per minute**: Default 60
- **Requests per day**: Default 10,000

When rate limited, the API returns `429 Too Many Requests` with a message indicating when to retry.

## Scopes

API keys can be restricted to specific scopes:

| Scope | Description |
|-------|-------------|
| `read:athletes` | Read athlete/client data |
| `read:tests` | Read test results and data |
| `read:programs` | Read training programs |
| `read:workouts` | Read workout data |
| `read:analytics` | Read analytics data |
| `write:athletes` | Create/update athletes |
| `write:tests` | Create/update tests |
| `write:programs` | Create/update programs |
| `write:workouts` | Create/update workouts |
| `admin:business` | Business management |
| `admin:members` | Member management |
| `*` | Full access (all scopes) |

---

## Endpoints

### Athletes

#### List Athletes

```
GET /api/external/v1/athletes
```

**Required scope:** `read:athletes`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | - | Search by name or email |

**Response:**
```json
{
  "success": true,
  "data": {
    "athletes": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "gender": "MALE",
        "birthDate": "1990-01-15T00:00:00.000Z",
        "height": 180,
        "weight": 75,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  },
  "meta": {
    "business": "Star by Thomson",
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Single Athlete

```
GET /api/external/v1/athletes/:id
```

**Required scope:** `read:athletes`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+46701234567",
    "gender": "MALE",
    "birthDate": "1990-01-15T00:00:00.000Z",
    "height": 180,
    "weight": 75,
    "notes": "Marathon runner",
    "team": {
      "id": "uuid",
      "name": "Elite Team"
    },
    "recentTests": [...],
    "totalTests": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Tests

#### List Tests

```
GET /api/external/v1/tests
```

**Required scope:** `read:tests`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `athleteId` | string | - | Filter by athlete ID |
| `testType` | string | - | Filter by type: `RUNNING`, `CYCLING`, `SKIING` |
| `status` | string | - | Filter by status: `DRAFT`, `COMPLETED`, `ARCHIVED` |

**Response:**
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "uuid",
        "testDate": "2024-01-10T09:00:00.000Z",
        "testType": "RUNNING",
        "status": "COMPLETED",
        "location": "Stockholm Lab",
        "testLeader": "Stefan Thomson",
        "vo2max": 58.5,
        "maxHR": 185,
        "maxLactate": 12.5,
        "aerobicThreshold": {...},
        "anaerobicThreshold": {...},
        "client": {
          "id": "uuid",
          "name": "John Doe"
        }
      }
    ],
    "pagination": {...}
  }
}
```

#### Get Single Test

```
GET /api/external/v1/tests/:id
```

**Required scope:** `read:tests`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "testDate": "2024-01-10T09:00:00.000Z",
    "testType": "RUNNING",
    "status": "COMPLETED",
    "location": "Stockholm Lab",
    "testLeader": "Stefan Thomson",
    "inclineUnit": "PERCENT",
    "vo2max": 58.5,
    "maxHR": 185,
    "maxLactate": 12.5,
    "aerobicThreshold": {
      "heartRate": 155,
      "value": 12.5,
      "unit": "km/h",
      "lactate": 2.0,
      "percentOfMax": 83.8
    },
    "anaerobicThreshold": {
      "heartRate": 172,
      "value": 15.0,
      "unit": "km/h",
      "lactate": 4.0,
      "percentOfMax": 92.9
    },
    "trainingZones": [...],
    "athlete": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "gender": "MALE",
      "birthDate": "1990-01-15",
      "height": 180,
      "weight": 75
    },
    "stages": [
      {
        "sequence": 1,
        "duration": 4,
        "heartRate": 120,
        "lactate": 1.2,
        "speed": 8.0,
        "incline": 1
      },
      {
        "sequence": 2,
        "duration": 4,
        "heartRate": 135,
        "lactate": 1.5,
        "speed": 10.0,
        "incline": 1
      }
    ],
    "notes": "Good test, athlete in excellent shape"
  }
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Insufficient permissions. Required scopes: read:tests"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Athlete not found"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded. Max 60 requests per minute. Retry after 45s"
}
```

---

## Example: cURL

```bash
# List athletes
curl -H "Authorization: Bearer bak_your_api_key_here" \
  "https://your-domain.com/api/external/v1/athletes?limit=10"

# Get specific test
curl -H "Authorization: Bearer bak_your_api_key_here" \
  "https://your-domain.com/api/external/v1/tests/test-uuid-here"
```

## Example: JavaScript/TypeScript

```typescript
const API_KEY = 'bak_your_api_key_here'
const BASE_URL = 'https://your-domain.com/api/external/v1'

async function getAthletes() {
  const response = await fetch(`${BASE_URL}/athletes`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  })
  return response.json()
}

async function getTest(testId: string) {
  const response = await fetch(`${BASE_URL}/tests/${testId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  })
  return response.json()
}
```
