/**
 * Recipe library for the Performance Meal Guide.
 *
 * Each meal "kind" (breakfast / main / pre-fuel / recovery / snack) has a pool
 * of recipes so the athlete sees variation instead of the same suggestion every
 * day. `pickRecipe` rotates through a pool by a numeric variant (derived from
 * the day + meal slot upstream, or randomised for "surprise me"), so the choice
 * is deterministic for a given day yet differs across days and meals.
 *
 * Gram amounts are scaled to the slot's macro target; they are practical
 * suggestions — the macro target shown alongside is the source of truth.
 */
import type { PlannedMealRecipe } from './types'

export type PlanLocale = 'en' | 'sv'

export interface RecipeContext {
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  locale: PlanLocale
  source: 'TEMPLATE' | 'AI'
  preference?: string | null
  /** Pre-workout / game-fuel slot: favour easy-to-digest, low-fat/-fibre foods. */
  isPre?: boolean
}

export type RecipeBuilder = (ctx: RecipeContext) => PlannedMealRecipe

function amt(value: number, unit = 'g'): string {
  return `${Math.max(1, Math.round(value))} ${unit}`
}

function make(
  ctx: RecipeContext,
  fields: Omit<PlannedMealRecipe, 'servings' | 'source' | 'prompt'> & { servings?: number }
): PlannedMealRecipe {
  return {
    servings: fields.servings ?? 1,
    ...fields,
    source: ctx.source,
    prompt: ctx.preference ?? undefined,
  }
}

const svOf = (ctx: RecipeContext) => ctx.locale === 'sv'

