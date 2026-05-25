# Production Batch 09

Batch 09 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 08, skipping `Dips` because it already has its full target frame count.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten controlled two-frame exercises.
- Subject balance is 5 women and 5 men.
- `Box Dip` and `Good Morning` get explicit canonical mappings for their singular database names.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Bar Dip / Dips | `/images/upper-body/bar-dip-1.png` | Man | 2 |
| Box Dip / Box Dips | `/images/upper-body/box-dip-1.png` | Woman | 2 |
| Box Pistol / Box Pistol | `/images/unilateral/box-pistol-1.png` | Man | 2 |
| Cable Pull-Through / Cable Pull-Through | `/images/posterior-chain/cable-pull-through-1.png` | Woman | 2 |
| Clamshells med band / Clamshells with Band | `/images/posterior-chain/clamshells-med-band-1.png` | Man | 2 |
| DB Box Step-Over / Hantel Box Step-Over | `/images/knee-dominance/db-box-step-over-1.png` | Woman | 2 |
| Face Pulls / Face Pulls | `/images/upper-body/face-pulls-1.png` | Woman | 2 |
| Fire Hydrants / Fire Hydrants | `/images/posterior-chain/fire-hydrants-1.png` | Man | 2 |
| Glute Kickbacks / Sparkbaksparkar | `/images/posterior-chain/glute-kickbacks-1.png` | Woman | 2 |
| Good Morning / Good Mornings | `/images/posterior-chain/good-morning-1.png` | Man | 2 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Bar Dip,Box Dip,Box Pistol,Cable Pull-Through,Clamshells med band,DB Box Step-Over,Face Pulls,Fire Hydrants,Glute Kickbacks,Good Morning'
```
