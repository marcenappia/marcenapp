import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeSceneProps {
  factors: Record<string, number>;
}

export const ThreeScene = ({ factors }: ThreeSceneProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(3, 3, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, width);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const { L, A, P, E, X, Y } = factors;
    const material = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.2 });
    const group = new THREE.Group();
    const sideGeo = new THREE.BoxGeometry(E, A, P);
    const topGeo = new THREE.BoxGeometry(L, E, P);
    const positions: [number, number, number][] = [[-L/2+E/2,0,0],[L/2-E/2,0,0],[0,A/2-E/2,0],[0,-A/2+E/2,0]];
    positions.forEach(pos => {
      const isTop = pos[0] === 0;
      const m = new THREE.Mesh(isTop ? topGeo : sideGeo, material);
      m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; group.add(m);
    });
    group.position.set(X, Y, 0);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.ShadowMaterial({opacity:0.4}));
    ground.rotation.x = -Math.PI/2; ground.position.y = -A/2+Y; ground.receiveShadow = true;
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); dirLight.position.set(5,10,5); dirLight.castShadow = true;
    scene.add(group, ground, new THREE.AmbientLight(0xffffff, 0.8), dirLight);

    let animId: number;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(animId); if (mountRef.current) mountRef.current.innerHTML = ""; controls.dispose(); renderer.dispose(); };
  }, [factors]);
  
  return <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border bg-card" ref={mountRef} />;
};
