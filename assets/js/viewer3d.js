// 3D WebGL Cryo-EM Density Viewer using Three.js
// Designed to load assets/models/density.gltf dynamically on the homepage

(function () {
  const container = document.getElementById('density-3d-canvas');
  const fallbackImg = document.getElementById('fallback-hero-img');
  if (!container || !fallbackImg) return;

  // Paths to CDN libraries
  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const LOADER_CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  const CONTROLS_CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  // Helper to load external scripts sequentially
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize WebGL Scene
  async function init3D() {
    try {
      // Load Three.js first, then loader and controls
      await loadScript(THREE_CDN);
      await Promise.all([loadScript(LOADER_CDN), loadScript(CONTROLS_CDN)]);
      
      const width = container.clientWidth;
      const height = container.clientHeight || 460;

      // 1. Scene & Renderer
      const scene = new THREE.Scene();
      // Transparent background so it blends with the parent container style
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Enable soft shadows
      container.appendChild(renderer.domElement);

      // 2. Orthographic Camera (Parallel projection preferred in structural biology)
      const aspect = width / height;
      const viewSize = 6.0; // View boundary scale to fit our normalized model (size 4.5)
      const camera = new THREE.OrthographicCamera(
        -viewSize * aspect / 2,
         viewSize * aspect / 2,
         viewSize / 2,
        -viewSize / 2,
         0.1,
         1000
      );
      camera.position.set(0, 0, 10);

      // 3. Orbit Controls (Interactive Drag, Zoom, Pan)
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.autoRotate = false; // We will auto-rotate manually unless user interacts

      // 4. Lights (High-definition soft self-shadowing setup)
      // Soft, neutral ambient fill
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Camera Headlight for direct front fill (prevents details from going pitch black)
      const headlight = new THREE.DirectionalLight(0xffffff, 0.45);
      headlight.position.set(0, 0, 1);
      camera.add(headlight);
      scene.add(camera);

      // Strong top-right-front light that casts high-res soft self-shadows
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
      dirLight.position.set(4, 6, 5);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 20;
      
      // Tight shadow bounds to keep shadow map sharp over the model
      const d = 3.5;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.001; // Avoid shadow acne artifacts
      scene.add(dirLight);

      // 5. Load GLTF Density Mesh
      const loader = new THREE.GLTFLoader();
      const modelPath = 'assets/models/ank1_colored.glb';

      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Compute bounding box to center and scale the model automatically
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Center the geometry
          model.position.x += (model.position.x - center.x);
          model.position.y += (model.position.y - center.y);
          model.position.z += (model.position.z - center.z);

          // Normalize scale to fit nicely in view
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4.5 / maxDim;
          model.scale.set(scale, scale, scale);

          // Apply a premium, solid, matte material using the model's baked vertex colors
          const densityMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,     // Use the baked colors from ChimeraX!
            roughness: 0.6,         // Soft diffuse shadows
            metalness: 0.02,        // Non-metallic clay look
            transparent: false,     // Fully opaque
            side: THREE.DoubleSide,
            flatShading: false      // Keep it smooth
          });

          model.traverse((child) => {
            if (child.isMesh) {
              child.material = densityMaterial;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(model);

          // Success! Hide fallback image
          fallbackImg.style.display = 'none';

          // Animation Loop
          let isInteracting = false;
          controls.addEventListener('start', () => { isInteracting = true; });
          controls.addEventListener('end', () => { isInteracting = false; });

          function animate() {
            requestAnimationFrame(animate);
            
            // Slowly auto-rotate only when user is not dragging
            if (model && !isInteracting) {
              model.rotation.y += 0.003;
              model.rotation.x += 0.001;
            }

            controls.update();
            renderer.render(scene, camera);
          }
          animate();
        },
        (xhr) => {
          // Progress logging if needed
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          // Error loading model (e.g. file not created yet). Fallback image remains visible.
          console.warn('3D model load failed or not present. Showing fallback image.', error);
        }
      );

      // Handle Resize (Responsive bounds for Orthographic Camera)
      window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight || 460;
        const asp = w / h;
        camera.left = -viewSize * asp / 2;
        camera.right = viewSize * asp / 2;
        camera.top = viewSize / 2;
        camera.bottom = -viewSize / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });

    } catch (err) {
      console.error('WebGL Initialization failed:', err);
    }
  }

  // Start initialization
  init3D();
})();
