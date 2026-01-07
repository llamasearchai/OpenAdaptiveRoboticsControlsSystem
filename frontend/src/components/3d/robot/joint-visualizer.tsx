'use client';

import * as React from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robot';
import { useSceneStore } from '@/stores/scene';

export interface JointVisualizerProps {
  position: [number, number, number];
  color: string;
  jointIndex: number;
  showLimits?: boolean;
  size?: number;
}

export function JointVisualizer({
  position,
  color,
  jointIndex,
  showLimits = false,
  size = 0.04,
}: JointVisualizerProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  const { jointPositions, jointLimits } = useRobotStore();
  const { selectedObjects, selectObject } = useSceneStore();

  const isSelected = selectedObjects.some((o) => o.id === `joint-${jointIndex}` && o.type === 'joint');
  const jointAngle = jointPositions[jointIndex] ?? 0;
  const limitsMin = jointLimits.pos_min[jointIndex] ?? -Math.PI;
  const limitsMax = jointLimits.pos_max[jointIndex] ?? Math.PI;

  // Calculate limit proximity (0 = at limit, 1 = at center)
  const limitProximity = React.useMemo(() => {
    const range = limitsMax - limitsMin;
    const center = (limitsMax + limitsMin) / 2;
    const distFromCenter = Math.abs(jointAngle - center);
    return 1 - (distFromCenter / (range / 2));
  }, [jointAngle, limitsMin, limitsMax]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isSelected) {
      selectObject(null);
    } else {
      selectObject({ id: `joint-${jointIndex}`, type: 'joint', name: `Joint ${jointIndex + 1}` });
    }
  };

  // Color based on limit proximity
  const displayColor = React.useMemo(() => {
    if (limitProximity < 0.1) return '#ef4444'; // Red - very close to limit
    if (limitProximity < 0.3) return '#f97316'; // Orange - approaching limit
    return color;
  }, [limitProximity, color]);

  return (
    <group position={position}>
      {/* Joint sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={isSelected || hovered ? displayColor : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.5, size * 1.8, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, size * 3, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-background/95 border rounded-md px-2 py-1 shadow-lg backdrop-blur-sm">
            <div className="text-xs font-medium">Joint {jointIndex + 1}</div>
            <div className="text-xs text-muted-foreground">
              {(jointAngle * (180 / Math.PI)).toFixed(1)}°
            </div>
            {showLimits && (
              <div className="text-xs text-muted-foreground">
                [{(limitsMin * (180 / Math.PI)).toFixed(0)}°,{' '}
                {(limitsMax * (180 / Math.PI)).toFixed(0)}°]
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
