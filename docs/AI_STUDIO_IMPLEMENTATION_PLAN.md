# AI-Powered Training Builder - Master Plan

> **Last Updated**: December 2024
> **Status**: ~90% Complete - All phases largely done, minor refinements remaining

---

## Executive Summary

This plan outlines the integration of AI capabilities into the konditionstest-app, building on top of the existing sophisticated training engine. The AI layer will enhance - not replace - the current physiological calculations, methodology implementations, and validation systems.

**Key Concept: AI Studio**
A dedicated workspace where coaches can take athlete data from the traditional program builder and continue into an AI-powered environment with:
- Chat interface for iterative program design
- Document library with selective context loading
- Model selection (Claude 4.5 Opus / Gemini 3 Pro)
- Web search integration for research
- Video upload for technique analysis

**Focus**: Coach/trainer tools for creating optimal programs. Athlete AI assistance is future scope.

---

## Part 1: Current Foundation Status

### Training Engine (99% Complete)
- [x] D-max threshold detection from lactate curves
- [x] 4 elite methodologies (Polarized, Norwegian, Canova, Pyramidal)
- [x] Elite pace zone system with hierarchical priority
- [x] HRV/RHR monitoring and readiness assessment
- [x] Injury management with Delaware pain rules
- [x] Cross-training integration (6 modalities)
- [x] ACWR monitoring for injury prevention
- [x] Multi-system validation cascade

### Strength Training (95% Complete)
- [x] 84-exercise library with biomechanical pillars
- [x] 5-phase periodization (AA → Max Strength → Power → Maintenance → Taper)
- [x] 1RM estimation (Epley/Brzycki)
- [x] 2-for-2 progression rule
- [x] Plateau detection
- [x] Interference scheduling (48h rule)

### Multi-Sport Support (80% Complete)
- [x] 7 sports supported
- [x] Sport-specific onboarding
- [x] Sport-specific coach dashboards
- [ ] Complete program templates for all sports
- [ ] Full athlete portal per sport

### Sport Input Forms Status
| Sport | Form Status | Notes |
|-------|-------------|-------|
| Running | 90% | Most complete, methodology selection |
| HYROX | 85% | Station times, strength PRs |
| Cycling | 40% | Basic FTP, needs power zones |
| Swimming | 30% | CSS basics only |
| Triathlon | 30% | Multi-sport balance incomplete |
| Skiing | 20% | Basic technique selection |
| General Fitness | 20% | Goals only, needs expansion |

### General Fitness Expansion Needed
- [ ] Bioimpedance measurement input (body composition)
- [ ] Weight loss guidance system
- [ ] Nutrition guidance for muscle building
- [ ] BMR/TDEE calculations
- [ ] Macro recommendations
- [ ] Progress tracking with body composition

---

## Part 2: Work In Progress (Complete Before AI Integration)

### Phase 2: Program Generation (85% → 100%)
- [ ] Half-marathon template
- [ ] Strength-specific templates
- [ ] Plyometrics library expansion
- [ ] Core routines library
- [ ] Missing API endpoints (DELETE/PATCH)

### Phase 3: Coach Builder (60% → 100%)
- [ ] Calendar view with drag-and-drop
- [ ] Workout editor modal
- [ ] Week summary sidebar
- [ ] Program creation wizard polish

### Phase 4: Athlete Portal (40% → 100%)
- [ ] Today's workouts section
- [ ] Upcoming week preview
- [ ] Progress widgets
- [ ] Athlete calendar view
- [ ] Workout detail pages
- [ ] Workout logging flow
- [ ] Test results view

### Phase 5: Communication System (0% → 100%)
- [ ] Coach-athlete messaging UI
- [ ] Thread support
- [ ] Read/unread tracking
- [ ] Email notifications (Resend)

### Phase 6: Analytics (0% → 100%)
- [ ] Athlete progress tracking
- [ ] Training load charts
- [ ] Completion rate tracking
- [ ] Coach analytics dashboard
- [ ] CSV/PDF export

