# AI Features Guide

A complete tour of the platform's AI: the floating chat for athletes and coaches, action confirmations, memory, knowledge skills, voice, video analysis, automated briefings, and how AI usage is paid for.

## What it is

The platform has an AI assistant woven through the product. The centerpiece is a floating chat bubble available on every page — one version for athletes, one for coaches — that can not only answer questions but actually do things: create workouts, log meals, plan calendars, and draft messages. Around it sit voice features, video technique analysis, automated morning briefings, nudges, and milestone celebrations.

## Where to find it

- **Athletes:** the floating chat button appears on all athlete pages. AI settings (consent, notifications, assistant preferences) live under Settings.
- **Coaches:** the floating AI chat appears across coach pages; AI Studio offers dedicated generation tools. API keys and model choices are configured under Coach Settings → AI.

## How it works

**Athlete chat — what it can do.** Beyond Q&A, the athlete assistant has registered actions: create and save today's workout, log/update/delete meals, list recent meals, save a daily readiness check-in, report an injury, update your profile (weight, height, sport, goal, target date, max HR, VO2max, special instructions), create calendar events (travel, illness, vacation, training camps), and start self-coached training-program generation. Program generation via chat requires a plan that includes it (Standard and above for self-coached athletes).

**Coach chat — what it can do.** Look up athletes by name, read an athlete's latest completed workout, summarize the team calendar, open navigation shortcuts, generate and save strength sessions, cardio/interval sessions, hybrid workouts, and sport-specific workouts, modify existing strength sessions, start multi-week program generation for an athlete (requires that athlete's consent), plan sessions into the team calendar, and draft messages to an athlete or team that are sent only after you approve them. Staff accounts only see actions their permissions allow.

**Action confirmation cards.** Any action that changes data produces a confirmation card in the chat showing exactly what will happen. Nothing is executed until you press the confirm button — the AI is explicitly instructed never to claim an action is done before you confirm. Read-only lookups run directly. Unconfirmed action drafts expire after 24 hours.

**GDPR consent (Athletes).** The first time you open the athlete chat you must approve data processing and health-data processing before chatting. The consent panel explains both, and you can revoke consent at any time in Settings (AI assistant section). Without consent, the AI actions that touch your data are unavailable.

**Conversation memory.** The assistant extracts memorable facts from your chats — injuries mentioned, goals, preferences, equipment, limitations, life events, feedback, and milestones — and uses them to personalize future conversations. A memory indicator in the chat shows when remembered context is in play.

**Knowledge skills.** Curated expert knowledge packs are auto-retrieved when your question matches them (by keywords or semantic similarity) and injected into the AI's context. You can also pick skills manually in the chat's skill picker, or just ask — for example "Use Norwegian Double Threshold and Lactate Threshold Testing" — and ask the assistant to list which skills it has.

**Voice.** The chat supports voice input (record, automatic transcription), spoken replies (premium AI voice with browser text-to-speech fallback), voice auto-send, an operator mode, and full realtime voice calls where you talk with the assistant live. During workouts, Focus Mode (strength, cardio, and hybrid sessions) offers a live voice coach that talks you through the session — this requires the Pro or Elite athlete plan.

**Video analysis.** Upload video for AI technique feedback: strength-exercise form, running gait, sport-specific movements, skiing technique (classic, skating, double pole), and HYROX stations. Analysis combines on-device pose tracking with an AI vision model. Video analysis requires the Pro athlete plan or above.

**Briefings, nudges, and milestones.** Scheduled AI jobs generate personalized morning briefings, pre-workout nudges, post-workout check-ins, pattern alerts (e.g., trends in your data), and milestone notifications, delivered as AI notifications and respecting your notification preferences.

**AI credits (Athletes).** Each athlete plan includes a monthly AI allowance in SEK: Free 3 kr, Standard 30 kr, Pro 75 kr, Elite 150 kr (the coach's business can customize Elite, and a custom allowance can be set per athlete; trials get 15 kr). The allowance resets each calendar month. A credit status card shows usage, with warnings at 80% and 90% and a blocked state at 100%. When you run out, AI features pause until the monthly reset — or you buy a top-up pack on the Subscription page: AI 50 (49 kr for 50 kr credits), AI 120 (99 kr for 120 kr), AI 275 (199 kr for 275 kr). Top-up credits are spent after your included allowance and expire after 180 days.

**Coach AI is BYOK (Coaches).** Coaches bring their own API keys — Anthropic (Claude), Google (Gemini), and/or OpenAI — entered under Coach Settings → AI, stored encrypted. You pay your provider directly for usage, giving full cost transparency. The same page sets your default model, restricts which models your athletes may use, and a separate AI cost page tracks spend.

## Common questions

**Q: Will the AI do things without asking me?**
A: No. Every data-changing action shows a confirmation card first and only runs when you confirm it. Drafts you ignore expire after 24 hours.

**Q: Why does the chat ask me to approve consent before I can use it?**
A: The assistant processes personal training and health data, so GDPR consent is required first. You can revoke it anytime in Settings, which disables the data-driven AI actions.

**Q: Does the AI remember what I told it last week?**
A: Yes — goals, injuries, preferences, equipment, and similar facts mentioned in chat are saved as memories and used to personalize future answers and workouts.

**Q: What happens when my AI credits run out?**
A: AI requests are blocked until the next monthly reset. You can keep going immediately by buying a top-up pack (49/99/199 kr) on your Subscription page.

**Q: Can I make the AI use a specific training methodology?**
A: Yes. Relevant expert knowledge is auto-retrieved, and you can explicitly request skills, e.g., "Use Norwegian Double Threshold".

**Q: As a coach, why do I need my own API key?**
A: Coach AI runs on your own Anthropic/Google/OpenAI account (keys stored encrypted), so you control costs and model choice. Athlete AI instead runs on the platform's monthly SEK allowance per athlete.

## Related features

- Subscriptions and tiers (AI allowances, video analysis, and live voice coaching gates)
- Injury reporting and rehab (the chat can file injury reports; injuries shape AI workouts)
- Integrations (synced activities give the AI real training context)
- Daily check-in and readiness (feeds AI workout-of-the-day generation)
