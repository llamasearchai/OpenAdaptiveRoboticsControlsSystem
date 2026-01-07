'use client';

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robot';

export interface EndEffectorProps {
  position: [number, number, number];
  type?: 'gripper' | 'suction' | 'tool';
}

export function EndEffector({
  position,
  type = 'gripper',
}: EndEffectorProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const gripperState = useRobotStore((state) => state.gripperState);

  // Animate gripper opening/closing
  const targetOpening = gripperState === 'open' ? 0.04 : 0.01;
  const currentOpening = React.useRef(targetOpening);

  useFrame((_, delta) => {
    currentOpening.current = THREE.MathUtils.lerp(
      currentOpening.current,
      targetOpening,
      delta * 8
    );

    if (groupRef.current) {
      // Update finger positions
      const leftFinger = groupRef.current.children[1] as THREE.Mesh;
      const rightFinger = groupRef.current.children[2] as THREE.Mesh;

      if (leftFinger && rightFinger) {
        leftFinger.position.x = -currentOpening.current;
        rightFinger.position.x = currentOpening.current;
      }
    }
  });

  if (type === 'gripper') {
    return (
      <group ref={groupRef} position={position}>
        {/* Gripper base */}
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.02, 0.03]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Left finger */}
        <mesh position={[-0.03, -0.03, 0]} castShadow>
          <boxGeometry args={[0.015, 0.06, 0.02]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Right finger */}
        <mesh position={[0.03, -0.03, 0]} castShadow>
          <boxGeometry args={[0.015, 0.06, 0.02]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Finger tips */}
        <mesh position={[-currentOpening.current, -0.055, 0]} castShadow>
          <boxGeometry args={[0.01, 0.02, 0.025]} />
          <meshStandardMaterial color="#f97316" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[currentOpening.current, -0.055, 0]} castShadow>
          <boxGeometry args={[0.01, 0.02, 0.025]} />
          <meshStandardMaterial color="#f97316" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    );
  }

  if (type === 'suction') {
    return (
      <group position={position}>
        {/* Suction cup base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Suction cup */}
        <mesh position={[0, -0.02, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.015, 0.015, 16]} />
          <meshStandardMaterial color="#6b7280" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  // Default tool mount
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.03, 16]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
