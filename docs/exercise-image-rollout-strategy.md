# Exercise Image Rollout Strategy

This strategy turns the approved v2 visual style into a repeatable production workflow for the shared Strength Studio library.

## Scope

Regenerate images only for shared platform exercises:

- `coachId = null`
- `businessId = null`
- `isPublic = true`
- `biomechanicalPillar != null`
- exclude `category = WARMUP` for the first production pass

This keeps the work focused on exercises available to all users and avoids coach-created or personal movements. Warmups and unclassified legacy rows can be handled later after the main library is consistent.

Current live-library read on 2026-05-24:

- `284` global public exercises
- `243` classified global public exercises
- `239` classified global public non-warmup exercises for the first production pass
- `124` coach-created/custom exercises, intentionally excluded

## Frame Count Rules

Use the smallest number of images that teaches the movement well.

### 1 Image

Use for static positions, holds, machine/cardio stations, simple mobility, carries, or exercises where one hero frame is clearer than a sequence.

Examples: plank, wall sit, hollow hold, Pallof press, suitcase carry, SkiErg, rower, bike, calf raise hold, mobility drills.

### 2 Images

Use for controlled strength movements with a clear start and end position.

Examples: squat, bench press, push-up, hip thrust, RDL, row, lunge, step-up, leg press, strict press, lat pulldown.

### 3 Images

Use for dynamic, technical, cyclic, or coordination-heavy movements where a middle frame matters.

Examples: deadlift, pull-up, clean, snatch, jerk, kettlebell swing, burpee, rope climb, muscle-up, wall walk, jump rope, box jump, broad jump, bounds.

## Rollout Order

1. **Foundation batch**: main lifts and heavily reused movements. Start with 10 at a time, keep 5 women and 5 men per batch.
2. **Strength library pass**: all remaining classified non-warmup exercises, grouped by movement family so visual consistency is easy to review.
3. **Technical/dynamic pass**: Olympic lifts, gymnastics, plyometrics, HYROX stations, and kettlebell movements. These need stricter form review.
4. **Warmup and legacy cleanup**: unclassified rows, warmups, duplicates, and any old AI images stored only as remote URLs.
5. **Personal/custom later**: coach-created exercises only after the shared library is stable.

## Implementation

The current schema already supports multiple images through `Exercise.imageUrls`, and the app carousel already displays 1, 2, or 3 images. No schema change is needed.

For each accepted batch:

1. Generate images using `docs/exercise-image-standard-v2.md`.
2. Review at phone width before replacing production assets.
3. Save accepted files under `public/images/<category>/<slug>-1.png`, `-2.png`, and `-3.png`.
4. Run the image sync script so only public system exercises receive the new `imageUrls`.
5. Keep rejected or experimental images in `docs/pilot/...`, not production folders.

## Batch Planning

Use `scripts/plan-exercise-image-rollout.ts` to produce a public-library-only batch plan. It reads from the database and excludes personal/coach-created exercises by default.

Example:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/plan-exercise-image-rollout.ts --limit=20
```

The output includes the recommended frame count, subject balance, current image count, and the reason each movement is categorized as 1, 2, or 3 images.
