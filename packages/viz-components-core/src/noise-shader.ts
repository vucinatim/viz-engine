import type {
  VizComponentImplementation,
  VizRenderShaderNode,
} from "@viz-engine/contracts";
import { asBoolean, asNumber, asRecord, asString } from "./shared.js";

export const noiseShaderVertexShader = `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

export const noiseShaderFragmentShader = `
        uniform float u_time;
        uniform vec2 u_resolution;

        // Noise settings
        uniform int u_noiseType;
        uniform float u_scale;
        uniform int u_octaves;
        uniform float u_lacunarity;
        uniform float u_gain;

        // Animation
        uniform float u_speed;
        uniform float u_flowX;
        uniform float u_flowY;
        uniform float u_rotationSpeed;

        // Distortion
        uniform int u_distortionEnabled;
        uniform float u_distortionAmount;
        uniform float u_distortionScale;

        // Color
        uniform int u_colorMode;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        uniform vec3 u_color3;
        uniform float u_hueShift;
        uniform float u_saturation;

        // Output
        uniform float u_brightness;
        uniform float u_contrast;
        uniform int u_invert;
        uniform int u_posterize;

        varying vec2 vUv;

        // ===== NOISE FUNCTIONS =====

        // Hash function for pseudo-random values
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123);
        }

        vec3 hash3(vec3 p) {
          p = vec3(
            dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6))
          );
          return fract(sin(p) * 43758.5453123);
        }

        // Simplex noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float simplexNoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289_2(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Perlin-style noise
        float perlinNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(
            mix(dot(hash2(i + vec2(0.0, 0.0)) * 2.0 - 1.0, f - vec2(0.0, 0.0)),
                dot(hash2(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0)), u.x),
            mix(dot(hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0)),
                dot(hash2(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // FBM (Fractal Brownian Motion)
        float fbm(vec2 p, int octaves, float lacunarity, float gain) {
          float value = 0.0;
          float amplitude = 1.0;
          float frequency = 1.0;

          for (int i = 0; i < 8; i++) {
            if (i >= octaves) break;
            value += amplitude * simplexNoise(p * frequency);
            frequency *= lacunarity;
            amplitude *= gain;
          }

          return value;
        }

        // Voronoi noise
        float voronoiNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float minDist = 1.0;

          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = hash2(i + neighbor);
              vec2 diff = neighbor + point - f;
              float dist = length(diff);
              minDist = min(minDist, dist);
            }
          }

          return minDist;
        }

        // Cellular/Worley noise
        float cellularNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float m_dist = 1.0;

          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = hash2(i + neighbor);
              point = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831 * point);
              vec2 diff = neighbor + point - f;
              float dist = length(diff);
              m_dist = min(m_dist, dist);
            }
          }

          return m_dist;
        }

        // Get noise value based on type
        float getNoise(vec2 p) {
          if (u_noiseType == 0) {
            return perlinNoise(p);
          } else if (u_noiseType == 1) {
            return simplexNoise(p);
          } else if (u_noiseType == 2) {
            return fbm(p, u_octaves, u_lacunarity, u_gain);
          } else if (u_noiseType == 3) {
            return voronoiNoise(p);
          } else if (u_noiseType == 4) {
            return cellularNoise(p);
          }
          return 0.0;
        }

        // ===== COLOR FUNCTIONS =====

        // RGB to HSV
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        // HSV to RGB
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        // Apply saturation
        vec3 adjustSaturation(vec3 color, float sat) {
          vec3 hsv = rgb2hsv(color);
          hsv.y *= sat;
          return hsv2rgb(hsv);
        }

        // ===== MAIN =====

        void main() {
          // Setup coordinates with aspect ratio correction
          vec2 uv = vUv;
          uv.x *= u_resolution.x / u_resolution.y;
          vec2 p = uv * u_scale;

          // Apply rotation
          if (u_rotationSpeed != 0.0) {
            float angle = u_time * u_rotationSpeed;
            float s = sin(angle);
            float c = cos(angle);
            mat2 rot = mat2(c, -s, s, c);
            p = rot * (p - u_scale * 0.5) + u_scale * 0.5;
          }

          // Apply flow
          p.x += u_time * u_speed * u_flowX;
          p.y += u_time * u_speed * u_flowY;

          // Apply domain distortion if enabled
          if (u_distortionEnabled == 1) {
            vec2 q = vec2(
              getNoise(p * u_distortionScale),
              getNoise(p * u_distortionScale + vec2(5.2, 1.3))
            );
            p += q * u_distortionAmount;
          }

          // Add time animation to noise
          vec2 animatedP = p + vec2(0.0, u_time * u_speed * 0.1);

          // Get noise value
          float noiseValue = getNoise(animatedP);

          // Normalize to 0-1 range
          noiseValue = noiseValue * 0.5 + 0.5;

          // Apply color based on mode
          vec3 color;

          if (u_colorMode == 0) {
            // Gradient mode
            color = mix(u_color1, u_color2, noiseValue);
          } else if (u_colorMode == 1) {
            // Palette mode (3 colors)
            if (noiseValue < 0.5) {
              color = mix(u_color1, u_color2, noiseValue * 2.0);
            } else {
              color = mix(u_color2, u_color3, (noiseValue - 0.5) * 2.0);
            }
          } else if (u_colorMode == 2) {
            // Hue shift mode
            float hue = fract(noiseValue + u_time * u_hueShift * 0.1);
            color = hsv2rgb(vec3(hue, 1.0, 1.0));
          } else {
            // Monochrome mode
            color = u_color1 * noiseValue;
          }

          // Apply saturation
          color = adjustSaturation(color, u_saturation);

          // Apply contrast
          color = (color - 0.5) * u_contrast + 0.5;

          // Apply brightness
          color *= u_brightness;

          // Apply posterization if enabled
          if (u_posterize > 0) {
            float levels = float(u_posterize);
            color = floor(color * levels) / levels;
          }

          // Apply invert
          if (u_invert == 1) {
            color = 1.0 - color;
          }

          // Clamp to valid range
          color = clamp(color, 0.0, 1.0);

          gl_FragColor = vec4(color, 1.0);
        }
      `;

const noiseTypeIds: Record<string, number> = {
  perlin: 0,
  simplex: 1,
  fbm: 2,
  voronoi: 3,
  cellular: 4,
};

const colorModeIds: Record<string, number> = {
  gradient: 0,
  palette: 1,
  "hue-shift": 2,
  monochrome: 3,
};

export const noiseShaderComponent: VizComponentImplementation = {
  id: "noise-shader",
  name: "Noise Shader",
  rendererFamily: "three",
  description: "Deterministic package-runtime procedural noise shader.",
  render: ({ viewport, frameContext, layer, settings }) => {
    const noise = asRecord(settings.noise);
    const animation = asRecord(settings.animation);
    const distortion = asRecord(settings.distortion);
    const color = asRecord(settings.color);
    const output = asRecord(settings.output);
    const noiseType = asString(noise.type, "fbm");
    const colorMode = asString(color.mode, "gradient");

    return {
      kind: "shader",
      id: layer.id,
      programId: "viz-core/noise-shader/v1",
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      vertexShader: noiseShaderVertexShader,
      fragmentShader: noiseShaderFragmentShader,
      uniforms: {
        u_time: frameContext.timeInSeconds,
        u_resolution: {
          type: "vec2",
          value: [viewport.width, viewport.height],
        },
        u_noiseType: noiseTypeIds[noiseType] ?? 2,
        u_scale: asNumber(noise.scale, 3),
        u_octaves: asNumber(noise.octaves, 4),
        u_lacunarity: asNumber(noise.lacunarity, 2),
        u_gain: asNumber(noise.gain, 0.5),
        u_speed: asNumber(animation.speed, 1),
        u_flowX: asNumber(animation.flowX, 0),
        u_flowY: asNumber(animation.flowY, 0),
        u_rotationSpeed: asNumber(animation.rotationSpeed, 0),
        u_distortionEnabled: asBoolean(distortion.enabled, false) ? 1 : 0,
        u_distortionAmount: asNumber(distortion.amount, 1),
        u_distortionScale: asNumber(distortion.scale, 2),
        u_colorMode: colorModeIds[colorMode] ?? 0,
        u_color1: {
          type: "color",
          value: asString(color.color1, "#000000"),
        },
        u_color2: {
          type: "color",
          value: asString(color.color2, "#ffffff"),
        },
        u_color3: {
          type: "color",
          value: asString(color.color3, "#ff0000"),
        },
        u_hueShift: asNumber(color.hueShift, 1),
        u_saturation: asNumber(color.saturation, 1),
        u_brightness: asNumber(output.brightness, 1),
        u_contrast: asNumber(output.contrast, 1),
        u_invert: asBoolean(output.invert, false) ? 1 : 0,
        u_posterize: asNumber(output.posterize, 0),
      },
    } satisfies VizRenderShaderNode;
  },
};
