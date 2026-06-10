# Training Load and ACWR

How logged sessions become training load, how the nightly acute:chronic workload ratio (ACWR) is computed, what the risk zones mean, and how the AI uses them.

## What it is

Training load monitoring quantifies how much stress an athlete accumulates from training and whether the load is rising too fast. Every completed workout contributes a load score, and each night the platform computes the **acute:chronic workload ratio (ACWR)** — recent load (about the last 7 days) divided by longer-term load (about the last 28 days). A ratio near 1.0 means training is in line with what the body is adapted to; a high ratio signals elevated injury risk.

## Where to find it

- (Coaches) **Tools → Monitoring** shows per-athlete load and recovery trends (weekly load, HRV, resting HR, readiness, zone distribution). The dashboard's **AI Assistant** panel raises a "High load" alert when an athlete's ACWR exceeds 1.5, and roster and athlete-profile views surface each athlete's current load status.
- (Athletes) Your dashboard and training-load views show weekly load and injury-prevention insights based on the same data.

## How it works

**Each session adds load.** When a workout is logged as completed with a duration, a load entry is created for that day. If the session has a TSS (Training Stress Score) value, that is used directly; otherwise load is estimated from duration and effort: **duration in minutes × (RPE ÷ 10) × 0.9** (RPE defaults to 6 if not given). Multiple sessions on the same day add together. The session's RPE also sets its intensity label (≤3 easy, 4–5 moderate, 6–7 hard, 8+ very hard).

**Nightly ACWR calculation.** Every night at about 2:00 AM, a scheduled job processes all active athletes:

1. It sums the previous day's workout load for each athlete.
2. It updates two exponentially weighted moving averages (EWMA): the **acute load** (7-day weighting) and the **chronic load** (28-day weighting). EWMA means recent days count more than older days, rather than a flat average.
3. **ACWR = acute load ÷ chronic load**, stored as a daily summary per athlete together with the zone and injury-risk rating.

**ACWR zones and what to do.** The stored zones and their numeric ranges:

| ACWR | Zone | Injury risk | Guidance |
|---|---|---|---|
| below 0.8 | DETRAINING | Low | Load is low — increase ~5–10% weekly |
| 0.8 – 1.3 | OPTIMAL | Low | The sweet spot — keep going |
| 1.3 – 1.5 | CAUTION | Moderate | Maintain, don't increase |
| 1.5 – 2.0 | DANGER | High | Reduce load ~20–30% |
| above 2.0 | CRITICAL | Very high | Reduce ~40–50% or rest |

**Coach visibility.** Athletes who land in the DANGER or CRITICAL zone are flagged, and an ACWR above 1.5 generates a "High load" alert in the dashboard AI Assistant panel so you can intervene before an overuse injury develops.

**AI guardrails.** The AI that generates daily workouts applies hard load guardrails before producing a session: a **CRITICAL** load zone blocks generation entirely (rest is recommended), **DANGER** restricts output to recovery sessions only, **CAUTION** caps intensity at easy, and **DETRAINING** is treated as a good time to build. For the daily AI workout these guardrails classify the athlete's zone from the last 7 days of logged load, and they combine with injury checks (pain rules) and readiness before any workout is proposed.

**Why today's number can lag.** ACWR is computed once per night (~2:00 AM) from loads through *yesterday*. A workout you log today raises your daily load immediately, but it won't be reflected in the stored ACWR until tomorrow's nightly run. So directly after a big session, the displayed ACWR can look lower than reality for up to a day.

## Common questions

**Q: I just logged a hard workout — why didn't my ACWR change?**
A: ACWR is recalculated nightly at about 2 AM from the previous day's totals. Today's session will be included in the next nightly run; check back tomorrow.

**Q: What is a "good" ACWR?**
A: 0.8–1.3 is the optimal zone — your recent load matches what your body is adapted to. Both very low (detraining) and high (above 1.3) ratios carry trade-offs.

**Q: Why does the AI refuse to generate a workout for me?**
A: If your load is in the CRITICAL zone (ratio above 2.0), workout generation is blocked and rest is recommended. In the DANGER zone you'll only get recovery sessions, and in CAUTION the intensity is capped at easy.

**Q: My athlete shows ACWR 0 or no zone — why?**
A: ACWR needs training history. New athletes, or athletes with no logged load, have no chronic baseline yet, so the ratio can't be computed meaningfully until consistent logging builds up (the chronic average reflects roughly 28 days).

**Q: How is the load number itself calculated for a session without a power meter or TSS?**
A: From duration and perceived effort: minutes × (RPE ÷ 10) × 0.9. A 60-minute session at RPE 7 ≈ 38 load points; the same hour at RPE 9 ≈ 49.

**Q: Does an unlogged workout count?**
A: No. Only completed, logged sessions (with a duration) create load entries. Skipped or unlogged sessions don't contribute, which can make ACWR underestimate true load if logging is inconsistent.

## Related features

- High-load alerts in the dashboard AI panel — see *Getting Started: The Coach Dashboard*.
- The daily AI workout respects these guardrails plus injuries and readiness — see *Training Programs*.
- Readiness, HRV, and resting-HR trends live alongside load in Monitoring.
