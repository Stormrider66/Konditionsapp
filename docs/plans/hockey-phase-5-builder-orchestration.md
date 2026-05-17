# Hockey Phase 5 Builder Orchestration

## Goal

Use the hockey program corpus without forcing every off-ice need into Strength Studio. Phase 5 should make the AI and future program planner route each hockey block to the builder that already owns that kind of work.

## Current Builder Coverage

### Cardio Studio

Good fit for:

- Aerobic base work.
- LT1/LT2, VO2max, ramp, threshold, and controlled interval work.
- Repeated sprint ability such as 6x30 m and 7x40 m.
- Shift-repeat conditioning such as 30-45 s hard / bench-length recovery.
- Wattbike, SkiErg, rower, air bike, calorie, distance, power, heart-rate, and repeat-group intervals.

Missing hockey polish:

- Hockey presets for 7x40 m, shift-repeat conditioning, and Wattbike power repeats now live in `lib/hockey/hockey-builder-presets.ts` and are exposed as one-click templates in Cardio Studio.
- A clearer hockey label layer for fatigue drop, resistance, and shift sustainability.

### Hybrid Studio

Good fit for:

- Mixed off-ice conditioning.
- Sled push, sled pull, carries, medicine ball circuits, cal work, and station-based sessions.
- EMOM, AMRAP, for-time, tabata, chipper, ladder, intervals, and HYROX-style formats.

Missing hockey polish:

- Hockey-specific template tags such as sled drive, contact prep, and off-ice power now live in `lib/hockey/hockey-builder-presets.ts` and are exposed as one-click templates in Hybrid Studio.
- Better load hints for hockey athletes where the goal is repeat power, not race-style fatigue.

### Agility Studio

Good fit for:

- Acceleration, first-step speed, COD, deceleration, reactive agility, footwork, plyometrics, balance, LTAD filtering, and sport associations.
- Station rotations and reactive/random order sessions.

Missing hockey polish:

- Seeded hockey drill pack for off-ice edge-control analogs, lateral acceleration, reactive reads, and position-specific patterns. Initial acceleration, 5-10-5, and reactive mirror blueprints now live in `lib/hockey/hockey-builder-presets.ts` and are exposed as one-click templates in Agility Studio.
- A hockey-specific recommendation layer that connects test gaps to drill categories.

### Strength Studio

Good fit for:

- Loaded strength, max strength, power, flywheel/Kbox, unilateral strength, plyometrics, and separate prehab/stability sections.
- Hockey groin, hip, shoulder, ankle, and trunk risk work through the prehab section.

Boundary:

- Strength Studio should not become the full hockey program builder. It should own gym force development and prehab/stability, while conditioning, agility, and hybrid work stay in their native builders.

### Manual / Future Hockey Practice Planner

Good fit for now:

- On-ice skill, skating, puck handling, shooting, position-specific technical drills, forecheck, breakout, special teams, and team tactics.

Future gap:

- A dedicated hockey practice-plan builder can later combine drill cards, rink diagrams, line groups, work/rest density, and coach notes.

## Routing Rules

The shared routing source lives in `lib/hockey/hockey-program-blocks.ts`.

High-level routing:

- Cardio Studio: aerobic base, threshold, repeated sprint ability, shift-repeat conditioning, erg power.
- Hybrid Studio: mixed conditioning, sled power, medicine ball power, station circuits.
- Agility Studio: acceleration, deceleration/COD, reactive agility, lateral power.
- Strength Studio: strength/power and prehab/stability.
- Manual drill layer: on-ice technical and tactical work.

## AI Behavior

When the floating coach AI is asked for hockey programming, it should:

- Identify the main training effect first.
- Pick the builder by routing rule instead of defaulting to Strength Studio.
- Use Strength Studio only for gym strength, power, and prehab/stability.
- Use Cardio Studio for repeated-sprint, shift-repeat, threshold, and erg interval work.
- Use Hybrid Studio when multiple station movements are mixed into a circuit.
- Use Agility Studio or `createSportWorkout` for acceleration, COD, lateral, and reactive movement work.
- Explain clearly when a request is on-ice technical/tactical work and needs manual drill planning until a hockey practice planner exists.

## Recommended Next Phases

1. Build a dedicated on-ice practice planner for technical/tactical sessions: rink zones, drill cards, line groups, goalie/position notes, work/rest density, and coach notes.
2. Build a weekly hockey orchestration view that combines Strength, Cardio, Hybrid, Agility, and manual/on-ice blocks into one plan.
3. Add a recommendation layer that converts hockey test gaps into suggested templates, for example first-step acceleration, 5-10-5 deceleration, shift-repeat conditioning, or contact-prep circuits.
