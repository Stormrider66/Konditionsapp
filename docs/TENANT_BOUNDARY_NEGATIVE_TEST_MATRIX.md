# Tenant Boundary Negative Test Matrix

Purpose: QA checklist for authorization-deny scenarios on high-risk API surfaces.  
Scope: endpoints recently standardized to `canAccessClient()` / `canAccessAthlete()` plus business and external tenant routes.

## How to use

- Run each case with valid auth for the stated actor.
- Use a target ID that belongs to a different tenant/coach/business.
- Assert both status code and response shape (`error` message, no leaked payload fields).

## Matrix

| Area | Endpoint | Actor | Negative input | Expected |
|---|---|---|---|---|
| Client access helper | `GET /api/athletes/[clientId]/cardio-sessions` | ATHLETE | `clientId` of another athlete | `403` |
| Client access helper | `GET /api/athletes/[clientId]/hybrid-workouts` | ATHLETE | `clientId` of another athlete | `403` |
| Restrictions | `GET /api/restrictions/athlete/[clientId]` | ATHLETE | other athlete `clientId` | `403` |
| Hybrid results | `GET /api/hybrid-workouts/[id]/results?athleteId=...` | COACH | `athleteId` outside coach scope | `403` |
| Hybrid results | `POST /api/hybrid-workouts/[id]/results` | COACH | body `athleteId` outside coach scope | `403` |
| Video upload | `POST /api/video-analysis/upload` | COACH | form `athleteId` outside coach scope | `404` |
| Agility assign | `POST /api/agility-workouts/[id]/assign` | COACH | body includes foreign `athleteIds[]` | `403` |
| Deep research share | `POST /api/ai/deep-research/[sessionId]/share` | COACH | body `athleteId` outside coach scope | `404` |
| AI conversations | `POST /api/ai/conversations` | COACH | body `athleteId` outside coach scope | `404` |
| Memory | `DELETE /api/ai/memory/[clientId]?memoryId=...` | COACH | foreign `clientId` | `404` |
| Data moat role scope | `GET /api/data-moat/patterns` | ATHLETE | valid athlete session | `403` (coach/admin only) |
| Data moat role scope | `GET /api/data-moat/cohorts/benchmark?athleteId=...` | ATHLETE | any | `403` |
| Data moat role scope | `GET /api/data-moat/training-outcomes` | ATHLETE | any | `403` |
| Data moat athlete filter | `GET /api/data-moat/predictions/accuracy?athleteId=...` | COACH | athlete outside scope | `404` |
| Data moat athlete filter | `POST /api/data-moat/coach-decisions` | COACH | body `athleteId` outside scope | `404` |
| Physio rehab | `GET /api/physio/rehab-programs/[id]` | COACH | program for foreign athlete | `403` |
| Physio rehab progress | `GET /api/physio/rehab-programs/[id]/progress` | ATHLETE | foreign program | `403` |
| Physio restriction detail | `GET /api/physio/restrictions/[id]` | ATHLETE | restriction for another athlete | `403` |
| Care team | `POST /api/care-team/threads` | ATHLETE | body `clientId` not own | `403` |
| Business membership | `GET /api/business/[id]` | Inactive member | own former business ID | `403` |
| Business membership | `GET /api/business/[id]/members` | Inactive member | own former business ID | `403` |
| Business stats | `GET /api/business/[id]/stats` | Inactive member | own former business ID | `403` |
| Business owner action | `DELETE /api/business/[id]` | ADMIN (not OWNER) | valid business | `403` |
| External API tenant | `GET /api/external/v1/tests?athleteId=...` | API key (Business A) | athlete from Business B | `404` |
| External API tenant | `GET /api/external/v1/tests/[id]` | API key (Business A) | test from Business B | `404` |
| External API tenant | `GET /api/external/v1/athletes/[id]` | API key (Business A) | athlete from Business B | `404` |

## Extra assertions (all cases)

- Response must not include unrelated IDs or names from other tenants.
- Repeated calls with different foreign IDs should not reveal existence differences beyond intended `403/404`.
- For `404` deny endpoints, ensure timing and payload do not disclose ownership details.

## Suggested automation order

1. External API tenant tests (`external/v1`)  
2. Business membership/owner tests  
3. Data moat role-scope tests  
4. Client/athlete helper coverage tests (`athletes/*`, `hybrid-workouts/*`, `physio/*`, `care-team/*`)
