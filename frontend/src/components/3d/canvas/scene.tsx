'use client';

import * as React from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { cn } from '@/lib/utils';
import { SceneCamera } from './scene-camera';
import { SceneLighting } from './scene-lighting';
import { SceneEnvironment } from './scene-environment';
import { PostProcessing } from './post-processing';

export interface SceneProps extends Omit<CanvasProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  enablePostProcessing?: boolean;
  cameraPreset?: 'default' | 'top' | 'front' | 'side' | 'isometric';
}

export function Scene({
  children,
  className,
  showGrid = true,
  showAxes = true,
  enablePostProcessing = true,
  cameraPreset = 'default',
  ...props
}: SceneProps) {
  return (
    <div className={cn('relative w-full h-full min-h-[400px]', className)}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        {...props}
      >
        <SceneCamera preset={cameraPreset} />
        <SceneLighting />
        <SceneEnvironment showGrid={showGrid} showAxes={showAxes} />

        <React.Suspense fallback={null}>
          {children}
        </React.Suspense>

        {enablePostProcessing && <PostProcessing />}
        <Preload all />
      </Canvas>
    </div>
  );
}
