import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

interface LightingProps {
  boundingSphereRadius?: number;
}

export function Lighting({ boundingSphereRadius = 50 }: LightingProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();

  useEffect(() => {
    if (lightRef.current) {
      const r = boundingSphereRadius;

      lightRef.current.shadow.camera.left = -r;
      lightRef.current.shadow.camera.right = r;
      lightRef.current.shadow.camera.top = r;
      lightRef.current.shadow.camera.bottom = -r;
      lightRef.current.shadow.camera.near = 0.5;
      lightRef.current.shadow.camera.far = r * 2;
      lightRef.current.shadow.needsUpdate = true;
    }
  }, [boundingSphereRadius]);

  return (
    <>
      <hemisphereLight args={['#d9d9d9', '#2a2a2a', 0.22]} />
      <ambientLight intensity={0.12} color="#cccccc" />
      <directionalLight
        ref={lightRef}
        position={[10, 10, 6]}
        intensity={0.9}
        color="#e5e5e5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  );
}
