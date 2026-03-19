/**
 * drift-animation.js  v2
 * ROK Racers JA — Hero drift animation
 *
 * Loads car.glb from the Assets/ folder and orbits it around
 * the hero text block using Three.js + smoke particles.
 *
 * Usage (already wired in index.html):
 *   import { initHeroDrift } from "./drift-animation.js";
 *   initHeroDrift(heroEl, textBlockEl);
 */

import * as THREE from "https://esm.sh/three@0.128.0";
import { GLTFLoader } from "https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js";

export function initHeroDrift(heroEl, titleEl) {
  if (!heroEl || !titleEl) {
    console.warn("[drift-animation] heroEl or titleEl not found — skipping init.");
    return;
  }

  // ── Canvas ────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%!important;height:100%!important;" +
    "pointer-events:none;z-index:1;";
  heroEl.style.position = "relative";
  heroEl.prepend(canvas);

  const W = () => heroEl.offsetWidth;
  const H = () => heroEl.offsetHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  // ── Camera ────────────────────────────────────────────────
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

  // ── Occluder (depth-only — car disappears behind text block) ──
  const occluder = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 2.5),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  );
  occluder.renderOrder = 1;
  scene.add(occluder);

  function resizeOccluder() {
    const rect     = titleEl.getBoundingClientRect();
    const heroRect = heroEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return; // not visible yet

    const ndcX  = ((rect.left + rect.right)  / 2 - heroRect.left) / heroRect.width  *  2 - 1;
    const ndcY  = -(((rect.top  + rect.bottom) / 2 - heroRect.top)  / heroRect.height *  2 - 1);
    const ndcHW = (rect.width  / heroRect.width);
    const ndcHH = (rect.height / heroRect.height);

    const ref   = new THREE.Vector3(0, 1, 0).project(camera);
    const ndcZ  = ref.z;

    const unproject = (x, y) => new THREE.Vector3(x, y, ndcZ).unproject(camera);
    const centre = unproject(ndcX, ndcY);
    const left   = unproject(ndcX - ndcHW, ndcY);
    const top    = unproject(ndcX, ndcY + ndcHH);

    const worldW = Math.abs(centre.x - left.x) * 2 * 1.1;
    const worldH = Math.abs(centre.y - top.y)  * 2 * 1.1;

    occluder.geometry.dispose();
    occluder.geometry = new THREE.BoxGeometry(worldW, worldH, 2.5);
    occluder.position.set(centre.x, centre.y, 0);
  }

  // Measure after fonts are loaded (text block height depends on font)
  // document.fonts.ready is a Promise — always safe to await even after fonts loaded
  document.fonts.ready.then(() => setTimeout(resizeOccluder, 100));

  // ── Car GLB ───────────────────────────────────────────────
  // Try Assets/car.glb first (matches your folder structure), fallback to car.glb
  let carGroup = null;
  const GLB_PATHS = ["car.glb", "car.glb", "car.glb"];

  function tryLoadGLB(paths, index = 0) {
    if (index >= paths.length) {
      console.warn("[drift-animation] car.glb not found at any path — scene will run without car.");
      return;
    }
    const loader = new GLTFLoader();
    loader.load(
      paths[index],
      (gltf) => {
        carGroup = gltf.scene;
        const box    = new THREE.Box3().setFromObject(carGroup);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        carGroup.position.sub(centre);
        carGroup.scale.setScalar(2.7 / maxDim);

        carGroup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
            child.renderOrder   = 2;
          }
        });

        scene.add(carGroup);
        console.log("[drift-animation] car.glb loaded from:", paths[index]);
      },
      undefined,
      () => {
        // This path failed — try the next one silently
        tryLoadGLB(paths, index + 1);
      }
    );
  }

  tryLoadGLB(GLB_PATHS);

  // ── Smoke particles ───────────────────────────────────────
  const smokes = [];

  function spawnSmoke(x, z) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + Math.random() * 0.09, 5, 5),
      new THREE.MeshBasicMaterial({
        color: 0xbbbbbb, transparent: true, depthWrite: false, opacity: 0.18,
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

  // ── Drift path ────────────────────────────────────────────
  const PATH_RX      = 5.2;   // horizontal radius
  const PATH_RZ      = 2.6;   // depth radius
  const PATH_Y       = -1.2;  // vertical offset (car sits below text)
  const SPEED        = 0.011; // radians per frame

  let t            = 0;
  let frame        = 0;
  let rafId        = null;
  let isFrontLayer = false;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animate() {
    rafId = requestAnimationFrame(animate);
    frame++;

    t += SPEED;

    const x  = Math.cos(t) * PATH_RX;
    const z  = Math.sin(t) * PATH_RZ;
    const nx = Math.cos(t + 0.04) * PATH_RX;
    const nz = Math.sin(t + 0.04) * PATH_RZ;

    // Layer switching: car goes in front of text near horizontal centre
    const shouldBeFront = Math.abs(x) < PATH_RX * 0.34;
    if (shouldBeFront !== isFrontLayer) {
      canvas.style.zIndex = shouldBeFront ? "3" : "1";
      isFrontLayer = shouldBeFront;
    }

    const travelAngle = Math.atan2(nx - x, nz - z);
    const driftAngle  = Math.cos(t) * 0.38; // ~22° max drift

    if (carGroup) {
      carGroup.position.set(x, PATH_Y, z);
      carGroup.rotation.y = travelAngle + driftAngle;
    }

    accentLight.position.set(x, 2 + PATH_Y, z);

    if (frame % 3 === 0) {
      const rearX = x - Math.sin(travelAngle) * 1.2;
      const rearZ = z - Math.cos(travelAngle) * 1.2;
      spawnSmoke(rearX, rearZ);
    }

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

  function startLoop() { if (!rafId) animate(); }
  function stopLoop()  { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  if (prefersReduced.matches) {
    renderer.render(scene, camera); // one static frame
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
  return function destroy() {
    stopLoop();
    ro.disconnect();
    renderer.dispose();
    canvas.remove();
  };
}