# Exercise Video Management System - Implementation Tracker

**Created:** 2025-01-25
**Status:** Core Implementation Complete - Optional Enhancements Remaining
**Last Updated:** 2025-01-25

## Overview
Add exercise videos to the 84 exercises in the library using YouTube as the hosting platform with automatic playlist import and fuzzy name matching.

## User Requirements
- **Video count**: 50-200 videos (Google Veo 3.1 + camera filmed)
- **Hosting**: YouTube (unlisted), with future Supabase Storage option
- **Workflow**: Auto-match by name (YouTube playlist → auto-match to exercises)
- **Import method**: YouTube Data API with automatic playlist fetching

---

## Phase 1: Database Schema ✅ COMPLETE
**Estimated time:** 2-3 hours

- [x] Add `VideoImport` model to `prisma/schema.prisma`
- [x] Add `VideoMatch` model to `prisma/schema.prisma`
- [x] Run `npx prisma db push` (synced to database)
- [x] Run `npx prisma generate`

### VideoImport Model
```prisma
model VideoImport {
  id              String    @id @default(uuid())
  userId          String
  playlistId      String
  playlistTitle   String?
  status          String    @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED
  totalVideos     Int       @default(0)
  matchedVideos   Int       @default(0)
  createdAt       DateTime  @default(now())
  completedAt     DateTime?

  user            User      @relation(fields: [userId], references: [id])
  matches         VideoMatch[]

  @@index([userId])
  @@index([status])
}
```

### VideoMatch Model
```prisma
model VideoMatch {
  id            String    @id @default(uuid())
  importId      String
  videoId       String    // YouTube video ID
  videoTitle    String
  videoUrl      String
  thumbnailUrl  String?
  duration      String?

  exerciseId    String?
  matchScore    Float?    // 0.0 - 1.0
  matchMethod   String?   // EXACT, FUZZY, MANUAL
  status        String    @default("PENDING") // PENDING, APPROVED, REJECTED, APPLIED

  import        VideoImport @relation(fields: [importId], references: [id], onDelete: Cascade)

  @@index([importId])
  @@index([exerciseId])
  @@index([status])
}
```

---

## Phase 2: YouTube API Integration ✅ COMPLETE
**Estimated time:** 2-3 hours

- [x] Create `lib/youtube/api.ts` with YouTube Data API client
- [x] Add `YOUTUBE_API_KEY` to `.env.local`
- [x] Add `YOUTUBE_API_KEY` to `.env.example`
- [ ] Test API with a sample playlist (manual step when API key added)

### Required Functions
```typescript
// lib/youtube/api.ts
export function extractPlaylistId(url: string): string | null
export async function getPlaylistDetails(playlistId: string): Promise<PlaylistInfo>
export async function fetchPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]>
```

### Environment Variable
```
YOUTUBE_API_KEY=your_google_api_key_here
```

### Google Cloud Setup (Manual Step)
1. Go to https://console.cloud.google.com/
2. Create new project or use existing
3. Enable "YouTube Data API v3"
4. Create API Key (no restrictions needed for server-side use)
5. Copy key to `.env.local`

---

## Phase 3: Fuzzy Matching Algorithm ✅ COMPLETE
**Estimated time:** 2-3 hours

- [x] Create `lib/video-matching/matcher.ts`
- [x] Implement Jaro-Winkler string similarity
- [x] Add Swedish text normalization (ä/ö/å, ae→ä, oe→ö)
- [x] Create matching function against exercise names
- [ ] Write tests for matching edge cases (optional)

### Matching Logic
```typescript
// lib/video-matching/matcher.ts
export function normalizeSwedishText(text: string): string
export function calculateSimilarity(a: string, b: string): number
export function findBestMatch(videoTitle: string, exercises: Exercise[]): MatchResult
```

### Score Thresholds
- **> 0.90**: Auto-approve (EXACT match)
- **0.70 - 0.90**: Review recommended (FUZZY match)
- **< 0.70**: Manual assignment required

---

## Phase 4: Modify Exercise Update API ✅ COMPLETE
**Estimated time:** 30 minutes

- [x] Modify `app/api/exercises/[id]/route.ts` to allow `videoUrl` updates on public exercises

### Current Restriction (Line 89-94)
Currently blocks ALL updates to public exercises. Change to allow videoUrl:
```typescript
// Allow updating videoUrl on public exercises, but restrict other fields
if (existingExercise.isPublic) {
  const allowedPublicFields = ['videoUrl']
  const attemptedFields = Object.keys(body).filter(k => body[k] !== undefined)
  const disallowedFields = attemptedFields.filter(f => !allowedPublicFields.includes(f))

  if (disallowedFields.length > 0) {
    return NextResponse.json(
      { error: 'Cannot modify public library exercises except video URL' },
      { status: 403 }
    )
  }
}
```

---

## Phase 5: Video Import API Endpoints ✅ COMPLETE
**Estimated time:** 3-4 hours

- [x] Create `app/api/video-imports/route.ts` (GET list, POST new import)
- [x] Create `app/api/video-imports/[id]/route.ts` (GET details, DELETE)
- [x] Create `app/api/video-imports/[id]/matches/route.ts` (GET matches, PATCH update)
- [x] Create `app/api/video-imports/[id]/apply/route.ts` (POST apply approved matches)

