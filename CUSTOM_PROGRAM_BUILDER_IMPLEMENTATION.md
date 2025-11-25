# Custom Program Builder Implementation Plan

## Overview
Create a flexible custom program builder that allows coaches to:
- Build programs completely from scratch
- Mix running, strength, core, and alternative training sessions freely
- Convert any day from rest → running → strength and vice versa
- Add/remove/swap sessions on any day

---

## Phase 1: Session Type Management (Core Feature)

### 1.1 Create SessionTypeDialog Component
- [x] Create `components/programs/SessionTypeDialog.tsx`
  - [x] Design modal UI with 5 session type options
  - [x] Add icons for each type (Running 🏃, Strength 💪, Core 🎯, Alternative 🚴, Rest 😴)
  - [x] Add descriptions for each type
  - [x] Handle navigation to appropriate studio with context
  - [x] Handle "Rest Day" selection (clear workouts, mark as rest)

### 1.2 Enhance ProgramCalendar Component
- [x] Update `components/programs/ProgramCalendar.tsx`
  - [x] Add "+ Add Session" button to each day card (including rest days)
  - [x] Add "Change Type" button to existing workout cards
  - [x] Add "Delete Workout" button to workout cards
  - [x] Add visual session type indicators (icons/colors)
  - [x] Integrate SessionTypeDialog modal
  - [x] Handle state management for dialog open/close
  - [x] Pass correct context (programId, dayId, date) to dialog

### 1.3 Update DayCard Component
- [x] Modify `DayCard` in `ProgramCalendar.tsx`
  - [x] Show "+ Add Session" button on empty days
  - [x] Add action buttons to workout items
  - [x] Improve layout for multiple sessions per day
  - [x] Add confirmation dialog for delete action

---

## Phase 2: API Endpoints (Backend Support)

### 2.1 Workout Type Conversion API
- [x] Create `app/api/workouts/[id]/change-type/route.ts`
  - [x] Handle POST request to change workout type
  - [x] Validate workout ownership (authorization)
  - [x] Clear type-specific segments (cardio segments vs strength segments)
  - [x] Update workout type in database
  - [x] Return updated workout data

### 2.2 Add Workout to Day API
- [x] Create `app/api/programs/[id]/days/[dayId]/add-workout/route.ts`
  - [x] Handle POST request to add new workout to specific day
  - [x] Accept workout type parameter
  - [x] Create default workout structure based on type
  - [x] Associate with correct TrainingDay
  - [x] Return created workout with redirect URL

### 2.3 Delete Workout API
- [x] Update `app/api/workouts/[id]/route.ts`
  - [x] Add DELETE method handler
  - [x] Validate workout ownership
  - [x] Delete workout and cascade delete segments
  - [x] Return success response

### 2.4 Empty Program Generation API
- [x] Update `app/api/programs/generate/route.ts`
  - [x] Add logic for "CUSTOM" methodology
  - [x] Generate empty weeks structure (no workouts)
  - [x] Create all 7 days per week
  - [x] Set appropriate metadata (phase: BASE, focus: null)
  - [x] Return program structure ready for manual session addition

---

## Phase 3: Studio Integration (Workflow)

### 3.1 Update CardioSessionBuilder
- [x] Modify `components/coach/cardio/CardioSessionBuilder.tsx`
  - [x] Add breadcrumb navigation (Program → Week → Day → Session)
  - [x] Add "Back to Calendar" button in header
  - [x] Handle save success → redirect back to calendar
  - [x] Improve URL parameter handling (programId, dayId, date)
  - [x] Show context info (which day/week this session belongs to)

### 3.2 Update SessionBuilder (Strength)
- [x] Modify `components/coach/strength/SessionBuilder.tsx`
  - [x] Add breadcrumb navigation
  - [x] Add "Back to Calendar" button
  - [x] Handle save success → redirect back to calendar
  - [x] Improve URL parameter handling
  - [x] Show context info

### 3.3 Create Core Session Builder
- [ ] Create `components/coach/core/CoreSessionBuilder.tsx` (or reuse strength builder)
  - [ ] Filter exercises to core-only
  - [ ] Add core-specific templates (planks, dead bugs, etc.)
  - [ ] Similar UI to SessionBuilder
  - [ ] Navigation and save flow

### 3.4 Create Alternative Training Builder
- [ ] Create `components/coach/alternative/AlternativeSessionBuilder.tsx`
  - [ ] Support cycling, swimming, DWR, elliptical
  - [ ] Duration and intensity fields
  - [ ] TSS equivalency calculation
  - [ ] Similar UI to CardioSessionBuilder

---

## Phase 4: Program Generation Form Improvements

