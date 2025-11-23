import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraControllerProps {
  initialPosition: THREE.Vector3;
  initialTarget: THREE.Vector3;
  boundingSphereRadius?: number;
  resetTrigger?: number;
}

export function CameraController({
  initialPosition,
  initialTarget,
  boundingSphereRadius = 50,
  resetTrigger
}: CameraControllerProps) {
  const { camera, gl, invalidate } = useThree();
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef(initialTarget.clone());

  const currentThetaRef = useRef(0);
  const currentPhiRef = useRef(Math.PI / 4);
  const currentRadiusRef = useRef(5);

  const targetThetaRef = useRef(0);
  const targetPhiRef = useRef(Math.PI / 4);
  const targetRadiusRef = useRef(5);

  const needsUpdateRef = useRef(false);
  const dampingFactor = 0.15;

  const maxZoom = boundingSphereRadius * 20;
  const minZoom = Math.max(0.1, boundingSphereRadius * 0.01);

  useEffect(() => {
    const offset = new THREE.Vector3().subVectors(initialPosition, initialTarget);
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

    targetRef.current.copy(initialTarget);

    // Dynamic near/far based on model size
    camera.near = Math.max(0.1, boundingSphereRadius * 0.001);
    camera.far = boundingSphereRadius * 10;
    camera.position.copy(initialPosition);
    camera.lookAt(initialTarget);
    camera.updateProjectionMatrix();
    invalidate();
  }, [initialPosition, initialTarget, camera, boundingSphereRadius, resetTrigger, invalidate]);

  useFrame(() => {
    if (!needsUpdateRef.current) return;

    currentThetaRef.current += (targetThetaRef.current - currentThetaRef.current) * dampingFactor;
    currentPhiRef.current += (targetPhiRef.current - currentPhiRef.current) * dampingFactor;
    currentRadiusRef.current += (targetRadiusRef.current - currentRadiusRef.current) * dampingFactor;

    const x = currentRadiusRef.current * Math.sin(currentPhiRef.current) * Math.cos(currentThetaRef.current);
    const y = currentRadiusRef.current * Math.cos(currentPhiRef.current);
    const z = currentRadiusRef.current * Math.sin(currentPhiRef.current) * Math.sin(currentThetaRef.current);

    camera.position.set(targetRef.current.x + x, targetRef.current.y + y, targetRef.current.z + z);
    camera.lookAt(targetRef.current);
    camera.updateProjectionMatrix();

    if (
      Math.abs(targetThetaRef.current - currentThetaRef.current) < 0.001 &&
      Math.abs(targetPhiRef.current - currentPhiRef.current) < 0.001 &&
      Math.abs(targetRadiusRef.current - currentRadiusRef.current) < 0.01
    ) {
      needsUpdateRef.current = false;
    }

    invalidate();
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;
      const rotationSpeed = 0.005;

      targetThetaRef.current += deltaX * rotationSpeed;
      targetPhiRef.current = Math.max(0.01, Math.min(Math.PI - 0.01, targetPhiRef.current - deltaY * rotationSpeed));

      needsUpdateRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const delta = e.deltaY * zoomSpeed * targetRadiusRef.current;
      targetRadiusRef.current = Math.min(maxZoom, Math.max(minZoom, targetRadiusRef.current + delta));
      needsUpdateRef.current = true;
      invalidate();
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

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
  }, [gl, invalidate, maxZoom, minZoom]);

  return null;
}