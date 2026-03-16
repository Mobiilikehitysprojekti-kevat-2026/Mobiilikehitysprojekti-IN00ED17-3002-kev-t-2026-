import { z } from 'zod';

export const localeSchema = z.enum(['en', 'fi']);
export type Locale = z.infer<typeof localeSchema>;

export const ingredientCategorySchema = z.enum([
  'vegetable',
  'protein',
  'dairy',
  'spice',
  'grain',
  'fruit',
  'other',
]);

export const ingredientSchema = z.object({
  confidence: z.number().min(0).max(1),
  id: z.string().optional(),
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  category: ingredientCategorySchema,
});

export const recipeStepSchema = z.object({
  durationSeconds: z.number().int().positive().optional(),
  instruction: z.string().min(1),
  stepNumber: z.number().int().positive(),
  tip: z.string().min(1).optional(),
});

export const nutritionSchema = z.object({
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

export const recipeSchema = z.object({
  cuisine: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  id: z.string().min(1),
  ingredients: z.array(ingredientSchema).min(1),
  nutritionEstimate: nutritionSchema.optional(),
  servings: z.number().int().positive(),
  steps: z.array(recipeStepSchema).min(1),
  title: z.string().min(1),
  totalTimeMinutes: z.number().int().positive(),
});

export const recipeImageSchema = z.object({
  alt: z.string().min(1).optional(),
  photographerName: z.string().min(1).optional(),
  photographerUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  url: z.string().url(),
});

export const ingredientImagesInputSchema = z.object({
  locale: localeSchema,
  names: z.array(z.string().min(1)).max(8),
});

export const ingredientImageItemSchema = z.object({
  image: recipeImageSchema.nullable().optional(),
  name: z.string().min(1),
});

export const ingredientImagesOutputSchema = z.object({
  items: z.array(ingredientImageItemSchema).max(8),
});

export const analyzeInputSchema = z.object({
  imageBase64: z.string().min(1),
  locale: localeSchema,
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

export const analyzeOutputSchema = z.object({
  detectedIngredients: z.array(ingredientSchema),
  suggestedRecipe: recipeSchema,
});

export const dailyRecipesInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  ingredients: z.array(z.string().min(1)).max(8).optional(),
  locale: localeSchema,
  slotStart: z.string().datetime().optional(),
});

export const dailyRecipeItemSchema = z.object({
  image: recipeImageSchema.nullable().optional(),
  recipe: recipeSchema,
});

export const dailyRecipesOutputSchema = z.object({
  generatedFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(dailyRecipeItemSchema).min(1),
  slotEndsAt: z.string().datetime(),
  slotStart: z.string().datetime(),
});

export const askFridgeInputSchema = z.object({
  locale: localeSchema,
  pantryIngredients: z.array(z.string().min(1)).max(12).optional(),
  prompt: z.string().min(2).max(240),
});

export const askFridgeSuggestionSchema = z.object({
  fitLabel: z.string().min(1),
  image: recipeImageSchema.nullable().optional(),
  recipe: recipeSchema,
  summary: z.string().min(1),
});

export const askFridgeOutputSchema = z.object({
  suggestions: z.array(askFridgeSuggestionSchema).min(3).max(5),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;
export type AnalyzeOutput = z.infer<typeof analyzeOutputSchema>;
export type DailyRecipesInput = z.infer<typeof dailyRecipesInputSchema>;
export type DailyRecipesOutput = z.infer<typeof dailyRecipesOutputSchema>;
export type AskFridgeInput = z.infer<typeof askFridgeInputSchema>;
export type AskFridgeOutput = z.infer<typeof askFridgeOutputSchema>;
export type IngredientImagesInput = z.infer<typeof ingredientImagesInputSchema>;
export type IngredientImageItemDTO = z.infer<typeof ingredientImageItemSchema>;
export type IngredientImagesOutput = z.infer<typeof ingredientImagesOutputSchema>;
export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;
export type IngredientDTO = z.infer<typeof ingredientSchema>;
export type NutritionDTO = z.infer<typeof nutritionSchema>;
export type RecipeDTO = z.infer<typeof recipeSchema>;
export type RecipeImageDTO = z.infer<typeof recipeImageSchema>;
