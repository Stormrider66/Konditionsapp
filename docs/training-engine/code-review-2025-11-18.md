## Training Engine Code Review – 2025-11-18

Context: Review requested for the current training-engine implementation versus the documentation under `docs/training-engine`. Findings below capture the gaps and bugs that still exist so future contributors have the details even if this chat context is gone.

---

### 1. Workout modification API mismatches
- `app/api/workouts/modify/route.ts` imports `decideWorkoutModification`, but `@/lib/training-engine/workout-modifier` only exports `modifyWorkout` (plus helpers). TypeScript cannot compile this import.
- The fallback path (when `currentReadiness` isn’t supplied) tries to query `prisma.dailyMetrics` by `athleteId` and dereferences fields like `hrvRmssd` / `rhr`, none of which exist in the schema (`DailyMetrics` stores `clientId`, `hrvRMSSD`, `restingHR`, etc.). That means the API neither compiles nor can it ever build a legitimate readiness snapshot.

### 2. Daily metrics endpoint feeds invalid data into monitoring algorithms
- `HRVMeasurement` requires `artifactPercent`, `duration`, and `position`, but `app/api/daily-metrics/route.ts` constructs the object with only `rmssd`, `quality`, and `timestamp`. The compiler fails because mandatory properties are missing.
- `establishHRVBaseline` receives an array of `HRVMeasurement`s, yet the API passes an array of bare numbers (`historicalHRVData`). The same pattern repeats for RHR (`establishRHRBaseline` expects `RHRMeasurement[]`, but numbers are passed, and `RHRMeasurement` is defined with `heartRate` vs. the API’s `bpm` property). As written, the baseline helpers can’t be called.

### 3. Field test API diverges from the Phase 4 specification and schema
- Documentation (`PHASE_04_FIELD_TESTS.md`) requires five test types: 30-min TT, 20-min TT, HR drift, critical velocity, and race-based estimation. The API switch only implements the first three, so the other modalities can never be submitted or analyzed.
- When persisting results the API writes to columns (`athleteId`, `userId`, `resultData`) that don’t exist on the `FieldTest` model (`prisma/schema.prisma` expects `clientId`, `results`, `lt1/lt2` values, confidence, etc.). Prisma will reject these writes even for the implemented tests.
- ✅ 2025-11-18: `/api/field-tests` now includes the Twenty Minute TT & race-based cases, writes to the correct Prisma fields, and the new analyzers live in `lib/training-engine/field-tests`.

### 4. Injury assessment API ignores the injury schema
- `prisma.schema` defines `InjuryAssessment` with a `clientId`, pain metadata, assessment outcome (`assessment`, `status`), and protocol fields. The `/api/injury/assess` route attempts to create columns named `athleteId`, `userId`, `decision`, `reasoning`, and `assessedAt`, none of which exist. Result: the mutation fails and no injury records or rehab recommendations are stored.
- ✅ 2025-11-18: The route now writes to the real Prisma fields and fires the Phase 12 injury-response cascade (workout modifications, cross-training substitutions, program pauses) via `processInjuryDetection`.

### 5. Readiness trend calculation passes the wrong type
- `analyzeReadinessTrend` (from `lib/training-engine/monitoring/readiness-composite.ts`) expects an array of `ReadinessScore` objects. The API only builds `{ score, date }`, so the call is ill-typed and lacks all the metadata (status, warnings, etc.) the analyzer uses. Either the API must construct actual `ReadinessScore`s or the helper should accept a simplified structure; currently it’s broken.

### 6. Integration and documentation drift
- `docs/training-engine/STATUS.md` states “Phase 12 complete” and references the multi-system validation cascade, Norwegian eligibility checks, and an injury-response pipeline. The implementation does provide these helpers in `lib/training-engine/integration`, but nothing in the codebase imports or executes them. The advertised safety net isn’t hooked into any API or scheduler yet.
- The same doc lists the modules exported by `@/lib/training-engine` (calculations, monitoring, field-tests, self-reported lactate, program generator, workout modifier, utils). The index file only re-exports calculations, utils, monitoring, and methodologies. Field tests, self-reported lactate, cross-training, quality programming, and program-generation modules aren’t exposed via the documented alias.
- ✅ 2025-11-18: `lib/training-engine/index.ts` now re-exports the field-test, self-reported lactate, workout modifier, injury management, quality programming, cross-training, advanced feature, and integration modules, plus bridges the program generator so the docs and imports match.
- ✅ 2025-11-18: Added `/api/system-validation` so coaches/athletes can run the Phase 12 multi-system validation cascade against a client on demand.

### 7. Implementation gaps from the training-engine plan
- Phase 4 requirements (20-min TT & race-based estimation) and Phase 5 references (self-reported lactate workflows) are not wired into the API layer, despite the docs calling them “complete”.
- Phase 12’s validation cascade and Norwegian safeguards are not invoked anywhere, so the system still behaves like the pre-integration build.
- ✅ 2025-11-18: Running `/api/system-validation` now executes `validateSystemState`, surfacing blockers/warnings from injury, readiness, lactate, Norwegian eligibility, field tests, and program state.

---

### Suggested remediation order
1. Fix the Prisma/API mismatches (workout modification, daily metrics, field tests, injury assessment, readiness trend) so the backend compiles against the current schema.
2. Implement and expose the remaining field-test algorithms (20-min TT + race-based) and hook them into `/api/field-tests`. Ensure creation uses the actual `FieldTest` fields.
3. Decide whether to export the rest of the training-engine modules from `lib/training-engine/index.ts` (to match docs) or update the docs to reflect their true paths. Prefer exporting so consumers can follow the existing guidance.
4. Integrate the multi-system validation and injury response cascade into a server action or API endpoint so the documented safety-critical flows actually run.

Keep this file updated as fixes land so future contributors can see what has been addressed versus what still needs work.

