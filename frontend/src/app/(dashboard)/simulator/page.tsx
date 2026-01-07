'use client';

import { Suspense, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Maximize2,
  Camera,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Scene } from '@/components/3d/canvas';
import { RobotArm } from '@/components/3d/robot/robot-arm';

function SimulationViewer() {
  return (
    <div className="h-[600px] rounded-lg border bg-muted/30">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <Scene>
          <RobotArm />
        </Scene>
      </Suspense>
    </div>
  );
}

function SimulationControls() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulation Controls</CardTitle>
        <CardDescription>Control the simulation playback</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={isRunning ? 'outline' : 'default'}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
          <Button variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Speed</span>
            <span className="text-sm font-mono">{speed}x</span>
          </div>
          <Slider
            value={[speed]}
            min={0.1}
            max={5}
            step={0.1}
            onValueChange={([v]) => v !== undefined && setSpeed(v)}
          />
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'Running' : 'Paused'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step</span>
            <span className="font-mono">1,234</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono">12.34s</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reward</span>
            <span className="font-mono">0.856</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EnvironmentSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment</CardTitle>
        <CardDescription>Simulation environment settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Task</label>
          <Select defaultValue="reach">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Backend</label>
          <Select defaultValue="mujoco">
            <SelectTrigger>
              <SelectValue placeholder="Select backend" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mujoco">MuJoCo</SelectItem>
              <SelectItem value="isaac">IsaacGym</SelectItem>
              <SelectItem value="pybullet">PyBullet</SelectItem>
              <SelectItem value="dummy">Dummy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Num Envs</label>
          <Select defaultValue="1">
            <SelectTrigger>
              <SelectValue placeholder="Number of environments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="64">64</SelectItem>
              <SelectItem value="256">256</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ViewSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>View Settings</CardTitle>
        <CardDescription>3D visualization options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Show Grid</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Show Axes</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Show Trajectory</span>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Show Target</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Shadows</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Post-processing</span>
          <Switch />
        </div>
      </CardContent>
    </Card>
  );
}

function ObservationPanel() {
  const observation = {
    proprio: [0.0, 0.1, -0.2, 0.3, 0.0, 0.1, 0.0],
    reward: 0.856,
    terminated: false,
    truncated: false,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observation</CardTitle>
        <CardDescription>Current environment observation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Joint Positions (rad)</h4>
            <div className="grid grid-cols-7 gap-1">
              {observation.proprio.map((v, i) => (
                <div
                  key={i}
                  className="rounded bg-muted p-1 text-center font-mono text-xs"
                >
                  {v.toFixed(2)}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Reward</span>
              <p className="font-mono font-medium">{observation.reward.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Terminated</span>
              <p className="font-medium">{observation.terminated ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Truncated</span>
              <p className="font-medium">{observation.truncated ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SimulatorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulator</h1>
          <p className="text-muted-foreground">
            Interactive simulation environment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Camera className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <SimulationViewer />
        </div>

        <div className="space-y-6">
          <SimulationControls />

          <Tabs defaultValue="env">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="env">Env</TabsTrigger>
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="obs">Obs</TabsTrigger>
            </TabsList>
            <TabsContent value="env" className="mt-4">
              <EnvironmentSettings />
            </TabsContent>
            <TabsContent value="view" className="mt-4">
              <ViewSettings />
            </TabsContent>
            <TabsContent value="obs" className="mt-4">
              <ObservationPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