### Code Quality & Polish
- [ ] Documentation consolidation (18 files to archive)
- [ ] Remaining TODOs in code
- [ ] Strength template model in schema

---

## Part 3: AI Studio - Core Concept

### User Flow: Traditional → AI Studio

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRAM CREATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ATHLETE SELECTION                                           │
│     └─→ Select existing client or create new                    │
│                                                                  │
│  2. SPORT-SPECIFIC INPUT FORM                                   │
│     └─→ Goals, test data, constraints, availability             │
│                                                                  │
│  3. PATH SELECTION                                              │
│     ┌────────────────────┬────────────────────┐                 │
│     │  TRADITIONAL       │  AI STUDIO          │                 │
│     │  Use rule-based    │  Continue with AI   │                 │
│     │  program generator │  assistance         │                 │
│     └────────────────────┴────────────────────┘                 │
│              ↓                      ↓                            │
│     ┌────────────────┐    ┌────────────────────────┐            │
│     │ Auto-generated │    │ AI STUDIO WORKSPACE    │            │
│     │ program ready  │    │ (see below)            │            │
│     └────────────────┘    └────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Studio Interface Design

```
┌─────────────────────────────────────────────────────────────────┐
│  AI STUDIO                                    [Model: Claude ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │  CONTEXT PANEL      │  │  CHAT INTERFACE                 │   │
│  │  (Left sidebar)     │  │  (Main area)                    │   │
│  ├─────────────────────┤  ├─────────────────────────────────┤   │
│  │                     │  │                                 │   │
│  │  📋 ATHLETE DATA    │  │  AI: Based on Johan's VO2max    │   │
│  │  ☑ VO2/Lactate test │  │  of 58 and LT2 at 4:15/km,     │   │
│  │  ☑ Goals           │  │  I recommend a 16-week block... │   │
│  │  ☑ Availability    │  │                                 │   │
│  │  ☐ Injury history  │  │  [Generated program preview]    │   │
│  │                     │  │                                 │   │
│  │  📁 DOCUMENTS       │  │  ─────────────────────────────  │   │
│  │  ☐ Norwegian.pdf   │  │                                 │   │
│  │  ☐ Canova-method   │  │  Coach: Can you make week 3     │   │
│  │  ☑ Training-log.xlsx│  │  easier? He has a work trip.   │   │
│  │  ☐ Research-paper  │  │                                 │   │
│  │                     │  │  AI: I'll reduce volume by 40% │   │
│  │  🎥 VIDEOS          │  │  in week 3 and shift the key   │   │
│  │  ☐ Squat-form.mp4  │  │  threshold session to week 4...│   │
│  │  ☐ Running-gait    │  │                                 │   │
│  │                     │  ├─────────────────────────────────┤   │
│  │  🌐 WEB SEARCH      │  │  [Type message...]    [Send]    │   │
│  │  [x] Enabled       │  │                                 │   │
│  │                     │  │  [📎 Attach] [🎥 Video] [📊 Data]│   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ACTIONS                                                 │    │
│  │  [💾 Save Program] [📄 Export PDF] [↩ Back to Form]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key AI Studio Features

1. **Context Panel (Left)**
   - Athlete data auto-loaded from form
   - Checkboxes to include/exclude data from AI context
   - Document library with selective loading
   - Video uploads for technique analysis
   - Web search toggle

2. **Chat Interface (Center)**
   - Conversational program design
   - AI shows reasoning and suggestions
   - Program preview updates in real-time
   - Natural language editing ("make week 3 easier")

3. **Model Selection (Top)**
   - Claude 4.5 Opus - Best for complex reasoning
   - Gemini 3 Pro - Best for video analysis
   - Switch mid-conversation if needed

4. **Web Search Integration**
   - AI can search for latest research
   - Find training methodology updates
   - Look up race results, conditions

---

## Part 4: AI Integration Architecture

### Layer 1: Knowledge Base (RAG)
**Purpose**: Enable AI to reason with sports science knowledge

```
┌─────────────────────────────────────────────────┐
│           KNOWLEDGE SOURCES                      │
├─────────────────────────────────────────────────┤
│  System Knowledge (Auto-embedded)               │
│  • 36 training-engine docs                      │
│  • Methodology manuals                          │
│  • Exercise library descriptions                │
├─────────────────────────────────────────────────┤
│  Coach Knowledge (Uploaded)                     │
│  • Custom methodology PDFs                      │
│  • Research papers                              │
│  • Training philosophy docs                     │
├─────────────────────────────────────────────────┤
│  Athlete Data (Per-athlete)                     │
│  • Training history (Excel import)              │
│  • Test results (VO2/Lactate)                   │
│  • Race results & VDOT                          │
│  • Injury history                               │
│  • Bioimpedance data (body composition)         │
└─────────────────────────────────────────────────┘
           ↓ Embedded in pgvector
