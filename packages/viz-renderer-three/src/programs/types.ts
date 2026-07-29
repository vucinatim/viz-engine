import type {
  VizMaterializedAsset,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import type {
  Camera,
  Group,
  Scene,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

export interface VizThreeProgramInstance {
  readonly programId: string;
  readonly scene: Scene;
  readonly camera: Camera;
  readonly root: Group;
  update(
    node: VizRenderThreeProgramNode,
    materializedAssets?: ReadonlyMap<string, VizMaterializedAsset>,
  ): void;
  resize(width: number, height: number): void;
  render(
    renderer: WebGLRenderer,
    renderTarget: WebGLRenderTarget,
  ): void;
  dispose(): void;
}

export type VizThreeProgramFactory = (options: {
  node: VizRenderThreeProgramNode;
  width: number;
  height: number;
  materializedAssets: ReadonlyMap<string, VizMaterializedAsset>;
  invalidate(): void;
}) => VizThreeProgramInstance;
