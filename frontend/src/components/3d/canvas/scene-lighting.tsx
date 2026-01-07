'use client';

import * as React from 'react';
import { useSceneStore } from '@/stores/scene';

export interface SceneLightingProps {
  preset?: 'default' | 'studio' | 'outdoor' | 'dramatic';
}

const lightingPresets = {
  default: {
    ambient: { intensity: 0.4 },
    key: { position: [5, 5, 5] as const, intensity: 1.0 },
    fill: { position: [-5, 3, -5] as const, intensity: 0.3 },
    back: { position: [0, 3, -5] as const, intensity: 0.2 },
  },
  studio: {
    ambient: { intensity: 0.5 },
    key: { position: [3, 4, 3] as const, intensity: 1.2 },
    fill: { position: [-3, 2, -2] as const, intensity: 0.5 },
    back: { position: [0, 4, -4] as const, intensity: 0.4 },
  },
  outdoor: {
    ambient: { intensity: 0.6 },
    key: { position: [10, 10, 5] as const, intensity: 1.5 },
    fill: { position: [-5, 5, 0] as const, intensity: 0.2 },
    back: { position: [0, 2, -8] as const, intensity: 0.1 },
  },
  dramatic: {
    ambient: { intensity: 0.2 },
    key: { position: [2, 6, 2] as const, intensity: 1.5 },
    fill: { position: [-4, 2, 0] as const, intensity: 0.1 },
    back: { position: [0, 3, -3] as const, intensity: 0.3 },
  },
};

export function SceneLighting({ preset = 'default' }: SceneLightingProps) {
  const lightingSettings = useSceneStore((state) => state.lightingSettings);
  const config = lightingPresets[preset];

  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight
        intensity={config.ambient.intensity * lightingSettings.ambientIntensity}
        color="#ffffff"
      />

      {/* Key light - main light source */}
      <directionalLight
        position={config.key.position}
        intensity={config.key.intensity * lightingSettings.directionalIntensity}
        color="#ffffff"
        castShadow={lightingSettings.shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Fill light - softens shadows */}
      <directionalLight
        position={config.fill.position}
        intensity={config.fill.intensity * lightingSettings.directionalIntensity}
        color="#e0e8ff"
      />

      {/* Back/rim light - separates subject from background */}
      <directionalLight
        position={config.back.position}
        intensity={config.back.intensity * lightingSettings.directionalIntensity}
        color="#fff8e0"
      />
    </>
  );
}
