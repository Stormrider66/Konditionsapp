# Production Batch 04

Batch 04 continues the v2 rollout with the next ten not-yet-v2 global public system exercises from the rollout planner after batches 01 through 03.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for the first pass, so each exercise gets an approved v2 mobile image before the complementary second frame is generated.
- Target frame count for all batch 04 exercises is 2 images.
- Subject balance is 5 women and 5 men.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Front Squat / Frontknäböj | `/images/knee-dominance/front-squat-1.png` | Woman | 2 |
| Goblet Squat | `/images/knee-dominance/goblet-squat-1.png` | Man | 2 |
| Handstand Push-Up / Handstående Armhävning | `/images/upper-body/handstand-push-up-1.png` | Woman | 2 |
| Höftbrygga / Glute Bridge | `/images/posterior-chain/hoftbrygga-1.png` | Man | 2 |
| Inverterad rodd / Inverted Row | `/images/upper-body/inverterad-rodd-1.png` | Woman | 2 |
| Kbox Bilateral Squat | `/images/knee-dominance/kbox-bilateral-squat-1.png` | Man | 2 |
| Kbox Unilateral Squat | `/images/unilateral/kbox-unilateral-squat-1.png` | Woman | 2 |
| Kickstand Romanian Deadlift | `/images/posterior-chain/kickstand-romanian-deadlift-1.png` | Man | 2 |
| Landmine Lateral Squat | `/images/unilateral/landmine-lateral-squat-1.png` | Woman | 2 |
| Landmine Skate Squat | `/images/unilateral/landmine-skate-squat-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Front Squat,Goblet Squat,Handstand Push-Up,Höftbrygga,Inverterad rodd,Kbox Bilateral Squat,Kbox Unilateral Squat,Kickstand Romanian Deadlift,Landmine Lateral Squat,Landmine Skate Squat'
```
