import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const TimeFlow = () => {
  const containerRef = useRef(null);
  const [stats, setStats] = useState({ total: 0, hell: 0, heaven: 0 });

  // Refs for animation loop management
  const requestRef = useRef();
  const startTimeRef = useRef(Date.now());
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const dropsRef = useRef([]); // Store drops in ref to access inside loop

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Init Functionality ---
    const deathsPerSecond = 1.8;
    let hellCount = 0;
    let heavenCount = 0;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 40);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a0a0a, 0.3);
    scene.add(ambientLight);

    const dimRedLight = new THREE.PointLight(0x330000, 0.5, 15);
    dimRedLight.position.set(-6, 4, 0);
    scene.add(dimRedLight);

    const dimYellowLight = new THREE.PointLight(0x332200, 0.5, 15);
    dimYellowLight.position.set(6, 4, 0);
    scene.add(dimYellowLight);

    // Water
    const waterGeometry = new THREE.PlaneGeometry(25, 12, 40, 40);
    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.95,
      shininess: 20,
      side: THREE.DoubleSide
    });
    const waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = 0;
    scene.add(waterSurface);

    // Walls
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const wallGeometry = new THREE.PlaneGeometry(25, 15);

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-12.5, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(12.5, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Helper functions - properly scoped inside useEffect
    const createRipple = (x, z, side) => {
      const rippleGeometry = new THREE.RingGeometry(0.1, 0.2, 24);
      const rippleMaterial = new THREE.MeshBasicMaterial({
        color: side === -1 ? 0x330000 : 0x333300,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      ripple.position.set(x, 0.02, z);
      ripple.rotation.x = -Math.PI / 2;
      ripple.userData = {
        scale: 0.1,
        opacity: 0.4,
        maxScale: 2
      };
      scene.add(ripple);

      const rippleInterval = setInterval(() => {
        // Check if component is unmounted or ripple removed
        if (!ripple.parent) {
          clearInterval(rippleInterval);
          return;
        }

        ripple.userData.scale += 0.08;
        ripple.userData.opacity -= 0.015;
        ripple.scale.set(ripple.userData.scale, ripple.userData.scale, 1);
        ripple.material.opacity = ripple.userData.opacity;

        if (ripple.userData.opacity <= 0) {
          scene.remove(ripple);
          rippleGeometry.dispose();
          rippleMaterial.dispose();
          clearInterval(rippleInterval);
        }
      }, 30);
    };

    const createDrop = () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (3 + Math.random() * 1.5);
      const z = (Math.random() - 0.5) * 6;

      const dropGeometry = new THREE.SphereGeometry(0.12, 12, 12);
      const dropMaterial = new THREE.MeshPhongMaterial({
        color: side === -1 ? 0x440000 : 0x444400,
        transparent: true,
        opacity: 0.7,
        emissive: side === -1 ? 0x220000 : 0x222200,
        emissiveIntensity: 0.2
      });
      const drop = new THREE.Mesh(dropGeometry, dropMaterial);
      drop.position.set(x, 9, z);
      drop.userData = {
        velocity: 0,
        side: side,
        fallen: false
      };

      scene.add(drop);
      dropsRef.current.push(drop);
    };

    // Intervals
    const dropInterval = setInterval(createDrop, 1000 / deathsPerSecond);

    // Use React state for counters instead of direct DOM
    const counterInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const newTotal = Math.floor(elapsedSeconds * deathsPerSecond);
      setStats(prev => ({
        ...prev,
        total: newTotal,
        hell: hellCount,
        heaven: heavenCount
      }));
    }, 50);

    // Animation Loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      // Update Drops
      for (let i = dropsRef.current.length - 1; i >= 0; i--) {
        const drop = dropsRef.current[i];
        drop.userData.velocity += 0.012;
        drop.position.y -= drop.userData.velocity;

        if (drop.position.y <= 0.15 && !drop.userData.fallen) {
          drop.userData.fallen = true;
          createRipple(drop.position.x, drop.position.z, drop.userData.side);

          if (drop.userData.side === -1) {
            hellCount++;
          } else {
            heavenCount++;
          }
        }

        if (drop.position.y < -0.5) {
          scene.remove(drop);
          drop.geometry.dispose();
          drop.material.dispose();
          dropsRef.current.splice(i, 1);
        }
      }

      // Update Water
      const time = Date.now() * 0.0003;
      const positionAttribute = waterSurface.geometry.attributes.position;
      const vertices = positionAttribute.array;

      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        vertices[i + 2] = Math.sin(x * 0.3 + time) * 0.03 + Math.cos(z * 0.3 + time) * 0.03;
      }
      positionAttribute.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);


    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      clearInterval(dropInterval);
      clearInterval(counterInterval);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      // Dispose Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden rounded-2xl border border-white/10 group font-mono">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">

        {/* Header */}
        <div className="text-center mt-4">
          <h1 className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 leading-relaxed uppercase">
            Mortalidade Global<br />Tempo Real
          </h1>
        </div>

        {/* Total Counter */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-4xl md:text-6xl font-bold text-slate-400 font-mono tracking-widest drop-shadow-lg">
            {stats.total.toLocaleString()}
          </div>
        </div>

        {/* Footer Counters */}
        <div className="flex justify-between items-end mb-8 px-4 md:px-8">
          {/* Hell */}
          <div className="text-center bg-black/80 border border-red-900/30 p-3 rounded-lg min-w-[100px]">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-500 mb-2">INFERNO</h2>
            <div className="text-2xl font-bold font-mono text-slate-400">{stats.hell.toLocaleString()}</div>
            <div className="text-4xl mt-2 opacity-50 grayscale brightness-50">💀</div>
          </div>

          {/* Heaven */}
          <div className="text-center bg-black/80 border border-yellow-900/30 p-3 rounded-lg min-w-[100px]">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-500 mb-2">CÉU</h2>
            <div className="text-2xl font-bold font-mono text-slate-400">{stats.heaven.toLocaleString()}</div>
            <div className="text-4xl mt-2 opacity-50 grayscale brightness-50 hue-rotate-[-50deg] saturate-200">✝️</div>
          </div>
        </div>

        {/* Philosophical Text */}
        <div className="text-center pb-32">
          <p className="text-[9px] md:text-[10px] font-semibold text-slate-700 tracking-[0.2em] uppercase leading-relaxed max-w-md mx-auto">
            Enquanto você lê isso, alguém acabou de morrer.<br />
            O relógio não para.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeFlow;
