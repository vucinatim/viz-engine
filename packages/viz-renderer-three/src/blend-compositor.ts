import type { VizBlendMode, VizViewport } from '@viz-engine/contracts';
import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';

import type {
  VizThreeCompositorGraph,
  VizThreeCompositorLayer,
} from './compositor.js';
import { resolveVizThreeCssColor } from './portable-nodes.js';

const blendModeIndex: Record<VizBlendMode, number> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  darken: 4,
  lighten: 5,
  'color-dodge': 6,
  'color-burn': 7,
  'hard-light': 8,
  'soft-light': 9,
  difference: 10,
  exclusion: 11,
  hue: 12,
  saturation: 13,
  color: 14,
  luminosity: 15,
  add: 16,
};

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const blendFragmentShader = `
uniform sampler2D vizBackdrop;
uniform sampler2D vizSource;
uniform float vizOpacity;
uniform int vizBlendMode;
varying vec2 vUv;

vec3 vizLinearToSrgb(vec3 color) {
  vec3 lower = color * 12.92;
  vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(lower, upper, step(vec3(0.0031308), color));
}

vec3 vizSrgbToLinear(vec3 color) {
  vec3 lower = color / 12.92;
  vec3 upper = pow((max(color, vec3(0.0)) + 0.055) / 1.055, vec3(2.4));
  return mix(lower, upper, step(vec3(0.04045), color));
}

float vizLum(vec3 color) {
  return dot(color, vec3(0.3, 0.59, 0.11));
}

float vizSat(vec3 color) {
  return max(max(color.r, color.g), color.b) -
    min(min(color.r, color.g), color.b);
}

vec3 vizClipColor(vec3 color) {
  float lum = vizLum(color);
  float minimum = min(min(color.r, color.g), color.b);
  float maximum = max(max(color.r, color.g), color.b);
  if (minimum < 0.0) {
    color = vec3(lum) + (color - vec3(lum)) * lum / (lum - minimum);
  }
  if (maximum > 1.0) {
    color = vec3(lum) +
      (color - vec3(lum)) * (1.0 - lum) / (maximum - lum);
  }
  return clamp(color, 0.0, 1.0);
}

vec3 vizSetLum(vec3 color, float lum) {
  return vizClipColor(color + vec3(lum - vizLum(color)));
}

vec3 vizSetSat(vec3 color, float saturation) {
  float minimum = min(min(color.r, color.g), color.b);
  float maximum = max(max(color.r, color.g), color.b);
  if (maximum <= minimum) {
    return vec3(0.0);
  }
  return (color - vec3(minimum)) * saturation / (maximum - minimum);
}

float vizSoftLight(float backdrop, float source) {
  if (source <= 0.5) {
    return backdrop -
      (1.0 - 2.0 * source) * backdrop * (1.0 - backdrop);
  }
  float curve = backdrop <= 0.25
    ? ((16.0 * backdrop - 12.0) * backdrop + 4.0) * backdrop
    : sqrt(backdrop);
  return backdrop + (2.0 * source - 1.0) * (curve - backdrop);
}

vec3 vizBlend(vec3 backdrop, vec3 source, int mode) {
  if (mode == 1) return backdrop * source;
  if (mode == 2) return backdrop + source - backdrop * source;
  if (mode == 3) {
    return mix(
      2.0 * backdrop * source,
      1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source),
      step(vec3(0.5), backdrop)
    );
  }
  if (mode == 4) return min(backdrop, source);
  if (mode == 5) return max(backdrop, source);
  if (mode == 6) {
    return min(
      vec3(1.0),
      backdrop / max(vec3(0.000001), vec3(1.0) - source)
    );
  }
  if (mode == 7) {
    return vec3(1.0) - min(
      vec3(1.0),
      (vec3(1.0) - backdrop) / max(vec3(0.000001), source)
    );
  }
  if (mode == 8) {
    return mix(
      2.0 * backdrop * source,
      1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source),
      step(vec3(0.5), source)
    );
  }
  if (mode == 9) {
    return vec3(
      vizSoftLight(backdrop.r, source.r),
      vizSoftLight(backdrop.g, source.g),
      vizSoftLight(backdrop.b, source.b)
    );
  }
  if (mode == 10) return abs(backdrop - source);
  if (mode == 11) return backdrop + source - 2.0 * backdrop * source;
  if (mode == 12) {
    return vizSetLum(vizSetSat(source, vizSat(backdrop)), vizLum(backdrop));
  }
  if (mode == 13) {
    return vizSetLum(vizSetSat(backdrop, vizSat(source)), vizLum(backdrop));
  }
  if (mode == 14) return vizSetLum(source, vizLum(backdrop));
  if (mode == 15) return vizSetLum(backdrop, vizLum(source));
  if (mode == 16) return min(vec3(1.0), backdrop + source);
  return source;
}

void main() {
  vec4 backdrop = texture2D(vizBackdrop, vUv);
  vec4 source = texture2D(vizSource, vUv);
  vec3 backdropColor = vizLinearToSrgb(backdrop.rgb);
  vec3 sourceColor = vizLinearToSrgb(
    source.a > 0.0 ? source.rgb / source.a : vec3(0.0)
  );
  float sourceAlpha = source.a * vizOpacity;
  float outputAlpha =
    sourceAlpha + backdrop.a - sourceAlpha * backdrop.a;
  vec3 blended = vizBlend(backdropColor, sourceColor, vizBlendMode);
  vec3 premultiplied =
    (1.0 - sourceAlpha) * backdropColor * backdrop.a +
    (1.0 - backdrop.a) * sourceColor * sourceAlpha +
    backdrop.a * sourceAlpha * blended;
  vec3 outputColor = outputAlpha > 0.0
    ? premultiplied / outputAlpha
    : vec3(0.0);
  gl_FragColor = vec4(vizSrgbToLinear(outputColor), outputAlpha);
}
`;

