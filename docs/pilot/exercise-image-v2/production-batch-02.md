# Production Batch 02

Batch 02 continues the v2 rollout with the next ten global public system exercises from the rollout planner, excluding batch 01.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Batch 02 sequence is complete with two approved frames per exercise.
- The first image remains the default hero/thumbnail; the second image shows the complementary start, finish, or reset position.

| Exercise | Production images | Subject | Frames |
| --- | --- | --- | ---: |
| 90-90 Hip Bridge | `/images/posterior-chain/90-90-hip-bridge-1.png`, `/images/posterior-chain/90-90-hip-bridge-2.png` | Woman | 2 |
| Air Squat | `/images/knee-dominance/air-squat-1.png`, `/images/knee-dominance/air-squat-2.png` | Man | 2 |
| Armhävningar / Push-ups | `/images/upper-body/armhavningar-1.png`, `/images/upper-body/armhavningar-2.png` | Woman | 2 |
| Axelpress / Overhead Press | `/images/upper-body/axelpress-1.png`, `/images/upper-body/axelpress-2.png` | Man | 2 |
| Bakåtlunges / Reverse Lunges | `/images/unilateral/bakatlunges-1.png`, `/images/unilateral/bakatlunges-2.png` | Woman | 2 |
| Bent Over Row | `/images/upper-body/bent-over-row-1.png`, `/images/upper-body/bent-over-row-2.png` | Man | 2 |
| Bulgarisk utfallsböj / Bulgarian Split Squat | `/images/unilateral/bulgarisk-utfallsboj-1.png`, `/images/unilateral/bulgarisk-utfallsboj-2.png` | Woman | 2 |
| Curtsy Lunges | `/images/unilateral/curtsy-lunges-1.png`, `/images/unilateral/curtsy-lunges-2.png` | Man | 2 |
| Cyclist Squat | `/images/knee-dominance/cyclist-squat-1.png`, `/images/knee-dominance/cyclist-squat-2.png` | Woman | 2 |
| DB Deadlift / Dumbbell Deadlift | `/images/posterior-chain/db-deadlift-1.png`, `/images/posterior-chain/db-deadlift-2.png` | Man | 2 |

Sequence sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=2 --only='90-90 Hip Bridge,Air Squat,Armhävningar,Axelpress,Bakåtlunges,Bent Over Row,Bulgarisk utfallsböj,Curtsy Lunges,Cyclist Squat,DB Deadlift'
```
