/**
 * Combine all MSW handlers.
 */

import { http, HttpResponse, delay } from 'msw';
import { simulationHandlers } from './simulation';
import { trainingHandlers } from './training';
import { kinematicsHandlers } from './kinematics';
import { HEALTH } from '@/lib/api/endpoints';

// Health check handler
const healthHandler = http.get(HEALTH, async () => {
  await delay(50);

  return HttpResponse.json({
    status: 'healthy',
    version: '1.0.0',
  });
});

// Combine all handlers
export const handlers = [
  healthHandler,
  ...simulationHandlers,
  ...trainingHandlers,
  ...kinematicsHandlers,
];

export { simulationHandlers, trainingHandlers, kinematicsHandlers };
