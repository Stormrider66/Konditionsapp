# Production Batch 03

Batch 03 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batches 01 and 02.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Batch 03 sequence is complete with two approved frames per exercise.
- The first image remains the default hero/thumbnail; the second image shows the complementary start, finish, or reset position.
- Subject balance is 5 women and 5 men.

| Exercise | Production images | Subject | Frames |
| --- | --- | --- | ---: |
| DB Push Press / Dumbbell Push Press | `/images/upper-body/db-push-press-1.png`, `/images/upper-body/db-push-press-2.png` | Woman | 2 |
| DB Row / Dumbbell Row | `/images/upper-body/db-row-1.png`, `/images/upper-body/db-row-2.png` | Man | 2 |
| DB Squat / Dumbbell Squat | `/images/knee-dominance/db-squat-1.png`, `/images/knee-dominance/db-squat-2.png` | Woman | 2 |
| DB Strict Press / Dumbbell Strict Press | `/images/upper-body/db-strict-press-1.png`, `/images/upper-body/db-strict-press-2.png` | Man | 2 |
| Devil Press | `/images/upper-body/devil-press-1.png`, `/images/upper-body/devil-press-2.png` | Woman | 2 |
| Enbenig benpress / Single-Leg Press | `/images/unilateral/enbenig-benpress-1.png`, `/images/unilateral/enbenig-benpress-2.png` | Man | 2 |
| Enbenig rumänsk marklyft / Single-Leg Romanian Deadlift | `/images/unilateral/enbenig-rumansk-marklyft-1.png`, `/images/unilateral/enbenig-rumansk-marklyft-2.png` | Woman | 2 |
| Enbenig tåhävning / Single-Leg Calf Raise | `/images/foot-ankle/enbenig-tahavning-1.png`, `/images/foot-ankle/enbenig-tahavning-2.png` | Man | 2 |
| Enbensbrygga / Single-Leg Glute Bridge | `/images/posterior-chain/enbensbrygga-1.png`, `/images/posterior-chain/enbensbrygga-2.png` | Woman | 2 |
| Flywheel Lateral Squat | `/images/unilateral/flywheel-lateral-squat-1.png`, `/images/unilateral/flywheel-lateral-squat-2.png` | Man | 2 |

Sequence sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=2 --only='DB Push Press,DB Row,DB Squat,DB Strict Press,Devil Press,Enbenig benpress,Enbenig rumänsk marklyft,Enbenig tåhävning,Enbensbrygga,Flywheel Lateral Squat'
```
