import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  progress: number;
  status: string;
}

export function LoadingProgress({ progress, status }: LoadingProgressProps) {
  return (
    <Card className="p-6 bg-card/95 backdrop-blur-sm border-primary/30">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">{status}</span>
        </div>
        
        <div className="w-full space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    </Card>
  );
}
