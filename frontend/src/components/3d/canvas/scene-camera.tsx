'use client';

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/scene';

export interface SceneCameraProps {
  preset?: 'default' | 'top' | 'front' | 'side' | 'isometric';
  enableOrbit?: boolean;
  minDistance?: number;
  maxDistance?: number;
}

const cameraPresets = {
  default: { position: [3, 2, 3] as const, target: [0, 0.5, 0] as const },
  top: { position: [0, 5, 0] as const, target: [0, 0, 0] as const },
  front: { position: [0, 1, 4] as const, target: [0, 0.5, 0] as const },
  side: { position: [4, 1, 0] as const, target: [0, 0.5, 0] as const },
  isometric: { position: [3, 3, 3] as const, target: [0, 0.5, 0] as const },
} as const;

export function SceneCamera({
  preset = 'default',
  enableOrbit = true,
  minDistance = 1,
  maxDistance = 20,
}: SceneCameraProps) {
  const cameraRef = React.useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = React.useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera: cameraState, setCamera } = useSceneStore();

  const presetConfig = cameraPresets[preset];

  // Sync camera position with store
  useFrame(() => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      const ctrlTarget = (ctrl as unknown as { target: THREE.Vector3 }).target;

      // Only update if significantly changed to avoid excessive re-renders
      const posChanged =
        Math.abs(cam.position.x - cameraState.position.x) > 0.01 ||
        Math.abs(cam.position.y - cameraState.position.y) > 0.01 ||
        Math.abs(cam.position.z - cameraState.position.z) > 0.01;
      const targetChanged =
        Math.abs(ctrlTarget.x - cameraState.target.x) > 0.01 ||
        Math.abs(ctrlTarget.y - cameraState.target.y) > 0.01 ||
        Math.abs(ctrlTarget.z - cameraState.target.z) > 0.01;

      if (posChanged || targetChanged) {
        setCamera({
          position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
          target: { x: ctrlTarget.x, y: ctrlTarget.y, z: ctrlTarget.z },
        });
      }
    }
  });

  // Apply external camera changes
  React.useEffect(() => {
    if (controlsRef.current) {
      const ctrl = controlsRef.current as unknown as { target: THREE.Vector3 };
      ctrl.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
    }
  }, [cameraState.target]);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={cameraState.fov}
        near={cameraState.near}
        far={cameraState.far}
        position={presetConfig.position as [number, number, number]}
      />
      {enableOrbit && (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.1}
          minDistance={minDistance}
          maxDistance={maxDistance}
          target={presetConfig.target as [number, number, number]}
          maxPolarAngle={Math.PI * 0.85}
        />
      )}
    </>
  );
}
