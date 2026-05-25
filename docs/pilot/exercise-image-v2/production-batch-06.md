# Production Batch 06

Batch 06 continues the v2 rollout with the next global public system exercises that still need refreshed sequence images after batches 01 through 05.

Batch 06 sequence is complete with two approved frames per exercise. The first image remains the default hero/thumbnail; the second image shows the complementary start, finish, or reset position.

Scope:

- Global public system exercises only.
- No coach-created, business-specific, or personal exercises.
- Two-frame sequences are complete for all batch 06 exercises.
- Target frame count for all batch 06 exercises is 2 images.
- Subject balance is 5 women and 5 men across the ten exercise records.
- This batch has two intentional shared-image pairs: `Romanian Deadlift` / `Rumänsk marklyft`, and `Step-Up` / `Step-Ups (låg)`.

| Exercise | Frame 1 hero/thumbnail | Frame 2 sequence image | Subject | Frames |
| --- | --- | --- | --- | ---: |
| Romanian Deadlift / Rumänsk marklyft | `/images/posterior-chain/romanian-deadlift-1.png` | `/images/posterior-chain/romanian-deadlift-2.png` | Woman | 2 |
| Rowing (HYROX) / Rodd (HYROX) | `/images/upper-body/rowing-hyrox-1.png` | `/images/upper-body/rowing-hyrox-2.png` | Man | 2 |
| Rumänsk marklyft / Romanian Deadlift (RDL) | `/images/posterior-chain/romanian-deadlift-1.png` | `/images/posterior-chain/romanian-deadlift-2.png` | Woman | 2 |
| Sandbag Lunges (HYROX) / Sandsäck Utfall (HYROX) | `/images/knee-dominance/sandbag-lunges-hyrox-1.png` | `/images/knee-dominance/sandbag-lunges-hyrox-2.png` | Man | 2 |
| Skater Squats | `/images/unilateral/skater-squats-1.png` | `/images/unilateral/skater-squats-2.png` | Woman | 2 |
| Step-Up | `/images/knee-dominance/step-up-1.png` | `/images/knee-dominance/step-up-2.png` | Man | 2 |
| Step-Ups (hög) / Step-Ups (High Box) | `/images/unilateral/step-ups-hog-1.png` | `/images/unilateral/step-ups-hog-2.png` | Woman | 2 |
| Step-Ups (låg) / Step-Ups (Low Box) | `/images/knee-dominance/step-up-1.png` | `/images/knee-dominance/step-up-2.png` | Man | 2 |
| Step-Ups med knädrive / Step-Ups with Knee Drive | `/images/unilateral/step-ups-med-knadrive-1.png` | `/images/unilateral/step-ups-med-knadrive-2.png` | Woman | 2 |
| Strict Handstand Push-Up / Strikt Handstående Armhävning | `/images/upper-body/strict-handstand-push-up-1.png` | `/images/upper-body/strict-handstand-push-up-2.png` | Man | 2 |

Sequence sync command:

```bash
set -a; source .env.local; set +a
npx tsx --tsconfig tsconfig.scripts.json scripts/sync-exercise-images.ts --max-images=2 --only='Romanian Deadlift,Rowing (HYROX),Rumänsk marklyft,Sandbag Lunges (HYROX),Skater Squats,Step-Up,Step-Ups (hög),Step-Ups (låg),Step-Ups med knädrive,Strict Handstand Push-Up'
```
