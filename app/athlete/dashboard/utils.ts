
/**
 * Utility to map exercises/workouts to our new anatomical image library.
 * 
 * Strategy:
 * 1. Normalize the input string (workout name or exercise name).
 * 2. Check for keywords matching our file slugs.
 * 3. Return the absolute path to the image in public/images.
 * 4. Fallback to a clear default if no match found.
 */
export function getExerciseImage(name: string | undefined | null): string {
    if (!name) return '/images/posterior-chain/marklyft-1.png'; // Fallback

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Posterior Chain
    if (normalized.includes('deadlift') || normalized.includes('marklyft')) return '/images/posterior-chain/marklyft-1.png';
    if (normalized.includes('clean') && !normalized.includes('jerk')) return '/images/posterior-chain/clean-1.png';
    if (normalized.includes('cleanjerk') || normalized.includes('clean&jerk')) return '/images/posterior-chain/clean-jerk-1.png';
    if (normalized.includes('snatch') && !normalized.includes('dumbbell')) return '/images/posterior-chain/snatch-1.png';
    if (normalized.includes('swing') || normalized.includes('kettlebell')) return '/images/posterior-chain/kettlebell-swing-1.png';
    if (normalized.includes('boxjump')) return '/images/posterior-chain/box-jump-1.png';
    if (normalized.includes('row')) return '/images/posterior-chain/row-calories-1.png';

    // Knee Dominance
    if (normalized.includes('squat') && normalized.includes('loblet')) return '/images/knee-dominance/goblet-squat-1.png';
    if (normalized.includes('wallball')) return '/images/knee-dominance/wall-ball-1.png';
    if (normalized.includes('burpee')) return '/images/knee-dominance/burpee-1.png';
    if (normalized.includes('assault') || normalized.includes('bike')) return '/images/knee-dominance/assault-bike-calories-1.png';
    if (normalized.includes('stepup')) return '/images/knee-dominance/step-up-1.png';

    // Upper Body
    if (normalized.includes('muscleup') && normalized.includes('bar')) return '/images/upper-body/muscle-up-bar-1.png';
    if (normalized.includes('muscleup') && normalized.includes('ring')) return '/images/upper-body/muscle-up-ring-1.png';
    if (normalized.includes('handstand')) return '/images/upper-body/handstand-push-up-1.png';

    // Core
    if (normalized.includes('farmer')) return '/images/core/farmers-carry-1.png';
    if (normalized.includes('lsit')) return '/images/core/l-sit-1.png';
    if (normalized.includes('sled')) return '/images/core/sled-push-1.png';

    // Unilateral
    if (normalized.includes('dumbbell') && normalized.includes('snatch')) return '/images/unilateral/dumbbell-snatch-fem-1.png';

    // Broad Fallbacks based on category keywords
    if (normalized.includes('squat')) return '/images/knee-dominance/goblet-squat-1.png';
    if (normalized.includes('press') || normalized.includes('push')) return '/images/upper-body/handstand-push-up-1.png';
    if (normalized.includes('pull') || normalized.includes('chin')) return '/images/upper-body/muscle-up-bar-1.png';
    if (normalized.includes('run') || normalized.includes('cardio')) return '/images/knee-dominance/assault-bike-calories-1.png';

    return '/images/posterior-chain/marklyft-1.png';
}
