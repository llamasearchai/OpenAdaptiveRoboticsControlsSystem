'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Layers, Download } from 'lucide-react';
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
  Slider,
  Badge,
} from '@/components/ui';
import { Scene } from '@/components/3d/canvas';
import { RobotArm } from '@/components/3d/robot/robot-arm';
import { useRobotStore } from '@/stores';

interface RobotDetailPageProps {
  params: Promise<{ id: string }>;
}

function JointControlPanel() {
  const jointPositions = useRobotStore((state) => state.jointPositions);
  const setJointPosition = useRobotStore((state) => state.setJointPosition);

  const joints = [
    { name: 'Joint 1', min: -2.9, max: 2.9 },
    { name: 'Joint 2', min: -1.8, max: 1.8 },
    { name: 'Joint 3', min: -2.9, max: 2.9 },
    { name: 'Joint 4', min: -3.1, max: 0.0 },
    { name: 'Joint 5', min: -2.9, max: 2.9 },
    { name: 'Joint 6', min: -0.02, max: 3.75 },
    { name: 'Joint 7', min: -2.9, max: 2.9 },
  ];

  return (
    <div className="space-y-4">
      {joints.map((joint, index) => (
        <div key={joint.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{joint.name}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {jointPositions[index]?.toFixed(3) ?? '0.000'} rad
            </span>
          </div>
          <Slider
            value={[jointPositions[index] ?? 0]}
            min={joint.min}
            max={joint.max}
            step={0.01}
            onValueChange={([value]) => value !== undefined && setJointPosition(index, value)}
          />
        </div>
      ))}
    </div>
  );
}

function EndEffectorInfo() {
  const eePosition = useRobotStore((state) => state.eePosition);
  const eeOrientation = useRobotStore((state) => state.eeOrientation);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Position (m)</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-2 text-center">
            <span className="text-xs text-muted-foreground">X</span>
            <p className="font-mono text-sm">{eePosition.x.toFixed(4)}</p>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <span className="text-xs text-muted-foreground">Y</span>
            <p className="font-mono text-sm">{eePosition.y.toFixed(4)}</p>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <span className="text-xs text-muted-foreground">Z</span>
            <p className="font-mono text-sm">{eePosition.z.toFixed(4)}</p>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Orientation (quaternion)</h4>
        <div className="grid grid-cols-4 gap-2">
          {(['x', 'y', 'z', 'w'] as const).map((axis) => (
            <div key={axis} className="rounded-md bg-muted p-2 text-center">
              <span className="text-xs text-muted-foreground">{axis.toUpperCase()}</span>
              <p className="font-mono text-sm">
                {eeOrientation[axis].toFixed(3)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RobotViewer3D() {
  return (
    <div className="h-[500px] rounded-lg border bg-muted/30">
      <Scene>
        <RobotArm />
      </Scene>
    </div>
  );
}

export default function RobotDetailPage({ params }: RobotDetailPageProps) {
  const { id } = use(params);

  // TODO: Fetch robot data from API
  const robot = {
    id,
    name: 'Franka Panda #1',
    type: 'Franka Emika Panda',
    status: 'connected' as const,
    controlMode: 'Position',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/robots">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to robots</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{robot.name}</h1>
            <Badge
              variant={robot.status === 'connected' ? 'default' : 'secondary'}
            >
              {robot.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{robot.type}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Config
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/robots/${id}/trajectories`}>
              <Layers className="mr-2 h-4 w-4" />
              Trajectories
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/robots/${id}/configure`}>
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>3D Viewer</CardTitle>
              <CardDescription>
                Real-time robot visualization with joint control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <Skeleton className="h-[500px] w-full rounded-lg" />
                }
              >
                <RobotViewer3D />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Joint Control</CardTitle>
              <CardDescription>
                Adjust individual joint positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="joints">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="joints">Joints</TabsTrigger>
                  <TabsTrigger value="endeffector">End Effector</TabsTrigger>
                </TabsList>
                <TabsContent value="joints" className="mt-4">
                  <JointControlPanel />
                </TabsContent>
                <TabsContent value="endeffector" className="mt-4">
                  <EndEffectorInfo />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Robot Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Control Mode</span>
                  <span className="font-medium">{robot.controlMode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connection</span>
                  <span className="font-medium capitalize">{robot.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Firmware</span>
                  <span className="font-medium">v4.2.1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">12h 34m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
