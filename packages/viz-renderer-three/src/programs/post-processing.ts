import {
  ACESFilmicToneMapping,
  type Camera,
  type Scene,
  ShaderMaterial,
  type ToneMapping,
  UniformsUtils,
  Vector2,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export interface VizThreePostProcessingSettings {
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  depthOfFieldEnabled: boolean;
  depthOfFieldFocus: number;
  depthOfFieldAperture: number;
  depthOfFieldMaxBlur: number;
  toneMapping?: ToneMapping;
  toneMappingExposure?: number;
}

export interface VizThreePostProcessingPipeline {
  update(settings: VizThreePostProcessingSettings): void;
  resize(width: number, height: number): void;
  render(
    renderer: WebGLRenderer,
    renderTarget: WebGLRenderTarget,
  ): void;
  dispose(): void;
}

export const createVizThreePostProcessingPipeline = ({
  scene,
  camera,
  width,
  height,
  settings: initialSettings,
}: {
  scene: Scene;
  camera: Camera;
  width: number;
  height: number;
  settings: VizThreePostProcessingSettings;
}): VizThreePostProcessingPipeline => {
  let settings = initialSettings;
  let currentWidth = width;
  let currentHeight = height;
  let composer: EffectComposer | undefined;
  let composerRenderer: WebGLRenderer | undefined;
  let bloomPass: UnrealBloomPass | undefined;
  let bokehPass: BokehPass | undefined;

  const copyMaterial = new ShaderMaterial({
    uniforms: UniformsUtils.clone(CopyShader.uniforms),
    vertexShader: CopyShader.vertexShader,
    fragmentShader: CopyShader.fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const copyQuad = new FullScreenQuad(copyMaterial);

  const applySettings = (): void => {
    if (bloomPass) {
      bloomPass.enabled = settings.bloomEnabled;
      bloomPass.strength = settings.bloomStrength;
      bloomPass.radius = settings.bloomRadius;
      bloomPass.threshold = settings.bloomThreshold;
    }

    if (bokehPass) {
      bokehPass.enabled = settings.depthOfFieldEnabled;
      const uniforms = bokehPass.uniforms as Record<
        string,
        { value: unknown }
      >;
      uniforms.focus!.value = settings.depthOfFieldFocus;
      uniforms.aperture!.value =
        settings.depthOfFieldAperture;
      uniforms.maxblur!.value =
        settings.depthOfFieldMaxBlur;
    }
  };

  const disposeComposer = (): void => {
    bloomPass?.dispose();
    bokehPass?.dispose();
    composer?.dispose();
    composer = undefined;
    composerRenderer = undefined;
    bloomPass = undefined;
    bokehPass = undefined;
  };

  const ensureComposer = (renderer: WebGLRenderer): EffectComposer => {
    if (composer && composerRenderer === renderer) {
      return composer;
    }

    disposeComposer();
    composer = new EffectComposer(renderer);
    composer.renderToScreen = false;
    composer.setPixelRatio(1);
    composer.setSize(currentWidth, currentHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new Vector2(currentWidth, currentHeight),
      settings.bloomStrength,
      settings.bloomRadius,
      settings.bloomThreshold,
    );
    composer.addPass(bloomPass);
    bokehPass = new BokehPass(scene, camera, {
      focus: settings.depthOfFieldFocus,
      aperture: settings.depthOfFieldAperture,
      maxblur: settings.depthOfFieldMaxBlur,
    });
    composer.addPass(bokehPass);
    composerRenderer = renderer;
    applySettings();
    return composer;
  };

  return {
    update(nextSettings) {
      settings = nextSettings;
      applySettings();
    },
    resize(nextWidth, nextHeight) {
      currentWidth = nextWidth;
      currentHeight = nextHeight;
      composer?.setSize(nextWidth, nextHeight);
    },
    render(renderer, renderTarget) {
      const previousToneMapping = renderer.toneMapping;
      const previousExposure = renderer.toneMappingExposure;
      renderer.toneMapping =
        settings.toneMapping ?? ACESFilmicToneMapping;
      renderer.toneMappingExposure =
        settings.toneMappingExposure ?? 1.2;

      if (!settings.bloomEnabled && !settings.depthOfFieldEnabled) {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
      } else {
        const activeComposer = ensureComposer(renderer);
        activeComposer.render(0);
        copyMaterial.uniforms.tDiffuse!.value =
          activeComposer.readBuffer.texture;
        copyMaterial.uniforms.opacity!.value = 1;
        renderer.setRenderTarget(renderTarget);
        copyQuad.render(renderer);
      }

      renderer.toneMapping = previousToneMapping;
      renderer.toneMappingExposure = previousExposure;
    },
    dispose() {
      disposeComposer();
      copyQuad.dispose();
      copyMaterial.dispose();
    },
  };
};
