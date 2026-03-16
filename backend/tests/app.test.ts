import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import { createApp } from '../src/app';
import type { IngredientService } from '../src/services/IngredientService';
import type { AnalyzeInput } from '../src/types/api';

describe('app', () => {
  it('returns health check response', async () => {
    const fakeService = {
      analyzeImage: async () => ({
        detectedIngredients: [],
        suggestedRecipe: {
          cuisine: 'Test',
          difficulty: 'easy',
          id: '1',
          ingredients: [],
          servings: 1,
          steps: [{ instruction: 'Test', stepNumber: 1 }],
          title: 'Recipe',
          totalTimeMinutes: 1,
        },
      }),
      getIngredientImages: async () => ({
        items: [],
      }),
      generateDailyRecipes: async () => ({
        generatedFor: '2026-03-12',
        items: [],
        slotEndsAt: '2026-03-12T10:30:00.000Z',
        slotStart: '2026-03-12T10:00:00.000Z',
      }),
      askFridge: async () => ({
        suggestions: [],
      }),
    } as unknown as IngredientService;

    const app = createApp({
      enableRateLimit: false,
      ingredientService: fakeService,
    });

    const server = app.listen(0);
    await once(server, 'listening');

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      const payload = (await response.json()) as { status: string };

      assert.equal(response.status, 200);
      assert.equal(payload.status, 'ok');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('accepts multipart analyze uploads', async () => {
    let receivedInput:
      | {
          imageBase64: string;
          locale: string;
          mimeType: string;
        }
      | undefined;

    const fakeService = {
      analyzeImage: async (input: AnalyzeInput) => {
        receivedInput = input;

        return {
          detectedIngredients: [
            {
              category: 'vegetable',
              confidence: 0.92,
              name: 'Tomato',
            },
          ],
          suggestedRecipe: {
            cuisine: 'Mediterranean',
            difficulty: 'easy',
            id: 'recipe-1',
            ingredients: [
              {
                category: 'vegetable',
                confidence: 0.92,
                name: 'Tomato',
              },
            ],
            servings: 2,
            steps: [{ instruction: 'Slice the tomato.', stepNumber: 1 }],
            title: 'Tomato Salad',
            totalTimeMinutes: 10,
          },
        };
      },
      getIngredientImages: async () => ({
        items: [],
      }),
      generateDailyRecipes: async () => ({
        generatedFor: '2026-03-12',
        items: [],
        slotEndsAt: '2026-03-12T10:30:00.000Z',
        slotStart: '2026-03-12T10:00:00.000Z',
      }),
      askFridge: async () => ({
        suggestions: [],
      }),
    } as unknown as IngredientService;

    const app = createApp({
      enableRateLimit: false,
      ingredientService: fakeService,
    });

    const server = app.listen(0);
    await once(server, 'listening');

    try {
      const port = (server.address() as AddressInfo).port;
      const body = new FormData();
      const imageBlob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' });

      body.append('locale', 'fi');
      body.append('image', imageBlob, 'ingredients.jpg');

      const response = await fetch(`http://127.0.0.1:${port}/api/v1/analyze`, {
        body,
        method: 'POST',
      });
      const payload = (await response.json()) as {
        detectedIngredients: Array<{ name: string }>;
      };

      assert.equal(response.status, 200);
      assert.equal(payload.detectedIngredients[0]?.name, 'Tomato');
      assert.equal(receivedInput?.locale, 'fi');
      assert.equal(receivedInput?.mimeType, 'image/jpeg');
      assert.ok(receivedInput?.imageBase64.length);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('returns daily recipes payload', async () => {
    const fakeService = {
      analyzeImage: async () => ({
        detectedIngredients: [],
        suggestedRecipe: {
          cuisine: 'Test',
          difficulty: 'easy',
          id: '1',
          ingredients: [],
          servings: 1,
          steps: [{ instruction: 'Test', stepNumber: 1 }],
          title: 'Recipe',
          totalTimeMinutes: 1,
        },
      }),
      getIngredientImages: async () => ({
        items: [
          {
            image: {
              url: 'https://images.example.com/tomato.jpg',
            },
            name: 'Tomato',
          },
        ],
      }),
      generateDailyRecipes: async () => ({
        generatedFor: '2026-03-12',
        items: [
          {
            image: {
              url: 'https://images.example.com/photo.jpg',
            },
            recipe: {
              cuisine: 'Mediterranean',
              difficulty: 'easy',
              id: 'daily-1',
              ingredients: [
                {
                  category: 'vegetable',
                  confidence: 1,
                  name: 'Tomato',
                },
              ],
              servings: 2,
              steps: [{ instruction: 'Slice it.', stepNumber: 1 }],
              title: 'Daily Salad',
              totalTimeMinutes: 10,
            },
          },
        ],
        slotEndsAt: '2026-03-12T10:30:00.000Z',
        slotStart: '2026-03-12T10:00:00.000Z',
      }),
      askFridge: async () => ({
        suggestions: [],
      }),
    } as unknown as IngredientService;

    const app = createApp({
      enableRateLimit: false,
      ingredientService: fakeService,
    });

    const server = app.listen(0);
    await once(server, 'listening');

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/daily-recipes?locale=en&date=2026-03-12`,
      );
      const payload = (await response.json()) as {
        generatedFor: string;
        items: Array<{ recipe: { title: string } }>;
        slotEndsAt: string;
        slotStart: string;
      };

      assert.equal(response.status, 200);
      assert.equal(payload.generatedFor, '2026-03-12');
      assert.equal(payload.items[0]?.recipe.title, 'Daily Salad');
      assert.equal(payload.slotStart, '2026-03-12T10:00:00.000Z');
      assert.equal(payload.slotEndsAt, '2026-03-12T10:30:00.000Z');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('returns ingredient image payload', async () => {
    const fakeService = {
      analyzeImage: async () => ({
        detectedIngredients: [],
        suggestedRecipe: {
          cuisine: 'Test',
          difficulty: 'easy',
          id: '1',
          ingredients: [],
          servings: 1,
          steps: [{ instruction: 'Test', stepNumber: 1 }],
          title: 'Recipe',
          totalTimeMinutes: 1,
        },
      }),
      getIngredientImages: async () => ({
        items: [
          {
            image: {
              url: 'https://images.example.com/tomato.jpg',
            },
            name: 'Tomato',
          },
        ],
      }),
      generateDailyRecipes: async () => ({
        generatedFor: '2026-03-12',
        items: [],
        slotEndsAt: '2026-03-12T10:30:00.000Z',
        slotStart: '2026-03-12T10:00:00.000Z',
      }),
      askFridge: async () => ({
        suggestions: [],
      }),
    } as unknown as IngredientService;

    const app = createApp({
      enableRateLimit: false,
      ingredientService: fakeService,
    });

    const server = app.listen(0);
    await once(server, 'listening');

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/ingredient-images?locale=en&names=Tomato`,
      );
      const payload = (await response.json()) as {
        items: Array<{ image?: { url: string } | null; name: string }>;
      };

      assert.equal(response.status, 200);
      assert.equal(payload.items[0]?.name, 'Tomato');
      assert.equal(payload.items[0]?.image?.url, 'https://images.example.com/tomato.jpg');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('returns ask fridge suggestion payload', async () => {
    const fakeService = {
      analyzeImage: async () => ({
        detectedIngredients: [],
        suggestedRecipe: {
          cuisine: 'Test',
          difficulty: 'easy',
          id: '1',
          ingredients: [],
          servings: 1,
          steps: [{ instruction: 'Test', stepNumber: 1 }],
          title: 'Recipe',
          totalTimeMinutes: 1,
        },
      }),
      getIngredientImages: async () => ({
        items: [],
      }),
      generateDailyRecipes: async () => ({
        generatedFor: '2026-03-12',
        items: [],
        slotEndsAt: '2026-03-12T10:30:00.000Z',
        slotStart: '2026-03-12T10:00:00.000Z',
      }),
      askFridge: async () => ({
        suggestions: [
          {
            fitLabel: 'Best match',
            image: {
              url: 'https://images.example.com/ask-fridge.jpg',
            },
            recipe: {
              cuisine: 'Mediterranean',
              difficulty: 'easy',
              id: 'ask-1',
              ingredients: [
                {
                  category: 'vegetable',
                  confidence: 1,
                  name: 'Tomato',
                },
              ],
              servings: 2,
              steps: [{ instruction: 'Slice it.', stepNumber: 1 }],
              title: 'Creamy Tomato Bowl',
              totalTimeMinutes: 12,
            },
            summary: 'A quick Mediterranean idea built around tomato.',
          },
        ],
      }),
    } as unknown as IngredientService;

    const app = createApp({
      enableRateLimit: false,
      ingredientService: fakeService,
    });

    const server = app.listen(0);
    await once(server, 'listening');

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/ask-fridge`, {
        body: JSON.stringify({
          locale: 'en',
          pantryIngredients: ['tomato', 'cream'],
          prompt: 'I want something creamy for dinner',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = (await response.json()) as {
        suggestions: Array<{ fitLabel: string; recipe: { title: string } }>;
      };

      assert.equal(response.status, 200);
      assert.equal(payload.suggestions[0]?.fitLabel, 'Best match');
      assert.equal(payload.suggestions[0]?.recipe.title, 'Creamy Tomato Bowl');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
