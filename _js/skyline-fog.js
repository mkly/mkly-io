import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

export function createRollingFog(scene) {
  const geometry = new PlaneGeometry(1, 1);
  const time = { value: 0 };
  const banks = [
    { x: -22, y: 2.2, z: 14, width: 92, height: 8, opacity: .38, phase: 0 },
    { x: 22, y: 4, z: 3, width: 70, height: 10, opacity: .32, phase: 4 },
    { x: -6, y: 7, z: -18, width: 98, height: 9, opacity: .28, phase: 8 },
    { x: 4, y: 1.2, z: 25, width: 105, height: 6, opacity: .28, phase: 12 },
  ].map(bank => {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: time,
        uPhase: { value: bank.phase },
        uOpacity: { value: bank.opacity },
        uColor: { value: new Color(bank.z < 5 ? '#a9a3c6' : '#8ebbb0') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
        }
        float billows(vec2 p) {
          return noise(p) * .57 + noise(p * 2.03 + 7.1) * .28 + noise(p * 4.07 + 19.3) * .15;
        }
        void main() {
          vec2 p = vUv * vec2(6.0, 2.8) + uPhase;
          p.x -= uTime * .045;
          p.y += sin(p.x * 1.6 + uTime * .12) * .3;
          float density = billows(p + vec2(0.0, noise(p + uTime * .025) * .7));
          float edge = smoothstep(0.0, .22, vUv.x) * smoothstep(0.0, .22, 1.0 - vUv.x);
          edge *= smoothstep(0.0, .35, vUv.y) * smoothstep(0.0, .35, 1.0 - vUv.y);
          float alpha = smoothstep(.27, .72, density) * edge * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(bank.width, bank.height, 1);
    mesh.position.set(bank.x, bank.y, bank.z);
    scene.add(mesh);
    return { ...bank, mesh };
  });

  return {
    update(delta, camera) {
      time.value += delta;
      for (const bank of banks) {
        bank.mesh.position.x = bank.x + Math.sin(time.value * .025 + bank.phase) * 7;
        bank.mesh.position.y = bank.y + Math.sin(time.value * .09 + bank.phase) * .45;
        bank.mesh.rotation.y = Math.atan2(camera.position.x - bank.mesh.position.x, camera.position.z - bank.mesh.position.z);
      }
    },
  };
}
