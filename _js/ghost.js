import {
  BufferGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Group,
  HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PointLight,
  Scene, SphereGeometry, WebGLRenderer,
} from 'three';

if (document.querySelector('.anti-masthead')) initGhost();

function initGhost() {
  const layer = document.createElement('div');
  layer.className = 'anti-haunt';
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'anti-ghost';
  layer.appendChild(canvas);
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (_) { return; }
  renderer.setClearColor(0x000000, 0);
  const pixelRatio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  document.body.appendChild(layer);

  // These lights exist only in this transparent scene, never on the page.
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 30);
  camera.position.set(0, .15, 6);
  camera.lookAt(0, .05, 0);
  scene.add(new HemisphereLight('#47416e', '#13261c', .75));
  const green = new DirectionalLight('#80ffa5', 2.2);
  green.position.set(-3, -.4, 2);
  const purple = new DirectionalLight('#9765ff', 2.6);
  purple.position.set(2, 2, -1);
  const amber = new PointLight('#ff6135', 5, 8, 2);
  amber.position.set(1, -1.5, 2);
  scene.add(green, purple, amber);

  const ghost = new Group();
  scene.add(ghost);
  const rings = [[1.35, .02], [1.28, .38], [1.1, .61], [.83, .72], [.45, .74], [.05, .72], [-.4, .79], [-.85, .87], [-1.24, .95]];
  const segments = 32;
  const vertices = [];
  const indices = [];
  rings.forEach(([y, radius], row) => {
    for (let col = 0; col < segments; col++) {
      const angle = col / segments * Math.PI * 2;
      vertices.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      if (row < rings.length - 1) {
        const a = row * segments + col;
        const b = row * segments + (col + 1) % segments;
        indices.push(a, b, a + segments, b, b + segments, a + segments);
      }
    }
  });
  const cloth = new BufferGeometry();
  cloth.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  cloth.setIndex(indices);
  cloth.computeVertexNormals();
  ghost.add(new Mesh(cloth, new MeshStandardMaterial({ color: '#c6c5be', roughness: .78, metalness: .1, side: DoubleSide })));
  const sphere = new SphereGeometry(1, 14, 10);
  const dark = new MeshStandardMaterial({ color: '#090c17', roughness: .38 });
  const eyeLight = new MeshStandardMaterial({ color: '#c5ffab', emissive: '#7fdc86', emissiveIntensity: .65 });
  for (const side of [-1, 1]) {
    const eye = new Mesh(sphere, dark);
    eye.position.set(side * .25, .56, .69);
    eye.scale.set(.13, .21, .12);
    eye.rotation.z = side * -.18;
    const glint = new Mesh(sphere, eyeLight);
    glint.position.set(side * .25, .54, .805);
    glint.scale.set(.025, .055, .025);
    ghost.add(eye, glint);
  }
  const mouth = new Mesh(sphere, dark);
  mouth.position.set(0, .03, .7);
  mouth.scale.set(.09, .18, .07);
  ghost.add(mouth);

  const random = (min, max) => min + Math.random() * (max - min);
  let side = Math.random() < .5 ? -1 : 1;
  let width, height, start, destination, travel = 0, duration = 12, elapsed = 0;
  let motion = 'drift', returnAt = 0;
  function rushScale() { return Math.max(1, Math.min(5, (innerHeight - 16) / height)); }
  function edgePoint(edge, y = random(.12, .76) * Math.max(0, innerHeight - height)) {
    const gutter = Math.max(0, (innerWidth - Math.min(1080, innerWidth - 40)) / 2);
    const inset = Math.max(-width * .28, Math.min(48, gutter / 2 - width / 2));
    return { x: edge < 0 ? inset : innerWidth - width - inset, y };
  }
  function nextDestination() {
    destination = edgePoint(side);
    duration = Math.max(8, Math.hypot(destination.x - start.x, destination.y - start.y) / random(20, 35));
    travel = 0;
  }
  function peek(y = random(.2, .68) * Math.max(0, innerHeight - height)) {
    y = Math.max(8, Math.min(innerHeight - height - 8, y));
    start = { x: side < 0 ? -width - 16 : innerWidth + 16, y };
    destination = { x: side < 0 ? -width * .55 : innerWidth - width * .45, y };
    duration = 1.1;
    travel = 0;
    motion = 'peek-in';
    canvas.style.visibility = 'visible';
  }
  function pathPosition() {
    const progress = Math.min(1, travel / duration);
    const ease = progress * progress * (3 - 2 * progress);
    return {
      x: start.x + (destination.x - start.x) * ease,
      y: start.y + (destination.y - start.y) * ease,
    };
  }
  function fleeOnContact(event) {
    if (motion === 'flee' || motion === 'hidden') return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left - width / 2) / (width * .38);
    const y = (event.clientY - bounds.top - height / 2) / (height * .4);
    if (x * x + y * y > 1) return;
    start = pathPosition();
    side = start.x + width / 2 < innerWidth / 2 ? 1 : -1;
    const overshoot = width * (rushScale() - 1) / 2;
    destination = { x: side < 0 ? -width - overshoot - 16 : innerWidth + overshoot + 16, y: start.y };
    duration = random(.8, 1);
    travel = 0;
    motion = 'flee';
    renderer.setPixelRatio(pixelRatio * 3);
  }
  // Listen through the transparent overlay so the page remains clickable.
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') fleeOnContact(event);
  }, { passive: true, capture: true });
  window.addEventListener('pointerdown', fleeOnContact, { passive: true, capture: true });
  function draw() {
    if (motion === 'hidden') return;
    const positionOnPath = pathPosition();
    const fleeProgress = motion === 'flee' ? Math.min(1, travel / duration) : 0;
    const surge = 1 - Math.pow(1 - fleeProgress, 3);
    const scale = 1 + (rushScale() - 1) * surge;
    const extraHeight = height * (scale - 1) / 2;
    const x = positionOnPath.x + Math.sin(elapsed * .55) * 4;
    const y = Math.max(8 + extraHeight, Math.min(innerHeight - height - extraHeight - 8,
      positionOnPath.y + Math.sin(elapsed * .85) * 5));
    // Expand the transparent canvas too, so the rush isn't cropped to its small box.
    canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    ghost.position.z = surge * 1.05;
    const progress = Math.min(1, travel / duration);
    const peekLean = motion === 'peek-in' ? progress
      : motion === 'peek-hold' ? 1 : motion === 'emerge' ? 1 - progress : 0;
    ghost.rotation.y = Math.sin(elapsed * .36) * .36 + (side < 0 ? .15 : -.15);
    ghost.rotation.z = Math.sin(elapsed * .7) * .07
      + side * peekLean * .22
      - side * Math.sin(fleeProgress * Math.PI) * .3;
    const position = cloth.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const yBase = vertices[i * 3 + 1];
      const skirt = Math.max(0, (.5 - yBase) / 1.74);
      const angle = i % segments / segments * Math.PI * 2;
      position.setXYZ(i,
        vertices[i * 3] + Math.sin(angle * 3 + elapsed * 1.1) * .075 * skirt,
        yBase + Math.sin(angle * 5 + elapsed * 1.4) * .19 * skirt * skirt,
        vertices[i * 3 + 2] + Math.cos(angle * 3 + elapsed) * .075 * skirt);
    }
    position.needsUpdate = true;
    cloth.computeVertexNormals();
    green.position.set(Math.sin(elapsed * .27) * 3, -1, 2);
    purple.position.set(2, Math.cos(elapsed * .31) * 2, -1);
    amber.intensity = 4 + Math.sin(elapsed * .65) * 1.2;
    renderer.render(scene, camera);
  }
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const y = Math.min(innerHeight - height, innerHeight * .38);
    if (motion === 'hidden') {
      destination = { x: side < 0 ? -width - 16 : innerWidth + 16, y };
      return;
    }
    renderer.setPixelRatio(pixelRatio);
    if (!start || motion === 'peek-in' || motion === 'peek-hold' || motion === 'emerge') {
      peek(y);
    } else {
      start = edgePoint(side, y);
      motion = 'drift';
      nextDestination();
    }
    draw();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let animation = null, last = 0;
  function frame(now) {
    if (now - last >= 32) {
      const delta = Math.min((now - last) / 1000, .1);
      last = now;
      elapsed += delta;
      travel += delta;
      if (motion === 'hidden') {
        if (now >= returnAt) peek();
      } else if (travel >= duration) {
        start = destination;
        if (motion === 'flee') {
          motion = 'hidden';
          returnAt = now + 5000;
          canvas.style.visibility = 'hidden';
          renderer.setPixelRatio(pixelRatio);
        } else if (motion === 'peek-in') {
          motion = 'peek-hold';
          duration = 1.4;
          travel = 0;
        } else if (motion === 'peek-hold') {
          motion = 'emerge';
          destination = edgePoint(side, start.y);
          duration = 1.1;
          travel = 0;
        } else {
          motion = 'drift';
          nextDestination();
        }
      }
      draw();
    }
    animation = requestAnimationFrame(frame);
  }
  function sync() {
    if (document.hidden) {
      if (animation !== null) cancelAnimationFrame(animation);
      animation = null;
      draw();
    } else if (animation === null) {
      last = performance.now();
      animation = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', sync);
  sync();
}
