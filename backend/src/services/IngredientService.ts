import OpenAI from 'openai';

import { buildFallbackDailyRecipes } from './dailyRecipeCatalog';
import {
  askFridgeOutputSchema,
  analyzeOutputSchema,
  dailyRecipesOutputSchema,
  type AskFridgeInput,
  type AskFridgeOutput,
  type AnalyzeInput,
  type AnalyzeOutput,
  type DailyRecipesInput,
  type DailyRecipesOutput,
  type IngredientImagesInput,
  type IngredientImagesOutput,
  type Locale,
  type RecipeDTO,
  type RecipeImageDTO,
} from '../types/api';
import { HttpError } from '../middleware/errorHandler';

const DAILY_AI_ITEM_COUNT = 4;
const DAILY_FEED_SIZE = 12;
const DAILY_AI_TIME_BUDGET_MS = 4000;
const DAILY_RECIPE_SLOT_MS = 30 * 60 * 1000;
const ASK_FRIDGE_ITEM_COUNT = 4;
const MAX_INGREDIENT_IMAGE_COUNT = 8;
const MINIMUM_RECIPE_PHOTO_SCORE = 12;
const MINIMUM_RECIPE_INGREDIENT_FALLBACK_SCORE = 8;
const NON_FOOD_RECIPE_PHOTO_TERMS = new Set([
  'bar',
  'chef',
  'cocktail',
  'dining',
  'grocery',
  'groceries',
  'hand',
  'hands',
  'kitchen',
  'market',
  'menu',
  'person',
  'people',
  'restaurant',
  'shopping',
  'store',
  'table',
]);
const RAW_INGREDIENT_RECIPE_PHOTO_TERMS = new Set([
  'ingredient',
  'ingredients',
  'raw',
  'uncooked',
]);
const RECIPE_DISH_TYPE_TERMS = [
  'salad',
  'soup',
  'pasta',
  'risotto',
  'curry',
  'sandwich',
  'burger',
  'taco',
  'tacos',
  'stew',
  'skillet',
  'bowl',
  'pizza',
  'wrap',
  'omelet',
  'omelette',
  'toast',
  'tortilla',
  'noodles',
  'ramen',
  'dumplings',
  'pancake',
  'fritters',
  'shakshuka',
  'shakshouka',
] as const;
const GENERIC_HERO_INGREDIENT_TERMS = new Set([
  'butter',
  'egg',
  'eggs',
  'flour',
  'garlic',
  'milk',
  'oil',
  'olive',
  'onion',
  'onions',
  'pepper',
  'rice',
  'salt',
  'water',
]);
const GENERIC_SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'bowl',
  'day',
  'dish',
  'food',
  'for',
  'fresh',
  'in',
  'meal',
  'of',
  'on',
  'plate',
  'recipe',
  'style',
  'the',
  'today',
  'with',
]);

interface OpenAIResponsesClient {
  responses: {
    create: (payload: Record<string, unknown>) => Promise<{
      id?: string;
      output_text?: string;
      usage?: unknown;
    }>;
  };
}

const ingredientJsonSchema = {
  additionalProperties: false,
  properties: {
    category: {
      enum: ['vegetable', 'protein', 'dairy', 'spice', 'grain', 'fruit', 'other'],
      type: 'string',
    },
    confidence: { type: 'number' },
    id: { type: ['string', 'null'] },
    name: { type: 'string' },
    quantity: { type: ['string', 'null'] },
  },
  required: ['category', 'confidence', 'id', 'name', 'quantity'],
  type: 'object',
} as const;

const nutritionJsonSchema = {
  additionalProperties: false,
  properties: {
    calories: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    proteinG: { type: 'number' },
  },
  required: ['calories', 'carbsG', 'fatG', 'proteinG'],
  type: 'object',
} as const;

const recipeStepJsonSchema = {
  additionalProperties: false,
  properties: {
    durationSeconds: { type: ['number', 'null'] },
    instruction: { type: 'string' },
    stepNumber: { type: 'number' },
    tip: { type: ['string', 'null'] },
  },
  required: ['durationSeconds', 'instruction', 'stepNumber', 'tip'],
  type: 'object',
} as const;

const recipeJsonSchema = {
  additionalProperties: false,
  properties: {
    cuisine: { type: 'string' },
    difficulty: { enum: ['easy', 'medium', 'hard'], type: 'string' },
    id: { type: 'string' },
    ingredients: {
      items: ingredientJsonSchema,
      type: 'array',
    },
    nutritionEstimate: nutritionJsonSchema,
    servings: { type: 'number' },
    steps: {
      items: recipeStepJsonSchema,
      type: 'array',
    },
    title: { type: 'string' },
    totalTimeMinutes: { type: 'number' },
  },
  required: [
    'cuisine',
    'difficulty',
    'id',
    'ingredients',
    'nutritionEstimate',
    'servings',
    'steps',
    'title',
    'totalTimeMinutes',
  ],
  type: 'object',
} as const;

