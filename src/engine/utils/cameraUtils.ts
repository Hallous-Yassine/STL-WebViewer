import * as THREE from 'three';

export function calculateCameraFraming(
  center: THREE.Vector3,
  radius: number,
  fov: number = 50
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const safeRadius = Math.max(radius, 0.0001);
  const fovRad = (fov * Math.PI) / 180;
  
  // Calculate distance to fit the entire object in view
  // Reduced padding factor for closer view (1.2 instead of 2.0)
  // Lower values = closer camera, higher values = further away
  const distance = safeRadius / Math.tan(fovRad / 2) * 1.2;

  // Position camera at an angle that shows the object well
  // Normalize the direction vector for consistent framing
  const dirX = 0.5;
  const dirY = 0.5;
  const dirZ = 0.8;
  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  
  const position = new THREE.Vector3(
    center.x + (dirX / magnitude) * distance,
    center.y + (dirY / magnitude) * distance,
    center.z + (dirZ / magnitude) * distance
  );

  return {
    position,
    target: center.clone(),
  };
}

export function sphericalToCartesian(
  theta: number,
  phi: number,
  radius: number,
  center: THREE.Vector3
): THREE.Vector3 {
  // Convert spherical coordinates to Cartesian
  // theta: azimuthal angle (rotation around Y axis)
  // phi: polar angle (angle from positive Y axis)
  // radius: distance from center
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(center.x + x, center.y + y, center.z + z);
}

export function cartesianToSpherical(
  position: THREE.Vector3,
  center: THREE.Vector3
): { theta: number; phi: number; radius: number } {
  const offset = new THREE.Vector3().subVectors(position, center);
  const radius = offset.length();
  
  if (radius === 0) {
    return { theta: 0, phi: 0, radius: 0 };
  }
  
  const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
  const theta = Math.atan2(offset.z, offset.x);
  
  return { theta, phi, radius };
}