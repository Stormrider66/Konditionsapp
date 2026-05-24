# Production Batch 04

Batch 04 continues the v2 rollout with the next ten not-yet-v2 global public system exercises from the rollout planner after batches 01 through 03.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Batch 04 sequence is complete with two approved frames per exercise.
- The first image remains the default hero/thumbnail; the second image shows the complementary start, finish, or reset position.
- Subject balance is 5 women and 5 men.

| Exercise | Production images | Subject | Frames |
| --- | --- | --- | ---: |
| Front Squat / Frontknäböj | `/images/knee-dominance/front-squat-1.png`, `/images/knee-dominance/front-squat-2.png` | Woman | 2 |
| Goblet Squat | `/images/knee-dominance/goblet-squat-1.png`, `/images/knee-dominance/goblet-squat-2.png` | Man | 2 |
| Handstand Push-Up / Handstående Armhävning | `/images/upper-body/handstand-push-up-1.png`, `/images/upper-body/handstand-push-up-2.png` | Woman | 2 |
| Höftbrygga / Glute Bridge | `/images/posterior-chain/hoftbrygga-1.png`, `/images/posterior-chain/hoftbrygga-2.png` | Man | 2 |
| Inverterad rodd / Inverted Row | `/images/upper-body/inverterad-rodd-1.png`, `/images/upper-body/inverterad-rodd-2.png` | Woman | 2 |
| Kbox Bilateral Squat | `/images/knee-dominance/kbox-bilateral-squat-1.png`, `/images/knee-dominance/kbox-bilateral-squat-2.png` | Man | 2 |
| Kbox Unilateral Squat | `/images/unilateral/kbox-unilateral-squat-1.png`, `/images/unilateral/kbox-unilateral-squat-2.png` | Woman | 2 |
| Kickstand Romanian Deadlift | `/images/posterior-chain/kickstand-romanian-deadlift-1.png`, `/images/posterior-chain/kickstand-romanian-deadlift-2.png` | Man | 2 |
| Landmine Lateral Squat | `/images/unilateral/landmine-lateral-squat-1.png`, `/images/unilateral/landmine-lateral-squat-2.png` | Woman | 2 |
| Landmine Skate Squat | `/images/unilateral/landmine-skate-squat-1.png`, `/images/unilateral/landmine-skate-squat-2.png` | Man | 2 |

Sequence sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=2 --only='Front Squat,Goblet Squat,Handstand Push-Up,Höftbrygga,Inverterad rodd,Kbox Bilateral Squat,Kbox Unilateral Squat,Kickstand Romanian Deadlift,Landmine Lateral Squat,Landmine Skate Squat'
```