const ANALYSIS_SCHEMA = {
  additionalProperties: false,
  properties: {
    detectedIngredients: {
      items: ingredientJsonSchema,
      type: 'array',
    },
    suggestedRecipe: recipeJsonSchema,
  },
  required: ['detectedIngredients', 'suggestedRecipe'],
  type: 'object',
} as const;

const DAILY_RECIPES_SCHEMA = {
  additionalProperties: false,
  properties: {
    items: {
      items: recipeJsonSchema,
      maxItems: DAILY_AI_ITEM_COUNT,
      minItems: DAILY_AI_ITEM_COUNT,
      type: 'array',
    },
  },
  required: ['items'],
  type: 'object',
} as const;

const askFridgeSuggestionJsonSchema = {
  additionalProperties: false,
  properties: {
    fitLabel: { type: 'string' },
    recipe: recipeJsonSchema,
    summary: { type: 'string' },
  },
  required: ['fitLabel', 'recipe', 'summary'],
  type: 'object',
} as const;

const ASK_FRIDGE_SCHEMA = {
  additionalProperties: false,
  properties: {
    suggestions: {
      items: askFridgeSuggestionJsonSchema,
      maxItems: 5,
      minItems: 3,
      type: 'array',
    },
  },
  required: ['suggestions'],
  type: 'object',
} as const;

interface PexelsPhotoPayload {
  photos?: Array<{
    alt?: string;
    photographer?: string;
    photographer_url?: string;
    src?: {
      large?: string;
      large2x?: string;
      medium?: string;
      small?: string;
      tiny?: string;
    };
    url?: string;
  }>;
}

interface PexelsSearchOptions {
  locale?: Locale;
  orientation?: 'landscape' | 'portrait' | 'square';
  perPage?: number;
  query: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase();
}

function tokenizeText(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !GENERIC_SEARCH_STOP_WORDS.has(token));
}

function countTokenOverlap(target: Set<string>, candidates: string[]) {
  return candidates.reduce((score, token) => score + (target.has(token) ? 1 : 0), 0);
}

function scoreRecipePhotoMatch(photoAlt: string | undefined, recipe: RecipeDTO) {
  if (!photoAlt) {
    return Number.NEGATIVE_INFINITY;
  }

  const normalizedAlt = photoAlt.toLowerCase();
  const photoTokens = new Set(tokenizeText(photoAlt));
  const titleTokens = tokenizeText(recipe.title);
  const ingredientTokens = recipe.ingredients.flatMap((ingredient) => tokenizeText(ingredient.name));
  const cuisineTokens = tokenizeText(recipe.cuisine);
  const dishType = findRecipeDishType(recipe);
  const altHasKnownDishType = RECIPE_DISH_TYPE_TERMS.some((term) => normalizedAlt.includes(term));
  let score = 0;

  if (normalizedAlt.includes(recipe.title.toLowerCase())) {
    score += 16;
  }

  score += countTokenOverlap(photoTokens, titleTokens) * 4;
  score += countTokenOverlap(photoTokens, ingredientTokens) * 3;
  score += countTokenOverlap(photoTokens, cuisineTokens) * 2;

  if (dishType && normalizedAlt.includes(dishType)) {
    score += 10;
  } else if (dishType && altHasKnownDishType) {
    score -= 8;
  } else if (dishType) {
    score -= 4;
  }

  for (const term of NON_FOOD_RECIPE_PHOTO_TERMS) {
    if (photoTokens.has(term) || normalizedAlt.includes(term)) {
      score -= 5;
    }
  }

  for (const term of RAW_INGREDIENT_RECIPE_PHOTO_TERMS) {
    if (photoTokens.has(term)) {
      score -= 3;
    }
  }

  return score;
}

function scoreIngredientPhotoMatch(photoAlt: string | undefined, ingredientName: string) {
  if (!photoAlt) {
    return Number.NEGATIVE_INFINITY;
  }

  const normalizedName = ingredientName.toLowerCase();
  const normalizedAlt = photoAlt.toLowerCase();
  const photoTokens = new Set(tokenizeText(photoAlt));
  const ingredientTokens = tokenizeText(ingredientName);
  let score = 0;

  if (normalizedAlt.includes(normalizedName)) {
    score += 12;
  }

  score += countTokenOverlap(photoTokens, ingredientTokens) * 4;

  if (photoTokens.has('ingredient') || photoTokens.has('ingredients')) {
    score += 2;
  }

  if (photoTokens.has('food')) {
    score += 1;
  }

  if (photoTokens.has('dish') || photoTokens.has('meal')) {
    score -= 2;
  }

  return score;
}

