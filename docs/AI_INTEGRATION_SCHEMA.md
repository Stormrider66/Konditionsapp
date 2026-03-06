# AI Integration Schema

> Complete mapping of all AI integrations across coach and athlete views,
> in both legacy (`/coach`, `/athlete`) and business-scoped (`/[businessSlug]/coach`, `/[businessSlug]/athlete`) pages.
>
> **Purpose:** Reference for updating models, optimizing model selection per feature, and tracking AI surface area.
>
> Last updated: 2026-03-06

---

## Table of Contents

1. [Model Tier System](#1-model-tier-system)
2. [Provider Priority & BYOK](#2-provider-priority--byok)
3. [Feature → Model Intent Mapping](#3-feature--model-intent-mapping)
4. [Coach AI Features](#4-coach-ai-features)
5. [Athlete AI Features](#5-athlete-ai-features)
6. [Cron / Background AI Jobs](#6-cron--background-ai-jobs)
7. [Page Mapping: Business vs Legacy](#7-page-mapping-business-vs-legacy)
8. [API Route Reference](#8-api-route-reference)
9. [Component Reference](#9-component-reference)
10. [Cost & Token Estimates](#10-cost--token-estimates)
11. [Model Update Checklist](#11-model-update-checklist)

---

## 1. Model Tier System

All AI features use **ModelIntent** — a provider-agnostic tier that maps to concrete models per provider.

| Intent | Anthropic | Google | OpenAI | Use Case |
|--------|-----------|--------|--------|----------|
| `fast` | Claude Haiku 4.5 | Gemini 3.1 Flash Lite | GPT-5.3 Instant | Quick tasks, nudges, memory extraction |
| `balanced` | Claude Sonnet 4.6 | Gemini 3 Flash | GPT-5 Mini | Chat, WOD, nutrition, most features |
| `powerful` | Claude Opus 4.6 | Gemini 3.1 Pro | GPT-5.4 | Program generation, deep analysis |

**Defined in:** `types/ai-models.ts` → `MODEL_TIERS`
**Resolved by:** `resolveModel(apiKeys, intent)` in `types/ai-models.ts`
**Instantiated by:** `createModelInstance(resolved)` in `lib/ai/create-model.ts`

### Hardcoded Models (bypass ModelIntent)

| Constant | Model ID | Used For |
|----------|----------|----------|
| `GEMINI_MODELS.VIDEO_ANALYSIS` | `gemini-3-flash-preview` | Video analysis, lactate OCR |
| `GEMINI_MODELS.IMAGE_GENERATION` | `gemini-2.5-flash-image` | Chart/image generation |
| `GEMINI_MODELS.PRO` | `gemini-2.5-pro` | Deep Think periodization |
| OpenAI `text-embedding-ada-002` | — | All embeddings (RAG) |
| OpenAI `o4-mini` / `o3` | — | Deep research (OpenAI provider) |

**Defined in:** `lib/ai/gemini-config.ts`

---

## 2. Provider Priority & BYOK

### Resolution Order (cheapest-first)
```
Google → Anthropic → OpenAI
```

### Key Hierarchy (fallback)
```
User's own keys → Business-level keys → Platform admin keys
```

Athletes automatically use their **coach's keys**. If no coach, falls back to platform admin.

**Files:**
- `lib/user-api-keys.ts` — encryption, decryption, key resolution
- `lib/ai/user-ai-config.ts` — user config, default model
- `lib/crypto/secretbox.ts` — libsodium encryption

---

## 3. Feature → Model Intent Mapping

This is the key reference for optimizing which models are used where.

| Feature | Default Intent | Configurable? | Notes |
|---------|---------------|---------------|-------|
| **AI Chat** (coach) | User-selected | Yes (ModelSelector) | Can switch fast/balanced/powerful per message |
| **AI Chat** (athlete) | `balanced` | Via coach preference | Coach sets athlete model preference |
| **WOD Generation** | `balanced` | Via `intent` param | Could use `fast` for simple workouts |
| **Program Generation** | `powerful` | No | Long output, complex reasoning needed |
| **Nutrition Plan** | `balanced` | No | `resolveModel(keys, 'balanced')` |
| **Video Analysis** | Hardcoded Gemini | No | Requires multimodal (video input) |
| **Lactate OCR** | Hardcoded Gemini | No | Multimodal image input |
| **Food Photo Scan** | Hardcoded Gemini Flash | No | Multimodal image input |
| **Performance Analysis** | `balanced` | No | Test analysis, trends, correlations |
| **Morning Briefings** | `fast` | No | Short, automated daily text |
| **Pre-workout Nudges** | `fast` | No | Short motivational messages |
| **Post-workout Check-ins** | `fast` | No | Short recovery prompts |
| **Memory Extraction** | `fast` | No | Background, small output |
| **Pattern Detection** | `fast` | No | Automated analysis |
| **Milestone Detection** | `fast` | No | Automated recognition |
| **Deep Research (Gemini)** | Gemini 3.1 Pro | No | Long-running research |
| **Deep Research (OpenAI)** | o4-mini / o3 | Tier-based | Quick/Standard/Deep/Expert |
| **Coach Style Matching** | `balanced` | No | Methodology extraction |
| **Periodization Analysis** | `balanced` + Deep Think | No | Gemini Deep Think optional |
| **Injury Risk Prediction** | Algorithmic | No | ML-based, not LLM |
| **Voice Workout Parsing** | `balanced` | No | Intent + entity extraction |
| **Conversation Messages** | `balanced` (fallback) | No | Coach-athlete threads |
| **Embeddings** | ada-002 (fixed) | No | OpenAI only, for RAG |
| **Chart Generation** | Gemini image model | No | Visual output |
| **Visual Reports** | Gemini image model | No | Infographic generation |

### Optimization Opportunities

Areas where you could **downgrade to `fast`** to save cost:
- WOD generation (for simple/standard workouts)
- Conversation messages (for quick replies)
- Coach style matching (if cached)

Areas where `powerful` would **improve quality**:
- Performance analysis (complex multi-test analysis)
- Periodization analysis (nuanced methodology decisions)
- Nutrition plans (for athletes with complex requirements)

---

## 4. Coach AI Features

### Pages & API Routes

| Feature | Business Page | Legacy Page | API Route | Intent |
|---------|--------------|-------------|-----------|--------|
| AI Studio (chat) | `/[slug]/coach/ai-studio` | `/coach/ai-studio` | `/api/ai/chat` | User-selected |
| Program Generation | `/[slug]/coach/programs/new` | `/coach/programs/new` | `/api/agent/program/generate` | `powerful` |
| Video Analysis | `/[slug]/coach/video-analysis` | `/coach/video-analysis` | `/api/video-analysis/[id]/analyze` | Gemini hardcoded |
| Voice Workout | — (component) | — (component) | `/api/coach/voice-workout` | `balanced` |
| Deep Research | — (AI Studio panel) | — (AI Studio panel) | `/api/ai/deep-research` | Gemini Pro / o3 |
| AI Settings | `/[slug]/coach/settings/ai` | `/coach/settings/ai` | `/api/settings/api-keys` | — (config) |
| AI Cost Tracking | `/[slug]/coach/settings/ai-kostnader` | `/coach/settings/ai-kostnader` | `/api/ai/budget/usage` | — (data) |
| Cross-training | `/[slug]/coach/cross-training` | `/coach/cross-training` | `/api/ai/advanced-intelligence/*` | `balanced` |
| Fitness Projection | `/[slug]/coach/cross-training/projection` | `/coach/cross-training/projection` | `/api/ai/advanced-intelligence/predictions` | `balanced` |
| Agent Oversight | `/[slug]/coach/agent-oversight` | `/coach/agent-oversight` | `/api/agent/*` | — (management) |
| Agent Metrics | `/[slug]/coach/agent-metrics` | `/coach/agent-metrics` | `/api/agent/metrics` | — (data) |
| Documents (RAG) | `/[slug]/coach/documents` | `/coach/documents` | `/api/knowledge/*` | ada-002 embeddings |

### Coach-Only Components
- `components/ai-studio/AIStudioClient.tsx` — main chat UI
- `components/ai-studio/FloatingAIChat.tsx` — floating widget
- `components/ai-studio/ModelSelector.tsx` — model/intent picker
- `components/ai-studio/DeepResearchPanel.tsx` — research interface
- `components/ai-studio/AIBudgetSettings.tsx` — budget config
- `components/coach/video-analysis/*` — video analysis suite

---

## 5. Athlete AI Features

### Pages & API Routes

| Feature | Business Page | Legacy Page | API Route | Intent |
|---------|--------------|-------------|-----------|--------|
| Floating Chat | — (global component) | — (global component) | `/api/ai/chat` | `balanced` (coach-set) |
| WOD Generator | `/[slug]/athlete/wod/[id]` | `/athlete/wod/[id]` | `/api/ai/wod` | `balanced` |
| WOD History | `/[slug]/athlete/wod/history` | `/athlete/wod/history` | `/api/ai/wod/history` | — (data) |
| Programs | `/[slug]/athlete/programs` | `/athlete/programs` | `/api/programs/*` | — (data) |
| Program Report | `/[slug]/athlete/program/report` | `/athlete/program/report` | `/api/programs/[id]/report` | `balanced` |
| Video Analysis | `/[slug]/athlete/video-analysis` | `/athlete/video-analysis` | `/api/video-analysis/*` | Gemini hardcoded |
| Nutrition | `/[slug]/athlete/nutrition` | `/athlete/nutrition` | `/api/ai/nutrition-plan` | `balanced` |
| Food Scan | — (nutrition component) | — (nutrition component) | `/api/ai/food-scan` | Gemini Flash |
| Voice Workout Log | `/[slug]/athlete/log-workout/voice` | `/athlete/log-workout/voice` | `/api/coach/voice-workout` | `balanced` |
| Research (shared) | `/[slug]/athlete/research` | `/athlete/research` | `/api/ai/deep-research/[id]` | — (read-only) |
| AI Onboarding | — | `/athlete/onboarding/ai-assessment` | `/api/agent/onboarding` | `powerful` |
| AI Settings Info | `/[slug]/athlete/settings/ai-info` | `/athlete/settings/ai-info` | `/api/athlete/subscription-status` | — (data) |
| AI Notifications | `/[slug]/athlete/settings/ai-notifications` | `/athlete/settings/ai-notifications` | `/api/settings/notifications` | — (config) |
| Agent Preferences | — | `/athlete/settings/agent` | `/api/agent/preferences` | — (config) |

### Athlete-Only Components
- `components/athlete/ai/AthleteFloatingChat.tsx` — chat widget
- `components/athlete/ai/AISuggestionsBanner.tsx` — suggestions
- `components/athlete/ai-coach/AIAssessmentWizard.tsx` — onboarding wizard
- `components/athlete/ai-coach/AICoachPanel.tsx` — AI coach recommendations
- `components/athlete/wod/WODGeneratorModal.tsx` — WOD UI
- `components/athlete/video/AthleteVideoUploader.tsx` — video upload

---

## 6. Cron / Background AI Jobs

All require `CRON_SECRET` header. These run automatically — cost adds up.

| Cron Job | API Route | Intent | Schedule | Cost Impact |
|----------|-----------|--------|----------|-------------|
| Morning Briefings | `/api/cron/morning-briefings` | `fast` | Daily ~7 AM | Per-athlete daily |
| Pre-workout Nudges | `/api/cron/preworkout-nudges` | `fast` | Before workouts | Per-workout |
| Post-workout Check-ins | `/api/cron/post-workout-checkins` | `fast` | After workouts | Per-workout |
| Pattern Detection | `/api/cron/pattern-detection` | `fast` | Nightly | Per-athlete |
| Milestone Detection | `/api/cron/milestone-detection` | `fast` | Nightly | Per-athlete |
| Weekly Summary | `/api/cron/weekly-summary` | `balanced` + image | Weekly (Mon) | Per-athlete |
| Poll Program Generation | `/api/cron/poll-program-generation` | — (polling) | Every 30s | No AI cost |
| Poll Research | `/api/cron/poll-research` | — (polling) | Every 30s | No AI cost |
| Reset AI Usage | `/api/cron/reset-ai-usage` | — (DB) | Monthly | No AI cost |
| Reset Budgets | `/api/cron/reset-budgets` | — (DB) | Monthly | No AI cost |

---

## 7. Page Mapping: Business vs Legacy

Both versions call the **same API routes** and use the **same components**. The business-scoped pages add multi-tenant context (`businessSlug`).

### Parity Check

| Feature | Business Coach | Legacy Coach | Business Athlete | Legacy Athlete |
|---------|:---:|:---:|:---:|:---:|
| AI Studio / Chat | Yes | Yes | Yes (floating) | Yes (floating) |
| Program Generation | Yes | Yes | — | — |
| Video Analysis | Yes | Yes | Yes | Yes |
| WOD | — | — | Yes | Yes |
| Nutrition | — | — | Yes | Yes |
| Food Scan | — | — | Yes | Yes |
| Voice Workout | Yes | Yes | Yes | Yes |
| Deep Research | Yes | Yes | Read-only | Read-only |
| AI Settings | Yes | Yes | Info only | Info only |
| Cost Tracking | Yes | Yes | — | — |
| Cross-training | Yes | Yes | — | — |
| Agent Oversight | Yes | Yes | — | — |
| AI Onboarding | — | — | — | Yes (legacy only) |
| Agent Preferences | — | — | — | Yes (legacy only) |

**Legacy-only features (not yet in business routes):**
- Athlete AI onboarding assessment (`/athlete/onboarding/ai-assessment`)
- Agent preferences (`/athlete/settings/agent`)

---

## 8. API Route Reference

### Core AI Routes

| Route | Method | Feature | Intent | Streaming |
|-------|--------|---------|--------|-----------|
| `/api/ai/chat` | POST | AI Chat | User-selected | Yes (SSE) |
| `/api/ai/wod` | POST | WOD Generation | `balanced` | Yes |
| `/api/ai/nutrition-plan` | POST | Nutrition Planning | `balanced` | No |
| `/api/ai/food-scan` | POST | Food Photo Analysis | Gemini Flash | No |
| `/api/ai/food-scan/refine` | POST | Food Refinement | Gemini Flash | No |
| `/api/ai/lactate-ocr` | POST | Lactate Meter OCR | Gemini | No |
| `/api/ai/save-program` | POST | Save AI Program | — | No |
| `/api/ai/generate-chart` | POST | Chart Generation | Gemini image | No |
| `/api/ai/generate-visual-report` | POST | Visual Reports | Gemini image | No |
| `/api/ai/conversations/[id]/message` | POST | Conversation Thread | `balanced` | Yes |

### Performance Analysis

| Route | Method | Feature | Intent |
|-------|--------|---------|--------|
| `/api/ai/performance-analysis/analyze-test` | POST | Single Test Analysis | `balanced` |
| `/api/ai/performance-analysis/trends` | POST | Multi-test Trends | `balanced` |
| `/api/ai/performance-analysis/training-correlation` | POST | Training ↔ Performance | `balanced` |
| `/api/ai/performance-analysis/compare-tests` | POST | A/B Test Comparison | `balanced` |

### Advanced Intelligence

| Route | Method | Feature | Intent |
|-------|--------|---------|--------|
| `/api/ai/advanced-intelligence/patterns` | GET | Training Patterns | ML (no LLM) |
| `/api/ai/advanced-intelligence/predictions` | GET | Performance Predictions | ML (no LLM) |
| `/api/ai/advanced-intelligence/periodization` | GET | Periodization Analysis | `balanced` + Deep Think |
| `/api/ai/advanced-intelligence/injury-risk` | GET | Injury Risk | ML (no LLM) |
| `/api/ai/advanced-intelligence/coach-style` | GET | Coach Style Matching | `balanced` |

### Deep Research

| Route | Method | Feature | Provider |
|-------|--------|---------|----------|
| `/api/ai/deep-research` | POST | Start Research | Gemini Pro / OpenAI o4-mini / o3 |
| `/api/ai/deep-research/[sessionId]` | GET | Poll Progress | — |
| `/api/ai/deep-research/[sessionId]/save` | POST | Save Results | — |

### Video & Voice

| Route | Method | Feature | Model |
|-------|--------|---------|-------|
| `/api/video-analysis/[id]/analyze` | POST | Video Analysis | Gemini (direct SDK) |
| `/api/coach/voice-workout` | POST | Voice to Workout | `balanced` |

### Config & Budget

| Route | Method | Feature |
|-------|--------|---------|
| `/api/ai/config` | GET | AI Configuration |
| `/api/ai/models` | GET | Available Models |
| `/api/ai/models/preference` | POST | Model Preference |
| `/api/ai/budget` | GET/POST | Budget Limits |
| `/api/ai/budget/usage` | GET | Usage Tracking |

---

## 9. Component Reference

### Shared AI Components

| Component | Location | Used By |
|-----------|----------|---------|
| `AIStudioClient` | `components/ai-studio/` | Coach chat |
| `FloatingAIChat` | `components/ai-studio/` | Coach floating widget |
| `AthleteFloatingChat` | `components/athlete/ai/` | Athlete chat |
| `ModelSelector` | `components/ai-studio/` | Intent/model picker |
| `DeepResearchPanel` | `components/ai-studio/` | Research UI |
| `WODGeneratorModal` | `components/athlete/wod/` | WOD creation |
| `AIAssessmentWizard` | `components/athlete/ai-coach/` | Onboarding |
| `AICoachPanel` | `components/athlete/ai-coach/` | AI coach recs |
| `VideoUploader` | `components/coach/video-analysis/` | Video upload |
| `AthleteVideoUploader` | `components/athlete/video/` | Athlete video |
| `RunningGaitDashboard` | `components/coach/video-analysis/` | Gait analysis |
| `AIBudgetSettings` | `components/ai-studio/` | Budget config |
| `CostEstimate` | `components/ai-studio/` | Cost display |
| `ProgramPreview` | `components/ai-studio/` | Program preview |

---

## 10. Cost & Token Estimates

From `lib/ai/cost-data.ts`:

| Feature | Input Tokens | Output Tokens | Typical Monthly Uses |
|---------|-------------|---------------|---------------------|
| Chat | 2,000 | 800 | 10-80 |
| WOD | 3,000 | 1,500 | 5-30 |
| Program Gen | 5,000 | 8,000 | 1-3 |
| Nutrition | 3,000 | 3,000 | 1-2 |
| Morning Briefing | 2,000 | 600 | 15-30 (auto) |
| Memory Extraction | 1,500 | 400 | 5-40 (auto) |
| Performance Analysis | 4,000 | 2,000 | 0-5 |
| Video Analysis | 5,000 | 2,000 | 0-3 |

### Monthly Cost Per Athlete (estimated, using cheapest `fast` Gemini)

| Profile | Gemini 3.1 Flash Lite | Claude Haiku 4.5 | GPT-5.3 Instant |
|---------|----------------------|-------------------|-----------------|
| Light | ~$0.02 | ~$0.04 | ~$0.03 |
| Normal | ~$0.08 | ~$0.15 | ~$0.10 |
| Heavy | ~$0.25 | ~$0.50 | ~$0.35 |

---

## 11. Model Update Checklist

When updating models (e.g., new Anthropic/Google/OpenAI release):

### Files to Update

1. **`types/ai-models.ts`** — `MODEL_TIERS` mapping (intent → model IDs)
2. **`types/ai-models.ts`** — `AVAILABLE_MODELS` array (pricing, capabilities, display names)
3. **`lib/ai/gemini-config.ts`** — Hardcoded Gemini model constants (if updating Gemini)
4. **`lib/ai/cost-data.ts`** — Token pricing per model
5. **`lib/ai/deep-research/`** — Research-specific model references (o4-mini, o3)
6. **Database `AIModel` table** — Via Prisma if model list is DB-driven

### Testing After Update

1. Verify `resolveModel()` returns correct new model for each intent
2. Test chat streaming with each provider
3. Test structured output (food scan, lactate OCR) — schema compat
4. Test video analysis — Gemini multimodal capabilities
5. Test deep research — provider-specific models
6. Verify cost tracking reflects new pricing
7. Check embedding dimensions haven't changed (1536D for ada-002)

### Key Decision Points

When choosing models for a feature, consider:
- **Latency needs**: Chat/streaming → `fast` or `balanced`
- **Output length**: Program generation → needs high `maxOutputTokens`
- **Multimodal**: Video/image → Gemini only (direct SDK)
- **Structured output**: Food scan, OCR → needs JSON mode support
- **Cost sensitivity**: Cron jobs (run per-athlete daily) → always `fast`
- **Reasoning quality**: Complex analysis → `powerful`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND PAGES                          │
│                                                             │
│  ┌─────────────────────┐   ┌──────────────────────────┐    │
│  │  COACH PAGES        │   │  ATHLETE PAGES            │    │
│  │  ├─ AI Studio       │   │  ├─ Floating Chat         │    │
│  │  ├─ Program Gen     │   │  ├─ WOD Generator         │    │
│  │  ├─ Video Analysis  │   │  ├─ Video Analysis        │    │
│  │  ├─ Deep Research   │   │  ├─ Nutrition / Food Scan │    │
│  │  ├─ Cross-training  │   │  ├─ Voice Workout Log     │    │
│  │  ├─ Voice Workout   │   │  ├─ Programs (view)       │    │
│  │  ├─ Agent Oversight │   │  ├─ Research (read-only)  │    │
│  │  └─ AI Settings     │   │  └─ AI Onboarding         │    │
│  └─────────────────────┘   └──────────────────────────────┘ │
│         │                              │                     │
│  Business: /[slug]/coach/*      Business: /[slug]/athlete/* │
│  Legacy:   /coach/*             Legacy:   /athlete/*        │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTES                              │
│                                                              │
│  /api/ai/chat ──────────────── streamText (SSE)             │
│  /api/ai/wod ───────────────── streamText (SSE)             │
│  /api/ai/nutrition-plan ────── generateText                  │
│  /api/ai/food-scan ─────────── generateObject (Zod)         │
│  /api/ai/lactate-ocr ───────── generateObject (Zod)         │
│  /api/ai/conversations/* ───── generateText                  │
│  /api/ai/performance-analysis/* ─ generateText               │
│  /api/ai/deep-research ─────── provider-specific SDK         │
│  /api/ai/advanced-intelligence/* ─ ML + optional LLM         │
│  /api/video-analysis/* ──────── Google Genai SDK (direct)    │
│  /api/coach/voice-workout ───── generateText                 │
│  /api/agent/program/generate ── orchestrator (multi-step)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   LIB/AI CORE                                │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ resolveModel()  │  │ createModel      │                  │
│  │ (intent-based)  │──│ Instance()       │                  │
│  │                 │  │                  │                  │
│  │ fast / balanced │  │ Anthropic SDK    │                  │
│  │ / powerful      │  │ Google Genai SDK │                  │
│  └─────────────────┘  │ OpenAI SDK       │                  │
│                       └──────────────────┘                  │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ BYOK Keys       │  │ Constitution     │                  │
│  │ User → Business │  │ Safety framework │                  │
│  │ → Platform admin│  │ per domain       │                  │
│  └─────────────────┘  └──────────────────┘                  │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Cost Tracking   │  │ Embeddings (RAG) │                  │
│  │ AIUsageLog      │  │ pgvector + ada   │                  │
│  └─────────────────┘  └──────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   CRON JOBS (automated)                       │
│                                                              │
│  Daily:   morning-briefings, pattern-detection,              │
│           milestone-detection                                │
│  Per-use: preworkout-nudges, post-workout-checkins           │
│  Weekly:  weekly-summary                                     │
│  Polling: poll-program-generation, poll-research             │
│  Monthly: reset-ai-usage, reset-budgets                      │
│                                                              │
│  All background jobs use 'fast' intent (cost optimization)   │
└─────────────────────────────────────────────────────────────┘
```
