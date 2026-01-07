/**
 * Mock data factories for training.
 */

import type {
  TrainingRun,
  TrainingMetrics,
  TrainingConfig,
  PPOConfig,
} from '@/types';

let runCounter = 0;

/** Generate a unique run ID */
export function generateRunId(): string {
  return `run-${++runCounter}-${Date.now().toString(36)}`;
}

/** Create mock PPO config */
export function createMockPPOConfig(overrides?: Partial<PPOConfig>): PPOConfig {
  return {
    learning_rate: 3e-4,
    gamma: 0.99,
    gae_lambda: 0.95,
    clip_range: 0.2,
    entropy_coef: 0.01,
    value_coef: 0.5,
    max_grad_norm: 0.5,
    n_steps: 2048,
    n_epochs: 10,
    batch_size: 64,
    normalize_advantage: true,
    ...overrides,
  };
}

/** Create mock training config */
export function createMockTrainingConfig(
  overrides?: Partial<TrainingConfig>
): TrainingConfig {
  return {
    algorithm: 'ppo',
    ppo: createMockPPOConfig(),
    ...overrides,
  };
}

/** Create mock training run */
export function createMockTrainingRun(
  overrides?: Partial<TrainingRun>
): TrainingRun {
  return {
    id: generateRunId(),
    config: createMockTrainingConfig() as unknown as Record<string, unknown>,
    status: 'pending',
    current_step: 0,
    total_steps: 100000,
    metrics_count: 0,
    ...overrides,
  };
}

/** Create mock training metrics */
export function createMockTrainingMetrics(
  step: number,
  overrides?: Partial<TrainingMetrics>
): TrainingMetrics {
  // Simulate learning curve
  const progress = step / 100000;
  const noise = () => (Math.random() - 0.5) * 0.1;

  return {
    step,
    policy_loss: 0.5 * (1 - progress) + noise(),
    value_loss: 0.3 * (1 - progress * 0.8) + noise(),
    kl: 0.02 * (1 + noise()),
    entropy: 1.5 * (1 - progress * 0.3) + noise(),
    explained_variance: 0.1 + progress * 0.7 + noise(),
    episode_reward: -50 + progress * 150 + (Math.random() - 0.5) * 20,
    episode_length: 100 + Math.floor(Math.random() * 50),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/** Generate metrics history */
export function generateMockMetricsHistory(
  totalSteps: number,
  interval: number = 1000
): TrainingMetrics[] {
  const metrics: TrainingMetrics[] = [];
  for (let step = 0; step <= totalSteps; step += interval) {
    metrics.push(createMockTrainingMetrics(step));
  }
  return metrics;
}

/** In-memory run store for mocks */
export const mockRunStore = new Map<string, TrainingRun>();
export const mockMetricsStore = new Map<string, TrainingMetrics[]>();

/** Reset mock stores */
export function resetMockTrainingStore(): void {
  mockRunStore.clear();
  mockMetricsStore.clear();
  runCounter = 0;
}
