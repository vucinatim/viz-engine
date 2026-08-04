import type {
  VizMaterializedAsset,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  Vector2,
  Vector3,
  type Material,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { createVizThreePostProcessingPipeline } from './post-processing.js';
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  assertProgram,
  hashString,
} from './program-input.js';
import { createVizStageCharacterController } from './stage-characters.js';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/stage-scene/v1';
const MAX_CROWD_COUNT = 1_000;
const LASER_COUNT = 12;
const BEAM_COUNT = 6;
const MOVING_LIGHT_COUNT = 8;
const STROBE_COUNT = 10;

const CAMERA_PATH_POINTS: Readonly<
  Record<string, readonly (readonly [number, number, number])[]>
> = {
  'Panoramic Sweep': [
    [0, 65, 45],
    [-80, 40, 100],
    [0, 30, 130],
    [80, 40, 100],
    [20, 15, 25],
    [0, 18, 60],
    [-20, 20, 80],
    [0, 65, 45],
  ],
  'Stage Circle': [
    [0, 10, 30],
    [25, 10, 15],
    [35, 10, -10],
    [25, 10, -25],
    [0, 10, -30],
    [-25, 10, -25],
    [-35, 10, -10],
    [-25, 10, 15],
    [0, 10, 30],
  ],
  'Crowd Flyover': [
    [0, 5, 20],
    [-15, 8, 40],
    [-10, 12, 60],
    [0, 15, 80],
    [10, 12, 60],
    [15, 8, 40],
    [0, 5, 20],
  ],
  'High Orbit': [
    [0, 80, 80],
    [60, 80, 40],
    [80, 80, -20],
    [40, 80, -60],
    [-40, 80, -60],
    [-80, 80, -20],
    [-60, 80, 40],
    [0, 80, 80],
  ],
};

const asVector3 = (
  value: unknown,
  fallback: readonly [number, number, number],
): readonly [number, number, number] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return [
    asNumber(value[0], fallback[0]),
    asNumber(value[1], fallback[1]),
    asNumber(value[2], fallback[2]),
  ];
};

const resolveMode = (value: unknown, time: number, count: number): number => {
  const mode = asString(value, 'auto');
  if (mode === 'auto') {
    return Math.floor(time / 8) % count;
  }
  const parsed = Number.parseInt(mode, 10);
  return Number.isFinite(parsed) ? Math.min(count - 1, Math.max(0, parsed)) : 0;
};

const hash01 = (seed: number, index: number): number => {
  let value = Math.imul(seed ^ index, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
};

const setColor = (
  target: Color,
  colorMode: string,
  singleColor: string,
  hue: number,
  saturation = 1,
  lightness = 0.5,
): void => {
  if (colorMode === 'single') {
    target.set(singleColor);
  } else {
    target.setHSL(((hue % 1) + 1) % 1, saturation, lightness);
  }
};

const createShaderWallMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new Vector2(1, 1) },
      u_scale: { value: 2 },
      u_rotationSpeed: { value: 1 },
      u_colorSpeed: { value: 3 },
      u_travelSpeed: { value: 1 },
      u_brightness: { value: 2 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float u_time;
      uniform float u_scale;
      uniform float u_rotationSpeed;
      uniform float u_colorSpeed;
      uniform float u_travelSpeed;
      uniform float u_brightness;
      varying vec3 vWorldPosition;

      const int MAX_STEPS = 64;
      const float MAX_DIST = 100.0;
      const float SURF_DIST = 0.001;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
      }

      mat3 rotateY(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
      }

      mat3 rotateZ(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
      }

      float map(vec3 p) {
        p.z = mod(p.z + 10.0, 20.0) - 10.0;
        p = rotateY(u_time * 0.1 * u_rotationSpeed) * p;
        vec4 q = vec4(p, 1.0);
        vec3 original = p;
        float scale = u_scale + 0.2 * sin(u_time * 0.2);
        float minimumRadius = 0.5 + 0.1 * cos(u_time * 0.15);
        for (int index = 0; index < 4; index++) {
          q.xyz = clamp(q.xyz, -1.0, 1.0) * 2.0 - q.xyz;
          float radiusSquared = dot(q.xyz, q.xyz);
          if (radiusSquared < minimumRadius) {
            q *= 1.0 / minimumRadius;
          } else if (radiusSquared < 1.0) {
            q *= 1.0 / radiusSquared;
          }
          q = q * scale + vec4(original, 1.0);
        }
        return (length(q.xyz) - 1.0) / abs(q.w);
      }

      vec3 normalAt(vec3 p) {
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
        ));
      }

      void main() {
        vec2 uv = vec2(vWorldPosition.x, vWorldPosition.y - 15.0) * 0.08;
        vec3 origin = vec3(0.0, 0.0, 2.5 - u_time * 0.5 * u_travelSpeed);
        vec3 direction = normalize(vec3(uv, -1.5));
        direction = rotateZ(u_time * 0.1 * u_rotationSpeed) * direction;
        float distance = 0.0;
        for (int index = 0; index < MAX_STEPS; index++) {
          vec3 point = origin + direction * distance;
          float stepDistance = map(point);
          distance += stepDistance;
          if (distance > MAX_DIST || stepDistance < SURF_DIST) break;
        }
        vec3 color = vec3(0.0);
        if (distance < MAX_DIST) {
          vec3 point = origin + direction * distance;
          float light = dot(normalize(vec3(1.0)), normalAt(point)) * 0.5 + 0.5;
          color = palette(point.y * 0.1 + u_time * 0.1 * u_colorSpeed)
            * light * u_brightness;
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: DoubleSide,
  });

const createBeamMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      color: { value: new Color('#88aaff') },
      time: { value: 0 },
      intensity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -viewPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float intensity;
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      void main() {
        float vertical = pow(1.0 - vUv.y, 2.0);
        float facing = pow(abs(dot(normalize(vViewPosition), vNormal)), 1.5);
        float flicker = 0.9 + 0.1 * (sin(time * 10.0 + vUv.y * 20.0) * 0.5 + 0.5);
        gl_FragColor = vec4(color, vertical * facing * 0.15 * flicker * intensity);
      }
    `,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

const createLaserBeamMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { color: { value: new Color('#ff0000') } },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vPosition;
      void main() {
        float fade = pow(1.0 - clamp(vPosition.y / 300.0, 0.0, 1.0), 4.5);
        gl_FragColor = vec4(color * (1.0 + fade * 2.0), fade);
      }
    `,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

const createLaserSheetMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      color: { value: new Color('#ff0000') },
      spread: { value: 1 },
    },
    vertexShader: `
      uniform float spread;
      varying vec2 vUv;
      varying float vSpread;
      void main() {
        vUv = uv;
        vSpread = spread;
        vec3 transformed = position;
        transformed.x *= spread;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec2 vUv;
      varying float vSpread;
      void main() {
        float vertical = pow(1.0 - vUv.y, 4.0);
        float leftEdge = abs(2.0 * vUv.x + vUv.y - 1.0) / sqrt(5.0);
        float rightEdge = abs(2.0 * vUv.x - vUv.y - 1.0) / sqrt(5.0);
        float edge = 1.0 - smoothstep(
          0.0,
          0.002 / max(vSpread, 0.001),
          min(leftEdge, rightEdge)
        );
        gl_FragColor = vec4(color + color * edge * 4.0, (0.1 + edge) * vertical);
      }
    `,
    blending: AdditiveBlending,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

const createCameraCurve = (name: string): CatmullRomCurve3 => {
  const points =
    CAMERA_PATH_POINTS[name] ?? CAMERA_PATH_POINTS['Panoramic Sweep']!;
  return new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    true,
  );
};

const updateCinematicCamera = ({
  camera,
  curve,
  frame,
  fps,
  duration,
  smoothing,
  initialPosition,
  lookAt,
}: {
  camera: PerspectiveCamera;
  curve: CatmullRomCurve3;
  frame: number;
  fps: number;
  duration: number;
  smoothing: number;
  initialPosition: readonly [number, number, number];
  lookAt: readonly [number, number, number];
}): void => {
  const position = new Vector3(...initialPosition);
  const sample = new Vector3();
  const maximumHistory = Math.min(
    frame + 1,
    Math.max(
      1,
      Math.min(900, Math.ceil(Math.log(0.0001) / Math.log(1 - smoothing))),
    ),
  );
  const firstFrame = Math.max(0, frame - maximumHistory + 1);

  if (firstFrame > 0) {
    const firstProgress = ((firstFrame / fps) % duration) / duration;
    curve.getPointAt(firstProgress, position);
  }

  for (
    let sampledFrame = firstFrame;
    sampledFrame <= frame;
    sampledFrame += 1
  ) {
    const progress = ((sampledFrame / fps) % duration) / duration;
    curve.getPointAt(progress, sample);
    position.lerp(sample, smoothing);
  }

  camera.position.copy(position);
  camera.lookAt(...lookAt);
};

