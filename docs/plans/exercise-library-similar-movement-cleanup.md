# Exercise Library Similar Movement Cleanup

Generated from the global public, non-warmup Strength Studio scope on 2026-05-26.

## Current Image Status

- Scope checked: 239 global public exercises with a biomechanical pillar, excluding warmups.
- Image sync status: 239 up to date, 0 missing images.
- Unused production image slugs after sync: `dumbbell-snatch-fem`, `inchworm`, `varldens-basta-stretch`.

## Cleanup Principle

Avoid hard-deleting exercises first. Some exercises are referenced by strength sessions, templates, aliases, progressions, favorites, logs, and generated programs.

Preferred cleanup path:

1. Pick one canonical exercise per true duplicate group.
2. Add global `ExerciseNameAlias` rows for the old names and spelling variants.
3. Migrate references from duplicate exercise IDs to the canonical ID.
4. Hide or de-publicize the duplicate only after references are migrated and verified.

Keep separate rows when the distinction changes prescription, equipment, scoring, or sport context.

## Strong Merge Candidates

These look like true duplicate or singular/plural naming pairs:

| Group | Candidate canonical | Duplicate or alias candidate | Notes |
| --- | --- | --- | --- |
| Push-up | `Push-Up` | `Armhävningar` | Same movement. Preserve Swedish name as alias/translation. |
| Burpee | `Burpee` | `Burpees` | Same movement, but current rows disagree on category and pillar. Canonical row should keep the better hybrid/gymnastics metadata. |
| Good Morning | `Good Morning` | `Good Mornings` | Same movement. |
| Mountain Climber | `Mountain Climber` | `Mountain Climbers` | Same movement. |
| Sit-Up | `Sit-Up` | `Sit-ups` | Same movement and currently share the same image. |
| V-Up | `V-Up` | `V-ups` | Same movement and currently share the same image. |
| Walking Lunge | `Walking Lunge` or `Utfallssteg` | the other row | Same movement, but current rows disagree on pillar. Review usage before choosing canonical. |

## Intentional Similar Variants

These should usually stay separate:

| Group | Reason to keep separate |
| --- | --- |
| `Row (Calories)` / `Row (Meters)` | Same erg movement, different workout scoring unit. |
| `Bike (Calories)` / `Bike (Meters)` | Same station, different workout scoring unit. |
| `SkiErg` / `SkiErg (Calories)` / `SkiErg (Meters)` | Shared image is fine, but HYROX station versus scored monostructural variants may be useful. |
| `Pallof Press` / `Pallof Press (band)` | Cable versus band setup changes equipment and coaching cue. |
| `DB *` versus barbell/bodyweight equivalents | Equipment changes loading and progression. |
| HYROX variants like `Sled Push (HYROX)`, `Sled Pull (HYROX)`, `Wall Balls (HYROX)`, `Farmers Carry (HYROX)` | Competition context and scoring matter. |
| `Step-Up` / `Step-Ups (låg)` / `Step-Ups (hög)` / `Step-Ups med knädrive` | Similar family, but box height and knee-drive variant affect progression. |
| `Romanian Deadlift` / `Rumänsk marklyft` | Likely duplicate naming, but intentionally share image today. Treat as a merge candidate only after checking references. |

## Follow-Up Checks

- Count references for each duplicate candidate across sessions, templates, favorites, set logs, aliases, progression paths, and generated programs.
- Confirm which row has richer metadata before choosing the canonical ID.
- Add a dry-run migration script that prints planned reference updates before writing.
- After migration, rerun the image sync dry run and exercise resolver tests.
