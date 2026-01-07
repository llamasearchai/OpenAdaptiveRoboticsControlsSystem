import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Database,
  Plus,
  Upload,
  Download,
  MoreVertical,
  FileText,
  CheckCircle2,
  Clock,
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
  title: 'Datasets',
  description: 'Manage demonstration datasets for training',
};

interface Dataset {
  id: string;
  name: string;
  task: string;
  demonstrations: number;
  transitions: number;
  successRate: number;
  size: string;
  createdAt: string;
  format: string;
}

function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{dataset.name}</CardTitle>
            <CardDescription>{dataset.task} task</CardDescription>
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
              <Link href={`/datasets/${dataset.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem>Process</DropdownMenuItem>
            <DropdownMenuItem>Augment</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Demonstrations</span>
            <p className="font-medium">{dataset.demonstrations.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Transitions</span>
            <p className="font-medium">{dataset.transitions.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Success Rate</span>
            <p className="font-medium">{dataset.successRate}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Size</span>
            <p className="font-medium">{dataset.size}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline">{dataset.format}</Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {dataset.createdAt}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/datasets/${dataset.id}`}>
              <FileText className="mr-2 h-3 w-3" />
              Details
            </Link>
          </Button>
          <Button size="sm" className="flex-1">
            <CheckCircle2 className="mr-2 h-3 w-3" />
            Use for Training
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetStats() {
  const stats = [
    { label: 'Total Datasets', value: '12' },
    { label: 'Total Demonstrations', value: '45,231' },
    { label: 'Total Transitions', value: '2.4M' },
    { label: 'Total Size', value: '8.2 GB' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DatasetsPage() {
  // TODO: Replace with real data from API
  const datasets: Dataset[] = [
    {
      id: 'ds-1',
      name: 'reach-demos-2024',
      task: 'Reach',
      demonstrations: 1234,
      transitions: 123400,
      successRate: 95.2,
      size: '1.2 GB',
      createdAt: '2 days ago',
      format: 'HDF5',
    },
    {
      id: 'ds-2',
      name: 'push-expert-v2',
      task: 'Push',
      demonstrations: 856,
      transitions: 85600,
      successRate: 92.8,
      size: '892 MB',
      createdAt: '1 week ago',
      format: 'HDF5',
    },
    {
      id: 'ds-3',
      name: 'pick-place-mixed',
      task: 'Pick & Place',
      demonstrations: 2100,
      transitions: 210000,
      successRate: 88.5,
      size: '2.1 GB',
      createdAt: '2 weeks ago',
      format: 'Zarr',
    },
    {
      id: 'ds-4',
      name: 'insertion-demos-v1',
      task: 'Insertion',
      demonstrations: 543,
      transitions: 54300,
      successRate: 78.3,
      size: '512 MB',
      createdAt: '1 month ago',
      format: 'HDF5',
    },
    {
      id: 'ds-5',
      name: 'multi-task-expert',
      task: 'Multi-task',
      demonstrations: 5000,
      transitions: 500000,
      successRate: 91.2,
      size: '4.5 GB',
      createdAt: '1 month ago',
      format: 'HDF5',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground">
            Manage demonstration datasets for training
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        </div>
      </div>

      <DatasetStats />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({datasets.length})</TabsTrigger>
          <TabsTrigger value="reach">
            Reach ({datasets.filter((d) => d.task === 'Reach').length})
          </TabsTrigger>
          <TabsTrigger value="push">
            Push ({datasets.filter((d) => d.task === 'Push').length})
          </TabsTrigger>
          <TabsTrigger value="pick-place">
            Pick & Place ({datasets.filter((d) => d.task === 'Pick & Place').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reach" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets
              .filter((d) => d.task === 'Reach')
              .map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="push" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets
              .filter((d) => d.task === 'Push')
              .map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pick-place" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets
              .filter((d) => d.task === 'Pick & Place')
              .map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
