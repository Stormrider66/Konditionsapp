# Production Batch 12

Batch 12 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 11, skipping `Burpee` because it already has its full target frame count.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: three controlled two-frame exercises and seven technical or dynamic three-frame exercises.
- Subject balance is 5 women and 5 men.
- Existing canonical image paths are preserved for this batch.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Superman / Superman | `/images/posterior-chain/superman-1.png` | Woman | 2 |
| Wall Ball / Wall Ball | `/images/knee-dominance/wall-ball-1.png` | Man | 2 |
| Wall Balls (HYROX) / Wall Balls (HYROX) | `/images/posterior-chain/wall-balls-hyrox-1.png` | Woman | 2 |
| Ankelhopp / Ankelhopp | `/images/foot-ankle/ankelhopp-1.png` | Man | 3 |
| Bar Facing Burpee / Bar Facing Burpee | `/images/posterior-chain/bar-facing-burpee-1.png` | Woman | 3 |
| Bensving / Bensving | `/images/upper-body/bensving-1.png` | Man | 3 |
| Box Jump / Lådhopp | `/images/posterior-chain/box-jump-1.png` | Woman | 3 |
| Box Jump Over / Boxhopp Över | `/images/posterior-chain/box-jump-over-1.png` | Man | 3 |
| Bred hopp (max) / Bred hopp (max) | `/images/posterior-chain/bred-hopp-max-1.png` | Woman | 3 |
| Burpee Box Jump Over / Burpee Boxhopp Över | `/images/posterior-chain/burpee-box-jump-over-1.png` | Man | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Superman,Wall Ball,Wall Balls (HYROX),Ankelhopp,Bar Facing Burpee,Bensving,Box Jump,Box Jump Over,Bred hopp (max),Burpee Box Jump Over'
```
