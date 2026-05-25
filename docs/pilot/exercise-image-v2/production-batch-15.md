# Production Batch 15

Batch 15 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 14.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, personal, or warmup-only exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten technical or dynamic three-frame exercises.
- Subject balance is 5 women and 5 men.
- Existing canonical image paths are preserved for this batch.

Frame-count strategy:

- 1 image: simple holds, core stations, carries, mobility, and cyclic machines that read best as one clear hero frame.
- 2 images: controlled strength exercises where start and end positions teach the movement.
- 3 images: dynamic, plyometric, coordination, Olympic-lifting, or high-skill movements that need load, transition, and finish frames.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| High Knees / Höga knän | `/images/foot-ankle/high-knees-1.png` | Man | 3 |
| Hopprep / Hopprep | `/images/foot-ankle/hopprep-1.png` | Woman | 3 |
| Hurdle Hops / Hurdle Hops | `/images/plyometrics/hurdle-hops-1.png` | Man | 3 |
| Jumping Jacks / Hampelmannhopp | `/images/foot-ankle/jumping-jacks-1.png` | Woman | 3 |
| KB Clean / KB Frivändning | `/images/posterior-chain/kb-clean-1.png` | Man | 3 |
| KB Snatch / KB Ryck | `/images/posterior-chain/kb-snatch-1.png` | Woman | 3 |
| KB Thruster / KB Thruster | `/images/posterior-chain/kb-thruster-1.png` | Man | 3 |
| Knees-to-Elbow / Knees-to-Elbow | `/images/core/knees-to-elbow-1.png` | Woman | 3 |
| Lådhopp (18-24") / Lådhopp (18-24") | `/images/knee-dominance/ladhopp-18-24-1.png` | Man | 3 |
| Låga lådhopp / Låga lådhopp | `/images/knee-dominance/laga-ladhopp-1.png` | Woman | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='High Knees,Hopprep,Hurdle Hops,Jumping Jacks,KB Clean,KB Snatch,KB Thruster,Knees-to-Elbow,Lådhopp (18-24"),Låga lådhopp'
```
