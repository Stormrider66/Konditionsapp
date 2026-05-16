# AI Canvas Implementation Plan

## Executive Summary

Build an **AI Canvas**: a flexible workspace where coaches can ask for reports, statistics, analytics, plans, summaries, comparisons, and follow-up actions, then edit the result as structured blocks.

The canvas should feel like a working surface, not a chat transcript. The floating AI is good for quick actions and navigation. The AI Canvas should be where bigger thinking happens: athlete reviews, team summaries, planning documents, progress reports, test analysis, program audits, and coach briefings.

The best path is to start with a focused coach-only MVP, then connect it progressively to live platform data, exports, sharing, and eventually an internal founder/admin version.

## Product Positioning

### What It Is

- A blank workspace where the coach can generate structured work.
- A place to combine AI, athlete data, team data, tests, workouts, readiness, notes, and documents.
- A persistent document surface made of editable blocks.
- A bridge between chat, analytics, reports, and planning.

### What It Is Not

- Not a replacement for the dashboard.
- Not a free-form design tool like Figma.
- Not an autonomous agent that silently changes athlete data.
- Not the first place for quick navigation; the floating AI already owns that job.

## End-State Workflow

1. Coach opens **AI Canvas** from the coach dashboard or floating AI.
2. Coach chooses a starting point:
   - Blank canvas
   - Athlete report
   - Team overview
   - Weekly planning
   - Test analysis
   - Program review
   - Return-to-play plan
3. Coach selects context:
   - Athlete or team
   - Date range
   - Tests, sessions, readiness, programs, notes, documents
4. Coach asks a natural-language request:
   - "Create a progress report for David."
   - "Compare the team readiness this week."
   - "Build a 4-week threshold block from the latest test."
   - "Find athletes whose test data is getting stale."
5. AI creates editable blocks:
   - Summary
   - Metrics
   - Tables
   - Charts
   - Recommendations
   - Checklists
   - Training plan sections
   - Follow-up actions
6. Coach edits, regenerates, adds blocks, exports, or shares.
7. Any risky action, such as messaging an athlete or changing a program, is confirmed before it happens.

## Phase 1: Canvas Foundation

**Goal:** Build the first usable AI Canvas without deep live-data dependencies.

### Scope

- Add a coach-only AI Canvas page under the business-scoped coach area.
- Create a clean workspace UI with:
  - Canvas title
  - Prompt input
  - Block list
  - Empty state templates
  - Save status
  - Basic loading and error states
- Support first block types:
  - Heading
  - Text
  - Checklist
  - Table
  - Insight card
  - Action list
- Add an AI generation endpoint that returns structured canvas blocks.
- Use strict schema validation so AI output cannot break the UI.
- Log AI usage under a new canvas usage category.

### Templates

- Blank canvas
- Athlete review draft
- Weekly coach briefing
- Team risk scan
- Program planning notes

### Done Means

- A coach can open the canvas, type a request, and receive editable structured content.
- The canvas never renders raw AI text as unsafe UI.
- Every generated response tells the coach what it created or why it could not complete the request.
- AI usage is tracked.

### Why This Comes First

This gives us the product feeling quickly. It lets us test whether the canvas actually feels useful before investing heavily in deeper analytics and database write flows.

## Phase 2: Data Context Picker

**Goal:** Let the coach connect the canvas to real platform data.

### Scope

- Add a context sidebar or compact context panel.
- Let coach select:
  - Athlete
  - Team
  - Date range
  - Test data
  - Training sessions
  - Program data
  - Readiness data
  - Notes and flags
- Build read-only context builders that collect safe, summarized data.
- Keep all calculations deterministic where possible.
- Make the AI cite which context it used in a small "Used context" section.

### First Data Connections

- Latest tests
- Test age and stale-test detection
- Weekly session completion
- Upcoming sessions
- Athlete profile and goals
- Program summary
- Readiness snapshot if available

### Done Means

- Coach can generate a real athlete or team report from selected data.
- The AI can explain what data it used.
- The canvas does not invent missing metrics; it says when data is missing.
- Tenant boundaries are enforced.

## Phase 3: Analytics Blocks

**Goal:** Make the canvas useful for statistics and decision support, not only written reports.

### Scope

- Add analytics-specific blocks:
  - Metric row
  - Trend summary
  - Athlete comparison table
  - Risk list
  - Recommendation list
  - Simple chart block
- Build deterministic analytics helpers for common coach questions.
- Let AI combine analytics blocks with plain-language interpretation.

### First Analytics Use Cases

- "Who needs a new test?"
- "Which athletes have missed sessions recently?"
- "Who is trending positively?"
- "Which athletes need follow-up?"
- "Summarize team readiness this week."
- "Compare latest lactate/VO2/power/speed changes."

### Done Means

- The canvas can produce statistics-backed content.
- Important numbers come from application data, not AI guesses.
- Coach can regenerate only one block without rebuilding the entire canvas.

## Phase 4: Reports, Plans, and Export

**Goal:** Turn canvas output into professional deliverables.

### Scope

