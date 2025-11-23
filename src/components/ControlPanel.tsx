import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RotateCcw, Grid3x3, Info, Axis3d } from 'lucide-react';

interface ControlPanelProps {
  wireframe: boolean;
  showStats: boolean;
  showAxes: boolean;
  showGrid: boolean;
  onWireframeToggle: (value: boolean) => void;
  onStatsToggle: (value: boolean) => void;
  onAxesToggle: (value: boolean) => void;
  onGridToggle: (value: boolean) => void;
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
  wireframe,
  showStats,
  showAxes,
  showGrid,
  onWireframeToggle,
  onStatsToggle,
  onAxesToggle,
  onGridToggle,
  onResetCamera,
  modelInfo
}: ControlPanelProps) {
  return (
    <Card className="p-4 space-y-4 bg-card/95 backdrop-blur-sm">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" />
          View Controls
        </h3>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="wireframe" className="text-sm">Wireframe</Label>
          <Switch
            id="wireframe"
            checked={wireframe}
            onCheckedChange={onWireframeToggle}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="stats" className="text-sm">Show Stats</Label>
          <Switch
            id="stats"
            checked={showStats}
            onCheckedChange={onStatsToggle}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="axes" className="text-sm flex items-center gap-1">
            <Axis3d className="w-3 h-3" />
            Axes (X,Y,Z)
          </Label>
          <Switch
            id="axes"
            checked={showAxes}
            onCheckedChange={onAxesToggle}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="grid" className="text-sm flex items-center gap-1">
            <Grid3x3 className="w-3 h-3" />
            Grid
          </Label>
          <Switch
            id="grid"
            checked={showGrid}
            onCheckedChange={onGridToggle}
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