// ---------------------------------------------------------------------------
// Breakfast
// ---------------------------------------------------------------------------
export const BREAKFAST_RECIPES: RecipeBuilder[] = [
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Kvargbowl med havre, banan och bär' : 'Quark bowl with oats, banana, and berries',
      summary: sv ? 'Kall, snabb frukost med jämnt protein och kontrollerade kolhydrater.' : 'Cold, fast breakfast with even protein and controlled carbohydrates.',
      prepMinutes: 7,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'kvarg eller grekisk yoghurt' : 'quark or Greek yoghurt', amount: amt(ctx.macros.proteinG * 7) },
        { name: sv ? 'havregryn' : 'oats', amount: amt(ctx.macros.carbsG * 0.7) },
        { name: 'banan', amount: sv ? '1 st' : '1' },
        { name: sv ? 'blåbär eller hallon' : 'blueberries or raspberries', amount: '100 g' },
        { name: sv ? 'honung eller sylt' : 'honey or jam', amount: ctx.isPre ? '15 g' : '10 g' },
      ],
      steps: sv
        ? ['Lägg kvarg i en skål.', 'Toppa med havregryn, banan och bär.', 'Justera med honung eller sylt om passet ligger nära.']
        : ['Add quark to a bowl.', 'Top with oats, banana, and berries.', 'Adjust with honey or jam if a session is close.'],
      tips: [sv ? 'Förbered kvällen före om morgonen är tight.' : 'Prepare the night before if the morning is tight.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Äggröra med fullkornsbröd och frukt' : 'Scrambled eggs with wholegrain bread and fruit',
      summary: sv ? 'Varm frukost med komplett protein och långsamma kolhydrater.' : 'Warm breakfast with complete protein and slow carbohydrates.',
      prepMinutes: 5,
      cookMinutes: 8,
      ingredients: [
        { name: sv ? 'ägg' : 'eggs', amount: sv ? `${Math.max(2, Math.round(ctx.macros.proteinG / 7))} st` : `${Math.max(2, Math.round(ctx.macros.proteinG / 7))}` },
        { name: sv ? 'fullkornsbröd' : 'wholegrain bread', amount: sv ? `${Math.max(1, Math.round(ctx.macros.carbsG / 18))} skivor` : `${Math.max(1, Math.round(ctx.macros.carbsG / 18))} slices` },
        { name: sv ? 'frukt' : 'fruit', amount: sv ? '1 st' : '1 piece' },
        { name: sv ? 'smör eller olja' : 'butter or oil', amount: amt(ctx.macros.fatG * 0.4) },
      ],
      steps: sv
        ? ['Vispa äggen lätt och stek på medelvärme.', 'Rosta brödet.', 'Servera med frukt vid sidan.']
        : ['Whisk the eggs and scramble over medium heat.', 'Toast the bread.', 'Serve with fruit on the side.'],
      tips: [sv ? 'Salta sparsamt och tillsätt grönsaker om du vill.' : 'Salt lightly and add vegetables if you like.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Proteinpannkakor med bär' : 'Protein pancakes with berries',
      summary: sv ? 'Lite festligare frukost med högt protein och bär.' : 'A more indulgent high-protein breakfast with berries.',
      prepMinutes: 6,
      cookMinutes: 8,
      ingredients: [
        { name: sv ? 'havregryn' : 'oats', amount: amt(ctx.macros.carbsG * 0.6) },
        { name: 'ägg', amount: sv ? '2 st' : '2' },
        { name: sv ? 'kvarg eller proteinpulver' : 'quark or protein powder', amount: amt(ctx.macros.proteinG * 4) },
        { name: sv ? 'bär' : 'berries', amount: '100 g' },
      ],
      steps: sv
        ? ['Mixa havregryn, ägg och kvarg till en smet.', 'Stek små pannkakor i lite olja.', 'Toppa med bär.']
        : ['Blend oats, eggs, and quark into a batter.', 'Cook small pancakes in a little oil.', 'Top with berries.'],
      tips: [sv ? 'Späd med lite mjölk om smeten blir tjock.' : 'Thin with a little milk if the batter is thick.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Overnight oats med yoghurt och äpple' : 'Overnight oats with yoghurt and apple',
      summary: sv ? 'Förberedd kvällen innan – perfekt en stressig morgon.' : 'Prepped the night before — perfect for a busy morning.',
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'havregryn' : 'oats', amount: amt(ctx.macros.carbsG * 0.8) },
        { name: sv ? 'grekisk yoghurt' : 'Greek yoghurt', amount: amt(ctx.macros.proteinG * 6) },
        { name: sv ? 'mjölk' : 'milk', amount: '100 ml' },
        { name: sv ? 'äpple' : 'apple', amount: sv ? '1 st' : '1' },
        { name: sv ? 'kanel' : 'cinnamon', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Blanda havregryn, yoghurt och mjölk i en burk.', 'Ställ i kylen över natten.', 'Toppa med rivet äpple och kanel på morgonen.']
        : ['Mix oats, yoghurt, and milk in a jar.', 'Refrigerate overnight.', 'Top with grated apple and cinnamon in the morning.'],
      tips: [sv ? 'Gör flera burkar för veckan.' : 'Make several jars for the week.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Smoothie bowl med banan, bär och granola' : 'Smoothie bowl with banana, berries, and granola',
      summary: sv ? 'Sval, lättäten frukost när aptiten är trög.' : 'Cool, easy-to-eat breakfast when appetite is low.',
      prepMinutes: 6,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'fryst banan och bär' : 'frozen banana and berries', amount: '150 g' },
        { name: sv ? 'kvarg eller proteinpulver' : 'quark or protein powder', amount: amt(ctx.macros.proteinG * 5) },
        { name: sv ? 'granola' : 'granola', amount: amt(ctx.macros.carbsG * 0.4) },
        { name: sv ? 'mjölk eller växtdryck' : 'milk or plant drink', amount: '100 ml' },
      ],
      steps: sv
        ? ['Mixa frukt, kvarg och mjölk till en tjock smoothie.', 'Häll i en skål.', 'Toppa med granola.']
        : ['Blend fruit, quark, and milk into a thick smoothie.', 'Pour into a bowl.', 'Top with granola.'],
      tips: [sv ? 'Håll den tjock så granolan stannar på toppen.' : 'Keep it thick so the granola stays on top.'],
    })
  },
]

