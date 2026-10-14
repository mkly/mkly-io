import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DirectionalLight,
  Float32BufferAttribute, HemisphereLight, Mesh, MeshStandardMaterial,
  OrthographicCamera, Scene, Shape, Sprite, SpriteMaterial, SRGBColorSpace,
  Vector2, WebGLRenderer,
} from 'three';

function puffyStarGeometry() {
  const corners = Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? .52 : 1;
    return new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  });
  const shape = new Shape();
  corners.forEach((point, i) => {
    const before = point.clone().lerp(corners[(i + 9) % 10], .22);
    const after = point.clone().lerp(corners[(i + 1) % 10], .22);
    if (i === 0) shape.moveTo(before.x, before.y);
    else shape.lineTo(before.x, before.y);
    shape.quadraticCurveTo(point.x, point.y, after.x, after.y);
  });
  shape.closePath();
  const outline = shape.getSpacedPoints(120).slice(0, -1);
  const count = outline.length;
  const rings = 24;
  const positions = [0, 0, .46];
  const indices = [];
  // Inflate the whole silhouette, including both faces, instead of extruding a flat star.
  for (let ring = 1; ring < rings; ring++) {
    const angle = ring / rings * Math.PI;
    for (const point of outline) {
      positions.push(point.x * Math.sin(angle), point.y * Math.sin(angle), Math.cos(angle) * .46);
    }
  }
  const back = positions.length / 3;
  positions.push(0, 0, -.46);
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    indices.push(0, 1 + i, 1 + next);
    for (let ring = 0; ring < rings - 2; ring++) {
      const a = 1 + ring * count + i;
      const b = 1 + ring * count + next;
      indices.push(a, a + count, b, b, a + count, b + count);
    }
    const last = 1 + (rings - 2) * count;
    indices.push(last + i, back, last + next);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#fffbd9');
  gradient.addColorStop(.18, '#fff0a8dc');
  gradient.addColorStop(.42, '#ffc33b80');
  gradient.addColorStop(.72, '#ff9b1825');
  gradient.addColorStop(1, '#ff9b1800');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function init(link) {
  const canvas = link.querySelector('canvas');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (_) {
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(72, 72, false);
  const scene = new Scene();
  const camera = new OrthographicCamera(-2.2, 2.2, 2.2, -2.2, .1, 20);
  camera.position.z = 5;
  scene.add(new HemisphereLight('#fff9e2', '#a45314', 2));
  const light = new DirectionalLight('#ffffff', 3);
  light.position.set(-3, 4, 5);
  scene.add(light);
  const material = new MeshStandardMaterial({ color: '#ffcb4c', roughness: .28, metalness: .18, emissive: '#ffb326', emissiveIntensity: .25 });
  const star = new Mesh(puffyStarGeometry(), material);
  scene.add(star);
  const glowMaterial = new SpriteMaterial({ map: glowTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: .4 });
  const glow = new Sprite(glowMaterial);
  glow.position.z = -.65;
  scene.add(glow);
  const gold = new Color('#ffb326');
  const hot = new Color('#fff5ce');
  let elapsed = 0;
  let heat = 0;
  let hovered = false;
  let focused = false;
  let chargedUntil = 0;

  function render(delta) {
    elapsed += delta;
    const active = hovered || focused || elapsed < chargedUntil;
    heat += ((active ? 1 : 0) - heat) * (1 - Math.exp(-delta * (active ? 12 : 3)));
    const pulse = .5 + .5 * Math.sin(elapsed * Math.PI / 2);
    star.rotation.set(.14 + Math.sin(elapsed * .7) * .12, elapsed * .65, -.1 + Math.sin(elapsed * .45) * .08);
    star.scale.setScalar(.86 + pulse * .34 + heat * .12);
    material.emissive.copy(gold).lerp(hot, heat);
    material.emissiveIntensity = .08 + pulse * 1.1 + heat * 2.5;
    glowMaterial.opacity = .1 + pulse * .6 + heat * .3;
    glow.scale.setScalar(2.1 + pulse * 1.9 + heat * .8);
    renderer.render(scene, camera);
  }

  link.addEventListener('pointerenter', event => { hovered = event.pointerType !== 'touch'; });
  link.addEventListener('pointerleave', () => { hovered = false; });
  link.addEventListener('pointercancel', () => { hovered = false; });
  link.addEventListener('focus', () => { focused = link.matches(':focus-visible'); });
  link.addEventListener('blur', () => { focused = false; });
  const flare = () => { chargedUntil = elapsed + 1.5; };
  link.addEventListener('pointerdown', flare);
  link.addEventListener('click', flare);

  render(0);
  link.classList.add('is-ready');
  let visible = false;
  let frame = null;
  let last = 0;
  function tick(now) {
    if (now - last >= 32) {
      render(Math.min((now - last) / 1000, .1));
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (visible && !document.hidden) {
      if (frame === null) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    } else if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(link);
  document.addEventListener('visibilitychange', sync);
}

const link = document.querySelector('.anti-star');
if (link) init(link);
