# Production Batch 07

Batch 07 continues the v2 rollout with the next ten global public system exercises from the rollout planner after batches 01 through 06.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Hero frame only for the first pass, so each exercise gets an approved v2 mobile image before the complementary frames are generated.
- Target frame count follows the rollout planner: seven controlled two-frame exercises and three technical three-frame exercises.
- Subject balance is 5 women and 5 men.
- `Walking Lunge` gets its own canonical `walking-lunge` image path instead of sharing the Swedish `utfallssteg` image path.

| Exercise | Production hero image | Subject | Target frames |
| --- | --- | --- | ---: |
| Sumo Deadlift / Sumo Marklyft | `/images/posterior-chain/sumo-deadlift-1.png` | Woman | 2 |
| Sumo Deadlift High Pull / Sumo Marklyft Högt Drag | `/images/posterior-chain/sumo-deadlift-high-pull-1.png` | Man | 2 |
| Sumo Squats / Sumoknäböj | `/images/knee-dominance/sumo-squats-1.png` | Woman | 2 |
| Tåhävningar (böjda ben) / Calf Raises (Bent Knee) | `/images/foot-ankle/tahavningar-bojda-ben-1.png` | Man | 2 |
| Tåhävningar (raka ben) / Calf Raises (Straight Knee) | `/images/foot-ankle/tahavningar-raka-ben-1.png` | Woman | 2 |
| Utfallssteg / Walking Lunges | `/images/knee-dominance/utfallssteg-1.png` | Man | 2 |
| Walking Lunge / Utfallssteg | `/images/knee-dominance/walking-lunge-1.png` | Woman | 2 |
| American Kettlebell Swing / Amerikansk Kettlebell Swing | `/images/posterior-chain/american-kettlebell-swing-1.png` | Man | 3 |
| Burpee Pull-Up / Burpee Chins | `/images/upper-body/burpee-pull-up-1.png` | Woman | 3 |
| Butterfly Pull-Up / Butterfly Chins | `/images/upper-body/butterfly-pull-up-1.png` | Man | 3 |

Hero-only sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=1 --only='Sumo Deadlift,Sumo Deadlift High Pull,Sumo Squats,Tåhävningar (böjda ben),Tåhävningar (raka ben),Utfallssteg,Walking Lunge,American Kettlebell Swing,Burpee Pull-Up,Butterfly Pull-Up'
```
