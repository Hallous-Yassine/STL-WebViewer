import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RotateCcw, Info } from 'lucide-react';

interface ControlPanelProps {
  showStats: boolean;
  onStatsToggle: (value: boolean) => void;
  onResetCamera: () => void;
  modelInfo?: {
    fileName: string;
    triangles: number;
    vertices: number;
    format: string;
    fileSize: string;
  } | null;
}

export function ControlPanel({
  showStats,
  onStatsToggle,
  onResetCamera,
  modelInfo
}: ControlPanelProps) {
  return (
    <Card className="p-4 space-y-4 bg-card/95 backdrop-blur-sm">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          View Controls
        </h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="stats" className="text-sm">Show Stats</Label>
          <Switch
            id="stats"
            checked={showStats}
            onCheckedChange={onStatsToggle}
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onResetCamera}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset View
        </Button>
      </div>

      {modelInfo && (
        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Info className="w-4 h-4" />
            Model Info
          </h3>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File:</span>
              <span className="font-medium truncate max-w-[150px]" title={modelInfo.fileName}>
                {modelInfo.fileName}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-medium">{modelInfo.format}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{modelInfo.fileSize}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Triangles:</span>
              <span className="font-medium">{modelInfo.triangles.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vertices:</span>
              <span className="font-medium">{modelInfo.vertices.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
