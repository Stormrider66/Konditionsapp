# Team Chat — Design

**Status (2026-06-11):** Slices 1–2 implemented; slice 3 server side implemented.
**DB fully applied 2026-06-11** (schema + Realtime trigger/RLS verified live).
Remaining: native app (slice 3 client side), slice 4 items.
Note: TEAM_CHANNEL access is always derived from the roster — ThreadParticipant
rows never authorize team channels (they outlive roster removal); the SQL
`can_access_thread` mirrors this.
**Target:** Coaches on web, athletes on a native app (Expo/React Native, planned).

Implementation map:

| Piece | Where |
|---|---|
| Schema | `prisma/schema/chat.prisma` (+ back-relations in `core.prisma`) |
| Membership/authorization | `lib/chat/membership.ts` |
| REST API | `app/api/threads/team/[teamId]`, `app/api/threads/[threadId]/{messages,read}`, `app/api/push-tokens` |
| Coach UI | `app/(business)/[businessSlug]/coach/teams/[teamId]/chat/` + `components/coach/teams/TeamChatPanel.tsx` |
| Realtime SQL (trigger, `can_access_thread`, RLS) | `prisma/migrations/20260610_team_chat_realtime/migration.sql` |
| Expo push fan-out | `lib/chat/push.ts` (inert until devices register tokens) |

One deviation from the sketches below: the TypeScript staff path reuses
`getAccessibleTeam` (`lib/coach/team-access.ts`), which also grants access to
business-wide roles (OWNER/ADMIN/COACH of the business) — richer than the
sketch. The SQL mirror includes an approximation of that path; keep both in
sync when roster rules change.

## Applying to the database

