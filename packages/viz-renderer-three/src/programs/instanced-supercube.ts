import type { VizRenderThreeProgramNode } from "@viz-engine/contracts";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import type { VizThreeProgramFactory } from "./types.js";

const PROGRAM_ID = "viz-core/instanced-supercube/v1";
const MAX_GRID_SIZE = 8;
const MAX_CAPACITY = 8 * (12 * MAX_GRID_SIZE - 16);
const SUB_CUBE_SIZE = 3 / 5;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const assertProgram = (node: VizRenderThreeProgramNode): void => {
  if (node.programId !== PROGRAM_ID) {
    throw new Error(
      `Instanced Supercube program cannot update incompatible program "${node.programId}".`,
    );
  }
};

const updateInstanceLayout = ({
  mesh,
  gridSize,
  spacing,
  explosionFactor,
  explosionShift,
  dummy,
}: {
  mesh: InstancedMesh;
  gridSize: number;
  spacing: number;
  explosionFactor: number;
  explosionShift: number;
  dummy: Object3D;
}): void => {
  const centerOffset = (gridSize - 1) / 2;
  const explosionScale =
    1 + (explosionFactor - 1) * explosionShift;
  let instanceIndex = 0;

  for (let hx = -1; hx <= 1; hx += 2) {
    for (let hy = -1; hy <= 1; hy += 2) {
      for (let hz = -1; hz <= 1; hz += 2) {
        const centerX = (hx * spacing) / 2;
        const centerY = (hy * spacing) / 2;
        const centerZ = (hz * spacing) / 2;

        for (let x = 0; x < gridSize; x += 1) {
          for (let y = 0; y < gridSize; y += 1) {
            for (let z = 0; z < gridSize; z += 1) {
              const boundaryCount =
                Number(x === 0 || x === gridSize - 1) +
                Number(y === 0 || y === gridSize - 1) +
                Number(z === 0 || z === gridSize - 1);

              if (boundaryCount < 2 || instanceIndex >= MAX_CAPACITY) {
                continue;
              }

              const localX = (x - centerOffset) * SUB_CUBE_SIZE;
              const localY = (y - centerOffset) * SUB_CUBE_SIZE;
              const localZ = (z - centerOffset) * SUB_CUBE_SIZE;
              dummy.position.set(
                centerX + localX * explosionScale,
                centerY + localY * explosionScale,
                centerZ + localZ * explosionScale,
              );
              dummy.updateMatrix();
              mesh.setMatrixAt(instanceIndex, dummy.matrix);
              instanceIndex += 1;
            }
          }
        }
      }
    }
  }

  mesh.count = instanceIndex;
  mesh.instanceMatrix.needsUpdate = true;
};

export const createInstancedSupercubeProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node);

  const scene = new Scene();
  scene.background = new Color(0x111111);
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const geometry = new BoxGeometry(
    SUB_CUBE_SIZE,
    SUB_CUBE_SIZE,
    SUB_CUBE_SIZE,
  );
  const material = new MeshStandardMaterial({ color: "#ff0000" });
  const mesh = new InstancedMesh(geometry, material, MAX_CAPACITY);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);

  const directionalLight = new DirectionalLight("#ffffff", 1);
  directionalLight.position.set(-8, 10, 12);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  const ambientLight = new AmbientLight("#ffffff", 0.2);

  const shadowGeometry = new PlaneGeometry(100, 100);
  const shadowMaterial = new ShadowMaterial({ opacity: 0.3 });
  const shadowPlane = new Mesh(shadowGeometry, shadowMaterial);
  shadowPlane.receiveShadow = true;
  shadowPlane.position.z = -10;

  root.add(mesh, directionalLight, ambientLight, shadowPlane);
  scene.add(root);

  const dummy = new Object3D();
  const update = (nextNode: VizRenderThreeProgramNode): void => {
    assertProgram(nextNode);
    const parameters = nextNode.parameters;
    const gridSize = Math.min(
      MAX_GRID_SIZE,
      Math.max(3, Math.round(asNumber(parameters.gridSize, 5))),
    );
    const rotation = asNumber(parameters.rotation, 0);

    material.color.set(
      asString(parameters.color, "rgb(255, 0, 0)"),
    );
    mesh.rotation.set(rotation, rotation, 0);
    updateInstanceLayout({
      mesh,
      gridSize,
      spacing: Math.max(0, asNumber(parameters.spacing, 4)),
      explosionFactor: Math.max(
        1,
        asNumber(parameters.explosionFactor, 1.67),
      ),
      explosionShift: Math.min(
        1,
        Math.max(0, asNumber(parameters.explosionShift, 0)),
      ),
      dummy,
    });
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
    },
    render(
      renderer: WebGLRenderer,
      renderTarget: WebGLRenderTarget,
    ) {
      const previousShadowEnabled = renderer.shadowMap.enabled;
      const previousShadowType = renderer.shadowMap.type;
      const previousToneMapping = renderer.toneMapping;
      const previousExposure = renderer.toneMappingExposure;

      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.shadowMap.enabled = previousShadowEnabled;
      renderer.shadowMap.type = previousShadowType;
      renderer.toneMapping = previousToneMapping;
      renderer.toneMappingExposure = previousExposure;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      directionalLight.shadow.map?.dispose();
      root.clear();
      scene.clear();
    },
  };
};
