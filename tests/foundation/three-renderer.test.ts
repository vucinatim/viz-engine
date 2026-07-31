import { createCoreComponentRegistry } from '@viz-engine/components-core';
import type { VizRenderNode, VizRenderPlan } from '@viz-engine/contracts';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  coreVizThreeRendererExtension,
  createVizThreeCompositorGraph,
  createVizThreeImageResourceManager,
  createVizThreeProgramRegistry,
  createVizThreeSceneGraph,
  disposeVizThreeCompositorGraph,
  getVizThreeLayerClearColor,
  summarizeVizThreeSceneGraph,
  updateVizThreeCompositorGraph,
} from '@viz-engine/renderer-three';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
} from '@viz-engine/runtime';
import {
  Color,
  Group,
  InstancedMesh,
  InterleavedBufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
} from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { describe, expect, it, vi } from 'vitest';

const collectMeshes = (object: Group | Mesh): Mesh[] => {
  const meshes: Mesh[] = [];

  const visit = (entry: Group | Mesh) => {
    if (entry instanceof Mesh) {
      meshes.push(entry);
    }

    for (const child of entry.children) {
      visit(child as Group | Mesh);
    }
  };

  visit(object);

  return meshes;
};

const createPortablePlan = (
  nodes: Array<{ layerId: string; node: VizRenderNode }>,
  viewport = { width: 640, height: 360 },
): VizRenderPlan => ({
  frameContext: {
    frame: 0,
    fps: 60,
    durationInFrames: 60,
    timeInSeconds: 0,
    deltaTimeSeconds: 1 / 60,
    isFirstFrame: true,
    isLastFrame: false,
    mode: 'live',
    seed: 'portable-reconciliation',
  },
  viewport: { ...viewport, backgroundColor: '#000000' },
  materializedAssets: [],
  graphResults: [],
  issues: [],
  layers: nodes.map(({ layerId, node }) => ({
    layerId,
    componentId: 'portable-test',
    rendererFamily: 'three',
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    resolvedInputs: {},
    node,
  })),
});

