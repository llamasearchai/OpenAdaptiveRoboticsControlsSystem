/**
 * Scene store for 3D visualization state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Vector3 } from '@/types';

/** Camera preset positions */
export type CameraPreset =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'isometric'
  | 'custom';

/** Camera state */
export interface CameraState {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  fov: number;
  near: number;
  far: number;
}

/** Selection mode */
export type SelectionMode = 'single' | 'multi' | 'none';

/** Selected object */
export interface SelectedObject {
  id: string;
  type: 'joint' | 'link' | 'target' | 'obstacle' | 'waypoint';
  name?: string;
}

/** Grid settings */
export interface GridSettings {
  visible: boolean;
  size: number;
  divisions: number;
  color1: string;
  color2: string;
}

/** Lighting settings */
export interface LightingSettings {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3;
  shadows: boolean;
  shadowMapSize: number;
}

/** Post-processing settings */
export interface PostProcessingSettings {
  enabled: boolean;
  bloom: boolean;
  bloomIntensity: number;
  ssao: boolean;
  ssaoIntensity: number;
  outline: boolean;
  outlineColor: string;
}

/** Scene store state */
export interface SceneState {
  // Camera
  camera: CameraState;
  cameraPreset: CameraPreset;
  orbitControlsEnabled: boolean;

  // Selection
  selectionMode: SelectionMode;
  selectedObjects: SelectedObject[];
  hoveredObject: SelectedObject | null;

  // Visibility
  showRobot: boolean;
  showWorkspace: boolean;
  showObstacles: boolean;
  showGrid: boolean;
  showAxes: boolean;
  showTrajectory: boolean;
  showWaypoints: boolean;
  showGhost: boolean;

  // Grid
  gridSettings: GridSettings;

  // Lighting
  lightingSettings: LightingSettings;

  // Post-processing
  postProcessing: PostProcessingSettings;

  // Performance
  pixelRatio: number;
  antialias: boolean;
  frameLimit: number;

  // Misc
  backgroundColor: string;
  showStats: boolean;
}

/** Scene store actions */
export interface SceneActions {
  // Camera
  setCamera: (camera: Partial<CameraState>) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  resetCamera: () => void;
  setOrbitControlsEnabled: (enabled: boolean) => void;

  // Selection
  setSelectionMode: (mode: SelectionMode) => void;
  selectObject: (object: SelectedObject | null) => void;
  addToSelection: (object: SelectedObject) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredObject: (object: SelectedObject | null) => void;

  // Visibility
  setShowRobot: (show: boolean) => void;
  setShowWorkspace: (show: boolean) => void;
  setShowObstacles: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShowTrajectory: (show: boolean) => void;
  setShowWaypoints: (show: boolean) => void;
  setShowGhost: (show: boolean) => void;
  toggleVisibility: (key: keyof Pick<SceneState,
    'showRobot' | 'showWorkspace' | 'showObstacles' | 'showGrid' |
    'showAxes' | 'showTrajectory' | 'showWaypoints' | 'showGhost'
  >) => void;

  // Grid
  setGridSettings: (settings: Partial<GridSettings>) => void;

  // Lighting
  setLightingSettings: (settings: Partial<LightingSettings>) => void;

  // Post-processing
  setPostProcessing: (settings: Partial<PostProcessingSettings>) => void;

  // Performance
  setPixelRatio: (ratio: number) => void;
  setAntialias: (enabled: boolean) => void;
  setFrameLimit: (limit: number) => void;

  // Misc
  setBackgroundColor: (color: string) => void;
  setShowStats: (show: boolean) => void;

  // Reset
  resetScene: () => void;
}

