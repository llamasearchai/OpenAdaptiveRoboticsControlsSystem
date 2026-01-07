/**
 * MSW handlers for simulation API.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createMockSimulationSession,
  createMockObservation,
  createMockSimulationState,
  createMockStepInfo,
  mockSessionStore,
} from '../data/simulation';
import { SIMULATION } from '@/lib/api/endpoints';

export const simulationHandlers = [
  // List sessions
  http.get(SIMULATION.SESSIONS, async () => {
    await delay(100);

    const sessions = Array.from(mockSessionStore.values());

    return HttpResponse.json({
      data: sessions,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Create session
  http.post(SIMULATION.SESSIONS, async ({ request }) => {
    await delay(200);

    const config = (await request.json()) as { task?: string; backend?: string };
    const session = createMockSimulationSession({
      task: (config.task ?? 'reach') as 'reach' | 'push' | 'pick_and_place' | 'insert' | 'custom',
      backend: (config.backend ?? 'mujoco') as 'mujoco' | 'isaac' | 'pybullet' | 'dummy',
    });

    mockSessionStore.set(session.id, session);

    return HttpResponse.json(
      {
        data: session,
        meta: { request_id: crypto.randomUUID() },
      },
      { status: 201 }
    );
  }),

  // Get session
  http.get(`${SIMULATION.SESSIONS}/:id`, async ({ params }) => {
    await delay(50);

    const session = mockSessionStore.get(params.id as string);

    if (!session) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: session,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Delete session
  http.delete(`${SIMULATION.SESSIONS}/:id`, async ({ params }) => {
    await delay(100);

    const existed = mockSessionStore.delete(params.id as string);

    if (!existed) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Step simulation
  http.post(`${SIMULATION.SESSIONS}/:id/step`, async ({ params, request }) => {
    await delay(10); // Simulate fast step

    const session = mockSessionStore.get(params.id as string);

    if (!session) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { action: number[] };
    const action = body.action;

    // Update session step
    session.current_step += 1;
    session.status = 'running';

    // Generate observation with some dynamics
    const observation = createMockObservation({
      joint_pos: action.map((a) => {
        const current = session.current_step > 1 ? a * 0.1 : 0;
        return current;
      }),
    });

    // Calculate reward (distance-based)
    const eePos = observation.ee_pos;
    const goalPos = observation.goal_pos ?? [0.6, 0.1, 0.4];
    const distance = Math.sqrt(
      (eePos[0] - goalPos[0]) ** 2 +
        (eePos[1] - goalPos[1]) ** 2 +
        (eePos[2] - goalPos[2]) ** 2
    );
    const reward = -distance;

    const terminated = distance < 0.05;
    const truncated = session.current_step >= 1000;

    const info = createMockStepInfo({
      success: terminated,
      is_success: terminated,
      distance_to_goal: distance,
    });

    return HttpResponse.json({
      data: {
        observation,
        reward,
        terminated,
        truncated,
        info,
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Reset simulation
  http.post(`${SIMULATION.SESSIONS}/:id/reset`, async ({ params }) => {
    await delay(50);

    const session = mockSessionStore.get(params.id as string);

    if (!session) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    session.current_step = 0;
    session.status = 'running';

    const observation = createMockObservation();

    return HttpResponse.json({
      data: observation,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Get state
  http.get(`${SIMULATION.SESSIONS}/:id/state`, async ({ params }) => {
    await delay(50);

    const session = mockSessionStore.get(params.id as string);

    if (!session) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    const state = createMockSimulationState({
      time: session.current_step * 0.01,
    });

    return HttpResponse.json({
      data: state,
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Get observation
  http.get(`${SIMULATION.SESSIONS}/:id/observation`, async ({ params }) => {
    await delay(50);

    const session = mockSessionStore.get(params.id as string);

    if (!session) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: `Session ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    const observation = createMockObservation();

    return HttpResponse.json({
      data: observation,
      meta: { request_id: crypto.randomUUID() },
    });
  }),
];
