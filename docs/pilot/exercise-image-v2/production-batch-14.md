# Production Batch 14

Batch 14 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 13.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, personal, or warmup-only exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten technical or dynamic three-frame exercises.
- Subject balance is 5 women and 5 men.
- Existing canonical image paths are preserved for this batch.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Depth Jumps (30cm) / Depth Jumps (30cm) | `/images/knee-dominance/depth-jumps-30cm-1.png` | Man | 3 |
| Depth Jumps (40cm) / Depth Jumps (40cm) | `/images/knee-dominance/depth-jumps-40cm-1.png` | Woman | 3 |
| Depth to Broad Jump / Depth to Broad Jump | `/images/posterior-chain/depth-to-broad-jump-1.png` | Man | 3 |
| Drop Jumps / Drop Jumps | `/images/plyometrics/drop-jumps-1.png` | Woman | 3 |
| Enbenhopp (Bounds) / Enbenhopp (Bounds) | `/images/unilateral/enbenhopp-bounds-1.png` | Man | 3 |
| Handstand Walk / Handstående Gång | `/images/upper-body/handstand-walk-1.png` | Woman | 3 |
| Hang Clean / Hängande Frivändning | `/images/posterior-chain/hang-clean-1.png` | Man | 3 |
| Hang Power Clean / Hängande Power Frivändning | `/images/posterior-chain/hang-power-clean-1.png` | Woman | 3 |
| Hang Power Snatch / Hängande Power Ryck | `/images/posterior-chain/hang-power-snatch-1.png` | Man | 3 |
| Hang Snatch / Hängande Ryck | `/images/posterior-chain/hang-snatch-1.png` | Woman | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='Depth Jumps (30cm),Depth Jumps (40cm),Depth to Broad Jump,Drop Jumps,Enbenhopp (Bounds),Handstand Walk,Hang Clean,Hang Power Clean,Hang Power Snatch,Hang Snatch'
```
