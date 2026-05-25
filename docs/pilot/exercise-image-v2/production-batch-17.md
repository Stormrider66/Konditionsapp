# Production Batch 17

Batch 17 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 16.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, personal, or warmup-only exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten technical or dynamic three-frame exercises.
- Subject balance is 5 women and 5 men.
- Existing canonical image paths are preserved where present; two missing hero paths are introduced for this batch.

Frame-count strategy:

- 1 image: simple holds, core stations, carries, mobility, and cyclic machines that read best as one clear hero frame.
- 2 images: controlled strength exercises where start and end positions teach the movement.
- 3 images: dynamic, plyometric, coordination, Olympic-lifting, or high-skill movements that need load, transition, and finish frames.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Power Clean / Power Frivändning | `/images/posterior-chain/power-clean-1.png` | Man | 3 |
| Power Snatch / Power Ryck | `/images/posterior-chain/power-snatch-1.png` | Woman | 3 |
| Push Jerk / Pushstöt | `/images/posterior-chain/push-jerk-1.png` | Man | 3 |
| Repeated Bounds / Repeated Bounds | `/images/unilateral/repeated-bounds-1.png` | Woman | 3 |
| Rope Climb / Repklättring | `/images/posterior-chain/rope-climb-1.png` | Man | 3 |
| Sandbag Clean / Sandsäck Frivändning | `/images/posterior-chain/sandbag-clean-1.png` | Woman | 3 |
| Seated Box Jump / Sittande lådhopp | `/images/knee-dominance/seated-box-jump-1.png` | Man | 3 |
| Skater Jump Stick / Skater jump med stopp | `/images/unilateral/skater-jump-stick-1.png` | Woman | 3 |
| Skipping / Skipping | `/images/foot-ankle/skipping-1.png` | Man | 3 |
| Snatch / Ryck | `/images/posterior-chain/snatch-1.png` | Woman | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='Power Clean,Power Snatch,Push Jerk,Repeated Bounds,Rope Climb,Sandbag Clean,Seated Box Jump,Skater Jump Stick,Skipping,Snatch'
```