Both steps are manual (per the repo's migration cadence):

```bash
# 1. Create the chat tables (additive only)
export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx prisma db push

# 2. Apply the Realtime trigger + RLS
npx prisma db execute \
  --file prisma/migrations/20260610_team_chat_realtime/migration.sql \
  --url "$DIRECT_DATABASE_URL"
```

## Product framing

Not a WhatsApp clone. Chat in this platform wins by being **anchored to domain objects**
(a workout, a test, a team event) — context general-purpose messengers can't have. The
existing `CareTeamThread` (physio) proves the pattern; this design generalizes it.

Constraints that shaped the design:

- **No athlete↔athlete DMs in v1.** Rosters include minors (U19/U21). Team channels
  always include the coach; safeguarding by construction, not moderation.
- **Chat without mobile push is dead on arrival.** Athlete-side chat ships together
  with the native app + Expo push. Web-only chat (coach side) is still useful as slice 1.
- **Degraded mode first.** Fetch-on-open / pull-to-refresh / refetch-on-foreground are
  built before realtime. Realtime is purely additive; if it breaks, chat still works.

## Key decisions

1. **Generalize `CareTeamThread`, don't extend it.** New `Thread` / `ThreadMessage` /
   `ThreadParticipant` models in `prisma/schema/chat.prisma`. Care-team models stay
   untouched; anchors are designed so a later data migration is mechanical.
2. **No per-message `readByUserIds`** (CareTeamMessage rewrites an array on every read —
   doesn't scale). Per-participant `lastReadAt` cursor instead; unread = messages newer
   than cursor.
3. **Team channels: authorization derived, state lazy.** Access to a `TEAM_CHANNEL`
   derives from the team roster (head coach, `TeamCoachAssignment`, rostered clients with
   athlete accounts). A `ThreadParticipant` row is created lazily on first open and holds
   only per-user state (cursor, mute, notification prefs). No roster-sync job.
4. **Realtime = Supabase Broadcast on private channels, triggered from Postgres.**
   Not `postgres_changes` (per-subscriber RLS evaluation, weak filtering, scaling
   ceiling). Not SSE like live-HR (`app/api/coach/live-hr/sessions/[id]/stream/route.ts`
   is poll-inside-a-Vercel-function — costs function duration, awkward from native).
   Broadcast works identically from supabase-js in browser and React Native.
5. **Writes stay REST.** Sending a message is a normal API route (auth, Zod, mention
   parsing, push fan-out). Realtime is read-side fan-out only.
6. **RLS uses the `dbUserId` JWT claim, NOT `auth.uid()`.** Legacy `User.id` values
   drifted from `auth.users.id` (see the email fallback in
   `prisma/migrations/20260418_custom_access_token_hook/migration.sql` and
   `scripts/sync-user-ids-with-supabase.ts`). The access-token hook already injects
   `app_metadata.dbUserId` — realtime authorization reads that claim.

## Schema

All IDs below are **User.id** (not Client.id). An athlete can only chat if their
`Client` has an `athleteAccount` → `User`. Resolve `client.athleteAccount.userId`
when building rosters.

```prisma
enum ThreadType {
  TEAM_CHANNEL // one per team — membership derived from roster
  GROUP        // explicit participant list (coach + physio + athlete, etc.)
  DIRECT       // 1:1 coach↔athlete (v2 — fold the legacy Message model in here)
}

enum ThreadStatus {
  OPEN
  ARCHIVED
}

model Thread {
  id          String       @id @default(uuid())
  businessId  String?      // tenant scope
  type        ThreadType
  status      ThreadStatus @default(OPEN)
  title       String?      // null for TEAM_CHANNEL (title = team name)
  createdById String

  // Scope — which population rule applies
  teamId   String? // required when type = TEAM_CHANNEL
  clientId String? // athlete-centric GROUP threads (care-team style)

  // Anchors — the domain context WhatsApp can't have.
  // Concrete FKs for the common cases, generic pair as escape hatch.
  workoutLogId String?
  teamEventId  String?
  anchorType   String? // e.g. 'TEST', 'INJURY_ASSESSMENT', 'PROGRAM'
  anchorId     String?

  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  createdBy    User                @relation("UserCreatedThreads", fields: [createdById], references: [id])
  team         Team?               @relation(fields: [teamId], references: [id], onDelete: Cascade)
  client       Client?             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  messages     ThreadMessage[]
  participants ThreadParticipant[]

  @@unique([teamId, type]) // one TEAM_CHANNEL per team
  @@index([businessId])
  @@index([clientId])
  @@index([lastMessageAt])
}

model ThreadMessage {
  id               String    @id @default(uuid())
  threadId         String
  senderId         String    // User.id
  content          String    @db.Text
  attachments      Json?     // [{ url, name, type }] — Supabase Storage paths
  mentionedUserIds String[]  @default([])
  replyToId        String?   // shallow reply-to, not full threading
  editedAt         DateTime?
  deletedAt        DateTime? // soft delete — moderation + GDPR erasure
  createdAt        DateTime  @default(now())

  thread  Thread          @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender  User            @relation("UserThreadMessages", fields: [senderId], references: [id])
  replyTo ThreadMessage?  @relation("MessageReplies", fields: [replyToId], references: [id])
  replies ThreadMessage[] @relation("MessageReplies")

  @@index([threadId, createdAt]) // the pagination query
  @@index([senderId])
}

model ThreadParticipant {
  id          String    @id @default(uuid())
  threadId    String
  userId      String    // User.id
  role        String    @default("MEMBER") // OWNER | COACH | PHYSIO | ATHLETE | MEMBER
  lastReadAt  DateTime? // unread cursor — replaces readByUserIds
  notifyPush  Boolean   @default(true)
  notifyEmail Boolean   @default(false)
  mutedUntil  DateTime?
  isActive    Boolean   @default(true)
  joinedAt    DateTime  @default(now())

  thread Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  user   User   @relation("UserThreadParticipations", fields: [userId], references: [id])

  @@unique([threadId, userId])
  @@index([userId, isActive]) // "my threads" / badge query
}

model DevicePushToken {
  id         String   @id @default(uuid())
  userId     String
  token      String   @unique // Expo push token (or FCM/APNs raw later)
  platform   String   // 'ios' | 'android' | 'web'
  provider   String   @default("expo")
  lastSeenAt DateTime @default(now())
  createdAt  DateTime @default(now())

  user User @relation("UserPushTokens", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## Realtime wiring

```
Native app (Expo/RN)          Web (coach)
  supabase-js ws ─────┐   ┌──── supabase-js ws
                      ▼   ▼
            Supabase Realtime (private broadcast channels)
                      ▲
        Postgres trigger: realtime.broadcast_changes()
                      ▲
  POST /api/threads/[id]/messages  ← auth + Zod + Prisma (write path, unchanged stack)
                      └──→ Expo push fan-out to offline participants
```

**Topics:** `thread:{threadId}` for live messages inside an open conversation;
`inbox:{userId}` for thread-list/badge updates.

### 1. Broadcast trigger (fires regardless of write path)

```sql
CREATE OR REPLACE FUNCTION public.thread_message_broadcast()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'thread:' || NEW."threadId",   -- topic
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  RETURN NEW;
END $$;

CREATE TRIGGER thread_message_broadcast
AFTER INSERT OR UPDATE ON "ThreadMessage"
FOR EACH ROW EXECUTE FUNCTION public.thread_message_broadcast();
```

### 2. Channel authorization — RLS on `realtime.messages`

Uses the `dbUserId` claim (see decision 6). Membership logic must mirror
`lib/chat/membership.ts` (TypeScript is the source of truth; SQL is the mirror —
keep them in sync when roster rules change).

```sql
CREATE OR REPLACE FUNCTION public.can_access_thread(p_thread_id uuid, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    -- explicit participant (GROUP / DIRECT, or already-opened team channel)
    SELECT 1 FROM "ThreadParticipant"
    WHERE "threadId" = p_thread_id::text AND "userId" = p_user_id AND "isActive"
  ) OR EXISTS (
    -- derived team-channel membership: head coach, assistant, or rostered athlete
    SELECT 1 FROM "Thread" t JOIN "Team" tm ON tm.id = t."teamId"
    WHERE t.id = p_thread_id::text AND t.type = 'TEAM_CHANNEL' AND (
      tm."userId" = p_user_id
      OR EXISTS (SELECT 1 FROM "TeamCoachAssignment" a
                 WHERE a."teamId" = tm.id AND a."coachId" = p_user_id)
      OR EXISTS (SELECT 1 FROM "Client" c JOIN "AthleteAccount" aa ON aa."clientId" = c.id
                 WHERE c."teamId" = tm.id AND aa."userId" = p_user_id)
    )
  );
$$;

CREATE POLICY "thread_members_read" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'thread:%'
    AND public.can_access_thread(
      replace(realtime.topic(), 'thread:', '')::uuid,
      auth.jwt()->'app_metadata'->>'dbUserId'
    )
  );
```

Verify the roster joins against the actual relation names at build time (the
`Client`→team and physio-assignment relations especially).

If `USE_JWT_CLAIMS` is ever rolled back, the claim is absent → subscriptions fail
closed → clients fall back to polling. Correct failure mode; document in RUNBOOK
when shipped.

### 3. Client subscription (identical browser / React Native)

```ts
await supabase.realtime.setAuth() // attach the user's access token
const channel = supabase.channel(`thread:${threadId}`, { config: { private: true } })
channel
  .on('broadcast', { event: 'INSERT' }, ({ payload }) => upsertMessage(payload.record))
  .on('broadcast', { event: 'typing' }, ({ payload }) => showTyping(payload.userId))
  .subscribe()

// typing indicator: ephemeral, never touches the DB
channel.send({ type: 'broadcast', event: 'typing', payload: { userId } })
```

Channel presence (who's online) comes free on the same channel object if wanted.

### 4. Write path

`POST /api/threads/[id]/messages`:
1. Authorize via `lib/chat/membership.ts` (same logic as the SQL function).
2. Zod-validate, parse mentions.
3. Transaction: `threadMessage.create` + `thread.update({ lastMessageAt })`,
   lazily upsert the sender's `ThreadParticipant`.
4. Trigger handles live fan-out.
5. Fan out Expo push to participants minus sender where
   `notifyPush && (mutedUntil IS NULL OR mutedUntil < now())` — one batched HTTP
   call to Expo's push API. Tokens registered by the native app at login.
6. Broadcast a small event on `inbox:{userId}` per recipient so thread lists /
   badges update without per-thread subscriptions.

### 5. Unread / badges

`PATCH /api/threads/[id]/read` sets `lastReadAt = now()` on the participant row.
Badge = count of threads where `lastMessageAt > lastReadAt` (or participant row
missing for a derived team channel with messages).

## Build order

1. **Schema + REST CRUD + team-channel UI** with fetch-on-open (no realtime).
   Shippable on web alone. Includes `lib/chat/membership.ts`.
2. **Broadcast trigger + RLS policy + web subscription** — coaches see messages
   land live. Typing/presence optional here.
3. **Native app slice:** same supabase-js subscription + `DevicePushToken` +
   Expo push fan-out. Push is what makes athlete-side chat viable.
4. **Later:** `DIRECT` type absorbs the legacy `Message` model
   (`app/athlete/messages/`); care-team threads migrate into `GROUP` with
   `anchorType: 'INJURY_ASSESSMENT'`; email digest for unread (blocked on the
   email kill switch anyway); message search; reactions.

## Deliberately out of scope (v1)

- Athlete↔athlete DMs (safeguarding — revisit with a coach-visible policy).
- Free-form channels beyond one per team.
- Full message threading (reply-to is shallow).
- Read receipts per message (cursor only).
- Edit history / moderation queue — soft delete only.
