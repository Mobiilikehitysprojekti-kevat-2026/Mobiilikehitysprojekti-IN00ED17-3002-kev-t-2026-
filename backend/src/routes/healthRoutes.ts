import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  router.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  return router;
}
