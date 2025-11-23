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

  const pinchDistanceRef = useRef(0);

  // Initialize camera based on initial position and target
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

    camera.near = Math.max(0.1, boundingSphereRadius * 0.001);
    camera.far = boundingSphereRadius * 10;
    camera.position.copy(initialPosition);
    camera.lookAt(initialTarget);
    camera.updateProjectionMatrix();
    invalidate();
  }, [initialPosition, initialTarget, camera, boundingSphereRadius, resetTrigger, invalidate]);

  // Smooth frame update
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

    const rotationSpeed = 0.005;
    const zoomSpeed = 0.001;

    const handlePointerDown = (x: number, y: number) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x, y };
      canvas.style.cursor = 'grabbing';
    };

    const handlePointerMove = (x: number, y: number) => {
      if (!isDraggingRef.current) return;
      const deltaX = x - previousMouseRef.current.x;
      const deltaY = y - previousMouseRef.current.y;

      targetThetaRef.current += deltaX * rotationSpeed;
      targetPhiRef.current = Math.max(0.01, Math.min(Math.PI - 0.01, targetPhiRef.current - deltaY * rotationSpeed));

      previousMouseRef.current = { x, y };
      needsUpdateRef.current = true;
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (deltaY: number) => {
      const delta = deltaY * zoomSpeed * targetRadiusRef.current;
      targetRadiusRef.current = Math.min(maxZoom, Math.max(minZoom, targetRadiusRef.current + delta));
      needsUpdateRef.current = true;
      invalidate();
    };

    // Mouse events
    const mouseDown = (e: MouseEvent) => e.button === 0 && handlePointerDown(e.clientX, e.clientY);
    const mouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const mouseUp = () => handlePointerUp();
    const wheel = (e: WheelEvent) => { e.preventDefault(); handleWheel(e.deltaY); };

    canvas.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('wheel', wheel, { passive: false });

    // Touch events
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = pinchDistanceRef.current - distance;
        handleWheel(delta);
        pinchDistanceRef.current = distance;
      }
    };

    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) handlePointerUp();
    };

    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });

    // Context menu disable
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
      canvas.removeEventListener('wheel', wheel);

      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchmove', touchMove);
      canvas.removeEventListener('touchend', touchEnd);
      canvas.removeEventListener('touchcancel', touchEnd);

      canvas.style.cursor = 'default';
    };
  }, [gl, invalidate, maxZoom, minZoom]);

  return null;
}