function buildRecipeImageQuery(recipe: RecipeDTO) {
  const prominentIngredients = recipe.ingredients
    .slice(0, 2)
    .map((ingredient) => ingredient.name)
    .join(' ');

  return [recipe.title, recipe.cuisine, prominentIngredients, 'plated dish']
    .filter(Boolean)
    .join(' ');
}

function findRecipeDishType(recipe: RecipeDTO) {
  const normalizedTitle = recipe.title.toLowerCase();
  return RECIPE_DISH_TYPE_TERMS.find((term) => normalizedTitle.includes(term));
}

function buildRecipeImageQueries(recipe: RecipeDTO) {
  const prominentIngredients = recipe.ingredients
    .slice(0, 2)
    .map((ingredient) => ingredient.name)
    .join(' ');
  const dishType = findRecipeDishType(recipe);

  return Array.from(
    new Set(
      [
        buildRecipeImageQuery(recipe),
        [recipe.title, dishType, 'food photography'].filter(Boolean).join(' '),
        [recipe.cuisine, dishType ?? 'dish', prominentIngredients, 'plated'].filter(Boolean).join(' '),
        [prominentIngredients, dishType ?? recipe.cuisine, 'meal'].filter(Boolean).join(' '),
      ]
        .map((query) => query.trim())
        .filter(Boolean),
    ),
  );
}

function buildRecipeIngredientFallbackQueries(recipe: RecipeDTO) {
  const dishType = findRecipeDishType(recipe);
  const prominentIngredients = getRecipeFallbackIngredients(recipe).map((ingredient) =>
    ingredient.name.trim(),
  );

  return Array.from(
    new Set(
      prominentIngredients.flatMap((ingredient) =>
        [
          buildIngredientImageQuery(ingredient),
          [ingredient, dishType, 'food photography'].filter(Boolean).join(' '),
          [ingredient, recipe.cuisine, 'dish'].filter(Boolean).join(' '),
        ]
          .map((query) => query.trim())
          .filter(Boolean),
      ),
    ),
  );
}

function scoreHeroIngredientPriority(ingredient: RecipeDTO['ingredients'][number]) {
  const normalizedName = ingredient.name.trim().toLowerCase();
  const ingredientTokens = tokenizeText(ingredient.name);
  let score = 0;

  switch (ingredient.category) {
    case 'vegetable':
    case 'fruit':
      score += 4;
      break;
    case 'protein':
      score += 2;
      break;
    case 'grain':
    case 'dairy':
      score += 1;
      break;
    default:
      score += 0;
  }

  score += Math.min(ingredientTokens.length, 2);

  if (
    GENERIC_HERO_INGREDIENT_TERMS.has(normalizedName) ||
    ingredientTokens.some((token) => GENERIC_HERO_INGREDIENT_TERMS.has(token))
  ) {
    score -= 5;
  }

  return score;
}

function getRecipeFallbackIngredients(recipe: RecipeDTO) {
  return Array.from(
    new Map(
      recipe.ingredients
        .filter((ingredient) => ingredient.name.trim().length > 0)
        .sort((left, right) => scoreHeroIngredientPriority(right) - scoreHeroIngredientPriority(left))
        .map((ingredient) => [ingredient.name.trim().toLowerCase(), ingredient]),
    ).values(),
  ).slice(0, 3);
}

function getPexelsPhotoKey(photo: NonNullable<PexelsPhotoPayload['photos']>[number]) {
  return photo.url ?? photo.src?.large2x ?? photo.src?.large ?? photo.src?.medium ?? photo.alt ?? '';
}

function buildIngredientImageQuery(ingredientName: string) {
  return `${ingredientName} ingredient food`;
}

function localizeStaticText(locale: Locale, text: { en: string; fi: string }) {
  return locale === 'fi' ? text.fi : text.en;
}

function scoreAskFridgeRecipeMatch(recipe: RecipeDTO, prompt: string, pantryIngredients: string[]) {
  const promptTokens = new Set(tokenizeText(prompt));
  const titleTokens = tokenizeText(recipe.title);
  const ingredientTokens = recipe.ingredients.flatMap((ingredient) => tokenizeText(ingredient.name));
  const cuisineTokens = tokenizeText(recipe.cuisine);
  const pantryTokens = pantryIngredients.flatMap((ingredient) => tokenizeText(ingredient));
  let score = 0;

  score += countTokenOverlap(promptTokens, titleTokens) * 5;
  score += countTokenOverlap(promptTokens, ingredientTokens) * 4;
  score += countTokenOverlap(promptTokens, cuisineTokens) * 3;
  score += pantryTokens.reduce(
    (currentScore, token) =>
      ingredientTokens.includes(token) || titleTokens.includes(token) ? currentScore + 2 : currentScore,
    0,
  );

  if (recipe.totalTimeMinutes <= 15) {
    score += 2;
  }

  return score;
}

