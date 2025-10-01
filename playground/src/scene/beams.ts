import * as THREE from 'three';
import { BeamConfig } from '../scene-config';

export function createBeams(scene: THREE.Scene, config: BeamConfig) {
  const beamGroup = new THREE.Group();

  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(config.singleColor) },
      time: { value: 0 },
      intensity: { value: config.intensity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;

      uniform vec3 color;
      uniform float time;
      uniform float intensity;
      void main() {
        float yFalloff = pow(1.0 - vUv.y, 2.0);
        
        vec3 viewDirection = normalize(vViewPosition);
        float xFalloff = pow(abs(dot(viewDirection, vNormal)), 1.5);

        float falloff = yFalloff * xFalloff;
        
        // Add some subtle flicker
        float flicker = (sin(time * 10.0 + vUv.y * 20.0) * 0.5 + 0.5) * 0.1 + 0.9;

        gl_FragColor = vec4(color, falloff * 0.15 * flicker * intensity);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  const beamGeometry = new THREE.CylinderGeometry(5, 0.5, 100, 32, 1, true);
  // We need to rotate the geometry so that it points upwards
  beamGeometry.translate(0, 50, 0);
  beamGeometry.rotateX(Math.PI / 2);

  const numBeams = 6;
  const beamSpacing = 15;

  const clonedMaterial = beamMaterial.clone();

  for (let i = 0; i < numBeams; i++) {
    const beam = new THREE.Mesh(beamGeometry, clonedMaterial);
    const xPos = (i - (numBeams - 1) / 2) * beamSpacing;
    beam.position.set(xPos, 3, 10);
    // Point the beams slightly upwards and forwards
    beam.rotation.x = 0; // Set base rotation to 0, pointing forward
    beam.rotation.z = 0;
    beamGroup.add(beam);
  }

  scene.add(beamGroup);

  const update = (time: number, currentConfig: BeamConfig) => {
    beamGroup.visible = currentConfig.enabled;
    if (!beamGroup.visible) return;

    beamGroup.children.forEach((beam) => {
      if (
        beam instanceof THREE.Mesh &&
        beam.material instanceof THREE.ShaderMaterial
      ) {
        beam.material.uniforms.time.value = time;
        beam.material.uniforms.intensity.value = currentConfig.intensity;

        // Update color based on mode
        if (currentConfig.colorMode === 'single') {
          beam.material.uniforms.color.value.set(currentConfig.singleColor);
        }
        // Multi-color mode is handled by the animation loop in main.ts
      }
    });
  };

  // Function to update beam rotations (called from main animation loop)
  const updateRotations = (targetRotations: THREE.Euler[]) => {
    beamGroup.children.forEach((beam, i) => {
      const targetRotation = targetRotations[i];
      beam.rotation.x += (targetRotation.x - beam.rotation.x) * 0.1;
      beam.rotation.y += (targetRotation.y - beam.rotation.y) * 0.1;
      beam.rotation.z += (targetRotation.z - beam.rotation.z) * 0.1;
    });
  };

  // Function to set beam colors (for multi-color mode)
  const setBeamColor = (index: number, color: THREE.Color) => {
    const beam = beamGroup.children[index];
    if (
      beam instanceof THREE.Mesh &&
      beam.material instanceof THREE.ShaderMaterial
    ) {
      beam.material.uniforms.color.value.copy(color);
    }
  };

  return { beamGroup, update, updateRotations, setBeamColor };
}
