# Glossary

Definitions of terms you will meet across the platform, grouped by area.

## Testing & Physiology

**Lactate test** — A graded exercise test where the athlete completes progressively harder stages (running speed, cycling power, or skiing pace) while blood lactate and heart rate are measured at each stage. The platform uses the stage data to calculate thresholds, training zones, and a full test report.

**Test stage** — One step of a lactate test at a fixed intensity, with recorded heart rate and lactate (and optionally VO2). Stages are analyzed in order from easiest to hardest.

**Lactate** — A blood marker (measured in mmol/L) that rises with exercise intensity. The shape of the lactate curve across test stages is what threshold detection works from.

**Aerobic threshold (LT1)** — The first physiological breakpoint, around 2.0 mmol/L lactate, marking the top of easy, sustainable endurance intensity. The platform finds it with curve analysis (D-max) when possible, otherwise by linear interpolation at 2.0 mmol/L.

**Anaerobic threshold (LT2)** — The second breakpoint, conventionally at 4.0 mmol/L lactate, marking the highest intensity that can be held in a roughly steady state. In this platform it is defined as the *second* crossing of 4 mmol/L on the lactate curve, found with linear interpolation between stages.

**D-max** — A threshold-detection method that finds the point on the lactate curve farthest from the straight line between its endpoints. The platform also supports Modified D-max (Bishop) and a "smart" variant that picks the most reliable method for the curve shape.

**VO2max** — Maximal oxygen uptake (ml/kg/min), the classic measure of aerobic capacity. It can be measured in testing or entered manually on the athlete profile.

**VDOT** — A running-performance index (from Jack Daniels' system) derived from race results. The platform calculates and updates an athlete's VDOT from logged race performances and uses it for pace guidance and race predictions.

**Training zones** — Five intensity zones calculated from your thresholds: Zone 1 recovery, Zone 2 aerobic base, Zone 3 tempo, Zone 4 threshold, Zone 5 VO2max work. Zones come with a confidence level depending on whether they were built from a lactate test, a field test, or an estimate.

**FTP (Functional Threshold Power)** — The highest cycling power an athlete can sustain for roughly an hour. Used in cycling programs to anchor power-based training zones.

**Critical power / critical velocity** — The highest power (or running speed) that can theoretically be sustained without continuously accumulating fatigue, estimated from multiple maximal efforts. Used in ergometer analysis and field tests.

**Running economy** — How much oxygen a runner uses at a given speed; calculated from test stages that include VO2 data (stages without VO2 are skipped).

**Field test** — A performance test done outside the lab (time trials, jump tests, sprint tests, etc.) used to estimate fitness and thresholds when lactate testing is not available.

**Ergometer** — An indoor machine with measurable output, e.g. Concept2 rower/ski-erg/bike, Wattbike, or air bike. The platform includes ergometer test protocols, pacing tools, benchmarks, and critical-power analysis.

**Timing gates** — Photocell gates used to time sprints and agility drills precisely. Results can be imported into the Agility Studio and shown in results tables and charts.

**1RM (one-repetition maximum)** — The heaviest load you can lift once in an exercise. The platform estimates 1RM from sub-maximal sets using the Epley and Brzycki formulas and uses it to prescribe strength loads.

**RPE (Rating of Perceived Exertion)** — A subjective effort score the athlete gives a session or set. Used in workout logging and in calculating training load.

**HRV (Heart Rate Variability)** — Beat-to-beat variation in heart rate, a sensitive marker of recovery. An optional part of the daily check-in (can be auto-filled from Garmin) and the largest component of the readiness score.

**RHR (Resting Heart Rate)** — Morning resting pulse. An optional check-in metric; an elevated RHR versus baseline lowers the readiness score.

## Training Load & Monitoring

**Training load** — A number representing how stressful a session was (driven by duration and intensity/RPE). Daily loads are summed and tracked over time to manage injury risk.

**TSS (Training Stress Score)** — A load metric used for endurance sessions, combining duration and intensity relative to threshold.

**Acute load** — Your recent training load, calculated as an exponentially weighted average over the last 7 days.

**Chronic load** — Your longer-term training load, an exponentially weighted average over the last 28 days. It represents what your body is currently adapted to.

**ACWR (Acute:Chronic Workload Ratio)** — Acute load divided by chronic load; the platform's main injury-risk indicator. Zones: **Detraining** (< 0.8), **Optimal** (0.8–1.3, the sweet spot), **Caution** (1.3–1.5, maintain but don't increase), **Danger** (1.5–2.0, reduce load 20–30%), **Critical** (> 2.0, reduce 40–50% or rest). ACWR is recalculated once per night, not instantly after each workout, and needs about 28 days of training history.