function buildAskFridgeFitLabel(
  recipe: RecipeDTO,
  prompt: string,
  pantryIngredients: string[],
  locale: Locale,
) {
  const promptTokens = new Set(tokenizeText(prompt));
  const ingredientTokens = recipe.ingredients.flatMap((ingredient) => tokenizeText(ingredient.name));
  const pantryOverlap = pantryIngredients.filter((ingredient) =>
    ingredientTokens.some((token) => token.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(token)),
  ).length;

  if (pantryOverlap >= 2) {
    return localizeStaticText(locale, {
      en: 'Uses your pantry',
      fi: 'Sopii varastoosi',
    });
  }

  if (recipe.totalTimeMinutes <= 12) {
    return localizeStaticText(locale, {
      en: 'Fastest option',
      fi: 'Nopein vaihtoehto',
    });
  }

  if (
    countTokenOverlap(promptTokens, tokenizeText(recipe.title)) +
      countTokenOverlap(promptTokens, tokenizeText(recipe.cuisine)) >=
    2
  ) {
    return localizeStaticText(locale, {
      en: 'Best match',
      fi: 'Paras osuma',
    });
  }

  if ((recipe.nutritionEstimate?.proteinG ?? 0) >= 20) {
    return localizeStaticText(locale, {
      en: 'High protein',
      fi: 'Paljon proteiinia',
    });
  }

  return localizeStaticText(locale, {
    en: 'Great pick',
    fi: 'Hyva valinta',
  });
}

function buildAskFridgeSummary(recipe: RecipeDTO, locale: Locale) {
  const highlightedIngredients = recipe.ingredients
    .slice(0, 2)
    .map((ingredient) => ingredient.name)
    .join(locale === 'fi' ? ' ja ' : ' and ');

  return locale === 'fi'
    ? `${recipe.cuisine}-henkinen vaihtoehto, jossa korostuvat ${highlightedIngredients}. Valmis noin ${recipe.totalTimeMinutes} minuutissa.`
    : `A ${recipe.cuisine.toLowerCase()}-leaning idea built around ${highlightedIngredients}. Ready in about ${recipe.totalTimeMinutes} minutes.`;
}

function scoreRecipeIngredientFallbackPhotoMatch(photoAlt: string | undefined, recipe: RecipeDTO) {
  if (!photoAlt) {
    return Number.NEGATIVE_INFINITY;
  }

  const prominentIngredients = getRecipeFallbackIngredients(recipe);
  const normalizedAlt = photoAlt.toLowerCase();
  const photoTokens = new Set(tokenizeText(photoAlt));
  const cuisineTokens = tokenizeText(recipe.cuisine);
  const dishType = findRecipeDishType(recipe);
  const ingredientScore = prominentIngredients.reduce(
    (bestScore, ingredient, index) =>
      Math.max(
        bestScore,
        scoreIngredientPhotoMatch(photoAlt, ingredient.name) +
          scoreHeroIngredientPriority(ingredient) * 2 -
          index,
      ),
    Number.NEGATIVE_INFINITY,
  );

  if (ingredientScore === Number.NEGATIVE_INFINITY) {
    return ingredientScore;
  }

  let score = ingredientScore;

  if (dishType && normalizedAlt.includes(dishType)) {
    score += 3;
  }

  score += countTokenOverlap(photoTokens, cuisineTokens);

  for (const term of NON_FOOD_RECIPE_PHOTO_TERMS) {
    if (photoTokens.has(term) || normalizedAlt.includes(term)) {
      score -= 4;
    }
  }

  return score;
}

function toRecipeImage(
  photo: NonNullable<PexelsPhotoPayload['photos']>[number],
  variant: 'hero' | 'thumb',
): RecipeImageDTO | null {
  const imageUrl =
    variant === 'thumb'
      ? photo?.src?.medium ?? photo?.src?.small ?? photo?.src?.tiny
      : photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.medium;

  if (!imageUrl) {
    return null;
  }

  return {
    alt: photo?.alt,
    photographerName: photo?.photographer,
    photographerUrl: photo?.photographer_url,
    sourceUrl: photo?.url,
    url: imageUrl,
  };
}

function normalizeIngredientPayload(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  return {
    category: value.category,
    confidence: value.confidence,
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : undefined,
    name: value.name,
    quantity:
      typeof value.quantity === 'string' && value.quantity.trim().length > 0
        ? value.quantity
        : undefined,
  };
}

function normalizeStepPayload(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  return {
    durationSeconds:
      typeof value.durationSeconds === 'number' && Number.isFinite(value.durationSeconds)
        ? value.durationSeconds
        : undefined,
    instruction: value.instruction,
    stepNumber: value.stepNumber,
    tip: typeof value.tip === 'string' && value.tip.trim().length > 0 ? value.tip : undefined,
  };
}

function normalizeRecipePayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    cuisine: value.cuisine,
    difficulty: value.difficulty,
    id: value.id,
    ingredients: Array.isArray(value.ingredients)
      ? value.ingredients.map(normalizeIngredientPayload)
      : value.ingredients,
    nutritionEstimate: value.nutritionEstimate,
    servings: value.servings,
    steps: Array.isArray(value.steps) ? value.steps.map(normalizeStepPayload) : value.steps,
    title: value.title,
    totalTimeMinutes: value.totalTimeMinutes,
  };
}

function buildSystemPrompt(locale: AnalyzeInput['locale']) {
  return [
    'You are FridgeChef AI, a culinary vision assistant.',
    'Analyze the fridge or ingredient photo and return only valid JSON that matches the provided schema.',
    `Localize all user-facing recipe text to locale "${locale}".`,
    'Detect the visible ingredients with realistic confidence scores between 0 and 1.',
    'Create one practical recipe that primarily uses the detected ingredients.',
    'Recipe steps must be concise, cooking-friendly, and safe.',
    'If a quantity, tip, or duration is unknown, return null for that field instead of omitting it.',
    'Never wrap the response in markdown or any extra text.',
  ].join(' ');
}

function buildDailyRecipesPrompt(input: DailyRecipesInput, generatedFor: string) {
  const pantryHint =
    input.ingredients && input.ingredients.length > 0
      ? `When helpful, prefer these pantry ingredients: ${input.ingredients.join(', ')}.`
      : 'Do not assume a specific pantry if none is provided.';

  return [
    'You are FridgeChef AI, a culinary discovery assistant.',
    'Return only valid JSON that matches the provided schema.',
    `Generate exactly ${DAILY_AI_ITEM_COUNT} distinct recipe ideas for date "${generatedFor}".`,
    `Localize all user-facing recipe text to locale "${input.locale}".`,
    'Make the recipes feel fresh for today and different from one another in cuisine, technique, or meal occasion.',
    pantryHint,
    'Recipes must be realistic, home-cook friendly, and visually appealing in a food feed.',
    'If a quantity, tip, or duration is unknown, return null for that field instead of omitting it.',
  ].join(' ');
}

function buildAskFridgePrompt(input: AskFridgeInput) {
  const pantryHint =
    input.pantryIngredients && input.pantryIngredients.length > 0
      ? `The user's pantry currently includes: ${input.pantryIngredients.join(', ')}.`
      : 'No pantry list was provided, so do not invent one.';

  return [
    'You are Ask Fridge AI, a warm culinary assistant.',
    'Return only valid JSON that matches the provided schema.',
    `Localize all user-facing recipe text to locale "${input.locale}".`,
    `Generate exactly ${ASK_FRIDGE_ITEM_COUNT} distinct recipe suggestions based on the user's request.`,
    pantryHint,
    'Each suggestion must include a short fitLabel, a one-sentence summary, and a realistic recipe.',
    'The fitLabel should be concise and card-friendly, such as Best match, Uses your pantry, Fastest option, or High protein.',
    'Recipes must be practical for home cooking, visually appealing, and meaningfully different from one another.',
    'If a quantity, tip, or duration is unknown, return null for that field instead of omitting it.',
  ].join(' ');
}

function shouldRetry(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('status' in error && typeof error.status === 'number') {
    return [429, 500, 502, 503, 504].includes(error.status);
  }

  return false;
}

