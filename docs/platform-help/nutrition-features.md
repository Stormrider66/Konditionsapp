# Nutrition Features

Meal logging, training-aware daily macro targets, the AI food scanner, adherence stats, and race fueling plans.

## What it is (Athletes)

The nutrition system answers two questions every day: *what should I eat today* (daily targets and timing guidance that adapt to your training) and *what did I actually eat* (meal logging with stats and adherence). On top of that sit the AI food scanner for photo-based logging and race fueling plans for long events.

## Where to find it

- **Log food**: quick action on the Dashboard (photo / voice / text / ingredients / recipe), or just tell the floating AI chat what you ate.
- **Today's targets and guidance**: the nutrition dashboard widget and the nutrition timing card on the Dashboard.
- **Stats and adherence**: the nutrition stats page (reachable from the nutrition dashboard widget; for nutrition-focused accounts it's the main dashboard link).
- **Race fueling**: **Dashboard → Fueling** (the race fueling cards on the dashboard link there).
- **Preferences**: Settings → macro split, and nutrition settings for dietary preferences.

## How it works

### Logging meals

Choose any of these — they all land in the same meal log:

- **Photo (food scanner)**: photograph your plate; the AI identifies items, estimates grams, calories, and macros, and shows a confidence level. If it can't identify the food confidently it asks you exactly one clarifying question. You can edit items before saving.
- **Voice**: describe the meal out loud.
- **Text / ingredients / recipe**: type a description, list ingredients, or scan a recipe.
- **AI chat**: "I had oatmeal with berries for breakfast" — the assistant logs it with estimated macros, and can also update, delete, or list your recent meals.

Meals are categorized (breakfast, lunch, dinner, snacks, pre-workout, post-workout) and dated to your local calendar day.

### The food scanner's "Personalized" memory

If you keep the scanner's memory feature on (default; toggle in dietary preferences), the scanner learns from you. When a first analysis comes back with low confidence (below 0.75), it runs a second pass that includes your last ~60 days of meal history and your past corrections — recurring name fixes, systematic portion-size bias, items you often add or remove. Results improved this way show a **"Personalized"** badge. Every edit you make to a scan result before saving is captured as a correction, so the scanner gets better the more you correct it.

### Daily macro targets (training-aware)

Your daily calorie, protein, carb, and fat targets are computed fresh for each day from your actual training, following a "fuel for the work required" approach:

- **Baseline**: rest-day macros from your body weight, goal (e.g., maintain, lose, gain), macro profile, and activity level. Protein is set per kg of body weight.
- **Lifestyle (NEAT) adjustment**: an active job or lifestyle scales up carbs and fat (protein stays per-kg).
- **Workout adjustment**: each planned/logged workout that day adds energy, mostly as carbohydrate (share depends on the workout), with a small protein bump on training days.
- **Carb periodization**: days are classified by training load, with carb floors per kg for harder days and a carb-load boost before long races.
- **Guardrails**: protein and carbs are capped to safe athlete ranges (you'll see a note when a custom split was adjusted), and a total-calorie sanity cap trims carbs in extreme cases.
- **Hydration**: 28 ml per kg body weight plus 500 ml per hour of training.

Important: these per-day targets are separate from static estimates like BMR from a body-composition scan or a long-term AI nutrition plan. The daily numbers you see on the dashboard, the trend chart, and in adherence stats always come from the training-aware daily calculation — so your target is higher on a double-session day and lower on a rest day. The same target system is used everywhere, so the numbers never disagree between pages.

### Timing guidance

The nutrition timing card and daily guidance tell you *when* to eat around training: a meal 2–3 hours before the session with a carb amount in grams, during-workout fueling for long sessions, and a recovery window (eat within 30–60 minutes after) with carb and protein targets plus fluid recommendations. After your daily check-in you also get a readiness-aware nutrition tip.

### Stats and adherence

The nutrition stats page shows your intake over a selected range: daily totals, averages, workout-day vs. rest-day comparisons, macro split, and **goal adherence** — the percentage of logged days where your calories, protein, carbs, and fat each landed within **±10% of that day's computed target**. Adherence requires a nutrition goal to be set up, and only days with logged meals count.

### Race fueling plans (Fueling page)

For long races, create a fueling plan with your sport, distance, expected duration, target pace/speed/power, race date, and your current gut tolerance (grams of carbs per hour). The plan recommends carbs per hour and total carbs for the race, plus a race-day plan (intake every 20 minutes, gel equivalents, bottle mix). It also tracks **gut training**: linked training workouts where you practice race fueling, your best tolerated carb rate so far, and the next build-up target. Dashboard cards show your active plan and gut-training progress.

## Common questions

**Q: Why did my calorie target change from yesterday?**
A: Targets are recomputed per day from your training. A hard or long session raises carbs (and total calories); a rest day brings them back down to baseline.

**Q: The scanner got my meal wrong — what should I do?**
A: Edit the items (names, grams) before saving. Corrections are remembered and used to personalize future scans, so accuracy improves over time.

**Q: What does the "Personalized" badge mean?**
A: The scanner's first analysis was uncertain, so it re-analyzed your photo using your own meal history and past corrections.

**Q: My adherence looks low even though I eat well.**
A: Adherence counts a day as "on target" only when you're within ±10% of that day's target — and it can only judge days you actually logged. Partial logging (skipping snacks) reads as under-eating.

**Q: Why is my daily target different from the calories in my long-term nutrition plan?**
A: Long-term plans and BMR reports are static estimates for planning. The daily target is the live, training-aware number — that's the one to follow day to day.

**Q: Where do I set allergies and dietary style?**
A: In your nutrition/dietary preferences. They shape food suggestions and guidance (and include the scanner memory toggle).

## Related features

- Daily check-in (readiness-aware nutrition tip)
- Nutrition timing card and morning briefing on the dashboard
- Floating AI chat (log/edit/list meals, fueling advice)
- Body composition (static BMR estimates for long-term planning)