// ---------------------------------------------------------------------------
// Main meals (lunch / dinner). Index 0 = chicken (lunch default & chicken
// preference), index 1 = salmon (dinner default).
// ---------------------------------------------------------------------------
export const MAIN_RECIPES: RecipeBuilder[] = [
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Kyckling, ris och grönsaker' : 'Chicken, rice, and vegetables',
      summary: sv ? 'En rak prestationsmåltid som är enkel att skala efter makromålet.' : 'A direct performance meal that is easy to scale to the macro target.',
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: sv ? 'kycklingfilé' : 'chicken breast', amount: amt(ctx.macros.proteinG * 5) },
        { name: sv ? 'kokt ris' : 'cooked rice', amount: amt(ctx.macros.carbsG * 3) },
        { name: sv ? 'grönsaker' : 'vegetables', amount: '150 g' },
        { name: sv ? 'olivolja' : 'olive oil', amount: amt(ctx.macros.fatG * 1.2) },
        { name: sv ? 'salt, peppar och citron' : 'salt, pepper, and lemon', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka eller värm riset.', 'Stek kycklingen i lite olja tills den är genomstekt.', 'Lägg upp ris, kyckling och grönsaker.', 'Smaka av med salt, peppar och citron.']
        : ['Cook or heat the rice.', 'Pan-fry the chicken until cooked through.', 'Plate rice, chicken, and vegetables.', 'Season with salt, pepper, and lemon.'],
      tips: [ctx.isPre ? (sv ? 'Håll kryddningen mild nära match/pass.' : 'Keep spicing mild close to game/practice.') : (sv ? 'Laga två portioner och spara en.' : 'Cook two portions and save one.')],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Lax, potatis och yoghurtsås' : 'Salmon, potatoes, and yoghurt sauce',
      summary: sv ? 'Näringstät huvudmåltid med bra fett och lugna kolhydrater.' : 'Nutrient-dense main meal with quality fats and steady carbohydrates.',
      prepMinutes: 10,
      cookMinutes: 25,
      ingredients: [
        { name: sv ? 'laxfilé' : 'salmon fillet', amount: amt(ctx.macros.proteinG * 5) },
        { name: sv ? 'potatis' : 'potatoes', amount: amt(ctx.macros.carbsG * 4) },
        { name: sv ? 'grekisk yoghurt' : 'Greek yoghurt', amount: '100 g' },
        { name: sv ? 'grönsaker' : 'vegetables', amount: '150 g' },
        { name: sv ? 'citron, dill, salt' : 'lemon, dill, salt', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka potatisen mjuk.', 'Tillaga laxen i panna eller ugn.', 'Rör ihop yoghurt med citron, dill och salt.', 'Servera med grönsaker.']
        : ['Boil the potatoes until tender.', 'Cook the salmon in a pan or oven.', 'Mix yoghurt with lemon, dill, and salt.', 'Serve with vegetables.'],
      tips: [sv ? 'Bra val när målet är återhämtning utan snabba kolhydrater.' : 'Good when the goal is recovery without fast carbs.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Magert nötkött, pasta och tomatsås' : 'Lean beef, pasta, and tomato sauce',
      summary: sv ? 'Mättande huvudmål med pasta och magert nötkött.' : 'Filling main meal with pasta and lean beef.',
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: sv ? 'magert nötfärs' : 'lean ground beef', amount: amt(ctx.macros.proteinG * 4.5) },
        { name: sv ? 'kokt pasta' : 'cooked pasta', amount: amt(ctx.macros.carbsG * 3) },
        { name: sv ? 'krossade tomater' : 'crushed tomatoes', amount: '150 g' },
        { name: sv ? 'olivolja' : 'olive oil', amount: amt(ctx.macros.fatG) },
        { name: sv ? 'lök, vitlök, salt, peppar' : 'onion, garlic, salt, pepper', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka pastan.', 'Bryn färsen med lök och vitlök.', 'Rör i krossade tomater och låt sjuda.', 'Blanda med pastan och smaka av.']
        : ['Cook the pasta.', 'Brown the beef with onion and garlic.', 'Stir in crushed tomatoes and simmer.', 'Mix with the pasta and season.'],
      tips: [sv ? 'Laga dubbel sats och spara en portion.' : 'Cook a double batch and save a portion.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Kalkonfärs med quinoa och grönsaker' : 'Turkey mince with quinoa and vegetables',
      summary: sv ? 'Magert protein och fullkorn med mycket grönt.' : 'Lean protein and whole grains with plenty of vegetables.',
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: sv ? 'kalkonfärs' : 'turkey mince', amount: amt(ctx.macros.proteinG * 4.5) },
        { name: sv ? 'kokt quinoa' : 'cooked quinoa', amount: amt(ctx.macros.carbsG * 3) },
        { name: sv ? 'blandade grönsaker' : 'mixed vegetables', amount: '200 g' },
        { name: sv ? 'olivolja' : 'olive oil', amount: amt(ctx.macros.fatG) },
        { name: sv ? 'vitlök, salt, paprikapulver' : 'garlic, salt, paprika', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka quinoan.', 'Stek kalkonfärsen med kryddor.', 'Woka grönsakerna hastigt.', 'Blanda ihop allt.']
        : ['Cook the quinoa.', 'Cook the turkey mince with spices.', 'Quickly stir-fry the vegetables.', 'Combine everything.'],
      tips: [sv ? 'Pressa över citron för fräschör.' : 'Squeeze over lemon for freshness.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Torsk med potatis och ärtor' : 'Cod with potatoes and peas',
      summary: sv ? 'Lätt, mager fiskmåltid med klassiska tillbehör.' : 'Light, lean fish meal with classic sides.',
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: sv ? 'torskfilé' : 'cod fillet', amount: amt(ctx.macros.proteinG * 5.5) },
        { name: sv ? 'potatis' : 'potatoes', amount: amt(ctx.macros.carbsG * 4) },
        { name: sv ? 'gröna ärtor' : 'green peas', amount: '100 g' },
        { name: sv ? 'smör eller olja' : 'butter or oil', amount: amt(ctx.macros.fatG * 0.8) },
        { name: sv ? 'citron, salt, dill' : 'lemon, salt, dill', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka potatisen.', 'Stek eller ugnsbaka torsken.', 'Värm ärtorna.', 'Servera med citron och dill.']
        : ['Boil the potatoes.', 'Pan-fry or bake the cod.', 'Warm the peas.', 'Serve with lemon and dill.'],
      tips: [sv ? 'Torsk blir torr om den överkokas – ta den tidigt.' : 'Cod dries out if overcooked — pull it early.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Tofu-wok med ris och grönsaker' : 'Tofu stir-fry with rice and vegetables',
      summary: sv ? 'Vegetariskt alternativ med växtprotein och mycket grönt.' : 'Vegetarian option with plant protein and plenty of vegetables.',
      prepMinutes: 10,
      cookMinutes: 15,
      ingredients: [
        { name: 'tofu', amount: amt(ctx.macros.proteinG * 8) },
        { name: sv ? 'kokt ris' : 'cooked rice', amount: amt(ctx.macros.carbsG * 3) },
        { name: sv ? 'wokgrönsaker' : 'stir-fry vegetables', amount: '200 g' },
        { name: sv ? 'sojasås och olja' : 'soy sauce and oil', amount: amt(ctx.macros.fatG) },
        { name: sv ? 'vitlök och ingefära' : 'garlic and ginger', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Pressa tofun torr och tärna den.', 'Stek tofun gyllene i olja.', 'Woka grönsakerna med vitlök och ingefära.', 'Blanda med ris och sojasås.']
        : ['Press the tofu dry and dice it.', 'Fry the tofu golden in oil.', 'Stir-fry the vegetables with garlic and ginger.', 'Combine with rice and soy sauce.'],
      tips: [sv ? 'Använd fast tofu så den håller ihop.' : 'Use firm tofu so it holds together.'],
    })
  },
]

// ---------------------------------------------------------------------------
// Pre-workout / game-fuel snacks (easy carbs, low fat/fibre)
// ---------------------------------------------------------------------------
export const PRE_RECIPES: RecipeBuilder[] = [
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Toast med banan, honung och sportdryck' : 'Toast with banana, honey, and sports drink',
      summary: sv ? 'Lättsmält energi inför träning eller match.' : 'Easy-digesting fuel before practice or game.',
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'ljust bröd' : 'white bread', amount: sv ? '2 skivor' : '2 slices' },
        { name: 'banan', amount: sv ? '1 st' : '1' },
        { name: sv ? 'honung eller sylt' : 'honey or jam', amount: amt(ctx.macros.carbsG * 0.35) },
        { name: 'sportdryck', amount: '300 ml' },
      ],
      steps: sv
        ? ['Rosta brödet lätt om du vill.', 'Lägg på banan och honung.', 'Drick sportdrycken före uppvärmning.']
        : ['Lightly toast the bread if you like.', 'Add banana and honey.', 'Drink the sports drink before warm-up.'],
      tips: [sv ? 'Undvik extra fett så magen känns lätt.' : 'Avoid extra fat so the stomach stays light.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Riskakor med sylt och sportdryck' : 'Rice cakes with jam and sports drink',
      summary: sv ? 'Mycket lättsmält när det är nära start.' : 'Very easy to digest close to start time.',
      prepMinutes: 3,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'riskakor' : 'rice cakes', amount: sv ? '3-4 st' : '3-4' },
        { name: sv ? 'sylt eller honung' : 'jam or honey', amount: amt(ctx.macros.carbsG * 0.4) },
        { name: sv ? 'utspädd sportdryck' : 'diluted sports drink', amount: '300 ml' },
      ],
      steps: sv
        ? ['Bre sylt på riskakorna.', 'Ät 60-90 minuter före start.', 'Drick sportdrycken vid sidan.']
        : ['Spread jam on the rice cakes.', 'Eat 60-90 minutes before start.', 'Sip the sports drink alongside.'],
      tips: [sv ? 'Bra när magen är känslig före match.' : 'Good when the stomach is sensitive before a game.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Havregröt med honung och banan' : 'Oatmeal with honey and banana',
      summary: sv ? 'Varm, snäll energi 1,5-2 timmar före pass.' : 'Warm, gentle energy 1.5-2 hours before a session.',
      prepMinutes: 3,
      cookMinutes: 5,
      ingredients: [
        { name: sv ? 'havregryn' : 'oats', amount: amt(ctx.macros.carbsG * 0.7) },
        { name: sv ? 'vatten eller mjölk' : 'water or milk', amount: '250 ml' },
        { name: 'banan', amount: sv ? '1 st' : '1' },
        { name: sv ? 'honung' : 'honey', amount: '15 g' },
      ],
      steps: sv
        ? ['Koka gröten på vatten eller mjölk.', 'Skiva bananen över.', 'Ringla över honung.']
        : ['Cook the oatmeal with water or milk.', 'Slice the banana on top.', 'Drizzle with honey.'],
      tips: [sv ? 'Håll den lite lösare så den är lätt att äta.' : 'Keep it slightly loose so it is easy to eat.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Bagel med sylt och juice' : 'Bagel with jam and juice',
      summary: sv ? 'Kompakt kolhydratladdning före längre pass.' : 'Compact carbohydrate top-up before a longer session.',
      prepMinutes: 3,
      cookMinutes: 0,
      ingredients: [
        { name: 'bagel', amount: sv ? '1 st' : '1' },
        { name: sv ? 'sylt eller honung' : 'jam or honey', amount: amt(ctx.macros.carbsG * 0.3) },
        { name: 'juice', amount: '200 ml' },
      ],
      steps: sv
        ? ['Dela och rosta bageln lätt.', 'Bre på sylt.', 'Drick juicen vid sidan.']
        : ['Halve and lightly toast the bagel.', 'Spread with jam.', 'Drink the juice alongside.'],
      tips: [sv ? 'Välj ljus bagel för snabbare kolhydrater.' : 'Choose a light bagel for faster carbohydrates.'],
    })
  },
]

// ---------------------------------------------------------------------------
// Post-workout / recovery snacks (protein + carbs)
// ---------------------------------------------------------------------------
export const POST_RECIPES: RecipeBuilder[] = [
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Återhämtningsshake med yoghurt, flingor och frukt' : 'Recovery shake with yoghurt, cereal, and fruit',
      summary: sv ? 'Snabbt protein och kolhydrater när aptiten är låg.' : 'Fast protein and carbohydrates when appetite is low.',
      prepMinutes: 6,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'drickyoghurt eller yoghurt' : 'drink yoghurt or yoghurt', amount: '300 g' },
        { name: sv ? 'vassleprotein' : 'whey protein', amount: amt(ctx.macros.proteinG * 0.45) },
        { name: sv ? 'flingor eller granola' : 'cereal or granola', amount: amt(ctx.macros.carbsG * 0.65) },
        { name: sv ? 'frukt' : 'fruit', amount: sv ? '1 st' : '1 piece' },
      ],
      steps: sv
        ? ['Mixa yoghurt och protein eller rör i en shaker.', 'Toppa med flingor och frukt.', 'Ät inom 30-60 minuter efter passet.']
        : ['Blend yoghurt and protein or shake together.', 'Top with cereal and fruit.', 'Eat within 30-60 minutes after the session.'],
      tips: [sv ? 'Ha ingredienserna redo vid sen match.' : 'Keep ingredients ready for a late game.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Chokladmjölk, kvarg och banan' : 'Chocolate milk, quark, and banana',
      summary: sv ? 'Klassisk, enkel återhämtning med bra protein-kolhydratförhållande.' : 'Classic, simple recovery with a good protein-to-carb ratio.',
      prepMinutes: 3,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'chokladmjölk' : 'chocolate milk', amount: '300 ml' },
        { name: 'kvarg', amount: amt(ctx.macros.proteinG * 5) },
        { name: 'banan', amount: sv ? '1 st' : '1' },
      ],
      steps: sv
        ? ['Drick chokladmjölken.', 'Ät kvarg med skivad banan.', 'Ta det inom en timme efter passet.']
        : ['Drink the chocolate milk.', 'Eat quark with sliced banana.', 'Have it within an hour of the session.'],
      tips: [sv ? 'Lätt att ta med i träningsväskan.' : 'Easy to bring in the gym bag.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Smörgås med kalkon och ett glas mjölk' : 'Turkey sandwich with a glass of milk',
      summary: sv ? 'Fast återhämtning när du vill tugga något riktigt.' : 'Solid recovery when you want something to chew.',
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'fullkornsbröd' : 'wholegrain bread', amount: sv ? '2 skivor' : '2 slices' },
        { name: sv ? 'kalkonpålägg' : 'turkey slices', amount: amt(ctx.macros.proteinG * 3) },
        { name: sv ? 'mjölk' : 'milk', amount: '250 ml' },
        { name: sv ? 'grönsaker' : 'vegetables', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Bygg smörgåsen med kalkon och grönsaker.', 'Drick mjölken vid sidan.']
        : ['Build the sandwich with turkey and vegetables.', 'Drink the milk alongside.'],
      tips: [sv ? 'Byt kalkon mot ägg eller skinka om du vill.' : 'Swap turkey for egg or ham if you like.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Yoghurt med granola, frukt och vassle' : 'Yoghurt with granola, fruit, and whey',
      summary: sv ? 'Krämig återhämtning med extra proteinboost.' : 'Creamy recovery with an extra protein boost.',
      prepMinutes: 4,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'grekisk yoghurt' : 'Greek yoghurt', amount: amt(ctx.macros.proteinG * 5) },
        { name: sv ? 'vassleprotein' : 'whey protein', amount: amt(ctx.macros.proteinG * 0.3) },
        { name: 'granola', amount: amt(ctx.macros.carbsG * 0.5) },
        { name: sv ? 'frukt eller bär' : 'fruit or berries', amount: '100 g' },
      ],
      steps: sv
        ? ['Rör vassle i yoghurten.', 'Toppa med granola och frukt.']
        : ['Stir whey into the yoghurt.', 'Top with granola and fruit.'],
      tips: [sv ? 'Hoppa över vasslet om proteinbehovet redan är täckt.' : 'Skip the whey if protein is already covered.'],
    })
  },
]

