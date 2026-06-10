# Coach FAQ

Answers to the most common questions from coaches and staff using the platform.

## Athletes & Roster

### Q: How do I add an athlete?

Two ways: create the athlete yourself under **Clients → New**, or send an invitation from the **Invitations** page so the athlete creates their own account and is linked to you. The invitations page also shows which invites have been used and by whom.

### Q: How many athletes can I have on my plan?

FREE (trial) allows 1 athlete, BASIC 20, PRO 100, and ENTERPRISE is unlimited. The limit is checked when you create a new athlete — if you've reached it you'll be asked to upgrade. Coaches who are members of a business have their limit managed at the business level instead.

### Q: How does the free trial work?

New coach accounts start on a 14-day FREE trial with room for 1 athlete. You get warning notifications before expiry, and the trial is closed automatically when it ends — upgrade to keep full access.

### Q: Can I give club staff access to one athlete without a full account?

Yes. From the athlete's page you can create an **external access link**: a revocable, token-based, read-only link scoped to that athlete's calendar, workouts, and tests. You can set an expiry, see how many times it has been viewed, and revoke it at any time. The athlete can see these links in their privacy settings.

## AI Setup

### Q: How do I set up the AI (API keys / BYOK)?

Go to **Settings → AI**. The platform uses bring-your-own-key: you paste your own API keys for Anthropic (Claude), Google (Gemini), and/or OpenAI. Keys are validated when you save and stored encrypted; you can remove or replace them at any time. AI features then run on whichever providers you've connected.

### Q: Which AI models are used?

You generally don't pick exact models. Features request an intent — **fast** for quick/cheap tasks, **balanced** for everyday work, **powerful** for complex generation — and the platform maps that to an appropriate model from your connected providers.

### Q: Whose keys do my athletes' AI features use?

An athlete's AI runs on the keys of the coach/business account their athlete record belongs to. Athlete AI consumption is metered against the athlete's own monthly credit allowance, with warnings as it runs low and top-up packs available when it's exhausted.

### Q: What AI usage do my athletes get?

Each athlete has a monthly AI allowance based on their tier (FREE 3 SEK, STANDARD 30, PRO 75, ELITE 150 by default; trials 15). ELITE allowances can be customized per business, and individual athletes can be given a custom allowance. Athletes can buy top-up packs themselves when they run out.

## AI Assistant & Actions

### Q: How does the AI assistant panel decide which athletes need attention?

The dashboard panel shows automatically generated alerts, refreshed every 30 minutes, across five types: **Readiness drop** (3+ consecutive days with readiness below 5.5), **Missed check-ins** (no daily check-in for 3+ days, with severity rising at 5 and 7 days), **Missed workouts** (past-due assignments not completed), **Pain mention** (recent injury/pain mentions in the athlete's AI conversations), and **High ACWR** (load ratio above 1.5, critical above 2.0). You can dismiss, action (with a note), or resolve each alert.

### Q: Can the AI chat create sessions for my athletes?

Yes. The coach AI chat can generate and save strength sessions, cardio/interval sessions, hybrid workouts, and sport-specific workouts, modify existing strength sessions, and plan team workouts into the calendar. Every one of these shows a confirmation card first — nothing is created until you confirm. These actions also require the right staff permissions (AI access and studio access; calendar actions require event-creation permission).

### Q: Can the AI generate a full training program for an athlete?

Yes — "generate training program" starts a multi-week build after you confirm the action card. It requires your AI and program-editing permissions **and** the athlete's GDPR consent, since it processes their health and training data.

### Q: Why can't the AI act for a particular athlete?

Three gates must all pass: (1) AI operations must be enabled, (2) you need the relevant staff permissions, and (3) for actions touching an athlete's personal data — like program generation — the athlete must have granted AI data-processing consent. If the athlete hasn't consented (or has withdrawn), those capabilities simply aren't available for them.

### Q: Can the AI draft and send messages to athletes?

Yes. Ask the assistant to message an athlete or a whole team; it prepares the message and shows a confirmation card with recipients and the full text. The message is only sent after you click confirm — drafts are never sent automatically and expire if left unconfirmed.

### Q: What are knowledge skills?

Curated knowledge packages (topic description, trigger keywords, linked reference documents) that the AI automatically matches against your questions. When a skill matches, excerpts from its documents are injected into the AI's context, so answers about e.g. training methodologies are grounded in vetted material rather than general knowledge.

## Testing & Zones

### Q: How do I enter a lactate test and get zones?

Go to **Tests → New**, choose the athlete and test type (running, cycling, skiing), and enter each stage in order with intensity (speed/power/pace), heart rate, and lactate. On save, the platform calculates the aerobic threshold (LT1, around 2.0 mmol/L) and anaerobic threshold (LT2, defined as the second crossing of 4.0 mmol/L, found by interpolation between stages), then generates five training zones and a full report.

### Q: What threshold-detection methods are used?

The platform uses D-max curve analysis (including the Bishop Modified D-max) where the lactate curve supports it, and falls back to linear interpolation at fixed lactate concentrations when it doesn't. A "smart" selection picks the most reliable method for the curve shape, and elite-athlete profiles with flat curves get special handling.

### Q: The form warns about decreasing lactate values — will the test still save?

Yes. Decreasing lactate across stages produces a data-quality warning (in the form, on save, and in the calculation output), but the test is saved anyway — the warning is informational. Out-of-range values (e.g. lactate outside 0–30, HR outside 40–250) are hard-blocked, however.

### Q: What other testing tools exist?

Beyond lactate tests: field tests, ergometer test protocols with critical-power analysis (Concept2, Wattbike, air bikes), hockey-specific test batteries, agility testing with timing-gate import, body composition, and a team kiosk mode for running tests with a whole squad.

## Programs & Studios

### Q: What's the difference between the studios?

The **Strength**, **Cardio**, **Hybrid**, and **Agility** studios are where you build session content — strength sessions, cardio/interval sessions, mixed-modality hybrid workouts, and agility/speed work respectively. The **AI Studio** is your AI workspace for deep conversations with athlete data and your documents as context (including drafting complete programs in chat), and the **AI Canvas** is a workspace for AI-assisted structured content.

### Q: How do I generate a training program?

Use the program wizard (configure goal, methodology, duration, and constraints) or ask the AI. Programs are periodized into phases and respect the athlete's calendar availability — days blocked by vacation/travel/illness events are avoided, and reduced days are lightened. Generation runs in the background and you're notified as it completes.

### Q: How do I export a program as PDF?

Open the program and use the export action — programs can be exported as PDF (and as JSON for data portability). Note that PDF export of very large reports can time out on slow connections; retry if needed.

### Q: What do the ACWR colors/zones mean?

ACWR is the athlete's 7-day load divided by their 28-day load. Below 0.8 = detraining (gradually increase load), 0.8–1.3 = optimal (low injury risk), 1.3–1.5 = caution (maintain, don't increase), 1.5–2.0 = danger (reduce 20–30%), above 2.0 = critical (reduce 40–50% or rest). The system can generate corresponding training modifications automatically.

