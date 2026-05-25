# Production Batch 08

Batch 08 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 07, skipping exercises that already have their full target frame count.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: one controlled two-frame exercise and nine technical three-frame exercises.
- Subject balance is 5 women and 5 men.
- `Rotational Medicine Ball Throw` gets a new canonical core image path because it previously had no image.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Chest-to-Bar Pull-Up / Chest-to-Bar | `/images/upper-body/chest-to-bar-pull-up-1.png` | Woman | 3 |
| Double Under / Double Under | `/images/foot-ankle/double-under-1.png` | Woman | 3 |
| Hoppsquat / Jump Squat | `/images/knee-dominance/hoppsquat-1.png` | Man | 3 |
| Kipping Pull-Up / Kipping Chins | `/images/upper-body/kipping-pull-up-1.png` | Man | 3 |
| Rotational Medicine Ball Throw / Rotationskast med medicinboll | `/images/core/rotational-medicine-ball-throw-1.png` | Woman | 3 |
| Split Jumps / Hoppande utfall | `/images/unilateral/split-jumps-1.png` | Woman | 3 |
| Squat Clean / Squat Frivändning | `/images/knee-dominance/squat-clean-1.png` | Man | 3 |
| Squat Jumps / Squat Jumps | `/images/knee-dominance/squat-jumps-1.png` | Woman | 3 |
| Squat Snatch / Squat Ryck | `/images/knee-dominance/squat-snatch-1.png` | Man | 3 |
| Ankel dorsalflexion (band) / Ankle Dorsiflexion (Band) | `/images/foot-ankle/ankel-dorsalflexion-band-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Chest-to-Bar Pull-Up,Double Under,Hoppsquat,Kipping Pull-Up,Rotational Medicine Ball Throw,Split Jumps,Squat Clean,Squat Jumps,Squat Snatch,Ankel dorsalflexion (band)'
```
