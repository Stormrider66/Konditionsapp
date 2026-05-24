# Production Batch 01

Approved hero images from the v2 pilot were promoted to the shared public image library on 2026-05-24.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for now, so the mobile experience does not mix approved v2 images with older sequence frames.
- Target frame counts still follow `docs/exercise-image-rollout-strategy.md`; additional frames will be generated in later passes.

| Exercise | Production image | Target frames |
| --- | --- | ---: |
| Knäböj / Back Squat | `/images/knee-dominance/knaboj-1.png` | 2 |
| Marklyft / Deadlift | `/images/posterior-chain/marklyft-1.png` | 3 |
| Bänkpress / Bench Press | `/images/upper-body/bankpress-1.png` | 2 |
| Split Squat | `/images/knee-dominance/split-squat-1.png` | 2 |
| Benpress / Leg Press | `/images/knee-dominance/benpress-1.png` | 2 |
| Pull-Up | `/images/upper-body/pull-up-1.png` | 3 |
| Push-Up | `/images/upper-body/push-up-1.png` | 2 |
| Hip Thrust med skivstång / Barbell Hip Thrust | `/images/posterior-chain/hip-thrust-med-skivstang-1.png` | 2 |
| Single Under | `/images/unilateral/single-under-1.png` | 3 |
| Kettlebell Swing | `/images/posterior-chain/kettlebell-swing-1.png` | 3 |

Database sync used:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Knäböj,Marklyft,Bänkpress,Split Squat,Benpress,Pull-Up,Push-Up,Hip Thrust med skivstång,Single Under,Kettlebell Swing'
```
