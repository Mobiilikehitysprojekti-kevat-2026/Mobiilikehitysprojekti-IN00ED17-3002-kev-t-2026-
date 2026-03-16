import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IngredientService } from '../src/services/IngredientService';

describe('IngredientService', () => {
  it('parses structured analysis output from OpenAI', async () => {
    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            detectedIngredients: [
              {
                category: 'vegetable',
                confidence: 0.97,
                id: null,
                name: 'Tomato',
                quantity: '2 pcs',
              },
            ],
            suggestedRecipe: {
              cuisine: 'Mediterranean',
              difficulty: 'easy',
              id: 'recipe-1',
              ingredients: [
                {
                  category: 'vegetable',
                  confidence: 1,
                  id: null,
                  name: 'Tomato',
                  quantity: '2 pcs',
                },
              ],
              nutritionEstimate: {
                calories: 220,
                carbsG: 12,
                fatG: 8,
                proteinG: 10,
              },
              servings: 2,
              steps: [
                {
                  durationSeconds: null,
                  instruction: 'Chop the tomatoes.',
                  stepNumber: 1,
                  tip: null,
                },
              ],
              title: 'Tomato Salad',
              totalTimeMinutes: 10,
            },
          }),
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    const result = await service.analyzeImage({
      imageBase64: 'abc123',
      locale: 'en',
      mimeType: 'image/jpeg',
    });

    assert.equal(result.detectedIngredients[0]?.name, 'Tomato');
    assert.equal(result.suggestedRecipe.title, 'Tomato Salad');
  });

  it('generates daily recipe feed items', async () => {
    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            items: [
              {
                cuisine: 'Mediterranean',
                difficulty: 'easy',
                id: 'daily-1',
                ingredients: [
                  {
                    category: 'vegetable',
                    confidence: 1,
                    id: null,
                    name: 'Tomato',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 200,
                  carbsG: 18,
                  fatG: 7,
                  proteinG: 6,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: null,
                    instruction: 'Mix ingredients.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Fresh Tomato Bowl',
                totalTimeMinutes: 10,
              },
              {
                cuisine: 'Italian',
                difficulty: 'medium',
                id: 'daily-2',
                ingredients: [
                  {
                    category: 'grain',
                    confidence: 1,
                    id: null,
                    name: 'Pasta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 420,
                  carbsG: 65,
                  fatG: 10,
                  proteinG: 14,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 600,
                    instruction: 'Boil pasta.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Simple Pasta',
                totalTimeMinutes: 18,
              },
              {
                cuisine: 'Turkish',
                difficulty: 'easy',
                id: 'daily-3',
                ingredients: [
                  {
                    category: 'protein',
                    confidence: 1,
                    id: null,
                    name: 'Egg',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 160,
                  carbsG: 2,
                  fatG: 11,
                  proteinG: 12,
                },
                servings: 1,
                steps: [
                  {
                    durationSeconds: 300,
                    instruction: 'Cook the eggs.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Egg Pan',
                totalTimeMinutes: 8,
              },
              {
                cuisine: 'Greek',
                difficulty: 'easy',
                id: 'daily-4',
                ingredients: [
                  {
                    category: 'dairy',
                    confidence: 1,
                    id: null,
                    name: 'Feta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 210,
                  carbsG: 11,
                  fatG: 13,
                  proteinG: 9,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 120,
                    instruction: 'Crumble feta over the salad.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Feta Salad',
                totalTimeMinutes: 7,
              },
            ],
          }),
          usage: { input_tokens: 12, output_tokens: 40 },
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    const result = await service.generateDailyRecipes({
      date: '2026-03-12',
      ingredients: ['tomato', 'egg'],
      locale: 'en',
      slotStart: '2026-03-12T10:00:00.000Z',
    });

    assert.equal(result.generatedFor, '2026-03-12');
    assert.equal(result.items.length, 12);
    assert.equal(result.items[0]?.recipe.title, 'Fresh Tomato Bowl');
    assert.equal(result.items[3]?.recipe.title, 'Feta Salad');
    assert.equal(result.slotStart, '2026-03-12T10:00:00.000Z');
    assert.equal(result.slotEndsAt, '2026-03-12T10:30:00.000Z');
  });

  it('returns the rotating fallback feed when OpenAI is unavailable', async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const service = new IngredientService({
      model: 'gpt-4o',
    });

    try {
      const result = await service.generateDailyRecipes({
        date: '2026-03-12',
        ingredients: ['egg'],
        locale: 'fi',
        slotStart: '2026-03-12T10:00:00.000Z',
      });

      assert.equal(result.generatedFor, '2026-03-12');
      assert.equal(result.items.length, 12);
      assert.match(result.items[0]?.recipe.id ?? '', /^catalog-/);
    } finally {
      if (previousApiKey) {
        process.env.OPENAI_API_KEY = previousApiKey;
      }
    }
  });

  it('prefers the closest matching Pexels photo for daily recipes', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'restaurant table with people and menus',
              src: {
                large: 'https://images.example.com/wrong.jpg',
              },
            },
            {
              alt: 'fresh tomato bowl plated mediterranean dish',
              src: {
                large: 'https://images.example.com/right.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );

    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            items: [
              {
                cuisine: 'Mediterranean',
                difficulty: 'easy',
                id: 'daily-1',
                ingredients: [
                  {
                    category: 'vegetable',
                    confidence: 1,
                    id: null,
                    name: 'Tomato',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 200,
                  carbsG: 18,
                  fatG: 7,
                  proteinG: 6,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: null,
                    instruction: 'Mix ingredients.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Fresh Tomato Bowl',
                totalTimeMinutes: 10,
              },
              {
                cuisine: 'Italian',
                difficulty: 'medium',
                id: 'daily-2',
                ingredients: [
                  {
                    category: 'grain',
                    confidence: 1,
                    id: null,
                    name: 'Pasta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 420,
                  carbsG: 65,
                  fatG: 10,
                  proteinG: 14,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 600,
                    instruction: 'Boil pasta.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Simple Pasta',
                totalTimeMinutes: 18,
              },
              {
                cuisine: 'Turkish',
                difficulty: 'easy',
                id: 'daily-3',
                ingredients: [
                  {
                    category: 'protein',
                    confidence: 1,
                    id: null,
                    name: 'Egg',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 160,
                  carbsG: 2,
                  fatG: 11,
                  proteinG: 12,
                },
                servings: 1,
                steps: [
                  {
                    durationSeconds: 300,
                    instruction: 'Cook the eggs.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Egg Pan',
                totalTimeMinutes: 8,
              },
              {
                cuisine: 'Greek',
                difficulty: 'easy',
                id: 'daily-4',
                ingredients: [
                  {
                    category: 'dairy',
                    confidence: 1,
                    id: null,
                    name: 'Feta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 210,
                  carbsG: 11,
                  fatG: 13,
                  proteinG: 9,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 120,
                    instruction: 'Crumble feta over the salad.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Feta Salad',
                totalTimeMinutes: 7,
              },
            ],
          }),
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    try {
      const result = await service.generateDailyRecipes({
        date: '2026-03-12',
        ingredients: ['tomato'],
        locale: 'en',
        slotStart: '2026-03-12T10:00:00.000Z',
      });

      assert.equal(result.items[0]?.image?.url, 'https://images.example.com/right.jpg');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('skips recipe photos when stock results do not match the dish closely enough', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'people sharing menus at a restaurant table',
              src: {
                large: 'https://images.example.com/wrong-1.jpg',
              },
            },
            {
              alt: 'chef hands plating appetizers in a kitchen',
              src: {
                large: 'https://images.example.com/wrong-2.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );

    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            items: [
              {
                cuisine: 'Mediterranean',
                difficulty: 'easy',
                id: 'daily-1',
                ingredients: [
                  {
                    category: 'vegetable',
                    confidence: 1,
                    id: null,
                    name: 'Tomato',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 200,
                  carbsG: 18,
                  fatG: 7,
                  proteinG: 6,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: null,
                    instruction: 'Mix ingredients.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Fresh Tomato Bowl',
                totalTimeMinutes: 10,
              },
              {
                cuisine: 'Italian',
                difficulty: 'medium',
                id: 'daily-2',
                ingredients: [
                  {
                    category: 'grain',
                    confidence: 1,
                    id: null,
                    name: 'Pasta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 420,
                  carbsG: 65,
                  fatG: 10,
                  proteinG: 14,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 600,
                    instruction: 'Boil pasta.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Simple Pasta',
                totalTimeMinutes: 18,
              },
              {
                cuisine: 'Turkish',
                difficulty: 'easy',
                id: 'daily-3',
                ingredients: [
                  {
                    category: 'protein',
                    confidence: 1,
                    id: null,
                    name: 'Egg',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 160,
                  carbsG: 2,
                  fatG: 11,
                  proteinG: 12,
                },
                servings: 1,
                steps: [
                  {
                    durationSeconds: 300,
                    instruction: 'Cook the eggs.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Egg Pan',
                totalTimeMinutes: 8,
              },
              {
                cuisine: 'Greek',
                difficulty: 'easy',
                id: 'daily-4',
                ingredients: [
                  {
                    category: 'dairy',
                    confidence: 1,
                    id: null,
                    name: 'Feta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 210,
                  carbsG: 11,
                  fatG: 13,
                  proteinG: 9,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 120,
                    instruction: 'Crumble feta over the salad.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Feta Salad',
                totalTimeMinutes: 7,
              },
            ],
          }),
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    try {
      const result = await service.generateDailyRecipes({
        date: '2026-03-12',
        ingredients: ['tomato'],
        locale: 'en',
        slotStart: '2026-03-12T10:00:00.000Z',
      });

      assert.equal(result.items[0]?.image, null);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('falls back to a strong ingredient photo when a dish photo is unavailable', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const query = new URL(url).searchParams.get('query')?.toLowerCase() ?? '';

      if (query.includes('avocado')) {
        return new Response(
          JSON.stringify({
            photos: [
              {
                alt: 'fresh avocado ingredient food',
                src: {
                  large: 'https://images.example.com/avocado.jpg',
                },
              },
            ],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        );
      }

      return new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'people sharing menus at a restaurant table',
              src: {
                large: 'https://images.example.com/wrong-1.jpg',
              },
            },
            {
              alt: 'chef hands plating appetizers in a kitchen',
              src: {
                large: 'https://images.example.com/wrong-2.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    };

    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            items: [
              {
                cuisine: 'Spanish',
                difficulty: 'easy',
                id: 'daily-1',
                ingredients: [
                  {
                    category: 'protein',
                    confidence: 1,
                    id: null,
                    name: 'Bean',
                    quantity: null,
                  },
                  {
                    category: 'fruit',
                    confidence: 1,
                    id: null,
                    name: 'Avocado',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 340,
                  carbsG: 34,
                  fatG: 16,
                  proteinG: 12,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 420,
                    instruction: 'Warm the filling and wrap everything together.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Bean and Avocado Wrap',
                totalTimeMinutes: 14,
              },
              {
                cuisine: 'Italian',
                difficulty: 'medium',
                id: 'daily-2',
                ingredients: [
                  {
                    category: 'grain',
                    confidence: 1,
                    id: null,
                    name: 'Pasta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 420,
                  carbsG: 65,
                  fatG: 10,
                  proteinG: 14,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 600,
                    instruction: 'Boil pasta.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Simple Pasta',
                totalTimeMinutes: 18,
              },
              {
                cuisine: 'Turkish',
                difficulty: 'easy',
                id: 'daily-3',
                ingredients: [
                  {
                    category: 'protein',
                    confidence: 1,
                    id: null,
                    name: 'Egg',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 160,
                  carbsG: 2,
                  fatG: 11,
                  proteinG: 12,
                },
                servings: 1,
                steps: [
                  {
                    durationSeconds: 300,
                    instruction: 'Cook the eggs.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Egg Pan',
                totalTimeMinutes: 8,
              },
              {
                cuisine: 'Greek',
                difficulty: 'easy',
                id: 'daily-4',
                ingredients: [
                  {
                    category: 'dairy',
                    confidence: 1,
                    id: null,
                    name: 'Feta',
                    quantity: null,
                  },
                ],
                nutritionEstimate: {
                  calories: 210,
                  carbsG: 11,
                  fatG: 13,
                  proteinG: 9,
                },
                servings: 2,
                steps: [
                  {
                    durationSeconds: 120,
                    instruction: 'Crumble feta over the salad.',
                    stepNumber: 1,
                    tip: null,
                  },
                ],
                title: 'Feta Salad',
                totalTimeMinutes: 7,
              },
            ],
          }),
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    try {
      const result = await service.generateDailyRecipes({
        date: '2026-03-12',
        ingredients: ['avocado'],
        locale: 'en',
        slotStart: '2026-03-12T10:00:00.000Z',
      });

      assert.equal(result.items[0]?.image?.url, 'https://images.example.com/avocado.jpg');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('accepts a shakshuka dish photo instead of falling back to egg imagery', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'shakshuka in skillet with tomato sauce',
              src: {
                large: 'https://images.example.com/shakshuka.jpg',
              },
            },
            {
              alt: 'fried egg breakfast plate',
              src: {
                large: 'https://images.example.com/egg.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );

    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            suggestions: [
              {
                fitLabel: 'Best match',
                recipe: {
                  cuisine: 'Middle Eastern',
                  difficulty: 'easy',
                  id: 'ask-1',
                  ingredients: [
                    {
                      category: 'protein',
                      confidence: 1,
                      id: null,
                      name: 'Egg',
                      quantity: null,
                    },
                    {
                      category: 'vegetable',
                      confidence: 1,
                      id: null,
                      name: 'Tomato',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 280,
                    carbsG: 12,
                    fatG: 18,
                    proteinG: 16,
                  },
                  servings: 2,
                  steps: [
                    {
                      durationSeconds: 900,
                      instruction: 'Simmer the sauce and poach the eggs.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Kiler Shakshuka',
                  totalTimeMinutes: 18,
                },
                summary: 'Rich tomato skillet with eggs.',
              },
              {
                fitLabel: 'Backup',
                recipe: {
                  cuisine: 'Italian',
                  difficulty: 'easy',
                  id: 'ask-2',
                  ingredients: [
                    {
                      category: 'grain',
                      confidence: 1,
                      id: null,
                      name: 'Pasta',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 200,
                    carbsG: 20,
                    fatG: 7,
                    proteinG: 8,
                  },
                  servings: 1,
                  steps: [
                    {
                      durationSeconds: 600,
                      instruction: 'Cook.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Pasta',
                  totalTimeMinutes: 12,
                },
                summary: 'Simple pasta.',
              },
              {
                fitLabel: 'Backup',
                recipe: {
                  cuisine: 'Greek',
                  difficulty: 'easy',
                  id: 'ask-3',
                  ingredients: [
                    {
                      category: 'vegetable',
                      confidence: 1,
                      id: null,
                      name: 'Cucumber',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 200,
                    carbsG: 20,
                    fatG: 7,
                    proteinG: 8,
                  },
                  servings: 1,
                  steps: [
                    {
                      durationSeconds: 600,
                      instruction: 'Cook.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Salad',
                  totalTimeMinutes: 12,
                },
                summary: 'Simple salad.',
              },
            ],
          }),
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    try {
      const result = await service.askFridge({
        locale: 'en',
        pantryIngredients: ['egg', 'tomato'],
        prompt: 'Use my pantry',
      });

      assert.equal(result.suggestions[0]?.image?.url, 'https://images.example.com/shakshuka.jpg');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('prefers a more distinctive fallback ingredient photo over egg for tortilla-style dishes', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const query = new URL(url).searchParams.get('query')?.toLowerCase() ?? '';

      if (query.includes('potato')) {
        return new Response(
          JSON.stringify({
            photos: [
              {
                alt: 'crispy potato tortilla plated dish',
                src: {
                  large: 'https://images.example.com/potato-tortilla.jpg',
                },
              },
            ],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        );
      }

      if (query.includes('egg')) {
        return new Response(
          JSON.stringify({
            photos: [
              {
                alt: 'fried egg breakfast plate',
                src: {
                  large: 'https://images.example.com/egg.jpg',
                },
              },
            ],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        );
      }

      return new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'restaurant menu on a table',
              src: {
                large: 'https://images.example.com/wrong.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    };

    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            suggestions: [
              {
                fitLabel: 'Best match',
                recipe: {
                  cuisine: 'Spanish',
                  difficulty: 'easy',
                  id: 'ask-tortilla-1',
                  ingredients: [
                    {
                      category: 'protein',
                      confidence: 1,
                      id: null,
                      name: 'Egg',
                      quantity: null,
                    },
                    {
                      category: 'vegetable',
                      confidence: 1,
                      id: null,
                      name: 'Potato',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 310,
                    carbsG: 20,
                    fatG: 18,
                    proteinG: 14,
                  },
                  servings: 2,
                  steps: [
                    {
                      durationSeconds: 900,
                      instruction: 'Cook gently and flip when set.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Quick Spanish Tortilla',
                  totalTimeMinutes: 18,
                },
                summary: 'Golden tortilla with potato.',
              },
              {
                fitLabel: 'Backup',
                recipe: {
                  cuisine: 'Italian',
                  difficulty: 'easy',
                  id: 'ask-4',
                  ingredients: [
                    {
                      category: 'grain',
                      confidence: 1,
                      id: null,
                      name: 'Pasta',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 200,
                    carbsG: 20,
                    fatG: 7,
                    proteinG: 8,
                  },
                  servings: 1,
                  steps: [
                    {
                      durationSeconds: 600,
                      instruction: 'Cook.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Pasta',
                  totalTimeMinutes: 12,
                },
                summary: 'Simple pasta.',
              },
              {
                fitLabel: 'Backup',
                recipe: {
                  cuisine: 'Greek',
                  difficulty: 'easy',
                  id: 'ask-5',
                  ingredients: [
                    {
                      category: 'vegetable',
                      confidence: 1,
                      id: null,
                      name: 'Cucumber',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 200,
                    carbsG: 20,
                    fatG: 7,
                    proteinG: 8,
                  },
                  servings: 1,
                  steps: [
                    {
                      durationSeconds: 600,
                      instruction: 'Cook.',
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: 'Salad',
                  totalTimeMinutes: 12,
                },
                summary: 'Simple salad.',
              },
            ],
          }),
        }),
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    try {
      const result = await service.askFridge({
        locale: 'en',
        pantryIngredients: ['egg', 'potato'],
        prompt: 'Use my pantry',
      });

      assert.equal(result.suggestions[0]?.image?.url, 'https://images.example.com/potato-tortilla.jpg');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('caches ingredient thumbnail lookups', async () => {
    const previousPexelsApiKey = process.env.PEXELS_API_KEY;
    const previousFetch = globalThis.fetch;
    let fetchCallCount = 0;
    process.env.PEXELS_API_KEY = 'pexels-test-key';

    globalThis.fetch = async () => {
      fetchCallCount += 1;

      return new Response(
        JSON.stringify({
          photos: [
            {
              alt: 'vegetable basket',
              src: {
                medium: 'https://images.example.com/basket.jpg',
              },
            },
            {
              alt: 'fresh tomato ingredient food',
              src: {
                medium: 'https://images.example.com/tomato.jpg',
              },
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    };

    const service = new IngredientService({
      model: 'gpt-4o',
    });

    try {
      const firstResult = await service.getIngredientImages({
        locale: 'en',
        names: ['Tomato'],
      });
      const secondResult = await service.getIngredientImages({
        locale: 'en',
        names: ['Tomato'],
      });

      assert.equal(firstResult.items[0]?.image?.url, 'https://images.example.com/tomato.jpg');
      assert.equal(secondResult.items[0]?.image?.url, 'https://images.example.com/tomato.jpg');
      assert.equal(fetchCallCount, 1);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousPexelsApiKey) {
        process.env.PEXELS_API_KEY = previousPexelsApiKey;
      } else {
        delete process.env.PEXELS_API_KEY;
      }
    }
  });

  it('rotates recipe slots every 30 minutes and prewarms the next slot', async () => {
    let callCount = 0;
    const fakeClient = {
      responses: {
        create: async () => {
          callCount += 1;

          return {
            output_text: JSON.stringify({
              items: [
                {
                  cuisine: 'Mediterranean',
                  difficulty: 'easy',
                  id: `daily-${callCount}-1`,
                  ingredients: [
                    {
                      category: 'vegetable',
                      confidence: 1,
                      id: null,
                      name: 'Tomato',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 200,
                    carbsG: 18,
                    fatG: 7,
                    proteinG: 6,
                  },
                  servings: 2,
                  steps: [
                    {
                      durationSeconds: null,
                      instruction: `Mix ingredients for batch ${callCount}.`,
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: `Fresh Tomato Bowl ${callCount}`,
                  totalTimeMinutes: 10,
                },
                {
                  cuisine: 'Italian',
                  difficulty: 'medium',
                  id: `daily-${callCount}-2`,
                  ingredients: [
                    {
                      category: 'grain',
                      confidence: 1,
                      id: null,
                      name: 'Pasta',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 420,
                    carbsG: 65,
                    fatG: 10,
                    proteinG: 14,
                  },
                  servings: 2,
                  steps: [
                    {
                      durationSeconds: 600,
                      instruction: `Boil pasta for batch ${callCount}.`,
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: `Simple Pasta ${callCount}`,
                  totalTimeMinutes: 18,
                },
                {
                  cuisine: 'Turkish',
                  difficulty: 'easy',
                  id: `daily-${callCount}-3`,
                  ingredients: [
                    {
                      category: 'protein',
                      confidence: 1,
                      id: null,
                      name: 'Egg',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 160,
                    carbsG: 2,
                    fatG: 11,
                    proteinG: 12,
                  },
                  servings: 1,
                  steps: [
                    {
                      durationSeconds: 300,
                      instruction: `Cook eggs for batch ${callCount}.`,
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: `Egg Pan ${callCount}`,
                  totalTimeMinutes: 8,
                },
                {
                  cuisine: 'Greek',
                  difficulty: 'easy',
                  id: `daily-${callCount}-4`,
                  ingredients: [
                    {
                      category: 'dairy',
                      confidence: 1,
                      id: null,
                      name: 'Feta',
                      quantity: null,
                    },
                  ],
                  nutritionEstimate: {
                    calories: 210,
                    carbsG: 11,
                    fatG: 13,
                    proteinG: 9,
                  },
                  servings: 2,
                  steps: [
                    {
                      durationSeconds: 120,
                      instruction: `Crumble feta for batch ${callCount}.`,
                      stepNumber: 1,
                      tip: null,
                    },
                  ],
                  title: `Feta Salad ${callCount}`,
                  totalTimeMinutes: 7,
                },
              ],
            }),
          };
        },
      },
    };

    const service = new IngredientService({
      client: fakeClient,
      model: 'gpt-4o',
    });

    const currentSlot = await service.generateDailyRecipes({
      ingredients: ['tomato'],
      locale: 'en',
      slotStart: '2026-03-12T10:00:00.000Z',
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    assert.equal(callCount, 2);

    const nextSlot = await service.generateDailyRecipes({
      ingredients: ['tomato'],
      locale: 'en',
      slotStart: '2026-03-12T10:30:00.000Z',
    });

    assert.equal(currentSlot.slotStart, '2026-03-12T10:00:00.000Z');
    assert.equal(nextSlot.slotStart, '2026-03-12T10:30:00.000Z');
    assert.notEqual(currentSlot.items[0]?.recipe.title, nextSlot.items[0]?.recipe.title);
    assert.ok(callCount >= 2);
  });
});