const copyFragmentShader = `
uniform sampler2D vizTexture;
uniform float vizOpacity;
uniform bool vizPremultipliedInput;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(vizTexture, vUv);
  vec3 straightColor = vizPremultipliedInput && color.a > 0.0
    ? color.rgb / color.a
    : color.rgb;
  gl_FragColor = vec4(straightColor, color.a * vizOpacity);
  #include <colorspace_fragment>
}
`;

const createRenderTarget = (width: number, height: number) =>
  new WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
  });

export interface VizThreeBlendCompositor {
  resize(width: number, height: number): void;
  compose(
    renderer: WebGLRenderer,
    graph: VizThreeCompositorGraph,
    viewport: VizViewport,
  ): {
    milliseconds: number;
    drawCalls: number;
  };
  presentLayer(renderer: WebGLRenderer, layer: VizThreeCompositorLayer): void;
  presentComposite(renderer: WebGLRenderer): void;
  dispose(): void;
}

export const createVizThreeBlendCompositor = (
  width: number,
  height: number,
): VizThreeBlendCompositor => {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const blendMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: blendFragmentShader,
    uniforms: {
      vizBackdrop: { value: null as Texture | null },
      vizSource: { value: null as Texture | null },
      vizOpacity: { value: 1 },
      vizBlendMode: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });
  const copyMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: copyFragmentShader,
    uniforms: {
      vizTexture: { value: null as Texture | null },
      vizOpacity: { value: 1 },
      vizPremultipliedInput: { value: false },
    },
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const scene = new Scene();
  const surface = new Mesh(geometry, blendMaterial);
  scene.add(surface);
  const targets = [
    createRenderTarget(width, height),
    createRenderTarget(width, height),
  ] as const;
  let compositeTexture: Texture = targets[0].texture;

  const copyTexture = (
    renderer: WebGLRenderer,
    texture: Texture,
    target: WebGLRenderTarget | null,
    opacity = 1,
    premultipliedInput = false,
  ) => {
    surface.material = copyMaterial;
    copyMaterial.uniforms.vizTexture!.value = texture;
    copyMaterial.uniforms.vizOpacity!.value = opacity;
    copyMaterial.uniforms.vizPremultipliedInput!.value = premultipliedInput;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
  };

  return {
    resize(nextWidth, nextHeight) {
      for (const target of targets) {
        target.setSize(nextWidth, nextHeight);
      }
    },
    compose(renderer, graph, viewport) {
      let backdropIndex = 0;
      const background = resolveVizThreeCssColor(
        viewport.backgroundColor ?? 'transparent',
      );
      renderer.setRenderTarget(targets[backdropIndex]!);
      renderer.setClearColor(new Color(background.value), background.opacity);
      renderer.clear(true, true, true);
      renderer.info.reset();
      const startedAt = performance.now();
      surface.material = blendMaterial;

      for (const layer of graph.layers) {
        const outputIndex = backdropIndex === 0 ? 1 : 0;
        blendMaterial.uniforms.vizBackdrop!.value =
          targets[backdropIndex]!.texture;
        blendMaterial.uniforms.vizSource!.value = layer.renderTarget.texture;
        blendMaterial.uniforms.vizOpacity!.value = layer.layer.opacity;
        blendMaterial.uniforms.vizBlendMode!.value =
          blendModeIndex[layer.layer.blendMode];
        renderer.setRenderTarget(targets[outputIndex]!);
        renderer.setClearColor(0x000000, 0);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
        backdropIndex = outputIndex;
      }

      compositeTexture = targets[backdropIndex]!.texture;
      copyTexture(renderer, compositeTexture, null);
      return {
        milliseconds: performance.now() - startedAt,
        drawCalls: renderer.info.render.calls,
      };
    },
    presentLayer(renderer, layer) {
      copyTexture(
        renderer,
        layer.renderTarget.texture,
        null,
        layer.layer.opacity,
        true,
      );
    },
    presentComposite(renderer) {
      copyTexture(renderer, compositeTexture, null);
    },
    dispose() {
      geometry.dispose();
      blendMaterial.dispose();
      copyMaterial.dispose();
      for (const target of targets) {
        target.dispose();
      }
    },
  };
};
