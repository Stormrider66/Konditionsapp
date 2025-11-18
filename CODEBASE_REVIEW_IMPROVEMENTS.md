# Codebase Review & Improvement Plan
Date: November 18, 2025
Status: In Progress

## 🛠 Technical Improvements

### Type Safety & Code Quality
- [x] **Eliminate `any` Types**
  - [x] Create shared Prisma types (e.g., `ProgramWithWeeks`, `WorkoutWithLogs`) in `types/prisma-types.ts` or `types/index.ts`.
  - [x] Refactor `components/programs/ProgramCalendar.tsx` to use typed props.
  - [x] Refactor `components/programs/ProgramOverview.tsx` to use typed props.
  - [x] Refactor `app/athlete/dashboard/page.tsx` data handling.
  - [ ] Clean up `scripts/` folder to use proper types instead of `any`.

### Performance Optimization
- [x] **Dashboard Query Optimization** (`app/athlete/dashboard/page.tsx`)
  - [x] Split the massive "Active Programs" query into smaller, parallel queries.
  - [x] Implement pagination for `RecentActivity` (currently fetches, then slices).
  - [x] Optimize `TodaysWorkouts` to fetch only relevant date range from DB instead of filtering in JS.
- [ ] **Database Indexing**
  - [ ] Verify composite indices on `WorkoutLog` for `[athleteId, completedAt]` are being used effectively.

### Architecture
- [ ] **Server Actions vs API Routes**
  - [ ] Standardize on one pattern (currently mixing API routes and potentially server actions).
  - [ ] Move complex validation logic from API routes to `lib/` (continuing the pattern already started in `training-engine`).

---

## 👥 User Experience (UX) Improvements

### Athlete Daily Check-in
- [x] **Fix Scale Mental Models**
  - [x] Change "Muscle Soreness" scale: 1 = No Soreness, 10 = Extreme Soreness (currently reversed).
  - [x] Change "Stress" scale: 1 = No Stress, 10 = Extreme Stress (ensure consistency).
  - [x] *Backend:* Invert values before saving to DB to maintain "Higher score = Better Readiness" logic if necessary, or update readiness calculation to handle "Lower is Better" for these specific metrics.
- [x] **Immediate Feedback**
  - [x] Show "Why" readiness is low/high immediately after submission (display `reasoning` array).
  - [x] Add visual indicators (Red/Green/Yellow colors) to the result alert.

### Dashboard & Navigation
- [ ] **Contextual Insights**
  - [ ] Add a "Coach's Comment" prominent widget if the coach left a note on the latest workout.
  - [ ] Show "Next Big Goal" (Race) countdown clearly on top.
- [ ] **Mobile Optimization (PWA)**
  - [ ] Add `manifest.json`.
  - [ ] Add icons for home screen.
  - [ ] Ensure touch targets (buttons/inputs) are at least 44px for mobile users.

---

## 🧪 Testing & Stability

- [x] **End-to-End (E2E) Tests**
  - [x] Test Flow: Athlete Login -> Daily Check-in -> View Dashboard.
  - [x] Test Flow: Coach Login -> Create Program -> Assign to Athlete.
- [ ] **Unit Tests**
  - [ ] Expand coverage for `readiness-composite.ts` to handle edge cases (missing data).
  - [ ] Test the new "Soreness" scale inversion logic once implemented.

---

## 🚀 Future Roadmap

- [ ] **Notifications System**
  - [ ] Implement email/push notifications when readiness is "Critical".
  - [ ] Weekly summary email for Coaches.
- [ ] **Data Visualization**
  - [ ] Add trend lines for "Readiness Score" over the last 30 days.
  - [ ] Add "Training Load" vs "Injury Risk" chart.

