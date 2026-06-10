# Athlete FAQ

Answers to the most common questions from athletes using the platform.

## Daily Check-in & Readiness

### Q: How do I do my daily check-in?

Open **Check-in** from your athlete menu. It takes under two minutes: rate your sleep quality and hours, muscle soreness, energy, mood, and stress, and optionally add HRV and resting heart rate. If you have Garmin connected, HRV, heart rate, and sleep can be pre-filled automatically. Your answers feed your daily readiness score.

### Q: Why did my readiness score drop?

Readiness is a 0–10 composite of four inputs: HRV (35%), your wellness answers (30%), resting heart rate (20%), and your training-load ratio ACWR (15%). A drop in any of them — poor sleep, high soreness or stress, suppressed HRV, elevated resting pulse, or a spike in training load — pulls the score down. Single red flags (like a very bad night's sleep) can also trigger a conservative recommendation even if the overall number looks okay.

### Q: What do the readiness statuses mean?

Excellent is 8.5 or above, Good is 7+, Fair is 5.5+, Poor is 4+, and Very poor is below 4. Each comes with a recommendation: proceed as planned, reduce intensity, reduce volume, take an easy day, or rest.

### Q: Why did my workout's intensity get reduced?

The AI applies safety guardrails when generating training. If your ACWR (acute:chronic load ratio) is in the caution zone (1.3–1.5) the session is lowered to easy; in the danger zone (1.5–2.0) it becomes recovery-level; above 2.0 generation is blocked entirely and rest is recommended. Active injuries exclude affected body areas, and low readiness or high fatigue also reduces the prescription. The workout shows which guardrails were applied.

### Q: Can my menstrual cycle affect my recommendations?

Yes, optionally. If cycle tracking is enabled, the phase (menstrual, follicular, ovulatory, luteal) adjusts intensity and volume recommendations — for example slightly reduced intensity in the menstrual and luteal phases, and a note about peak performance but higher ligament-injury risk around ovulation. The phase modifies recommendations, not your readiness score itself.

## Training Load & ACWR

### Q: Why doesn't my ACWR update right after I log a workout?

ACWR is recalculated by a nightly background job, not in real time. Your logged workout counts toward today's load immediately, but the acute/chronic averages and the ratio refresh overnight. Check again the next morning.

### Q: What is ACWR and what should mine be?

ACWR compares your last 7 days of training load (acute) with your last 28 days (chronic). The sweet spot is 0.8–1.3. Below 0.8 you are detraining; 1.3–1.5 is caution (hold, don't increase); 1.5–2.0 is danger (reduce load); above 2.0 is critical (heavy reduction or rest). It needs about 28 days of training history before it can be calculated.

## Workouts & Logging

### Q: How do I log a workout I did outside the app?

Use **Log workout** (ad-hoc logging). You can snap a photo of a whiteboard or paper, upload a screenshot, record a voice description, type free text, fill in a structured form, or import the activity from Strava, Garmin, or Concept2. The platform parses it into a structured workout in your history.

### Q: How do I get a daily AI workout (WOD)?

Ask for a workout of the day and the AI builds a single session adapted to your readiness, recent training, injuries, restrictions, and equipment. On the free tier you get 3 WOD generations per day; paid tiers are unlimited. If your training load is critically high, generation is blocked and rest is recommended instead.

### Q: Can the AI make me a full training program?

Yes, if you are self-coached (no assigned coach) and on the STANDARD or PRO plan. Program generation runs as a multi-week build that you start from the AI chat after confirming an action card. If you have a coach, the AI will not create or change your program — that stays with your coach.

### Q: Where do I find my program and planned sessions?

Your active program is on the **Program** page, and individual planned sessions appear in your calendar and workout pages. The dashboard shows what's coming up.

## Tests & Zones

### Q: Where do I see my test results and zones?

Open **Tests** in your athlete menu. Each test has a detailed report with your thresholds (aerobic and anaerobic), training zones, and the underlying stage data. Zones are also used to prescribe intensity in your workouts.

### Q: What are training zones?

Five intensity ranges calculated from your two lactate thresholds: Zone 1 (recovery), Zone 2 (aerobic base), Zone 3 (tempo), Zone 4 (threshold), Zone 5 (VO2max work). Zones come with a confidence level depending on whether they were derived from a lactate test, a field test, or an estimate.

## Pain & Injury

### Q: How do I report pain or an injury?

If you are connected to a care team, use the **Injury report** page: pick the body part, rate severity 1–10 (which sets the urgency), and describe what happened — the physio and relevant staff receive it for follow-up. You can also tell the AI chat, which will offer to create an injury report after you confirm. Day-to-day soreness is captured in the daily check-in, and mentions of pain in AI conversations can also flag your coach.

### Q: What happens after I report an injury?

The report goes to the physio/staff with an urgency level based on severity. Active injuries then influence your training: the AI excludes affected areas from generated sessions, and your coach and physio can set up rehab work. If something is urgent or getting worse fast, contact medical care directly.

## AI Assistant

### Q: Why does the AI ask me to confirm actions?

Anything with real consequences — creating a workout, logging or deleting a meal, saving a check-in, reporting an injury, updating your profile, creating a calendar event, starting program generation — is first shown as a confirmation card describing exactly what will happen. Nothing is saved or sent until you press confirm; you can always cancel, and unconfirmed actions expire on their own.

### Q: What is the consent screen about — what happens to my data?

Before the AI can work with your data, GDPR consent is required: processing of your training data and of your health data (injuries, readiness) are both required for AI features; consent for automated training adjustments is separate and optional. Your consent is versioned and logged, and you can withdraw it at any time in settings — the AI then stops acting on your data.

### Q: Does the AI remember what I told it?

Yes. The platform extracts memorable facts from your conversations — goals, injury mentions, preferences, equipment, life events, milestones — and stores them as long-term memory with an importance level (some memories expire). Future conversations use this so you don't have to repeat yourself.

### Q: How do I change my goal, weight, or sport?

Either edit your profile in the athlete settings/profile pages, or simply tell the AI chat ("my weight is now 72 kg", "I'm switching focus to a half marathon in May"). The AI proposes a profile update — weight, height, primary sport, goal and target date, even manual VO2max or max HR — and applies it after you confirm.

### Q: Why are my AI credits used up, and how do I get more?

Every AI feature draws from a monthly credit allowance that depends on your plan (FREE 3 SEK, STANDARD 30, PRO 75, ELITE 150 by default; trials get 15). You get warnings at 80% and 90% usage. When it runs out you can buy a top-up pack (AI 50, AI 120, or AI 275) from the subscription page via card checkout — top-up credits are used after your included allowance and are valid for 180 days. The included allowance resets monthly.

### Q: Why is the AI chat telling me to slow down?

There is a short-term rate limit on chat messages (around 20 per minute) in addition to the monthly credit allowance. Wait a moment and continue.

## Integrations

### Q: How do I connect Garmin or Strava?

Go to **Settings → Integrations** and press Connect next to the service. You are sent to Strava/Garmin to authorize access, then returned to the app. Integrations require the STANDARD plan or higher. Concept2 (rowing/ski erg) and Oura connect the same way.

### Q: Do synced workouts appear automatically?

Yes — connected providers push new activities to the platform automatically as you complete them, so workouts usually appear on their own. Each integration also has a manual **Sync** button if you want to pull recent activities immediately.

### Q: Why can't I connect Strava on the free plan?

Strava, Garmin, and Concept2 integrations are part of the STANDARD tier and above. Upgrade your subscription to enable syncing.

### Q: Can I connect my personal calendar?

Yes. In calendar settings you can connect Google, Outlook, or an Apple/iCal calendar. Imported events are read-only, get a default training impact (normal unless you change it), and sync automatically so your training planning can see your real schedule.

## Calendar & Planning

### Q: How do I tell the platform I'm on vacation, traveling, or sick?

Add a calendar event from your **Calendar** page (or ask the AI chat to create one). Choose the type — vacation, travel, illness, training camp, altitude camp, work or personal blocker — and a training impact: no training, reduced, modified, or normal. Illness events can include a return-to-training date and medical clearance.

### Q: What happens to my training when I add a blocker?

Days marked "no training" are excluded when programs and sessions are planned, and "reduced"/"modified" days are flagged so the plan lightens them. After an illness, the days up to your return-to-training date are automatically treated as a gradual ramp-up. The AI also sees your calendar when suggesting workouts.

## Coach & Messaging

### Q: How do I message my coach?

Open **Messages** in your athlete menu — it's a single thread with your coach. Messages are up to 1,000 characters and show read receipts (the envelope opens when your coach has read it). Messages can also reference a specific workout.

### Q: Why don't I see a coach in Messages?

Messaging requires a connected coach. If you are self-coached or your coach relationship isn't set up yet, the page shows that no coach is available. Once a coach is assigned to you, the thread appears.

### Q: What's the difference between being self-coached and having a coach?

Self-coached means no coach is assigned to your subscription — you manage your own training, and the AI can generate and adapt programs for you (on STANDARD/PRO). With an assigned coach, the coach owns your programming: you get messaging and coach-built training, and the AI assists but won't change your program.

## Nutrition

### Q: How do I log meals or scan food?

Use the **Nutrition** page. You can log meals manually, tell the AI chat what you ate (it logs after you confirm), or photograph your plate with the food scanner, which identifies foods and estimates portions. The scanner learns from your corrections over time — recurring name fixes, your typical portion sizes, items you usually add or remove — and shows a "Personalized" badge when your history informed the result.

### Q: Where do my daily calorie and macro targets come from?

Targets are training-aware: they are computed per day from your profile and that day's training — workouts, carbohydrate periodization, and daily activity — so hard days get more fuel than rest days. The stats, trend charts, and dashboard cards all compare your logged meals against these same daily targets.

## Matches (Team Sports)

### Q: How do I track my matches?

Team-sport athletes have a **Matches** page. Add matches with opponent, home/away, date, venue, and competition, then record post-match stats — minutes played, goals, assists, plus/minus and penalty minutes for hockey, or GPS distance/sprint/max-speed data for football. Matches can also be linked into your calendar.

## Account & Subscription

### Q: What do the athlete plans include?

FREE covers test reports, a basic profile, and training history with a small AI allowance. STANDARD adds daily check-ins, workout logging, Strava/Garmin/Concept2 sync, program generation (if self-coached), nutrition planning, and a bigger AI allowance. PRO adds video analysis, advanced intelligence features, self-service templates, live voice coaching, and a larger AI pot. ELITE is a personal-coach arrangement with custom AI credits.

### Q: Where do I manage my subscription and buy AI top-ups?

On the **Subscription** page in your athlete menu. You can change plans there and purchase AI top-up packs via card checkout.
