import { useCallback, useState } from 'react';
import { Upload, File, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  accept?: string;
}

export function FileUploader({ onFileSelect, loading = false, accept = '.stl' }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const stlFile = files.find(f => f.name.toLowerCase().endsWith('.stl'));
    
    if (stlFile) {
      onFileSelect(stlFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl transition-all duration-300 bg-card shadow-sm hover:shadow-md",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02] shadow-lg" 
          : "border-border hover:border-primary/50 hover:bg-accent/5",
        loading && "opacity-50 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={loading}
      />
      
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        {/* Icon Container */}
        <div className={cn(
          "mb-6 p-6 rounded-2xl transition-all duration-300 relative",
          isDragging 
            ? "bg-primary/10 scale-110 shadow-lg ring-4 ring-primary/20" 
            : "bg-gradient-to-br from-primary/10 to-primary/5 hover:scale-105",
          loading && "animate-pulse"
        )}>
          {loading ? (
            <div className="relative">
              <File className="w-12 h-12 text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : isDragging ? (
            <Check className="w-12 h-12 text-primary animate-bounce" />
          ) : (
            <Upload className="w-12 h-12 text-primary" />
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold mb-2 text-foreground">
          {loading ? 'Processing your file...' : isDragging ? 'Drop it here!' : 'Upload STL File'}
        </h3>
        
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {loading 
            ? 'Please wait while we process your 3D model' 
            : 'Drag and drop your STL file here, or click to browse'}
        </p>
        
        {/* Info Pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          <div className="px-3 py-1.5 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground">
            .STL format
          </div>
          <div className="px-3 py-1.5 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground">
            Binary & ASCII
          </div>
        </div>
      </div>
    </div>
  );
}