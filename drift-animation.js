/**
 * drift-animation.js
 * ROK Racers JA — Hero drift animation
 * Drop this file in your root directory (same level as index.html)
 *
 * Usage (already in your index.html):
 *   import { initHeroDrift } from "./drift-animation.js";
 *   window.addEventListener("DOMContentLoaded", () => {
 *     const heroEl      = document.querySelector(".hero");
 *     const textBlockEl = document.querySelector(".hero .hero-left");
 *     initHeroDrift(heroEl, textBlockEl);
 *   });
 */

import * as THREE from "https://esm.sh/three@0.128.0";
import { GLTFLoader } from "https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js";

export function initHeroDrift(heroEl, titleEl) {
  if (!heroEl || !titleEl) return;

  // ── Canvas ────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%!important;height:100%!important;" +
    "pointer-events:none;z-index:1;";
  heroEl.style.position = "relative";
  heroEl.prepend(canvas);

  const W = () => heroEl.offsetWidth;
  const H = () => heroEl.offsetHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  // ── Camera ────────────────────────────────────────────────
  // Slightly elevated so the ground plane reads with perspective
  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 200);
  camera.position.set(0, 4, 16);
  camera.lookAt(0, 0, 0);

  // ── Lights ────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(6, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Accent light — green to match site palette
  const accentLight = new THREE.PointLight(0x18c964, 3.5, 20);
  scene.add(accentLight);

  // ── Ground ────────────────────────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Invisible occluder (depth-only slab matching hero-left text) ──
  // colorWrite:false = invisible but writes to depth buffer
  // so the car disappears behind it exactly like going behind a building
  const occluder = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 2.5),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  );
  occluder.renderOrder = 1; // render before car (renderOrder 2)
  scene.add(occluder);

  function resizeOccluder() {
    const rect     = titleEl.getBoundingClientRect();
    const heroRect = heroEl.getBoundingClientRect();

    // Normalised device coordinates of the text block centre
    const ndcX = ((rect.left + rect.right)  / 2 - heroRect.left) / heroRect.width  *  2 - 1;
    const ndcY = -(((rect.top + rect.bottom) / 2 - heroRect.top)  / heroRect.height *  2 - 1);
    const ndcHW = (rect.width  / heroRect.width);
    const ndcHH = (rect.height / heroRect.height);

    // Unproject at the text's depth plane (y ≈ 1 in world space)
    const ref  = new THREE.Vector3(0, 1, 0).project(camera);
    const ndcZ = ref.z;

    const unproject = (x, y) =>
      new THREE.Vector3(x, y, ndcZ).unproject(camera);

    const centre = unproject(ndcX, ndcY);
    const left   = unproject(ndcX - ndcHW, ndcY);
    const top    = unproject(ndcX, ndcY + ndcHH);

    const worldW = Math.abs(centre.x - left.x) * 2 * 1.08; // 8% padding
    const worldH = Math.abs(centre.y - top.y)  * 2 * 1.08;

    occluder.geometry.dispose();
    occluder.geometry = new THREE.BoxGeometry(worldW, worldH, 2.5);
    occluder.position.set(centre.x, centre.y, 0);
  }

  // Wait for fonts to render before measuring text block
  document.fonts.ready.then(() => setTimeout(resizeOccluder, 150));

  // ── Car GLB ───────────────────────────────────────────────
  let carGroup = null;

  const loader = new GLTFLoader();
  loader.load(
    "car.glb",
    (gltf) => {
      carGroup = gltf.scene;

      // Auto-centre + scale model to fit the scene
      const box    = new THREE.Box3().setFromObject(carGroup);
      const centre = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      carGroup.position.sub(centre);          // centre on origin
      carGroup.scale.setScalar(2.7 / maxDim); // slightly larger for stronger hero presence

      carGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
          child.renderOrder   = 2;
        }
      });

      scene.add(carGroup);
    },
    undefined,
    (err) => {
      console.warn("[drift-animation] GLB load failed:", err);
      // Silently fail — page still works without the drift car
    }
  );

  // ── Smoke particles ───────────────────────────────────────
  const smokes = [];

  function spawnSmoke(x, z) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + Math.random() * 0.09, 5, 5),
      new THREE.MeshBasicMaterial({
        color: 0xbbbbbb,
        transparent: true,
        depthWrite: false,
        opacity: 0.18,
      })
    );
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.3,
      0.12 + Math.random() * 0.12,
      z + (Math.random() - 0.5) * 0.3
    );
    mesh.userData = {
      life: 1,
      vx: (Math.random() - 0.5) * 0.018,
      vy: 0.012 + Math.random() * 0.012,
    };
    mesh.renderOrder = 2;
    scene.add(mesh);
    smokes.push(mesh);
  }

  // ── Drift path ─────────────────────────────────────────────
  // Ellipse around the text block. Tweak RX / RZ to taste.
  const PATH_RX = 5.0;  // horizontal radius (left/right spread)
  const PATH_RZ = 2.8;  // depth radius     (front/back spread)
  const PATH_Y_OFFSET = -1.2; // drop the orbit so it sits under the hero text
  const SPEED   = 0.011; // radians per frame — increase to go faster

  let t     = 0;
  let frame = 0;
  let rafId = null;
  let isFrontLayer = false;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animate() {
    rafId = requestAnimationFrame(animate);
    frame++;

    t += SPEED;

    const x  = Math.cos(t) * PATH_RX;
    const z  = Math.sin(t) * PATH_RZ;
    const nx = Math.cos(t + 0.04) * PATH_RX;
    const nz = Math.sin(t + 0.04) * PATH_RZ;

    // Bring the car in front of text only near the horizontal center of the path.
    const shouldBeFront = Math.abs(x) < PATH_RX * 0.34;
    if (shouldBeFront !== isFrontLayer) {
      canvas.style.zIndex = shouldBeFront ? "3" : "1";
      isFrontLayer = shouldBeFront;
    }

    // Direction the car is heading (tangent to ellipse)
    const travelAngle = Math.atan2(nx - x, nz - z);

    // Drift: body rotates outward on the sides of the ellipse
    // cos(t) peaks at ±1 on the sides where curvature is tightest
    const driftAngle = Math.cos(t) * 0.38; // ~22° max drift

    if (carGroup) {
      carGroup.position.set(x, PATH_Y_OFFSET, z);
      carGroup.rotation.y = travelAngle + driftAngle;
    }

    // Accent light follows car
    accentLight.position.set(x, 2 + PATH_Y_OFFSET, z);

    // Smoke from rear of car every 3 frames
    if (frame % 3 === 0) {
      const rearX = x - Math.sin(travelAngle) * 1.2;
      const rearZ = z - Math.cos(travelAngle) * 1.2;
      spawnSmoke(rearX, rearZ);
    }

    // Tick smoke particles
    for (let i = smokes.length - 1; i >= 0; i--) {
      const p = smokes[i];
      p.userData.life -= 0.022;
      p.position.x += p.userData.vx;
      p.position.y += p.userData.vy;
      p.scale.setScalar(1 + (1 - p.userData.life) * 2.5);
      p.material.opacity = p.userData.life * 0.16;
      if (p.userData.life <= 0) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        smokes.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  function startLoop() {
    if (!rafId) animate();
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (prefersReduced.matches) {
    // Still render one static frame so the scene isn't blank
    renderer.render(scene, camera);
  } else {
    startLoop();
  }

  prefersReduced.addEventListener?.("change", (e) => {
    e.matches ? stopLoop() : startLoop();
  });

  // ── Resize ────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    setTimeout(resizeOccluder, 50);
  });
  ro.observe(heroEl);

  // ── Cleanup ───────────────────────────────────────────────
  // Call this if you ever unmount the hero (SPA navigation etc.)
  return function destroy() {
    stopLoop();
    ro.disconnect();
    renderer.dispose();
    canvas.remove();
  };
}