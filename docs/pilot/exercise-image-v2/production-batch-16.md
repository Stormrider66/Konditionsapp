# Production Batch 16

Batch 16 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 15.

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
| Lateral Bound Continuous / Lateral bound kontinuerlig | `/images/unilateral/lateral-bound-continuous-1.png` | Man | 3 |
| Lateral Bounds / Lateral Bounds | `/images/unilateral/lateral-bounds-1.png` | Woman | 3 |
| Lateral Hops / Lateral Hops | `/images/foot-ankle/lateral-hops-1.png` | Man | 3 |
| Legless Rope Climb / Benlös Repklättring | `/images/posterior-chain/legless-rope-climb-1.png` | Woman | 3 |
| Man Maker / Man Maker | `/images/posterior-chain/man-maker-1.png` | Man | 3 |
| Med Ball Clean / Medicinboll Frivändning | `/images/posterior-chain/med-ball-clean-1.png` | Woman | 3 |
| Medicine Ball Chest Pass / Medicinboll bröstpass | `/images/upper-body/medicine-ball-chest-pass-1.png` | Man | 3 |
| Muscle-Up (Bar) / Muscle-Up (Stång) | `/images/upper-body/muscle-up-bar-1.png` | Woman | 3 |
| Muscle-Up (Ring) / Muscle-Up (Ringar) | `/images/upper-body/muscle-up-ring-1.png` | Man | 3 |
| Pogo Jumps / Pogo Jumps | `/images/foot-ankle/pogo-jumps-1.png` | Woman | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='Lateral Bound Continuous,Lateral Bounds,Lateral Hops,Legless Rope Climb,Man Maker,Med Ball Clean,Medicine Ball Chest Pass,Muscle-Up (Bar),Muscle-Up (Ring),Pogo Jumps'
```