**Readiness score** — A 0–10 composite computed from the daily check-in: HRV (35%), wellness answers (30%), resting heart rate (20%), and ACWR (15%). Missing metrics redistribute their weight. Statuses: Excellent (≥ 8.5), Good (≥ 7), Fair (≥ 5.5), Poor (≥ 4), Very poor (< 4).

**Readiness decision** — The training recommendation attached to the readiness score: proceed as planned, reduce intensity, reduce volume, switch to an easy day, or rest. Red flags from any single metric can trigger a conservative decision even when the composite score looks fine.

**Check-in (daily check-in)** — A short daily questionnaire (under 2 minutes) covering sleep quality and hours, muscle soreness, energy, mood and stress, plus optional HRV and resting heart rate. Garmin users can have HRV, heart rate, and sleep pre-filled. The check-in feeds the readiness score.

**Readiness guardrails** — Safety rules applied when the AI generates training: high ACWR lowers the session's intensity (caution → easy, danger → recovery), a critical ACWR blocks generation entirely, injuries exclude affected body areas, and fatigue reduces the prescription.

**Delaware pain rules** — Evidence-based soreness/pain rules (from the University of Delaware) used in injury management to decide whether to proceed, modify, or stop training based on pain behavior.

**Injury report** — A structured report an athlete sends to the physio and staff: body part, severity (1–10, mapped to an urgency level), and a description. Available when the athlete is connected to a care team.

**Menstrual cycle phase modifiers** — Optional adjustments to intensity and volume recommendations based on cycle phase (menstrual, follicular, ovulatory, luteal). They modify recommendations, not the readiness score itself.

**Pattern detection** — A background AI job that scans athlete data for recurring patterns (for example readiness or load trends) and surfaces insights.

**Milestone detection** — A background job that detects achievements such as personal records and training milestones, so they can be celebrated and tracked.

**Coach alerts** — Automatically generated flags telling a coach which athletes need attention: readiness drops, missed check-ins, missed workouts, pain mentions, and high ACWR. Shown in the coach dashboard's AI assistant panel.

## Programs & Workouts

**Training program** — A multi-week structured plan with periodized phases and scheduled sessions, generated by the program wizard or the AI, or built manually by a coach.

**Periodization** — Organizing training into phases (base, build, peak, taper, etc.) with planned progression and recovery, so fitness peaks at the right time.

**Methodology** — The overall training philosophy a program follows. The platform supports **Polarized** (≈80% easy / 20% hard), **Norwegian** (double-threshold: high volumes of controlled threshold work, often twice a day), **Canova** (marathon-style training prescribed as percentages of race pace), and **Pyramidal** (most volume easy, decreasing amounts at moderate and high intensity).

**Taper** — The planned reduction of training volume in the final period before a goal race so fatigue drops while fitness is retained.

**Deload** — A planned lighter week inside a training block to absorb accumulated fatigue before the next progression.

**Brick session** — A triathlon workout combining two disciplines back-to-back (typically bike straight into run) to train the transition.

**WOD (Workout of the Day)** — A single-session workout the AI generates on demand for an athlete, adapted to readiness, recent training, injuries, and equipment. Free-tier athletes get a limited number per day; paid tiers are unlimited. Guardrails can lower its intensity or block it on critically high load days.

