/**
 * MSW handlers for training API.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createMockTrainingRun,
  generateMockMetricsHistory,
  mockRunStore,
  mockMetricsStore,
} from '../data/training';
import { TRAINING } from '@/lib/api/endpoints';

export const trainingHandlers = [
  // List runs
  http.get(TRAINING.RUNS, async () => {
    await delay(100);

    const runs = Array.from(mockRunStore.values());

    return HttpResponse.json({
      data: runs,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Create run
  http.post(TRAINING.RUNS, async ({ request }) => {
    await delay(200);

    const body = (await request.json()) as { config?: Record<string, unknown>; total_steps?: number };
    const run = createMockTrainingRun({
      config: body.config as unknown as Record<string, unknown>,
      total_steps: body.total_steps ?? 100000,
    });

    mockRunStore.set(run.id, run);
    mockMetricsStore.set(run.id, []);

    return HttpResponse.json(
      {
        data: run,
        meta: { request_id: crypto.randomUUID() },
      },
      { status: 201 }
    );
  }),

  // Get run
  http.get(`${TRAINING.RUNS}/:id`, async ({ params }) => {
    await delay(50);

    const run = mockRunStore.get(params.id as string);

    if (!run) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Run ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: run,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Start run
  http.post(`${TRAINING.RUNS}/:id/start`, async ({ params }) => {
    await delay(100);

    const run = mockRunStore.get(params.id as string);

    if (!run) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Run ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    if (run.status === 'training') {
      return HttpResponse.json(
        {
          error: 'conflict',
          message: 'Run is already training',
        },
        { status: 409 }
      );
    }

    run.status = 'training';
    run.start_time = new Date().toISOString();

    // Generate initial metrics
    const metrics = generateMockMetricsHistory(10000, 1000);
    mockMetricsStore.set(run.id, metrics);
    run.current_step = 10000;
    run.metrics_count = metrics.length;

    return HttpResponse.json({
      data: run,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Stop run
  http.post(`${TRAINING.RUNS}/:id/stop`, async ({ params }) => {
    await delay(100);

    const run = mockRunStore.get(params.id as string);

    if (!run) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Run ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    run.status = 'stopped';
    run.end_time = new Date().toISOString();

    return HttpResponse.json({
      data: run,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Delete run
  http.delete(`${TRAINING.RUNS}/:id`, async ({ params }) => {
    await delay(100);

    const existed = mockRunStore.delete(params.id as string);
    mockMetricsStore.delete(params.id as string);

    if (!existed) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Run ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Get metrics
  http.get(`${TRAINING.RUNS}/:id/metrics`, async ({ params, request }) => {
    await delay(50);

    const run = mockRunStore.get(params.id as string);

    if (!run) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Run ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);

    const allMetrics = mockMetricsStore.get(run.id) ?? [];
    const paginatedMetrics = allMetrics.slice(offset, offset + limit);

    const totalCount = allMetrics.length;
    const totalPages = Math.ceil(totalCount / limit);

    return HttpResponse.json({
      items: paginatedMetrics,
      pagination: {
        page: Math.floor(offset / limit),
        page_size: limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: offset + limit < totalCount,
        has_previous: offset > 0,
      },
    });
  }),
];
