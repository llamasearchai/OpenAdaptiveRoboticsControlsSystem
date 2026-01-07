'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Download,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@/components/ui';
import { LineChart } from '@/components/visualizations/charts';

interface TrainingDetailPageProps {
  params: Promise<{ id: string }>;
}

function MetricsOverview() {
  const metrics = [
    { label: 'Policy Loss', value: '0.0234', trend: -12 },
    { label: 'Value Loss', value: '0.156', trend: -8 },
    { label: 'KL Divergence', value: '0.0089', trend: 2 },
    { label: 'Entropy', value: '1.234', trend: -3 },
    { label: 'Explained Var', value: '0.892', trend: 5 },
    { label: 'Success Rate', value: '85.5%', trend: 12 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{metric.label}</div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div
              className={`text-xs ${
                metric.trend >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {metric.trend >= 0 ? '+' : ''}{metric.trend}% vs last epoch
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TrainingCharts() {
  // Generate mock data for charts
  const generateData = (points: number, baseValue: number, variance: number) =>
    Array.from({ length: points }, (_, i) => ({
      step: i * 1000,
      value: baseValue + (Math.random() - 0.5) * variance - i * (variance / points / 2),
    }));

  const policyLossData = generateData(100, 0.5, 0.3);
  const valueLossData = generateData(100, 0.8, 0.4);
  const rewardData = Array.from({ length: 100 }, (_, i) => ({
    step: i * 1000,
    value: Math.min(100, 10 + i * 0.9 + (Math.random() - 0.5) * 10),
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Policy Loss</CardTitle>
          <CardDescription>Training policy loss over steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <LineChart
                data={policyLossData}
                xKey="step"
                yKey="value"
                color="hsl(var(--chart-1))"
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Value Loss</CardTitle>
          <CardDescription>Value function loss over steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <LineChart
                data={valueLossData}
                xKey="step"
                yKey="value"
                color="hsl(var(--chart-2))"
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Episode Reward</CardTitle>
          <CardDescription>Average episode reward over training</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <LineChart
                data={rewardData}
                xKey="step"
                yKey="value"
                color="hsl(var(--chart-3))"
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigurationPanel() {
  const config = {
    algorithm: 'PPO',
    task: 'Reach',
    backend: 'MuJoCo',
    learningRate: 3e-4,
    batchSize: 2048,
    clipRatio: 0.2,
    gamma: 0.99,
    gaeLambda: 0.95,
    entropyCoef: 0.01,
    vfCoef: 0.5,
    updateEpochs: 10,
    numEnvs: 64,
    device: 'cuda',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="font-mono">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckpointsPanel() {
  const checkpoints = [
    { step: 750000, timestamp: '10 minutes ago', size: '245 MB' },
    { step: 500000, timestamp: '1 hour ago', size: '245 MB' },
    { step: 250000, timestamp: '3 hours ago', size: '245 MB' },
  ];

  return (
    <div className="space-y-3">
      {checkpoints.map((checkpoint) => (
        <div
          key={checkpoint.step}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="font-medium">Step {checkpoint.step.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {checkpoint.timestamp} - {checkpoint.size}
            </p>
          </div>
          <Button size="sm" variant="outline">
            <Download className="mr-2 h-3 w-3" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function TrainingDetailPage({ params }: TrainingDetailPageProps) {
  const { id } = use(params);

  // TODO: Fetch training run data from API
  const run = {
    id,
    name: 'PPO-7DOF-v3',
    algorithm: 'PPO',
    task: 'Reach',
    status: 'running' as const,
    currentStep: 750000,
    totalSteps: 1000000,
    startedAt: '2 hours ago',
  };

  const progress = (run.currentStep / run.totalSteps) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/training">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to training</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{run.name}</h1>
            <Badge>{run.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {run.algorithm} on {run.task} - Started {run.startedAt}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {run.status === 'running' ? (
            <>
              <Button variant="outline">
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button variant="destructive">
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          ) : (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Training Progress</span>
              <span className="font-mono">
                {run.currentStep.toLocaleString()} / {run.totalSteps.toLocaleString()} steps ({progress.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <MetricsOverview />

      <Tabs defaultValue="charts">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-6">
          <TrainingCharts />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Training Configuration</CardTitle>
                <CardDescription>
                  Hyperparameters and settings for this run
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <ConfigurationPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkpoints" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Checkpoints</CardTitle>
              <CardDescription>Saved model checkpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckpointsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Logs</CardTitle>
              <CardDescription>Console output from training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 font-mono text-xs max-h-[400px] overflow-auto">
                <pre>
                  {`[2024-01-15 10:30:45] INFO: Starting training run PPO-7DOF-v3
[2024-01-15 10:30:45] INFO: Using device: cuda:0
[2024-01-15 10:30:46] INFO: Initializing 64 parallel environments
[2024-01-15 10:30:48] INFO: Policy network initialized: MLP(256, 256)
[2024-01-15 10:30:48] INFO: Value network initialized: MLP(256, 256)
[2024-01-15 10:31:00] INFO: Step 1000 | Policy Loss: 0.523 | Value Loss: 0.891
[2024-01-15 10:32:15] INFO: Step 10000 | Policy Loss: 0.234 | Value Loss: 0.456
[2024-01-15 10:35:30] INFO: Step 50000 | Policy Loss: 0.089 | Value Loss: 0.234
[2024-01-15 10:35:30] INFO: Checkpoint saved: checkpoint_50000.pt
...`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
