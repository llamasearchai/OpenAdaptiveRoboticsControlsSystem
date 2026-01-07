import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  Bot,
  Activity,
  GraduationCap,
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'ARCS system overview and key metrics',
};

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp
              className={`h-3 w-3 ${trend.value >= 0 ? 'text-success' : 'text-destructive'}`}
            />
            <span className={trend.value >= 0 ? 'text-success' : 'text-destructive'}>
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function StatsGrid() {
  // TODO: Replace with real data from API
  const stats = [
    {
      title: 'Active Robots',
      value: 3,
      description: '2 connected, 1 simulated',
      icon: Bot,
      trend: { value: 0, label: 'from last week' },
    },
    {
      title: 'Training Runs',
      value: 12,
      description: '2 active, 10 completed',
      icon: GraduationCap,
      trend: { value: 20, label: 'from last week' },
    },
    {
      title: 'Datasets',
      value: '45.2K',
      description: 'demonstrations',
      icon: Database,
      trend: { value: 15, label: 'from last week' },
    },
    {
      title: 'System Health',
      value: '99.9%',
      description: 'uptime',
      icon: Activity,
      trend: { value: 0.1, label: 'from last month' },
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
}

function RecentActivity() {
  // TODO: Replace with real data from API
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'success',
      title: 'Training Complete',
      description: 'PPO-7DOF-v3 finished with 98.5% success rate',
      timestamp: '2 minutes ago',
    },
    {
      id: '2',
      type: 'warning',
      title: 'Safety Alert',
      description: 'Joint 3 approaching velocity limit',
      timestamp: '15 minutes ago',
    },
    {
      id: '3',
      type: 'info',
      title: 'Dataset Uploaded',
      description: 'reach-demos-2024 (1,234 demonstrations)',
      timestamp: '1 hour ago',
    },
    {
      id: '4',
      type: 'success',
      title: 'Robot Connected',
      description: 'Franka Emika Panda #2 online',
      timestamp: '2 hours ago',
    },
  ];

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Activity className="h-4 w-4 text-info" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest events and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              {getIcon(activity.type)}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {activity.timestamp}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { title: 'New Training Run', href: '/training/new', icon: GraduationCap },
    { title: 'Configure Robot', href: '/robots/configure', icon: Bot },
    { title: 'View Analytics', href: '/analytics', icon: Activity },
    { title: 'Upload Dataset', href: '/datasets', icon: Database },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {actions.map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <action.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{action.title}</span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatus() {
  // TODO: Replace with real data from API
  const services = [
    { name: 'API Server', status: 'healthy', latency: '12ms' },
    { name: 'Simulation Backend', status: 'healthy', latency: '45ms' },
    { name: 'Training Service', status: 'healthy', latency: '23ms' },
    { name: 'WebSocket', status: 'healthy', latency: '8ms' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>Service health and latency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    service.status === 'healthy'
                      ? 'bg-success'
                      : service.status === 'degraded'
                        ? 'bg-warning'
                        : 'bg-destructive'
                  }`}
                />
                <span className="text-sm">{service.name}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {service.latency}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div id="main-content" className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ARCS - your robotics control system overview
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <StatsGrid />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            }
          >
            <RecentActivity />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            }
          >
            <QuickActions />
          </Suspense>

          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            }
          >
            <SystemStatus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
