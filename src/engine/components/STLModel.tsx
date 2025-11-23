import { forwardRef, useMemo, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface STLModelProps {
  vertices: Float32Array;
  normals: Float32Array;
  onBoundsCalculated?: (center: THREE.Vector3, radius: number) => void;
}

export const STLModel = forwardRef<THREE.Mesh, STLModelProps>(
  ({ vertices, normals, onBoundsCalculated }, ref) => {
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const isProcessingRef = useRef(false);

    // Process geometry asynchronously to avoid UI freeze
    useEffect(() => {
      if (!vertices || !normals || isProcessingRef.current) return;

      isProcessingRef.current = true;

      // Break the work into async chunks
      const processGeometry = async () => {
        // Yield to browser between operations
        await new Promise(resolve => setTimeout(resolve, 0));

        const geo = new THREE.BufferGeometry();
        
        // Set attributes
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

        // Yield again
        await new Promise(resolve => setTimeout(resolve, 0));

        // Compute bounds
        geo.computeBoundingSphere();
        geo.computeBoundingBox();

        // Callback with bounds
        if (geo.boundingSphere && onBoundsCalculated) {
          onBoundsCalculated(
            geo.boundingSphere.center.clone(),
            geo.boundingSphere.radius
          );
        }

        setGeometry(geo);
        isProcessingRef.current = false;
      };

      processGeometry();

      return () => {
        isProcessingRef.current = false;
      };
    }, [vertices, normals, onBoundsCalculated]);

    // Cleanup geometry on unmount
    useEffect(() => {
      return () => {
        if (geometry) {
          geometry.dispose();
        }
      };
    }, [geometry]);

    // Optimize rendering - only update matrix when needed
    useFrame(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.matrixAutoUpdate = false;
        // Update matrix once after geometry is loaded
        if (!ref.current.matrixWorldNeedsUpdate) {
          ref.current.updateMatrix();
        }
      }
    });

    if (!geometry) return null;

    return (
      <mesh 
        ref={ref} 
        geometry={geometry} 
        castShadow 
        receiveShadow
        frustumCulled={true}
        matrixAutoUpdate={false}
      >
        <meshStandardMaterial
          color="#8b9196"
          metalness={0.25}
          roughness={0.35}
          envMapIntensity={0.8}
          side={THREE.FrontSide}
          flatShading={false}
          polygonOffset={true}
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    );
  }
);

STLModel.displayName = 'STLModel';