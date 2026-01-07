'use client';

import { useState, Suspense } from 'react';
import {
  Cpu,
  Calculator,
  ArrowRight,
  Target,
  Crosshair,
  RefreshCw,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
  Badge,
} from '@/components/ui';
import { Scene } from '@/components/3d/canvas';
import { RobotArm } from '@/components/3d/robot/robot-arm';
import { useRobotStore } from '@/stores';

function ForwardKinematicsPanel() {
  const { jointPositions, setJointPosition } = useRobotStore();
  const [result, setResult] = useState<{
    position: [number, number, number];
    quaternion: [number, number, number, number];
  } | null>(null);

  const handleCompute = () => {
    // Mock FK computation - would call API in real implementation
    setResult({
      position: [0.3 + Math.random() * 0.1, 0.0, 0.5 + Math.random() * 0.1],
      quaternion: [0, 0, 0, 1],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Forward Kinematics
        </CardTitle>
        <CardDescription>
          Compute end-effector pose from joint angles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Joint Angles (rad)</Label>
          <div className="grid grid-cols-7 gap-2">
            {jointPositions.map((pos, i) => (
              <div key={i}>
                <Label className="text-xs">J{i + 1}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pos.toFixed(2)}
                  onChange={(e) =>
                    setJointPosition(i, parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleCompute} className="w-full">
          <ArrowRight className="mr-2 h-4 w-4" />
          Compute FK
        </Button>

        {result && (
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <Label className="text-muted-foreground">Position (m)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                  <div key={axis} className="rounded bg-muted p-2 text-center">
                    <span className="text-xs text-muted-foreground">{axis}</span>
                    <p className="font-mono text-sm">
                      {(result.position[i] ?? 0).toFixed(4)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Orientation (quat)</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {(['x', 'y', 'z', 'w'] as const).map((axis, i) => (
                  <div key={axis} className="rounded bg-muted p-2 text-center">
                    <span className="text-xs text-muted-foreground">{axis}</span>
                    <p className="font-mono text-sm">
                      {(result.quaternion[i] ?? 0).toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InverseKinematicsPanel() {
  const [target, setTarget] = useState({
    x: 0.4,
    y: 0.0,
    z: 0.5,
  });
  const [result, setResult] = useState<{
    joints: number[];
    converged: boolean;
    iterations: number;
    error: number;
  } | null>(null);

  const handleCompute = () => {
    // Mock IK computation - would call API in real implementation
    setResult({
      joints: [0.0, 0.1, -0.2, -0.8, 0.0, 0.9, 0.0],
      converged: true,
      iterations: 15,
      error: 0.00012,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Inverse Kinematics
        </CardTitle>
        <CardDescription>
          Compute joint angles for target pose
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Target Position (m)</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <Label className="text-xs uppercase">{axis}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={target[axis]}
                  onChange={(e) =>
                    setTarget({ ...target, [axis]: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleCompute} className="w-full">
          <Crosshair className="mr-2 h-4 w-4" />
          Compute IK
        </Button>

        {result && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <Badge variant={result.converged ? 'default' : 'destructive'}>
                {result.converged ? 'Converged' : 'Failed'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Iterations</span>
                <p className="font-mono">{result.iterations}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Error</span>
                <p className="font-mono">{result.error.toExponential(2)}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Joint Angles (rad)</Label>
              <div className="grid grid-cols-7 gap-1 mt-1">
                {result.joints.map((j, i) => (
                  <div
                    key={i}
                    className="rounded bg-muted p-1 text-center font-mono text-xs"
                  >
                    {j.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JacobianPanel() {
  const { jointPositions } = useRobotStore();
  const [result, setResult] = useState<{
    jacobian: number[][];
    conditionNumber: number;
  } | null>(null);

  const handleCompute = () => {
    // Mock Jacobian computation
    const jacobian = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => (Math.random() - 0.5) * 2)
    );
    setResult({
      jacobian,
      conditionNumber: 5.23,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Jacobian
        </CardTitle>
        <CardDescription>
          Compute the manipulator Jacobian matrix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Current Joint Angles (rad)</Label>
          <div className="grid grid-cols-7 gap-1">
            {jointPositions.map((pos, i) => (
              <div
                key={i}
                className="rounded bg-muted p-1 text-center font-mono text-xs"
              >
                {pos.toFixed(2)}
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleCompute} className="w-full">
          <Calculator className="mr-2 h-4 w-4" />
          Compute Jacobian
        </Button>

        {result && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Condition Number</span>
              <span className="font-mono">{result.conditionNumber.toFixed(2)}</span>
            </div>
            <div>
              <Label className="text-muted-foreground">Jacobian (6x7)</Label>
              <div className="mt-1 overflow-x-auto">
                <table className="text-xs font-mono">
                  <tbody>
                    {result.jacobian.map((row, i) => (
                      <tr key={i}>
                        {row.map((val, j) => (
                          <td key={j} className="px-1 py-0.5 text-right">
                            {val.toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JointLimitsPanel() {
  const limits = [
    { joint: 1, posMin: -2.9, posMax: 2.9, velMax: 2.175, torqueMax: 87 },
    { joint: 2, posMin: -1.8, posMax: 1.8, velMax: 2.175, torqueMax: 87 },
    { joint: 3, posMin: -2.9, posMax: 2.9, velMax: 2.175, torqueMax: 87 },
    { joint: 4, posMin: -3.1, posMax: 0.0, velMax: 2.175, torqueMax: 87 },
    { joint: 5, posMin: -2.9, posMax: 2.9, velMax: 2.61, torqueMax: 12 },
    { joint: 6, posMin: -0.02, posMax: 3.75, velMax: 2.61, torqueMax: 12 },
    { joint: 7, posMin: -2.9, posMax: 2.9, velMax: 2.61, torqueMax: 12 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Joint Limits</CardTitle>
        <CardDescription>Physical limits for each joint</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Joint</th>
                <th className="text-right py-2">Pos Min</th>
                <th className="text-right py-2">Pos Max</th>
                <th className="text-right py-2">Vel Max</th>
                <th className="text-right py-2">Torque Max</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((limit) => (
                <tr key={limit.joint} className="border-b last:border-0">
                  <td className="py-2 font-medium">J{limit.joint}</td>
                  <td className="py-2 text-right font-mono">
                    {limit.posMin.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {limit.posMax.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {limit.velMax.toFixed(3)}
                  </td>
                  <td className="py-2 text-right font-mono">{limit.torqueMax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function KinematicsViewer() {
  return (
    <div className="h-[500px] rounded-lg border bg-muted/30">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <Scene>
          <RobotArm />
        </Scene>
      </Suspense>
    </div>
  );
}

export default function KinematicsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kinematics</h1>
          <p className="text-muted-foreground">
            Robot kinematics tools and analysis
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <KinematicsViewer />
          <JointLimitsPanel />
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="fk">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fk">FK</TabsTrigger>
              <TabsTrigger value="ik">IK</TabsTrigger>
              <TabsTrigger value="jacobian">Jacobian</TabsTrigger>
            </TabsList>

            <TabsContent value="fk" className="mt-4">
              <ForwardKinematicsPanel />
            </TabsContent>

            <TabsContent value="ik" className="mt-4">
              <InverseKinematicsPanel />
            </TabsContent>

            <TabsContent value="jacobian" className="mt-4">
              <JacobianPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