// ---------------------------------------------------------------------------
// Light between-meal snacks
// ---------------------------------------------------------------------------
export const SNACK_RECIPES: RecipeBuilder[] = [
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Kvargbowl med bär och nötter' : 'Quark bowl with berries and nuts',
      summary: sv ? 'Litet, proteinrikt mellanmål som tar hungern.' : 'Small, protein-rich snack that takes the edge off hunger.',
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'kvarg eller grekisk yoghurt' : 'quark or Greek yoghurt', amount: amt(ctx.macros.proteinG * 7) },
        { name: sv ? 'bär' : 'berries', amount: '100 g' },
        { name: sv ? 'frukt' : 'fruit', amount: sv ? '1 st' : '1 piece' },
        { name: sv ? 'nötter eller frön' : 'nuts or seeds', amount: amt(Math.max(ctx.macros.fatG, 3) * 1.5) },
      ],
      steps: sv
        ? ['Lägg kvarg i en skål.', 'Toppa med bär, frukt och nötter.']
        : ['Add quark to a bowl.', 'Top with berries, fruit, and nuts.'],
      tips: [sv ? 'Byt nötter mot frön för lägre fett.' : 'Swap nuts for seeds for lower fat.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Keso med frukt och frön' : 'Cottage cheese with fruit and seeds',
      summary: sv ? 'Lätt och proteinrikt utan att bli en hel måltid.' : 'Light and protein-rich without becoming a full meal.',
      prepMinutes: 4,
      cookMinutes: 0,
      ingredients: [
        { name: 'keso', amount: amt(ctx.macros.proteinG * 8) },
        { name: sv ? 'frukt eller bär' : 'fruit or berries', amount: '100 g' },
        { name: sv ? 'pumpa- eller solrosfrön' : 'pumpkin or sunflower seeds', amount: amt(Math.max(ctx.macros.fatG, 3)) },
      ],
      steps: sv
        ? ['Lägg keso i en skål.', 'Toppa med frukt och frön.']
        : ['Add cottage cheese to a bowl.', 'Top with fruit and seeds.'],
      tips: [sv ? 'En nypa kanel lyfter smaken.' : 'A pinch of cinnamon lifts the flavour.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Smörgås med ägg och en frukt' : 'Egg sandwich with a piece of fruit',
      summary: sv ? 'Snabbt mellanmål med komplett protein.' : 'Quick snack with complete protein.',
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'fullkornsbröd' : 'wholegrain bread', amount: sv ? '1 skiva' : '1 slice' },
        { name: sv ? 'kokt ägg' : 'boiled egg', amount: sv ? '2 st' : '2' },
        { name: sv ? 'frukt' : 'fruit', amount: sv ? '1 st' : '1 piece' },
      ],
      steps: sv
        ? ['Skiva ägget på brödet.', 'Salta lätt.', 'Ät frukten vid sidan.']
        : ['Slice the egg onto the bread.', 'Salt lightly.', 'Eat the fruit alongside.'],
      tips: [sv ? 'Förkoka ägg för veckan.' : 'Pre-boil eggs for the week.'],
    })
  },
  (ctx) => {
    const sv = svOf(ctx)
    return make(ctx, {
      title: sv ? 'Yoghurt med nötter och honung' : 'Yoghurt with nuts and honey',
      summary: sv ? 'Enkelt mellanmål med protein och bra fett.' : 'Simple snack with protein and quality fat.',
      prepMinutes: 3,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'grekisk yoghurt' : 'Greek yoghurt', amount: amt(ctx.macros.proteinG * 7) },
        { name: sv ? 'blandade nötter' : 'mixed nuts', amount: amt(Math.max(ctx.macros.fatG, 3) * 1.4) },
        { name: sv ? 'honung' : 'honey', amount: '10 g' },
      ],
      steps: sv
        ? ['Lägg yoghurt i en skål.', 'Toppa med nötter och honung.']
        : ['Add yoghurt to a bowl.', 'Top with nuts and honey.'],
      tips: [sv ? 'Mät upp nötterna – de är energität.' : 'Measure the nuts — they are energy-dense.'],
    })
  },
]

/**
 * Deterministically pick a recipe from a pool by a numeric variant. The same
 * variant always returns the same recipe; different variants rotate through the
 * pool (and wrap around), which is how the guide shows different recipes on
 * different days while staying stable for any given day.
 */
export function pickRecipe(pool: RecipeBuilder[], variant: number): RecipeBuilder {
  const i = ((Math.round(variant) % pool.length) + pool.length) % pool.length
  return pool[i]
}
