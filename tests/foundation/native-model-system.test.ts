import {
  createVizThreeDeterministicClipPlayer,
  createVizThreeModelResourceManager,
  sampleVizModelClipTime,
  VizThreeModelResourceError,
  type VizThreeModelDecoder,
} from "@viz-engine/renderer-three";
import {
  createVizStageCharacterController,
} from "../../packages/viz-renderer-three/src/programs/stage-characters";
import {
  AnimationClip,
  Bone,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  NumberKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
} from "three";
import { describe, expect, it, vi } from "vitest";

const createModelAsset = (id = "model-stage-dancer") => ({
  id,
  kind: "model" as const,
  source: "bundle" as const,
  mimeType: "model/gltf-binary",
  modelSourceUri: `/models/${id}.glb`,
  metadata: {
    contentIdentity: "sha256:shared-model-content",
    modelFormat: "glb",
  },
});

const createDecodedModel = () => {
  const scene = new Group();
  scene.name = "Dancer";
  scene.add(
    new Mesh(
      new BoxGeometry(1, 2, 1),
      new MeshBasicMaterial({ color: "#ff00ff" }),
    ),
  );
  return {
    scene,
    animations: [
      new AnimationClip("Dance", 2, [
        new NumberKeyframeTrack(
          ".position[x]",
          [0, 2],
          [0, 10],
        ),
      ]),
    ],
    sourceFormat: "glb" as const,
  };
};

const createSkinnedDecodedModel = () => {
  const scene = new Group();
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-0.5, 0, 0, 0.5, 0, 0, 0, 2, 0],
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2),
  );
  geometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      4,
    ),
  );
  geometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      4,
    ),
  );
  const bone = new Bone();
  bone.name = "Root";
  const mesh = new SkinnedMesh(
    geometry,
    new MeshBasicMaterial({ color: "#ffffff" }),
  );
  mesh.name = "Character";
  scene.add(bone, mesh);
  mesh.bind(new Skeleton([bone]));
  scene.updateMatrixWorld(true);

  return {
    scene,
    animations: [
      new AnimationClip("Dance", 1, [
        new NumberKeyframeTrack(
          "Root.rotation[z]",
          [0, 0.5, 1],
          [0, 0.3, 0],
        ),
      ]),
    ],
    sourceFormat: "glb" as const,
  };
};

const readCrowdMatrices = (root: Group): number[][] =>
  (root.userData.modelCrowd as Group[]).map((group) => {
    const mesh = group.children[0] as InstancedMesh;
    return Array.from(
      mesh.instanceMatrix.array.slice(0, mesh.count * 16),
    );
  });

describe("native model resources", () => {
  it("deduplicates by content identity and exposes a renderer-neutral manifest", async () => {
    const decode = vi.fn(async () => createDecodedModel());
    const decoder: VizThreeModelDecoder = { decode };
    const manager = createVizThreeModelResourceManager({ decoder });
    const first = manager.acquire(createModelAsset("model-a"));
    const second = manager.acquire(createModelAsset("model-b"));

    const [firstResource, secondResource] = await Promise.all([
      first.ready,
      second.ready,
    ]);

    expect(decode).toHaveBeenCalledTimes(1);
    expect(secondResource).toBe(firstResource);
    expect(firstResource.manifest).toMatchObject({
      schemaVersion: 1,
      assetId: "model-a",
      contentIdentity: "sha256:shared-model-content",
      sourceFormat: "glb",
      capabilities: {
        staticMesh: true,
        transformAnimation: true,
      },
    });
    expect(firstResource.manifest.animationClips).toEqual([
      expect.objectContaining({
        name: "Dance",
        durationSeconds: 2,
        trackCount: 1,
      }),
    ]);
    expect(firstResource.instantiate()).not.toBe(
      firstResource.instantiate(),
    );
    expect(manager.getDiagnostics()).toEqual([
      expect.objectContaining({
        status: "ready",
        references: 2,
      }),
    ]);

    first.release();
    second.release();
    manager.dispose();
  });

  it("cancels an unreferenced in-flight load and reports a structured error", async () => {
    const decoder: VizThreeModelDecoder = {
      decode: (_asset, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () =>
              reject(
                new VizThreeModelResourceError({
                  code: "MODEL_RESOURCE_LOAD_CANCELLED",
                  assetId: "model-stage-dancer",
                  message: "cancelled",
                }),
              ),
            { once: true },
          );
        }),
    };
    const manager = createVizThreeModelResourceManager({ decoder });
    const lease = manager.acquire(createModelAsset());
    const loading = lease.ready.catch((error: unknown) => error);

    lease.release();

    await expect(loading).resolves.toMatchObject({
      code: "MODEL_RESOURCE_LOAD_CANCELLED",
      assetId: "model-stage-dancer",
    });
    expect(manager.getDiagnostics()).toEqual([]);
    manager.dispose();
  });

  it("keeps non-critical dependency failures as inspectable warnings", async () => {
    const decoder: VizThreeModelDecoder = {
      decode: async () => ({
        ...createDecodedModel(),
        warnings: [
          {
            code: "MODEL_DEPENDENCY_LOAD_FAILED",
            uri: "/models/missing-normal.png",
            message: "Optional normal map is missing.",
          },
        ],
      }),
    };
    const manager = createVizThreeModelResourceManager({ decoder });
    const lease = manager.acquire(createModelAsset());
    const resource = await lease.ready;

    expect(resource.warnings).toEqual([
      {
        code: "MODEL_DEPENDENCY_LOAD_FAILED",
        uri: "/models/missing-normal.png",
        message: "Optional normal map is missing.",
      },
    ]);
    expect(manager.getDiagnostics()[0]?.warnings).toEqual(
      resource.warnings,
    );

    lease.release();
    manager.dispose();
  });
});

