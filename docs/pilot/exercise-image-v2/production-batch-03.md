# Production Batch 03

Batch 03 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batches 01 and 02.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for the first pass, so each exercise gets an approved v2 mobile image before the complementary second frame is generated.
- Target frame count for all batch 03 exercises is 2 images.
- Subject balance is 5 women and 5 men.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| DB Push Press / Dumbbell Push Press | `/images/upper-body/db-push-press-1.png` | Woman | 2 |
| DB Row / Dumbbell Row | `/images/upper-body/db-row-1.png` | Man | 2 |
| DB Squat / Dumbbell Squat | `/images/knee-dominance/db-squat-1.png` | Woman | 2 |
| DB Strict Press / Dumbbell Strict Press | `/images/upper-body/db-strict-press-1.png` | Man | 2 |
| Devil Press | `/images/upper-body/devil-press-1.png` | Woman | 2 |
| Enbenig benpress / Single-Leg Press | `/images/unilateral/enbenig-benpress-1.png` | Man | 2 |
| Enbenig rumänsk marklyft / Single-Leg Romanian Deadlift | `/images/unilateral/enbenig-rumansk-marklyft-1.png` | Woman | 2 |
| Enbenig tåhävning / Single-Leg Calf Raise | `/images/foot-ankle/enbenig-tahavning-1.png` | Man | 2 |
| Enbensbrygga / Single-Leg Glute Bridge | `/images/posterior-chain/enbensbrygga-1.png` | Woman | 2 |
| Flywheel Lateral Squat | `/images/unilateral/flywheel-lateral-squat-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='DB Push Press,DB Row,DB Squat,DB Strict Press,Devil Press,Enbenig benpress,Enbenig rumänsk marklyft,Enbenig tåhävning,Enbensbrygga,Flywheel Lateral Squat'
```
