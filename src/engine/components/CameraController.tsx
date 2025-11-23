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

  const isDragging = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const target = useRef(initialTarget.clone());

  // spherical coordinates
  const theta = useRef(0);
  const phi = useRef(Math.PI / 4);
  const radius = useRef(5);

  const tTheta = useRef(0);
  const tPhi = useRef(Math.PI / 4);
  const tRadius = useRef(5);

  const needsUpdate = useRef(false);

  const damping = 0.12;

  const maxZoom = boundingSphereRadius * 20;
  const minZoom = Math.max(0.1, boundingSphereRadius * 0.01);

  const pinch = useRef(0);

  /** Initialize */
  useEffect(() => {
    const off = new THREE.Vector3().subVectors(initialPosition, initialTarget);
    const r = off.length();

    if (r > 0) {
      const p = Math.acos(Math.min(1, Math.max(-1, off.y / r)));
      const t = Math.atan2(off.z, off.x);

      theta.current = t;
      phi.current = p;
      radius.current = r;

      tTheta.current = t;
      tPhi.current = p;
      tRadius.current = r;
    }

    target.current.copy(initialTarget);

    camera.near = Math.max(0.1, boundingSphereRadius * 0.001);
    camera.far = boundingSphereRadius * 10;
    camera.position.copy(initialPosition);
    camera.lookAt(initialTarget);
    camera.updateProjectionMatrix();
    invalidate();
  }, [initialPosition, initialTarget, camera, boundingSphereRadius, resetTrigger, invalidate]);

  /** Smooth frame update */
  useFrame(() => {
    if (!needsUpdate.current) return;

    theta.current += (tTheta.current - theta.current) * damping;
    phi.current += (tPhi.current - phi.current) * damping;
    radius.current += (tRadius.current - radius.current) * damping;

    const x = radius.current * Math.sin(phi.current) * Math.cos(theta.current);
    const y = radius.current * Math.cos(phi.current);
    const z = radius.current * Math.sin(phi.current) * Math.sin(theta.current);

    camera.position.set(target.current.x + x, target.current.y + y, target.current.z + z);
    camera.lookAt(target.current);
    camera.updateProjectionMatrix();

    invalidate();
  });

  /** Interaction */
  useEffect(() => {
    const canvas = gl.domElement;

    const ROT_SPEED = 0.003;
    const ZOOM_SPEED = 0.002;

    const startDrag = (x: number, y: number) => {
      isDragging.current = true;
      prev.current = { x, y };
      canvas.style.cursor = "grabbing";
    };

    const moveDrag = (x: number, y: number) => {
      if (!isDragging.current) return;

      const dx = x - prev.current.x;
      const dy = y - prev.current.y;

      tTheta.current += dx * ROT_SPEED;
      tPhi.current = Math.max(0.05, Math.min(Math.PI - 0.05, tPhi.current - dy * ROT_SPEED));

      prev.current = { x, y };
      needsUpdate.current = true;
    };

    const stopDrag = () => {
      isDragging.current = false;
      canvas.style.cursor = "grab";
    };

    const zoom = (d: number) => {
      const delta = d * ZOOM_SPEED * tRadius.current;
      tRadius.current = Math.max(minZoom, Math.min(maxZoom, tRadius.current + delta));
      needsUpdate.current = true;
    };

    /** Mouse */
    const onMouseDown = (e: MouseEvent) => e.button === 0 && startDrag(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => stopDrag();
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY);
    };

    /** Touch */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinch.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging.current) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        zoom(pinch.current - dist);
        pinch.current = dist;
      }
      e.preventDefault();
    };

    const onTouchEnd = () => stopDrag();

    /** Add listeners */
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    canvas.style.cursor = "grab";

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);

      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);

      canvas.style.cursor = "default";
    };
  }, [gl, minZoom, maxZoom]);

  return null;
}
