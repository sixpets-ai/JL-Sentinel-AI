// HolographicAvatar.tsx — SANTI NEXUS v5.0 — THREE.JS 3D
// Nivel cinematográfico: Blade Runner / Ex Machina / Soul Machines
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface HolographicAvatarProps {
  agentId: string; agentColor: string; isSpeaking: boolean; isListening?: boolean; size?: number;
}

const AGENT_CFG: Record<string, { geoType: string; rings: number; pts: number; scale: number }> = {
  SANTI:       { geoType: "icosahedron", rings: 4, pts: 800, scale: 1.0 },
  LORENA:      { geoType: "sphere",      rings: 3, pts: 600, scale: 0.9 },
  JOSEMANUEL:  { geoType: "octahedron",  rings: 4, pts: 700, scale: 1.0 },
  MAXIMILIANO: { geoType: "torus",       rings: 5, pts: 900, scale: 1.1 },
  EMILIANO:    { geoType: "octahedron",  rings: 3, pts: 650, scale: 0.95 },
  KATERINE:    { geoType: "sphere",      rings: 3, pts: 600, scale: 0.88 },
  SANTIAGO:    { geoType: "icosahedron", rings: 4, pts: 750, scale: 1.0 },
};

export default function HolographicAvatar({ agentId, agentColor, isSpeaking, isListening = false, size = 300 }: HolographicAvatarProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speakRef = useRef(isSpeaking);
  const listenRef = useRef(isListening);
  speakRef.current = isSpeaking;
  listenRef.current = isListening;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const cfg = AGENT_CFG[agentId] || AGENT_CFG.SANTI;
    const color = new THREE.Color(agentColor);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);
    scene.add(new THREE.AmbientLight(color, 0.4));
    const keyLight = new THREE.PointLight(color, 3, 12);
    keyLight.position.set(2, 3, 3); scene.add(keyLight);
    scene.add(new THREE.PointLight(0xffffff, 0.6, 10)).position.set(-3, -1, 2);
    const rimLight = new THREE.PointLight(color, 2, 8);
    rimLight.position.set(0, 0, -4); scene.add(rimLight);
    let coreGeo: THREE.BufferGeometry;
    if (cfg.geoType === "icosahedron") coreGeo = new THREE.IcosahedronGeometry(0.9 * cfg.scale, 1);
    else if (cfg.geoType === "octahedron") coreGeo = new THREE.OctahedronGeometry(0.9 * cfg.scale, 0);
    else if (cfg.geoType === "torus") coreGeo = new THREE.TorusGeometry(0.7 * cfg.scale, 0.28, 10, 48);
    else coreGeo = new THREE.SphereGeometry(0.9 * cfg.scale, 48, 48);
    const coreMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const core = new THREE.Mesh(coreGeo, coreMat); scene.add(core);
    const wire = new THREE.Mesh(coreGeo.clone(), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.65 }));
    wire.scale.setScalar(1.03); scene.add(wire);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3(color.r, color.g, color.b) }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec3 vNormal; void main(){ float f=pow(1.0-abs(dot(vNormal,vec3(0,0,1))),2.5); float p=0.75+0.25*sin(uTime*2.5); gl_FragColor=vec4(uColor*f*p,f*0.6); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15 * cfg.scale, 32, 32), glowMat); scene.add(glow);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < cfg.rings; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 - i * 0.06 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + i * 0.5, 0.014, 8, 128), mat);
      ring.rotation.x = Math.PI / 2 + i * 0.45; ring.rotation.y = i * 0.7;
      scene.add(ring); rings.push(ring);
    }
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(cfg.pts * 3);
    for (let i = 0; i < cfg.pts; i++) {
      const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1), r = 1.3+Math.random()*2.8;
      pPos[i*3]=r*Math.sin(ph)*Math.cos(th); pPos[i*3+1]=r*Math.sin(ph)*Math.sin(th); pPos[i*3+2]=r*Math.cos(ph);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color, size: 0.028, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const particles = new THREE.Points(pGeo, pMat); scene.add(particles);
    const scanMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Vector3(color.r, color.g, color.b) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv; void main(){ float s=sin(vUv.y*150.0+uTime*4.0)*0.5+0.5; float e=smoothstep(0.0,0.08,vUv.x)*smoothstep(0.0,0.08,1.0-vUv.x)*smoothstep(0.0,0.08,vUv.y)*smoothstep(0.0,0.08,1.0-vUv.y); gl_FragColor=vec4(uColor,s*e*0.07); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), scanMat);
    scanPlane.position.z = -0.8; scene.add(scanPlane);
    let t = 0, speakPhase = 0, animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate); t += 0.016;
      const speaking = speakRef.current, listening = listenRef.current;
      if (speaking) speakPhase += 0.14;
      core.rotation.y = t*0.35; core.rotation.x = Math.sin(t*0.25)*0.25;
      wire.rotation.y = t*0.35; wire.rotation.x = Math.sin(t*0.25)*0.25;
      const sc = speaking ? 1+Math.abs(Math.sin(speakPhase))*0.2 : 1+Math.sin(t*1.4)*0.03;
      core.scale.setScalar(sc); wire.scale.setScalar(sc*1.03); glow.scale.setScalar(sc);
      rings.forEach((ring,i) => {
        ring.rotation.z += (0.004+i*0.002)*(speaking?2.8:1); ring.rotation.x += 0.001*(i%2?1:-1);
        (ring.material as THREE.MeshBasicMaterial).opacity = speaking ? 0.3+Math.abs(Math.sin(speakPhase+i*1.2))*0.5 : 0.25+Math.sin(t*0.8+i)*0.12;
        if (listening && i===rings.length-1) ring.scale.setScalar(1+Math.abs(Math.sin(t*3.5))*0.18);
      });
      particles.rotation.y += speaking?0.007:0.002; particles.rotation.x += 0.0005;
      pMat.opacity = speaking?0.9:0.6; pMat.size = speaking?0.038:0.022;
      (glowMat.uniforms.uTime as any).value = t; (scanMat.uniforms.uTime as any).value = t;
      keyLight.intensity = speaking ? 2+Math.abs(Math.sin(speakPhase))*3 : 2+Math.sin(t*1.8)*0.4;
      rimLight.intensity = speaking ? 1.5+Math.abs(Math.sin(speakPhase*1.3))*1.5 : 1.2;
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(animId); renderer.dispose(); if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); };
  }, [agentId, agentColor, size]);

  return <div ref={mountRef} style={{ width: size, height: size, display: "block" }} />;
}
