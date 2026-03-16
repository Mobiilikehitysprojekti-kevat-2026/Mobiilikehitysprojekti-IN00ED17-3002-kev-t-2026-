import { Router } from 'express';

import type { IngredientService } from '../services/IngredientService';
import { createAnalysisController } from '../controllers/analysisController';
import { upload } from '../middleware/upload';

export function createAnalysisRouter(ingredientService: IngredientService) {
  const router = Router();
  const controller = createAnalysisController(ingredientService);

  router.get('/daily-recipes', controller.dailyRecipes);
  router.get('/ingredient-images', controller.ingredientImages);
  router.post('/analyze', upload.single('image'), controller.analyze);
  router.post('/ask-fridge', controller.askFridge);

  return router;
}
