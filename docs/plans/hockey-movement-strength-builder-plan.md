# Hockey Movement Library and Strength Builder Plan

## Goal

Turn the movement patterns from the de-identified hockey program corpus into app-native building blocks so coaches and AI tools can create complete hockey strength sessions without hiding stabilization, prehab, power, or speed work inside generic strength exercises.

## Product Decision

Stabilization work should be a dedicated `Stability / Prehab` section in strength sessions.

This is better than storing it as normal strength because hockey prehab has a different coaching job:

- It protects common risk areas: groin, hip, trunk, shoulder, foot/ankle.
- It uses lower load, tighter technique, and more frequent exposure.
- It should be visible in session summaries, athlete execution, voice coaching, and AI generation.
- It should still use the existing exercise library, so coaches can search and reuse movements instead of learning a second system.

## Phase 1: App Foundation

Add a `prehabData` JSON section to `StrengthSession`, parallel to `warmupData`, `coreData`, and `cooldownData`.

Wire it into:

- Coach strength builder.
- Strength session create/update APIs.
- Athlete focus mode and workout preview.
- Voice coaching workout context.
- Printable workout normalization.
- Exercise usage statistics.
- AI/import parsing for strength sessions.

## Phase 2: Hockey Movement Seed Pack

Seed a public hockey movement pack from the corpus with:

- Stabilization/prehab: groin, hip, trunk, shoulder, foot/ankle.
- Hockey strength: flywheel/Kbox, unilateral squat/hinge, lateral patterns.
- Power and speed prep: med-ball, skater jumps, seated box jumps, sled accelerations.
- Searchable Swedish and English names.
- Target body parts, contraindications, instructions, equipment, and biomechanical pillars.

## Phase 3: AI Generation Upgrade

Teach strength-generation tools to create a prehab section when the athlete sport, goal, or injury-risk context calls for it.

The AI should route:

- Mobility and ramp-up to warmup.
- Main loaded lifts to main.
- Groin/hip/shoulder/ankle control to prehab.
- Trunk anti-rotation and bracing to core.
- Static mobility/breathing to cooldown.

## Phase 4: Hockey-Specific Gaps

The current app can create much of the gym work, but it is weaker at:

- On-ice technical drills.
- Repeated sprint ability blocks with exact work-rest ratios.
- Off-ice acceleration/deceleration/agility prescriptions.
- Hybrid conditioning circuits that blend ergometers, sleds, and med-ball output.
- Position-specific goalie/defense/forward variants.

Those should become sport-specific program blocks after the prehab and movement foundation is stable.

## Current Implementation Slice

Build Phase 1 and the initial Phase 2 seed pack first. This gives coaches immediate value and creates the data model AI tools can use in later phases.
