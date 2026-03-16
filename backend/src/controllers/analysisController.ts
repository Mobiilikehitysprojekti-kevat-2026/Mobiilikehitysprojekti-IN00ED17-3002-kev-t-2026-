import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import { HttpError } from '../middleware/errorHandler';
import {
  askFridgeInputSchema,
  analyzeInputSchema,
  dailyRecipesInputSchema,
  ingredientImagesInputSchema,
  localeSchema,
} from '../types/api';
import type { IngredientService } from '../services/IngredientService';

export function createAnalysisController(ingredientService: IngredientService) {
  return {
    analyze: async (request: Request, response: Response) => {
      const startedAt = Date.now();
      const localeFromMultipart = localeSchema
        .safeParse(typeof request.body?.locale === 'string' ? request.body.locale : 'en')
        .data;

      const parsedInput = request.file
        ? analyzeInputSchema.parse({
            imageBase64: request.file.buffer.toString('base64'),
            locale: localeFromMultipart ?? 'en',
            mimeType: request.file.mimetype,
          })
        : analyzeInputSchema.parse(request.body);

      if (!parsedInput.imageBase64) {
        throw new HttpError(400, 'INVALID_IMAGE', 'No image payload was provided.');
      }

      const analysis = await ingredientService.analyzeImage(parsedInput);

      response.json({
        detectedIngredients: analysis.detectedIngredients,
        processingTimeMs: Date.now() - startedAt,
        requestId: randomUUID(),
        suggestedRecipe: analysis.suggestedRecipe,
      });
    },
    dailyRecipes: async (request: Request, response: Response) => {
      const locale = localeSchema
        .safeParse(typeof request.query.locale === 'string' ? request.query.locale : 'en')
        .data;
      const rawIngredients =
        typeof request.query.ingredients === 'string' ? request.query.ingredients : '';

      const parsedInput = dailyRecipesInputSchema.parse({
        date: typeof request.query.date === 'string' ? request.query.date : undefined,
        ingredients: rawIngredients
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        locale: locale ?? 'en',
        slotStart: typeof request.query.slotStart === 'string' ? request.query.slotStart : undefined,
      });

      const dailyRecipes = await ingredientService.generateDailyRecipes(parsedInput);
      response.json(dailyRecipes);
    },
    askFridge: async (request: Request, response: Response) => {
      const parsedInput = askFridgeInputSchema.parse(request.body);
      const askFridgeSuggestions = await ingredientService.askFridge(parsedInput);
      response.json(askFridgeSuggestions);
    },
    ingredientImages: async (request: Request, response: Response) => {
      const locale = localeSchema
        .safeParse(typeof request.query.locale === 'string' ? request.query.locale : 'en')
        .data;
      const rawNames = typeof request.query.names === 'string' ? request.query.names : '';

      const parsedInput = ingredientImagesInputSchema.parse({
        locale: locale ?? 'en',
        names: rawNames
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });

      const ingredientImages = await ingredientService.getIngredientImages(parsedInput);
      response.json(ingredientImages);
    },
  };
}
