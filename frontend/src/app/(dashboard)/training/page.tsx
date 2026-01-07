import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  Play,
  Pause,
  Square,
  MoreVertical,
  Clock,
  TrendingUp,
  Target,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'Training',
  description: 'Manage training experiments and monitor progress',
};

type TrainingStatus = 'running' | 'completed' | 'failed' | 'paused' | 'pending';

interface TrainingRun {
  id: string;
  name: string;
  algorithm: string;
  task: string;
  status: TrainingStatus;
  progress: number;
  currentStep: number;
  totalSteps: number;
  successRate?: number;
  startedAt?: string;
  completedAt?: string;
}

function StatusBadge({ status }: { status: TrainingStatus }) {
  const variants: Record<TrainingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    running: 'default',
    completed: 'secondary',
    failed: 'destructive',
    paused: 'outline',
    pending: 'outline',
  };

  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}

function TrainingCard({ run }: { run: TrainingRun }) {
  const progressPercent = (run.currentStep / run.totalSteps) * 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{run.name}</CardTitle>
          <CardDescription>
            {run.algorithm} on {run.task}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/training/${run.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Export Checkpoint</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={run.status} />
          {run.successRate !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{run.successRate}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono">
              {run.currentStep.toLocaleString()} / {run.totalSteps.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {run.startedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Started: {run.startedAt}</span>
          </div>
        )}

        <div className="flex gap-2">
          {run.status === 'running' ? (
            <>
              <Button size="sm" variant="outline" className="flex-1">
                <Pause className="mr-1 h-3 w-3" />
                Pause
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            </>
          ) : run.status === 'paused' ? (
            <>
              <Button size="sm" className="flex-1">
                <Play className="mr-1 h-3 w-3" />
                Resume
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link href={`/training/${run.id}`}>
                  <TrendingUp className="mr-1 h-3 w-3" />
                  View Metrics
                </Link>
              </Button>
              <Button size="sm" className="flex-1">
                <Play className="mr-1 h-3 w-3" />
                Restart
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingList({ runs, filter }: { runs: TrainingRun[]; filter: string }) {
  const filteredRuns = filter === 'all'
    ? runs
    : runs.filter(run => run.status === filter);

  if (filteredRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No training runs</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          {filter === 'all'
            ? "You haven't started any training runs yet. Create one to get started."
            : `No ${filter} training runs found.`
          }
        </p>
        <Button className="mt-4" asChild>
          <Link href="/training/new">
            <Plus className="mr-2 h-4 w-4" />
            New Training Run
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredRuns.map((run) => (
        <TrainingCard key={run.id} run={run} />
      ))}
    </div>
  );
}

export default function TrainingPage() {
  // TODO: Replace with real data from API
  const runs: TrainingRun[] = [
    {
      id: 'run-1',
      name: 'PPO-7DOF-v3',
      algorithm: 'PPO',
      task: 'Reach',
      status: 'running',
      progress: 75,
      currentStep: 750000,
      totalSteps: 1000000,
      successRate: 85.5,
      startedAt: '2 hours ago',
    },
    {
      id: 'run-2',
      name: 'SAC-Push-v1',
      algorithm: 'SAC',
      task: 'Push',
      status: 'running',
      progress: 45,
      currentStep: 450000,
      totalSteps: 1000000,
      successRate: 72.3,
      startedAt: '5 hours ago',
    },
    {
      id: 'run-3',
      name: 'PPO-PickPlace-v2',
      algorithm: 'PPO',
      task: 'Pick & Place',
      status: 'completed',
      progress: 100,
      currentStep: 1000000,
      totalSteps: 1000000,
      successRate: 98.5,
      startedAt: '1 day ago',
      completedAt: '12 hours ago',
    },
    {
      id: 'run-4',
      name: 'TD3-Insertion-v1',
      algorithm: 'TD3',
      task: 'Insertion',
      status: 'failed',
      progress: 30,
      currentStep: 300000,
      totalSteps: 1000000,
      successRate: 12.1,
      startedAt: '3 days ago',
    },
    {
      id: 'run-5',
      name: 'PPO-Reach-baseline',
      algorithm: 'PPO',
      task: 'Reach',
      status: 'completed',
      progress: 100,
      currentStep: 500000,
      totalSteps: 500000,
      successRate: 95.2,
      startedAt: '1 week ago',
      completedAt: '6 days ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training</h1>
          <p className="text-muted-foreground">
            Manage training experiments and monitor progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button asChild>
            <Link href="/training/new">
              <Plus className="mr-2 h-4 w-4" />
              New Training Run
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({runs.length})</TabsTrigger>
          <TabsTrigger value="running">
            Running ({runs.filter(r => r.status === 'running').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({runs.filter(r => r.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({runs.filter(r => r.status === 'failed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TrainingList runs={runs} filter="all" />
        </TabsContent>
        <TabsContent value="running" className="mt-6">
          <TrainingList runs={runs} filter="running" />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <TrainingList runs={runs} filter="completed" />
        </TabsContent>
        <TabsContent value="failed" className="mt-6">
          <TrainingList runs={runs} filter="failed" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
