import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

let activeCleanup = null;

export async function initHeroDrift(heroEl, textBlockEl) {
  if (!heroEl) return;
  if (activeCleanup) activeCleanup();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  heroEl.style.position = heroEl.style.position || "relative";

  const canvas = document.createElement("canvas");
  canvas.className = "hero-drift-canvas";
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "1",
  });
  heroEl.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 6, 18);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(8, 14, 10);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x88ccff, 0.45);
  rim.position.set(-10, 5, -8);
  scene.add(rim);

  const loader = new GLTFLoader();
  const modelUrl = new URL("./Assets/car.glb", import.meta.url).href;

  let car = null;
  try {
    const gltf = await loader.loadAsync(modelUrl);
    car = gltf.scene;
    car.scale.setScalar(0.55);
    car.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    scene.add(car);
  } catch (err) {
    console.error("Failed to load car.glb for hero drift", err);
    renderer.dispose();
    canvas.remove();
    return;
  }

  // Depth-only slab so car can pass "behind" title area.
  if (textBlockEl) {
    const slabGeom = new THREE.BoxGeometry(7.8, 4.6, 2.4);
    const slabMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.set(-2.15, 1.7, 0);
    scene.add(slab);
  }

  const resize = () => {
    const rect = heroEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };

  resize();
  let t = 0;
  let raf = 0;

  const animate = () => {
    t += 0.012;

    const rx = 5.3;
    const rz = 2.9;
    const x = Math.cos(t) * rx;
    const z = Math.sin(t) * rz;
    const y = 1.5 + Math.sin(t * 1.5) * 0.22;

    const nx = Math.cos(t + 0.04) * rx;
    const nz = Math.sin(t + 0.04) * rz;

    car.position.set(x, y, z);
    car.lookAt(nx, y, nz);
    car.rotation.z += Math.sin(t * 2.0) * 0.0025;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };

  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(animate);

  activeCleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    canvas.remove();
  };
}
