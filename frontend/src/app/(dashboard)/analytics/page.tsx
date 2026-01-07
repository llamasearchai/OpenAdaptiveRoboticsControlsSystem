import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Download,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@/components/ui';
import { LineChart, BarChart } from '@/components/visualizations/charts';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Training analytics and performance metrics',
};

function PerformanceOverview() {
  const metrics = [
    {
      title: 'Avg Success Rate',
      value: '92.3%',
      change: '+5.2%',
      positive: true,
      icon: Target,
    },
    {
      title: 'Total Training Hours',
      value: '1,247',
      change: '+120h',
      positive: true,
      icon: Clock,
    },
    {
      title: 'Best Model Score',
      value: '98.5%',
      change: '+2.1%',
      positive: true,
      icon: TrendingUp,
    },
    {
      title: 'Active Experiments',
      value: '4',
      change: '0',
      positive: true,
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p
              className={`text-xs ${
                metric.positive ? 'text-success' : 'text-destructive'
              }`}
            >
              {metric.change} from last period
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SuccessRateChart() {
  // Mock data - would come from API
  const data = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    rate: 70 + Math.random() * 25 + i * 0.5,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Success Rate Over Time</CardTitle>
        <CardDescription>Daily average success rate across all tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <LineChart
              data={data}
              xKey="day"
              yKey="rate"
              color="hsl(var(--chart-1))"
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskComparisonChart() {
  const data = [
    { task: 'Reach', successRate: 95.2 },
    { task: 'Push', successRate: 87.4 },
    { task: 'Pick', successRate: 82.1 },
    { task: 'Place', successRate: 78.9 },
    { task: 'Insert', successRate: 65.3 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Performance Comparison</CardTitle>
        <CardDescription>Success rate by task type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <BarChart
              data={data}
              xKey="task"
              yKey="successRate"
              color="hsl(var(--chart-2))"
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}

function AlgorithmComparisonChart() {
  const data = [
    { algorithm: 'PPO', avgReward: 245.6 },
    { algorithm: 'SAC', avgReward: 238.2 },
    { algorithm: 'TD3', avgReward: 221.8 },
    { algorithm: 'DDPG', avgReward: 198.4 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Algorithm Comparison</CardTitle>
        <CardDescription>Average reward by algorithm</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <BarChart
              data={data}
              xKey="algorithm"
              yKey="avgReward"
              color="hsl(var(--chart-3))"
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingEfficiencyChart() {
  const data = Array.from({ length: 20 }, (_, i) => ({
    epoch: (i + 1) * 50,
    efficiency: 100 - 40 * Math.exp(-i / 10) + (Math.random() - 0.5) * 5,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Efficiency</CardTitle>
        <CardDescription>Sample efficiency over training epochs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <LineChart
              data={data}
              xKey="epoch"
              yKey="efficiency"
              color="hsl(var(--chart-4))"
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentExperiments() {
  const experiments = [
    {
      name: 'PPO-7DOF-v3',
      task: 'Reach',
      successRate: 98.5,
      status: 'completed',
    },
    {
      name: 'SAC-Push-v2',
      task: 'Push',
      successRate: 87.4,
      status: 'running',
    },
    {
      name: 'TD3-PickPlace-v1',
      task: 'Pick & Place',
      successRate: 82.1,
      status: 'completed',
    },
    {
      name: 'PPO-Insert-v1',
      task: 'Insertion',
      successRate: 65.3,
      status: 'failed',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Experiments</CardTitle>
        <CardDescription>Latest training runs and their results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div
              key={exp.name}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{exp.name}</p>
                <p className="text-sm text-muted-foreground">{exp.task}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">{exp.successRate}%</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {exp.status}
                  </p>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    exp.status === 'completed'
                      ? 'bg-success'
                      : exp.status === 'running'
                        ? 'bg-info'
                        : 'bg-destructive'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Training analytics and performance insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <PerformanceOverview />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SuccessRateChart />
            <RecentExperiments />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TaskComparisonChart />
        </TabsContent>

        <TabsContent value="algorithms" className="mt-6">
          <AlgorithmComparisonChart />
        </TabsContent>

        <TabsContent value="efficiency" className="mt-6">
          <TrainingEfficiencyChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