┌─────────────────────────────────────────────────┐
│        VECTOR DATABASE (Supabase)               │
│  • Semantic search                              │
│  • Context retrieval                            │
│  • Hybrid search (keyword + vector)             │
└─────────────────────────────────────────────────┘
```

### Layer 2: AI Providers
**Purpose**: Multiple models for different strengths

```
┌─────────────────────────────────────────────────┐
│           AI PROVIDERS (User selectable)        │
├─────────────────────────────────────────────────┤
│  Claude 4.5 Opus (Anthropic)                    │
│  • Best for: Complex periodization, reasoning   │
│  • Strengths: Long context, nuanced coaching    │
│  • Web search: Via tool use                     │
├─────────────────────────────────────────────────┤
│  Gemini 3 Pro (Google)                          │
│  • Best for: Video analysis, multimodal         │
│  • Strengths: "Deep Think" mode, native video   │
│  • Web search: Native grounding                 │
└─────────────────────────────────────────────────┘
```

### Layer 3: Validation & Safety
**Purpose**: Ensure AI outputs are safe and methodology-compliant

```
AI Output → Existing Validation Cascade:
  1. INJURY check (Delaware pain rules)
  2. READINESS check (HRV/sleep/fatigue)
  3. ACWR check (< 1.5 ratio)
  4. METHODOLOGY compliance
  5. VOLUME/INTENSITY constraints
  6. Coach approval (final review)
