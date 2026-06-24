import { describe, expect, it } from 'vitest'
import {
  BREAKFAST_RECIPES,
  MAIN_RECIPES,
  PRE_RECIPES,
  POST_RECIPES,
  SNACK_RECIPES,
  pickRecipe,
  type RecipeContext,
} from '../recipe-library'

const ctx: RecipeContext = {
  macros: { caloriesKcal: 500, proteinG: 35, carbsG: 55, fatG: 15 },
  locale: 'sv',
  source: 'TEMPLATE',
}

describe('recipe-library', () => {
  it('offers several distinct recipes per meal kind', () => {
    for (const pool of [BREAKFAST_RECIPES, MAIN_RECIPES, PRE_RECIPES, POST_RECIPES, SNACK_RECIPES]) {
      expect(pool.length).toBeGreaterThanOrEqual(4)
      const titles = new Set(pool.map((b) => b(ctx).title))
      // Every recipe in a pool should have a unique title.
      expect(titles.size).toBe(pool.length)
    }
  })

  it('rotates across days and wraps around', () => {
    // A week of consecutive day seeds should surface more than one breakfast.
    const week = Array.from({ length: 7 }, (_, day) => pickRecipe(BREAKFAST_RECIPES, day)(ctx).title)
    expect(new Set(week).size).toBeGreaterThan(1)

    // Wrap-around: variant === length returns the same as variant 0.
    expect(pickRecipe(MAIN_RECIPES, MAIN_RECIPES.length)(ctx).title).toBe(MAIN_RECIPES[0](ctx).title)
    // Negative variants are handled (no crash, valid recipe).
    expect(pickRecipe(MAIN_RECIPES, -1)(ctx).title).toBeTruthy()
  })

  it('produces valid recipes with scaled ingredients', () => {
    const recipe = MAIN_RECIPES[0](ctx)
    expect(recipe.ingredients.length).toBeGreaterThan(2)
    expect(recipe.steps.length).toBeGreaterThan(1)
    expect(recipe.servings).toBe(1)
    expect(recipe.source).toBe('TEMPLATE')
  })
})