- Add document-style templates:
  - Athlete progress report
  - Team monthly report
  - Coach weekly briefing
  - Program audit
  - Test interpretation report
  - Return-to-training plan
- Add export options:
  - PDF
  - Copy/share link
  - Save as internal coach note
- Add "prepare message" flow for athlete-facing content.
- Require confirmation before sending anything to an athlete.

### Done Means

- Coach can create a polished report without leaving the platform.
- Coach can export or share the report.
- Athlete-facing communication is always reviewed before sending.

## Phase 5: Canvas Actions

**Goal:** Let the canvas become a bridge from insight to action.

### Scope

- Add suggested actions from generated blocks:
  - Schedule a test
  - Create follow-up task
  - Draft athlete message
  - Open athlete profile
  - Start program adjustment
  - Add note to athlete timeline
- Use the same "always respond in words" behavior as the floating AI.
- Separate safe actions from confirmed actions.

### Autonomy Rules

| Action | Behavior |
| --- | --- |
| Read data | Allowed |
| Generate report | Allowed |
| Draft message | Allowed |
| Save canvas | Allowed |
| Send message | Confirm first |
| Modify program | Confirm first |
| Change athlete data | Confirm first |
| Delete anything | Confirm first |

### Done Means

- Coach can go from AI insight to next step without hunting around the app.
- Risky actions are never silent.
- The canvas clearly says what it did or why it could not do it.

## Phase 6: Founder/Admin Canvas

**Goal:** Add a separate internal workspace for business intelligence, product planning, and operations.

### Scope

- Add admin-only canvas mode.
- Connect it to platform-level data:
  - Signups
  - Trials
  - Subscription tiers
  - AI usage costs
  - Feature usage
  - Support/feedback
  - Operator agent output
- Generate:
  - Founder briefings
  - Cost reports
  - Growth analysis
  - Roadmaps
  - Launch checklists
  - Product analytics summaries

### Done Means

- Founder/admin can use the same canvas concept for company operations.
- Customer data access is admin-gated and audit-friendly.
- This stays separate from coach-facing canvases.

## Recommended Build Order

1. **Phase 1A:** Static canvas page, block renderer, prompt bar, templates.
2. **Phase 1B:** AI generation endpoint with structured block output.
3. **Phase 1C:** Save/load canvas documents.
4. **Phase 2A:** Athlete/team context picker.
5. **Phase 2B:** Read-only context builders.
6. **Phase 3A:** Analytics blocks and deterministic metrics.
7. **Phase 4A:** Report templates.
8. **Phase 4B:** PDF/share/export.
9. **Phase 5:** Confirmed actions from canvas.
10. **Phase 6:** Admin/founder canvas.

## Suggested Data Model

### `AICanvas`

- `id`
- `businessId`
- `ownerUserId`
- `title`
- `scope` (`COACH`, `ADMIN`)
- `status` (`DRAFT`, `ARCHIVED`)
- `createdAt`
- `updatedAt`

### `AICanvasBlock`

- `id`
- `canvasId`
- `type`
- `position`
- `contentJson`
- `source`
- `createdAt`
- `updatedAt`

### `AICanvasGeneration`

- `id`
- `canvasId`
- `userId`
- `prompt`
- `contextSummaryJson`
- `model`
- `provider`
- `usageLogId`
- `status`
- `createdAt`

## AI Guardrails

- All AI output must pass Zod validation before rendering.
- Use structured JSON responses, not markdown parsing, for canvas blocks.
- Require tenant checks before loading athlete or team context.
- Treat generated recommendations as coach-assistive, not medical authority.
- Do not let the AI silently claim it changed data unless an action actually succeeded.
- Use cost tracking from the first AI endpoint.
- Add tier limits before broad release:
  - Free/basic: limited canvases and generations
  - Pro: larger context and exports
  - Enterprise: team analytics and admin-style reporting

## UX Principles

- The first screen should be the workspace, not a marketing page.
- Empty state should offer useful starting templates immediately.
- Generated content should be editable.
- Every generated block should be easy to regenerate or remove.
- The UI should stay calm and work-focused.
- Use canvas for deep work, floating AI for quick navigation and small actions.

## MVP Success Criteria

- A coach can create a useful report or plan in under two minutes.
- The result is structured enough to edit, export, and reuse.
- The coach understands what data was used.
- The AI communicates clearly when something is missing.
- The feature feels meaningfully different from normal chat.

## Risks

| Risk | Mitigation |
| --- | --- |
| Canvas becomes too broad | Start with coach reports and planning only |
| AI invents statistics | Use deterministic context builders and validated blocks |
| UI becomes cluttered | Use block-based editing, not a complex infinite design board in MVP |
| Costs grow too fast | Log usage from Phase 1 and gate by tier |
| Users do not understand where to start | Provide strong templates and examples |

## Recommendation

This is worth focusing on after the current floating AI foundation because it turns the assistant from a navigation/helper layer into a **work product layer**. The floating AI helps the coach move through the app. The AI Canvas helps the coach produce something valuable.

The right next step is **Phase 1A**: build the coach AI Canvas page, block renderer, prompt bar, and starter templates without deep analytics yet.
