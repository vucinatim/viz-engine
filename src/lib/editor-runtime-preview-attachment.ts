import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import editorControl from '@/lib/editor-control';
import type {
  LayerData,
  LayerRuntimePreviewRenderResult,
} from '@/lib/editor-layer-types';
import { invalidateEditorRuntimePreview } from '@/lib/editor-runtime-preview-invalidation';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type { VizRenderPlan } from '@viz-engine/contracts';
import {
  createVizThreePreviewController,
  type VizThreePreviewCameraPose,
  type VizThreePreviewController,
  type VizThreeProgramRegistry,
} from '@viz-engine/renderer-three';
import * as THREE from 'three';

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
  }) => LayerRuntimePreviewRenderResult;
  updateLayers: (layers: LayerData[]) => void;
  invokeLayerAction: (layerId: string, actionId: string) => boolean;
  requiresContinuousRendering: () => boolean;
  whenReady: () => Promise<void>;
  getResourceStats: () => ReturnType<
    VizThreePreviewController['getResourceStats']
  > | null;
  destroy: () => void;
}

interface CreateEditorRuntimePreviewAttachmentOptions {
  layers: LayerData[];
  canvas: HTMLCanvasElement;
  resolutionMultiplier: number;
  getMirrorCanvasesByLayerId: () => Record<string, HTMLCanvasElement[]>;
  getCompositeMirrorCanvases: () => HTMLCanvasElement[];
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
  layers,
  canvas,
  resolutionMultiplier,
  getMirrorCanvasesByLayerId,
  getCompositeMirrorCanvases,
  programRegistry,
}: CreateEditorRuntimePreviewAttachmentOptions): EditorRuntimePreviewAttachment => {
  let currentLayers = new Map(layers.map((layer) => [layer.id, layer]));
  let runtimePreviewController: VizThreePreviewController | null = null;
  let flyCameraPose: VizThreePreviewCameraPose | null = null;
  let flyCameraLayerId: string | null = null;
  let flyCameraActive = false;
  const lastConfigValuesByLayerId = new Map(
    layers.map((layer) => [
      layer.id,
      structuredClone(layer.comp.defaultValues) as Record<string, any>,
    ]),
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
    if (!flyCameraPose || !flyCameraLayerId) {
      return;
    }

    const [x, y, z] = flyCameraPose.position;
    const [rotationX, rotationY, rotationZ] = flyCameraPose.rotation;
    editorControl.project.updateLayerValue(
      flyCameraLayerId,
      ['camera', 'cinematicMode'],
      false,
    );
    editorControl.project.updateLayerValue(
      flyCameraLayerId,
      ['camera', 'position'],
      {
        x,
        y,
        z,
      },
    );
    editorControl.project.updateLayerValue(
      flyCameraLayerId,
      ['camera', 'rotation'],
      {
        x: rotationX,
        y: rotationY,
        z: rotationZ,
      },
    );
  };

  const deactivateFlyCamera = () => {
    if (!flyCameraActive) {
      return;
    }

    flyCameraActive = false;
    removeFlyListeners();
    if (flyCameraLayerId) {
      runtimePreviewController?.setLayerCameraPose(flyCameraLayerId, null);
    }
    commitFlyCameraPose();
    flyCameraLayerId = null;
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
    invalidateEditorRuntimePreview();
  }

  function onFlyKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    flyKeys.delete(key);
    invalidateEditorRuntimePreview();
  }

  function onFlyMouseMove(event: MouseEvent) {
    if (
      !flyCameraActive ||
      !flyCameraPose ||
      document.pointerLockElement !== canvas
    ) {
      return;
    }

    const config = flyCameraLayerId
      ? lastConfigValuesByLayerId.get(flyCameraLayerId)
      : undefined;
    const lookSpeed =
      typeof config?.camera?.lookSpeed === 'number'
        ? config.camera.lookSpeed
        : 0.002;
    flyCameraPose.rotation[1] -= event.movementX * lookSpeed;
    flyCameraPose.rotation[0] = Math.max(
      -Math.PI / 2,
      Math.min(
        Math.PI / 2,
        flyCameraPose.rotation[0] - event.movementY * lookSpeed,
      ),
    );
    invalidateEditorRuntimePreview();
  }

  function onPointerLockChange() {
    if (flyCameraActive && document.pointerLockElement !== canvas) {
      deactivateFlyCamera();
    }
  }

  const activateFlyCameraMode = (layerId: string) => {
    if (flyCameraActive || !runtimePreviewController) {
      return;
    }

    flyCameraPose = runtimePreviewController.getLayerCameraPose(layerId);
    if (!flyCameraPose) {
      return;
    }

    flyCameraLayerId = layerId;
    flyCameraActive = true;
    document.addEventListener('keydown', onFlyKeyDown);
    document.addEventListener('keyup', onFlyKeyUp);
    document.addEventListener('mousemove', onFlyMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    runtimePreviewController.setLayerCameraPose(layerId, flyCameraPose);
    invalidateEditorRuntimePreview();

    try {
      const request = canvas.requestPointerLock() as unknown;
      if (request && typeof (request as Promise<void>).catch === 'function') {
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

    const config = flyCameraLayerId
      ? lastConfigValuesByLayerId.get(flyCameraLayerId)
      : undefined;
    const moveSpeed =
      typeof config?.camera?.moveSpeed === 'number'
        ? config.camera.moveSpeed
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
    if (flyCameraLayerId) {
      runtimePreviewController?.setLayerCameraPose(
        flyCameraLayerId,
        flyCameraPose,
      );
    }
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
      runtimePreviewController?.resize(canvas.width, canvas.height);
      invalidateEditorRuntimePreview();
    },
    render: ({ frame, renderPlan }) => {
      for (const layerPlan of renderPlan.layers) {
        lastConfigValuesByLayerId.set(
          layerPlan.layerId,
          layerPlan.resolvedSettings ??
            layerPlan.settings ??
            currentLayers.get(layerPlan.layerId)?.values ??
            {},
        );
      }
      updateFlyCamera(frame.dt);

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

      mirrorToCanvases(canvas, getCompositeMirrorCanvases());
      const mirrorCanvasesByLayerId = getMirrorCanvasesByLayerId();
      let presentedMirror = false;
      for (const [layerId, mirrorCanvases] of Object.entries(
        mirrorCanvasesByLayerId,
      )) {
        if (
          mirrorCanvases.length > 0 &&
          runtimePreviewController.presentLayer(layerId)
        ) {
          mirrorToCanvases(canvas, mirrorCanvases);
          presentedMirror = true;
        }
      }
      if (presentedMirror) {
        runtimePreviewController.presentComposite();
      }

      return {
        layerStats: runtimePreviewController.getLastRenderStats().layers,
      };
    },
    updateLayers: (nextLayers) => {
      currentLayers = new Map(nextLayers.map((layer) => [layer.id, layer]));
      for (const layerId of lastConfigValuesByLayerId.keys()) {
        if (!currentLayers.has(layerId)) {
          lastConfigValuesByLayerId.delete(layerId);
        }
      }
      for (const layer of nextLayers) {
        if (!lastConfigValuesByLayerId.has(layer.id)) {
          lastConfigValuesByLayerId.set(
            layer.id,
            structuredClone(layer.comp.defaultValues),
          );
        }
      }
      if (flyCameraLayerId && !currentLayers.has(flyCameraLayerId)) {
        deactivateFlyCamera();
      }
    },
    invokeLayerAction: (layerId, actionId) => {
      const layer = currentLayers.get(layerId);
      if (
        layer?.comp.componentId !== 'stage-scene' ||
        actionId !== 'stage.enter-fly-mode'
      ) {
        return false;
      }
      activateFlyCameraMode(layerId);
      return true;
    },
    requiresContinuousRendering: () => flyCameraActive,
    whenReady: () => runtimePreviewController?.whenReady() ?? Promise.resolve(),
    getResourceStats: () =>
      runtimePreviewController?.getResourceStats() ?? null,
    destroy: () => {
      deactivateFlyCamera();
      removeFlyListeners();
      runtimePreviewController?.dispose();
      runtimePreviewController = null;
    },
  };
};
