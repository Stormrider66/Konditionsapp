# Production Batch 18

Batch 18 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 17. It closes the remaining three-frame hero pass and starts the one-frame exercise section.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, personal, or warmup-only exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: eight technical or dynamic three-frame exercises and two simple one-frame exercises.
- Subject balance is 5 women and 5 men.
- Existing canonical image paths are preserved for this batch.

Frame-count strategy:

- 1 image: simple holds, core stations, carries, mobility, and cyclic machines that read best as one clear hero frame.
- 2 images: controlled strength exercises where start and end positions teach the movement.
- 3 images: dynamic, plyometric, coordination, Olympic-lifting, or high-skill movements that need load, transition, and finish frames.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Split Jerk / Splitstöt | `/images/posterior-chain/split-jerk-1.png` | Man | 3 |
| Thruster / Thruster | `/images/posterior-chain/thruster-1.png` | Woman | 3 |
| Toes-to-Bar / Toes-to-Bar | `/images/core/toes-to-bar-1.png` | Man | 3 |
| Triple Jump / Triple Jump | `/images/unilateral/triple-jump-1.png` | Woman | 3 |
| Triple Under / Triple Under | `/images/foot-ankle/triple-under-1.png` | Man | 3 |
| Tuck Jumps / Tuck Jumps | `/images/knee-dominance/tuck-jumps-1.png` | Woman | 3 |
| Turkish Get-Up / Turkish Get-Up | `/images/posterior-chain/turkish-get-up-1.png` | Man | 3 |
| Wall Walk / Väggklättring | `/images/upper-body/wall-walk-1.png` | Woman | 3 |
| Ab Wheel Rollouts / Ab Wheel Rollouts | `/images/core/ab-wheel-rollouts-1.png` | Man | 1 |
| Ankelrörlighet / Ankelrörlighet | `/images/foot-ankle/ankelrorlighet-1.png` | Woman | 1 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='Split Jerk,Thruster,Toes-to-Bar,Triple Jump,Triple Under,Tuck Jumps,Turkish Get-Up,Wall Walk,Ab Wheel Rollouts,Ankelrörlighet'
```
