import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GradientBackground } from '@/engine/components/GradientBackground';
import { STLModel } from '@/engine/components/STLModel';
import { Lighting } from '@/engine/components/Lighting';
import { CameraController } from '@/engine/components/CameraController';
import { calculateCameraFraming } from '@/engine/utils/cameraUtils';

interface STLViewerProps {
  vertices: Float32Array | null;
  normals: Float32Array | null;
  wireframe?: boolean;
  showStats?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
}

export const STLViewer = forwardRef<any, STLViewerProps>(
  ({ vertices, normals, showStats = false }, ref) => {
    const [stats, setStats] = useState({ triangles: 0, vertices: 0 });
    const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3(0, 0, 5));
    const [cameraTarget, setCameraTarget] = useState(new THREE.Vector3(0, 0, 0));
    const [resetTrigger, setResetTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [boundingSphereRadius, setBoundingSphereRadius] = useState(50);

    const meshRef = useRef<THREE.Mesh>(null);
    const initialCameraRef = useRef({ position: new THREE.Vector3(0, 0, 5), target: new THREE.Vector3(0, 0, 0) });

    // Compute basic stats
    useEffect(() => {
      if (!vertices) {
        setStats({ triangles: 0, vertices: 0 });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const timeoutId = setTimeout(() => {
        const triangleCount = Math.floor(vertices.length / 9);
        setStats({ triangles: triangleCount, vertices: triangleCount * 3 });
      }, 0);

      return () => clearTimeout(timeoutId);
    }, [vertices]);

    // Handle model bounds and set camera / lighting
    const handleBoundsCalculated = useCallback((center: THREE.Vector3, radius: number) => {
      const { position, target } = calculateCameraFraming(center, radius);
      setCameraPosition(position);
      setCameraTarget(target);
      initialCameraRef.current = { position: position.clone(), target: target.clone() };
      setBoundingSphereRadius(radius);
      setIsLoading(false);
    }, []);

    // Reset camera
    const resetCamera = useCallback(() => {
      setCameraPosition(initialCameraRef.current.position.clone());
      setCameraTarget(initialCameraRef.current.target.clone());
      setResetTrigger(prev => prev + 1);
    }, []);

    useImperativeHandle(ref, () => ({
      resetCamera,
    }));

    useEffect(() => {
      (window as any).__resetSTLCamera = resetCamera;
      return () => {
        delete (window as any).__resetSTLCamera;
      };
    }, [resetCamera]);

    return (
      <div className="relative w-full h-full overflow-hidden">
        <Canvas
          key={resetTrigger}
          shadows="soft"
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          camera={{ position: [0, 0, 5], fov: 50, near: 0.01, far: 100000 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0); // transparent background for gradient
          }}
        >
          <GradientBackground />

          {/* Environment for realistic reflections */}
          <Environment preset="city" background={false} environmentIntensity={0.6} />

          {/* Lighting dynamically adapted to model size */}
          <Lighting boundingSphereRadius={boundingSphereRadius} />

          <Suspense fallback={null}>
            {vertices && normals && (
              <STLModel
                ref={meshRef}
                vertices={vertices}
                normals={normals}
                onBoundsCalculated={handleBoundsCalculated}
              />
            )}
          </Suspense>

          {/* Camera with zoom clamping and dynamic near/far */}
          <CameraController
            initialPosition={cameraPosition}
            initialTarget={cameraTarget}
            boundingSphereRadius={boundingSphereRadius}
            resetTrigger={resetTrigger}
          />
        </Canvas>

        {isLoading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg px-6 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-gray-700">Preparing model...</span>
              </div>
            </div>
          </div>
        )}

        {showStats && stats.triangles > 0 && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg px-4 py-2 text-xs font-mono shadow-lg">
            <div className="text-gray-600">
              Triangles:{' '}
              <span className="text-gray-900 font-semibold">{stats.triangles.toLocaleString()}</span>
            </div>
            <div className="text-gray-600">
              Vertices:{' '}
              <span className="text-gray-900 font-semibold">{stats.vertices.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

STLViewer.displayName = 'STLViewer';