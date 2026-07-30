import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';
import {
  AmbientLight,
  BoxGeometry,
  Group,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import {
  asNumber,
  asNonEmptyString as asString,
  assertProgram,
} from './program-input.js';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/simple-cube/v1';

export const createSimpleCubeProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node, PROGRAM_ID, 'Simple Cube');

  const scene = new Scene();
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  camera.position.set(0, 1, 5);
  camera.lookAt(0, 0, 0);

  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshPhongMaterial({ color: '#FF00FF' });
  const cube = new Mesh(geometry, material);
  const pointLight = new PointLight('#ffffff', 100);
  pointLight.position.set(5, 5, 5);
  const ambientLight = new AmbientLight('#ffffff', 0.5);

  root.add(cube, pointLight, ambientLight);
  scene.add(root);

  const update = (nextNode: VizRenderThreeProgramNode) => {
    assertProgram(nextNode, PROGRAM_ID, 'Simple Cube');
    const parameters = nextNode.parameters;
    const size = Math.max(0.1, asNumber(parameters.size, 1.5));
    cube.scale.setScalar(size);
    cube.rotation.set(
      asNumber(parameters.rotationX, 0),
      asNumber(parameters.rotationY, 0),
      0,
    );
    material.color.set(asString(parameters.color, '#FF00FF'));
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
    render(renderer: WebGLRenderer, renderTarget: WebGLRenderTarget) {
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      root.clear();
      scene.clear();
    },
  };
};
