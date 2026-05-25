# Production Batch 13

Batch 13 continues the v2 rollout with the next ten incomplete global public system exercises from the rollout planner after batch 12.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, personal, or warmup-only exercises.
- Hero frame only for this pass, so each exercise gets an approved v2 mobile image before complementary frames are generated.
- Target frame count follows the rollout planner: ten technical or dynamic three-frame exercises.
- Subject balance is 5 women and 5 men.
- `DB Snatch` gets a new canonical image path because the old public record pointed to a legacy gendered filename.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Burpee Broad Jump / Burpee Längdhopp | `/images/posterior-chain/burpee-broad-jump-1.png` | Man | 3 |
| Burpees / Burpees | `/images/knee-dominance/burpee-1.png` | Woman | 3 |
| Butt Kicks / Hälarmar | `/images/foot-ankle/butt-kicks-1.png` | Man | 3 |
| Clean / Frivändning | `/images/posterior-chain/clean-1.png` | Woman | 3 |
| Clean & Jerk / Stöt | `/images/posterior-chain/clean-jerk-1.png` | Man | 3 |
| Cluster / Cluster | `/images/posterior-chain/cluster-1.png` | Woman | 3 |
| Countermovement Jumps / Countermovement Jumps | `/images/knee-dominance/countermovement-jumps-1.png` | Man | 3 |
| DB Clean / Hantel Frivändning | `/images/posterior-chain/db-clean-1.png` | Woman | 3 |
| DB Snatch / Hantel Ryck | `/images/posterior-chain/db-snatch-1.png` | Man | 3 |
| DB Thruster / Hantel Thruster | `/images/posterior-chain/db-thruster-1.png` | Woman | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --main-exercises-only --max-images=1 --only='Burpee Broad Jump,Burpees,Butt Kicks,Clean,Clean & Jerk,Cluster,Countermovement Jumps,DB Clean,DB Snatch,DB Thruster'
```
