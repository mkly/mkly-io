import {
  Group, Mesh,
  MeshBasicMaterial, RingGeometry, SphereGeometry, Vector3,
} from 'three';

export function createSkylineLife(scene, roundedBox, material) {
  function part(parent, x, y, z, width, height, depth, color) {
    const result = new Mesh(roundedBox(width, height, depth), material(color));
    result.position.set(x, y, z);
    parent.add(result);
    return result;
  }

  const wheelGeometry = new SphereGeometry(.29, 20, 12);
  wheelGeometry.scale(1, .35, 1);
  const roofSensorGeometry = new SphereGeometry(.3, 20, 12);
  roofSensorGeometry.scale(1, .58, 1);
  const colors = ['#c93032', '#f5f3eb', '#c5c8ce', '#f5f3eb'];
  const cars = colors.map((color, index) => {
    const car = new Group();
    const waymo = index % 2 === 1;
    car.name = waymo ? 'bay-bound-waymo' : 'bay-bound-tesla';
    part(car, 0, 0, 0, 3.2, waymo ? .65 : .5, 1.4, color);
    part(car, -.22, .48, 0, waymo ? 1.8 : 1.6, waymo ? .65 : .43, 1.18, '#243642');
    part(car, -.3, waymo ? .84 : .74, 0, 1.55, .12, 1.22, waymo ? color : '#202a35');
    if (waymo) {
      part(car, -.15, 1, 0, 1.25, .16, 1, '#252f39');
      const sensor = new Mesh(roofSensorGeometry, material('#edf4f4'));
      sensor.position.set(-.15, 1.27, 0);
      car.add(sensor);
      part(car, -.15, 1.49, 0, .35, .09, .35, '#4ccbb3');
      for (const side of [-1, 1]) {
        part(car, 1.1, .4, side * .73, .3, .24, .18, '#324c68');
        for (let stroke = 0; stroke < 4; stroke++) {
          const mark = part(car, -.33 + stroke * .2, 0, side * .712, .08, .38, .025, stroke < 2 ? '#4285ed' : '#47bf9b');
          mark.rotation.z = (stroke % 2 ? -1 : 1) * .5;
        }
      }
    } else {
      const windshield = part(car, .65, .44, 0, .13, .48, 1.15, '#35485b');
      windshield.rotation.z = -.52;
      part(car, 1.15, .265, 0, .05, .025, .35, '#eeeeee');
      part(car, 1.02, .265, 0, .25, .025, .065, '#eeeeee');
    }
    for (const side of [-1, 1]) {
      part(car, 1.62, .07, side * .47, .07, .12, .35, '#fff2ba');
      part(car, -1.62, .07, side * .47, .07, .12, .35, '#e94a39');
    }
    for (const x of [-1.05, 1.05]) {
      for (const z of [-.73, .73]) {
        const wheel = new Mesh(wheelGeometry, material('#22212b'));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, -.27, z);
        car.add(wheel);
      }
    }
    scene.add(car);
    return { mesh: car, offset: index * 2.8, lastImpact: -1 };
  });

  // Reuse a bounded pool of rings and droplets instead of allocating per crash.
  const ringGeometry = new RingGeometry(.83, 1, 48);
  const dropletGeometry = new SphereGeometry(.18, 12, 8);
  // Keep the spray bright even in the nighttime lighting and fog.
  const dropletMaterial = new MeshBasicMaterial({ color: '#c5e8ef', fog: false });
  const splashes = Array.from({ length: 4 }, () => {
    const group = new Group();
    const rings = [0, 1].map(() => {
      const ring = new Mesh(ringGeometry, new MeshBasicMaterial({
        color: '#b9e4e7', transparent: true, opacity: 1, depthWrite: false, fog: false,
      }));
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      return ring;
    });
    const droplets = Array.from({ length: 12 }, (_, index) => {
      const drop = new Mesh(dropletGeometry, dropletMaterial);
      group.add(drop);
      return { mesh: drop, angle: index * Math.PI / 6, speed: 2 + index % 3, lift: 4 + index % 4 };
    });
    group.visible = false;
    scene.add(group);
    return { group, rings, droplets, age: 3 };
  });
  let nextSplash = 0;
  function splash(x, z, scale = 1, age = 0) {
    const item = splashes[nextSplash++ % splashes.length];
    item.age = age;
    item.group.position.set(x, -.15, z);
    item.group.scale.setScalar(scale);
    item.group.visible = true;
  }

  const plane = new Group();
  plane.name = 'mouse-blimp';
  plane.rotation.order = 'YXZ';
  const envelope = new Mesh(new SphereGeometry(1, 40, 24), material('#f2eedc'));
  envelope.scale.set(6.3, 2.2, 2.2);
  plane.add(envelope);
  part(plane, -4.6, 1.25, 0, 2.2, 2, .2, '#a891ff');
  part(plane, -4.6, 0, 0, 2.2, .2, 5.7, '#a891ff');
  part(plane, .4, -2.1, 0, 2.4, .65, 1.15, '#ff4719');
  part(plane, .65, -1.85, 0, 1.8, .42, 1.2, '#35485b');
  for (const side of [-1, 1]) {
    part(plane, .7, -2.05, side * .59, 1.8, .28, .04, '#9cd4cf');
    part(plane, -.1, -1.3, side * .55, .12, 1.1, .12, '#71644e');
  }
  const propeller = new Group();
  propeller.position.set(-1.05, -2.15, 0);
  part(propeller, 0, 0, 0, .13, 1.6, .14, '#e9ece8');
  part(propeller, 0, 0, 0, .13, .14, 1.6, '#e9ece8');
  plane.add(propeller);
  plane.position.set(-30, 20, 14);
  scene.add(plane);
  const flightTarget = new Vector3(-30, 20, 14);
  const flightDirection = new Vector3();
  let steering = false;
  let hovering = false;
  let crash = null;
  const crashVelocity = new Vector3();
  function steer(position) {
    if (crash) return;
    flightTarget.copy(position);
    steering = true;
  }
  function releasePlane() { steering = false; }
  function hoverPlane(value) { hovering = value && !crash; }
  function canCrashPlane() { return plane.visible && !crash; }
  function resetPlane() {
    crash = null;
    hovering = false;
    steering = false;
    plane.visible = true;
    plane.position.set(-30, 20, 18);
    plane.rotation.set(0, 0, 0);
  }
  function crashPlane() {
    if (!canCrashPlane()) return;
    crash = { age: 0, submerged: false, wait: 0 };
    hovering = false;
    steering = false;
    crashVelocity.set(Math.cos(plane.rotation.y) * 7, -3, 3);
  }

  let elapsed = 0;
  const drivingTime = 8.8;
  const fallTime = Math.sqrt(4.43 / 7);
  function update(delta) {
    elapsed += delta;
    if (crash) {
      if (crash.submerged) {
        crash.wait += delta;
        if (crash.wait > 2.2) resetPlane();
      } else {
        crash.age += delta;
        crashVelocity.y -= delta * 12;
        plane.position.addScaledVector(crashVelocity, delta);
        plane.rotation.z = -Math.min(1.35, .2 + crash.age * .85);
        plane.rotation.x = Math.sin(crash.age * 13) * .22;
        if (plane.position.y <= .3) {
          plane.position.y = -.25;
          plane.visible = false;
          crash.submerged = true;
          splash(plane.position.x, plane.position.z, 1.7);
        }
      }
    } else {
      if (!steering && !hovering) flightTarget.set(Math.sin(elapsed * .2) * 39, 20 + Math.sin(elapsed * .37) * 3, 18 + Math.cos(elapsed * .2) * 3);
      flightDirection.subVectors(flightTarget, plane.position);
      const easing = 1 - Math.exp(-delta * 3);
      if (!hovering && flightDirection.lengthSq() > .25) {
        const desiredYaw = Math.atan2(-flightDirection.z, flightDirection.x);
        const turn = Math.atan2(Math.sin(desiredYaw - plane.rotation.y), Math.cos(desiredYaw - plane.rotation.y));
        plane.rotation.y += turn * easing;
      }
      const bank = hovering ? Math.sin(elapsed * 2.2) * .055 : Math.max(-.1, Math.min(.1, flightDirection.y * .03));
      const roll = hovering ? Math.sin(elapsed * 1.7) * .035 : 0;
      plane.rotation.z += (bank - plane.rotation.z) * easing;
      plane.rotation.x += (roll - plane.rotation.x) * easing;
      if (!hovering) {
        if (flightDirection.lengthSq() < .0025) plane.position.copy(flightTarget);
        else plane.position.lerp(flightTarget, 1 - Math.exp(-delta * 1.8));
      }
    }
    propeller.rotation.x += delta * 29;
    for (const car of cars) {
      const time = elapsed + car.offset;
      const cycle = Math.floor(time / 11.2);
      const phase = time % 11.2;
      const falling = Math.max(0, phase - drivingTime);
      const hitWater = falling >= fallTime;
      car.mesh.visible = !hitWater;
      car.mesh.position.set(-62 + phase * 6.1, 4.18 - 7 * falling * falling, 6);
      car.mesh.rotation.z = -falling * .85;
      if (hitWater && car.lastImpact !== cycle) {
        splash(-62 + (drivingTime + fallTime) * 6.1, 6);
        car.lastImpact = cycle;
      }
    }
    for (const item of splashes) {
      item.age += delta;
      const age = item.age;
      item.group.visible = age < 2.2;
      if (!item.group.visible) continue;
      item.rings.forEach((ring, index) => {
        const time = Math.max(0, age - index * .2);
        ring.scale.setScalar(.3 + time * 2.8);
        ring.position.y = index * .02;
        ring.material.opacity = Math.max(0, (1 - time / 2.2) * .85);
      });
      for (const drop of item.droplets) {
        const height = drop.lift * age - 5.5 * age * age;
        drop.mesh.visible = height >= 0;
        drop.mesh.position.set(Math.cos(drop.angle) * drop.speed * age, height, Math.sin(drop.angle) * drop.speed * age);
        drop.mesh.scale.set(1, 1.8, 1);
      }
    }
  }
  update(0);
  return { update, steer, releasePlane, plane, hoverPlane, canCrashPlane, crashPlane, resetPlane };
}
