import type {
  VizMaterializedAsset,
} from "@viz-engine/contracts";
import {
  AnimationMixer,
  Color,
  DataTexture,
  DynamicDrawUsage,
  FloatType,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  RGBAFormat,
  ShaderMaterial,
  SkinnedMesh,
  Texture,
  Vector3,
} from "three";
import {
  createVizThreeDeterministicClipPlayer,
  type VizThreeDeterministicClipPlayer,
} from "../model-animation.js";
import type {
  VizThreeModelResource,
  VizThreeModelResourceLease,
  VizThreeModelResourceManager,
} from "../model-resources.js";

const MAX_CROWD_COUNT = 1_000;
const MODEL_SCALE = 0.032;
const CROWD_ANIMATION_SAMPLE_RATE = 30;
const MAX_CROWD_ANIMATION_SAMPLES = 240;

const hash01 = (seed: number, index: number): number => {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 4_294_967_296;
};

const asModelAsset = (
  assets: ReadonlyMap<string, VizMaterializedAsset>,
  assetId: string,
): VizMaterializedAsset | undefined => {
  const asset = assets.get(assetId);
  if (
    asset?.kind === "model" ||
    (asset?.kind === "binary" &&
      (asset.mimeType?.startsWith("model/") === true ||
        asset.mimeType === "application/vnd.autodesk.fbx"))
  ) {
    return asset;
  }
  return undefined;
};

const getAssetKey = (
  asset: VizMaterializedAsset | undefined,
): string => {
  if (!asset) {
    return "";
  }
  const contentIdentity = asset.metadata?.contentIdentity;
  if (typeof contentIdentity === "string") {
    return `${asset.id}:${contentIdentity}`;
  }
  if (asset.kind === "model") {
    return `${asset.id}:${asset.modelSourceUri ?? ""}`;
  }
  if (asset.kind === "binary") {
    return `${asset.id}:${asset.binarySourceUri ?? ""}`;
  }
  return asset.id;
};

const findSkinnedMeshes = (root: Object3D): SkinnedMesh[] => {
  const meshes: SkinnedMesh[] = [];
  root.traverse((object) => {
    if ((object as SkinnedMesh).isSkinnedMesh === true) {
      meshes.push(object as SkinnedMesh);
    }
  });
  return meshes;
};

const getMaterialTexture = (
  mesh: SkinnedMesh,
): Texture | null => {
  const material = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  return material instanceof MeshStandardMaterial
    ? material.map
    : ((material as MeshStandardMaterial | undefined)?.map ?? null);
};

const getMaterialColor = (
  mesh: SkinnedMesh,
): Color => {
  const material = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  const color = (material as MeshStandardMaterial | undefined)?.color;
  return color instanceof Color
    ? color.clone()
    : new Color("#ffffff");
};

interface CrowdAnimationTexture {
  texture: DataTexture;
  frameCount: number;
  durationSeconds: number;
  boneCount: number;
}

const bakeCrowdAnimationTexture = ({
  root,
  mesh,
  resource,
}: {
  root: Group;
  mesh: SkinnedMesh;
  resource: VizThreeModelResource;
}): CrowdAnimationTexture => {
  const clip = resource.animations[0];
  const durationSeconds = Math.max(clip?.duration ?? 1, 1 / 60);
  const frameCount = Math.max(
    2,
    Math.min(
      MAX_CROWD_ANIMATION_SAMPLES,
      Math.ceil(durationSeconds * CROWD_ANIMATION_SAMPLE_RATE),
    ),
  );
  const boneCount = mesh.skeleton.bones.length;
  const textureWidth = Math.max(4, boneCount * 4);
  const boneData = new Float32Array(
    textureWidth * frameCount * 4,
  );
  const mixer = clip
    ? new AnimationMixer(root)
    : null;
  const action = clip
    ? mixer!.clipAction(clip)
    : null;

  action?.play();

  for (let frame = 0; frame < frameCount; frame += 1) {
    if (mixer) {
      mixer.setTime((frame / frameCount) * durationSeconds);
      root.updateMatrixWorld(true);
    }

    const rootBone = mesh.skeleton.bones[0];
    if (rootBone) {
      rootBone.position.set(0, 0, 0);
      rootBone.quaternion.set(0, 0, 0, 1);
      rootBone.scale.set(1, 1, 1);
      rootBone.updateMatrixWorld(true);
    }
    mesh.skeleton.update();
    boneData.set(
      mesh.skeleton.boneMatrices,
      frame * textureWidth * 4,
    );
  }

  action?.stop();
  mixer?.stopAllAction();
  mixer?.uncacheRoot(root);

  const texture = new DataTexture(
    boneData,
    textureWidth,
    frameCount,
    RGBAFormat,
    FloatType,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    frameCount,
    durationSeconds,
    boneCount,
  };
};

