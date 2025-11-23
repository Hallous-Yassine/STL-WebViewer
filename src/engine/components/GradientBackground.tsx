import * as THREE from 'three';
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';

export function GradientBackground() {
  const { viewport } = useThree();
  
  const shader = useMemo(() => ({
    uniforms: {
      topColor: { value: new THREE.Color(0xe8f4ff) },    // Light blue
      bottomColor: { value: new THREE.Color(0xffffff) }, // Pure white
      offset: { value: 0.4 },
      exponent: { value: 0.8 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      
      varying vec2 vUv;
      
      void main() {
        float h = normalize(vUv.y + offset).x;
        vec3 color = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }), []);

  return (
    <mesh 
      position={[0, 0, -100]} 
      scale={[viewport.width * 2, viewport.height * 2, 1]}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={shader.uniforms}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}