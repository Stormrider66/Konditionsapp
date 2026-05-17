# Hockey Agility Drill Pack

## Source

The dedicated hockey agility pack is derived from the de-identified 2020-2026 NHL off-season program corpus, with the strongest direct signal from `NHL 2020/Agility.xlsx` and supporting recurring patterns from 2023-2026 program sheets.

The source programs repeatedly use:

- Hurdle preparation, hurdle jumps, and zig-zag hurdle work.
- Medicine-ball preparation and rotational/forward/backward throws.
- Cone touch patterns, including dice-five layouts and reactive cone touch.
- Lateral shuffle, sidestep, and lateral run into hurdle/sprint exits.
- Speed course, L-run, short shuttles, and longer "idioten" shuttle ladders.
- Repeated sprint formats such as 6/44, 4/16, and 3/7.
- Sled pushes over 2x20m and 2x25m.
- G-band lateral and half-moon cone touch work.
- Skater jumps, lateral hops, pogo-to-sprint, and lateral bound-to-sprint transfer.
- Low-agility return-to-ice progression before heavier ice/camp work.

## Implementation

The seeded pack lives in `prisma/seed-agility-drills.ts` as `hockeyAgilityDrills`.

It adds 30 hockey-specific system drills on top of the generic agility library. The drills are intentionally named with a `Hockey` prefix so they are easy to search and filter until the Agility Studio gets a richer sport-specific template UI.

Categories covered:

- `SPEED_ACCELERATION`
- `COD`
- `REACTIVE_AGILITY`
- `PLYOMETRICS`
- `FOOTWORK`
- `BALANCE`

All drills target `TEAM_ICE_HOCKEY` and include:

- Swedish and English names/descriptions.
- Equipment requirements.
- Default sets, reps or duration, and rest.
- LTAD stage bounds.
- Setup instructions and coaching cues.

## Product Notes

This seed pack is the content layer for the next product step: visible one-click hockey templates in Agility Studio. It should not replace the shared hockey builder presets in `lib/hockey/hockey-builder-presets.ts`; instead, those presets can select from these seeded drills when creating full agility workouts.

Future UI improvements should add:

- Hockey filter chip.
- Position tags: forward, defense, goalie, general.
- Focus tags: first step, lateral power, deceleration, reactive, return-to-ice.
- One-click sessions that combine 3-5 drills from this pack.
