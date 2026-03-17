// ===== THREE.JS DRIFT ANIMATION WITH INVISIBLE DEPTH SLAB =====
// Enhances the hero section model-viewer with a Three.js-based drift animation
// including an invisible depth slab for realistic occlusion

(async function initDriftAnimation() {
  // Wait for Three.js to load
  if (!window.THREE) {
    await new Promise(resolve => {
      const checkThree = setInterval(() => {
        if (window.THREE) {
          clearInterval(checkThree);
          resolve();
        }
      }, 100);
    });
  }

  const mv = document.getElementById('driftCar');
  if (!mv) return;

  const THREE = window.THREE;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let driftFrameId = null;
  let driftAngle = 0;
  let threeRenderer = null;
  let threeScene = null;
  let threeCamera = null;
  let carModel = null;

  async function initThreeJsDrift() {
    const container = mv.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(initThreeJsDrift, 500);
      return;
    }

    try {
      // Create Three.js scene
      threeScene = new THREE.Scene();
      threeCamera = new THREE.PerspectiveCamera(40, rect.width / rect.height, 0.1, 1000);
      threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      threeRenderer.setSize(rect.width, rect.height);
      threeRenderer.setClearColor(0x000000, 0);
      threeRenderer.sortObjects = true;

      // Position camera
      threeCamera.position.set(5, 10, 20);
      threeCamera.lookAt(0, 0, 0);

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      threeScene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(10, 20, 10);
      threeScene.add(directionalLight);

      // Load car model
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load('/Assets/car.glb', (gltf) => {
        carModel = gltf.scene;
        carModel.scale.set(1, 1, 1);
        threeScene.add(carModel);
      }).catch((error) => {
        console.log('Three.js car model loading info:', error);
      });

      // Create invisible depth slab with colorWrite: false, depthWrite: true
      // This slab matches the screen bounding box of the .hero-left text element
      const textBlock = document.querySelector('.hero-left');
      if (textBlock) {
        const textRect = textBlock.getBoundingClientRect();
        
        // Convert screen coordinates to world coordinates (approximate NDC space)
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        const slabWidth = (textRect.width / screenWidth) * 2 * rect.width / screenWidth;
        const slabHeight = (textRect.height / screenHeight) * 2 * rect.height / screenHeight;
        const slabDepth = 10;

        const slabGeometry = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
        const slabMaterial = new THREE.MeshStandardMaterial({
          colorWrite: false,
          depthWrite: true,
          transparent: false,
        });
        slabMaterial.visible = true;
        
        const depthSlab = new THREE.Mesh(slabGeometry, slabMaterial);
        depthSlab.position.set(-1, 2, 0);
        depthSlab.renderOrder = 0;
        threeScene.add(depthSlab);
      }

      // Position renderer absolutely over model-viewer
      container.style.position = 'relative';
      threeRenderer.domElement.style.position = 'absolute';
      threeRenderer.domElement.style.top = '0';
      threeRenderer.domElement.style.left = '0';
      threeRenderer.domElement.style.width = '100%';
      threeRenderer.domElement.style.height = '100%';
      threeRenderer.domElement.style.pointerEvents = 'none';
      threeRenderer.domElement.style.zIndex = '1';
      container.appendChild(threeRenderer.domElement);

      // Drift animation loop
      function driftLoop() {
        if (prefersReduced.matches) return;

        driftAngle += 0.011; // Speed

        // Elliptical drift path parameters
        const PATH_RX = 5.6;  // How wide the ellipse is (left/right)
        const PATH_RZ = 3.2;  // How deep the ellipse goes (front/back)
        const DRIFT_AGGRESSION = 0.4; // How aggressive the drift looks
        
        const ellipseX = Math.cos(driftAngle) * PATH_RX;
        const ellipseZ = Math.sin(driftAngle) * PATH_RZ;
        const ellipseY = 1.5 + Math.sin(driftAngle / 2) * 0.3; // Subtle vertical bobbing

        if (carModel) {
          carModel.scale.set(0.5, 0.5, 0.5); // Car size
          carModel.position.set(ellipseX, ellipseY, ellipseZ);
          
          // Orient car to face direction of movement (tangent to ellipse)
          const nextAngle = driftAngle + 0.05;
          const nextX = Math.cos(nextAngle) * PATH_RX;
          const nextZ = Math.sin(nextAngle) * PATH_RZ;
          const direction = new THREE.Vector3(nextX - ellipseX, 0, nextZ - ellipseZ);
          
          if (direction.length() > 0.01) {
            const targetPosition = carModel.position.clone().add(direction);
            carModel.lookAt(targetPosition);
          }
          
          // Drift rotation based on aggression parameter
          carModel.rotation.z = Math.sin(driftAngle * DRIFT_AGGRESSION) * 0.25;
        }

        // Static camera positioned to view centered text with drifting car
        // Camera position: (0, 7, 22) - centered, elevated view
        threeCamera.position.set(0, 7, 22);
        threeCamera.lookAt(0, 0, 0);

        // Render scene
        threeRenderer.render(threeScene, threeCamera);
        driftFrameId = requestAnimationFrame(driftLoop);
      }

      // Event handlers
      function enableDrift() {
        if (driftFrameId) cancelAnimationFrame(driftFrameId);
        if (!prefersReduced.matches) {
          driftFrameId = requestAnimationFrame(driftLoop);
        }
      }

      function disableDrift() {
        if (driftFrameId) {
          cancelAnimationFrame(driftFrameId);
          driftFrameId = null;
        }
      }

      // Start animation on interaction-end
      mv.addEventListener('interaction-end', enableDrift);
      mv.addEventListener('interaction-start', disableDrift);
      mv.addEventListener('pointerdown', disableDrift);
      mv.addEventListener('pointerup', enableDrift);
      
      // Initial start
      if (!prefersReduced.matches) {
        driftFrameId = requestAnimationFrame(driftLoop);
      }

      // Handle window resize
      window.addEventListener('resize', () => {
        const newRect = container.getBoundingClientRect();
        if (newRect.width > 0 && newRect.height > 0) {
          threeCamera.aspect = newRect.width / newRect.height;
          threeCamera.updateProjectionMatrix();
          threeRenderer.setSize(newRect.width, newRect.height);
        }
      });

    } catch (error) {
      console.log('Three.js drift animation initialization info:', error);
    }
  }

  // Initialize when ready
  if (mv.readyState !== undefined) {
    // model-viewer is ready
    initThreeJsDrift();
  } else {
    // Wait for model-viewer to load
    mv.addEventListener('load', initThreeJsDrift);
    setTimeout(initThreeJsDrift, 1000);
  }
})();