describe("deterministic model animation", () => {
  it("samples loop, once, and ping-pong modes from absolute time", () => {
    expect(
      sampleVizModelClipTime({
        timelineTimeSeconds: 2.5,
        clipDurationSeconds: 2,
      }),
    ).toBeCloseTo(0.5);
    expect(
      sampleVizModelClipTime({
        timelineTimeSeconds: 3,
        clipDurationSeconds: 2,
        loopMode: "once",
      }),
    ).toBe(2);
    expect(
      sampleVizModelClipTime({
        timelineTimeSeconds: 3,
        clipDurationSeconds: 2,
        loopMode: "ping-pong",
      }),
    ).toBeCloseTo(1);
    expect(
      sampleVizModelClipTime({
        timelineTimeSeconds: 1,
        clipDurationSeconds: 2,
        speed: 2,
        phaseSeconds: 0.25,
      }),
    ).toBeCloseTo(0.25);
  });

  it("is seek-order independent rather than delta-time accumulated", () => {
    const root = new Group();
    const clip = new AnimationClip("Move", 2, [
      new NumberKeyframeTrack(
        ".position[x]",
        [0, 2],
        [0, 10],
      ),
    ]);
    const player = createVizThreeDeterministicClipPlayer({
      root,
      clips: [clip],
    });

    player.update(1.5);
    expect(root.position.x).toBeCloseTo(7.5);
    player.update(0.5);
    expect(root.position.x).toBeCloseTo(2.5);
    player.update(1.5);
    expect(root.position.x).toBeCloseTo(7.5);

    player.dispose();
  });
});

describe("Stage character realization", () => {
  it("realizes deterministic model crowds and safe visibility lifecycle", async () => {
    const createController = () => {
      const root = new Group();
      const fallbackDj = new Group();
      const fallbackCrowd = new InstancedMesh(
        new BoxGeometry(),
        new MeshBasicMaterial(),
        1,
      );
      root.add(fallbackDj, fallbackCrowd);
      const manager = createVizThreeModelResourceManager({
        decoder: {
          decode: async () => createSkinnedDecodedModel(),
        },
      });
      const invalidate = vi.fn();
      const controller = createVizStageCharacterController({
        root,
        fallbackDj,
        fallbackCrowd,
        modelResources: manager,
        invalidate,
      });
      const materializedAssets = new Map(
        ["dj", "female", "male", "cheer"].map((id) => [
          id,
          {
            ...createModelAsset(id),
            metadata: {
              contentIdentity: `sha256:${id}`,
              modelFormat: "glb",
            },
          },
        ]),
      );
      return {
        root,
        fallbackDj,
        fallbackCrowd,
        manager,
        invalidate,
        controller,
        materializedAssets,
      };
    };
    const first = createController();
    const second = createController();
    const update = (instance: ReturnType<typeof createController>) =>
      instance.controller.update({
        time: 0.75,
        seed: 42,
        showDj: true,
        crowdCount: 12,
        animationSpeed: 1.5,
        djAssetId: "dj",
        crowdAssetIds: ["female", "male", "cheer"],
        materializedAssets: instance.materializedAssets,
      });

    update(first);
    update(second);
    await Promise.all([
      first.controller.whenReady(),
      second.controller.whenReady(),
    ]);

    expect(first.root.userData.characterMode).toBe("model");
    expect(first.fallbackDj.visible).toBe(false);
    expect(first.fallbackCrowd.visible).toBe(false);
    expect(first.invalidate).toHaveBeenCalled();
    expect(
      (first.root.userData.modelCrowd as Group[]).reduce(
        (count, group) =>
          count + (group.children[0] as InstancedMesh).count,
        0,
      ),
    ).toBe(12);
    expect(readCrowdMatrices(first.root)).toEqual(
      readCrowdMatrices(second.root),
    );

    first.controller.update({
      time: 1.25,
      seed: 42,
      showDj: false,
      crowdCount: 0,
      animationSpeed: 1,
      djAssetId: "dj",
      crowdAssetIds: ["female", "male", "cheer"],
      materializedAssets: first.materializedAssets,
    });
    expect((first.root.userData.djModel as Group).visible).toBe(
      false,
    );
    expect(
      (first.root.userData.modelCrowd as Group[]).every(
        (group) => !group.visible,
      ),
    ).toBe(true);

    first.controller.dispose();
    second.controller.dispose();
    first.manager.dispose();
    second.manager.dispose();
    expect(first.root.userData.characterMode).toBe("disposed");
  });
});
