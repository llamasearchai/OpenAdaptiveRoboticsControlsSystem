/**
 * MSW handlers for kinematics API.
 */

import { http, HttpResponse, delay } from 'msw';
import { KINEMATICS } from '@/lib/api/endpoints';
import { DEFAULT_JOINT_LIMITS } from '../data/robot';

export const kinematicsHandlers = [
  // Forward kinematics
  http.post(KINEMATICS.FK, async ({ request }) => {
    await delay(20);

    const body = (await request.json()) as { joint_angles?: number[] };
    const jointAngles = body.joint_angles;

    if (!jointAngles || jointAngles.length < 7) {
      return HttpResponse.json(
        {
          error: 'validation_error',
          message: 'joint_angles must have at least 7 elements',
        },
        { status: 400 }
      );
    }

    // Simplified FK - just mock end-effector position based on joint angles
    // In reality, this would use proper DH parameters
    const position: [number, number, number] = [
      0.5 + Math.sin(jointAngles[0] ?? 0) * 0.2,
      Math.sin(jointAngles[1] ?? 0) * 0.3,
      0.5 + Math.sin(jointAngles[3] ?? 0) * 0.2,
    ];

    const quaternion: [number, number, number, number] = [1, 0, 0, 0];

    const matrix = [
      [1, 0, 0, position[0]],
      [0, 1, 0, position[1]],
      [0, 0, 1, position[2]],
      [0, 0, 0, 1],
    ];

    return HttpResponse.json({
      data: {
        position,
        quaternion,
        matrix,
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Inverse kinematics
  http.post(KINEMATICS.IK, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as { target_position?: [number, number, number] };
    const targetPosition = body.target_position;

    if (!targetPosition || targetPosition.length !== 3) {
      return HttpResponse.json(
        {
          error: 'validation_error',
          message: 'target_position must have 3 elements',
        },
        { status: 400 }
      );
    }

    // Check if target is reachable (simplified)
    const distance = Math.sqrt(
      targetPosition[0] ** 2 + targetPosition[1] ** 2 + targetPosition[2] ** 2
    );

    if (distance > 1.2 || distance < 0.2) {
      return HttpResponse.json({
        data: {
          joint_angles: [0, 0, 0, -1.57, 0, 1.57, 0],
          converged: false,
          iterations: 100,
          error: 0.5,
        },
        meta: { request_id: crypto.randomUUID() },
      });
    }

    // Mock IK solution
    const jointAngles = [
      Math.atan2(targetPosition[1], targetPosition[0]),
      -0.5,
      0,
      -1.57,
      0,
      1.57 + Math.sin(targetPosition[2]),
      0,
    ];

    return HttpResponse.json({
      data: {
        joint_angles: jointAngles,
        converged: true,
        iterations: 12,
        error: 0.0001,
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Jacobian
  http.post(KINEMATICS.JACOBIAN, async ({ request }) => {
    await delay(30);

    const body = (await request.json()) as { joint_angles?: number[] };
    const jointAngles = body.joint_angles;

    if (!jointAngles || jointAngles.length < 7) {
      return HttpResponse.json(
        {
          error: 'validation_error',
          message: 'joint_angles must have at least 7 elements',
        },
        { status: 400 }
      );
    }

    // Mock 6x7 Jacobian matrix
    const jacobian = Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 7 }, (_, j) =>
        Math.cos((jointAngles[j] ?? 0) + i * 0.1) * 0.1
      )
    );

    return HttpResponse.json({
      data: {
        jacobian,
        condition_number: 5.2,
        shape: [6, 7],
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Joint limits
  http.get(KINEMATICS.JOINT_LIMITS, async () => {
    await delay(20);

    const joints = DEFAULT_JOINT_LIMITS.pos_min.map((min, i) => ({
      name: `joint_${i + 1}`,
      lower: min,
      upper: DEFAULT_JOINT_LIMITS.pos_max[i],
      velocity: DEFAULT_JOINT_LIMITS.vel_max[i],
      effort: DEFAULT_JOINT_LIMITS.torque_max[i],
    }));

    return HttpResponse.json({
      data: {
        joints,
        num_joints: 7,
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),

  // Check limits
  http.post(KINEMATICS.CHECK_LIMITS, async ({ request }) => {
    await delay(10);

    const body = (await request.json()) as { joint_angles: number[] };
    const jointAngles = body.joint_angles;

    const violations: Array<{
      joint_index: number;
      joint_name: string;
      current_value: number;
      limit: number;
      violation_type: 'lower' | 'upper';
    }> = [];

    jointAngles.forEach((angle, i) => {
      const minLimit = DEFAULT_JOINT_LIMITS.pos_min[i] ?? -Math.PI;
      const maxLimit = DEFAULT_JOINT_LIMITS.pos_max[i] ?? Math.PI;
      if (angle < minLimit) {
        violations.push({
          joint_index: i,
          joint_name: `joint_${i + 1}`,
          current_value: angle,
          limit: minLimit,
          violation_type: 'lower',
        });
      } else if (angle > maxLimit) {
        violations.push({
          joint_index: i,
          joint_name: `joint_${i + 1}`,
          current_value: angle,
          limit: maxLimit,
          violation_type: 'upper',
        });
      }
    });

    return HttpResponse.json({
      data: {
        valid: violations.length === 0,
        violations,
      },
      meta: { request_id: crypto.randomUUID() },
    });
  }),
];