**Ad-hoc workout** — A workout done outside the app and logged afterwards. It can be captured from a photo (e.g. a whiteboard), a screenshot, a voice recording, free text, a structured form, or imported from Strava/Garmin/Concept2; the platform parses it into structured training data.

**Assignment** — A specific workout scheduled to a specific athlete on a specific date. Athletes complete assignments and the coach sees completion status.

**Team workout broadcast** — Assigning one workout to an entire team at once, which creates an individual assignment per roster member and tracks how many completed it.

**Interval session** — A structured cardio session of work and rest periods, built in the cardio tools and assignable to athletes or teams.

**Hybrid workout** — A mixed-modality session (e.g. strength + ergometer + running pieces), built in the Hybrid Studio, common for functional fitness and HYROX-style training.

**Agility workout** — Sprint/change-of-direction training built in the Agility Studio, with support for timing-gate results.

**2-for-2 rule** — A strength progression rule: when an athlete exceeds the rep target by two or more reps in the final set for two consecutive sessions, the load is ready to be increased.

**Plateau detection** — Automatic detection that an athlete's strength progression has stalled, prompting a program adjustment.

**VBT (Velocity-Based Training)** — Strength training guided by barbell speed measured with a sensor; velocity data is used to gauge load, fatigue, and intent.

**Practice plan** — The structured block-by-block content of a team practice (drills, segments, durations), attached to a team calendar event and printable as a practice sheet.

**Plan adjustment** — Automatic or suggested changes to upcoming planned sessions based on readiness, missed workouts, or load status.

## Nutrition

**Meal log** — A record of what an athlete ate, entered manually, via the AI chat, or via the food scanner. Logged meals are compared against daily targets.

**Daily macro targets** — The calories, carbs, protein, and fat an athlete should eat on a given day. Targets are training-aware: they account for that day's workouts, carbohydrate periodization, and daily activity, so a hard training day gets different targets than a rest day.

**Carb periodization** — Adjusting carbohydrate intake day-by-day to match training demands — more carbs around hard sessions, fewer on easy or rest days.

**Food scanner** — An AI feature that analyzes a photo of a meal and estimates the foods and amounts. It learns from your history and corrections (name fixes, portion-size bias, items you typically add or remove), shown with a "Personalized" badge when your past corrections informed the scan.

**Fueling** — In-session nutrition planning (what to eat and drink before, during, and after workouts), available on the athlete Fueling page.

**BMR (Basal Metabolic Rate)** — The energy your body uses at rest, estimated from body composition data and used in long-term nutrition planning.

**NEAT (Non-Exercise Activity Thermogenesis)** — Energy burned by everyday activity outside training; factored into daily calorie targets.

## AI Features

**AI assistant / AI chat** — The conversational assistant available to both coaches and athletes. It can answer questions with your training data as context, and — with the right permissions and consents — perform actions like creating sessions, logging meals and check-ins, or drafting messages.

**Model intent** — Instead of choosing an exact AI model, features request a capability level: **fast** (cheap, quick tasks), **balanced** (everyday work), or **powerful** (complex generation and analysis). The platform maps the intent to a concrete model from the configured provider.

**BYOK (Bring Your Own Key)** — Coaches connect their own AI provider API keys (Anthropic/Claude, Google/Gemini, OpenAI) in Settings. Keys are validated on save and stored encrypted; AI features then run on those keys.

**AI credits / AI allowance** — Each athlete has a monthly AI budget (measured in SEK) that AI usage draws from. The included amount depends on the subscription tier (FREE 3, STANDARD 30, PRO 75, ELITE 150 SEK by default; trials get 15 SEK), resets monthly, and warns at 80% and 90% before being exhausted.

**Top-up pack** — A one-time purchase of extra AI credits (AI 50, AI 120, or AI 275 packs) when the monthly allowance runs out. Top-up credits are spent only after the included allowance and expire after 180 days.

**Action confirmation card** — When the AI proposes an action with real consequences (creating a workout, sending a message, deleting a meal, starting program generation), it shows a card summarizing exactly what will happen. Nothing is executed until you press the confirm button; you can also cancel, and pending actions expire automatically.

