import * as THREE from 'three';

export function createBeams(scene: THREE.Scene) {
  const beamGroup = new THREE.Group();

  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x88aaff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      void main() {
        float yFalloff = pow(1.0 - vUv.y, 2.0);
        gl_FragColor = vec4(color, yFalloff * 0.5);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  const beamGeometry = new THREE.CylinderGeometry(0.2, 0.2, 80, 16);
  // We need to rotate the geometry so that the UVs run from bottom to top
  beamGeometry.rotateX(Math.PI / 2);

  const numBeams = 4;
  const beamSpacing = 40;

  for (let i = 0; i < numBeams; i++) {
    const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
    const xPos = (i / (numBeams - 1) - 0.5) * beamSpacing;
    beam.position.set(xPos, 0, -15);
    // Point the beams slightly upwards and forwards
    beam.rotation.x = -Math.PI / 8;
    beamGroup.add(beam);
  }

  scene.add(beamGroup);

  return { beamGroup };
}
