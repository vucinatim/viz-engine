import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import editorControl from '@/lib/editor-control';
import type { LayerData } from '@/lib/editor-layer-types';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import {
  createVizThreePreviewController,
  type VizThreePreviewCameraPose,
  type VizThreePreviewController,
  type VizThreeProgramRegistry,
} from '@viz-engine/renderer-three';
import type { VizRenderPlan } from '@viz-engine/contracts';
import * as THREE from 'three';

type WithDebug = (
  drawFunction: () => void,
  debugData: {
    dataArray: Uint8Array;
    config: Record<string, any>;
    configSchema: LayerData['config'];
  },
) => void;

type LayerProfiler = {
  startRender: () => void;
  endRender: (drawCalls?: number) => void;
};

export interface EditorRuntimePreviewAttachment {
  getViewport: () => {
    width: number;
    height: number;
  };
  resize: (displayWidth: number, displayHeight: number) => void;
  render: (input: {
    frame: VizSessionRuntimePreviewFrame;
    audioFrameData: VizSessionRuntimePreviewAudioFrameData;
    renderPlan: VizRenderPlan;
  }) => void;
  whenReady: () => Promise<void>;
  activateFlyCameraMode: () => void;
  destroy: () => void;
}

interface CreateEditorRuntimePreviewAttachmentOptions {
  layer: LayerData;
  canvas: HTMLCanvasElement;
  debugCanvas: HTMLCanvasElement | null;
  resolutionMultiplier: number;
  withDebug: WithDebug;
  getMirrorCanvases: () => HTMLCanvasElement[];
  profiler: LayerProfiler;
  programRegistry: VizThreeProgramRegistry;
}

const applyCanvasResolution = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  resolutionMultiplier: number,
) => {
  canvas.width = Math.max(1, Math.round(width * resolutionMultiplier));
  canvas.height = Math.max(1, Math.round(height * resolutionMultiplier));
};

