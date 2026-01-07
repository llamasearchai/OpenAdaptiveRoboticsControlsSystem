'use client';

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robot';
import { JointVisualizer } from './joint-visualizer';
import { EndEffector } from './end-effector';
import { JointLimitsIndicator } from './joint-limits-indicator';

export interface RobotArmProps {
  jointPositions?: number[];
  linkLengths?: number[];
  jointColors?: string[];
  showJointLimits?: boolean;
  showEndEffector?: boolean;
  opacity?: number;
  wireframe?: boolean;
  isGhost?: boolean;
}

// Default 7-DOF arm configuration (similar to Franka Emika Panda)
const DEFAULT_LINK_LENGTHS = [0.333, 0, 0.316, 0.0825, 0.384, 0, 0.088];
const DEFAULT_JOINT_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

/**
 * 7-DOF Robot Arm visualization using simplified cylinder/box geometry.
 *
 * Joint configuration (DH-like):
 * - Joint 1: Base rotation (Z-axis)
 * - Joint 2: Shoulder pitch (Y-axis)
 * - Joint 3: Upper arm rotation (Z-axis)
 * - Joint 4: Elbow pitch (Y-axis)
 * - Joint 5: Forearm rotation (Z-axis)
 * - Joint 6: Wrist pitch (Y-axis)
 * - Joint 7: Wrist rotation (Z-axis)
 */
export function RobotArm({
  jointPositions: externalPositions,
  linkLengths = DEFAULT_LINK_LENGTHS,
  jointColors = DEFAULT_JOINT_COLORS,
  showJointLimits = false,
  showEndEffector = true,
  opacity = 1,
  wireframe = false,
  isGhost = false,
}: RobotArmProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const storePositions = useRobotStore((state) => state.jointPositions);

  const jointPositions = externalPositions || storePositions;

  // Helper accessors with safe defaults
  const getAngle = (i: number) => currentAngles.current[i] ?? 0;
  const getColor = (i: number) => jointColors[i] ?? '#888888';
  const getLength = (i: number) => linkLengths[i] ?? 0.1;

  // Smooth interpolation for joint angles
  const targetAngles = React.useRef<number[]>([...jointPositions]);
  const currentAngles = React.useRef<number[]>([...jointPositions]);

  React.useEffect(() => {
    targetAngles.current = [...jointPositions];
  }, [jointPositions]);

  useFrame((_, delta) => {
    // Smooth interpolation
    const lerpFactor = Math.min(1, delta * 10);
    for (let i = 0; i < 7; i++) {
      const current = currentAngles.current[i] ?? 0;
      const target = targetAngles.current[i] ?? 0;
      currentAngles.current[i] = THREE.MathUtils.lerp(current, target, lerpFactor);
    }
  });

  const material = React.useMemo(
    () => (
      <meshStandardMaterial
        color={isGhost ? '#6b7280' : '#e5e7eb'}
        transparent={opacity < 1 || isGhost}
        opacity={isGhost ? 0.4 : opacity}
        wireframe={wireframe}
        metalness={0.3}
        roughness={0.7}
      />
    ),
    [opacity, wireframe, isGhost]
  );

  return (
    <group ref={groupRef}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.1, 32]} />
        {material}
      </mesh>

      {/* Joint 1 - Base rotation */}
      <group rotation={[0, getAngle(0), 0]}>
        <JointVisualizer
          position={[0, 0.1, 0]}
          color={getColor(0)}
          jointIndex={0}
          showLimits={showJointLimits}
        />

        {/* Link 1 */}
        <mesh position={[0, 0.1 + getLength(0) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, getLength(0), 16]} />
          {material}
        </mesh>

        {/* Joint 2 - Shoulder pitch */}
        <group position={[0, 0.1 + getLength(0), 0]}>
          <group rotation={[getAngle(1), 0, 0]}>
            <JointVisualizer
              position={[0, 0, 0]}
              color={getColor(1)}
              jointIndex={1}
              showLimits={showJointLimits}
            />

            {/* Link 2 (short connector) */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.1, 0.08, 0.1]} />
              {material}
            </mesh>

            {/* Joint 3 - Upper arm rotation */}
            <group position={[0, 0.08, 0]}>
              <group rotation={[0, getAngle(2), 0]}>
                <JointVisualizer
                  position={[0, 0, 0]}
                  color={getColor(2)}
                  jointIndex={2}
                  showLimits={showJointLimits}
                />

                {/* Link 3 */}
                <mesh position={[0, getLength(2) / 2, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, getLength(2), 16]} />
                  {material}
                </mesh>

                {/* Joint 4 - Elbow pitch */}
                <group position={[0, getLength(2), 0]}>
                  <group rotation={[getAngle(3), 0, 0]}>
                    <JointVisualizer
                      position={[0, 0, 0]}
                      color={getColor(3)}
                      jointIndex={3}
                      showLimits={showJointLimits}
                    />

                    {/* Link 4 (elbow connector) */}
                    <mesh position={[getLength(3) / 2, 0, 0]} castShadow>
                      <boxGeometry args={[getLength(3), 0.08, 0.08]} />
                      {material}
                    </mesh>

                    {/* Joint 5 - Forearm rotation */}
                    <group position={[getLength(3), 0, 0]}>
                      <group rotation={[0, getAngle(4), 0]}>
                        <JointVisualizer
                          position={[0, 0, 0]}
                          color={getColor(4)}
                          jointIndex={4}
                          showLimits={showJointLimits}
                        />

                        {/* Link 5 */}
                        <mesh position={[0, getLength(4) / 2, 0]} castShadow>
                          <cylinderGeometry args={[0.04, 0.04, getLength(4), 16]} />
                          {material}
                        </mesh>

                        {/* Joint 6 - Wrist pitch */}
                        <group position={[0, getLength(4), 0]}>
                          <group rotation={[getAngle(5), 0, 0]}>
                            <JointVisualizer
                              position={[0, 0, 0]}
                              color={getColor(5)}
                              jointIndex={5}
                              showLimits={showJointLimits}
                            />

                            {/* Link 6 (short) */}
                            <mesh position={[0, 0.03, 0]} castShadow>
                              <boxGeometry args={[0.06, 0.06, 0.06]} />
                              {material}
                            </mesh>

                            {/* Joint 7 - Wrist rotation */}
                            <group position={[0, 0.06, 0]}>
                              <group rotation={[0, getAngle(6), 0]}>
                                <JointVisualizer
                                  position={[0, 0, 0]}
                                  color={getColor(6)}
                                  jointIndex={6}
                                  showLimits={showJointLimits}
                                />

                                {/* Link 7 (flange) */}
                                <mesh position={[0, getLength(6) / 2, 0]} castShadow>
                                  <cylinderGeometry args={[0.03, 0.04, getLength(6), 16]} />
                                  {material}
                                </mesh>

                                {/* End Effector */}
                                {showEndEffector && (
                                  <EndEffector position={[0, getLength(6), 0]} />
                                )}
                              </group>
                            </group>
                          </group>
                        </group>
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Joint limits indicators */}
      {showJointLimits && <JointLimitsIndicator />}
    </group>
  );
}
