# Training Programs

How training programs are created, generated with AI, assigned, and followed — for both coaches and athletes.

## What it is

A training program is a multi-week plan structured as weeks → days → workouts (each workout broken into segments such as warm-up, intervals, and cool-down). Programs can be built by a coach with the program wizard, generated with AI (by a coach in AI Studio, or by a self-coached athlete through chat), or imported. Every program belongs to a specific athlete and shows up in that athlete's program and calendar views.

## Where to find it

- (Coaches) **Programs** in the top navigation lists all programs for your athletes in the current business, with **Create New** (the program wizard) and **Import** buttons. Click a program to open its detail page with an overview and a calendar of all weeks and days.
- (Coaches) **AI Studio** (Tools menu) for AI-generated programs via chat.
- (Athletes) **Programs** in the athlete area shows your assigned programs; each workout also appears on your calendar. Self-coached athletes can request a new program directly in the AI chat.

## How it works

**Coach program wizard.** Creating a program is a 4-step flow:

1. **Sport** — endurance sports (running, cycling, skiing, swimming, triathlon), HYROX, strength, general fitness, team sports (football, ice hockey, handball, floorball, basketball, volleyball), and racket sports (tennis, padel).
2. **Goal** — sport-specific goal options.
3. **Data source** — base the program on the athlete's **test results** (e.g. a lactate test), their **sport profile** (FTP for cycling, CSS for swimming, VDOT for running, sport settings for team/racket sports), or **manual** input.
4. **Configuration** — athlete, length, sessions per week, and for endurance programs a training methodology: **Polarized (80/20)**, **Norwegian (double threshold)**, **Norwegian Singles (single threshold)**, **Canova (marathon specialist)**, or **Pyramidal**.

Submitting creates the program immediately and opens its detail page. For team flows, several programs can be created at once (one per athlete). Program creation is blocked if you have reached your subscription's athlete limit.

**AI program generation (Coaches).** In AI Studio you can generate complete programs conversationally, optionally loading the wizard's context ("Create program with AI") and attaching documents (methodology notes, templates) for extra context. Generation runs in the background and is split into phases for quality:

- Programs of 8 weeks or less are generated in a single phase.
- 9–16 weeks: 4-week phases. Longer than 16 weeks: 6-week phases.
- Each phase takes roughly 1–2 minutes, so a full program typically takes 1–10 minutes.

Progress moves through statuses: pending → generating outline → generating phase X of Y → merging → completed (or failed). A background poller picks up pending sessions about every minute, resumes sessions that stall for 10+ minutes, and retries a failed session up to 3 times. AI generation requires your own API key (Settings → AI) and a subscription plan that includes program generation. Program length is 1–52 weeks.

**Athlete self-coached generation via chat (Athletes).** Self-coached athletes (no assigned coach) on the **STANDARD** or **PRO** athlete tier can ask the AI chat to create a program. The AI first collects your sport, goal (optionally a goal date), program length (1–52 weeks), and sessions per week (1–14), plus an optional methodology, then starts the same background multi-phase generation. A progress card appears in the chat. The generator automatically pulls in your latest test data (VO2max, max heart rate, threshold values), your profile (age, weight, experience), and any active injuries, so the plan respects your physiology and limitations. Generation also requires available AI credits for the month.

**One generation at a time.** Only one program generation can run per athlete. If a generation is already in progress (pending, outlining, generating a phase, or merging), starting a new one is refused until the current one finishes.

**Assignment and following the program.** A program is tied to the athlete chosen during creation — there is no separate assignment step. The athlete sees it under Programs and on their calendar; the coach's program detail page shows the full week-by-week calendar with each day's workouts, segments, and completion logs. Both coaches and athletes can also import programs.

## Common questions

**Q: How long does AI program generation take?**
A: Usually 1–10 minutes depending on length. A 16-week program is generated in four 4-week phases at roughly 1–2 minutes per phase. You can keep using the app; progress is shown live.

**Q: Why can't I start a new generation?**
A: Only one generation can run per athlete at a time. Wait for the current one to complete (or fail) before starting another.

**Q: Why can't I generate a program as an athlete?**
A: Chat-based program generation requires that you are self-coached (no assigned coach) and on the STANDARD or PRO tier. If you have a coach, program creation goes through them.

**Q: What is the difference between the wizard and AI Studio for coaches?**
A: The wizard builds a program instantly from structured choices (sport, goal, data source, methodology). AI Studio generates programs conversationally with an AI model in the background and lets you add documents as context — better for bespoke, long, or unusual programs.

**Q: Which methodology should I pick?**
A: Polarized (80/20) keeps most volume easy with some very hard work; Norwegian emphasizes threshold work (double or single sessions); Canova is marathon-specific percentage-of-race-pace training; Pyramidal distributes intensity in a pyramid. The AI can also choose for you if you leave it unset.

**Q: A generation failed — is anything lost?**
A: The session is retried automatically up to 3 times. If it ultimately fails, no partial program is published; simply start a new generation.

## Related features

- Test results feed program intensity zones — see *Testing and Thresholds*.
- The daily AI workout and load guardrails — see *Training Load and ACWR*.
- Coach navigation and AI Studio location — see *Getting Started: The Coach Dashboard*.
