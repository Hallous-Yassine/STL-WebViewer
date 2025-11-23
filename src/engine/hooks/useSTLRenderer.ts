import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface UseSTLRendererOptions {
  modelCenter?: THREE.Vector3;
  modelRadius?: number;
  distanceFactor?: number; // New: how close to start (0.0 - 1.0)
}

export function useSTLRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options?: UseSTLRendererOptions
) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initialize camera
    const fov = 50;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 10000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // Dynamic camera position based on model size
    if (options?.modelCenter && options.modelRadius) {
      const radius = options.modelRadius;
      const distanceFactor = options.distanceFactor ?? 0.5; // default closer
      const distance = radius / Math.sin(THREE.MathUtils.degToRad(fov / 2)) * distanceFactor;

      camera.position.set(
        options.modelCenter.x + distance,
        options.modelCenter.y + distance * 0.5,
        options.modelCenter.z + distance
      );
      camera.lookAt(options.modelCenter);
      camera.updateProjectionMatrix();
    } else {
      camera.position.set(0, 0, 5);
    }

    cameraRef.current = camera;

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, options?.modelCenter, options?.modelRadius, options?.distanceFactor]);

  return { rendererRef, sceneRef, cameraRef };
}