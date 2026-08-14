import {
  DirectionalLight,
  ExtrudeGeometry,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  WebGLRenderer,
} from 'three';

function heartGeometry() {
  // Classic bezier heart, authored tip-up; flipped and centered below.
  const shape = new Shape();
  shape.moveTo(5, 5);
  shape.bezierCurveTo(5, 5, 4, 0, 0, 0);
  shape.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  shape.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  shape.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  shape.bezierCurveTo(16, 7, 16, 0, 10, 0);
  shape.bezierCurveTo(7, 0, 5, 5, 5, 5);

  const geo = new ExtrudeGeometry(shape, {
    depth: 5,
    bevelEnabled: true,
    bevelThickness: 1.2,
    bevelSize: 1.2,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.rotateZ(Math.PI);
  geo.center();
  return geo;
}

function init() {
  const canvas = document.querySelector('[x-mkly-heart]');
  if (!canvas) return;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.replaceWith('♥ ');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || 34, canvas.clientHeight || 34, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 1, 100);
  camera.position.set(0, 0, 44);

  scene.add(new HemisphereLight(0xffffff, 0x999999, 1.2));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(15, 20, 30);
  scene.add(key);

  const mat = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
  const heart = new Mesh(heartGeometry(), mat);
  scene.add(heart);

  // Follow the page accent color across light/dark themes.
  function applyColor() {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim();
    mat.color.set(accent || '#d9503a');
  }
  applyColor();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  if (media.addEventListener) {
    media.addEventListener('change', () => {
      applyColor();
      if (reduceMotion.matches) renderer.render(scene, camera);
    });
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    heart.rotation.y += dt * 0.6;
    renderer.render(scene, camera);
    if (!reduceMotion.matches) requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
