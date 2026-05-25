# Production Batch 10

Batch 10 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 09.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten controlled two-frame exercises.
- Subject balance is 5 women and 5 men.
- `Good Mornings` gets a separate canonical image path from `Good Morning` so the plural public record no longer depends on the batch 09 singular asset.
- `Heavy Sled Acceleration` gets a new canonical image path because it previously had no image.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Good Mornings / Good Mornings | `/images/posterior-chain/good-mornings-1.png` | Woman | 2 |
| Hälgång / Heel Walks | `/images/foot-ankle/halgang-1.png` | Man | 2 |
| Heavy Sled Acceleration / Tung släde acceleration | `/images/knee-dominance/heavy-sled-acceleration-1.png` | Woman | 2 |
| Hip hikes / Hip Hikes | `/images/posterior-chain/hip-hikes-1.png` | Man | 2 |
| Höftcirklar / Hip Circles | `/images/core/hoftcirklar-1.png` | Woman | 2 |
| Katt-Ko / Cat-Cow | `/images/core/katt-ko-1.png` | Man | 2 |
| KB Windmill / Kettlebell Windmill | `/images/core/kb-windmill-1.png` | Woman | 2 |
| Latsdrag / Lat Pulldown | `/images/upper-body/latsdrag-1.png` | Man | 2 |
| Marmor-pickups / Marble/Towel Pickups | `/images/foot-ankle/marmor-pickups-1.png` | Woman | 2 |
| Nordic Hamstring / Nordic Hamstring Curl | `/images/posterior-chain/nordic-hamstring-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Good Mornings,Hälgång,Heavy Sled Acceleration,Hip hikes,Höftcirklar,Katt-Ko,KB Windmill,Latsdrag,Marmor-pickups,Nordic Hamstring'
```
