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

  // Store target rotations internally
  const beamTargetRotations = beamGroup.children.map(() => new THREE.Euler());
  const centerIndex = (numBeams - 1) / 2;

  const update = (time: number, currentConfig: BeamConfig) => {
    beamGroup.visible = currentConfig.enabled;
    if (!beamGroup.visible) return;

    // Determine which mode to use
    const beamMode =
      currentConfig.mode === 'auto'
        ? Math.floor(time / 8) % 5
        : currentConfig.mode;

    // Calculate target rotations based on mode
    beamGroup.children.forEach((beam, i) => {
      const target = beamTargetRotations[i];

      if (beamMode === 0) {
        // Mirrored Wave
        const side = i <= centerIndex ? 1 : -1;
        const distanceFromCenter = Math.abs(i - centerIndex);
        target.y = Math.sin(time * 4 + distanceFromCenter * 0.5) * 0.6 * side;
        target.x =
          -Math.PI / 3 + Math.cos(time * 4 + distanceFromCenter * 0.5) * 0.4;
      } else if (beamMode === 1) {
        // Strobe
        target.y = (Math.sin(time * 2 + i) * Math.PI) / 4;
        target.x = -Math.PI / 3 + Math.sin(time * 5 + i) * 0.2;
      } else if (beamMode === 2) {
        // Center Cross
        const side = i <= centerIndex ? -1 : 1;
        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        const crossFactor = (Math.sin(time * 4) + 1) / 2;
        target.y =
          side * (Math.PI / 6) * (1 - crossFactor) +
          normalizedFromCenter * (Math.PI / 4) * crossFactor;
        target.x = -Math.PI / 3 + crossFactor * 0.6;
      } else if (beamMode === 3) {
        // Outward Fan
        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        const fanFactor = (Math.sin(time * 3) + 1) / 2;
        target.y = (fanFactor * normalizedFromCenter * Math.PI) / 3;
        target.x = -Math.PI / 3 + fanFactor * 0.6;
      } else if (beamMode === 4) {
        // Crowd Sweep
        const sweepSpeed = 1.5;
        const sweepRange = Math.PI / 3;
        const baseAngle = -Math.PI / 2.5;
        target.x =
          baseAngle + ((Math.sin(time * sweepSpeed) + 1) / 2) * sweepRange;
        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        target.y = normalizedFromCenter * (Math.PI / 8);
      }

      // Smoothly interpolate to target rotation
      beam.rotation.x += (target.x - beam.rotation.x) * 0.1;
      beam.rotation.y += (target.y - beam.rotation.y) * 0.1;
      beam.rotation.z += (target.z - beam.rotation.z) * 0.1;
    });

    // Update materials
    beamGroup.children.forEach((beam, i) => {
      if (
        beam instanceof THREE.Mesh &&
        beam.material instanceof THREE.ShaderMaterial
      ) {
        beam.material.uniforms.time.value = time;
        beam.material.uniforms.intensity.value = currentConfig.intensity;

        // Update color based on mode
        if (currentConfig.colorMode === 'single') {
          beam.material.uniforms.color.value.set(currentConfig.singleColor);
        } else {
          // Multi-color mode - different colors per mode
          let hue = 0;
          if (beamMode === 0) {
            hue = (time * 0.2 + i * 0.1) % 1;
          } else if (beamMode === 1) {
            hue = (Math.floor(time * 2) * 0.3) % 1;
          } else if (beamMode === 2 || beamMode === 4) {
            hue = (time * 0.2) % 1;
          } else if (beamMode === 3) {
            hue = (time * 0.3 + i * 0.05) % 1;
          }
          beam.material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }
      }
    });
  };

  return { beamGroup, update };
}
