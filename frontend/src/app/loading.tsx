import { Skeleton } from '@/components/ui';

export default function RootLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
