'use client';

import { useEffect, useRef } from 'react';

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined') return;

    let renderer, scene, camera, hGroup, backPlane, wireBox, particles, innerParticles, dust;
    let animationId;
    const mount = mountRef.current;

    async function init() {
      const THREE = await import('three');
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 8);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      mount.appendChild(renderer.domElement);

      const ambient = new THREE.AmbientLight(0x223322, 0.3);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0x00c805, 0.6);
      dirLight.position.set(2, 3, 4);
      scene.add(dirLight);
      const dirLight2 = new THREE.DirectionalLight(0x00d4aa, 0.3);
      dirLight2.position.set(-2, -1, 3);
      scene.add(dirLight2);

      hGroup = new THREE.Group();

      const logoTexture = new THREE.TextureLoader().load('/assets/logo-hybrid.png');
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      const logoMat = new THREE.MeshBasicMaterial({
        map: logoTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), logoMat);
      hGroup.add(logoPlane);

      backPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.0, 4.0),
        new THREE.MeshBasicMaterial({ color: 0x00c805, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
      );
      backPlane.position.z = -0.15;
      hGroup.add(backPlane);

      wireBox = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 3.6, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x00c805, wireframe: true, transparent: true, opacity: 0.06 })
      );
      hGroup.add(wireBox);

      // orbiting particles
      const particleCount = 400;
      const particleGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(particleCount * 3);
      const offsets = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2.0 + Math.random() * 2.5;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        offsets[i] = Math.random() * Math.PI * 2;
        speeds[i] = 0.1 + Math.random() * 0.2;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      particles = new THREE.Points(
        particleGeo,
        new THREE.PointsMaterial({
          color: 0x00c805,
          size: 0.04,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        })
      );
      scene.add(particles);

      // inner particles
      const innerCount = 200;
      const innerGeo = new THREE.BufferGeometry();
      const iPos = new Float32Array(innerCount * 3);
      for (let i = 0; i < innerCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = 0.8 + Math.random() * 1.2;
        iPos[i * 3] = r * Math.cos(theta);
        iPos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
        iPos[i * 3 + 2] = r * Math.sin(theta);
      }
      innerGeo.setAttribute('position', new THREE.BufferAttribute(iPos, 3));
      innerParticles = new THREE.Points(
        innerGeo,
        new THREE.PointsMaterial({
          color: 0x00d4aa,
          size: 0.025,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        })
      );
      scene.add(innerParticles);

      // floating dust
      const dustCount = 800;
      const dustGeo = new THREE.BufferGeometry();
      const dPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dPos[i * 3] = (Math.random() - 0.5) * 20;
        dPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
        dPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          color: 0x00c805,
          size: 0.015,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        })
      );
      scene.add(dust);

      scene.add(hGroup);

      let mouseX = 0;
      let mouseY = 0;
      const onMouseMove = (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouseMove);

      const clock = new THREE.Clock();
      function animate() {
        const t = clock.getElapsedTime();

        hGroup.rotation.x = Math.sin(t * 0.15) * 0.1 + mouseY * 0.05;
        hGroup.rotation.y = t * 0.2 + mouseX * 0.1;
        hGroup.position.y = Math.sin(t * 0.3) * 0.1;

        const pulse = 1 + Math.sin(t * 0.5) * 0.03;
        backPlane.scale.set(pulse, pulse, 1);
        wireBox.material.opacity = 0.05 + Math.sin(t * 0.5) * 0.02;

        const p = particles.geometry.attributes.position;
        const arr = p.array;
        for (let i = 0; i < particleCount; i++) {
          const theta = offsets[i] + t * speeds[i];
          const sy = 2 * Math.sin(i * 0.1 + t * 0.05) - 1;
          const phi = Math.acos(Math.max(-1, Math.min(1, sy)));
          const r = 2.0 + ((i % 25) / 25) * 2.5;
          arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          arr[i * 3 + 1] = r * Math.cos(phi);
          arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        p.needsUpdate = true;

        innerParticles.rotation.y = t * 0.15;

        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      }
      animate();

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
      };
    }

    let cleanup;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (cleanup) cleanup();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div id="three-canvas" ref={mountRef} />;
}