/** Camera preset positions */
const CAMERA_PRESETS: Record<CameraPreset, Partial<CameraState>> = {
  front: { position: { x: 0, y: 0, z: 3 }, target: { x: 0, y: 0, z: 0 } },
  back: { position: { x: 0, y: 0, z: -3 }, target: { x: 0, y: 0, z: 0 } },
  left: { position: { x: -3, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  right: { position: { x: 3, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  top: { position: { x: 0, y: 3, z: 0 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: -1 } },
  bottom: { position: { x: 0, y: -3, z: 0 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } },
  isometric: { position: { x: 2, y: 2, z: 2 }, target: { x: 0, y: 0, z: 0 } },
  custom: {},
};

/** Default camera state */
const DEFAULT_CAMERA: CameraState = {
  position: { x: 2, y: 1.5, z: 2 },
  target: { x: 0, y: 0.5, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  fov: 50,
  near: 0.1,
  far: 100,
};

/** Create initial state */
function createInitialState(): SceneState {
  return {
    // Camera
    camera: { ...DEFAULT_CAMERA },
    cameraPreset: 'isometric',
    orbitControlsEnabled: true,

    // Selection
    selectionMode: 'single',
    selectedObjects: [],
    hoveredObject: null,

    // Visibility
    showRobot: true,
    showWorkspace: true,
    showObstacles: true,
    showGrid: true,
    showAxes: true,
    showTrajectory: true,
    showWaypoints: true,
    showGhost: true,

    // Grid
    gridSettings: {
      visible: true,
      size: 2,
      divisions: 20,
      color1: '#444444',
      color2: '#888888',
    },

    // Lighting
    lightingSettings: {
      ambientIntensity: 0.4,
      directionalIntensity: 0.8,
      directionalPosition: { x: 5, y: 5, z: 5 },
      shadows: true,
      shadowMapSize: 2048,
    },

    // Post-processing
    postProcessing: {
      enabled: false,
      bloom: false,
      bloomIntensity: 0.5,
      ssao: false,
      ssaoIntensity: 0.5,
      outline: true,
      outlineColor: '#3b82f6',
    },

    // Performance
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
    antialias: true,
    frameLimit: 60,

    // Misc
    backgroundColor: '#1a1a2e',
    showStats: false,
  };
}

/** Scene store */
export const useSceneStore = create<SceneState & SceneActions>()(
  persist(
    immer((set) => ({
      ...createInitialState(),

      // Camera actions
      setCamera: (camera) =>
        set((state) => {
          Object.assign(state.camera, camera);
          state.cameraPreset = 'custom';
        }),

      setCameraPreset: (preset) =>
        set((state) => {
          state.cameraPreset = preset;
          const presetCamera = CAMERA_PRESETS[preset];
          if (presetCamera.position) state.camera.position = presetCamera.position;
          if (presetCamera.target) state.camera.target = presetCamera.target;
          if (presetCamera.up) state.camera.up = presetCamera.up;
        }),

      resetCamera: () =>
        set((state) => {
          state.camera = { ...DEFAULT_CAMERA };
          state.cameraPreset = 'isometric';
        }),

      setOrbitControlsEnabled: (enabled) =>
        set((state) => {
          state.orbitControlsEnabled = enabled;
        }),

      // Selection actions
      setSelectionMode: (mode) =>
        set((state) => {
          state.selectionMode = mode;
          if (mode === 'none') {
            state.selectedObjects = [];
          }
        }),

      selectObject: (object) =>
        set((state) => {
          if (object === null) {
            state.selectedObjects = [];
          } else {
            state.selectedObjects = [object];
          }
        }),

      addToSelection: (object) =>
        set((state) => {
          if (!state.selectedObjects.find((o: SelectedObject) => o.id === object.id)) {
            state.selectedObjects.push(object);
          }
        }),

      removeFromSelection: (id) =>
        set((state) => {
          state.selectedObjects = state.selectedObjects.filter((o: SelectedObject) => o.id !== id);
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedObjects = [];
        }),

      setHoveredObject: (object) =>
        set((state) => {
          state.hoveredObject = object;
        }),

      // Visibility actions
      setShowRobot: (show) => set((state) => { state.showRobot = show; }),
      setShowWorkspace: (show) => set((state) => { state.showWorkspace = show; }),
      setShowObstacles: (show) => set((state) => { state.showObstacles = show; }),
      setShowGrid: (show) => set((state) => { state.showGrid = show; }),
      setShowAxes: (show) => set((state) => { state.showAxes = show; }),
      setShowTrajectory: (show) => set((state) => { state.showTrajectory = show; }),
      setShowWaypoints: (show) => set((state) => { state.showWaypoints = show; }),
      setShowGhost: (show) => set((state) => { state.showGhost = show; }),

      toggleVisibility: (key) =>
        set((state) => {
          (state as any)[key] = !(state as any)[key];
        }),

      // Grid actions
      setGridSettings: (settings) =>
        set((state) => {
          Object.assign(state.gridSettings, settings);
        }),

      // Lighting actions
      setLightingSettings: (settings) =>
        set((state) => {
          Object.assign(state.lightingSettings, settings);
        }),

      // Post-processing actions
      setPostProcessing: (settings) =>
        set((state) => {
          Object.assign(state.postProcessing, settings);
        }),

      // Performance actions
      setPixelRatio: (ratio) =>
        set((state) => {
          state.pixelRatio = Math.max(0.5, Math.min(2, ratio));
        }),

      setAntialias: (enabled) =>
        set((state) => {
          state.antialias = enabled;
        }),

      setFrameLimit: (limit) =>
        set((state) => {
          state.frameLimit = limit;
        }),

      // Misc actions
      setBackgroundColor: (color) =>
        set((state) => {
          state.backgroundColor = color;
        }),

      setShowStats: (show) =>
        set((state) => {
          state.showStats = show;
        }),

      // Reset
      resetScene: () =>
        set(() => createInitialState()),
    })),
    {
      name: 'arcs-scene-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        gridSettings: state.gridSettings,
        lightingSettings: state.lightingSettings,
        postProcessing: state.postProcessing,
        pixelRatio: state.pixelRatio,
        antialias: state.antialias,
        backgroundColor: state.backgroundColor,
        showGrid: state.showGrid,
        showAxes: state.showAxes,
      }),
    }
  )
);

// Selector hooks
export const useCamera = () => useSceneStore((state) => state.camera);
export const useCameraPreset = () => useSceneStore((state) => state.cameraPreset);
export const useSelectedObjects = () => useSceneStore((state) => state.selectedObjects);
export const useVisibilitySettings = () =>
  useSceneStore((state) => ({
    showRobot: state.showRobot,
    showWorkspace: state.showWorkspace,
    showObstacles: state.showObstacles,
    showGrid: state.showGrid,
    showAxes: state.showAxes,
    showTrajectory: state.showTrajectory,
    showWaypoints: state.showWaypoints,
    showGhost: state.showGhost,
  }));
export const useLightingSettings = () => useSceneStore((state) => state.lightingSettings);
export const usePostProcessing = () => useSceneStore((state) => state.postProcessing);