interface CrowdMeshBatch {
  mesh: InstancedMesh;
  material: ShaderMaterial;
  animationTexture: DataTexture;
  phaseAttribute: InstancedBufferAttribute;
  tintAttribute: InstancedBufferAttribute;
  durationSeconds: number;
}

interface StageCrowdArchetype {
  group: Group;
  batches: CrowdMeshBatch[];
  updateAnimation(time: number, speed: number): void;
  setInstances(
    instances: readonly StageCrowdInstance[],
  ): void;
  dispose(): void;
}

interface StageCrowdInstance {
  matrix: Matrix4;
  phase: number;
  tint: Color;
}

const createCrowdShaderMaterial = ({
  mesh,
  animation,
}: {
  mesh: SkinnedMesh;
  animation: CrowdAnimationTexture;
}): ShaderMaterial => {
  const map = getMaterialTexture(mesh);
  const color = getMaterialColor(mesh);

  return new ShaderMaterial({
    uniforms: {
      boneTexture: { value: animation.texture },
      boneTextureWidth: { value: animation.boneCount * 4 },
      animationFrameCount: { value: animation.frameCount },
      animationDuration: { value: animation.durationSeconds },
      animationTime: { value: 0 },
      animationSpeed: { value: 1 },
      bindMatrix: { value: mesh.bindMatrix },
      bindMatrixInverse: { value: mesh.bindMatrixInverse },
      map: { value: map },
      hasMap: { value: map ? 1 : 0 },
      baseColor: { value: color },
    },
    vertexShader: `
      uniform sampler2D boneTexture;
      uniform float boneTextureWidth;
      uniform float animationFrameCount;
      uniform float animationDuration;
      uniform float animationTime;
      uniform float animationSpeed;
      uniform mat4 bindMatrix;
      uniform mat4 bindMatrixInverse;

      attribute float instancePhase;
      attribute vec3 instanceTint;
      attribute vec4 skinIndex;
      attribute vec4 skinWeight;
      varying vec2 vUv;
      varying vec3 vTint;

      mat4 readBoneMatrix(float frameIndex, float boneIndex) {
        float pixel = boneIndex * 4.0;
        float y = (frameIndex + 0.5) / animationFrameCount;
        vec4 row0 = texture2D(
          boneTexture,
          vec2((pixel + 0.5) / boneTextureWidth, y)
        );
        vec4 row1 = texture2D(
          boneTexture,
          vec2((pixel + 1.5) / boneTextureWidth, y)
        );
        vec4 row2 = texture2D(
          boneTexture,
          vec2((pixel + 2.5) / boneTextureWidth, y)
        );
        vec4 row3 = texture2D(
          boneTexture,
          vec2((pixel + 3.5) / boneTextureWidth, y)
        );
        return mat4(row0, row1, row2, row3);
      }

      mat4 sampleBoneMatrix(float boneIndex) {
        float duration = max(animationDuration, 0.0001);
        float normalizedTime = mod(
          animationTime * animationSpeed + instancePhase,
          duration
        ) / duration;
        float frame = normalizedTime * animationFrameCount;
        float frame0 = floor(frame);
        float frame1 = mod(frame0 + 1.0, animationFrameCount);
        float alpha = fract(frame);
        mat4 frameMatrix0 = readBoneMatrix(frame0, boneIndex);
        mat4 frameMatrix1 = readBoneMatrix(frame1, boneIndex);
        return
          frameMatrix0 * (1.0 - alpha) +
          frameMatrix1 * alpha;
      }

      void main() {
        vUv = uv;
        vTint = instanceTint;

        mat4 skinMatrix =
          sampleBoneMatrix(skinIndex.x) * skinWeight.x;
        skinMatrix +=
          sampleBoneMatrix(skinIndex.y) * skinWeight.y;
        skinMatrix +=
          sampleBoneMatrix(skinIndex.z) * skinWeight.z;
        skinMatrix +=
          sampleBoneMatrix(skinIndex.w) * skinWeight.w;

        vec4 bindPosePosition = bindMatrix * vec4(position, 1.0);
        vec4 skinnedPosition =
          bindMatrixInverse * skinMatrix * bindPosePosition;
        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          instanceMatrix *
          skinnedPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float hasMap;
      uniform vec3 baseColor;
      varying vec2 vUv;
      varying vec3 vTint;

      void main() {
        vec4 sampledColor =
          hasMap > 0.5
            ? texture2D(map, vUv)
            : vec4(baseColor, 1.0);
        gl_FragColor = vec4(
          sampledColor.rgb * vTint,
          1.0
        );
      }
    `,
    transparent: false,
  });
};

