# Daily Check-ins and the Readiness Score

How the daily check-in works, exactly how your readiness score is calculated, and how it shapes your training day.

## What it is (Athletes)

The daily check-in is a quick (under 2 minutes) morning report of how you slept and how your body feels. The platform turns it into a **readiness score on a 0–10 scale** plus a training recommendation. The score feeds your dashboard readiness panel, your morning briefing, and the AI Workout of the Day (WOD).

## Where to find it

**Dashboard → Check-in** (top navigation). The dashboard readiness panel also shows a "check in" prompt each day until you've done it. You can also check in by talking to the floating AI chat, or by voice on the check-in page.

## How it works

### What you fill in (check-in form)

- **Optional device data**: HRV (RMSSD in ms, with a quality rating) and resting heart rate. If your Garmin is connected, a banner lets you import HRV, resting HR, sleep, and stress with one tap.
- **Wellness questionnaire** (sliders): sleep quality (1–10), sleep hours (0–12 in half-hour steps), muscle soreness (1 = none, 10 = extreme), energy level (1–10), mood (1–10), stress (1 = none, 10 = extreme), and injury sensation/pain (1 = none, 10 = severe).
- **Notes** (optional, shared with your coach). The platform scans notes for injury and illness keywords.
- **Injury details**: if you set pain to 3 or higher, an injury selector appears (body part, type, side, or illness). At pain 5+ you must complete it before submitting.
- **Rehab section** (only if you have an active rehab program): whether you did your rehab exercises, pain during/after (0–10), rehab notes, and a checkbox to request contact from your physiotherapist.

### How the readiness score is calculated (check-in page)

Two steps:

1. **Wellness score (0–10)** from the questionnaire, weighted: sleep quality 20%, fatigue/energy 20%, sleep duration 15% (7–9 hours scores best), muscle soreness 15%, stress 15%, mood 10%, motivation 5%.
2. **Composite readiness score (0–10)** that combines wellness with objective signals, with base weights: **HRV 35%, wellness 30%, resting HR 20%, training-load ratio 15%**. If a signal is missing, the remaining weights are scaled up proportionally. HRV and resting HR are compared against your personal baseline (built from your recent history), so the same number can score differently for different athletes. Note: the full composite score is only produced when you provide both HRV and resting heart rate; without them your wellness score is still saved and other features use simpler estimates.

Score bands: **Excellent ≥ 8.5, Good ≥ 7, Fair ≥ 5.5, Poor ≥ 4, Very poor < 4**. The recommendation follows the band: proceed as planned (Excellent/Good), reduce intensity ~10–20% (Good with warnings, or Fair), easy day with ~40% less intensity and ~25% less volume (Poor), or rest (Very poor). Critical warning flags from any metric force a rest recommendation regardless of the score. Athletes on a Norwegian-style (double threshold) plan are held to stricter thresholds for hard sessions.

### Checking in via the AI chat

If you tell the floating AI chat how you feel, it logs a check-in with seven 1–10 ratings (sleep quality, sleep hours, soreness, fatigue, stress, mood, motivation) and computes readiness with this exact formula:

**readiness = round((sleepQuality×20 + mood×15 + motivation×15 + (11−soreness)×15 + (11−fatigue)×20 + (11−stress)×15) ÷ 100 × 10)** — a 0–10 score.

The decision follows the score: **≥ 7 PROCEED, ≥ 5 REDUCE, ≥ 3 EASY, otherwise REST**. This is a simpler estimate than the check-in page's composite score, since the chat has no device baselines.

### Voice check-in

On the check-in page you can switch to **Voice check-in** and just describe how you feel (sleep, energy, soreness, stress, motivation). The AI transcribes it, extracts the wellness values, estimates a 0–10 readiness score, and recommends PROCEED / REDUCE / EASY / REST. The result is saved like a normal check-in.

### What your readiness changes

- **AI Workout of the Day (WOD)**: the generator caps intensity from your readiness — **≥ 8 allows threshold work, ≥ 6 moderate, ≥ 4 easy, below 4 recovery only**. A risky training-load ratio overrides this (caution zone forces easy; danger/critical forces recovery), and active injury or fatigue flags cap intensity at easy/recovery. With no check-in data, the WOD defaults to moderate.
- **Morning briefing**: regenerates right after you submit a check-in so it reflects today's data. Readiness ≥ 7 is highlighted as good; below 5 triggers a "take it easier" warning.
- **Injury response**: a concerning check-in (high pain plus details) can automatically adjust your upcoming workouts and notify your coach — you'll see an "Injury response activated" summary with the number of workouts modified.
- **Nutrition tip**: after submitting you get a readiness-aware nutrition tip for the day.

### Where to see your readiness

- **Dashboard readiness panel**: shows your most recent score (within the last 7 days) as a recovery percentage — ≥ 7 reads as high readiness, 5–7 normal, below 5 low.
- **Morning briefing card** shows the score behind today's advice.
- **AI workouts history** shows the readiness you had when each WOD was generated.
- (Coaches) Coach monitoring views chart readiness, HRV, resting HR, and wellness trends per athlete over time.

## Common questions

**Q: Do I need an HRV monitor or watch?**
A: No. The questionnaire alone works and is always saved. HRV and resting HR make the score more objective and unlock the full composite calculation, so connect Garmin or enter them if you can.

**Q: I checked in twice today — what happens?**
A: There is one check-in per day. Submitting again updates the same day's values and recalculates the score.

**Q: Why is my readiness "missing" even though I checked in?**
A: The full composite score needs HRV and resting heart rate. Without them your wellness answers are still recorded and used (for example by the morning briefing and the AI chat), but the panel may not show a composite score.

**Q: Will a bad check-in cancel my workout?**
A: It never deletes anything. It recommends reducing intensity, switching to an easy day, or resting — and AI-generated workouts automatically respect those caps. Your planned program stays visible; high pain reports can trigger automatic workout adjustments with your coach notified.

**Q: What readiness score should I aim for?**
A: 7 or above generally means you're ready for planned training, including quality sessions. Persistent scores below 5 are a signal to prioritize sleep and recovery and talk to your coach.

## Related features

- AI Workout of the Day (readiness-aware workout generation)
- Morning briefing card on the dashboard
- Injury reporting and physio contact (rehab athletes)
- Garmin integration (auto-fills HRV, resting HR, sleep)