```

### Layer 4: Vision Analysis
**Purpose**: Technique analysis for exercises

```
┌─────────────────────────────────────────────────┐
│  EDGE (Device)          │  CLOUD (API)          │
├─────────────────────────────────────────────────┤
│  MediaPipe BlazePose    │  Gemini Video         │
│  • 33 skeletal points   │  • Form diagnosis     │
│  • Real-time (30 FPS)   │  • Injury risk ID     │
│  • Rep counting         │  • Running gait       │
│  • Basic form cues      │  • Exercise suggest   │
└─────────────────────────────────────────────────┘
```

---

## Part 5: AI Features Roadmap

### Phase A: Foundation & Infrastructure (~90% Complete)
- [x] Enable pgvector extension in Supabase
- [x] Create `knowledge_base` table with embeddings
- [x] Create `ai_conversations` table for chat history
- [x] Create `coach_documents` table for file management
- [ ] Embed existing 36 training-engine docs (script needed)
- [x] Build retrieval API endpoint (`/api/knowledge/search`, `/api/knowledge/context`)
- [ ] Test semantic search quality

### Phase B: AI Studio Core UI (~85% Complete)
- [x] Create `/coach/ai-studio` route
- [x] Context panel component (left sidebar) - `ContextPanel.tsx`
- [x] Chat interface component (main area) - `AIStudioClient.tsx`, `ChatMessage.tsx`
- [x] Model selector dropdown (Claude/Gemini) - `ModelSelector.tsx`
- [x] Document checkbox list with context loading
- [x] Athlete data display with toggles
- [x] Message history persistence
- [x] Program preview component - `ProgramPreview.tsx`

### Phase C: Document Management System (~80% Complete)
- [x] Document upload UI with drag-and-drop - `DocumentUploader.tsx`
- [x] PDF parsing - `lib/ai/document-processor.ts`
- [x] Excel parsing for training history - `lib/ai/document-processor.ts`
- [x] Video file upload and storage - `/api/video-analysis/upload`
- [x] Chunking and embedding pipeline - `lib/ai/embeddings.ts`
- [x] Coach-specific document isolation
- [x] Document preview/viewer modal - `DocumentPreview.tsx`
- [x] Documents page - `/coach/documents`

### Phase D: AI Chat & Generation (~95% Complete)
- [x] Vercel AI SDK integration
- [x] Claude API setup - `lib/ai/program-prompts.ts`
- [x] Gemini API setup (needs verification)
- [x] Streaming responses in chat
- [x] Web search tool integration - `lib/ai/web-search.ts` (DuckDuckGo, Google optional)
- [x] Context injection from selected documents - `lib/ai/sport-context-builder.ts`
- [x] Program structure output parsing - `lib/ai/program-parser.ts`
- [x] Save generated program to database - `/api/ai/save-program`

### Phase E: Sport-Specific AI Features (~90% Complete)
- [x] Running: Periodization, pace zones, race prep
- [x] HYROX: Station optimization, strength balance
- [x] Cycling: FTP-based training, power zones - `buildCyclingContext()`
- [x] Swimming: CSS zones, stroke analysis - `buildSwimmingContext()`
- [x] Triathlon: Multi-sport balance, brick sessions - `buildTriathlonContext()`
- [x] Skiing: Technique focus, terrain adaptation - `buildSkiingContext()`
- [x] General Fitness: Weight loss, muscle building (via Phase F)
- [x] All sports have SPORT_PROMPTS in `program-prompts.ts`

### Phase F: General Fitness & Nutrition AI (~75% Complete)
- [x] Bioimpedance data input form - Body composition tracker
- [x] Body composition tracking - `/api/body-composition`
- [x] BMR/TDEE calculations - `lib/ai/nutrition-calculator.ts`
- [x] Weight loss program generation
- [x] Muscle building guidance
- [x] Macro recommendations based on goals
- [x] Caloric deficit/surplus planning
- [ ] Progress tracking with body comp changes (basic)

### Phase G: Video Analysis (~70% Complete)
- [x] MediaPipe integration for edge processing - `PoseAnalyzer.tsx`
- [ ] Skeletal data compression (TOON format)
- [x] Gemini video API integration (needs verification)
- [x] Form feedback for 84 strength exercises - `exercise-form-criteria.ts`, `FormFeedbackPanel.tsx`
- [ ] Running gait analysis (partial)
- [ ] Technique progression tracking (basic)
- [ ] Side-by-side comparison over time
- [x] Video analysis page - `/coach/video-analysis`

### Phase H: Advanced Intelligence (100% Complete)
- [x] Training history pattern recognition - `lib/ai/advanced-intelligence/training-patterns.ts`
- [x] Predictive goal setting with confidence - `lib/ai/advanced-intelligence/predictive-goals.ts`
- [x] Race time predictions (VDOT tables) - `lib/ai/advanced-intelligence/predictive-goals.ts`
- [x] Automatic periodization adjustments - `lib/ai/advanced-intelligence/periodization-adjustments.ts`
- [x] Coach style matching from uploaded docs - `lib/ai/advanced-intelligence/coach-style-matching.ts`
- [x] Injury risk prediction from load patterns - `lib/ai/advanced-intelligence/injury-risk-prediction.ts`
- [x] API endpoints for all features - `/api/ai/advanced-intelligence/*`

---

## Part 6: Technical Implementation Details

### Database Schema Additions

```sql
-- Enable vector extension
create extension if not exists vector;

-- Coach document library
create table coach_documents (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references users(id) not null,
  name text not null,
  file_type text not null, -- 'pdf', 'excel', 'markdown', 'video'
  file_url text not null,
  file_size int,
  description text,
  is_system boolean default false, -- system docs vs coach uploaded
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Knowledge base for RAG (chunked documents)
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references coach_documents(id) on delete cascade,
  coach_id uuid references users(id),
  content text not null,
  embedding vector(1536),
  chunk_index int,
  metadata jsonb, -- page number, section, etc.
  created_at timestamptz default now()
);

-- AI conversation sessions
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references users(id) not null,
  athlete_id uuid references clients(id), -- optional, can be general
  title text,
  model_used text not null, -- 'claude-4.5-opus', 'gemini-3-pro'
  context_documents uuid[], -- array of document_ids included
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI conversation messages
create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations(id) on delete cascade,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  tokens_used int,
  created_at timestamptz default now()
);

-- Generated programs from AI
create table ai_generated_programs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations(id),
  program_id uuid references training_programs(id), -- linked if saved
  program_json jsonb not null, -- full program structure
  is_saved boolean default false,
  created_at timestamptz default now()
);

-- Video analysis results
create table video_analyses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references users(id) not null,
  athlete_id uuid references clients(id),
  exercise_id uuid references exercises(id),
  video_url text not null,
  landmarks_data jsonb, -- MediaPipe skeletal output
  ai_analysis text,
  form_score int,
  issues_detected jsonb,
  recommendations jsonb,
  created_at timestamptz default now()
);

-- Body composition tracking (bioimpedance)
create table body_composition (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) not null,
  measurement_date date not null,
  weight_kg decimal(5,2),
  body_fat_percent decimal(4,1),
  muscle_mass_kg decimal(5,2),
  visceral_fat int,
  bone_mass_kg decimal(4,2),
  water_percent decimal(4,1),
  bmr_kcal int,
  metabolic_age int,
  notes text,
  created_at timestamptz default now()
);

-- User API keys (encrypted)
create table user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null unique,
  anthropic_key_encrypted text,      -- Claude API key
  google_key_encrypted text,         -- Gemini API key
  openai_key_encrypted text,         -- For embeddings
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Available AI models (dynamic configuration)
create table ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,            -- 'anthropic', 'google', 'openai'
  model_id text not null unique,     -- 'claude-4.5-opus', 'gemini-3-pro'
  display_name text not null,        -- 'Claude 4.5 Opus'
  description text,
  capabilities jsonb,                -- ['text', 'vision', 'code', 'web_search']
  input_cost_per_1k decimal(10,6),   -- Cost tracking
  output_cost_per_1k decimal(10,6),
  max_tokens int,
  is_active boolean default true,    -- Enable/disable models
  released_at date,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_knowledge_chunks_embedding on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops);
create index idx_coach_documents_coach on coach_documents(coach_id);
create index idx_ai_conversations_coach on ai_conversations(coach_id);
create index idx_ai_messages_conversation on ai_messages(conversation_id);
create index idx_body_composition_client on body_composition(client_id);
create index idx_user_api_keys_user on user_api_keys(user_id);
```

### API Key Management (BYOK)

**Security considerations:**
- Keys encrypted at rest using Supabase Vault or application-level encryption
- Keys never sent to client, only used server-side
- Keys validated on save (test API call)
- Clear error messages when keys expire/invalid

**User flow:**
1. Coach goes to Settings → AI Configuration
2. Enters their Anthropic/Google/OpenAI API keys
3. Keys validated and encrypted
4. Keys used automatically in AI Studio

**UI Location:** `/coach/settings/ai`

### API Endpoints

```
# AI Studio Core
POST /api/ai/conversations              - Create new conversation
GET  /api/ai/conversations              - List coach conversations
GET  /api/ai/conversations/[id]         - Get conversation with messages
POST /api/ai/conversations/[id]/message - Send message, get AI response
DELETE /api/ai/conversations/[id]       - Delete conversation

# Document Management
POST /api/documents/upload              - Upload document (PDF/Excel/Video)
GET  /api/documents                     - List coach documents
GET  /api/documents/[id]                - Get document details
DELETE /api/documents/[id]              - Delete document
POST /api/documents/[id]/embed          - Generate embeddings for document

# Knowledge Search (RAG)
POST /api/knowledge/search              - Semantic search across documents
POST /api/knowledge/context             - Build context from selected docs

# AI Generation
POST /api/ai/generate-program           - Generate full program from context
POST /api/ai/modify-program             - Natural language program editing
POST /api/ai/save-program               - Save AI program to database

# Video Analysis
POST /api/video/upload                  - Upload video for analysis
POST /api/video/analyze                 - Run Gemini analysis on video
GET  /api/video/analyses/[athleteId]    - Get athlete's video analyses

# Body Composition
POST /api/body-composition              - Record bioimpedance measurement
GET  /api/body-composition/[clientId]   - Get client measurements
POST /api/ai/nutrition-plan             - Generate nutrition recommendations

# Model Management
GET  /api/ai/models                     - List available AI models
POST /api/ai/models                     - Add new model (admin)
PUT  /api/ai/models/[id]                - Update model (admin)
GET  /api/ai/usage                      - Token usage and costs

# API Key Management (BYOK)
GET  /api/settings/api-keys             - Get key status (not actual keys)
POST /api/settings/api-keys             - Save/update API keys
POST /api/settings/api-keys/validate    - Validate a key before saving
DELETE /api/settings/api-keys/[provider] - Remove a provider's key
```

### Cost Estimation

| Feature | Model | Cost per Use | Monthly (50 coaches, 100 athletes) |
|---------|-------|--------------|-----------------------------------|
| Program generation | Claude 4.5 Opus | ~$0.15-0.30 | ~$50-100/month |
| Natural language edits | Claude Sonnet | ~$0.02/edit | ~$20/month |
| Document embedding | OpenAI ada-002 | ~$0.0001/page | ~$2/month |
| Video analysis | Gemini 3 Pro | ~$0.20/video | ~$40/month |
| Web search | Perplexity/Tavily | ~$0.01/search | ~$10/month |
| **Total estimate** | | | **~$120-170/month** |

*Note: Costs scale with usage. Claude 4.5 Opus is expensive but provides best reasoning.*

### Technology Stack

```
Frontend:
- Next.js 15 App Router (existing)
- Vercel AI SDK for streaming chat
- React components for AI Studio UI

Backend:
- Supabase PostgreSQL + pgvector
- Supabase Storage for documents/videos
- Edge Functions for embedding generation

AI Providers:
- Claude 4.5 Opus via Anthropic API
- Gemini 3 Pro via Google AI API
- OpenAI for embeddings (ada-002)

Document Processing:
- pdf-parse or LlamaParse for PDFs
- xlsx/SheetJS for Excel files
- Supabase Storage for video files
```

---

## Part 7: User Requirements Summary

### Confirmed Features (from discussion):
1. **AI Studio** - Dedicated workspace for AI-assisted program creation
2. **Dual path** - Traditional form → optional AI Studio continuation
3. **Document management** - Upload PDFs, Excel, videos with selective context
4. **Model selection** - Claude 4.5 Opus and Gemini 3 Pro
5. **Web search** - AI can search internet for research/context
6. **Video analysis** - Technique analysis for exercises
7. **General fitness expansion** - Weight loss, nutrition, bioimpedance
8. **All 8 sports** - Complete input forms for each sport

### Focus:
- **Coach tools only** for now
- Athlete AI assistance is future scope

### Decisions Made:
- Cloud-only is acceptable (no Ollama priority)
- Multi-model support (user selects per conversation)
- Users provide their own API keys (BYOK model)
- Model configuration must be dynamic for new releases

### Existing Work to Leverage:
- Chat interface already built for athlete page
- Can adapt/reuse for AI Studio

---

## Part 8: Implementation Priority

### Prerequisites (Complete First)
1. Finish Phase 4: Athlete Portal (40% → 100%)
2. Complete all 8 sport input forms
3. Polish Phase 3: Coach Builder UI

### AI Implementation Order

| Priority | Phase | Description | Dependency |
|----------|-------|-------------|------------|
| 1 | A | Foundation (pgvector, tables) | None |
| 2 | B | AI Studio Core UI | Phase A |
| 3 | C | Document Management | Phase A |
| 4 | D | AI Chat & Generation | Phase B, C |
| 5 | E | Sport-Specific AI | Phase D |
| 6 | F | General Fitness & Nutrition | Phase D |
| 7 | G | Video Analysis | Phase D |
| 8 | H | Advanced Intelligence | Phase D, E, F |

---

## Part 9: Key Files to Create/Modify

### New Files
```
app/coach/ai-studio/
├── page.tsx                    # Main AI Studio page
├── layout.tsx                  # Studio layout
└── components/
    ├── AIStudioLayout.tsx      # Main layout component
    ├── ContextPanel.tsx        # Left sidebar
    ├── ChatInterface.tsx       # Main chat area (adapt from athlete chat)
    ├── DocumentList.tsx        # Document checkboxes
    ├── AthleteDataPanel.tsx    # Athlete context toggles
    ├── ModelSelector.tsx       # Claude/Gemini dropdown
    ├── MessageBubble.tsx       # Chat message component
    └── ProgramPreview.tsx      # Generated program preview

app/coach/settings/ai/
├── page.tsx                    # API key configuration page
└── components/
    ├── ApiKeyForm.tsx          # Key input with validation
    ├── ProviderCard.tsx        # Provider status display
    └── ModelList.tsx           # Available models list

app/api/ai/
├── conversations/
│   ├── route.ts                # List/create conversations
│   └── [id]/
│       ├── route.ts            # Get/delete conversation
│       └── message/route.ts    # Send message
├── generate-program/route.ts   # Generate full program
├── modify-program/route.ts     # Natural language edits
└── save-program/route.ts       # Save to database

app/api/documents/
├── route.ts                    # List documents
├── upload/route.ts             # Upload handler
└── [id]/
    ├── route.ts                # Get/delete document
    └── embed/route.ts          # Generate embeddings

lib/ai/
├── providers/
│   ├── claude.ts               # Claude API wrapper
│   └── gemini.ts               # Gemini API wrapper
├── embeddings.ts               # Embedding generation
├── context-builder.ts          # Build RAG context
├── program-parser.ts           # Parse AI output to program
└── validation.ts               # Validate AI programs

components/coach/documents/
├── DocumentUploader.tsx        # Drag-and-drop upload
├── DocumentLibrary.tsx         # Document grid/list
└── DocumentPreview.tsx         # Preview modal
```

### Modified Files
```
prisma/schema.prisma            # Add new models
lib/supabase/                   # Storage helpers
components/coach/programs/      # Add "Continue with AI" button
```

---

## Notes

- AI enhances existing training engine, doesn't replace it
- All AI-generated programs validated through existing cascade
- Coach has final approval before any program is saved
- Cost tracking and limits can be implemented per coach
- Start simple: get chat working first, then add features incrementally

---

## Related Documents

- `docs/Architecting_the_Cognitive_Athlete.md` - Gemini's research on AI integration
- `docs/training-engine/` - Existing training engine documentation (36 files)
- `CLAUDE.md` - Main project documentation
