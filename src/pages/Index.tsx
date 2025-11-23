import { useState, useCallback, useRef } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { STLViewer } from '@/components/STLViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { LoadingProgress } from '@/components/LoadingProgress';
import { useToast } from '@/hooks/use-toast';
import { Github, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModelData {
  vertices: Float32Array;
  normals: Float32Array;
  fileName: string;
  triangles: number;
  vertexCount: number;
  format: string;
  fileSize: string;
}

const Index = () => {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [wireframe, setWireframe] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const viewerRef = useRef<any>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid STL file.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(5);
    setStatus('Reading file...');

    try {
      // Read file with progress tracking
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const fileProgress = Math.floor((e.loaded / e.total) * 30);
            setProgress(5 + fileProgress);
          }
        };
        
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve(e.target.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      });

      setProgress(35);
      setStatus('Parsing STL geometry...');

      // Terminate any existing worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Create new worker
      const worker = new Worker('/stl-parser.worker.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const messageType = e.data.type || 'complete';

        switch (messageType) {
          case 'progress':
            setProgress(e.data.progress);
            break;

          case 'complete':
            const { success, vertices, normals, triangleCount, format, error } = e.data;

            if (success) {
              setProgress(95);
              setStatus('Rendering model...');

              // Small delay to show final progress
              setTimeout(() => {
                setModelData({
                  vertices,
                  normals,
                  fileName: file.name,
                  triangles: triangleCount,
                  vertexCount: triangleCount * 3,
                  format,
                  fileSize: formatFileSize(file.size),
                });

                setProgress(100);
                setStatus('Complete!');

                toast({
                  title: "Model loaded successfully",
                  description: `${triangleCount.toLocaleString()} triangles loaded`,
                });

                setTimeout(() => {
                  setLoading(false);
                  setProgress(0);
                  setStatus('');
                }, 300);
              }, 100);
            } else {
              throw new Error(error || 'Parsing failed');
            }
            break;

          case 'error':
            throw new Error(e.data.error || 'Unknown error');
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        toast({
          title: "Parsing failed",
          description: "Unable to parse STL file. The file may be corrupted.",
          variant: "destructive",
        });
        setLoading(false);
        setProgress(0);
        setStatus('');
        worker.terminate();
      };

      // Send to worker with transfer (zero-copy)
      worker.postMessage(
        { arrayBuffer, fileName: file.name },
        [arrayBuffer]
      );

    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: "Error loading file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setLoading(false);
      setProgress(0);
      setStatus('');
      
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  }, [toast]);

  const handleUploadNewFile = useCallback(() => {
    setModelData(null);
    setWireframe(false);
    setShowStats(true);
    setShowAxes(false);
    setShowGrid(true);
    
    // Clean up worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    if (viewerRef.current?.resetCamera) {
      viewerRef.current.resetCamera();
      toast({
        title: "Camera reset",
        description: "Default view restored.",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/10">

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/Logo_SeekMake.png"
              alt="SeekMake Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-lg md:text-xl font-bold text-center flex-1 hidden md:block">
            STL Viewer
          </h1>

          {/* Author + GitHub */}
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-muted-foreground">
              Made by <span className="text-foreground font-semibold">Yassine Hallous</span>
            </span>

            <a
              href="https://github.com/Hallous-Yassine/STL-WebViewer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors p-2 hover:bg-secondary/50 rounded-lg"
              aria-label="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
        {!modelData ? (
          /* Upload View - Centered */
          <div className="h-[calc(100vh-140px)] flex items-center justify-center">
            <div className="w-full max-w-2xl">
              {/* Welcome Message */}
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Visualize Your 3D Models
                </h2>
              </div>

              {/* File Uploader */}
              <FileUploader onFileSelect={handleFileSelect} loading={loading} />
            </div>
          </div>
        ) : (
          /* Model View - Grid Layout */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-140px)]">
            {/* Left Side - Viewer */}
            <section className="flex items-center justify-center">
              <div className="w-full h-full bg-card/50 rounded-xl border border-border overflow-hidden shadow-lg">
                <STLViewer
                  ref={viewerRef}
                  vertices={modelData.vertices}
                  normals={modelData.normals}
                  wireframe={wireframe}
                  showStats={showStats}
                />
              </div>
            </section>

            {/* Right Side - Control Panel */}
            <aside className="space-y-4">
              <ControlPanel
                showStats={showStats}
                onStatsToggle={setShowStats}
                onResetCamera={handleResetCamera}
                modelInfo={{
                  fileName: modelData.fileName,
                  triangles: modelData.triangles,
                  vertices: modelData.vertexCount,
                  format: modelData.format,
                  fileSize: modelData.fileSize,
                }}
              />
              
              <Button
                onClick={handleUploadNewFile}
                className="w-full"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Another File
              </Button>
            </aside>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50">
          <LoadingProgress progress={progress} status={status} />
        </div>
      )}
    </div>
  );
};

export default Index;