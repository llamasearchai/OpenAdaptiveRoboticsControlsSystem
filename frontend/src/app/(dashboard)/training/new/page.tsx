'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Settings,
  Cpu,
  Target,
  CheckCircle2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Slider,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { useCreateTrainingRun, useStartTrainingRun } from '@/hooks/queries';

// Validation schema for training configuration
const trainingConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  algorithm: z.enum(['ppo', 'sac', 'td3', 'ddpg']),
  task: z.enum(['reach', 'push', 'pick', 'place']),
  backend: z.enum(['mujoco', 'isaac', 'pybullet', 'dummy']),
  device: z.enum(['cpu', 'cuda']),
  totalSteps: z.number().min(1000).max(100000000),
  numEnvs: z.number().min(1).max(4096),
  // PPO-specific
  learningRate: z.number().gt(0).lte(1),
  batchSize: z.number().min(1).max(8192),
  clipRatio: z.number().gt(0).lt(1),
  gamma: z.number().gt(0).lte(1),
  gaeLambda: z.number().gte(0).lte(1),
  entropyCoef: z.number().gte(0),
  vfCoef: z.number().gt(0),
  updateEpochs: z.number().min(1).max(100),
  // Logging
  logInterval: z.number().min(1),
  checkpointInterval: z.number().min(1).nullable(),
});

type TrainingConfig = z.infer<typeof trainingConfigSchema>;

const defaultConfig: TrainingConfig = {
  name: '',
  algorithm: 'ppo',
  task: 'reach',
  backend: 'mujoco',
  device: 'cuda',
  totalSteps: 1000000,
  numEnvs: 64,
  learningRate: 3e-4,
  batchSize: 2048,
  clipRatio: 0.2,
  gamma: 0.99,
  gaeLambda: 0.95,
  entropyCoef: 0.01,
  vfCoef: 0.5,
  updateEpochs: 10,
  logInterval: 100,
  checkpointInterval: 100000,
};

type Step = 'basic' | 'algorithm' | 'environment' | 'review';