const createStageCrowdArchetype = (
  resource: VizThreeModelResource,
): StageCrowdArchetype => {
  const sampleRoot = resource.instantiate();
  const skinnedMeshes = findSkinnedMeshes(sampleRoot);
  if (skinnedMeshes.length === 0) {
    throw new Error(
      `Stage crowd model "${resource.assetId}" contains no skinned mesh.`,
    );
  }

  const group = new Group();
  const batches = skinnedMeshes.map((sourceMesh) => {
    const animation = bakeCrowdAnimationTexture({
      root: sampleRoot,
      mesh: sourceMesh,
      resource,
    });
    const geometry = sourceMesh.geometry.clone();
    const phaseAttribute = new InstancedBufferAttribute(
      new Float32Array(MAX_CROWD_COUNT),
      1,
    );
    const tintAttribute = new InstancedBufferAttribute(
      new Float32Array(MAX_CROWD_COUNT * 3),
      3,
    );
    geometry.setAttribute("instancePhase", phaseAttribute);
    geometry.setAttribute("instanceTint", tintAttribute);
    const material = createCrowdShaderMaterial({
      mesh: sourceMesh,
      animation,
    });
    const mesh = new InstancedMesh(
      geometry,
      material,
      MAX_CROWD_COUNT,
    );
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    group.add(mesh);

    return {
      mesh,
      material,
      animationTexture: animation.texture,
      phaseAttribute,
      tintAttribute,
      durationSeconds: animation.durationSeconds,
    };
  });

  return {
    group,
    batches,
    updateAnimation(time, speed) {
      for (const batch of batches) {
        batch.material.uniforms.animationTime!.value = time;
        batch.material.uniforms.animationSpeed!.value = speed;
      }
    },
    setInstances(instances) {
      for (const batch of batches) {
        batch.mesh.count = instances.length;
        for (let index = 0; index < instances.length; index += 1) {
          const instance = instances[index]!;
          batch.mesh.setMatrixAt(index, instance.matrix);
          batch.phaseAttribute.setX(
            index,
            instance.phase * batch.durationSeconds,
          );
          batch.tintAttribute.setXYZ(
            index,
            instance.tint.r,
            instance.tint.g,
            instance.tint.b,
          );
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.phaseAttribute.needsUpdate = true;
        batch.tintAttribute.needsUpdate = true;
      }
    },
    dispose() {
      for (const batch of batches) {
        batch.mesh.geometry.dispose();
        batch.material.dispose();
        batch.animationTexture.dispose();
      }
      group.clear();
      sampleRoot.clear();
    },
  };
};

export interface VizStageCharacterController {
  update(options: {
    time: number;
    seed: number;
    showDj: boolean;
    crowdCount: number;
    animationSpeed: number;
    djAssetId: string;
    crowdAssetIds: readonly string[];
    materializedAssets: ReadonlyMap<string, VizMaterializedAsset>;
  }): void;
  whenReady(): Promise<void>;
  dispose(): void;
}

export const createVizStageCharacterController = ({
  root,
  fallbackDj,
  fallbackCrowd,
  modelResources,
  invalidate,
}: {
  root: Group;
  fallbackDj: Group;
  fallbackCrowd: InstancedMesh;
  modelResources: VizThreeModelResourceManager;
  invalidate(): void;
}): VizStageCharacterController => {
  let disposed = false;
  let requestRevision = 0;
  let assetSelectionKey = "";
  let readyPromise: Promise<void> = Promise.resolve();
  let loadError: unknown;
  let leases: VizThreeModelResourceLease[] = [];
  let heroDj: Group | null = null;
  let heroPlayer: VizThreeDeterministicClipPlayer | null = null;
  let crowdArchetypes: StageCrowdArchetype[] = [];
  let lastCrowdLayoutKey = "";
  const crowdObject = new Object3D();
  const crowdTint = new Color();
  const crowdInstancesByArchetype: StageCrowdInstance[][] = [];
  let lastUpdate = {
    time: 0,
    seed: 0,
    showDj: true,
    crowdCount: 0,
    animationSpeed: 1,
  };

  const releaseModels = () => {
    if (heroDj) {
      root.remove(heroDj);
      heroDj.clear();
      heroDj = null;
    }
    heroPlayer?.dispose();
    heroPlayer = null;

    for (const archetype of crowdArchetypes) {
      root.remove(archetype.group);
      archetype.dispose();
    }
    crowdArchetypes = [];
    crowdInstancesByArchetype.length = 0;

    for (const lease of leases) {
      lease.release();
    }
    leases = [];
    lastCrowdLayoutKey = "";
  };

  const applyVisibility = () => {
    const modelDjReady = heroDj !== null;
    const modelCrowdReady = crowdArchetypes.length > 0;
    fallbackDj.visible = lastUpdate.showDj && !modelDjReady;
    fallbackCrowd.visible =
      lastUpdate.crowdCount > 0 && !modelCrowdReady;

    if (heroDj) {
      heroDj.visible = lastUpdate.showDj;
    }
    for (const archetype of crowdArchetypes) {
      archetype.group.visible = lastUpdate.crowdCount > 0;
    }

    root.userData.characterMode =
      modelDjReady && modelCrowdReady
        ? "model"
        : loadError
          ? "fallback-error"
          : assetSelectionKey
            ? "loading"
            : "fallback";
    root.userData.characterLoadError = loadError ?? null;
  };

  const updateModelAnimation = () => {
    heroPlayer?.update(lastUpdate.time, {
      speed: lastUpdate.animationSpeed,
      loopMode: "loop",
    });
    for (const archetype of crowdArchetypes) {
      archetype.updateAnimation(
        lastUpdate.time,
        lastUpdate.animationSpeed,
      );
    }
  };

  const updateCrowdLayout = () => {
    if (crowdArchetypes.length === 0) {
      return;
    }

    const layoutKey = `${lastUpdate.seed}:${lastUpdate.crowdCount}:${crowdArchetypes.length}`;
    if (layoutKey === lastCrowdLayoutKey) {
      return;
    }
    lastCrowdLayoutKey = layoutKey;
    crowdInstancesByArchetype.length = crowdArchetypes.length;
    for (let index = 0; index < crowdArchetypes.length; index += 1) {
      crowdInstancesByArchetype[index] = [];
    }

    const count = Math.min(
      MAX_CROWD_COUNT,
      Math.max(0, lastUpdate.crowdCount),
    );
    const crowdFactor = count / MAX_CROWD_COUNT;
    const depth = 30 + crowdFactor * 50;
    const spreadFactor = 0.8 + crowdFactor * 0.7;

    for (let index = 0; index < count; index += 1) {
      const archetypeIndex = Math.min(
        crowdArchetypes.length - 1,
        Math.floor(
          hash01(lastUpdate.seed, index * 17 + 13) *
            crowdArchetypes.length,
        ),
      );
      const normalizedDepth = Math.sqrt(
        (index + 0.5) / Math.max(count, 1),
      );
      const z =
        14 +
        normalizedDepth * depth +
        (hash01(lastUpdate.seed, index * 7 + 1) - 0.5) * 2;
      const maximumSpread =
        25 + normalizedDepth * depth * spreadFactor;
      const x =
        (hash01(lastUpdate.seed, index * 7 + 2) * 2 - 1) *
        maximumSpread;
      const scale =
        MODEL_SCALE *
        (0.8 + hash01(lastUpdate.seed, index * 7 + 5) * 0.35);
      crowdObject.position.set(x, 0, z);
      crowdObject.rotation.set(
        0,
        Math.atan2(-x, -z) +
          (hash01(lastUpdate.seed, index * 7 + 6) - 0.5) *
            (Math.PI / 4),
        0,
      );
      crowdObject.scale.set(scale, scale, scale);
      crowdObject.updateMatrix();
      crowdTint.setHSL(
        (hash01(lastUpdate.seed, index * 7 + 7) * 0.08 + 0.96) %
          1,
        0.12,
        0.82 + hash01(lastUpdate.seed, index * 11 + 9) * 0.18,
      );
      crowdInstancesByArchetype[archetypeIndex]!.push({
        matrix: crowdObject.matrix.clone(),
        phase: hash01(lastUpdate.seed, index * 7 + 3),
        tint: crowdTint.clone(),
      });
    }

    for (let index = 0; index < crowdArchetypes.length; index += 1) {
      crowdArchetypes[index]!.setInstances(
        crowdInstancesByArchetype[index]!,
      );
    }
  };

  const requestModels = ({
    djAsset,
    crowdAssets,
    selectionKey,
  }: {
    djAsset: VizMaterializedAsset | undefined;
    crowdAssets: VizMaterializedAsset[];
    selectionKey: string;
  }) => {
    requestRevision += 1;
    const revision = requestRevision;
    releaseModels();
    assetSelectionKey = selectionKey;
    loadError = undefined;

    if (!djAsset && crowdAssets.length === 0) {
      readyPromise = Promise.resolve();
      applyVisibility();
      return;
    }

    const djLease = djAsset
      ? modelResources.acquire(djAsset)
      : null;
    const crowdLeases = crowdAssets.map((asset) =>
      modelResources.acquire(asset),
    );
    leases = [
      ...(djLease ? [djLease] : []),
      ...crowdLeases,
    ];

    const preparation = Promise.all([
      djLease?.ready ?? Promise.resolve(null),
      Promise.all(crowdLeases.map((lease) => lease.ready)),
    ])
      .then(([djResource, crowdResources]) => {
        if (disposed || revision !== requestRevision) {
          return;
        }

        if (djResource) {
          heroDj = djResource.instantiate();
          heroDj.scale.setScalar(MODEL_SCALE);
          heroDj.position.set(0, 3.4, -7);
          heroDj.traverse((object) => {
            const mesh = object as Mesh;
            if (mesh.isMesh === true) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          heroPlayer =
            createVizThreeDeterministicClipPlayer({
              root: heroDj,
              clips: djResource.animations,
            });
          root.add(heroDj);
          root.userData.djModel = heroDj;
          root.userData.djModelManifest = djResource.manifest;
        }

        crowdArchetypes = crowdResources.map((resource) =>
          createStageCrowdArchetype(resource),
        );
        for (const archetype of crowdArchetypes) {
          root.add(archetype.group);
        }
        root.userData.modelCrowd = crowdArchetypes.map(
          (archetype) => archetype.group,
        );
        root.userData.crowdModelManifests =
          crowdResources.map((resource) => resource.manifest);

        updateCrowdLayout();
        updateModelAnimation();
        applyVisibility();
        invalidate();
      })
      .catch((error: unknown) => {
        if (disposed || revision !== requestRevision) {
          return;
        }
        loadError = error;
        applyVisibility();
        invalidate();
      });

    readyPromise = preparation;
    applyVisibility();
  };

  return {
    update({
      time,
      seed,
      showDj,
      crowdCount,
      animationSpeed,
      djAssetId,
      crowdAssetIds,
      materializedAssets,
    }) {
      if (disposed) {
        return;
      }

      lastUpdate = {
        time,
        seed,
        showDj,
        crowdCount,
        animationSpeed,
      };
      const djAsset = asModelAsset(
        materializedAssets,
        djAssetId,
      );
      const crowdAssets = crowdAssetIds.flatMap((assetId) => {
        const asset = asModelAsset(materializedAssets, assetId);
        return asset ? [asset] : [];
      });
      const selectionKey = [
        getAssetKey(djAsset),
        ...crowdAssets.map(getAssetKey),
      ].join("|");

      if (selectionKey !== assetSelectionKey) {
        requestModels({
          djAsset,
          crowdAssets,
          selectionKey,
        });
      }

      updateModelAnimation();
      updateCrowdLayout();
      applyVisibility();
    },
    async whenReady() {
      for (;;) {
        const revision = requestRevision;
        await readyPromise;
        if (revision === requestRevision) {
          if (loadError) {
            throw loadError;
          }
          return;
        }
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      requestRevision += 1;
      releaseModels();
      root.userData.djModel = null;
      root.userData.modelCrowd = [];
      root.userData.characterMode = "disposed";
    },
  };
};
