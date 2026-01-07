import type { Metadata } from 'next';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'Safety',
  description: 'Safety filter configuration and monitoring',
};

function SafetyStatus() {
  const safetyEnabled = true;
  const violations = 0;
  const filteredActions = 1234;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            {safetyEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">Safety Filter</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {safetyEnabled ? 'Active' : 'Disabled'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Violations</span>
          </div>
          <div className="text-2xl font-bold mt-1">{violations}</div>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-info" />
            <span className="text-sm text-muted-foreground">Filtered Actions</span>
          </div>
          <div className="text-2xl font-bold mt-1">{filteredActions}</div>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Filter Latency</span>
          </div>
          <div className="text-2xl font-bold mt-1">0.8ms</div>
          <p className="text-xs text-muted-foreground">Average</p>
        </CardContent>
      </Card>
    </div>
  );
}

function JointLimitsConfig() {
  const joints = [
    { name: 'Joint 1', posMin: -2.9, posMax: 2.9, velMax: 2.175, torqueMax: 87 },
    { name: 'Joint 2', posMin: -1.8, posMax: 1.8, velMax: 2.175, torqueMax: 87 },
    { name: 'Joint 3', posMin: -2.9, posMax: 2.9, velMax: 2.175, torqueMax: 87 },
    { name: 'Joint 4', posMin: -3.1, posMax: 0.0, velMax: 2.175, torqueMax: 87 },
    { name: 'Joint 5', posMin: -2.9, posMax: 2.9, velMax: 2.61, torqueMax: 12 },
    { name: 'Joint 6', posMin: -0.02, posMax: 3.75, velMax: 2.61, torqueMax: 12 },
    { name: 'Joint 7', posMin: -2.9, posMax: 2.9, velMax: 2.61, torqueMax: 12 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Joint Limits</CardTitle>
        <CardDescription>
          Position, velocity, and torque limits for each joint
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <span>Joint</span>
            <span>Pos Min (rad)</span>
            <span>Pos Max (rad)</span>
            <span>Vel Max (rad/s)</span>
            <span>Torque Max (Nm)</span>
          </div>
          {joints.map((joint) => (
            <div key={joint.name} className="grid grid-cols-5 gap-4 text-sm">
              <span className="font-medium">{joint.name}</span>
              <span className="font-mono">{joint.posMin.toFixed(2)}</span>
              <span className="font-mono">{joint.posMax.toFixed(2)}</span>
              <span className="font-mono">{joint.velMax.toFixed(3)}</span>
              <span className="font-mono">{joint.torqueMax}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceBoundsConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Bounds</CardTitle>
        <CardDescription>
          Cartesian workspace limits for end-effector
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Lower Bounds (m)</h4>
            <div className="grid grid-cols-3 gap-4">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis}>
                  <label className="text-xs text-muted-foreground">{axis}</label>
                  <div className="font-mono text-sm">{[-0.5, -0.5, 0.0][i]}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Upper Bounds (m)</h4>
            <div className="grid grid-cols-3 gap-4">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis}>
                  <label className="text-xs text-muted-foreground">{axis}</label>
                  <div className="font-mono text-sm">{[0.5, 0.5, 1.0][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SafetySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Safety Settings</CardTitle>
        <CardDescription>Global safety configuration options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Safety Filter</p>
            <p className="text-sm text-muted-foreground">
              Filter all actions through safety constraints
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Use QP Solver</p>
            <p className="text-sm text-muted-foreground">
              Use quadratic programming for optimal constraint satisfaction
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Workspace Bounds Check</p>
            <p className="text-sm text-muted-foreground">
              Enforce Cartesian workspace limits
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Control Timestep (ms)</p>
            <span className="text-sm font-mono">10.0</span>
          </div>
          <Slider defaultValue={[10]} min={1} max={50} step={1} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Solver Timeout (ms)</p>
            <span className="text-sm font-mono">1.0</span>
          </div>
          <Slider defaultValue={[1]} min={0.1} max={10} step={0.1} />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEvents() {
  const events = [
    {
      type: 'info',
      message: 'Safety filter enabled',
      timestamp: '10 seconds ago',
    },
    {
      type: 'warning',
      message: 'Joint 3 velocity approaching limit',
      timestamp: '2 minutes ago',
    },
    {
      type: 'info',
      message: 'Workspace bounds updated',
      timestamp: '15 minutes ago',
    },
    {
      type: 'success',
      message: 'QP solver optimized 1,234 actions',
      timestamp: '1 hour ago',
    },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4 text-info" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Events</CardTitle>
        <CardDescription>Safety system activity log</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={i} className="flex items-start gap-3">
              {getEventIcon(event.type)}
              <div className="flex-1">
                <p className="text-sm">{event.message}</p>
                <p className="text-xs text-muted-foreground">{event.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SafetyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Safety</h1>
          <p className="text-muted-foreground">
            Safety filter configuration and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Stats
          </Button>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      <SafetyStatus />

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="limits">Joint Limits</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <SafetySettings />
        </TabsContent>

        <TabsContent value="limits" className="mt-6">
          <JointLimitsConfig />
        </TabsContent>

        <TabsContent value="workspace" className="mt-6">
          <WorkspaceBoundsConfig />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <RecentEvents />
        </TabsContent>
      </Tabs>
    </div>
  );
}
