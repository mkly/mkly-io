import {
  AmbientLight, BoxGeometry, BufferGeometry, Color, ConeGeometry,
  CylinderGeometry, DirectionalLight, Fog, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, Mesh, MeshLambertMaterial, Object3D, OrthographicCamera,
  Plane, PlaneGeometry, Quaternion, Ray, Raycaster, Scene, ShaderMaterial, Sphere, SphereGeometry, Vector2, Vector3,
  WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { createSkylineLife } from './skyline-life';
// The homepage shares one Three.js bundle between the heart and skyline.
import './heart';

const container = document.querySelector('.anti-skyline');
if (container) init(container);

function init(container) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas: container.querySelector('canvas'), alpha: false, antialias: true });
  } catch (_) {
    container.textContent = 'San Francisco';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new Scene();
  scene.background = new Color('#1b2335');
  scene.fog = new Fog('#1b2335', 115, 220);
  const camera = new OrthographicCamera(-60, 60, 22, -22, 1, 300);
  camera.position.set(42, 29, 78);
  camera.lookAt(0, 5, 0);
  scene.add(new AmbientLight('#adc4e6', 1.8));
  const sun = new DirectionalLight('#ffd5aa', 2.4);
  sun.position.set(-40, 50, 40);
  scene.add(sun);

  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new MeshLambertMaterial({ color, flatShading: true }));
    return materials.get(color);
  }
  const cube = new BoxGeometry(1, 1, 1);
  function box(x, y, z, width, height, depth, color) {
    const mesh = new Mesh(cube, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    scene.add(mesh);
    return mesh;
  }
  function mesh(geometry, color, x, y, z) {
    const result = new Mesh(geometry, material(color));
    result.position.set(x, y, z);
    scene.add(result);
    return result;
  }
  function lines(points, color) {
    const geometry = new BufferGeometry().setFromPoints(points.map(p => new Vector3(...p)));
    const result = new LineSegments(geometry, new LineBasicMaterial({ color }));
    scene.add(result);
    return result;
  }

  // Broad faceted geometry, like an early VRML scene.
  box(0, -1, 0, 230, 1.5, 180, '#244956');
  box(15, -.1, -10, 72, 1, 25, '#4b5355');
  box(21, .2, 3, 39, .8, 5, '#7f7766');
  for (let i = 0; i < 3; i++) box(16 + i * 8, .1, 7, 2.2, .6, 9, '#8f8067');
  const hill = mesh(new SphereGeometry(1, 9, 5), '#455045', -9, 0, -13);
  hill.scale.set(14, 5, 11);
  const farHill = mesh(new SphereGeometry(1, 8, 4), '#343f40', -53, -1, -7);
  farHill.scale.set(22, 7, 13);

  let seed = 96;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const windows = [];
  const buildingColors = ['#7b8998', '#a49a82', '#63747c', '#c0b299', '#8d858a'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const x = 2 + col * 4.7;
      const z = -15 + row * 5.3;
      if (row === 2 && col >= 2 && col <= 3) continue;
      const height = 3 + random() * (row === 0 ? 8 : 13);
      const width = 2.6 + random();
      const depth = 3.4;
      box(x, height / 2, z, width, height, depth, buildingColors[(col + row * 2) % buildingColors.length]);
      if (col % 3 === 0) box(x, height + .5, z, width * .65, 1, 2.2, '#65717d');
      for (let floor = 1; floor < height - .5; floor += 1.3) {
        for (let column = -1; column <= 1; column++) {
          if (random() > .3) windows.push([x + column * .8, floor, z + depth / 2 + .015]);
        }
      }
    }
  }
  const litWindows = new InstancedMesh(new PlaneGeometry(.35, .55), material('#e5cb81'), windows.length);
  const dummy = new Object3D();
  windows.forEach((position, i) => {
    dummy.position.set(...position);
    dummy.updateMatrix();
    litWindows.setMatrixAt(i, dummy.matrix);
  });
  scene.add(litWindows);

  // Transamerica Pyramid and Coit Tower anchor the pre-2000 skyline.
  const pyramid = mesh(new ConeGeometry(4, 24, 4), '#d1c8ae', 14, 12, -3);
  pyramid.rotation.y = Math.PI / 4;
  box(14, 1, -3, 5.8, 2, 5.8, '#b4b5ac');
  box(14, 24.5, -3, .16, 2, .16, '#dedbcd');
  for (let y = 3; y < 22; y += 1.5) {
    const width = 5.66 * (1 - y / 24);
    box(14, y, -3, width + .06, .09, width + .06, '#5d6877');
  }
  mesh(new CylinderGeometry(.9, 1.1, 6.5, 10), '#c0bbaa', -8, 7, -12);
  mesh(new CylinderGeometry(1.1, .9, 1, 10), '#d5caae', -8, 10.4, -12);
  mesh(new CylinderGeometry(.72, .72, .3, 10), '#3b4653', -8, 11, -12);

  // Golden Gate deck, paired tower legs, suspension cables and hangers.
  box(-36, 3.2, 6, 55, .65, 3.5, '#b74227');
  box(-36, 3.58, 6, 55, .1, 2.7, '#303235');
  for (const x of [-48, -27]) {
    for (const z of [4.2, 7.8]) box(x, 8, z, .9, 16, .9, '#c64b2a');
    for (const y of [5, 9.5, 14.4]) box(x, y, 6, 1, .65, 4.5, '#bd3d25');
    box(x, .3, 6, 3, 1, 6, '#657178');
  }
  const cablePoints = [];
  function cableHeight(x) {
    if (x < -48) return 3.8 + 11.5 * Math.pow((x + 63) / 15, .65);
    if (x > -27) return 3.8 + 11.5 * Math.pow((-9 - x) / 18, .65);
    return 6 + 9.3 * Math.pow((x + 37.5) / 10.5, 2);
  }
  for (const z of [4.2, 7.8]) {
    for (let x = -63; x < -9; x++) {
      cablePoints.push([x, cableHeight(x), z], [x + 1, cableHeight(x + 1), z]);
      if (x % 2 === 0) cablePoints.push([x, 3.7, z], [x, cableHeight(x), z]);
    }
  }
  lines(cablePoints, '#f5834b');

  const ripples = [];
  for (let i = 0; i < 65; i++) {
    const x = random() * 140 - 70;
    const z = random() * 48 + 10;
    ripples.push([x, -.2, z], [x + 1 + random() * 3, -.2, z]);
  }
  lines(ripples, '#527e87');
  const life = createSkylineLife(scene, cube, material);
  const canvas = renderer.domElement;
  const defaultYaw = Math.atan2(42, 78);
  const defaultPitch = Math.atan2(24, Math.hypot(42, 78));
  const radius = Math.hypot(42, 24, 78);
  let yaw = defaultYaw;
  let pitch = defaultPitch;
  function updateCamera() {
    const angle = yaw;
    camera.position.set(
      Math.sin(angle) * Math.cos(pitch) * radius,
      5 + Math.sin(pitch) * radius,
      Math.cos(angle) * Math.cos(pitch) * radius,
    );
    camera.lookAt(0, 5, 0);
    camera.updateMatrixWorld();
  }

  // Distress the skyline's rendered image, without changing the separate heart.
  const target = new WebGLRenderTarget(1, 1, { samples: 2 });
  const screenScene = new Scene();
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenMaterial = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uScene: { value: target.texture },
      uResolution: { value: new Vector2(1, 1) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uScene;
      uniform vec2 uResolution;
      varying vec2 vUv;

      float hash(float n) {
        return fract(sin(n * 127.1) * 43758.5453);
      }

      float bayer2(vec2 p) {
        p = mod(floor(p), 2.0);
        return 2.0 * p.x + 3.0 * p.y - 4.0 * p.x * p.y;
      }

      void main() {
        vec3 color = texture2D(uScene, vUv).rgb;
        // Quantize display colors, rather than crushing the scene's linear light.
        color = linearToOutputTexel(vec4(color, 1.0)).rgb;
        vec2 cell = floor(vUv * uResolution / 2.0);
        float threshold = (4.0 * bayer2(cell) + bayer2(floor(cell / 2.0)) + 0.5) / 16.0;
        vec3 levels = vec3(6.0, 7.0, 5.0);
        color = floor(color * levels + threshold) / levels;
        float scanline = mod(floor(vUv.y * uResolution.y), 3.0);
        color *= mix(0.88, 1.0, step(1.0, scanline));
        color += (hash(dot(cell, vec2(17.0, 59.0))) - 0.5) * 0.025;
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `,
  });
  const screen = new Mesh(new PlaneGeometry(2, 2), screenMaterial);
  screen.frustumCulled = false;
  screenScene.add(screen);

  function renderFrame() {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(screenScene, screenCamera);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;
    const halfHeight = Math.max(24, 56 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const pixelRatio = renderer.getPixelRatio();
    target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    screenMaterial.uniforms.uResolution.value.set(width, height);
    renderFrame();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let animation = null;
  let last = 0;
  function tick(now) {
    if (now - last > 40) {
      const delta = Math.min((now - last) / 1000, .1);
      if (!drag) yaw = (yaw + delta * .045) % (Math.PI * 2);
      life.update(delta);
      updateCamera();
      updateHover();
      renderFrame();
      last = now;
    }
    animation = requestAnimationFrame(tick);
  }
  function sync() {
    if (visible && !document.hidden && !reducedMotion.matches) {
      if (animation === null) {
        last = performance.now();
        animation = requestAnimationFrame(tick);
      }
    } else if (animation !== null) {
      cancelAnimationFrame(animation);
      animation = null;
    }
    if (reducedMotion.matches) {
      updateCamera();
      renderFrame();
    }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(container);
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);

  const raycaster = new Raycaster();
  const flyingPlane = new Plane(new Vector3(0, 0, 1), -14);
  const pointer = new Vector2();
  const hit = new Vector3();
  const hitPose = new Matrix4();
  const hitOrientation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const hitScale = new Vector3(6.6, 2.7, 2.8);
  const localRay = new Ray();
  const hitSphere = new Sphere(new Vector3(), 1);
  let wasHovering = false;
  let hoverEvent = null;
  function aimPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
  }
  function hitsPlane(event, padded = false) {
    if (!life.canCrashPlane()) return false;
    aimPointer(event);
    // Keep the hit area steady while the blimp banks; retain hover near its edge.
    hitOrientation.setFromAxisAngle(up, life.plane.rotation.y);
    hitPose.compose(life.plane.position, hitOrientation, hitScale).invert();
    localRay.copy(raycaster.ray).applyMatrix4(hitPose);
    hitSphere.radius = padded ? 1.12 : 1;
    return localRay.intersectsSphere(hitSphere);
  }
  function updateHover() {
    const hovering = !!hoverEvent && !drag && hitsPlane(hoverEvent, wasHovering);
    wasHovering = hovering;
    life.hoverPlane(hovering);
    canvas.style.cursor = drag ? 'grabbing' : hovering ? 'pointer' : 'grab';
    return hovering;
  }
  function pointInSky(event) {
    aimPointer(event);
    if (!raycaster.ray.intersectPlane(flyingPlane, hit)) hit.set(0, 15, 14);
    hit.x = Math.max(-52, Math.min(45, hit.x));
    hit.y = Math.max(7, Math.min(29, hit.y));
    return hit;
  }
  function rotateView(dx, dy) {
    yaw += dx;
    pitch = Math.max(.12, Math.min(.65, pitch + dy));
    updateCamera();
    renderFrame();
  }
  function resetView() {
    yaw = defaultYaw;
    pitch = defaultPitch;
    life.resetPlane();
    updateCamera();
    renderFrame();
  }
  let drag = null;
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, plane: hitsPlane(event) };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
      if (drag.moved) rotateView((drag.x - event.clientX) / canvas.clientWidth * 2, (event.clientY - drag.y) / canvas.clientHeight * .7);
      drag.x = event.clientX;
      drag.y = event.clientY;
    } else if (event.pointerType !== 'touch') {
      hoverEvent = event;
      if (!updateHover()) life.steer(pointInSky(event), reducedMotion.matches);
      if (reducedMotion.matches) renderFrame();
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && drag.plane) {
      life.crashPlane(reducedMotion.matches);
      renderFrame();
    }
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  function cancelDrag() { drag = null; }
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
  canvas.addEventListener('pointerleave', () => {
    hoverEvent = null;
    wasHovering = false;
    life.hoverPlane(false);
    life.releasePlane();
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') rotateView(-.1, 0);
    else if (event.key === 'ArrowRight') rotateView(.1, 0);
    else if (event.key === 'ArrowUp') rotateView(0, .06);
    else if (event.key === 'ArrowDown') rotateView(0, -.06);
    else if (event.key.toLowerCase() === 'c') {
      life.crashPlane(reducedMotion.matches);
      renderFrame();
    } else if (event.key.toLowerCase() === 'r') resetView();
    else return;
    event.preventDefault();
  });
}
