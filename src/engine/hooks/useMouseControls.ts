import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface UseMouseControlsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  camera: THREE.PerspectiveCamera | null;
  target: THREE.Vector3;
  onCameraChange: () => void;
  initialPosition?: THREE.Vector3;
  dampingFactor?: number; // 0-1, higher = faster response
}

export function useMouseControls({
  canvasRef,
  camera,
  target,
  onCameraChange,
  initialPosition,
  dampingFactor = 0.15,
}: UseMouseControlsProps) {
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  
  // Current position (smoothed)
  const currentThetaRef = useRef(0);
  const currentPhiRef = useRef(Math.PI / 4);
  const currentRadiusRef = useRef(5);
  
  // Target position (immediate)
  const targetThetaRef = useRef(0);
  const targetPhiRef = useRef(Math.PI / 4);
  const targetRadiusRef = useRef(5);
  
  const isInitializedRef = useRef(false);
  const animationFrameRef = useRef<number>();

  // Initialize spherical coordinates from camera position
  useEffect(() => {
    if (!camera || isInitializedRef.current) return;

    const position = initialPosition || camera.position;
    const offset = new THREE.Vector3().subVectors(position, target);
    const radius = offset.length();

    if (radius > 0) {
      const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
      const theta = Math.atan2(offset.z, offset.x);
      
      currentThetaRef.current = theta;
      currentPhiRef.current = phi;
      currentRadiusRef.current = radius;
      
      targetThetaRef.current = theta;
      targetPhiRef.current = phi;
      targetRadiusRef.current = radius;
    }

    isInitializedRef.current = true;
  }, [camera, target, initialPosition]);

  // Smooth animation loop
  const animate = useCallback(() => {
    if (!camera) return;

    // Lerp current values towards target values
    currentThetaRef.current += (targetThetaRef.current - currentThetaRef.current) * dampingFactor;
    currentPhiRef.current += (targetPhiRef.current - currentPhiRef.current) * dampingFactor;
    currentRadiusRef.current += (targetRadiusRef.current - currentRadiusRef.current) * dampingFactor;

    // Convert spherical to Cartesian coordinates
    const x = currentRadiusRef.current * Math.sin(currentPhiRef.current) * Math.cos(currentThetaRef.current);
    const y = currentRadiusRef.current * Math.cos(currentPhiRef.current);
    const z = currentRadiusRef.current * Math.sin(currentPhiRef.current) * Math.sin(currentThetaRef.current);

    camera.position.set(target.x + x, target.y + y, target.z + z);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    onCameraChange();

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [camera, target, onCameraChange, dampingFactor]);

  // Start/stop animation loop
  useEffect(() => {
    if (!camera) return;
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [camera, animate]);

  // Reset function
  const reset = useCallback((newPosition?: THREE.Vector3, newTarget?: THREE.Vector3) => {
    if (!camera) return;

    const resetTarget = newTarget || target;
    const resetPosition = newPosition || camera.position;
    
    const offset = new THREE.Vector3().subVectors(resetPosition, resetTarget);
    const radius = offset.length();

    if (radius > 0) {
      const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
      const theta = Math.atan2(offset.z, offset.x);
      
      currentThetaRef.current = theta;
      currentPhiRef.current = phi;
      currentRadiusRef.current = radius;
      
      targetThetaRef.current = theta;
      targetPhiRef.current = phi;
      targetRadiusRef.current = radius;
    }

    camera.position.copy(resetPosition);
    camera.lookAt(resetTarget);
    camera.updateProjectionMatrix();
    onCameraChange();
  }, [camera, target, onCameraChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left mouse button
      
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;

      // Update target values for smooth interpolation
      const rotationSpeed = 0.005;
      targetThetaRef.current += deltaX * rotationSpeed;
      targetPhiRef.current = Math.max(
        0.01,
        Math.min(Math.PI - 0.01, targetPhiRef.current - deltaY * rotationSpeed)
      );

      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Adaptive zoom speed
      const zoomSpeed = 0.001;
      const delta = e.deltaY * zoomSpeed * targetRadiusRef.current;
      targetRadiusRef.current = Math.max(0.5, targetRadiusRef.current + delta);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Set initial cursor
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.style.cursor = 'default';
    };
  }, [canvasRef, camera]);

  return { 
    currentTheta: currentThetaRef.current,
    currentPhi: currentPhiRef.current,
    currentRadius: currentRadiusRef.current,
    reset 
  };
}