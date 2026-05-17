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

- Hockey presets for 7x40 m, 30-45 s shift repeats, and bench-recovery templates. Initial preset definitions now live in `lib/hockey/hockey-builder-presets.ts`.
- A clearer hockey label layer for fatigue drop, resistance, and shift sustainability.

### Hybrid Studio

Good fit for:

- Mixed off-ice conditioning.
- Sled push, sled pull, carries, medicine ball circuits, cal work, and station-based sessions.
- EMOM, AMRAP, for-time, tabata, chipper, ladder, intervals, and HYROX-style formats.

Missing hockey polish:

- Hockey-specific template tags such as contact-prep circuit, lower-body power circuit, and off-ice compete circuit. Initial sled, contact-prep, and medicine-ball presets now live in `lib/hockey/hockey-builder-presets.ts`.
- Better load hints for hockey athletes where the goal is repeat power, not race-style fatigue.

### Agility Studio

Good fit for:

- Acceleration, first-step speed, COD, deceleration, reactive agility, footwork, plyometrics, balance, LTAD filtering, and sport associations.
- Station rotations and reactive/random order sessions.

Missing hockey polish:

- Seeded hockey drill pack for off-ice edge-control analogs, lateral acceleration, reactive reads, and position-specific patterns. Initial acceleration, 5-10-5, and reactive mirror blueprints now live in `lib/hockey/hockey-builder-presets.ts`.
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

1. Turn the shared hockey preset definitions into one-click UI templates inside each builder.
2. Seed a small hockey agility drill pack from the agility blueprints.
3. Add hockey tags/templates in Hybrid Studio from the shared preset definitions.
4. Build a hockey weekly orchestration object that can combine cardio, hybrid, agility, strength, and manual blocks into one plan.
5. Later, build a dedicated on-ice practice planner.