### 4.1 Update Methodology Selection
- [x] Update `components/programs/ProgramGenerationForm.tsx`
  - [x] Rename "MANUAL" to "CUSTOM" in schema and UI
  - [x] Update description: "Create a blank program and build it from scratch"
  - [x] Add prominent call-to-action for custom builder
  - [x] Add info banner explaining custom workflow

### 4.2 Custom Program Onboarding
- [ ] Create `components/programs/CustomProgramOnboarding.tsx`
  - [ ] Show quick tutorial on first custom program creation
  - [ ] Explain "+ Add Session" workflow
  - [ ] Explain session type changing
  - [ ] Add "Don't show again" option
  - [ ] Store preference in localStorage

---

## Phase 5: UI/UX Enhancements

### 5.1 Session Type Indicators
- [ ] Add to `ProgramCalendar.tsx`
  - [ ] Color coding for session types
  - [ ] Icons for quick visual identification
  - [ ] Legend/key showing colors/icons

### 5.2 Drag-and-Drop (Future Enhancement)
- [ ] Research dnd-kit for workout reordering between days
  - [ ] Drag workouts to different days
  - [ ] Reorder workouts within same day
  - [ ] Visual feedback during drag

### 5.3 Quick Actions Menu
- [ ] Add context menu to workout cards (right-click)
  - [ ] Edit
  - [ ] Duplicate
  - [ ] Change Type
  - [ ] Move to Another Day
  - [ ] Delete

---

## Phase 6: Testing & Validation

### 6.1 Component Testing
- [ ] Test SessionTypeDialog in isolation
- [ ] Test ProgramCalendar with all session types
- [ ] Test studio save/navigation flow
- [ ] Test empty program generation

### 6.2 End-to-End Testing
- [ ] Create custom program from form
- [ ] Add running session to day 1
- [ ] Add strength session to day 1 (double day)
- [ ] Change running session to core session
- [ ] Delete a session
- [ ] Mark a day as rest
- [ ] Verify database state after all operations

### 6.3 Edge Cases
- [ ] Test with multiple programs
- [ ] Test with athlete accounts (should not see edit buttons)
- [ ] Test authorization (can only edit own programs)
- [ ] Test with very long program (52 weeks)
- [ ] Test concurrent edits

---

## Phase 7: Documentation

### 7.1 User Documentation
- [ ] Update `CLAUDE.md` with custom program builder info
- [ ] Add screenshots/examples to docs
- [ ] Document session type limitations
- [ ] Document best practices

### 7.2 Developer Documentation
- [ ] Document new API endpoints in `docs/API_REFERENCE.md`
- [ ] Add JSDoc comments to new components
- [ ] Update database schema documentation if needed

---

## Phase 8: Polish & Optimization

### 8.1 Performance
- [ ] Optimize calendar rendering with many workouts
- [ ] Add loading states to all async operations
- [ ] Implement optimistic UI updates

### 8.2 Accessibility
- [ ] Add keyboard shortcuts for common actions
- [ ] Ensure screen reader compatibility
- [ ] Add proper ARIA labels

### 8.3 Mobile Experience
- [ ] Test on mobile devices
- [ ] Adjust button sizes for touch
- [ ] Ensure modals work well on small screens

---

## Implementation Priority

### 🔴 Critical (Must Have)
- Phase 1: Session Type Management
- Phase 2: API Endpoints (sections 2.1, 2.2, 2.3, 2.4)
- Phase 3.1 & 3.2: Update existing studios
- Phase 4.1: Update methodology selection

### 🟡 Important (Should Have)
- Phase 3.3: Core Session Builder
- Phase 4.2: Custom Program Onboarding
- Phase 5.1: Session Type Indicators
- Phase 6: Testing & Validation

### 🟢 Nice to Have (Could Have)
- Phase 3.4: Alternative Training Builder
- Phase 5.2: Drag-and-Drop
- Phase 5.3: Quick Actions Menu
- Phase 8: Polish & Optimization

---

## Estimated Timeline
- Phase 1-2 (Critical): 4-6 hours
- Phase 3-4 (Critical): 3-4 hours
- Phase 5-6 (Important): 3-4 hours
- Phase 7-8 (Nice to Have): 2-3 hours

**Total: ~12-17 hours of development**

---

## Success Criteria
✅ Coach can create a blank custom program
✅ Coach can add any type of session to any day
✅ Coach can convert session types (running → strength)
✅ Coach can delete sessions
✅ Coach can create double-day training (e.g., run AM + strength PM)
✅ All studios properly redirect back to calendar
✅ Changes persist in database correctly
✅ UI is intuitive and responsive

---

## Notes & Considerations
- Consider caching program data to reduce API calls
- Think about undo/redo functionality for complex editing
- Consider adding templates/presets for common session types
- Future: AI-assisted session suggestions based on program context