describe('Viz Three renderer proof', () => {
  it('creates project-local Three programs through an injected renderer extension', () => {
    const programRegistry = createVizThreeProgramRegistry([
      coreVizThreeRendererExtension,
      {
        capabilityPack: {
          id: 'project/production-proof',
          version: '1.0.0',
        },
        programs: [
          {
            id: 'project/signal-ribbon/v1',
            implementationVersion: '1.0.0',
            factory: ({ node }) => {
              const scene = new Scene();
              const camera = new OrthographicCamera();
              const root = new Group();
              root.userData.intensity = node.parameters.intensity;
              scene.add(root);

              return {
                programId: node.programId,
                scene,
                camera,
                root,
                update(nextNode) {
                  root.userData.intensity = nextNode.parameters.intensity;
                },
                resize() {},
                render() {},
                dispose() {},
              };
            },
          },
        ],
      },
    ]);
    const plan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 60,
        durationInFrames: 60,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: true,
        isLastFrame: false,
        mode: 'live',
        seed: 'extension-proof',
      },
      viewport: {
        width: 640,
        height: 360,
      },
      materializedAssets: [],
      graphResults: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-signal-ribbon',
          componentId: 'project-signal-ribbon',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            id: 'signal-ribbon-program',
            programId: 'project/signal-ribbon/v1',
            parameters: {
              intensity: 0.75,
            },
          },
        },
      ],
    };

    const graph = createVizThreeCompositorGraph(
      plan,
      undefined,
      undefined,
      programRegistry,
    );

    expect(
      programRegistry.get('project/signal-ribbon/v1')?.capabilityPack,
    ).toEqual({
      id: 'project/production-proof',
      version: '1.0.0',
    });
    expect(graph.layers[0]?.programInstance?.programId).toBe(
      'project/signal-ribbon/v1',
    );
    expect(graph.layers[0]?.programInstance?.root.userData.intensity).toBe(
      0.75,
    );
  });

  it('rejects invalid and duplicate renderer-extension identities', () => {
    expect(() =>
      createVizThreeProgramRegistry([
        {
          capabilityPack: {
            id: '',
            version: '1.0.0',
          },
          programs: [],
        },
      ]),
    ).toThrow('must declare a non-empty capability-pack id and version');

    expect(() =>
      createVizThreeProgramRegistry([
        {
          capabilityPack: {
            id: 'project/duplicate',
            version: '1.0.0',
          },
          programs: [],
        },
        {
          capabilityPack: {
            id: 'project/duplicate',
            version: '2.0.0',
          },
          programs: [],
        },
      ]),
    ).toThrow(
      'Duplicate Viz Three renderer extension for capability pack "project/duplicate"',
    );
  });

  it('maps the shared render plan into a Three scene graph', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'three-seed',
    });

    const renderPlan = createVizRenderPlan({
      session,
      frame: 36,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    const sceneGraph = createVizThreeSceneGraph(renderPlan);
    const summary = summarizeVizThreeSceneGraph(sceneGraph.rootGroup);

    expect(summary).toEqual(['Group', 'Group', 'Group', 'Group']);
    expect(sceneGraph.camera.left).toBe(
      -exampleProjectDocument.viewport.width / 2,
    );
    expect(sceneGraph.camera.top).toBe(
      exampleProjectDocument.viewport.height / 2,
    );
  });

  it('creates explicit compositor surfaces for ordered layers', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'three-compositor-seed',
    });

    const renderPlan = createVizRenderPlan({
      session,
      frame: 36,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    const compositorGraph = createVizThreeCompositorGraph(renderPlan);

    expect(compositorGraph.layers).toHaveLength(4);
    expect(compositorGraph.compositeRoot.children).toHaveLength(4);
    expect(
      compositorGraph.layers.every(
        (layer) =>
          (layer.compositeSurface.material as MeshBasicMaterial).map ===
          layer.renderTarget.texture,
      ),
    ).toBe(true);
    expect(
      compositorGraph.layers.map(
        (layer) =>
          (layer.compositeSurface.material as MeshBasicMaterial).opacity,
      ),
    ).toEqual(renderPlan.layers.map((layer) => layer.opacity));
    expect(
      compositorGraph.layers.every(
        (layer) =>
          (layer.compositeSurface.material as MeshBasicMaterial).transparent,
      ),
    ).toBe(true);
  });

  it('resolves layer-surface alpha into a premultiplied clear color', () => {
    const clear = getVizThreeLayerClearColor({
      layerId: 'surface-alpha',
      componentId: 'portable-test',
      rendererFamily: 'three',
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      backgroundColor: 'rgba(12, 34, 56, 0.4)',
      resolvedInputs: {},
    });

    expect(clear.opacity).toBeCloseTo(0.4, 6);
    const expected = new Color('rgb(12, 34, 56)').multiplyScalar(0.4);
    expect(clear.color.r).toBeCloseTo(expected.r, 6);
    expect(clear.color.g).toBeCloseTo(expected.g, 6);
    expect(clear.color.b).toBeCloseTo(expected.b, 6);
  });

  it('keeps layer opacity at the compositor surface instead of baking it into inner meshes', () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 30,
        durationInFrames: 1,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 30,
        isFirstFrame: true,
        isLastFrame: true,
        mode: 'render',
        seed: 'three-style-seed',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-style',
          componentId: 'manual',
          rendererFamily: 'three',
          enabled: true,
          opacity: 0.5,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'group',
            style: {
              opacity: 0.5,
              blendMode: 'add',
            },
            children: [
              {
                kind: 'rect',
                x: 40,
                y: 40,
                width: 160,
                height: 80,
                style: {
                  fill: '#ffffff',
                  opacity: 0.5,
                },
              },
            ],
          },
        },
      ],
    };

    const compositorGraph = createVizThreeCompositorGraph(renderPlan);
    const [layer] = compositorGraph.layers;
    const meshes = collectMeshes(layer!.contentRoot);
    const [mesh] = meshes;
    const compositeMaterial = layer!.compositeSurface
      .material as MeshBasicMaterial;

    expect(meshes).toHaveLength(1);
    expect(mesh.material.opacity).toBeCloseTo(0.25, 6);
    expect(mesh.material.blending).not.toBeUndefined();
    expect(compositeMaterial.opacity).toBeCloseTo(0.5, 6);
  });

  it('composes CSS color alpha with portable-node opacity without Three warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const firstPlan = createPortablePlan([
      {
        layerId: 'css-alpha-layer',
        node: {
          kind: 'group',
          style: { opacity: 0.5 },
          children: [
            {
              kind: 'rect',
              x: 20,
              y: 20,
              width: 100,
              height: 60,
              style: {
                fill: 'rgba(204, 102, 51, 0.2)',
                opacity: 0.5,
              },
            },
            {
              kind: 'polyline',
              points: [
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ],
              style: {
                stroke: '#33ccff80',
                opacity: 0.5,
              },
            },
          ],
        },
      },
    ]);
    const nextPlan = structuredClone(firstPlan);
    const nextGroup = nextPlan.layers[0]!.node;
    if (!nextGroup || nextGroup.kind !== 'group') {
      throw new Error('Expected portable group fixture.');
    }
    const nextRect = nextGroup.children[0]!;
    const nextLine = nextGroup.children[1]!;
    if (nextRect.kind !== 'rect' || nextLine.kind !== 'polyline') {
      throw new Error('Expected rect and polyline fixtures.');
    }
    nextRect.style = { fill: 'hsla(120, 100%, 50%, 40%)', opacity: 0.5 };
    nextLine.style = { stroke: '#ff00ff40', opacity: 0.5 };

    const graph = createVizThreeCompositorGraph(firstPlan);
    const root = graph.layers[0]!.contentRoot.children[0] as Group;
    const [rect] = collectMeshes(root);
    const line = root.children[1] as Group;
    const lineMaterial = (line.children[0] as Mesh)
      .material as MeshBasicMaterial;

    expect((rect!.material as MeshBasicMaterial).opacity).toBeCloseTo(0.05, 6);
    expect(lineMaterial.opacity).toBeCloseTo(0.5 * 0.5 * (128 / 255), 6);
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect((rect!.material as MeshBasicMaterial).opacity).toBeCloseTo(0.1, 6);
    expect(lineMaterial.opacity).toBeCloseTo(0.5 * 0.5 * (64 / 255), 6);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('renders stroke-only rects as stroke meshes instead of a filled quad', () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 30,
        durationInFrames: 1,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 30,
        isFirstFrame: true,
        isLastFrame: true,
        mode: 'render',
        seed: 'three-stroke-seed',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-stroke',
          componentId: 'manual',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'rect',
            x: 80,
            y: 120,
            width: 240,
            height: 180,
            style: {
              stroke: '#88f3ff',
              strokeWidth: 6,
              opacity: 0.5,
            },
          },
        },
      ],
    };

    const sceneGraph = createVizThreeSceneGraph(renderPlan);
    const [layerObject] = sceneGraph.rootGroup.children;
    const meshes = collectMeshes(layerObject as Group | Mesh);

    expect(layerObject).toBeInstanceOf(Group);
    expect(meshes).toHaveLength(4);
    expect(meshes.every((mesh) => mesh.material.opacity === 0.5)).toBe(true);
  });

  it('retains mixed portable primitive resources across value-only updates', () => {
    const createPlan = (circleX: number, color: string, imageAssetId: string) =>
      createPortablePlan([
        {
          layerId: 'mixed-layer',
          node: {
            kind: 'group',
            children: [
              {
                kind: 'rect',
                x: 20,
                y: 20,
                width: 180,
                height: 90,
                style: {
                  fill: color,
                  stroke: '#ffffff',
                  strokeWidth: 4,
                },
              },
              {
                kind: 'circle',
                cx: circleX,
                cy: 180,
                r: 24,
                style: { fill: color },
              },
              {
                kind: 'image',
                assetId: imageAssetId,
                x: 240,
                y: 80,
                width: 120,
                height: 90,
              },
            ],
          },
        },
      ]);
    const firstPlan = createPlan(100, '#ff00ff', 'image-a');
    const nextPlan = createPlan(140, '#00ffff', 'image-b');
    const graph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const root = layer.contentRoot.children[0] as Group;
    const [rect, circle, image] = root.children as [Group, Mesh, Mesh];
    const rectMeshes = [...rect.children] as Mesh[];
    const circleGeometry = circle.geometry;
    const circleMaterial = circle.material;
    const imageGeometry = image.geometry;
    const imageMaterial = image.material as MeshBasicMaterial;
    imageMaterial.map = new Texture();

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(graph.layers[0]).toBe(layer);
    expect(layer.contentRoot.children[0]).toBe(root);
    expect(root.children[0]).toBe(rect);
    expect(root.children[1]).toBe(circle);
    expect(root.children[2]).toBe(image);
    expect(rect.children).toEqual(rectMeshes);
    expect(circle.geometry).toBe(circleGeometry);
    expect(circle.material).toBe(circleMaterial);
    expect(image.geometry).toBe(imageGeometry);
    expect(image.material).toBe(imageMaterial);
    expect(imageMaterial.map).toBeNull();
    expect(image.userData.vizImageAssetId).toBe('image-b');
  });

  it('updates text through one retained canvas texture and material', () => {
    const context = {
      font: '',
      textAlign: 'left',
      textBaseline: 'middle',
      fillStyle: '#ffffff',
      clearRect() {},
      fillText() {},
      measureText(text: string) {
        return { width: text.length * 10 };
      },
    };
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => context,
      }),
    });
    try {
      const createPlan = (text: string, fill: string) =>
        createPortablePlan([
          {
            layerId: 'text-layer',
            node: {
              kind: 'text',
              text,
              x: 100,
              y: 100,
              fontSize: 32,
              style: { fill },
            },
          },
        ]);
      const firstPlan = createPlan('VIZ', '#ffffff');
      const nextPlan = createPlan('VIZ ENGINE', '#00ffff');
      const graph = createVizThreeCompositorGraph(firstPlan);
      const mesh = graph.layers[0]!.contentRoot.children[0] as Mesh;
      const material = mesh.material as MeshBasicMaterial;
      const texture = mesh.userData.vizOwnedTexture;
      const textureVersion = texture.version;

      expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
        true,
      );
      expect(graph.layers[0]!.contentRoot.children[0]).toBe(mesh);
      expect(mesh.material).toBe(material);
      expect(mesh.userData.vizOwnedTexture).toBe(texture);
      expect(texture.version).toBeGreaterThan(textureVersion);
      expect(context.fillStyle).toBe('#00ffff');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reconciles layer add, remove, reorder, and resize without rebuilding survivors', () => {
    const rect = (fill: string): VizRenderNode => ({
      kind: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      style: { fill },
    });
    const firstPlan = createPortablePlan([
      { layerId: 'layer-a', node: rect('#ff0000') },
      { layerId: 'layer-b', node: rect('#00ff00') },
    ]);
    const nextPlan = createPortablePlan(
      [
        { layerId: 'layer-b', node: rect('#00ffff') },
        { layerId: 'layer-c', node: rect('#0000ff') },
      ],
      { width: 800, height: 450 },
    );
    const graph = createVizThreeCompositorGraph(firstPlan);
    const removed = graph.layers[0]!;
    const survivor = graph.layers[1]!;
    const survivorObject = survivor.contentRoot.children[0];
    const survivorTarget = survivor.renderTarget;
    const disposeGeometry = vi.spyOn(
      (removed.contentRoot.children[0] as Mesh).geometry,
      'dispose',
    );
    const disposeTarget = vi.spyOn(removed.renderTarget, 'dispose');

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(graph.layers.map((layer) => layer.layer.layerId)).toEqual([
      'layer-b',
      'layer-c',
    ]);
    expect(graph.layers[0]).toBe(survivor);
    expect(graph.layers[0]!.contentRoot.children[0]).toBe(survivorObject);
    expect(graph.layers[0]!.renderTarget).toBe(survivorTarget);
    expect(graph.compositeRoot.children).toEqual(
      graph.layers.map((layer) => layer.compositeSurface),
    );
    expect(graph.compositeCamera.right).toBe(400);
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeTarget).toHaveBeenCalledOnce();
  });

  it('disposes compositor-owned resources exactly once', () => {
    const plan = createPortablePlan([
      {
        layerId: 'layer-a',
        node: {
          kind: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          style: { fill: '#ff0000' },
        },
      },
    ]);
    const graph = createVizThreeCompositorGraph(plan);
    const layer = graph.layers[0]!;
    const disposeSurfaceGeometry = vi.spyOn(
      layer.compositeSurface.geometry,
      'dispose',
    );
    const disposeSurfaceMaterial = vi.spyOn(
      layer.compositeSurface.material as MeshBasicMaterial,
      'dispose',
    );
    const disposeTarget = vi.spyOn(layer.renderTarget, 'dispose');

    disposeVizThreeCompositorGraph(graph);

    expect(disposeSurfaceGeometry).toHaveBeenCalledOnce();
    expect(disposeSurfaceMaterial).toHaveBeenCalledOnce();
    expect(disposeTarget).toHaveBeenCalledOnce();
    expect(graph.compositeRoot.children).toHaveLength(0);
  });

  it('owns image loading, stale replacement, cache eviction, and disposal', () => {
    const createImagePlan = (assetId: string, uri: string) => ({
      ...createPortablePlan([
        {
          layerId: 'image-layer',
          node: {
            kind: 'image' as const,
            assetId,
            x: 0,
            y: 0,
            width: 320,
            height: 180,
          },
        },
      ]),
      materializedAssets: [
        {
          id: assetId,
          kind: 'image' as const,
          source: 'local' as const,
          imageSourceUri: uri,
        },
      ],
    });
    const requests = new Map<string, (texture: Texture) => void>();
    const loader = {
      load(uri: string, onLoad: (texture: Texture) => void): Texture {
        requests.set(uri, onLoad);
        return new Texture();
      },
    } as TextureLoader;
    const onReady = vi.fn();
    const manager = createVizThreeImageResourceManager({ onReady, loader });
    const firstPlan = createImagePlan('image-a', 'blob:image-a');
    const nextPlan = createImagePlan('image-b', 'blob:image-b');
    const graph = createVizThreeCompositorGraph(firstPlan);

    manager.reconcile(graph.layers, firstPlan);
    expect(manager.getStats()).toEqual({
      cachedTextures: 0,
      pendingLoads: 1,
    });

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    manager.reconcile(graph.layers, nextPlan);
    expect(manager.getStats().pendingLoads).toBe(2);

    const staleTexture = new Texture();
    const disposeStale = vi.spyOn(staleTexture, 'dispose');
    requests.get('blob:image-a')?.(staleTexture);
    expect(disposeStale).toHaveBeenCalledOnce();
    expect(manager.getStats()).toEqual({
      cachedTextures: 0,
      pendingLoads: 1,
    });

    const activeTexture = new Texture();
    const disposeActive = vi.spyOn(activeTexture, 'dispose');
    requests.get('blob:image-b')?.(activeTexture);
    expect(manager.getStats()).toEqual({
      cachedTextures: 1,
      pendingLoads: 0,
    });
    expect(
      (graph.layers[0]!.contentRoot.children[0] as Mesh).material,
    ).toMatchObject({ map: activeTexture });
    expect(onReady).toHaveBeenCalledOnce();

    manager.reconcile([], {
      ...nextPlan,
      layers: [],
      materializedAssets: [],
    });
    expect(disposeActive).toHaveBeenCalledOnce();
    expect(manager.getStats()).toEqual({
      cachedTextures: 0,
      pendingLoads: 0,
    });
    manager.dispose();
  });

  it('updates persistent shader programs without rebuilding their material or geometry', () => {
    const createShaderPlan = (strength: number): VizRenderPlan => ({
      frameContext: {
        frame: strength > 0 ? 0 : 45,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: strength > 0 ? 0 : 0.75,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: strength > 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-shader',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-shader',
          componentId: 'strobe-light',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'shader',
            programId: 'test/strobe/v1',
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
            vertexShader:
              'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader:
              'uniform float uStrength; void main() { gl_FragColor = vec4(vec3(uStrength), uStrength); }',
            uniforms: {
              uStrength: strength,
              uColor: { type: 'color', value: '#ffffff' },
            },
            transparent: true,
            blendMode: 'add',
          },
        },
      ],
    });
    const firstPlan = createShaderPlan(1);
    const nextPlan = createShaderPlan(0);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const firstMesh = graph.layers[0]!.contentRoot.children[0] as Mesh;
    const firstMaterial = firstMesh.material as ShaderMaterial;
    const firstGeometry = firstMesh.geometry;

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );

    const updatedMesh = graph.layers[0]!.contentRoot.children[0] as Mesh;
    const updatedMaterial = updatedMesh.material as ShaderMaterial;
    expect(updatedMesh).toBe(firstMesh);
    expect(updatedMesh.geometry).toBe(firstGeometry);
    expect(updatedMaterial).toBe(firstMaterial);
    expect(updatedMaterial.uniforms.uStrength?.value).toBe(0);
  });

  it('updates persistent Three programs without rebuilding scene resources', () => {
    const createProgramPlan = (
      rotationX: number,
      rotationY: number,
    ): VizRenderPlan => ({
      frameContext: {
        frame: rotationX === 0 ? 0 : 30,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: rotationX === 0 ? 0 : 0.5,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: rotationX === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-program',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-cube',
          componentId: 'simple-cube',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/simple-cube/v1',
            parameters: {
              color: '#ff00ff',
              size: 1.5,
              rotationX,
              rotationY,
            },
          },
        },
      ],
    });
    const firstPlan = createProgramPlan(0, 0);
    const nextPlan = createProgramPlan(1, -0.5);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance;
    const cube = instance?.root.children[0] as Mesh;
    const material = cube.material;
    const geometry = cube.geometry;

    expect(instance?.programId).toBe('viz-core/simple-cube/v1');
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance?.root.children[0]).toBe(cube);
    expect(cube.material).toBe(material);
    expect(cube.geometry).toBe(geometry);
    expect(cube.rotation.x).toBe(1);
    expect(cube.rotation.y).toBe(-0.5);
  });

  it('evaluates deterministic particle frames on a retained instanced mesh', () => {
    const createParticlePlan = (frame: number): VizRenderPlan => ({
      frameContext: {
        frame,
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: frame / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: frame === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-particles',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-particles',
          componentId: 'particle-system',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/particle-system/v1',
            parameters: {
              time: frame / 60,
              seed: 'persistent-particles',
              startColor: '#ff00ff',
              endColor: '#00ffff',
              particleSize: 0.2,
              blending: 'additive',
              emissionRate: 10,
              lifetime: 2,
              useGravity: true,
              gravityStrength: 9.8,
              initialSpeed: 2,
              spread: 0.5,
              emitterShape: 'sphere',
              emitterSize: 0.5,
              rotationX: 0,
              rotationY: frame / 60,
              rotationZ: 0,
            },
          },
        },
      ],
    });
    const firstPlan = createParticlePlan(60);
    const nextPlan = createParticlePlan(120);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance;
    const mesh = instance?.root.children[0];
    const repeatedMesh =
      repeatedGraph.layers[0]!.programInstance?.root.children[0];

    expect(instance?.programId).toBe('viz-core/particle-system/v1');
    expect(mesh).toBeInstanceOf(InstancedMesh);
    expect((mesh as InstancedMesh).count).toBe(10);
    expect(repeatedMesh).toBeInstanceOf(InstancedMesh);
    expect(
      Array.from((mesh as InstancedMesh).instanceMatrix.array.slice(0, 160)),
    ).toEqual(
      Array.from(
        (repeatedMesh as InstancedMesh).instanceMatrix.array.slice(0, 160),
      ),
    );
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance?.root.children[0]).toBe(mesh);
    expect((mesh as InstancedMesh).count).toBe(20);
    expect(instance?.root.rotation.y).toBe(2);
  });

  it('retains Orbiting Cubes resources while deterministically regenerating structure data', () => {
    const createOrbitPlan = (
      time: number,
      seed: number,
      spacing: number,
    ): VizRenderPlan => ({
      frameContext: {
        frame: Math.round(time * 60),
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: time,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: time === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'orbiting-cubes',
      },
      viewport: { width: 1280, height: 720, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-orbiting-cubes',
          componentId: 'orbiting-cubes',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/orbiting-cubes/v1',
            parameters: {
              time,
              seed,
              maxCubes: 150,
              fractalDepth: 5,
              cubeColor: '#1a1a2e',
              cubeSize: 0.45,
              metalness: 0.95,
              roughness: 0.5,
              light1Color: '#FF00FF',
              light2Color: '#00FFFF',
              light3Color: '#FFFF00',
              lightIntensity: 500,
              ambientBrightness: 185,
              spacing,
              orbitSpeed: 0.3,
              orbitRadius: 8,
              rotationSpeed: 0.1,
            },
          },
        },
      ],
    });
    const firstPlan = createOrbitPlan(1, 3499, 0.65);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance;
    const cubes = instance?.root.userData.cubes as InstancedMesh;
    const repeatedCubes = repeatedGraph.layers[0]!.programInstance?.root
      .userData.cubes as InstancedMesh;
    const geometry = cubes.geometry;
    const material = cubes.material;
    const initialMatrices = Array.from(
      cubes.instanceMatrix.array.slice(0, cubes.count * 16),
    );

    expect(cubes.count).toBeGreaterThan(0);
    expect(initialMatrices).toEqual(
      Array.from(
        repeatedCubes.instanceMatrix.array.slice(0, repeatedCubes.count * 16),
      ),
    );
    expect(
      updateVizThreeCompositorGraph(
        graph,
        firstPlan,
        createOrbitPlan(2, 3500, 0.8),
      ),
    ).toBe(true);
    expect(layer.programInstance).toBe(instance);
    expect(instance?.root.userData.cubes).toBe(cubes);
    expect(cubes.geometry).toBe(geometry);
    expect(cubes.material).toBe(material);
    expect(instance?.root.userData.structure.rotation.y).toBe(0.2);
    expect(
      Array.from(cubes.instanceMatrix.array.slice(0, cubes.count * 16)),
    ).not.toEqual(initialMatrices);
  });

  it('retains portable polyline resources while updating point positions', () => {
    const createPolylinePlan = (middleY: number): VizRenderPlan => ({
      frameContext: {
        frame: middleY === 120 ? 0 : 1,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: middleY === 120 ? 0 : 1 / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: middleY === 120,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-polyline',
      },
      viewport: { width: 640, height: 360, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-polyline',
          componentId: 'heartbeat-monitor',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'group',
            children: [
              {
                kind: 'rect',
                x: 0,
                y: 0,
                width: 640,
                height: 360,
                style: { fill: '#18181b' },
              },
              {
                kind: 'polyline',
                points: [
                  { x: 0, y: 180 },
                  { x: 1, y: middleY },
                  { x: 2, y: 220 },
                ],
                lineCap: 'round',
                lineJoin: 'round',
                style: {
                  stroke: '#34d399',
                  strokeWidth: 2,
                },
                glow: {
                  color: '#34d399',
                  blur: 10,
                  opacity: 0.18,
                },
              },
            ],
          },
        },
      ],
    });
    const firstPlan = createPolylinePlan(120);
    const nextPlan = createPolylinePlan(80);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const root = graph.layers[0]!.contentRoot.children[0] as Group;
    const polyline = root.children[1] as Group;
    const coreLine = polyline.children[1] as Mesh;
    const geometry = coreLine.geometry;
    const material = coreLine.material;
    const before = Array.from(
      (geometry.attributes.instanceStart as InterleavedBufferAttribute).data
        .array,
    );

    expect(collectMeshes(root)).toHaveLength(3);
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(graph.layers[0]!.contentRoot.children[0]).toBe(root);
    expect((root.children[1] as Group).children[1]).toBe(coreLine);
    expect(coreLine.geometry).toBe(geometry);
    expect(coreLine.material).toBe(material);
    expect(
      Array.from(
        (geometry.attributes.instanceStart as InterleavedBufferAttribute).data
          .array,
      ),
    ).not.toEqual(before);
  });

  it('retains portable gradient-polygon materials while updating geometry', () => {
    const createPolygonPlan = (middleY: number): VizRenderPlan => ({
      frameContext: {
        frame: middleY === 120 ? 0 : 1,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: middleY === 120 ? 0 : 1 / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: middleY === 120,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-polygon',
      },
      viewport: { width: 640, height: 360, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-polygon',
          componentId: 'curve-spectrum',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'polygon',
            points: [
              { x: 0, y: 200 },
              { x: 320, y: middleY },
              { x: 640, y: 200 },
              { x: 640, y: 360 },
              { x: 0, y: 360 },
            ],
            triangleIndices: [4, 1, 0, 4, 2, 1, 4, 3, 2],
            fillGradient: {
              from: { x: 0, y: 360 },
              to: { x: 0, y: 80 },
              stops: [
                { offset: 0, color: 'transparent' },
                { offset: 1, color: '#ff41ca', opacity: 0.5 },
              ],
            },
          },
        },
      ],
    });
    const firstPlan = createPolygonPlan(120);
    const nextPlan = createPolygonPlan(80);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const mesh = graph.layers[0]!.contentRoot.children[0] as Mesh;
    const material = mesh.material;
    const geometry = mesh.geometry;
    const before = Array.from(geometry.attributes.position!.array);

    expect(mesh.material).toBeInstanceOf(ShaderMaterial);
    expect(mesh.geometry.attributes.vizColor?.itemSize).toBe(4);
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(graph.layers[0]!.contentRoot.children[0]).toBe(mesh);
    expect(mesh.material).toBe(material);
    expect(mesh.geometry).toBe(geometry);
    expect(Array.from(mesh.geometry.attributes.position!.array)).not.toEqual(
      before,
    );
  });

  it('retains one GPU point buffer while updating portable point clouds', () => {
    const firstPlan = createPortablePlan([
      {
        layerId: 'point-cloud',
        node: {
          kind: 'point-cloud',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 200 },
          ],
          radius: 3,
          style: { fill: '#ffffff' },
        },
      },
    ]);
    const nextPlan = createPortablePlan([
      {
        layerId: 'point-cloud',
        node: {
          kind: 'point-cloud',
          points: [
            { x: 120, y: 80 },
            { x: 240, y: 160 },
          ],
          radius: 4,
          style: { fill: '#ff41ca' },
        },
      },
    ]);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const points = graph.layers[0]!.contentRoot.children[0] as Points;
    const geometry = points.geometry;
    const material = points.material;
    const before = geometry.attributes.position!.array.slice();

    expect(points).toBeInstanceOf(Points);
    expect(geometry.drawRange.count).toBe(2);
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(graph.layers[0]!.contentRoot.children[0]).toBe(points);
    expect(points.material).toBe(material);
    expect(points.geometry).toBe(geometry);
    expect(geometry.drawRange.count).toBe(2);
    expect(geometry.attributes.position!.array).not.toEqual(before);
  });

  it('retains Instanced Supercube resources across structural updates', () => {
    const createSupercubePlan = (
      gridSize: number,
      explosionShift: number,
    ): VizRenderPlan => ({
      frameContext: {
        frame: explosionShift === 0 ? 0 : 60,
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: explosionShift === 0 ? 0 : 1,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: explosionShift === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'persistent-supercube',
      },
      viewport: { width: 1280, height: 720, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-supercube',
          componentId: 'instanced-supercube',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/instanced-supercube/v1',
            parameters: {
              color: explosionShift === 0 ? '#ff0000' : '#00ffff',
              explosionFactor: 2,
              gridSize,
              spacing: 4,
              explosionShift,
              rotation: explosionShift * 0.2,
            },
          },
        },
      ],
    });
    const firstPlan = createSupercubePlan(5, 0);
    const nextPlan = createSupercubePlan(6, 1);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance;
    const cubes = instance?.root.children[0] as InstancedMesh;
    const repeatedCubes = repeatedGraph.layers[0]!.programInstance?.root
      .children[0] as InstancedMesh;
    const geometry = cubes.geometry;
    const material = cubes.material;
    const initialMatrices = Array.from(
      cubes.instanceMatrix.array.slice(0, cubes.count * 16),
    );

    expect(instance?.programId).toBe('viz-core/instanced-supercube/v1');
    expect(cubes.count).toBe(352);
    expect(initialMatrices).toEqual(
      Array.from(
        repeatedCubes.instanceMatrix.array.slice(0, repeatedCubes.count * 16),
      ),
    );
    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance?.root.children[0]).toBe(cubes);
    expect(cubes.geometry).toBe(geometry);
    expect(cubes.material).toBe(material);
    expect(cubes.count).toBe(448);
    expect(cubes.rotation.x).toBeCloseTo(0.2, 12);
    expect(
      Array.from(cubes.instanceMatrix.array.slice(0, 352 * 16)),
    ).not.toEqual(initialMatrices);
  });

  it('retains Light Tunnel geometry while deterministically updating its scene', () => {
    const createTunnelPlan = (
      time: number,
      tunnelDepth: number,
      activeWaveAges: number[],
    ): VizRenderPlan => ({
      frameContext: {
        frame: Math.round(time * 60),
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: time,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: time === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'light-tunnel',
      },
      viewport: { width: 1280, height: 720, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-light-tunnel',
          componentId: 'light-tunnel',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/light-tunnel/v1',
            parameters: {
              time,
              seed: 'light-tunnel-seed',
              cubeSize: 2.5,
              spacing: 1.3,
              tunnelDepth,
              renderMode: 'Solid',
              colorMode: 'Random',
              edgeColor: '#00ffff',
              colorPalette: ['#ff00ff', '#00ffff'],
              edgeThickness: 5.5,
              glowIntensity: 1.8,
              solidCubeColor: '#0a0a0a',
              solidEmissiveColor: '#000000',
              solidEmissiveIntensity: 0,
              metalness: 0.7,
              roughness: 0.77,
              envMapIntensity: 0,
              enableLights: true,
              lightCount: 6,
              lightCircleRadius: 7,
              lightCircleDistance: 7,
              lightIntensity: 100,
              lightDistance: 100,
              lightRotationSpeed: 0.15,
              tunnelSpeed: 0.5,
              rotationSpeed: 0.05,
              activeWaveAges,
              waveSpeed: 8.5,
              waveAmplitude: 1,
              waveDuration: 0.4,
              fogDensity: 0.095,
              bloomEnabled: true,
              bloomStrength: 0.5,
              bloomRadius: 0.8,
              bloomThreshold: 0.1,
              depthOfFieldEnabled: false,
              depthOfFieldFocus: 1,
              depthOfFieldAperture: 0.0011,
            },
          },
        },
      ],
    });
    const firstPlan = createTunnelPlan(0, 13, []);
    const nextPlan = createTunnelPlan(1, 14, [0.2]);
    const graph = createVizThreeCompositorGraph(firstPlan);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance!;
    const edgeLines = instance.root.userData.edgeLines as LineSegments2;
    const solidCubes = instance.root.userData.solidCubes as InstancedMesh;
    const repeatedEdges = repeatedGraph.layers[0]!.programInstance!.root
      .userData.edgeLines as LineSegments2;
    const edgeGeometry = edgeLines.geometry;
    const edgeMaterial = edgeLines.material;
    const solidGeometry = solidCubes.geometry;
    const solidMaterial = solidCubes.material;
    const initialEdgePositions = Array.from(
      (edgeGeometry.attributes.instanceStart as InterleavedBufferAttribute).data
        .array,
    );

    expect(instance.programId).toBe('viz-core/light-tunnel/v1');
    expect(solidCubes.count).toBe(13 * 8);
    expect(edgeGeometry.instanceCount).toBe(13 * 8 * 12);
    expect(initialEdgePositions).toEqual(
      Array.from(
        (
          repeatedEdges.geometry.attributes
            .instanceStart as InterleavedBufferAttribute
        ).data.array,
      ),
    );

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance.root.userData.edgeLines).toBe(edgeLines);
    expect(instance.root.userData.solidCubes).toBe(solidCubes);
    expect(edgeLines.geometry).toBe(edgeGeometry);
    expect(edgeLines.material).toBe(edgeMaterial);
    expect(solidCubes.geometry).toBe(solidGeometry);
    expect(solidCubes.material).toBe(solidMaterial);
    expect(solidCubes.count).toBe(14 * 8);
    expect(edgeGeometry.instanceCount).toBe(14 * 8 * 12);
    expect(instance.root.rotation.z).toBeCloseTo(0.05, 12);
    expect(
      Array.from(
        (edgeGeometry.attributes.instanceStart as InterleavedBufferAttribute)
          .data.array,
      ),
    ).not.toEqual(initialEdgePositions);
  });

  it('retains Morph Shapes instances across morph, structure, and text-source updates', async () => {
    const createMorphPlan = ({
      frame,
      gridSize,
      morphT,
      explosionShift,
      additiveGlow,
      shapeB = 'pyramid',
      text = '',
      modelPointCount = 100,
    }: {
      frame: number;
      gridSize: number;
      morphT: number;
      explosionShift: number;
      additiveGlow: boolean;
      shapeB?: string;
      text?: string;
      modelPointCount?: number;
    }): VizRenderPlan => ({
      frameContext: {
        frame,
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: frame / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: frame === 0,
        isLastFrame: false,
        mode: 'live',
        seed: 'morph-shapes',
      },
      viewport: { width: 1280, height: 720, backgroundColor: '#000000' },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-morph',
          componentId: 'morph-shapes',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/morph-shapes/v1',
            parameters: {
              frame,
              seed: 'morph-shapes-seed',
              shapeA: {
                shape: 'cube',
                modelUrl: '',
                modelAssetId: '',
                text: '',
                textSize: 1,
                textDepth: 0.2,
                textFontUrl: '',
                position: [0, 0, 0],
                rotationDegrees: [0, 0, 0],
              },
              shapeB: {
                shape: shapeB,
                modelUrl: '',
                modelAssetId: '',
                text,
                textSize: 1,
                textDepth: 0.2,
                textFontUrl: '',
                position: [0, 0, 0],
                rotationDegrees: [0, 0, 0],
              },
              morphT,
              explosionShift,
              animationSpeed: 0.08,
              color: '#00c8ff',
              gridSize,
              modelPointCount,
              modelEvenness: 0.7,
              sphereSize: 0.15,
              additiveGlow,
              glowIntensity: 1,
              rotationQuaternion: [
                0,
                Math.sin((frame / 120) * 0.5),
                0,
                Math.cos((frame / 120) * 0.5),
              ],
            },
          },
        },
      ],
    });
    const firstPlan = createMorphPlan({
      frame: 0,
      gridSize: 5,
      morphT: 0,
      explosionShift: 0,
      additiveGlow: false,
    });
    const nextPlan = createMorphPlan({
      frame: 1,
      gridSize: 5,
      morphT: 1,
      explosionShift: 2,
      additiveGlow: true,
    });
    const structuralPlan = createMorphPlan({
      frame: 10,
      gridSize: 6,
      morphT: 0.5,
      explosionShift: 1,
      additiveGlow: false,
    });
    let invalidationCount = 0;
    const graph = createVizThreeCompositorGraph(firstPlan, () => {
      invalidationCount += 1;
    });
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance!;
    const instances = instance.root.userData.instances as InstancedMesh;
    const repeatedInstances = repeatedGraph.layers[0]!.programInstance!.root
      .userData.instances as InstancedMesh;
    const geometry = instances.geometry;
    const material = instances.material;
    const initialMatrices = Array.from(
      instances.instanceMatrix.array.slice(0, instances.count * 16),
    );

    expect(instance.programId).toBe('viz-core/morph-shapes/v1');
    expect(instances.count).toBe(44);
    expect(initialMatrices).toEqual(
      Array.from(
        repeatedInstances.instanceMatrix.array.slice(
          0,
          repeatedInstances.count * 16,
        ),
      ),
    );

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance.root.userData.instances).toBe(instances);
    expect(instances.geometry).toBe(geometry);
    expect(instances.material).toBe(material);
    expect(instances.count).toBe(44);
    expect(instances.material.blending).not.toBeUndefined();
    expect(
      Array.from(instances.instanceMatrix.array.slice(0, instances.count * 16)),
    ).not.toEqual(initialMatrices);

    expect(updateVizThreeCompositorGraph(graph, nextPlan, structuralPlan)).toBe(
      true,
    );
    expect(instances.geometry).toBe(geometry);
    expect(instances.material).toBe(material);
    expect(instances.count).toBe(56);
    expect(instance.root.quaternion.y).toBeCloseTo(
      Math.sin((10 / 120) * 0.5),
      12,
    );

    const textPlan = createMorphPlan({
      frame: 11,
      gridSize: 20,
      morphT: 1,
      explosionShift: 0,
      additiveGlow: false,
      shapeB: 'custom-text',
      text: 'VIZ',
      modelPointCount: 500,
    });
    expect(updateVizThreeCompositorGraph(graph, structuralPlan, textPlan)).toBe(
      true,
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(invalidationCount).toBeGreaterThan(0);
    const resolvedTextPlan = createMorphPlan({
      frame: 12,
      gridSize: 20,
      morphT: 1,
      explosionShift: 0,
      additiveGlow: false,
      shapeB: 'custom-text',
      text: 'VIZ',
      modelPointCount: 500,
    });
    expect(
      updateVizThreeCompositorGraph(graph, textPlan, resolvedTextPlan),
    ).toBe(true);
    expect(instances.count).toBe(500);
    expect(instances.geometry).toBe(geometry);
    expect(instances.material).toBe(material);
    expect(instance.root.userData.targetBounds.b).toBeGreaterThan(4);
    const textTranslations = Array.from(
      { length: instances.count },
      (_, index) => {
        const instanceMatrix = new Matrix4();
        instances.getMatrixAt(index, instanceMatrix);
        return Math.max(
          Math.abs(instanceMatrix.elements[12]),
          Math.abs(instanceMatrix.elements[13]),
          Math.abs(instanceMatrix.elements[14]),
        );
      },
    );
    expect(Math.max(...textTranslations)).toBeGreaterThan(3.5);
  });

  it('retains the Neural Network scene while deterministically rebuilding topology and signals', () => {
    const createNeuralPlan = ({
      frame,
      neuronCount,
      growth,
      triggerAge,
    }: {
      frame: number;
      neuronCount: number;
      growth: number;
      triggerAge?: number;
    }): VizRenderPlan => ({
      frameContext: {
        frame,
        fps: 60,
        durationInFrames: 180,
        timeInSeconds: frame / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: frame === 0,
        isLastFrame: false,
        mode: 'render',
        seed: 'neural-network',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-neural',
          componentId: 'neural-network',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/neural-network/v1',
            parameters: {
              time: frame / 60,
              neuronCount,
              seed: 42,
              tubeRadius: 0.25,
              neuronColor: '#00ced1',
              somaEmission: '#ff8ac9',
              emissiveIntensity: 2,
              metalness: 0,
              roughness: 0.9,
              fresnelPower: 3,
              growth,
              dendriteReach: 40,
              triggerEvents:
                triggerAge === undefined
                  ? []
                  : [
                      {
                        age: triggerAge,
                        speed: 30,
                        size: 0.2,
                        color: '#ff8ac9',
                      },
                    ],
              activationDecay: 2,
              bloomEnabled: false,
              bloomStrength: 0.2,
              bloomRadius: 0.8,
              bloomThreshold: 0.3,
              depthOfFieldEnabled: false,
              depthOfFieldFocus: 10,
              depthOfFieldAperture: 0.0005,
            },
          },
        },
      ],
    });
    const firstPlan = createNeuralPlan({
      frame: 0,
      neuronCount: 4,
      growth: 1,
    });
    const signalPlan = createNeuralPlan({
      frame: 12,
      neuronCount: 4,
      growth: 1,
      triggerAge: 0.2,
    });
    const structuralPlan = createNeuralPlan({
      frame: 30,
      neuronCount: 5,
      growth: 0.5,
      triggerAge: 0.5,
    });
    const graph = createVizThreeCompositorGraph(firstPlan);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance!;
    const dendrites = instance.root.userData.dendriteMesh as InstancedMesh;
    const somas = instance.root.userData.somaInstances as InstancedMesh;
    const signals = instance.root.userData.signalInstances as InstancedMesh;
    const repeated = repeatedGraph.layers[0]!.programInstance!;
    const dendriteMaterial = dendrites.material;
    const somaGeometry = somas.geometry;
    const signalGeometry = signals.geometry;
    const initialDendriteGeometry = dendrites.geometry;

    expect(instance.programId).toBe('viz-core/neural-network/v1');
    expect(somas.count).toBe(4);
    expect(instance.root.userData.pathCount).toBeGreaterThan(0);
    expect(instance.root.userData.neuronPositions).toEqual(
      repeated.root.userData.neuronPositions,
    );
    expect(Array.from(dendrites.geometry.attributes.position!.array)).toEqual(
      Array.from(
        (repeated.root.userData.dendriteMesh as InstancedMesh).geometry
          .attributes.position!.array,
      ),
    );

    expect(updateVizThreeCompositorGraph(graph, firstPlan, signalPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance.root.userData.dendriteMesh).toBe(dendrites);
    expect(instance.root.userData.somaInstances).toBe(somas);
    expect(instance.root.userData.signalInstances).toBe(signals);
    expect(dendrites.geometry).toBe(initialDendriteGeometry);
    expect(dendrites.material).toBe(dendriteMaterial);
    expect(somas.geometry).toBe(somaGeometry);
    expect(signals.geometry).toBe(signalGeometry);
    expect(signals.count).toBeGreaterThan(0);
    expect(instance.root.userData.activationLevel).toBeCloseTo(0.9, 12);
    expect(instance.root.rotation.y).toBeCloseTo(0.01, 12);

    expect(
      updateVizThreeCompositorGraph(graph, signalPlan, structuralPlan),
    ).toBe(true);
    expect(instance.root.userData.dendriteMesh).toBe(dendrites);
    expect(instance.root.userData.somaInstances).toBe(somas);
    expect(instance.root.userData.signalInstances).toBe(signals);
    expect(dendrites.geometry).not.toBe(initialDendriteGeometry);
    expect(dendrites.material).toBe(dendriteMaterial);
    expect(somas.geometry).toBe(somaGeometry);
    expect(signals.geometry).toBe(signalGeometry);
    expect(somas.count).toBe(5);
    expect(instance.root.userData.pathCount).toBeGreaterThan(0);
    expect(instance.root.rotation.y).toBeCloseTo(0.025, 12);
  });

  it('retains the deterministic Stage Scene while updating its full effect rig', () => {
    const createStagePlan = ({
      frame,
      crowdCount,
      beamMode,
      laserMode,
    }: {
      frame: number;
      crowdCount: number;
      beamMode: string;
      laserMode: string;
    }): VizRenderPlan => ({
      frameContext: {
        frame,
        fps: 60,
        durationInFrames: 3_600,
        timeInSeconds: frame / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: frame === 0,
        isLastFrame: false,
        mode: 'render',
        seed: 'stage-scene',
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: 'layer-stage',
          componentId: 'stage-scene',
          rendererFamily: 'three',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          resolvedInputs: {},
          node: {
            kind: 'three-program',
            programId: 'viz-core/stage-scene/v1',
            parameters: {
              frame,
              fps: 60,
              time: frame / 60,
              seed: 'stage-scene-seed',
              cameraPosition: [0, 8, 40],
              cameraRotation: [0, 0, 0],
              cinematicMode: true,
              cinematicPath: 'Panoramic Sweep',
              cinematicDuration: 60,
              cinematicLookAt: [0, 5, 0],
              cinematicLerpSpeed: 0.05,
              shaderWallEnabled: true,
              shaderWallScale: 2,
              shaderWallRotationSpeed: 1,
              shaderWallColorSpeed: 3,
              shaderWallTravelSpeed: 1,
              shaderWallBrightness: 2,
              hemisphereIntensity: 2,
              ambientIntensity: 1,
              bloomEnabled: false,
              bloomStrength: 0.5,
              bloomRadius: 0.8,
              bloomThreshold: 0.6,
              lasersEnabled: true,
              laserMode,
              laserColorMode: 'multi',
              laserColor: '#ff0000',
              laserRotationSpeed: 1,
              maximumLaserCount: 12,
              movingLightsEnabled: true,
              movingLightMode: 'auto',
              movingLightColorMode: 'multi',
              movingLightColor: '#ffffff',
              movingLightIntensity: 5,
              movingLightSpeed: 1,
              beamsEnabled: true,
              beamMode,
              beamColorMode: 'multi',
              beamColor: '#88aaff',
              beamIntensity: 1,
              stageLightsEnabled: true,
              stageLightColor: '#8888ff',
              stageWashEnabled: true,
              stageWashIntensity: 5,
              strobesEnabled: true,
              strobeIntensity: 500,
              strobeFlashRate: 0.3,
              blindersEnabled: true,
              blinderMode: 'controlled',
              blinderIntensity: 0,
              overheadBlinderEnabled: true,
              overheadBlinderIntensity: 0,
              accentLightsEnabled: true,
              accentLight1Color: '#ff00ff',
              accentLight2Color: '#00ffff',
              djSpotIntensity: 0.8,
              showDj: true,
              crowdCount,
              showHelpers: false,
            },
          },
        },
      ],
    });
    const firstPlan = createStagePlan({
      frame: 0,
      crowdCount: 50,
      beamMode: '0',
      laserMode: '0',
    });
    const nextPlan = createStagePlan({
      frame: 120,
      crowdCount: 120,
      beamMode: '6',
      laserMode: '4',
    });
    const graph = createVizThreeCompositorGraph(firstPlan);
    const repeatedGraph = createVizThreeCompositorGraph(firstPlan);
    const layer = graph.layers[0]!;
    const instance = layer.programInstance!;
    const repeated = repeatedGraph.layers[0]!.programInstance!;
    const crowd = instance.root.userData.crowd as InstancedMesh;
    const repeatedCrowd = repeated.root.userData.crowd as InstancedMesh;
    const beams = instance.root.userData.beams as Group;
    const lasers = instance.root.userData.lasers as Group;
    const crowdGeometry = crowd.geometry;
    const crowdMaterial = crowd.material;
    const initialMatrices = Array.from(
      crowd.instanceMatrix.array.slice(0, crowd.count * 16),
    );

    expect(instance.programId).toBe('viz-core/stage-scene/v1');
    expect(crowd.count).toBe(50);
    expect(instance.root.userData.crowdCount).toBe(50);
    expect(instance.root.userData.beamMode).toBe(0);
    expect(instance.root.userData.laserMode).toBe(0);
    expect(initialMatrices).toEqual(
      Array.from(
        repeatedCrowd.instanceMatrix.array.slice(0, repeatedCrowd.count * 16),
      ),
    );
    expect(instance.camera.position.toArray()).toEqual(
      repeated.camera.position.toArray(),
    );

    expect(updateVizThreeCompositorGraph(graph, firstPlan, nextPlan)).toBe(
      true,
    );
    expect(layer.programInstance).toBe(instance);
    expect(instance.root.userData.crowd).toBe(crowd);
    expect(instance.root.userData.beams).toBe(beams);
    expect(instance.root.userData.lasers).toBe(lasers);
    expect(crowd.geometry).toBe(crowdGeometry);
    expect(crowd.material).toBe(crowdMaterial);
    expect(crowd.count).toBe(120);
    expect(instance.root.userData.crowdCount).toBe(120);
    expect(instance.root.userData.beamMode).toBe(6);
    expect(instance.root.userData.laserMode).toBe(4);
    expect(
      Array.from(crowd.instanceMatrix.array.slice(0, 50 * 16)),
    ).not.toEqual(initialMatrices);
  });
});
