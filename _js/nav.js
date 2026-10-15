import { Bodies, Body, Composite, Engine, Sleeping } from 'matter-js';

const nav = document.querySelector('.anti-elsewhere');
if (nav) init(nav);

function init(nav) {
  const list = nav.querySelector('.links--primary');
  const items = [...list.children];
  const mobile = matchMedia('(max-width: 600px), (pointer: coarse)');
  const motion = window.DeviceMotionEvent;
  let permissionNeeded = typeof motion?.requestPermission === 'function';

  let engine = null;
  let links = [];
  let frame = null;
  let lastFrame = 0;
  let accumulator = 0;
  let visible = true;
  let touching = false;
  let width = 0;
  let height = 0;
  let lastShake = 0;
  let previousGravity = null;
  let entering = false;
  const step = 1000 / 60;
  const gravityStrength = 1.7;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function release(drop = false) {
    if (engine) return;
    entering = drop;
    // Reserve the responsive layout's space before taking the links out of flow.
    list.style.position = 'relative';
    const measurements = items.map(item => ({
      item, x: item.offsetLeft, y: item.offsetTop,
      width: item.offsetWidth, height: item.offsetHeight,
      angle: Math.atan2(new DOMMatrix(getComputedStyle(item).transform).b, new DOMMatrix(getComputedStyle(item).transform).a),
      order: Math.random(),
    }));
    width = list.clientWidth + 24;
    const layoutHeight = list.clientHeight;
    height = drop ? layoutHeight + 8 : Math.max(layoutHeight + 24, 220);
    list.style.width = `${width}px`;
    list.style.height = `${drop ? layoutHeight : height}px`;
    list.style.marginLeft = '-12px';
    list.classList.add('anti-nav-loose');
    engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
    engine.gravity.y = gravityStrength;
    // Only links and the outer nav boundaries collide;
    // a soft spring catches each falling link near its original position.
    // Lower rows fall first so they cannot get caught above a settled upper row.
    links = measurements.sort((a, b) => b.y - a.y || a.order - b.order).map(({ item, x, y, width: w, height: h, angle }, i) => {
      item.style.width = `${w}px`;
      item.style.height = `${h}px`;
      item.style.visibility = drop ? 'hidden' : '';
      const target = { x: x + w / 2 + 12, y: y + h / 2, angle };
      const narrow = mobile.matches;
      const fallDistance = narrow ? 45 + Math.random() * 20 : 130 + Math.random() * 70;
      const padding = drop ? 2 : 8;
      const body = Bodies.rectangle(target.x + (drop ? (Math.random() - .5) * (narrow ? 4 : 48) : 0), drop ? target.y - fallDistance : target.y + 12, w + padding, h + padding, {
        angle: angle + (drop ? (Math.random() - .5) * (narrow ? .08 : .5) : 0),
        restitution: (narrow ? .22 : .4) + Math.random() * .1, friction: .3, frictionAir: .018, sleepThreshold: 90,
      });
      if (drop) {
        Body.setVelocity(body, { x: (Math.random() - .5) * (narrow ? .6 : 6), y: 1 + Math.random() * 3 });
        Body.setAngularVelocity(body, (Math.random() - .5) * (narrow ? .02 : .1));
      }
      return { item, body, target, width: w, height: h, launchAt: drop ? i * (narrow ? 70 : 110) + Math.random() * 40 : 0, launched: false, entered: !drop, caught: false, restFrames: 0 };
    });
    const wall = { isStatic: true, restitution: .3, friction: .5 };
    Composite.add(engine.world, [
      ...(drop ? [] : [Bodies.rectangle(width / 2, -40, width + 160, 80, wall)]),
      Bodies.rectangle(width / 2, height + 40, width + 160, 80, wall),
      Bodies.rectangle(-40, height / 2, 80, height + 160, wall),
      Bodies.rectangle(width + 40, height / 2, 80, height + 160, wall),
    ]);
    paint();
  }

  function confine(link) {
    const { body } = link;
    if (!link.entered && body.bounds.min.y >= 1) {
      link.entered = true;
    }
    // A long label must never rotate wider than the available mobile space.
    if (body.bounds.max.x - body.bounds.min.x > width - 2 || body.bounds.max.y - body.bounds.min.y > height - 2) {
      Body.setAngle(body, 0);
      Body.setAngularVelocity(body, 0);
    }
    const dx = Math.max(0, 1 - body.bounds.min.x) + Math.min(0, width - 1 - body.bounds.max.x);
    const top = entering ? -20 : 1;
    const dy = (link.entered ? Math.max(0, top - body.bounds.min.y) : 0) + Math.min(0, height - 1 - body.bounds.max.y);
    if (dx || dy) {
      Body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
      Body.setVelocity(body, { x: dx ? -body.velocity.x * .3 : body.velocity.x, y: dy ? -body.velocity.y * .3 : body.velocity.y });
    }
  }

  function paint() {
    for (const link of links) {
      if (!link.launched) continue;
      confine(link);
      const { position, angle } = link.body;
      link.item.style.transform = `translate(${position.x - link.width / 2}px, ${position.y - link.height / 2}px) rotate(${angle}rad)`;
    }
  }

  function tick(now) {
    frame = null;
    if (!engine || !visible || document.hidden || touching || list.querySelector(':focus-visible')) return;
    accumulator += Math.min(now - lastFrame, 50);
    lastFrame = now;
    while (accumulator >= step) {
      for (const link of links) {
        if (!link.launched && engine.timing.timestamp >= link.launchAt) {
          Composite.add(engine.world, link.body);
          link.launched = true;
          link.item.style.visibility = '';
        }
        if (entering && link.launched && !link.body.isSleeping) {
          const dx = link.target.x - link.body.position.x;
          const dy = link.target.y - link.body.position.y;
          const turn = link.target.angle - link.body.angle;
          if (dy < 8) link.caught = true;
          if (link.caught) {
            link.body.frictionAir = .18;
            const resting = Math.hypot(dx, dy) < 1.5 && Math.abs(turn) < .015 && link.body.speed < .08 && Math.abs(link.body.angularVelocity) < .002;
            link.restFrames = resting ? link.restFrames + 1 : 0;
            if (link.restFrames > 20) {
              Sleeping.set(link.body, true);
              continue;
            }
            // Cancel gravity as the spring catches it, instead of adding a shelf.
            Body.applyForce(link.body, link.body.position, {
              x: dx * link.body.mass * .000035,
              y: (dy * .000085 - engine.gravity.y * engine.gravity.scale) * link.body.mass,
            });
            Body.setAngularVelocity(link.body, link.body.angularVelocity * .85 + turn * .007);
          } else {
            Body.applyForce(link.body, link.body.position, { x: dx * link.body.mass * .000006, y: 0 });
          }
        }
      }
      Engine.update(engine, step);
      accumulator -= step;
    }
    paint();
    // Once the entrance has settled, let the responsive layout own alignment.
    // A device shake can still release the links back into the physics world.
    if (entering && links.every(link => link.launched && link.body.isSleeping)) {
      reset();
      return;
    }
    if (links.some(link => !link.launched || !link.body.isSleeping)) frame = requestAnimationFrame(tick);
  }

  function resume() {
    if (!engine) return;
    if (frame === null && visible && !document.hidden && links.some(link => !link.launched || !link.body.isSleeping)) {
      lastFrame = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function wake() {
    links.forEach(({ body }) => Sleeping.set(body, false));
    resume();
  }

  function shake(x, y) {
    if (entering) reset();
    release();
    if (!engine) return;
    links.forEach(({ body }) => {
      Body.setVelocity(body, {
        x: clamp(body.velocity.x + x + (Math.random() - .5) * 5, -15, 15),
        y: clamp(body.velocity.y + y - Math.random() * 3, -15, 15),
      });
      Body.setAngularVelocity(body, (Math.random() - .5) * .18);
    });
    wake();
  }

  function onMotion(event) {
    if (!visible || document.hidden) return;
    const gravity = event.accelerationIncludingGravity;
    const raw = event.acceleration;
    const angle = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
    const rotate = (x, y) => ({ x: x * Math.cos(angle) + y * Math.sin(angle), y: x * Math.sin(angle) - y * Math.cos(angle) });
    let acceleration = raw && Number.isFinite(raw.x) ? raw : null;
    if (!acceleration && gravity && Number.isFinite(gravity.x)) {
      if (previousGravity) acceleration = { x: gravity.x - previousGravity.x, y: gravity.y - previousGravity.y, z: gravity.z - previousGravity.z };
      previousGravity = gravity;
    }
    if (acceleration && Math.hypot(acceleration.x, acceleration.y, acceleration.z || 0) > 3.5 && performance.now() - lastShake > 100) {
      lastShake = performance.now();
      const impulse = rotate(acceleration.x, acceleration.y);
      shake(clamp(-impulse.x * .45, -11, 11), clamp(-impulse.y * .45, -11, 11) - 2);
    }
    if (engine && !entering && gravity && Number.isFinite(gravity.x)) {
      const tilt = rotate(gravity.x, gravity.y);
      const x = clamp(tilt.x / 9.81, -1, 1) * gravityStrength;
      const y = Math.hypot(tilt.x, tilt.y) < 1.5 ? gravityStrength : clamp(tilt.y / 9.81, -1, 1) * gravityStrength;
      if (Math.abs(engine.gravity.x - x) + Math.abs(engine.gravity.y - y) > .08) {
        engine.gravity.x = x;
        engine.gravity.y = y;
        wake();
      }
    }
  }

  if (!permissionNeeded) window.addEventListener('devicemotion', onMotion);
  nav.addEventListener('click', async () => {
    if (permissionNeeded && mobile.matches) {
      permissionNeeded = false;
      try {
        if (await motion.requestPermission() === 'granted') window.addEventListener('devicemotion', onMotion);
      } catch (_) { /* Navigation remains available without motion access. */ }
    }
  });

  // Hold the physics still while a finger or keyboard is choosing a link.
  list.addEventListener('pointerdown', () => { touching = true; });
  window.addEventListener('pointerup', () => { touching = false; resume(); });
  window.addEventListener('pointercancel', () => { touching = false; resume(); });
  list.addEventListener('focusout', () => requestAnimationFrame(resume));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) resume(); }).observe(nav);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });

  function reset() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
    engine = null;
    entering = false;
    links = [];
    list.classList.remove('anti-nav-loose');
    ['width', 'height', 'margin-left', 'position'].forEach(property => list.style.removeProperty(property));
    items.forEach(item => ['width', 'height', 'transform', 'visibility'].forEach(property => item.style.removeProperty(property)));
    previousGravity = null;
  }
  let navWidth = nav.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(nav.clientWidth - navWidth) > 1) {
      navWidth = nav.clientWidth;
      const replay = entering;
      reset();
      if (replay) { release(true); wake(); }
    }
  }).observe(nav);
  document.fonts.ready.then(() => { if (!engine) { release(true); wake(); } });
}
