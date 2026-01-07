'use client';

import * as React from 'react';
import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';

export interface SceneEnvironmentProps {
  showGrid?: boolean;
  showAxes?: boolean;
  gridSize?: number;
  gridDivisions?: number;
}

export function SceneEnvironment({
  showGrid = true,
  showAxes = true,
  gridSize = 10,
  gridDivisions = 20,
}: SceneEnvironmentProps) {
  return (
    <>
      {/* Ground plane with grid */}
      {showGrid && (
        <>
          <Grid
            args={[gridSize, gridSize]}
            cellSize={gridSize / gridDivisions}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#374151"
            fadeDistance={25}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />
          {/* Shadow-receiving ground */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.001, 0]}
            receiveShadow
          >
            <planeGeometry args={[50, 50]} />
            <shadowMaterial transparent opacity={0.2} />
          </mesh>
        </>
      )}

      {/* Axes helper / Gizmo */}
      {showAxes && (
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="black"
          />
        </GizmoHelper>
      )}
    </>
  );
}
