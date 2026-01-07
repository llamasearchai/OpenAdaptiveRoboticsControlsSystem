import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Plus,
  Settings,
  MoreVertical,
  Wifi,
  WifiOff,
  Play,
  Pause,
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
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'Robots',
  description: 'Manage and monitor your robot fleet',
};

interface Robot {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'simulated';
  controlMode: string;
  lastSeen: string;
}

function RobotCard({ robot }: { robot: Robot }) {
  const statusColor = {
    connected: 'bg-success',
    disconnected: 'bg-destructive',
    simulated: 'bg-info',
  }[robot.status];

  const statusLabel = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    simulated: 'Simulated',
  }[robot.status];

  const StatusIcon = robot.status === 'connected' ? Wifi : WifiOff;

  return (
    <Card className="group relative">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{robot.name}</CardTitle>
            <CardDescription>{robot.type}</CardDescription>
          </div>
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
              <Link href={`/robots/${robot.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/robots/${robot.id}/configure`}>Configure</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/robots/${robot.id}/trajectories`}>Trajectories</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusColor}`} />
              <span className="text-sm">{statusLabel}</span>
            </div>
            <Badge variant="outline">{robot.controlMode}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <StatusIcon className="h-3 w-3" />
            <span>Last seen: {robot.lastSeen}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <Link href={`/robots/${robot.id}`}>
                <Settings className="mr-2 h-3 w-3" />
                Configure
              </Link>
            </Button>
            <Button size="sm" className="flex-1">
              {robot.status === 'connected' ? (
                <>
                  <Pause className="mr-2 h-3 w-3" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-3 w-3" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RobotsPage() {
  // TODO: Replace with real data from API
  const robots: Robot[] = [
    {
      id: 'franka-1',
      name: 'Franka Panda #1',
      type: 'Franka Emika Panda',
      status: 'connected',
      controlMode: 'Position',
      lastSeen: 'Just now',
    },
    {
      id: 'franka-2',
      name: 'Franka Panda #2',
      type: 'Franka Emika Panda',
      status: 'connected',
      controlMode: 'Impedance',
      lastSeen: 'Just now',
    },
    {
      id: 'sim-1',
      name: 'Simulation Robot',
      type: 'MuJoCo Simulated',
      status: 'simulated',
      controlMode: 'Position',
      lastSeen: 'Active',
    },
    {
      id: 'kuka-1',
      name: 'KUKA iiwa',
      type: 'KUKA LBR iiwa 14 R820',
      status: 'disconnected',
      controlMode: 'Idle',
      lastSeen: '2 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Robots</h1>
          <p className="text-muted-foreground">
            Manage and monitor your robot fleet
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Robot
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {robots.map((robot) => (
          <RobotCard key={robot.id} robot={robot} />
        ))}
      </div>
    </div>
  );
}