async function wait(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function dedupeRecipes(recipes: RecipeDTO[]) {
  const seen = new Set<string>();

  return recipes.filter((recipe) => {
    const key = `${recipe.id}:${recipe.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getDailySlotStart(date = new Date()) {
  return new Date(Math.floor(date.getTime() / DAILY_RECIPE_SLOT_MS) * DAILY_RECIPE_SLOT_MS);
}

function toIsoTimestamp(date: Date) {
  return date.toISOString();
}

function getNextDailySlotStart(slotStartIso: string) {
  return new Date(new Date(slotStartIso).getTime() + DAILY_RECIPE_SLOT_MS).toISOString();
}

function getDailySlotMetadata(slotStartOverride?: string) {
  const slotStartDate = slotStartOverride ? getDailySlotStart(new Date(slotStartOverride)) : getDailySlotStart();
  const slotEndDate = new Date(slotStartDate.getTime() + DAILY_RECIPE_SLOT_MS);

  return {
    generatedFor: slotStartDate.toISOString().slice(0, 10),
    slotEndsAt: toIsoTimestamp(slotEndDate),
    slotStart: toIsoTimestamp(slotStartDate),
  };
}

export class IngredientService {
  private client: OpenAIResponsesClient | null;
  private dailyRecipesCache = new Map<string, DailyRecipesOutput>();
  private dailyRecipesPending = new Map<string, Promise<DailyRecipesOutput>>();
  private ingredientImagesCache = new Map<string, RecipeImageDTO | null>();
  private model: string;
  private pexelsApiKey: string | null;

  constructor(options?: { client?: OpenAIResponsesClient; model?: string }) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.model = options?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
    this.pexelsApiKey = process.env.PEXELS_API_KEY ?? null;

    if (options?.client) {
      this.client = options.client;
      return;
    }

    if (!apiKey) {
      this.client = null;
      return;
    }

    this.client = new OpenAI({ apiKey });
  }

  async analyzeImage(input: AnalyzeInput): Promise<AnalyzeOutput> {
    if (!this.client) {
      throw new HttpError(
        500,
        'OPENAI_NOT_CONFIGURED',
        'OPENAI_API_KEY is missing. Add it to your environment before running analysis.',
      );
    }

    const client = this.client;
    const response = await this.withRetries(() =>
      client.responses.create({
        input: [
          {
            content: [
              {
                text: buildSystemPrompt(input.locale),
                type: 'input_text',
              },
            ],
            role: 'system',
          },
          {
            content: [
              {
                text: 'Identify ingredients and generate a single recipe response.',
                type: 'input_text',
              },
              {
                detail: 'auto',
                image_url: `data:${input.mimeType};base64,${input.imageBase64}`,
                type: 'input_image',
              },
            ],
            role: 'user',
          },
        ],
        max_output_tokens: 1800,
        model: this.model,
        text: {
          format: {
            name: 'fridgechef_analysis',
            schema: ANALYSIS_SCHEMA,
            strict: true,
            type: 'json_schema',
          },
        },
      }),
    );

    if (response.usage) {
      console.info('OpenAI usage', response.usage);
    }

    if (!response.output_text) {
      throw new HttpError(502, 'AI_EMPTY_RESPONSE', 'OpenAI returned an empty response.');
    }

    const parsed = JSON.parse(response.output_text) as {
      detectedIngredients?: unknown[];
      suggestedRecipe?: unknown;
    };

    return analyzeOutputSchema.parse({
      detectedIngredients: Array.isArray(parsed.detectedIngredients)
        ? parsed.detectedIngredients.map(normalizeIngredientPayload)
        : [],
      suggestedRecipe: normalizeRecipePayload(parsed.suggestedRecipe),
    });
  }

  async generateDailyRecipes(input: DailyRecipesInput): Promise<DailyRecipesOutput> {
    const slotMetadata = getDailySlotMetadata(input.slotStart);
    const result = await this.getOrCreateDailyRecipesSlot(input, slotMetadata.slotStart);

    queueMicrotask(() => {
      void this.prewarmDailyRecipesSlot(input, getNextDailySlotStart(slotMetadata.slotStart));
    });

    return result;
  }

  async askFridge(input: AskFridgeInput): Promise<AskFridgeOutput> {
    let suggestions: Array<{ fitLabel: string; recipe: RecipeDTO; summary: string }> = [];

    if (this.client) {
      try {
        const response = await this.withRetries(() =>
          this.client!.responses.create({
            input: [
              {
                content: [
                  {
                    text: buildAskFridgePrompt(input),
                    type: 'input_text',
                  },
                ],
                role: 'system',
              },
              {
                content: [
                  {
                    text: input.prompt,
                    type: 'input_text',
                  },
                ],
                role: 'user',
              },
            ],
            max_output_tokens: 3200,
            model: this.model,
            text: {
              format: {
                name: 'fridgechef_ask_fridge',
                schema: ASK_FRIDGE_SCHEMA,
                strict: true,
                type: 'json_schema',
              },
            },
          }),
        );

        if (response?.usage) {
          console.info('OpenAI usage', response.usage);
        }

        if (response?.output_text) {
          const parsed = JSON.parse(response.output_text) as { suggestions?: Array<Record<string, unknown>> };
          suggestions = (parsed.suggestions ?? [])
            .map((suggestion) => ({
              fitLabel: typeof suggestion.fitLabel === 'string' ? suggestion.fitLabel : '',
              recipe: normalizeRecipePayload(suggestion.recipe) as RecipeDTO,
              summary: typeof suggestion.summary === 'string' ? suggestion.summary : '',
            }))
            .filter((suggestion) => suggestion.fitLabel && suggestion.summary && suggestion.recipe);
        }
      } catch (error) {
        console.warn('Falling back to local Ask Fridge suggestions.', error);
      }
    }

    if (suggestions.length < 3) {
      const fallbackRecipes = buildFallbackDailyRecipes({
        date: new Date().toISOString().slice(0, 10),
        ingredients: input.pantryIngredients,
        locale: input.locale,
        slotStart: new Date().toISOString(),
      })
        .sort(
          (left, right) =>
            scoreAskFridgeRecipeMatch(right, input.prompt, input.pantryIngredients ?? []) -
            scoreAskFridgeRecipeMatch(left, input.prompt, input.pantryIngredients ?? []),
        )
        .slice(0, ASK_FRIDGE_ITEM_COUNT);

      suggestions = fallbackRecipes.map((recipe) => ({
        fitLabel: buildAskFridgeFitLabel(recipe, input.prompt, input.pantryIngredients ?? [], input.locale),
        recipe,
        summary: buildAskFridgeSummary(recipe, input.locale),
      }));
    }

    return askFridgeOutputSchema.parse({
      suggestions: await Promise.all(
        suggestions.slice(0, 5).map(async (suggestion) => ({
          fitLabel: suggestion.fitLabel,
          image: await this.fetchRecipeImage(suggestion.recipe, input.locale),
          recipe: suggestion.recipe,
          summary: suggestion.summary,
        })),
      ),
    });
  }

  private buildDailyRecipesCacheKey(input: DailyRecipesInput, slotStart: string) {
    return [
      slotStart,
      input.locale,
      ...(input.ingredients ?? []).map((ingredient) => ingredient.toLowerCase()),
    ].join('|');
  }

  private async getOrCreateDailyRecipesSlot(
    input: DailyRecipesInput,
    slotStart: string,
  ): Promise<DailyRecipesOutput> {
    const cacheKey = this.buildDailyRecipesCacheKey(input, slotStart);
    const cached = this.dailyRecipesCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const pending = this.dailyRecipesPending.get(cacheKey);
    if (pending) {
      return pending;
    }

    const promise = this.createDailyRecipesSlot(input, slotStart)
      .then((result) => {
        this.dailyRecipesCache.set(cacheKey, result);
        return result;
      })
      .finally(() => {
        this.dailyRecipesPending.delete(cacheKey);
      });

    this.dailyRecipesPending.set(cacheKey, promise);
    return promise;
  }

  private prewarmDailyRecipesSlot(input: DailyRecipesInput, slotStart: string) {
    void this.getOrCreateDailyRecipesSlot(
      {
        ...input,
        slotStart,
      },
      slotStart,
    ).catch((error) => {
      console.warn('Unable to prewarm the next daily recipe slot.', error);
    });
  }

  private async createDailyRecipesSlot(
    input: DailyRecipesInput,
    slotStart: string,
  ): Promise<DailyRecipesOutput> {
    const slotMetadata = getDailySlotMetadata(slotStart);
    const fallbackRecipes = buildFallbackDailyRecipes({
      ...input,
      date: slotMetadata.slotStart,
      slotStart: slotMetadata.slotStart,
    });
    let aiRecipes: RecipeDTO[] = [];

    if (this.client) {
      try {
        const response = await Promise.race([
          this.withRetries(() =>
            this.client!.responses.create({
              input: [
                {
                  content: [
                    {
                      text: buildDailyRecipesPrompt(
                        {
                          ...input,
                          slotStart: slotMetadata.slotStart,
                        },
                        slotMetadata.slotStart,
                      ),
                      type: 'input_text',
                    },
                  ],
                  role: 'system',
                },
                {
                  content: [
                    {
                      text: 'Create the next ready-to-serve recipe feed for this rotation slot.',
                      type: 'input_text',
                    },
                  ],
                  role: 'user',
                },
              ],
              max_output_tokens: 3400,
              model: this.model,
              text: {
                format: {
                  name: 'fridgechef_daily_recipes',
                  schema: DAILY_RECIPES_SCHEMA,
                  strict: true,
                  type: 'json_schema',
                },
              },
            }),
          ),
          wait(DAILY_AI_TIME_BUDGET_MS).then(() => null),
        ]);

        if (response?.usage) {
          console.info('OpenAI usage', response.usage);
        }

        if (response?.output_text) {
          const parsed = JSON.parse(response.output_text) as { items?: unknown[] };
          aiRecipes = (parsed.items ?? [])
            .map((recipe) => normalizeRecipePayload(recipe))
            .filter(Boolean) as RecipeDTO[];
        } else if (response === null) {
          console.info('Daily recipe feed used fallback due to AI time budget.');
        }
      } catch (error) {
        console.warn('Falling back to the default daily recipe feed.', error);
      }
    }

    return dailyRecipesOutputSchema.parse({
      generatedFor: slotMetadata.generatedFor,
      items: await Promise.all(
        dedupeRecipes([...aiRecipes, ...fallbackRecipes])
          .slice(0, DAILY_FEED_SIZE)
          .map(async (recipe) => ({
            image: await this.fetchRecipeImage(recipe, input.locale),
            recipe,
          })),
      ),
      slotEndsAt: slotMetadata.slotEndsAt,
      slotStart: slotMetadata.slotStart,
    });
  }

  async getIngredientImages(input: IngredientImagesInput): Promise<IngredientImagesOutput> {
    const uniqueNames = Array.from(
      new Set(
        input.names
          .map((name) => name.trim())
          .filter(Boolean)
          .slice(0, MAX_INGREDIENT_IMAGE_COUNT),
      ),
    );

    const items = await Promise.all(
      uniqueNames.map(async (name) => ({
        image: await this.fetchIngredientImage(name, input.locale),
        name,
      })),
    );

    return {
      items,
    };
  }

  private async fetchRecipeImage(recipe: RecipeDTO, locale: Locale) {
    if (!this.pexelsApiKey) {
      return null;
    }

    const photos = Array.from(
      new Map(
        (
          await Promise.all(
            buildRecipeImageQueries(recipe).map((query) =>
              this.searchPexelsPhotos({
                locale,
                orientation: 'landscape',
                perPage: 4,
                query,
              }),
            ),
          )
        )
          .flat()
          .map((photo) => [getPexelsPhotoKey(photo), photo]),
      ).values(),
    );

    const bestMatch = photos
      .map((photo) => ({
        photo,
        score: scoreRecipePhotoMatch(photo.alt, recipe),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (bestMatch && bestMatch.score >= MINIMUM_RECIPE_PHOTO_SCORE) {
      return toRecipeImage(bestMatch.photo, 'hero');
    }

    return this.fetchRecipeIngredientFallbackImage(recipe, locale);
  }

  private async fetchRecipeIngredientFallbackImage(recipe: RecipeDTO, locale: Locale) {
    const fallbackQueries = buildRecipeIngredientFallbackQueries(recipe);

    if (fallbackQueries.length === 0) {
      return null;
    }

    const photos = Array.from(
      new Map(
        (
          await Promise.all(
            fallbackQueries.map((query) =>
              this.searchPexelsPhotos({
                locale,
                orientation: 'landscape',
                perPage: 3,
                query,
              }),
            ),
          )
        )
          .flat()
          .map((photo) => [getPexelsPhotoKey(photo), photo]),
      ).values(),
    );

    const bestMatch = photos
      .map((photo) => ({
        photo,
        score: scoreRecipeIngredientFallbackPhotoMatch(photo.alt, recipe),
      }))
      .sort((left, right) => right.score - left.score)[0];

    return bestMatch && bestMatch.score >= MINIMUM_RECIPE_INGREDIENT_FALLBACK_SCORE
      ? toRecipeImage(bestMatch.photo, 'hero')
      : null;
  }

  private async fetchIngredientImage(name: string, locale: Locale) {
    if (!this.pexelsApiKey) {
      return null;
    }

    const cacheKey = `${locale}:${normalizeLookupKey(name)}`;
    const cached = this.ingredientImagesCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const photos = await this.searchPexelsPhotos({
      locale,
      orientation: 'square',
      perPage: 4,
      query: buildIngredientImageQuery(name),
    });

    const bestMatch = photos
      .map((photo) => ({
        photo,
        score: scoreIngredientPhotoMatch(photo.alt, name),
      }))
      .sort((left, right) => right.score - left.score)[0];
    const image = bestMatch && bestMatch.score > 0 ? toRecipeImage(bestMatch.photo, 'thumb') : null;

    this.ingredientImagesCache.set(cacheKey, image);
    return image;
  }

  private async searchPexelsPhotos({
    locale,
    orientation,
    perPage = 1,
    query,
  }: PexelsSearchOptions): Promise<NonNullable<PexelsPhotoPayload['photos']>> {
    if (!this.pexelsApiKey) {
      return [];
    }

    const params = new URLSearchParams({
      per_page: String(perPage),
      query,
    });

    if (locale) {
      params.set('locale', locale === 'fi' ? 'fi-FI' : 'en-US');
    }

    if (orientation) {
      params.set('orientation', orientation);
    }

    try {
      const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
        headers: {
          Authorization: this.pexelsApiKey,
        },
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as PexelsPhotoPayload;
      return payload.photos ?? [];
    } catch {
      return [];
    }
  }

  private async withRetries<T>(operation: () => Promise<T>): Promise<T> {
    const retryDelays = [0, 800, 1600];
    let lastError: unknown;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt] > 0) {
        await wait(retryDelays[attempt]);
      }

      try {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new HttpError(504, 'AI_TIMEOUT', 'OpenAI request timed out.'));
          }, 30000);
        });

        try {
          return await Promise.race([operation(), timeoutPromise]);
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      } catch (error) {
        lastError = error;
        if (!shouldRetry(error) || attempt === retryDelays.length - 1) {
          break;
        }
      }
    }

    if (lastError instanceof HttpError) {
      throw lastError;
    }

    if (lastError instanceof Error) {
      throw new HttpError(502, 'AI_SERVICE_ERROR', lastError.message);
    }

    throw new HttpError(502, 'AI_SERVICE_ERROR', 'OpenAI request failed.');
  }
}
