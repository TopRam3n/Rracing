/**
 * drift-animation.js  v3
 * ROK Racers JA — Hero drift animation
 *
 * v3 fix: removed the z-index canvas flip entirely.
 * The glitch was caused by canvas.style.zIndex snapping between 1 and 3
 * every time the car crossed the text midpoint — causing a hard visual pop.
 *
 * New approach:
 *  - Canvas sits at z-index:1 (behind HTML text) permanently.
 *  - The car ALWAYS renders behind the text — which is correct 90% of the time.
 *  - When the car passes "through" the front arc we fade its opacity down
 *    smoothly so it dips behind the text gracefully instead of hard-cutting.
 *  - Text has strong text-shadow so it always reads clearly.
 *  - No snapping, no glitch, smooth orbital feel.
 *
 * If you truly need the car in front of text, the right solution is to
 * render the text inside Three.js using CSS3DRenderer — but that requires
 * rebuilding the text hierarchy. This approach looks great and has zero flicker.
 */

import * as THREE from "https://esm.sh/three@0.128.0";
import { GLTFLoader } from "https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js";

export function initHeroDrift(heroEl, titleEl) {
  if (!heroEl || !titleEl) {
    console.warn("[drift-animation] heroEl or titleEl not found — skipping init.");
    return;
  }

  // ── Canvas — stays BEHIND html text permanently (z-index:1) ──────────
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

  // ── Car GLB ───────────────────────────────────────────────
  let carGroup = null;
  // Try multiple paths to find car.glb regardless of deployment structure
  const GLB_PATHS = ["car.glb", "./car.glb", "Assets/car.glb", "/car.glb"];

  function tryLoadGLB(paths, index = 0) {
    if (index >= paths.length) {
      console.warn("[drift-animation] car.glb not found — animation runs without car model.");
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
        carGroup.position.sub(centre);
        carGroup.scale.setScalar(4.8 / Math.max(size.x, size.y, size.z));
        carGroup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });
        scene.add(carGroup);
        console.log("[drift-animation] Loaded:", paths[index]);
      },
      undefined,
      () => tryLoadGLB(paths, index + 1)
    );
  }
  tryLoadGLB(GLB_PATHS);

  // ── Smoke particles ───────────────────────────────────────
  const smokes = [];
  function spawnSmoke(x, z) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + Math.random() * 0.09, 5, 5),
      new THREE.MeshBasicMaterial({
        color: 0xcccccc, transparent: true, depthWrite: false, opacity: 0.18,
      })
    );
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.3,
      0.1 + Math.random() * 0.1,
      z + (Math.random() - 0.5) * 0.3
    );
    mesh.userData = {
      life: 1,
      vx: (Math.random() - 0.5) * 0.018,
      vy: 0.012 + Math.random() * 0.012,
    };
    scene.add(mesh);
    smokes.push(mesh);
  }

  // ── Drift path ────────────────────────────────────────────
  const PATH_RX = 8.5;   // horizontal radius — wide enough to orbit the full text block
  const PATH_RZ = 4.0;   // depth radius — deeper ellipse gives better drift angle
  const PATH_Y  = 0.0;   // height — centred on text block mid-point
  const SPEED   = 0.009; // slightly slower at larger radius — feels natural

  let t     = 0;
  let frame = 0;
  let rafId = null;

  // How "deep" into the front arc the car currently is (0 = side, 1 = fully front).
  // Used to smoothly fade opacity rather than hard-switch z-index.
  // z = positive = coming toward camera.
  // We fade opacity DOWN as car approaches front (z>0) so it gracefully
  // dips behind/through the text without any snap.
  const FADE_START_Z = 1.2; // larger orbit means car gets closer before fading
  const FADE_END_Z   = 3.5; // wider fade zone for smoother transition
  const FADE_MIN_OP  = 0.18; // ghostly as it passes behind text

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animate() {
    rafId = requestAnimationFrame(animate);
    frame++;
    t += SPEED;

    const x  = Math.cos(t) * PATH_RX;
    const z  = Math.sin(t) * PATH_RZ;
    const nx = Math.cos(t + 0.04) * PATH_RX;
    const nz = Math.sin(t + 0.04) * PATH_RZ;

    const travelAngle = Math.atan2(nx - x, nz - z);
    const driftAngle  = Math.cos(t) * 0.38; // max ~22° body slip

    if (carGroup) {
      carGroup.position.set(x, PATH_Y, z);
      carGroup.rotation.y = travelAngle + driftAngle;

      // ── Smooth opacity fade when car enters the "front" arc ──────────
      // z > 0  means car is between camera and text centre (passing "in front")
      // We fade it to FADE_MIN_OP so it looks like it passes behind/through
      // the text without any hard z-index snap or glitch.
      let targetOpacity = 1;
      if (z > FADE_START_Z) {
        const t01 = Math.min((z - FADE_START_Z) / (FADE_END_Z - FADE_START_Z), 1);
        targetOpacity = 1 - t01 * (1 - FADE_MIN_OP);
      }

      carGroup.traverse((child) => {
        if (child.isMesh && child.material) {
          // Handle both single material and material arrays
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            mat.transparent = true;
            // Lerp current opacity toward target for smoothness
            mat.opacity = mat.opacity !== undefined
              ? mat.opacity + (targetOpacity - mat.opacity) * 0.18
              : targetOpacity;
          });
        }
      });
    }

    accentLight.position.set(x, 2 + PATH_Y, z);

    // Spawn smoke from rear of car every 3 frames
    if (frame % 3 === 0) {
      const rearX = x - Math.sin(travelAngle) * 1.2;
      const rearZ = z - Math.cos(travelAngle) * 1.2;
      spawnSmoke(rearX, rearZ);
    }

    // Tick + cull smoke particles
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
  function stopLoop()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  if (prefersReduced.matches) {
    renderer.render(scene, camera);
  } else {
    startLoop();
  }
  prefersReduced.addEventListener?.("change", e => e.matches ? stopLoop() : startLoop());

  // ── Resize ────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });
  ro.observe(heroEl);

  return function destroy() {
    stopLoop();
    ro.disconnect();
    renderer.dispose();
    canvas.remove();
  };
}