export const createStageSceneProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
  materializedAssets: initialMaterializedAssets,
  modelResources,
  invalidate,
}) => {
  assertProgram(node, PROGRAM_ID, 'Stage Scene');

  const scene = new Scene();
  scene.fog = new FogExp2('#000000', 0.008);
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    2_000,
  );
  camera.rotation.order = 'YXZ';
  scene.add(root);

  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const trackGeometry = <T extends BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const trackMaterial = <T extends Material>(material: T): T => {
    materials.add(material);
    return material;
  };

  const groundMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#2a2a2a',
      roughness: 0.9,
      metalness: 0.1,
      side: DoubleSide,
    }),
  );
  const ground = new Mesh(
    trackGeometry(new PlaneGeometry(400, 400)),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;

  const stageMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#333333',
      metalness: 0.2,
      roughness: 0.8,
    }),
  );
  const stage = new Mesh(
    trackGeometry(new BoxGeometry(125, 3, 25)),
    stageMaterial,
  );
  stage.position.y = 1.5;

  const boothMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#2b2b2b',
      roughness: 0.5,
    }),
  );
  const booth = new Mesh(
    trackGeometry(new BoxGeometry(8, 3, 6)),
    boothMaterial,
  );
  booth.position.set(0, 4.5, -2);
  root.add(ground, stage, booth);

  const speakerGeometry = trackGeometry(new BoxGeometry(5, 3, 3));
  const speakerMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#1a1a1a',
      roughness: 0.8,
    }),
  );
  const speakers = new InstancedMesh(speakerGeometry, speakerMaterial, 14);
  const speakerObject = new Object3D();
  let speakerIndex = 0;
  for (const side of [-1, 1]) {
    let pivotY = 27.25;
    let pivotZ = -7.5;
    let angle = 0;
    for (let row = 0; row < 7; row += 1) {
      if (row >= 3 && row > 0) {
        angle += Math.PI / 45;
      }
      const centerY = -1.5 * Math.cos(angle) - 1.5 * Math.sin(angle);
      const centerZ = -1.5 * Math.sin(angle) + 1.5 * Math.cos(angle);
      speakerObject.position.set(
        side * 28.75,
        pivotY + centerY,
        pivotZ + centerZ,
      );
      speakerObject.rotation.set(angle, 0, 0);
      speakerObject.updateMatrix();
      speakers.setMatrixAt(speakerIndex, speakerObject.matrix);
      speakerIndex += 1;
      pivotY =
        speakerObject.position.y -
        1.5 * Math.cos(angle) +
        1.5 * Math.sin(angle);
      pivotZ =
        speakerObject.position.z -
        1.5 * Math.sin(angle) -
        1.5 * Math.cos(angle);
    }
  }
  speakers.instanceMatrix.needsUpdate = true;
  root.add(speakers);

  const stageOutlineMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#8888ff',
      emissive: '#444480',
      emissiveIntensity: 4,
    }),
  );
  const stageOutlineGeometry = trackGeometry(new BoxGeometry(1, 1, 1));
  const stageOutline = new Group();
  for (const { position, scale, rotationY } of [
    {
      position: [0, 3.1, 12.5],
      scale: [125, 0.2, 0.2],
      rotationY: 0,
    },
    {
      position: [-62.5, 3.1, 0],
      scale: [25, 0.2, 0.2],
      rotationY: Math.PI / 2,
    },
    {
      position: [62.5, 3.1, 0],
      scale: [25, 0.2, 0.2],
      rotationY: Math.PI / 2,
    },
  ] as const) {
    const bar = new Mesh(stageOutlineGeometry, stageOutlineMaterial);
    bar.position.set(position[0], position[1], position[2]);
    bar.scale.set(scale[0], scale[1], scale[2]);
    bar.rotation.y = rotationY;
    stageOutline.add(bar);
  }
  root.add(stageOutline);

  const shaderWallMaterial = trackMaterial(createShaderWallMaterial());
  const shaderWall = new Group();
  const mainWall = new Mesh(
    trackGeometry(new PlaneGeometry(49.5, 24.5)),
    shaderWallMaterial,
  );
  mainWall.position.set(0, 15, -10);
  const sidePanelGeometry = trackGeometry(new PlaneGeometry(15, 24.5));
  const leftPanel = new Mesh(sidePanelGeometry, shaderWallMaterial);
  leftPanel.position.set(-43.75, 15, -5);
  leftPanel.rotation.y = Math.PI / 6;
  const rightPanel = new Mesh(sidePanelGeometry, shaderWallMaterial);
  rightPanel.position.set(43.75, 15, -5);
  rightPanel.rotation.y = -Math.PI / 6;
  shaderWall.add(mainWall, leftPanel, rightPanel);
  root.add(shaderWall);

  const beamGeometry = trackGeometry(
    new CylinderGeometry(5, 0.5, 100, 32, 1, true),
  );
  beamGeometry.translate(0, 50, 0);
  beamGeometry.rotateX(Math.PI / 2);
  const beamGroup = new Group();
  const beams: Mesh<BufferGeometry, ShaderMaterial>[] = [];
  for (let index = 0; index < BEAM_COUNT; index += 1) {
    const material = trackMaterial(createBeamMaterial());
    const beam = new Mesh(beamGeometry, material);
    beam.position.set((index - 2.5) * 15, 3, 10);
    beamGroup.add(beam);
    beams.push(beam);
  }
  root.add(beamGroup);

  const laserBeamGeometry = trackGeometry(
    new CylinderGeometry(0.03, 0.03, 300, 8),
  );
  laserBeamGeometry.translate(0, 150, 0);
  const laserBeams: Mesh<BufferGeometry, ShaderMaterial>[] = [];
  const laserBeamGroup = new Group();
  for (let index = 0; index < LASER_COUNT; index += 1) {
    const material = trackMaterial(createLaserBeamMaterial());
    const laser = new Mesh(laserBeamGeometry, material);
    laser.position.set((index / 11 - 0.5) * 90, 36, -18);
    laser.rotation.x = Math.PI / 2;
    laserBeamGroup.add(laser);
    laserBeams.push(laser);
  }

  const laserSheetGeometry = trackGeometry(new BufferGeometry());
  laserSheetGeometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([-7.5, 150, 0, 7.5, 150, 0, 0, 0, 0]),
      3,
    ),
  );
  laserSheetGeometry.setAttribute(
    'uv',
    new BufferAttribute(new Float32Array([0, 1, 1, 1, 0.5, 0]), 2),
  );
  laserSheetGeometry.computeVertexNormals();
  const laserSheets: Mesh<BufferGeometry, ShaderMaterial>[] = [];
  const laserSheetGroup = new Group();
  for (let index = 0; index < LASER_COUNT + 2; index += 1) {
    const material = trackMaterial(createLaserSheetMaterial());
    const sheet = new Mesh(laserSheetGeometry, material);
    const isStatic = index >= LASER_COUNT;
    sheet.position.set(
      isStatic ? (index === LASER_COUNT ? -25 : 25) : (index / 11 - 0.5) * 90,
      36,
      -25,
    );
    sheet.rotation.x = Math.PI / 2;
    sheet.userData.static = isStatic;
    laserSheetGroup.add(sheet);
    laserSheets.push(sheet);
  }
  const lasersGroup = new Group();
  lasersGroup.add(laserBeamGroup, laserSheetGroup);
  root.add(lasersGroup);

  const movingLightsGroup = new Group();
  const movingLights: SpotLight[] = [];
  const movingLightTargets: Object3D[] = [];
  for (let index = 0; index < MOVING_LIGHT_COUNT; index += 1) {
    const light = new SpotLight('#ffffff', 5, 150, Math.PI / 12, 0.3, 0);
    light.position.set((index / 7 - 0.5) * 80, 35, -15);
    const target = new Object3D();
    light.target = target;
    movingLightsGroup.add(light, target);
    movingLights.push(light);
    movingLightTargets.push(target);
  }
  root.add(movingLightsGroup);

  const strobeBodyGeometry = trackGeometry(new BoxGeometry(2, 1, 1.5));
  const strobeBodyMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#1a1a1a',
      roughness: 0.4,
    }),
  );
  const strobeBodies = new InstancedMesh(
    strobeBodyGeometry,
    strobeBodyMaterial,
    STROBE_COUNT,
  );
  const strobeFaceGeometry = trackGeometry(new BoxGeometry(1.7, 0.8, 0.3));
  const strobeFaceMaterial = trackMaterial(
    new MeshBasicMaterial({
      color: '#ffffff',
      vertexColors: true,
    }),
  );
  const strobeFaces = new InstancedMesh(
    strobeFaceGeometry,
    strobeFaceMaterial,
    STROBE_COUNT,
  );
  const strobeFlashMaterial = trackMaterial(
    new MeshBasicMaterial({
      color: '#ffffff',
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const strobeFlashSurface = new Mesh(strobeFaceGeometry, strobeFlashMaterial);
  strobeFlashSurface.rotation.set(-Math.PI / 16, 0, 0);
  strobeFlashSurface.renderOrder = 10;
  strobeFlashSurface.visible = false;
  const strobeObject = new Object3D();
  for (let index = 0; index < STROBE_COUNT; index += 1) {
    strobeObject.position.set((index - 4.5) * 11, 3.5, 10);
    strobeObject.rotation.set(-Math.PI / 16, 0, 0);
    strobeObject.updateMatrix();
    strobeBodies.setMatrixAt(index, strobeObject.matrix);
    strobeObject.translateZ(0.75);
    strobeObject.updateMatrix();
    strobeFaces.setMatrixAt(index, strobeObject.matrix);
  }
  strobeBodies.instanceMatrix.needsUpdate = true;
  strobeFaces.instanceMatrix.needsUpdate = true;
  const strobeFlashLight = new PointLight('#ffffff', 0, 90, 2);
  root.add(strobeBodies, strobeFaces, strobeFlashSurface, strobeFlashLight);

  const crowdGeometry = trackGeometry(new CapsuleGeometry(0.35, 1.2, 3, 6));
  const crowdMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#9999bb',
      roughness: 0.8,
      vertexColors: true,
    }),
  );
  const crowd = new InstancedMesh(
    crowdGeometry,
    crowdMaterial,
    MAX_CROWD_COUNT,
  );
  crowd.instanceMatrix.setUsage(DynamicDrawUsage);
  crowd.frustumCulled = false;
  root.add(crowd);

  const dj = new Group();
  dj.position.set(0, 5.5, -7);
  const actorMaterial = trackMaterial(
    new MeshStandardMaterial({
      color: '#ddddff',
      emissive: '#441166',
      emissiveIntensity: 0.5,
      roughness: 0.65,
    }),
  );
  const torso = new Mesh(
    trackGeometry(new CylinderGeometry(0.65, 0.85, 2.2, 8)),
    actorMaterial,
  );
  const head = new Mesh(
    trackGeometry(new SphereGeometry(0.5, 10, 8)),
    actorMaterial,
  );
  head.position.y = 1.55;
  const armGeometry = trackGeometry(new BoxGeometry(0.35, 1.8, 0.35));
  const leftArmPivot = new Group();
  leftArmPivot.position.set(-0.9, 0.75, 0);
  const leftArm = new Mesh(armGeometry, actorMaterial);
  leftArm.position.y = -0.7;
  leftArmPivot.add(leftArm);
  const rightArmPivot = new Group();
  rightArmPivot.position.set(0.9, 0.75, 0);
  const rightArm = new Mesh(armGeometry, actorMaterial);
  rightArm.position.y = -0.7;
  rightArmPivot.add(rightArm);
  dj.add(torso, head, leftArmPivot, rightArmPivot);
  root.add(dj);

  const hemisphere = new HemisphereLight('#8888ff', '#ff8844', 2);
  const ambient = new AmbientLight('#ffffff', 1);
  scene.add(hemisphere, ambient);

  const washGroup = new Group();
  const washLights = [
    new RectAreaLight('#5566ff', 5, 50, 20),
    new RectAreaLight('#5566ff', 5, 50, 20),
  ];
  washLights[0]!.position.set(-30, 25, 10);
  washLights[1]!.position.set(30, 25, 10);
  for (const light of washLights) {
    light.lookAt(0, 0, 0);
    washGroup.add(light);
  }
  root.add(washGroup);

  const stageUplights = [
    new SpotLight('#7d40ff', 3, 50, Math.PI / 9, 0.5, 1),
    new SpotLight('#7d40ff', 3, 50, Math.PI / 9, 0.5, 1),
  ];
  stageUplights[0]!.position.set(-15, 4, 8);
  stageUplights[1]!.position.set(15, 4, 8);
  for (const light of stageUplights) {
    light.target = booth;
    root.add(light);
  }

  const blindersGroup = new Group();
  const blinderTargets = [new Object3D(), new Object3D()];
  blinderTargets[0]!.position.set(-30, 0, 12);
  blinderTargets[1]!.position.set(30, 0, 12);
  const blinders = [
    new SpotLight('#fff0dd', 0, 600, Math.PI / 4, 0.3, 2),
    new SpotLight('#fff0dd', 0, 600, Math.PI / 4, 0.3, 2),
  ];
  blinders[0]!.position.set(-45, 25, 20);
  blinders[1]!.position.set(45, 25, 20);
  for (let index = 0; index < blinders.length; index += 1) {
    blinders[index]!.target = blinderTargets[index]!;
    blindersGroup.add(blinders[index]!, blinderTargets[index]!);
  }
  root.add(blindersGroup);

  const overheadBlinder = new RectAreaLight('#ffffff', 0, 80, 40);
  overheadBlinder.position.set(0, 60, -5);
  overheadBlinder.lookAt(0, 0, -5);
  root.add(overheadBlinder);

  const accentLight1 = new PointLight('#ff00ff', 1.5, 100, 2);
  const accentLight2 = new PointLight('#00ffff', 1.5, 100, 2);
  accentLight1.position.set(-15, 10, 5);
  accentLight2.position.set(15, 10, 5);
  const djSpotlight = new SpotLight('#ffffff', 0.8, 200, Math.PI / 8, 0.5, 2);
  djSpotlight.position.set(0, 40, 0);
  djSpotlight.target = booth;
  root.add(accentLight1, accentLight2, djSpotlight);

  const helperGeometry = trackGeometry(new SphereGeometry(0.4, 8, 6));
  const helperMaterial = trackMaterial(
    new MeshBasicMaterial({
      color: '#ffff00',
      toneMapped: false,
    }),
  );
  const helpers = new InstancedMesh(
    helperGeometry,
    helperMaterial,
    MOVING_LIGHT_COUNT,
  );
  helpers.count = MOVING_LIGHT_COUNT;
  root.add(helpers);

  const postProcessing = createVizThreePostProcessingPipeline({
    scene,
    camera,
    width,
    height,
    settings: {
      bloomEnabled: true,
      bloomStrength: 0.5,
      bloomRadius: 0.8,
      bloomThreshold: 0.6,
      depthOfFieldEnabled: false,
      depthOfFieldFocus: 10,
      depthOfFieldAperture: 0.0005,
      depthOfFieldMaxBlur: 0.01,
    },
  });

  root.userData.stage = stage;
  root.userData.shaderWall = shaderWall;
  root.userData.speakers = speakers;
  root.userData.beams = beamGroup;
  root.userData.lasers = lasersGroup;
  root.userData.movingLights = movingLightsGroup;
  root.userData.strobes = strobeFaces;
  root.userData.strobeFlashSurface = strobeFlashSurface;
  root.userData.strobeFlashLight = strobeFlashLight;
  root.userData.crowd = crowd;
  root.userData.dj = dj;
  root.userData.helpers = helpers;

  let materializedAssets = initialMaterializedAssets;
  const characterController = createVizStageCharacterController({
    root,
    fallbackDj: dj,
    fallbackCrowd: crowd,
    modelResources,
    invalidate,
  });

  let cameraPathName = '';
  let cameraCurve = createCameraCurve('Panoramic Sweep');
  const crowdObject = new Object3D();
  const crowdColor = new Color();
  const beamColor = new Color();
  const helperMatrix = new Matrix4();

  const updateCamera = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const initialPosition = asVector3(parameters.cameraPosition, [0, 8, 40]);
    const rotation = asVector3(parameters.cameraRotation, [0, 0, 0]);
    const cinematicMode = asBoolean(parameters.cinematicMode, true);

    if (!cinematicMode) {
      camera.position.set(...initialPosition);
      camera.rotation.set(...rotation);
      return;
    }

    const nextPathName = asString(parameters.cinematicPath, 'Panoramic Sweep');
    if (nextPathName !== cameraPathName) {
      cameraPathName = nextPathName;
      cameraCurve = createCameraCurve(cameraPathName);
    }
    updateCinematicCamera({
      camera,
      curve: cameraCurve,
      frame: Math.max(0, Math.round(asNumber(parameters.frame, 0))),
      fps: Math.max(1, asNumber(parameters.fps, 60)),
      duration: Math.max(0.001, asNumber(parameters.cinematicDuration, 60)),
      smoothing: Math.min(
        1,
        Math.max(0.01, asNumber(parameters.cinematicLerpSpeed, 0.05)),
      ),
      initialPosition,
      lookAt: asVector3(parameters.cinematicLookAt, [0, 5, 0]),
    });
  };

  const updateCrowd = ({
    time,
    seed,
    count,
  }: {
    time: number;
    seed: number;
    count: number;
  }): void => {
    crowd.count = count;
    const crowdFactor = count / MAX_CROWD_COUNT;
    const depth = 30 + crowdFactor * 50;
    const spreadFactor = 0.8 + crowdFactor * 0.7;

    for (let index = 0; index < count; index += 1) {
      const normalizedDepth = Math.sqrt((index + 0.5) / Math.max(count, 1));
      const z =
        14 + normalizedDepth * depth + (hash01(seed, index * 7 + 1) - 0.5) * 2;
      const maximumSpread = 25 + normalizedDepth * depth * spreadFactor;
      const x = (hash01(seed, index * 7 + 2) * 2 - 1) * maximumSpread;
      const phase = hash01(seed, index * 7 + 3) * Math.PI * 2;
      const speed = 2 + hash01(seed, index * 7 + 4) * 2;
      const bounce = Math.max(0, Math.sin(time * speed + phase)) * 0.22;
      const scale = 0.8 + hash01(seed, index * 7 + 5) * 0.35;
      crowdObject.position.set(x, 1 + bounce, z);
      crowdObject.rotation.set(
        Math.sin(time * speed * 0.5 + phase) * 0.06,
        Math.atan2(-x, -z) +
          (hash01(seed, index * 7 + 6) - 0.5) * (Math.PI / 4),
        Math.sin(time * speed + phase) * 0.08,
      );
      crowdObject.scale.set(scale, scale, scale);
      crowdObject.updateMatrix();
      crowd.setMatrixAt(index, crowdObject.matrix);
      crowdColor.setHSL(
        (hash01(seed, index * 7 + 7) * 0.35 + 0.55) % 1,
        0.45,
        0.45 + hash01(seed, index * 11 + 9) * 0.25,
      );
      crowd.setColorAt(index, crowdColor);
    }
    crowd.instanceMatrix.needsUpdate = true;
    if (crowd.instanceColor) {
      crowd.instanceColor.needsUpdate = true;
    }
  };

  const updateBeams = (
    parameters: Readonly<Record<string, unknown>>,
    time: number,
  ): void => {
    const enabled = asBoolean(parameters.beamsEnabled, true);
    const mode = resolveMode(parameters.beamMode, time, 7);
    const center = (BEAM_COUNT - 1) / 2;
    beamGroup.visible = enabled;

    for (let index = 0; index < beams.length; index += 1) {
      const beam = beams[index]!;
      let rotationX = 0;
      let rotationY = 0;
      const distanceFromCenter = Math.abs(index - center);
      const normalizedFromCenter = (index - center) / center;

      if (mode === 0) {
        const side = index <= center ? 1 : -1;
        rotationY = Math.sin(time * 4 + distanceFromCenter * 0.5) * 0.6 * side;
        rotationX =
          -Math.PI / 3 + Math.cos(time * 4 + distanceFromCenter * 0.5) * 0.4;
      } else if (mode === 1) {
        rotationY = (Math.sin(time * 2 + index) * Math.PI) / 4;
        rotationX = -Math.PI / 3 + Math.sin(time * 5 + index) * 0.2;
      } else if (mode === 2) {
        const side = index <= center ? -1 : 1;
        const cross = (Math.sin(time * 4) + 1) / 2;
        rotationY =
          side * (Math.PI / 6) * (1 - cross) +
          normalizedFromCenter * (Math.PI / 4) * cross;
        rotationX = -Math.PI / 3 + cross * 0.6;
      } else if (mode === 3) {
        const fan = (Math.sin(time * 3) + 1) / 2;
        rotationY = (fan * normalizedFromCenter * Math.PI) / 3;
        rotationX = -Math.PI / 3 + fan * 0.6;
      } else if (mode === 4) {
        rotationX =
          -Math.PI / 2.5 + ((Math.sin(time * 1.5) + 1) / 2) * (Math.PI / 3);
        rotationY = normalizedFromCenter * (Math.PI / 8);
      } else if (mode === 5) {
        if (index <= 1 || index >= 4) {
          const pairIndex = index <= 1 ? index : index - 4;
          rotationY = index <= 1 ? -Math.PI / 2.5 : Math.PI / 2.5;
          rotationX =
            -Math.PI / 4 + Math.sin(time * 2 + pairIndex * Math.PI) * 0.6;
        } else {
          rotationX = -Math.PI / 3 + Math.sin(time * 1.2) * 0.4;
        }
      } else {
        const pulse = (Math.sin(time * 2) + 1) / 2;
        const breath = (Math.sin(time * 1.5) + 1) / 2;
        const cross = Math.sin(time * 3);
        if (index <= 1 || index >= 4) {
          const pairIndex = index <= 1 ? index : index - 4;
          const direction = index <= 1 ? -1 : 1;
          rotationY =
            direction * (Math.PI / 3 + pulse * (Math.PI / 5) + pairIndex * 0.4);
          rotationX = -Math.PI / 3 + breath * 0.6;
        } else {
          rotationY = (index === 2 ? 1 : -1) * cross * (Math.PI / 4);
          rotationX = -Math.PI / 4 + breath * 0.5 + Math.abs(cross) * 0.2;
        }
      }

      beam.rotation.set(rotationX, rotationY, 0);
      beam.material.uniforms.time!.value = time;
      beam.material.uniforms.intensity!.value = Math.max(
        0,
        asNumber(parameters.beamIntensity, 1),
      );
      let hue = time * 0.2 + index * 0.1;
      if (mode === 1) hue = Math.floor(time * 2) * 0.3;
      if (mode === 3) hue = time * 0.3 + index * 0.05;
      if (mode === 5) {
        hue =
          index <= 1 || index >= 4
            ? 0.55 + Math.sin(time * 2) * 0.1
            : 0.08 + Math.sin(time * 1.5) * 0.05;
      }
      if (mode === 6) {
        hue = 0.7 + ((Math.sin(time * 2) + 1) / 2) * 0.3;
      }
      setColor(
        beamColor,
        asString(parameters.beamColorMode, 'multi'),
        asString(parameters.beamColor, '#88aaff'),
        hue,
        1,
        0.6,
      );
      beam.material.uniforms.color!.value.copy(beamColor);
    }
  };

  const updateLasers = (
    parameters: Readonly<Record<string, unknown>>,
    time: number,
  ): void => {
    const enabled = asBoolean(parameters.lasersEnabled, true);
    const mode = resolveMode(parameters.laserMode, time, 5);
    const speed = Math.max(0, asNumber(parameters.laserRotationSpeed, 1));
    const maximum = Math.min(
      LASER_COUNT,
      Math.max(1, Math.round(asNumber(parameters.maximumLaserCount, 12))),
    );
    const colorMode = asString(parameters.laserColorMode, 'multi');
    const singleColor = asString(parameters.laserColor, '#ff0000');
    lasersGroup.visible = enabled;

    for (const laser of laserBeams) {
      laser.visible = false;
      laser.rotation.set(Math.PI / 2, 0, 0);
    }
    for (const sheet of laserSheets) {
      sheet.visible = false;
      sheet.rotation.set(Math.PI / 2, 0, 0);
      sheet.scale.setScalar(1);
    }

    const applyBeamColor = (
      laser: Mesh<BufferGeometry, ShaderMaterial>,
      hue: number,
    ): void => {
      setColor(
        laser.material.uniforms.color!.value as Color,
        colorMode,
        singleColor,
        hue,
      );
    };
    const applySheet = (
      sheet: Mesh<BufferGeometry, ShaderMaterial>,
      hue: number,
      spread: number,
    ): void => {
      sheet.material.uniforms.spread!.value = spread;
      setColor(
        sheet.material.uniforms.color!.value as Color,
        colorMode,
        singleColor,
        hue,
        0.9,
        0.5,
      );
    };

    if (mode === 0) {
      for (let index = 0; index < maximum; index += 1) {
        const laser = laserBeams[index]!;
        laser.visible = true;
        laser.rotation.z =
          (Math.sin(time * 2 * speed + index * 0.8) * Math.PI) / 6;
        laser.rotation.y = (Math.cos(time * 0.2 * speed) * Math.PI) / 12;
        applyBeamColor(laser, time * 0.1 + index * 0.05);
      }
    } else if (mode === 1) {
      for (let index = 0; index < maximum; index += 1) {
        const laser = laserBeams[index]!;
        laser.visible = true;
        laser.rotation.y =
          (Math.sin(time * 40 * speed + index * 0.2) * Math.PI) / 4;
        laser.rotation.z = Math.PI / 16;
        applyBeamColor(laser, Math.floor(time * 2) * 0.3);
      }
    } else if (mode === 2) {
      const activeA = Math.floor(time * 2) % maximum;
      const activeB = maximum - 1 - activeA;
      for (const index of new Set([activeA, activeB])) {
        const sheet = laserSheets[index]!;
        sheet.visible = true;
        const steppedTime = Math.floor(time * 5 * speed);
        const randomSeed = index * 1.23;
        sheet.rotation.z = (Math.sin(steppedTime + randomSeed) * Math.PI) / 8;
        sheet.rotation.y =
          (Math.cos(steppedTime * 1.5 + randomSeed) * Math.PI) / 16;
        const scale = 0.8 + Math.abs(Math.sin(time * 15 * speed)) * 0.4;
        sheet.scale.setScalar(scale);
        applySheet(
          sheet,
          Math.floor(time) * 0.1,
          0.3 + ((Math.sin(time * 1.5 * speed) + 1) / 2) * 2.2,
        );
      }
    } else {
      const maximumSheets = Math.min(2, maximum);
      for (let offset = 0; offset < maximumSheets; offset += 1) {
        const sheet = laserSheets[LASER_COUNT + offset]!;
        sheet.visible = true;
        const randomSeed = (LASER_COUNT + offset) * 1.23;
        const rotationSpeed = mode === 3 ? 0.3 : 0.4;
        sheet.rotation.z =
          (Math.sin(time * rotationSpeed * speed + randomSeed) * Math.PI) /
          (mode === 3 ? 10 : 8);
        sheet.rotation.y =
          (Math.cos(
            time * rotationSpeed * (mode === 3 ? 0.8 : 0.6) * speed +
              randomSeed,
          ) *
            Math.PI) /
          (mode === 3 ? 20 : 18);
        const spreadProgress =
          (Math.sin(time * (mode === 3 ? 0.8 : 1) * speed + offset) + 1) / 2;
        applySheet(
          sheet,
          time * (mode === 3 ? 0.05 : 0.08) + offset * 0.15,
          (mode === 3 ? 0.7 : 0.8) + spreadProgress * (mode === 3 ? 1.8 : 2.2),
        );
      }

      const remaining = Math.max(0, maximum - maximumSheets);
      const beamCount = Math.min(2, remaining);
      const available = Math.min(LASER_COUNT, Math.ceil(remaining / 2));
      const index =
        available > 0
          ? Math.floor(time * (mode === 3 ? 8 : 2) * speed) % available
          : 0;
      const indices = [index, LASER_COUNT - 1 - index];
      for (let slot = 0; slot < beamCount; slot += 1) {
        const laser = laserBeams[indices[slot]!]!;
        laser.visible = true;
        const direction = slot === 0 ? 1 : -1;
        if (mode === 3) {
          laser.rotation.z = (direction * Math.PI) / 8;
          laser.rotation.y = (direction * Math.PI) / 16;
          applyBeamColor(laser, time * 0.2);
        } else {
          const phase =
            time * 1.5 * speed +
            Math.abs(indices[slot]! - LASER_COUNT / 2) * 0.3;
          laser.rotation.z = (Math.sin(phase) * Math.PI) / 5;
          laser.rotation.y = (Math.cos(phase * 0.7) * Math.PI) / 10;
          applyBeamColor(laser, phase * 0.1 + indices[slot]! * 0.08);
        }
      }
    }
  };

  const updateMovingLights = (
    parameters: Readonly<Record<string, unknown>>,
    time: number,
  ): void => {
    const enabled = asBoolean(parameters.movingLightsEnabled, true);
    const mode = resolveMode(parameters.movingLightMode, time, 5);
    const speed = Math.max(0, asNumber(parameters.movingLightSpeed, 1));
    const scaledTime = time * 0.5 * speed;
    movingLightsGroup.visible = enabled;

    for (let index = 0; index < MOVING_LIGHT_COUNT; index += 1) {
      const light = movingLights[index]!;
      const target = movingLightTargets[index]!;
      if (mode === 0) {
        target.position.set(
          Math.sin(scaledTime * 0.5) * 60,
          5,
          -20 + index * 2,
        );
      } else if (mode === 1) {
        const angle = scaledTime * 0.8 + index * (Math.PI / 4);
        target.position.set(
          Math.cos(angle) * 40,
          5 + Math.sin(scaledTime * 0.5 + index) * 5,
          Math.sin(angle) * 40 - 20,
        );
      } else if (mode === 2) {
        const phase = scaledTime * 1.2 + index * 0.5;
        target.position.set(
          Math.sin(phase) * 50,
          Math.sin(phase) * 8 + 10,
          Math.cos(phase * 0.7) * 30 - 20,
        );
      } else if (mode === 3) {
        const focus = (Math.sin(scaledTime * 0.6) + 1) / 2;
        const spread = 60 * focus;
        target.position.set(
          Math.sin((index * Math.PI) / 4) * spread,
          5 + focus * 10,
          Math.cos((index * Math.PI) / 4) * spread * 0.5 - 20,
        );
      } else {
        const phaseA = scaledTime * (0.8 + index * 0.1);
        const phaseB = scaledTime * (0.6 + index * 0.15);
        target.position.set(
          Math.sin(phaseA) * 55 + Math.cos(phaseB) * 10,
          Math.sin(phaseB * 1.3) * 12 + 8,
          Math.cos(phaseA * 0.7) * 35 - 20,
        );
      }
      light.intensity = Math.max(
        0,
        asNumber(parameters.movingLightIntensity, 5),
      );
      setColor(
        light.color,
        asString(parameters.movingLightColorMode, 'multi'),
        asString(parameters.movingLightColor, '#ffffff'),
        scaledTime * 0.1 + index * 0.1,
      );
      helperMatrix.makeTranslation(
        light.position.x,
        light.position.y,
        light.position.z,
      );
      helpers.setMatrixAt(index, helperMatrix);
    }
    helpers.instanceMatrix.needsUpdate = true;
  };

  const updateStageLights = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const enabled = asBoolean(parameters.stageLightsEnabled, true);
    const color = asString(parameters.stageLightColor, '#8888ff');
    stageOutline.visible = enabled;
    stageOutlineMaterial.color.set(color);
    stageOutlineMaterial.emissive.set(color).multiplyScalar(0.5);
    for (const light of stageUplights) {
      light.visible = enabled;
    }
  };

  const updateStrobes = (
    parameters: Readonly<Record<string, unknown>>,
    time: number,
    seed: number,
  ): void => {
    const enabled = asBoolean(parameters.strobesEnabled, true);
    const rate = Math.min(
      1,
      Math.max(0, asNumber(parameters.strobeFlashRate, 0.3)),
    );
    const intensity = Math.max(0, asNumber(parameters.strobeIntensity, 500));
    const flashStrength = Math.sqrt(intensity);
    const tick = Math.floor(time * 20);
    const active =
      rate > 0 && hash01(seed, tick * 31 + 17) > 1 - rate
        ? Math.floor(hash01(seed, tick * 31 + 19) * STROBE_COUNT)
        : -1;
    strobeBodies.visible = enabled;
    strobeFaces.visible = enabled;
    for (let index = 0; index < STROBE_COUNT; index += 1) {
      const brightness = index === active ? flashStrength : 1;
      crowdColor.setRGB(brightness, brightness, brightness);
      strobeFaces.setColorAt(index, crowdColor);
    }
    if (strobeFaces.instanceColor) {
      strobeFaces.instanceColor.needsUpdate = true;
    }
    strobeFlashSurface.visible = enabled && active >= 0;
    strobeFlashLight.visible = enabled && active >= 0;
    strobeFlashLight.intensity = active >= 0 ? flashStrength * 750 : 0;
    if (active >= 0) {
      strobeFlashSurface.position.set((active - 4.5) * 11, 3.5, 10);
      strobeFlashSurface.translateZ(0.95);
      strobeFlashSurface.scale.setScalar(1.5 + flashStrength * 0.05);
      strobeFlashLight.position.set((active - 4.5) * 11, 5, 11);
    }
    root.userData.activeStrobeIndex = active;
  };

  const update = (
    nextNode: VizRenderThreeProgramNode,
    nextMaterializedAssets?: ReadonlyMap<string, VizMaterializedAsset>,
  ): void => {
    assertProgram(nextNode, PROGRAM_ID, 'Stage Scene');
    if (nextMaterializedAssets) {
      materializedAssets = nextMaterializedAssets;
    }
    const parameters = nextNode.parameters;
    const time = Math.max(0, asNumber(parameters.time, 0));
    const seed = hashString(asString(parameters.seed, 'stage-scene'));

    updateCamera(parameters);

    shaderWall.visible = asBoolean(parameters.shaderWallEnabled, true);
    shaderWallMaterial.uniforms.u_time!.value = time;
    shaderWallMaterial.uniforms.u_scale!.value = Math.max(
      0.5,
      asNumber(parameters.shaderWallScale, 2),
    );
    shaderWallMaterial.uniforms.u_rotationSpeed!.value = Math.max(
      0,
      asNumber(parameters.shaderWallRotationSpeed, 1),
    );
    shaderWallMaterial.uniforms.u_colorSpeed!.value = Math.max(
      0,
      asNumber(parameters.shaderWallColorSpeed, 3),
    );
    shaderWallMaterial.uniforms.u_travelSpeed!.value = Math.max(
      0,
      asNumber(parameters.shaderWallTravelSpeed, 1),
    );
    shaderWallMaterial.uniforms.u_brightness!.value = Math.max(
      0,
      asNumber(parameters.shaderWallBrightness, 2),
    );

    hemisphere.intensity = Math.max(
      0,
      asNumber(parameters.hemisphereIntensity, 2),
    );
    ambient.intensity = Math.max(0, asNumber(parameters.ambientIntensity, 1));

    updateBeams(parameters, time);
    updateLasers(parameters, time);
    updateMovingLights(parameters, time);
    updateStageLights(parameters);
    updateStrobes(parameters, time, seed);

    washGroup.visible = asBoolean(parameters.stageWashEnabled, true);
    for (const light of washLights) {
      light.intensity = Math.max(0, asNumber(parameters.stageWashIntensity, 5));
    }

    blindersGroup.visible = asBoolean(parameters.blindersEnabled, true);
    const blinderMode = asString(parameters.blinderMode, 'controlled');
    const blinderTick = Math.floor(time * 20);
    const randomBlinderOn = hash01(seed, blinderTick * 43 + 5) > 0.95;
    const controlledBlinderOn = asNumber(parameters.blinderIntensity, 0) > 0.3;
    const blinderOn =
      blinderMode === 'random' ? randomBlinderOn : controlledBlinderOn;
    for (const light of blinders) {
      light.intensity = blinderOn ? 15_000 : 0;
    }

    overheadBlinder.visible = asBoolean(
      parameters.overheadBlinderEnabled,
      true,
    );
    overheadBlinder.intensity = Math.max(
      0,
      asNumber(parameters.overheadBlinderIntensity, 0),
    );

    const accentEnabled = asBoolean(parameters.accentLightsEnabled, true);
    accentLight1.visible = accentEnabled;
    accentLight2.visible = accentEnabled;
    accentLight1.color.set(asString(parameters.accentLight1Color, '#ff00ff'));
    accentLight2.color.set(asString(parameters.accentLight2Color, '#00ffff'));
    accentLight1.position.x = Math.sin(time * 0.7) * 20;
    accentLight1.position.z = Math.cos(time * 0.7) * 10 - 5;
    accentLight2.position.x = Math.sin(time * 0.5) * -20;
    accentLight2.position.z = Math.cos(time * 0.5) * 10 - 5;
    djSpotlight.intensity = Math.max(
      0,
      asNumber(parameters.djSpotIntensity, 0.8),
    );

    const showDj = asBoolean(parameters.showDj, true);
    dj.visible = showDj;
    dj.position.y = 5.5 + Math.max(0, Math.sin(time * 3.2)) * 0.12;
    dj.rotation.y = Math.sin(time * 0.8) * 0.12;
    leftArmPivot.rotation.z = -0.35 - Math.sin(time * 2.4) * 0.75;
    rightArmPivot.rotation.z = 0.35 + Math.sin(time * 2.1 + 1.2) * 0.75;

    const crowdCount = Math.min(
      MAX_CROWD_COUNT,
      Math.max(0, Math.round(asNumber(parameters.crowdCount, 500))),
    );
    updateCrowd({ time, seed, count: crowdCount });
    characterController.update({
      time,
      seed,
      showDj,
      crowdCount,
      animationSpeed: Math.max(
        0,
        asNumber(parameters.characterAnimationSpeed, 1),
      ),
      djAssetId: asString(parameters.djModelAssetId, ''),
      crowdAssetIds: asStringArray(parameters.crowdModelAssetIds),
      materializedAssets,
    });

    helpers.visible = asBoolean(parameters.showHelpers, false);
    postProcessing.update({
      bloomEnabled: asBoolean(parameters.bloomEnabled, true),
      bloomStrength: Math.max(0, asNumber(parameters.bloomStrength, 0.5)),
      bloomRadius: Math.max(0, asNumber(parameters.bloomRadius, 0.8)),
      bloomThreshold: Math.max(0, asNumber(parameters.bloomThreshold, 0.6)),
      depthOfFieldEnabled: false,
      depthOfFieldFocus: 10,
      depthOfFieldAperture: 0.0005,
      depthOfFieldMaxBlur: 0.01,
    });

    root.userData.time = time;
    root.userData.cameraPath = cameraPathName;
    root.userData.crowdCount = crowdCount;
    root.userData.beamMode = resolveMode(parameters.beamMode, time, 7);
    root.userData.laserMode = resolveMode(parameters.laserMode, time, 5);
    root.userData.blinderOn = blinderOn;
  };

  update(node);

  return {
    programId: PROGRAM_ID,
    scene,
    camera,
    root,
    update,
    resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / Math.max(nextHeight, 1);
      camera.updateProjectionMatrix();
      shaderWallMaterial.uniforms.u_resolution!.value.set(
        nextWidth,
        nextHeight,
      );
      postProcessing.resize(nextWidth, nextHeight);
    },
    render(renderer: WebGLRenderer, renderTarget: WebGLRenderTarget) {
      postProcessing.render(renderer, renderTarget);
    },
    whenReady() {
      return characterController.whenReady();
    },
    dispose() {
      characterController.dispose();
      postProcessing.dispose();
      for (const geometry of geometries) {
        geometry.dispose();
      }
      for (const material of materials) {
        material.dispose();
      }
      root.clear();
      scene.clear();
    },
  };
};