### API Endpoints Summary
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/video-imports` | List all imports for current coach |
| POST | `/api/video-imports` | Start new import from playlist URL |
| GET | `/api/video-imports/[id]` | Get import details with match count |
| DELETE | `/api/video-imports/[id]` | Delete import and all matches |
| GET | `/api/video-imports/[id]/matches` | Get all matches for an import |
| PATCH | `/api/video-imports/[id]/matches` | Bulk update match statuses/assignments |
| POST | `/api/video-imports/[id]/apply` | Apply all approved matches to exercises |

---

## Phase 6: Coach Video Management Page ✅ COMPLETE
**Estimated time:** 3-4 hours

- [x] Create `app/coach/videos/page.tsx` - Main dashboard
- [x] Add navigation link to coach sidebar/menu
- [x] Show import history with status badges
- [x] Show statistics (total videos, matched, unmatched)
- [x] Add "Import from Playlist" button

---

## Phase 7: Playlist Import Dialog ✅ COMPLETE
**Estimated time:** 3-4 hours

- [x] Create `components/coach/videos/PlaylistImportDialog.tsx`
- [x] Step 1: Enter/paste YouTube playlist URL
- [x] Step 2: Preview playlist (title, video count, first few thumbnails)
- [x] Step 3: Start import and run auto-matching
- [x] Step 4: Show completion summary

---

## Phase 8: Match Review Table ✅ COMPLETE
**Estimated time:** 4-5 hours

- [x] Create `components/coach/videos/MatchReviewTable.tsx`
- [x] Video thumbnail column
- [x] Video title column
- [x] Matched exercise column (searchable dropdown)
- [x] Confidence score with color coding
- [x] Status badge (Pending/Approved/Rejected/Applied)
- [x] Bulk actions: "Approve All >90%", "Approve Selected"
- [x] Filter by status
- [ ] Pagination for large imports (deferred - handled by scroll)

---

## Phase 9: Manual Video Assignment ✅ COMPLETE (merged into Phase 8)
**Estimated time:** 2 hours

- [x] Create `components/coach/videos/VideoAssignmentModal.tsx` (integrated into MatchReviewTable)
- [x] Search exercises by name
- [x] Filter by biomechanical pillar (via search)
- [x] Preview video inline
- [x] One-click assignment

---

## Phase 10: Enhance Existing Components
**Estimated time:** 2-3 hours

### ExerciseLibrary.tsx
- [ ] Add "Has Video" filter toggle
- [ ] Add video indicator icon (Play icon) on cards with video

### ExerciseLibraryBrowser.tsx
- [ ] Add "Has Video" filter in filter panel
- [ ] Add video icon indicator on exercise cards
- [ ] Add "Add Video URL" quick action in exercise detail

---

## Files Summary

### New Files to Create
```
lib/youtube/api.ts
lib/video-matching/matcher.ts
app/api/video-imports/route.ts
app/api/video-imports/[id]/route.ts
app/api/video-imports/[id]/matches/route.ts
app/api/video-imports/[id]/apply/route.ts
app/coach/videos/page.tsx
components/coach/videos/PlaylistImportDialog.tsx
components/coach/videos/MatchReviewTable.tsx
components/coach/videos/VideoAssignmentModal.tsx
```

### Files to Modify
```
prisma/schema.prisma                              # Add VideoImport, VideoMatch models
app/api/exercises/[id]/route.ts                   # Allow videoUrl updates on public exercises
components/coach/strength/ExerciseLibrary.tsx     # Add video filter & indicator
components/coach/exercise-library/ExerciseLibraryBrowser.tsx  # Add video filter & indicator
components/navigation/MobileNav.tsx               # Add Videos link (optional)
```

---

## Critical Reference Files

These files should be read before implementing:

1. **Exercise model**: `prisma/schema.prisma` (line 539-583)
2. **Exercise update API**: `app/api/exercises/[id]/route.ts` (line 89-94 for restriction)
3. **Video embed pattern**: `components/athlete/workout/ExerciseInstructionsModal.tsx` (line 149-167)
4. **Exercise names**: `prisma/seed-exercises.ts` (all 84 Swedish exercise names)
5. **API patterns**: `app/api/messages/route.ts` (example of similar CRUD pattern)

---

## Workflow for End User

1. **Upload videos to YouTube** (unlisted) with Swedish exercise names as titles
2. **Add all videos to a single playlist** (e.g., "Övningar Star by Thomson")
3. **Go to /coach/videos** in the app
4. **Click "Import from Playlist"** and paste the playlist URL
5. **System fetches videos** via YouTube API and auto-matches to exercises
6. **Review the matches** in the table:
   - Green (>90%): High confidence - approve all at once
   - Yellow (70-90%): Review and approve/adjust
   - Red (<70%): Manually assign exercise
7. **Click "Apply"** to save all approved matches
8. **Athletes now see videos** in their workout exercise modals

---

## Testing Checklist

- [ ] YouTube API fetches playlist correctly
- [ ] Fuzzy matching works with Swedish characters (ä, ö, å)
- [ ] Matching works with both `name` and `nameSv` fields
- [ ] Bulk approve works correctly
- [ ] Manual assignment works
- [ ] Applied videos show in ExerciseInstructionsModal
- [ ] Videos play correctly (YouTube embed)
- [ ] Error handling for invalid playlist URLs
- [ ] Error handling for private/deleted videos

---

## Future Enhancements (Not in This Implementation)

- [ ] Direct video upload to Supabase Storage
- [ ] Thumbnail generation for non-YouTube videos
- [ ] Video duration display
- [ ] Re-import to update playlist (detect new videos)
- [ ] Bulk export video assignments to CSV
