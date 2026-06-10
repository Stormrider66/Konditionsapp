# Injury Reporting and Rehab

How to report an injury, what the platform does with it (pain rules, training restrictions, AI guardrails), and how physios and coaches follow up.

## What it is

Injury management runs through the whole platform: athletes report pain or acute injuries, evidence-based pain rules (0–10 pain scale, University of Delaware soreness rules, red-flag detection) classify the situation, AI workout generation automatically works around active injuries, physios manage rehab and restrictions in their own portal, and coaches get daily digests and alerts.

## Where to find it

- **Athletes:** report an acute injury via the **Injury report** page in the athlete menu, or simply tell the AI chat about pain ("my knee hurts"). Rehab programs assigned to you appear under **Rehab**, and prevention advice under **Injury prevention**.
- **Physios:** the physio portal has a dashboard plus pages for acute reports, athletes, rehab programs, restrictions, treatments, and messages.
- **Coaches:** injury summaries arrive as a daily email digest; injured athletes are flagged in coach views.

## How it works

**Reporting via AI chat (Athletes).** Mention pain or injury in the chat and the assistant gathers the details: body part (knee, ankle, shoulder, lower back, hip, calf, hamstring, quadriceps, shin, ...), side (left/right/both/central), pain level 0–10, description, how it happened, when the pain occurs (during warmup, during/after workout, at rest, in the morning, constant), and red-flag questions — is your gait affected, is there swelling? You confirm before the report is saved. The report is then classified automatically:
- **Phase:** pain 7+ → ACUTE, pain 4–6 → SUBACUTE, below 4 → CHRONIC.
- **Recommendation:** gait affected or pain 8+ → rest at least 1 day; pain 6–7 → modify training; otherwise → continue with monitoring.
- Gait impact triggers an explicit red-flag warning recommending rest and professional assessment; pain 7+ triggers a high-pain warning.

**Reporting via the acute injury form (Athletes).** The Injury report page captures incident date and time, body part, side, mechanism, activity type, severity 0–10 (which auto-sets urgency), description, and immediate care given (ice, removed from play, ambulance called). Submitting sends the report to your physio and relevant staff for follow-up — if it is urgent or worsening fast, contact medical care directly.

**Pain rules applied to training decisions.** The training engine uses these thresholds:
- **Pain 0–2:** acceptable — continue with close monitoring.
- **Pain 3–4 (yellow flag):** modify immediately — roughly 30% volume and 40% intensity reduction for a week.
- **Pain 5–7 (red flag):** stop — 2–3 days complete rest, then cross-training substitutes (swimming, deep-water running); medical evaluation recommended at pain 6+.
- **Pain 8–10 (critical):** medical evaluation required.
- **Gait alteration overrides everything:** stop immediately, complete rest until medical clearance.

**Delaware soreness rules** add session-level checks: soreness during warmup that persists through the session → stop, 2–3 days off; soreness that reappears later in a session → stop, 2–3 days off; soreness in warmup that disappears → proceed with caution at ~20% reduced intensity for 3 days; pain persisting more than an hour after a workout → take a rest day. Night pain, constant pain, and swelling combined with pain 4+ are flagged for medical evaluation.

**How injuries shape AI workouts.** Guardrails run before every AI workout-of-the-day: active injuries exclude the affected body areas from exercise selection, physio-set training restrictions are honored, readiness scores adjust intensity, and workload-ratio (ACWR) checks apply — caution zone 1.3–1.5 and danger zone 1.5–2.0 add warnings and modifications, while a critical ACWR above 2.0 blocks generation entirely. Active injuries are also part of the AI chat's context, so conversational workout suggestions avoid them too.

**Physio portal (Physios).** The dashboard summarizes total athletes, athletes with active injuries, active rehab programs, pending acute reports, active training restrictions, and unread messages. Physios review and assess incoming acute reports, build rehab programs (athletes follow them on their Rehab page), set training restrictions by type, log treatments, and message athletes.

**Coach digest and alerts (Coaches).** A daily morning email summarizes pending workout modifications to review, active injuries (type, pain level, days active, phase), high-injury-risk athletes (ACWR above 1.3), and athletes with consecutive low readiness scores. A separate alerts job surfaces urgent items in-app.

## Common questions

**Q: What's the difference between telling the AI chat and using the injury form?**
A: The chat creates an injury assessment that immediately classifies phase and training recommendation and feeds the AI's workout guardrails. The form files an acute incident report that is sent to your physio and staff for human follow-up. For sudden, serious incidents use the form (or both).

**Q: Why did the AI refuse to generate my workout?**
A: Generation is blocked when your acute:chronic workload ratio is in the critical zone (above 2.0). Lower ratios (1.3–2.0) and active injuries don't block — they modify the workout and exclude affected areas instead.

**Q: I said my gait is affected — why is the response so strict?**
A: Pain that changes how you walk or run is a critical red flag for significant injury. The rules require stopping immediately and seeking professional assessment before resuming.

**Q: Is normal post-workout soreness treated as an injury?**
A: No. Soreness the day after a workout at pain 2/10 or less is treated as normal adaptation (DOMS). It becomes a flag when it persists, reappears mid-session, or exceeds the pain thresholds.

**Q: Who sees my injury report?**
A: Acute reports go to your assigned physio and relevant staff. Active injuries also appear in your coach's daily digest and the physio dashboard.

**Q: How do I follow my rehab plan?**
A: Programs your physio assigns appear on your Rehab page in the athlete menu, and restrictions they set are automatically respected by AI-generated training.

## Related features

- AI Features Guide (reporting injuries via chat; confirmation cards)
- Daily check-in and readiness (low readiness feeds coach alerts and workout intensity)
- Training load / ACWR monitoring (drives the injury-risk zones above)
- Physio messaging (follow-up on reports and rehab)
