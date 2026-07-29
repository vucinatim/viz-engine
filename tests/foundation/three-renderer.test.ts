import type { VizRenderPlan } from "@viz-engine/contracts";
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizThreeCompositorGraph,
  createVizThreeSceneGraph,
  summarizeVizThreeSceneGraph,
  updateVizThreeCompositorGraph,
} from "@viz-engine/renderer-three";
import { createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { Group, Mesh, MeshBasicMaterial, ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";

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

describe("Viz Three renderer proof", () => {
  it("maps the shared render plan into a Three scene graph", () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: "render",
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "three-seed",
    });

    const renderPlan = createVizRenderPlan({
      session,
      frame: 36,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    const sceneGraph = createVizThreeSceneGraph(renderPlan);
    const summary = summarizeVizThreeSceneGraph(sceneGraph.rootGroup);

    expect(summary).toEqual(["Group", "Group", "Group", "Group"]);
    expect(sceneGraph.camera.left).toBe(-exampleProjectDocument.viewport.width / 2);
    expect(sceneGraph.camera.top).toBe(exampleProjectDocument.viewport.height / 2);
  });

  it("creates explicit compositor surfaces for ordered layers", () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: "render",
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "three-compositor-seed",
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
        (layer) => (layer.compositeSurface.material as MeshBasicMaterial).map === layer.renderTarget.texture,
      ),
    ).toBe(true);
    expect(
      compositorGraph.layers.map((layer) => (layer.compositeSurface.material as MeshBasicMaterial).opacity),
    ).toEqual(renderPlan.layers.map((layer) => layer.opacity));
  });

  it("keeps layer opacity at the compositor surface instead of baking it into inner meshes", () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 30,
        durationInFrames: 1,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 30,
        isFirstFrame: true,
        isLastFrame: true,
        mode: "render",
        seed: "three-style-seed",
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: "#000000",
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "layer-style",
          componentId: "manual",
          rendererFamily: "three",
          enabled: true,
          opacity: 0.5,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "group",
            style: {
              opacity: 0.5,
              blendMode: "add",
            },
            children: [
              {
                kind: "rect",
                x: 40,
                y: 40,
                width: 160,
                height: 80,
                style: {
                  fill: "#ffffff",
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
    const compositeMaterial = layer!.compositeSurface.material as MeshBasicMaterial;

    expect(meshes).toHaveLength(1);
    expect(mesh.material.opacity).toBeCloseTo(0.25, 6);
    expect(mesh.material.blending).not.toBeUndefined();
    expect(compositeMaterial.opacity).toBeCloseTo(0.5, 6);
  });

  it("renders stroke-only rects as stroke meshes instead of a filled quad", () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 30,
        durationInFrames: 1,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 30,
        isFirstFrame: true,
        isLastFrame: true,
        mode: "render",
        seed: "three-stroke-seed",
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: "#000000",
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "layer-stroke",
          componentId: "manual",
          rendererFamily: "three",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "rect",
            x: 80,
            y: 120,
            width: 240,
            height: 180,
            style: {
              stroke: "#88f3ff",
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

  it("updates persistent shader programs without rebuilding their material or geometry", () => {
    const createShaderPlan = (strength: number): VizRenderPlan => ({
      frameContext: {
        frame: strength > 0 ? 0 : 45,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: strength > 0 ? 0 : 0.75,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: strength > 0,
        isLastFrame: false,
        mode: "live",
        seed: "persistent-shader",
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: "#000000",
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "layer-shader",
          componentId: "strobe-light",
          rendererFamily: "three",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "shader",
            programId: "test/strobe/v1",
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
            vertexShader:
              "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader:
              "uniform float uStrength; void main() { gl_FragColor = vec4(vec3(uStrength), uStrength); }",
            uniforms: {
              uStrength: strength,
              uColor: { type: "color", value: "#ffffff" },
            },
            transparent: true,
            blendMode: "add",
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

    expect(
      updateVizThreeCompositorGraph(graph, firstPlan, nextPlan),
    ).toBe(true);

    const updatedMesh = graph.layers[0]!.contentRoot.children[0] as Mesh;
    const updatedMaterial = updatedMesh.material as ShaderMaterial;
    expect(updatedMesh).toBe(firstMesh);
    expect(updatedMesh.geometry).toBe(firstGeometry);
    expect(updatedMaterial).toBe(firstMaterial);
    expect(updatedMaterial.uniforms.uStrength?.value).toBe(0);
  });

  it("updates persistent Three programs without rebuilding scene resources", () => {
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
        mode: "live",
        seed: "persistent-program",
      },
      viewport: {
        width: 1280,
        height: 720,
        backgroundColor: "#000000",
      },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "layer-cube",
          componentId: "simple-cube",
          rendererFamily: "three",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "three-program",
            programId: "viz-core/simple-cube/v1",
            parameters: {
              color: "#ff00ff",
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

    expect(instance?.programId).toBe("viz-core/simple-cube/v1");
    expect(
      updateVizThreeCompositorGraph(graph, firstPlan, nextPlan),
    ).toBe(true);
    expect(layer.programInstance).toBe(instance);
    expect(instance?.root.children[0]).toBe(cube);
    expect(cube.material).toBe(material);
    expect(cube.geometry).toBe(geometry);
    expect(cube.rotation.x).toBe(1);
    expect(cube.rotation.y).toBe(-0.5);
  });
});