**Consent (AI/GDPR consent)** — Before the AI can process an athlete's data and act on their behalf, the athlete must grant consent: processing of training data and of health data (injuries, readiness) are required; consent for automated training adjustments is separate. Consent is versioned, logged, and can be withdrawn at any time in settings.

**Conversation memory** — Long-term memory the AI builds from chats: goals, injury mentions, preferences, equipment, life events, and milestones, each with an importance level and optional expiry. It is what lets the assistant remember what you told it across conversations.

**Knowledge skill** — A curated knowledge package (description, keywords, and linked reference documents) on a topic such as a training methodology. When your question matches a skill, relevant document excerpts are automatically injected into the AI's context so answers are grounded in vetted material.

**Document library / RAG** — Coaches can upload documents that the AI searches with semantic (vector) retrieval, so answers can cite and rely on your own material.

**Video analysis** — AI-assisted movement analysis of uploaded video using pose tracking, available to athletes on PRO and above.

**Voice workout logging** — Recording a spoken description of a workout that the AI transcribes and converts into a structured log.

**Live voice coaching** — Real-time voice interaction with the AI during training, available on higher athlete tiers.

**Morning briefing** — A scheduled AI summary delivered to athletes with the day's readiness, planned training, and pointers.

**AI Studio** — The coach's AI workspace for in-depth conversations with athlete data and documents as context, including drafting complete training programs in chat.

**AI Canvas** — A coach workspace for AI-assisted visual/structured content connected to the AI system.

## Platform & Account

**Business / organization (tenant)** — The top-level account a coach operates under (a coaching business, gym, or club). All coach and athlete pages live under the business's own URL, and white-label custom domains are supported.

**Role** — Every user is a coach, athlete, physio, or admin, which controls which portal and features they see.

**Coach tiers** — Coach subscription levels with athlete limits: FREE (trial, 1 athlete), BASIC (20), PRO (100), ENTERPRISE (unlimited). The limit is enforced when adding athletes.

**Athlete tiers** — Athlete subscription levels: FREE, STANDARD, PRO, and ELITE. Higher tiers unlock integrations (STANDARD+), program generation (STANDARD+), video analysis and advanced intelligence (PRO+), and larger AI allowances; ELITE adds a personal coach arrangement with custom AI credits.

**Trial** — A time-limited period with extended access for new accounts (coach trials default to 14 days). Expiry is handled automatically with warning notifications beforehand.

**Self-coached** — An athlete without an assigned coach. Self-coached athletes on STANDARD or PRO can have the AI generate and adapt their training program; coached athletes cannot, because the program belongs to the coach relationship.

**Assigned coach** — The coach connected to an athlete's subscription. Having an assigned coach enables messaging and coach-driven programming, and makes the AI respect the coach's program rather than changing it.

**Invitation** — A coach-generated invite that lets an athlete create an account and connect to the coach/business.

**Staff roles & permissions** — Within a business, staff members (owners, admins, coaches, assistant coaches) have granular permissions (view athletes, edit programs, access studios, use AI, create events, etc.) that also gate which AI actions they can take.

**External access link** — A revocable, token-based, read-only link a coach can create so outside staff (e.g. a club's performance staff) can view one athlete's calendar, workouts, and tests without getting an account or broader access. Links can expire and views are counted.

**Integration** — A connection to an external service: Strava, Garmin, Concept2, and Oura for training/recovery data, plus external calendars. Managed in athlete settings.

**Sync** — Pulling activities or data from a connected integration. Syncs run automatically and can also be triggered manually with a sync button.

**Webhook** — The mechanism by which providers (Strava, Garmin, Concept2) push new activities to the platform automatically as they happen, so workouts appear without manual syncing.

**Studios** — The coach's session-building workspaces: Strength, Cardio, Hybrid, and Agility studios for creating workout content, alongside the AI Studio for AI-assisted work.

**Kiosk mode** — A team testing view designed for running tests with a whole squad on a shared screen/device.