export default function NewTrainingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [autoStart, setAutoStart] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<TrainingConfig>({
    resolver: zodResolver(trainingConfigSchema),
    defaultValues: defaultConfig,
    mode: 'onChange',
  });

  const createTrainingRun = useCreateTrainingRun();
  const startTrainingRun = useStartTrainingRun();

  const config = watch();

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'basic', label: 'Basic', icon: Settings },
    { id: 'algorithm', label: 'Algorithm', icon: Cpu },
    { id: 'environment', label: 'Environment', icon: Target },
    { id: 'review', label: 'Review', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    const nextStep = steps[nextIndex];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    const prevStep = steps[prevIndex];
    if (prevStep) {
      setCurrentStep(prevStep.id);
    }
  };

  const onSubmit = async (data: TrainingConfig) => {
    try {
      // Create the training run
      const run = await createTrainingRun.mutateAsync({
        config: {
          algorithm: data.algorithm,
          device: data.device,
          ppo: {
            learning_rate: data.learningRate,
            batch_size: data.batchSize,
            clip_range: data.clipRatio,
            gamma: data.gamma,
            gae_lambda: data.gaeLambda,
            entropy_coef: data.entropyCoef,
            value_coef: data.vfCoef,
            n_epochs: data.updateEpochs,
            n_steps: 2048,
            max_grad_norm: 0.5,
            normalize_advantage: true,
          },
        },
        total_steps: data.totalSteps,
        experiment_name: data.name,
        tags: [data.task, data.backend],
      });

      // Start the training if autoStart is enabled
      if (autoStart) {
        await startTrainingRun.mutateAsync(run.id);
      }

      // Navigate to the training run details page
      router.push(`/training/${run.id}`);
    } catch (error) {
      console.error('Failed to create training run:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/training">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to training</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Training Run</h1>
          <p className="text-muted-foreground">
            Configure and start a new training experiment
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step: Basic */}
        {currentStep === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Set up the basic parameters for your training run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Run Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., PPO-Reach-v1"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="algorithm">Algorithm</Label>
                  <Select
                    value={config.algorithm}
                    onValueChange={(value) =>
                      setValue('algorithm', value as TrainingConfig['algorithm'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ppo">PPO (Proximal Policy Optimization)</SelectItem>
                      <SelectItem value="sac">SAC (Soft Actor-Critic)</SelectItem>
                      <SelectItem value="td3">TD3 (Twin Delayed DDPG)</SelectItem>
                      <SelectItem value="ddpg">DDPG (Deep Deterministic PG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task">Task</Label>
                  <Select
                    value={config.task}
                    onValueChange={(value) =>
                      setValue('task', value as TrainingConfig['task'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reach">Reach</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                      <SelectItem value="pick">Pick</SelectItem>
                      <SelectItem value="place">Place</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total Steps</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[Math.log10(config.totalSteps)]}
                    min={3}
                    max={8}
                    step={0.1}
                    onValueChange={([value]) =>
                      value !== undefined && setValue('totalSteps', Math.round(Math.pow(10, value)))
                    }
                    className="flex-1"
                  />
                  <span className="font-mono text-sm w-20 text-right">
                    {config.totalSteps >= 1000000
                      ? `${(config.totalSteps / 1000000).toFixed(1)}M`
                      : `${(config.totalSteps / 1000).toFixed(0)}K`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Algorithm */}
        {currentStep === 'algorithm' && (
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Parameters</CardTitle>
              <CardDescription>
                Configure {config.algorithm.toUpperCase()} hyperparameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Learning Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      {...register('learningRate', { valueAsNumber: true })}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select
                    value={String(config.batchSize)}
                    onValueChange={(value) =>
                      setValue('batchSize', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[256, 512, 1024, 2048, 4096, 8192].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discount Factor (Gamma)</Label>
                  <Slider
                    value={[config.gamma]}
                    min={0.9}
                    max={0.999}
                    step={0.001}
                    onValueChange={([value]) => value !== undefined && setValue('gamma', value)}
                  />
                  <span className="text-sm font-mono">{config.gamma.toFixed(3)}</span>
                </div>

                <div className="space-y-2">
                  <Label>GAE Lambda</Label>
                  <Slider
                    value={[config.gaeLambda]}
                    min={0.9}
                    max={1}
                    step={0.01}
                    onValueChange={([value]) => value !== undefined && setValue('gaeLambda', value)}
                  />
                  <span className="text-sm font-mono">{config.gaeLambda.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Clip Ratio</Label>
                  <Slider
                    value={[config.clipRatio]}
                    min={0.1}
                    max={0.4}
                    step={0.05}
                    onValueChange={([value]) => value !== undefined && setValue('clipRatio', value)}
                  />
                  <span className="text-sm font-mono">{config.clipRatio.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Entropy Coefficient</Label>
                  <Slider
                    value={[config.entropyCoef]}
                    min={0}
                    max={0.1}
                    step={0.001}
                    onValueChange={([value]) => value !== undefined && setValue('entropyCoef', value)}
                  />
                  <span className="text-sm font-mono">{config.entropyCoef.toFixed(3)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Value Function Coefficient</Label>
                  <Slider
                    value={[config.vfCoef]}
                    min={0.1}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => value !== undefined && setValue('vfCoef', value)}
                  />
                  <span className="text-sm font-mono">{config.vfCoef.toFixed(1)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Update Epochs</Label>
                  <Select
                    value={String(config.updateEpochs)}
                    onValueChange={(value) =>
                      setValue('updateEpochs', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 4, 5, 10, 15, 20].map((epochs) => (
                        <SelectItem key={epochs} value={String(epochs)}>
                          {epochs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Environment */}
        {currentStep === 'environment' && (
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>
                Configure the simulation environment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Simulation Backend</Label>
                  <Select
                    value={config.backend}
                    onValueChange={(value) =>
                      setValue('backend', value as TrainingConfig['backend'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mujoco">MuJoCo</SelectItem>
                      <SelectItem value="isaac">IsaacGym</SelectItem>
                      <SelectItem value="pybullet">PyBullet</SelectItem>
                      <SelectItem value="dummy">Dummy (Testing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device</Label>
                  <Select
                    value={config.device}
                    onValueChange={(value) =>
                      setValue('device', value as TrainingConfig['device'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuda">CUDA (GPU)</SelectItem>
                      <SelectItem value="cpu">CPU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Environments</Label>
                  <Select
                    value={String(config.numEnvs)}
                    onValueChange={(value) => setValue('numEnvs', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 4, 16, 32, 64, 128, 256, 512, 1024].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Log Interval</Label>
                  <Input
                    type="number"
                    {...register('logInterval', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Checkpoint Interval</Label>
                  <Input
                    type="number"
                    {...register('checkpointInterval', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle>Review Configuration</CardTitle>
              <CardDescription>
                Review your training configuration before starting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-lg">{config.name || 'Unnamed Run'}</span>
                  <Badge>{config.algorithm.toUpperCase()}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Task</span>
                    <p className="font-medium capitalize">{config.task}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Backend</span>
                    <p className="font-medium capitalize">{config.backend}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Device</span>
                    <p className="font-medium uppercase">{config.device}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Steps</span>
                    <p className="font-medium">{config.totalSteps.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environments</span>
                    <p className="font-medium">{config.numEnvs}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Learning Rate</span>
                    <p className="font-medium font-mono">{config.learningRate}</p>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Your training run is ready to start. You can monitor progress
                  and metrics in real-time once it begins.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <Switch
                  id="auto-start"
                  checked={autoStart}
                  onCheckedChange={setAutoStart}
                />
                <Label htmlFor="auto-start">Start training immediately</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep === 'review' ? (
            <Button
              type="submit"
              disabled={!isValid || createTrainingRun.isPending}
            >
              {createTrainingRun.isPending ? (
                'Creating...'
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {autoStart ? 'Create & Start' : 'Create Training Run'}
                </>
              )}
            </Button>
          ) : (
            <Button type="button" onClick={goToNextStep}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
