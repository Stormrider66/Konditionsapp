# Production Batch 05

Batch 05 continues the v2 rollout with the next ten global public system exercises from the rollout planner after batches 01 through 04.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for the first pass, so each exercise gets an approved v2 mobile image before the complementary second frame is generated.
- Target frame count for all batch 05 exercises is 2 images.
- Subject balance is 5 women and 5 men.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Lateral Lunges | `/images/unilateral/lateral-lunges-1.png` | Woman | 2 |
| Lunge / Utfall | `/images/knee-dominance/lunge-1.png` | Man | 2 |
| Overhead Lunge / Overhead Utfall | `/images/knee-dominance/overhead-lunge-1.png` | Woman | 2 |
| Overhead Squat / Overhead Knäböj | `/images/knee-dominance/overhead-squat-1.png` | Man | 2 |
| Pendlay Row / Pendlay Rodd | `/images/upper-body/pendlay-row-1.png` | Woman | 2 |
| Pike Push-Up | `/images/upper-body/pike-push-up-1.png` | Man | 2 |
| Pistol Squat | `/images/knee-dominance/pistol-squat-1.png` | Woman | 2 |
| Pistol Squat Progression | `/images/unilateral/pistol-squat-progression-1.png` | Man | 2 |
| Push Press / Pushpress | `/images/upper-body/push-press-1.png` | Woman | 2 |
| Ring Row / Ring Rodd | `/images/upper-body/ring-row-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Lateral Lunges,Lunge,Overhead Lunge,Overhead Squat,Pendlay Row,Pike Push-Up,Pistol Squat,Pistol Squat Progression,Push Press,Ring Row'
```
