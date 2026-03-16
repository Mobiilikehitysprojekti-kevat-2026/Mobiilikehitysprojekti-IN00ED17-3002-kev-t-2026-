import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { createAnalysisRouter } from './routes/analysisRoutes';
import { createHealthRouter } from './routes/healthRoutes';
import { IngredientService } from './services/IngredientService';

export function createApp(options?: {
  enableRateLimit?: boolean;
  ingredientService?: IngredientService;
}) {
  const app = express();
  const ingredientService = options?.ingredientService ?? new IngredientService();

  app.use(cors());
  app.use(helmet());

  if (options?.enableRateLimit !== false) {
    app.use(
      rateLimit({
        limit: 10,
        standardHeaders: true,
        windowMs: 60 * 1000,
      }),
    );
  }

  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/v1', createHealthRouter());
  app.use('/api/v1', createAnalysisRouter(ingredientService));
  app.use(errorHandler);

  return app;
}