export const createEditorRuntimePreviewAttachment = ({
  layer,
  canvas,
  debugCanvas,
  resolutionMultiplier,
  withDebug,
  getMirrorCanvases,
  profiler,
  programRegistry,
}: CreateEditorRuntimePreviewAttachmentOptions): EditorRuntimePreviewAttachment => {
  let runtimePreviewController: VizThreePreviewController | null = null;
  let flyCameraPose: VizThreePreviewCameraPose | null = null;
  let flyCameraActive = false;
  let lastConfigValues: Record<string, any> = structuredClone(
    layer.comp.defaultValues,
  );
  const flyKeys = new Set<string>();

  const removeFlyListeners = () => {
    document.removeEventListener('keydown', onFlyKeyDown);
    document.removeEventListener('keyup', onFlyKeyUp);
    document.removeEventListener('mousemove', onFlyMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    flyKeys.clear();
  };

  const commitFlyCameraPose = () => {
    if (!flyCameraPose) {
      return;
    }

    const [x, y, z] = flyCameraPose.position;
    const [rotationX, rotationY, rotationZ] = flyCameraPose.rotation;
    editorControl.project.updateLayerValue(
      layer.id,
      ['camera', 'cinematicMode'],
      false,
    );
    editorControl.project.updateLayerValue(
      layer.id,
      ['camera', 'position'],
      { x, y, z },
    );
    editorControl.project.updateLayerValue(
      layer.id,
      ['camera', 'rotation'],
      { x: rotationX, y: rotationY, z: rotationZ },
    );
  };

  const deactivateFlyCamera = () => {
    if (!flyCameraActive) {
      return;
    }

    flyCameraActive = false;
    removeFlyListeners();
    runtimePreviewController?.setLayerCameraPose(layer.id, null);
    commitFlyCameraPose();
  };

  function onFlyKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd', ' ', 'shift', 'escape'].includes(key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (key === 'escape') {
      deactivateFlyCamera();
      return;
    }
    flyKeys.add(key);
  }

  function onFlyKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    flyKeys.delete(key);
  }

  function onFlyMouseMove(event: MouseEvent) {
    if (
      !flyCameraActive ||
      !flyCameraPose ||
      document.pointerLockElement !== canvas
    ) {
      return;
    }

    const lookSpeed =
      typeof lastConfigValues.camera?.lookSpeed === 'number'
        ? lastConfigValues.camera.lookSpeed
        : 0.002;
    flyCameraPose.rotation[1] -= event.movementX * lookSpeed;
    flyCameraPose.rotation[0] = Math.max(
      -Math.PI / 2,
      Math.min(
        Math.PI / 2,
        flyCameraPose.rotation[0] - event.movementY * lookSpeed,
      ),
    );
  }

  function onPointerLockChange() {
    if (flyCameraActive && document.pointerLockElement !== canvas) {
      deactivateFlyCamera();
    }
  }

  const activateFlyCameraMode = () => {
    if (flyCameraActive || !runtimePreviewController) {
      return;
    }

    flyCameraPose = runtimePreviewController.getLayerCameraPose(layer.id);
    if (!flyCameraPose) {
      return;
    }

    flyCameraActive = true;
    document.addEventListener('keydown', onFlyKeyDown);
    document.addEventListener('keyup', onFlyKeyUp);
    document.addEventListener('mousemove', onFlyMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    runtimePreviewController.setLayerCameraPose(layer.id, flyCameraPose);

    try {
      const request = canvas.requestPointerLock() as unknown;
      if (
        request &&
        typeof (request as Promise<void>).catch === 'function'
      ) {
        void (request as Promise<void>).catch(() => {
          // Keyboard controls remain available if pointer lock is denied.
        });
      }
    } catch {
      // Keyboard controls remain available if pointer lock is denied.
    }
  };

  const updateFlyCamera = (dt: number) => {
    if (!flyCameraActive || !flyCameraPose) {
      return;
    }

    const moveSpeed =
      typeof lastConfigValues.camera?.moveSpeed === 'number'
        ? lastConfigValues.camera.moveSpeed
        : 20;
    const rotation = new THREE.Euler(
      flyCameraPose.rotation[0],
      flyCameraPose.rotation[1],
      flyCameraPose.rotation[2],
      'YXZ',
    );
    const movement = new THREE.Vector3();

    if (flyKeys.has('w')) {
      movement.add(new THREE.Vector3(0, 0, -1).applyEuler(rotation));
    }
    if (flyKeys.has('s')) {
      movement.add(new THREE.Vector3(0, 0, 1).applyEuler(rotation));
    }
    if (flyKeys.has('a')) {
      movement.add(new THREE.Vector3(-1, 0, 0).applyEuler(rotation));
    }
    if (flyKeys.has('d')) {
      movement.add(new THREE.Vector3(1, 0, 0).applyEuler(rotation));
    }
    if (flyKeys.has(' ')) {
      movement.y += 1;
    }
    if (flyKeys.has('shift')) {
      movement.y -= 1;
    }
    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(Math.max(0, dt) * moveSpeed);
      flyCameraPose.position[0] += movement.x;
      flyCameraPose.position[1] += movement.y;
      flyCameraPose.position[2] += movement.z;
    }
    runtimePreviewController?.setLayerCameraPose(layer.id, flyCameraPose);
  };

  return {
    getViewport: () => ({
      width: Math.max(canvas.width, 1),
      height: Math.max(canvas.height, 1),
    }),
    resize: (displayWidth, displayHeight) => {
      if (displayWidth <= 0 || displayHeight <= 0) {
        return;
      }

      applyCanvasResolution(
        canvas,
        displayWidth,
        displayHeight,
        resolutionMultiplier,
      );
      if (debugCanvas) {
        applyCanvasResolution(
          debugCanvas,
          displayWidth,
          displayHeight,
          resolutionMultiplier,
        );
      }
      runtimePreviewController?.resize(canvas.width, canvas.height);
    },
    render: ({ frame, audioFrameData, renderPlan }) => {
      lastConfigValues = layer.config.getValues({
        audioSignal: audioFrameData.timeDomainData,
        time: frame.time,
        frequencyAnalysis: {
          frequencyData: audioFrameData.frequencyData,
          sampleRate: audioFrameData.sampleRate,
          fftSize: audioFrameData.fftSize,
        },
      });
      updateFlyCamera(frame.dt);

      withDebug(
        () => {
          profiler.startRender();
          if (runtimePreviewController) {
            runtimePreviewController.update(renderPlan);
          } else {
            runtimePreviewController = createVizThreePreviewController({
              canvas,
              renderPlan,
              preserveDrawingBuffer: true,
              programRegistry,
            });
          }
          profiler.endRender();
        },
        {
          dataArray: audioFrameData.frequencyData,
          config: lastConfigValues,
          configSchema: layer.config,
        },
      );

      const mirrorCanvases = getMirrorCanvases();
      if (mirrorCanvases.length > 0) {
        mirrorToCanvases(canvas, mirrorCanvases);
      }
    },
    whenReady: () =>
      runtimePreviewController?.whenReady() ?? Promise.resolve(),
    activateFlyCameraMode,
    destroy: () => {
      deactivateFlyCamera();
      removeFlyListeners();
      runtimePreviewController?.dispose();
      runtimePreviewController = null;
    },
  };
};
