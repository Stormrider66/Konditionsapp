# Production Batch 11

Batch 11 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 10, skipping `Sled Pull` and `Sled Pull (HYROX)` because they already have their full target frame count.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten controlled two-frame exercises.
- Subject balance is 5 women and 5 men.
- `Single-Leg RDL 3-Point Rotation`, `Sled Push March`, and `Slider Hamstring Curl` get new canonical image paths because they previously had no image.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Prone Y-raise / Y-lyft liggande | `/images/upper-body/prone-y-raise-1.png` | Woman | 2 |
| Reverse Hyperextension / Reverse Hyperextension | `/images/posterior-chain/reverse-hyperextension-1.png` | Man | 2 |
| Ring Dip / Ring Dips | `/images/upper-body/ring-dip-1.png` | Woman | 2 |
| Sandbag Over Shoulder / Sandsäck Över Axeln | `/images/core/sandbag-over-shoulder-1.png` | Man | 2 |
| Single-Leg RDL 3-Point Rotation / Draken med 3-punktsrotation | `/images/unilateral/single-leg-rdl-3-point-rotation-1.png` | Woman | 2 |
| Sled Push / Slädtryckning | `/images/core/sled-push-1.png` | Man | 2 |
| Sled Push (HYROX) / Slädtryckning (HYROX) | `/images/posterior-chain/sled-push-hyrox-1.png` | Woman | 2 |
| Sled Push March / Släde push march | `/images/knee-dominance/sled-push-march-1.png` | Man | 2 |
| Slider Hamstring Curl / Hamstring curl med glid | `/images/posterior-chain/slider-hamstring-curl-1.png` | Woman | 2 |
| Strict Ring Dip / Strikt Ring Dips | `/images/upper-body/strict-ring-dip-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Prone Y-raise,Reverse Hyperextension,Ring Dip,Sandbag Over Shoulder,Single-Leg RDL 3-Point Rotation,Sled Push,Sled Push (HYROX),Sled Push March,Slider Hamstring Curl,Strict Ring Dip'
```
