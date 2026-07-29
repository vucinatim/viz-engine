import { createVizThreePreviewController, type VizThreePreviewController } from '@viz-engine/renderer-three';
import { LayerData } from '@/lib/editor-layer-types';
import { createRuntimeRenderPlanForEditorLayer } from '@/lib/editor-runtime-preview-runtime-bridge';
import type { VizSessionRuntimePreviewFrame } from '@/lib/viz-session/types';
import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import {
  createDrawCallCounter,
  DrawCallCounter,
} from '@/lib/utils/webgl-draw-call-counter';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

type LayerRenderInput = {
  dt: number;
  time: number;
  audioData: { dataArray: Uint8Array; analyzer: AnalyserNode };
  config: Record<string, any>;
};

type AudioFrameData = {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  sampleRate: number;
  fftSize: number;
};

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
  resize: (displayWidth: number, displayHeight: number) => void;
  render: (frame: VizSessionRuntimePreviewFrame) => boolean;
  destroy: () => void;
}

interface CreateEditorRuntimePreviewAttachmentOptions {
  layer: LayerData;
  canvas: HTMLCanvasElement;
  debugCanvas: HTMLCanvasElement | null;
  audioAnalyzer: AnalyserNode;
  resolutionMultiplier: number;
  getNextAudioFrame: () => AudioFrameData;
  withDebug: WithDebug;
  getLayerState: () => unknown;
  getDebugEnabled: () => boolean;
  getMirrorCanvases: () => HTMLCanvasElement[];
  profiler: LayerProfiler;
}

const applyCanvasResolution = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  resolutionMultiplier: number,
) => {
  canvas.width = Math.round(width * resolutionMultiplier);
  canvas.height = Math.round(height * resolutionMultiplier);
};

export const createEditorRuntimePreviewAttachment = ({
  layer,
  canvas,
  debugCanvas,
  audioAnalyzer,
  resolutionMultiplier,
  getNextAudioFrame,
  withDebug,
  getLayerState,
  getDebugEnabled,
  getMirrorCanvases,
  profiler,
}: CreateEditorRuntimePreviewAttachmentOptions): EditorRuntimePreviewAttachment => {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let composer: EffectComposer | null = null;
  let drawCallCounter: DrawCallCounter | null = null;
  let renderFunction: ((data: LayerRenderInput) => void) | null = null;
  let runtimePreviewController: VizThreePreviewController | null = null;

  const ensure2DRenderer = () => {
    if (layer.comp.draw3D || renderFunction) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    renderFunction = (data) => {
      profiler.startRender();
      layer.comp.draw?.({
        canvasCtx: ctx,
        state: getLayerState(),
        debugEnabled: getDebugEnabled(),
        ...data,
      });
      profiler.endRender();
    };
  };

  const ensure3DRenderer = (displayWidth: number, displayHeight: number) => {
    if (!layer.comp.draw3D || renderer) {
      return;
    }

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    applyCanvasResolution(
      canvas,
      displayWidth,
      displayHeight,
      resolutionMultiplier,
    );
    renderer.setSize(canvas.width, canvas.height, false);

    scene = new THREE.Scene();
    if (getDebugEnabled()) {
      scene.add(new THREE.GridHelper(10, 10));
      scene.add(new THREE.AxesHelper(5));
    }

    camera = new THREE.PerspectiveCamera(
      75,
      displayWidth / displayHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    layer.comp.init3D?.({
      state: getLayerState(),
      threeCtx: {
        renderer,
        scene,
        camera,
        composer,
      },
      config: layer.config.getValues({
        audioSignal: new Uint8Array(),
        frequencyAnalysis: {
          frequencyData: new Uint8Array(),
          sampleRate: audioAnalyzer.context.sampleRate,
          fftSize: audioAnalyzer.fftSize,
        },
        time: 0,
      }),
      debugEnabled: getDebugEnabled(),
    });

    drawCallCounter = createDrawCallCounter(renderer.getContext());

    renderFunction = (data) => {
      if (!renderer || !scene || !camera) {
        return;
      }

      profiler.startRender();
      drawCallCounter?.reset();

      layer.comp.draw3D?.({
        threeCtx: {
          renderer,
          scene,
          camera,
        },
        state: getLayerState(),
        debugEnabled: getDebugEnabled(),
        ...data,
      });

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      profiler.endRender(drawCallCounter?.getCount() ?? 0);
    };
  };

  return {
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

      if (layer.comp.draw3D) {
        ensure3DRenderer(displayWidth, displayHeight);

        if (renderer && camera) {
          renderer.setSize(canvas.width, canvas.height, false);
          camera.aspect = displayWidth / displayHeight;
          camera.updateProjectionMatrix();
          composer?.setSize(canvas.width, canvas.height);
        }
      }

      if (runtimePreviewController) {
        runtimePreviewController.resize(canvas.width, canvas.height);
      }
    },
    render: (frame) => {
      const { frequencyData, timeDomainData, sampleRate, fftSize } =
        getNextAudioFrame();

      const animInputData = {
        audioSignal: timeDomainData,
        frequencyData,
        time: frame.time,
        frequencyAnalysis: {
          frequencyData,
          sampleRate,
          fftSize,
        },
      };

      const configValues = layer.config.getValues(animInputData);

      const runtimeRenderPlan = createRuntimeRenderPlanForEditorLayer({
        layer,
        viewportWidth: Math.max(canvas.width, 1),
        viewportHeight: Math.max(canvas.height, 1),
        frame,
        configValues,
        audioFrameData: {
          frequencyData,
          sampleRate,
          fftSize,
        },
      });

      if (runtimeRenderPlan) {
        withDebug(
          () => {
            if (runtimePreviewController) {
              runtimePreviewController.update(runtimeRenderPlan);
            } else {
              runtimePreviewController = createVizThreePreviewController({
                canvas,
                renderPlan: runtimeRenderPlan,
              });
            }
          },
          {
            dataArray: frequencyData,
            config: configValues,
            configSchema: layer.config,
          },
        );

        const mirrorCanvases = getMirrorCanvases();
        if (mirrorCanvases.length > 0) {
          mirrorToCanvases(canvas, mirrorCanvases);
        }

        return true;
      }

      if (runtimePreviewController) {
        runtimePreviewController.dispose();
        runtimePreviewController = null;
      }

      if (layer.comp.draw3D) {
        ensure3DRenderer(
          Math.max(canvas.clientWidth, 1),
          Math.max(canvas.clientHeight, 1),
        );
      } else {
        ensure2DRenderer();
      }

      if (!renderFunction) {
        return false;
      }

      withDebug(
        () =>
          renderFunction?.({
            dt: frame.dt,
            time: frame.time,
            audioData: {
              dataArray: frequencyData,
              analyzer: audioAnalyzer,
            },
            config: configValues,
          }),
        {
          dataArray: frequencyData,
          config: configValues,
          configSchema: layer.config,
        },
      );

      const mirrorCanvases = getMirrorCanvases();
      if (mirrorCanvases.length > 0) {
        mirrorToCanvases(canvas, mirrorCanvases);
      }
      return false;
    },
    destroy: () => {
      runtimePreviewController?.dispose();
      renderer?.dispose();
      drawCallCounter?.cleanup();
      runtimePreviewController = null;
      renderer = null;
      scene = null;
      camera = null;
      composer = null;
      drawCallCounter = null;
      renderFunction = null;
    },
  };
};