### Q: Why is an athlete's ACWR missing or stale?

ACWR is computed by a nightly job, so workouts logged today are reflected tomorrow morning. It also requires roughly 28 days of training history before a meaningful ratio exists — new athletes won't have one yet.

### Q: How does strength progression work?

The engine estimates 1RM from logged sets (Epley/Brzycki), applies the 2-for-2 rule (beat the rep target by 2+ reps in the last set, two sessions in a row → increase load), and detects plateaus. A nightly sweep keeps progression recommendations current.

## Teams & Calendar

### Q: How do team calendar workouts work?

Create events in the team calendar (practices, strength, conditioning, games, tests, meetings, rest days, etc.) in day/week/month views, optionally recurring weekly. Physical sessions carry a content status (planned framework → needs content → content ready → assigned) and a content owner, so staff can see what still needs building. You can link an existing studio workout to an event and assign it to the whole roster — that creates one assignment per player and tracks completion counts. Practices support structured practice plans with a printable practice sheet, plus attendance tracking.

### Q: What is the responsible coach on a team event?

The named staff member accountable for delivering that session. Business owners, admins, coaches, and staff directly assigned to the team can be picked as responsible coach; events can also be left without one.

### Q: Can I plan a whole season?

Yes — each team can have an active team plan divided into ordered blocks, plus annual-plan events in the calendar. The team calendar shows the active plan so daily sessions are created inside the right phase.

### Q: How do athlete calendar blockers affect my planning?

When an athlete (or you) adds vacation, travel, illness, camps, or work/personal blockers with a training impact (no training / reduced / modified / normal), program generation and session planning exclude blocked days and flag reduced ones. Illness events add a gradual return-to-training ramp. Calendar changes are logged and can notify you, and conflict detection flags clashes with scheduled workouts.

### Q: Can I see everything across organizations in one calendar?

Yes. The unified coach calendar has three modes: Personal (your schedule across all organizations), All teams (full team calendars from every organization), and Planning (interactive planning with conflict detection). You control visibility per calendar (full details, busy-only, or hidden).

## Messaging & Monitoring

### Q: How do I message my athletes?

Open **Messages**: conversations are grouped per athlete with unread badges and an unread-only filter. Messages support up to 1,000 characters, show read receipts, and can reference a specific workout. You can also have the AI draft messages, which are only sent after your confirmation.

### Q: How do athletes report injuries to me and my staff?

Athletes connected to a care team submit injury reports (body part, severity 1–10 mapped to urgency, description) that go to the physio and relevant staff. Pain mentions in athlete AI conversations also surface as coach alerts, and a weekly injury digest summarizes the situation. Daily soreness is captured in check-ins.

### Q: What automatic monitoring runs in the background?

Nightly ACWR calculation and strength-progression sweeps; coach alerts every 30 minutes; pattern detection twice daily; milestone detection daily; morning briefings and post-workout check-ins hourly; pre-workout nudges every half hour; weekly summaries and injury digests on Mondays; plus monthly AI allowance resets.

## Integrations & Data

### Q: Which integrations can my athletes connect?

Strava, Garmin, and Concept2 for activities (with automatic push of new activities plus manual sync), and Oura for recovery data — all from athlete settings, on STANDARD tier and above. Garmin data can pre-fill the daily check-in. Athletes and coaches can also connect external calendars (Google, Outlook, Apple iCal; coaches additionally booking systems like Bokadirekt and Zoezi).

### Q: What consents do athletes need to give for AI features?

Athletes grant GDPR consent before the AI processes their data: training-data processing and health-data processing are required for AI features; consent for automated training adjustments is separate. Consent is versioned and logged, athletes can withdraw it any time, and AI actions for non-consented athletes are simply unavailable.
