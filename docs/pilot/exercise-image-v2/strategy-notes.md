# Exercise Image v2 Strategy Notes

These notes keep the image rollout consistent across later batches and prompt files.

## Scope

- Prioritize global public system exercises first: `coachId=null`, `businessId=null`, and `isPublic=true`.
- Do not generate images for coach-created, business-specific, or personal exercises as part of the main rollout unless they are deliberately promoted into the shared exercise library.
- Personal exercises may remain without an image when the movement is unclear. A blank image is better than a confident but misleading demonstration.

## Ambiguous Movements

- If a movement name is uncertain, skip it until the movement can be confirmed.
- Do not invent equipment, ranges of motion, or exercise variants just to fill a missing image.
- Prompt and review notes should call out uncertainty directly so the exercise can be handled later with coach/user clarification.

## Known Clarifications

- `90-90 Hip Bridge`: treat as a hip lift/bridge with the athlete lying on the floor, feet elevated on a bench, and both hips and knees held near 90 degrees. Show a clean glute bridge action, not a generic floor hip bridge or barbell hip thrust.

## Visual Standard

- Mobile-first square hero images remain the default.
- No exercise name, title, UI label, watermark, logo, numbers, or app chrome inside the image.
- Anatomy labels are optional only when they are small, accurate, and do not compete with the movement.
- Keep images suitable for both dark and white mode by using the approved dark studio background with clean subject separation.
- Maintain the overall 50/50 woman/man subject balance across production batches.

## Frame Count Strategy

- Use 1 image for simple, unmistakable movements where one hero frame teaches the exercise.
- Use 2 images when start and finish positions materially improve understanding.
- Use 3 images only for complex, dynamic, or phased movements where setup, transition, and finish are all useful.
