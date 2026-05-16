# Clickable AI Skill Selection Implementation Plan

## Goal

Let coaches and, later, eligible athletes steer the AI by selecting one or more expert knowledge skills before asking for an answer, report, plan, or analysis.

The current system already supports:

- automatic skill retrieval from the knowledge library
- text commands such as "Vilka AI skills kan du använda?"
- text commands such as "Använd Norsk Dubbeltröskelmetod och Laktattröskeltest"
- skill usage visibility in chat and canvas responses

The clickable version should keep those text controls, but add a deliberate UI layer.

## Surfaces

### Coach Floating AI

Highest priority.

- Add a `Skills` button near the chat input.
- Open a searchable multi-select picker.
- Show selected skills as chips above the input.
- Send selected skills with each `/api/ai/chat` request.
- Keep a max selection limit, initially `5`.
- Show which skills were used after the response.

### AI Canvas

High priority.

- Add the same picker to the prompt/control area.
- Selected skills apply to generation and block regeneration.
- Show selected/used skills near the model label or canvas receipt.
- Best fit for reports, audits, test interpretation, return-to-training plans, and team summaries.

### AI Studio

Medium priority.

- Add the picker to AI Studio context controls.
- Persist selected skills per conversation or until cleared.
- Send selected skills to `/api/ai/chat`.
- Show used skills in conversation metadata.

### Athlete Floating AI

Later phase.

- Add after coach surfaces are stable.
- Gate by role, tier, and safety category.
- Coached athletes can get safe educational/support skills unless disabled later by coach/business settings.
- Self-coached athletes can use a safe subset with stricter guardrails.

### Voice

Floating AI voice should support spoken selection using the existing text command path:

- "Använd norsk dubbeltröskel och laktattröskeltest."
- Assistant confirms the selected skills in words.
- The text UI can show the same selected skill chips.

Live workout voice should not receive the full skill library yet. It should stay focused on workout control, short cues, and safety.

## Access Rules

### Full Library

Available to:

- Coach Floating AI
- AI Canvas
- AI Studio
- platform/business admin contexts

### Athlete Safe Subset

Suggested first allowed set:

- Training zones
- Recovery
- Nutrition
- Strength for endurance
- Race day
- Sport-specific basics
- Injury prevention in non-medical language

Restrict or soften:

- rehab-heavy guidance
- medical-adjacent interpretation
- advanced testing conclusions without coach review or sufficient data
- aggressive high-performance programming

## Backend Contract

Add `selectedSkillIds?: string[]` to:

- `/api/ai/chat`
- `/api/ai/canvas/generate`

Resolution order:

1. If `selectedSkillIds` are present, use those skills first.
2. Else if the text explicitly asks for skills by name, resolve from text.
3. Else use existing auto-match behavior.

Responses should continue to return:

- `skillsUsed`
- `X-Knowledge-Skills` header for streaming chat

Invalid or inaccessible selected skills should not crash the request. The assistant should be told which selected IDs could not be used so it can respond visibly.

## Reusable UI Component

Create an `AISkillPicker` component with:

- grouped categories
- search
- multi-select
- selected chips
- clear all
- max selection limit
- compact trigger button

Recommended lightweight API:

- `GET /api/ai/skills`
- returns active skills with id, name, category, keywords, description, and access flags

## Build Order

### Phase 1: Backend Selection Pipe

- Add `selectedSkillIds` to chat request type.
- Add `selectedSkillIds` to canvas request schema.
- Add resolver for selected active knowledge skills by ID.
- Use selected skills before text or auto matching.
- Preserve existing text commands and auto retrieval.
- Add tests for selected ID resolution.

### Phase 2: Reusable Picker

- Build `AISkillPicker`. Done in `components/ai/AISkillPicker.tsx`.
- Add lightweight list endpoint. Done in `/api/ai/skills`.
- Keep the component presentational and reusable. The picker owns search/loading/chips, while parent surfaces own selected IDs.

### Phase 3: Floating Coach AI

- Add picker and selected chips. Done in `components/ai-studio/FloatingAIChat.tsx`.
- Send `selectedSkillIds` in chat body. Done for coach floating AI requests.
- Show used skills after response. Existing `X-Knowledge-Skills` receipt remains visible under responses.

### Phase 4: AI Canvas

- Add picker to canvas controls. Done in `components/ai-canvas/AICanvasClient.tsx`.
- Send selected skills for generation and block regeneration. Done for `/api/ai/canvas/generate`.
- Show selected/used skill chips. Selected chips live in the picker, and used skills are shown in the AI response panel.

### Phase 5: AI Studio

- Add picker to AI Studio context controls. Done in `components/ai-studio/ContextPanel.tsx`.
- Persist selections per active conversation. Done in `components/ai-studio/AIStudioClient.tsx` using per-conversation local storage.
- Send selected skills to `/api/ai/chat`. Done via the AI Studio chat body.
- Show used skills in conversation metadata. Existing `X-Knowledge-Skills` receipt remains visible under responses.

### Phase 6: Athlete Rules

- Add safe subset filtering. Done with `lib/ai/skill-access.ts` and enforced by `/api/ai/skills` plus chat context resolution.
- Gate by tier and self-coached/coached status. Done: athletes must have AI chat access, coached athletes get a broader educational subset, and self-coached athletes get a narrower subset with stricter prompt guardrails.

### Phase 7: Voice Polish

- Keep spoken skill selection via natural language. Done through the existing transcribe-to-chat path.
- Sync spoken/text skill selections to visible chips. Done in athlete floating chat when the user explicitly asks to use/pull skills and the response reports used skills.

### Phase 8: Live Voice Safe Modes

- Do not add full library. Done: realtime voice instructions explicitly avoid the full knowledge library.
- Add curated modes such as pacing, form cues, recovery, strength logging, and HYROX pacing. Done in `/api/ai/chat/realtime-call` as constrained realtime modes, with coach/athlete defaults wired from floating chat.

### Phase 9: Conversation Persistence

- Persist AI Studio selected skills on the conversation record. Done with `AIConversation.selectedSkillIds`.
- Keep local browser storage as a fallback for drafts and failed metadata updates.

## First Useful Milestone

Coach Floating AI can click `Skills`, select up to five expert skills, ask a question, and receive a response that visibly confirms which skills were used.
