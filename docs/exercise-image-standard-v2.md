# Exercise Image Standard v2

This is the source of truth for Strength Studio exercise pictures from May 2026 onward.

The goal is a mobile-first visual library that feels consistent in dark mode and light mode, supports single-frame and multi-frame instruction, and can later become the source material for short exercise videos.

## Non-negotiables

- No exercise names, titles, app UI, logos, watermarks, counters, or captions inside the image.
- Muscle labels are allowed when useful, but only as small anatomy labels pointing to highlighted muscles.
- The exercise name belongs below the image in the app UI.
- The image must read clearly on a phone at full width.
- The final library should be balanced across subjects: 50 percent women and 50 percent men per reviewed batch.
- Use realistic athletic adults. Avoid celebrity likenesses, brand marks, and extreme physiques.
- Dark cinematic studio/gym backgrounds are preferred because they integrate with both light and dark app themes.

## Visual Style

Use the current best references from the local library:

- `public/images/knee-dominance/split-squat-1.png`
- `public/images/knee-dominance/benpress-1.png`
- `public/images/unilateral/single-under-1.png`

Style targets:

- Realistic athlete, not a pure anatomy mannequin.
- Dark charcoal/blue sports-science studio or gym setting.
- Clean side or three-quarter view that shows the movement.
- Orange/red translucent muscle activation overlay on the active muscle groups.
- Subtle glow around highlighted muscle bellies, not thin nerve-like strands.
- Optional white anatomy labels with thin leader lines.
- Clean equipment geometry with no warped barbells, missing machine rails, or impossible body positions.

## Composition

Default master format:

- Square 1:1 image.
- Minimum 1024 x 1024 px.
- Subject and equipment centered with safe padding.
- Full movement visible unless a close crop is biomechanically clearer.
- No important anatomy, labels, feet, hands, plates, or machine parts near the edge.

Mobile display expectation:

- Image fills the available mobile width.
- UI title, set target, logged sets, and buttons sit below the image.
- Light mode still uses the dark image as a deliberate visual block.
- Dark mode should feel seamless with the image background.

## Frame Count Rules

Use one, two, or three images per exercise. Do not force every exercise into three images.

### One Image

Use for simple static or self-explanatory positions.

Examples:

- Wall Sit
- Plank
- Pallof Press hold
- Leg Press, if only one clear teaching frame is needed

### Two Images

Use for exercises with a clear top and bottom position.

Examples:

- Back Squat: top and bottom
- Bench Press: lockout and chest touch
- Push-Up: top and bottom
- Hip Thrust: bottom and lockout
- Split Squat: top and bottom

### Three Images

Use for technical or dynamic movements where the middle position matters.

Examples:

- Deadlift: setup, knee height, lockout
- Kettlebell Swing: backswing, hip snap, float
- Pull-Up: hang, mid-pull, chin over bar
- Clean/Snatch: setup, pull/catch, finish
- Burpee: floor, stand/jump, reset
- Single Under: takeoff, airborne rope pass, landing

## Filename Convention

Use existing category folders under `public/images/`.

Single frame:

```text
public/images/<category>/<slug>-1.png
```

Multi-frame sequence:

```text
public/images/<category>/<slug>-1.png
public/images/<category>/<slug>-2.png
public/images/<category>/<slug>-3.png
```

Frame order must follow the movement sequence from start to finish. The first frame is also the default thumbnail and hero image.

## Canonical Prompt Template

Use this as the base prompt for generated still images:

```text
Create one premium mobile exercise demonstration image for [EXERCISE_NAME].

Subject: realistic athletic adult [woman/man] performing [EXERCISE_NAME]. Use a clean, coached, biomechanically correct pose: [SCENE_DESCRIPTION].

Frame role: [single hero frame / start frame / bottom frame / middle frame / finish frame]. If this is part of a sequence, keep the same camera angle, lighting, clothing style, subject proportions, and background across all frames.

Highlight these active muscles with a broad translucent orange-red anatomical overlay: [MUSCLE_LIST]. The glow should cover muscle bellies and recruitment zones, not thin nerve lines.

Background and mood: dark charcoal-blue sports-science gym or studio, dramatic side lighting, subtle floor contact shadow, premium fitness app quality, no clutter.

Composition: square 1:1 image, mobile-first, centered subject, full movement and necessary equipment visible, safe padding around hands, feet, equipment, and labels.

Anatomy labels: optional small uppercase Latin anatomy labels with thin leader lines are allowed for the highlighted muscles. Do not include the exercise name, UI text, numbers, captions, logos, watermarks, or brand marks.

Strict constraints: no exercise title, no app interface, no poster frame, no split screen, no duplicate athlete, no extra limbs, no warped equipment, no impossible joint angles, no cropped important anatomy.

Avoid: [EXERCISE_SPECIFIC_AVOID_LIST].
```

## Negative Prompt

Use these constraints when the generation tool supports a separate negative prompt:

```text
exercise name text, title text, captions, numbers, watermark, logo, UI, browser chrome, poster border, white product-background card, duplicate athlete, extra limbs, distorted hands, distorted feet, warped barbell, floating equipment, impossible joint angle, skeleton-only diagram, mannequin-only anatomy, thin glowing nerve lines, cropped feet, cropped hands, unreadable anatomy labels
```

## First Pilot Batch

Generate and review these ten movements before scaling the whole library. This gives us barbell, machine, bodyweight, dynamic, lower-body, upper-body, and core-adjacent examples.

| Exercise | Subject | Frames | Notes |
| --- | --- | ---: | --- |
| Back Squat | Woman | 2 | Top and bottom. Avoid front squat and Smith machine. |
| Deadlift | Man | 3 | Setup, knee height, lockout. Avoid rounded spine and sumo stance. |
| Bench Press | Man | 2 | Lockout and chest touch. Avoid poster/card framing. |
| Split Squat | Woman | 2 | Top and bottom. Existing style is a key reference. |
| Leg Press | Woman | 2 | Bent-knee and press position. Machine must be realistic. |
| Pull-Up | Man | 3 | Hang, mid-pull, chin over bar. Avoid white poster framing. |
| Push-Up | Woman | 2 | Top and bottom. Body straight and hands under shoulders. |
| Hip Thrust | Woman | 2 | Bottom and lockout. Avoid current poster/card look. |
| Single Under | Man | 3 | Takeoff, rope pass, landing. Existing style is a key reference. |
| Kettlebell Swing | Man | 3 | Backswing, hip snap, float. Avoid squatty arm raise. |

The pilot target is not to replace all frames immediately. First generate one hero frame per movement, review the mobile feel, then add the extra top/bottom/middle frames once the style is approved.

## QA Checklist

Before accepting any image:

- No exercise-name text is present.
- Muscle labels, if present, are anatomy-only and readable.
- The exercise form is biomechanically plausible.
- The image looks good at phone width.
- The subject and equipment are not cropped badly.
- Dark mode and light mode both look intentional.
- The subject split remains 50/50 across the reviewed batch.
- The image belongs to the same visual family as the references.
- For multi-frame sequences, the camera angle and subject style match across frames.

## Video Path Later

Do not start with generated video as the primary asset. Use still images first.

When a movement has accepted still frames, those frames can become first/middle/last references for video generation. Short videos should be reserved for high-value movements and reviewed more strictly for form errors, loading cost, and anatomy stability.
