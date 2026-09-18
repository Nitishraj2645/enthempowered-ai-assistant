import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Eye, Heart, Camera, Zap, Volume2, Smile } from 'lucide-react';
import realAvatarImg from '../assets/images/rishu_avatar_3d_real_1785871945756.jpg';
import happyAvatarImg from '../assets/images/rishu_avatar_happy_1785871956398.jpg';
import sassyAvatarImg from '../assets/images/rishu_avatar_sassy_1785871967499.jpg';

export type EmotionType = 'neutral' | 'crying' | 'laughing' | 'happy' | 'sad' | 'angry' | 'sassy';

interface Rishu3DAvatarProps {
  state: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
  isListening: boolean;
  emotion: EmotionType;
  getSpeakingVolume?: () => number;
  getListeningVolume?: () => number;
  cameraActive?: boolean;
}

export function Rishu3DAvatar({
  state,
  isSpeaking,
  isListening,
  emotion = 'neutral',
  getSpeakingVolume,
  getListeningVolume,
  cameraActive = false,
}: Rishu3DAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeAvatarMode, setActiveAvatarMode] = useState<'3d-hybrid' | '3d-mesh'>('3d-hybrid');
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const [isWinking, setIsWinking] = useState(false);
  const [blushLevel, setBlushLevel] = useState(0.2);

  // Mouse / Pointer coordinates for eye and head tracking
  const targetLookAt = useRef({ x: 0, y: 0 });
  const currentLookAt = useRef({ x: 0, y: 0 });

  // Handle pointer movement for realistic gaze tracking
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetLookAt.current = {
        x: (e.clientX / innerWidth - 0.5) * 2,
        y: -(e.clientY / innerHeight - 0.5) * 2,
      };
    };

    window.addEventListener('mousemove', handlePointerMove);
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  // Three.js 3D Mesh Engine for '3d-mesh' view and dynamic volumetric light canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.1, 3.8);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0f5, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffe4e1, 2.2);
    mainLight.position.set(2, 3, 4);
    scene.add(mainLight);

    const rimLightPink = new THREE.DirectionalLight(0xff1493, 2.5);
    rimLightPink.position.set(-3, 2, -2);
    scene.add(rimLightPink);

    const rimLightCyan = new THREE.DirectionalLight(0x00ffff, 2.0);
    rimLightCyan.position.set(3, -1, -2);
    scene.add(rimLightCyan);

    // Avatar Root Group
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Sculpted 3D Head
    const headGeo = new THREE.SphereGeometry(0.78, 48, 48);
    headGeo.scale(1, 1.2, 0.95);
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbd0b8,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffb6c1),
    });
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.05;
    avatarGroup.add(headMesh);

    // Cheeks for blushing
    const cheekGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const cheekMat = new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.35,
    });
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.38, -0.05, 0.65);
    leftCheek.scale.set(1.2, 0.6, 0.3);
    headMesh.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.38, -0.05, 0.65);
    rightCheek.scale.set(1.2, 0.6, 0.3);
    headMesh.add(rightCheek);

    // 3D Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
    });

    const irisGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 32);
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314, // Warm Hazel Brown
      roughness: 0.2,
      metalness: 0.4,
    });

    const pupilGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.025, 32);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0505 });

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 0.16, 0.68);
    const leftIris = new THREE.Mesh(irisGeo, irisMat);
    leftIris.rotation.x = Math.PI / 2;
    leftIris.position.z = 0.11;
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.rotation.x = Math.PI / 2;
    leftPupil.position.z = 0.12;
    leftEye.add(leftIris);
    leftEye.add(leftPupil);
    headMesh.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 0.16, 0.68);
    const rightIris = new THREE.Mesh(irisGeo, irisMat);
    rightIris.rotation.x = Math.PI / 2;
    rightIris.position.z = 0.11;
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.rotation.x = Math.PI / 2;
    rightPupil.position.z = 0.12;
    rightEye.add(rightIris);
    rightEye.add(rightPupil);
    headMesh.add(rightEye);

    // Eyelids for Blinking
    const eyelidGeo = new THREE.SphereGeometry(0.128, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const eyelidMat = new THREE.MeshStandardMaterial({
      color: 0xf5be9e,
      roughness: 0.4,
    });
    const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    leftEyelid.position.set(-0.25, 0.16, 0.68);
    leftEyelid.rotation.x = -Math.PI / 2.2;
    headMesh.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    rightEyelid.position.set(0.25, 0.16, 0.68);
    rightEyelid.rotation.x = -Math.PI / 2.2;
    headMesh.add(rightEyelid);

    // 3D Eyebrows
    const browGeo = new THREE.BoxGeometry(0.22, 0.03, 0.04);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x24140e, roughness: 0.8 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.26, 0.33, 0.74);
    leftBrow.rotation.z = 0.08;
    headMesh.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.26, 0.33, 0.74);
    rightBrow.rotation.z = -0.08;
    headMesh.add(rightBrow);

    // 3D Nose Bridge & Tip
    const noseGeo = new THREE.ConeGeometry(0.08, 0.22, 16);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xf7c4aa, roughness: 0.35 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, 0.02, 0.84);
    noseMesh.rotation.x = 0.25;
    headMesh.add(noseMesh);

    // 3D Lips & Animated Mouth
    const lipUpperGeo = new THREE.TorusGeometry(0.12, 0.032, 16, 32, Math.PI);
    const lipLowerGeo = new THREE.TorusGeometry(0.13, 0.038, 16, 32, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xd64562, // Rosy Gloss Lip
      roughness: 0.2,
      metalness: 0.1,
    });
    const upperLip = new THREE.Mesh(lipUpperGeo, lipMat);
    upperLip.rotation.z = Math.PI;
    upperLip.position.set(0, -0.23, 0.76);
    headMesh.add(upperLip);

    const lowerLip = new THREE.Mesh(lipLowerGeo, lipMat);
    lowerLip.position.set(0, -0.27, 0.75);
    headMesh.add(lowerLip);

    // Inner mouth cavity
    const mouthCavityGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x3d0c15 });
    const mouthCavity = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
    mouthCavity.position.set(0, -0.25, 0.71);
    mouthCavity.scale.set(1.2, 0.1, 0.5);
    headMesh.add(mouthCavity);

    // 3D Hair Strands / Volume
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f120c, // Rich Espresso Dark Brown
      roughness: 0.5,
      metalness: 0.15,
    });

    const hairBackGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.08, -0.15);
    hairBack.scale.set(1.05, 1.25, 1.15);
    headMesh.add(hairBack);

    // Hair Side Curls
    const curlGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 16);
    const leftHairCurl = new THREE.Mesh(curlGeo, hairMat);
    leftHairCurl.position.set(-0.62, -0.2, 0.2);
    leftHairCurl.rotation.z = 0.18;
    headMesh.add(leftHairCurl);

    const rightHairCurl = new THREE.Mesh(curlGeo, hairMat);
    rightHairCurl.position.set(0.62, -0.2, 0.2);
    rightHairCurl.rotation.z = -0.18;
    headMesh.add(rightHairCurl);

    // Floating Particles for magical AI atmosphere
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 5;
      particlePos[i + 1] = (Math.random() - 0.5) * 4;
      particlePos[i + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xff69b4,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    let animationFrameId: number;
    let clock = new THREE.Clock();
    let blinkTimer = 0;
    let nextBlinkInterval = 3.5;
    let isBlinking = false;
    let blinkProgress = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth lookAt interpolation
      currentLookAt.current.x += (targetLookAt.current.x - currentLookAt.current.x) * 0.08;
      currentLookAt.current.y += (targetLookAt.current.y - currentLookAt.current.y) * 0.08;

      // Natural breathing and head sway
      const breathing = Math.sin(elapsedTime * 1.8) * 0.02;
      const headNod = isSpeaking ? Math.sin(elapsedTime * 9) * 0.04 : Math.sin(elapsedTime * 0.9) * 0.015;
      const headTilt = isListening ? 0.08 : (emotion === 'sassy' ? 0.09 : 0);

      avatarGroup.position.y = breathing;
      avatarGroup.rotation.y = currentLookAt.current.x * 0.28 + (emotion === 'sassy' ? 0.05 : 0);
      avatarGroup.rotation.x = -currentLookAt.current.y * 0.18 + headNod;
      avatarGroup.rotation.z = headTilt + (currentLookAt.current.x * -0.05);

      // Eye Gaze tracking
      const eyeLookX = currentLookAt.current.x * 0.12;
      const eyeLookY = currentLookAt.current.y * 0.12;
      leftEye.rotation.y = eyeLookX;
      leftEye.rotation.x = -eyeLookY;
      rightEye.rotation.y = eyeLookX;
      rightEye.rotation.x = -eyeLookY;

      // Blinking Logic
      blinkTimer += delta;
      if (blinkTimer > nextBlinkInterval) {
        isBlinking = true;
        blinkTimer = 0;
        nextBlinkInterval = 2.5 + Math.random() * 4.0;
        blinkProgress = 0;
      }

      if (isBlinking) {
        blinkProgress += delta * 12;
        const blinkAmount = Math.sin(Math.min(Math.PI, blinkProgress));
        leftEyelid.rotation.x = -Math.PI / 2.2 + blinkAmount * 0.9;
        rightEyelid.rotation.x = -Math.PI / 2.2 + blinkAmount * 0.9;
        if (blinkProgress >= Math.PI) {
          isBlinking = false;
          leftEyelid.rotation.x = -Math.PI / 2.2;
          rightEyelid.rotation.x = -Math.PI / 2.2;
        }
      }

      // Real-time Audio Lip Sync
      let speechVolume = 0;
      if (isSpeaking && getSpeakingVolume) {
        speechVolume = getSpeakingVolume();
      } else if (isSpeaking) {
        // Dynamic procedural speech pattern fallback
        speechVolume = (Math.sin(elapsedTime * 14) * 0.5 + 0.5) * (Math.cos(elapsedTime * 7) * 0.4 + 0.6);
      }

      // Calculate mouth opening
      const targetMouthOpen = Math.min(1.0, speechVolume * 1.5);
      setMouthOpenAmount((prev) => prev + (targetMouthOpen - prev) * 0.35);

      lowerLip.position.y = -0.27 - targetMouthOpen * 0.12;
      mouthCavity.scale.y = 0.1 + targetMouthOpen * 0.9;
      mouthCavity.scale.x = 1.2 + targetMouthOpen * 0.3;

      // Emotion Expression Morphing
      if (emotion === 'happy') {
        leftBrow.position.y = 0.34;
        rightBrow.position.y = 0.34;
        upperLip.position.y = -0.21;
        cheekMat.opacity = 0.6;
      } else if (emotion === 'sassy') {
        leftBrow.position.y = 0.37;
        rightBrow.position.y = 0.31;
        cheekMat.opacity = 0.4;
      } else if (emotion === 'crying') {
        leftBrow.rotation.z = -0.15;
        rightBrow.rotation.z = 0.15;
        lowerLip.position.y = -0.29 + Math.sin(elapsedTime * 20) * 0.02;
        cheekMat.opacity = 0.7;
      } else {
        leftBrow.position.y = 0.33;
        rightBrow.position.y = 0.33;
        leftBrow.rotation.z = 0.08;
        rightBrow.rotation.z = -0.08;
        cheekMat.opacity = 0.3;
      }

      // Subtle particle float
      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvas) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      headGeo.dispose();
      skinMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isSpeaking, isListening, emotion, getSpeakingVolume]);

  // Determine current high-res realistic portrait texture for Neural Hybrid mode
  const currentPortrait = emotion === 'happy' || emotion === 'laughing'
    ? happyAvatarImg
    : emotion === 'sassy'
    ? sassyAvatarImg
    : realAvatarImg;

  return (
    <div 
      ref={containerRef}
      className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 rounded-[3rem] p-1 bg-gradient-to-b from-pink-500/20 via-purple-500/10 to-cyan-500/20 backdrop-blur-2xl shadow-[0_0_60px_rgba(236,72,153,0.35)] border border-pink-400/30 flex items-center justify-center overflow-hidden z-20 group select-none"
    >
      {/* Dynamic Ambient Glow Canvas in Background */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${
          activeAvatarMode === '3d-mesh' ? 'opacity-100 z-30' : 'opacity-25 z-0'
        }`}
      />

      {/* Photorealistic 3D Neural Hybrid Character Layer */}
      {activeAvatarMode === '3d-hybrid' && (
        <motion.div
          animate={{
            y: isSpeaking ? [0, -3, 0] : [0, 3, 0],
            scale: isSpeaking ? [1, 1.02, 1] : isListening ? 1.015 : 1,
            rotate: emotion === 'sassy' ? [0, 1.2, 0] : isListening ? [0, -0.8, 0] : [0, 0.4, 0],
          }}
          transition={{
            duration: isSpeaking ? 0.35 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 z-10 w-full h-full origin-bottom flex items-center justify-center pointer-events-none"
        >
          {/* Base Real Girl Portrait */}
          <motion.img
            key={currentPortrait}
            initial={{ opacity: 0.85, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            src={currentPortrait}
            alt="Rishu 3D Avatar"
            className="w-full h-full object-cover rounded-[2.9rem] filter contrast-[1.05] brightness-[1.02]"
          />

          {/* Eye Blinking & Micro-Expression Shading */}
          <motion.div
            animate={{ opacity: [0, 0.85, 0, 0, 0] }}
            transition={{
              duration: 4.2,
              repeat: Infinity,
              times: [0, 0.04, 0.08, 0.5, 1],
              ease: 'easeInOut',
            }}
            className="absolute top-[39.5%] left-[50%] -translate-x-[50%] w-[54%] h-[6.5%] bg-black/40 mix-blend-multiply rounded-[100%] blur-[2px]"
          />

          {/* Realistic Real-Time Mouth Viseme & Lip Deformation Layer */}
          <div className="absolute top-[61.5%] left-[50%] -translate-x-[50%] flex items-center justify-center z-20">
            {state === 'disconnected' ? (
              <div className="w-6 h-[2.5px] bg-[#4a1c24]/90 rounded-full shadow-sm" />
            ) : isSpeaking ? (
              <motion.div
                animate={{
                  height: [3, Math.max(8, mouthOpenAmount * 22), 4, Math.max(6, mouthOpenAmount * 18), 3],
                  width: [12, Math.max(14, mouthOpenAmount * 24), 16, Math.max(12, mouthOpenAmount * 20), 12],
                  borderRadius: ['8px', '14px', '8px', '12px', '8px'],
                }}
                transition={{
                  duration: 0.22,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="bg-[#2d0910] border border-[#ff4d79]/40 flex items-center justify-center overflow-hidden shadow-[inset_0_3px_8px_rgba(0,0,0,0.8)]"
              >
                {/* Upper Teeth Shine */}
                <div className="w-[85%] h-[35%] bg-white/90 rounded-b-md translate-y-[-2px]" />
                {/* Tongue Rosy Gradient */}
                <div className="w-[60%] h-[40%] bg-gradient-to-t from-[#ff4066] to-[#e62e54] rounded-t-full translate-y-[2px]" />
              </motion.div>
            ) : isListening ? (
              <motion.div
                animate={{ scaleX: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-7 h-[3px] bg-[#5a202c]/90 rounded-full shadow-sm"
              />
            ) : (
              <div className="w-5 h-[2.5px] bg-[#5a202c]/80 rounded-full" />
            )}
          </div>

          {/* Emotion Particles (Blush, Tears, Sparkles) */}
          {emotion === 'crying' && (
            <div className="absolute inset-0 pointer-events-none flex justify-center">
              {/* Left Tear */}
              <motion.div
                animate={{ y: [0, 45, 90], opacity: [0, 1, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeIn' }}
                className="absolute top-[44%] left-[34%] w-1.5 h-3.5 bg-cyan-300/80 rounded-full blur-[0.5px] shadow-[0_0_8px_cyan]"
              />
              {/* Right Tear */}
              <motion.div
                animate={{ y: [0, 40, 85], opacity: [0, 1, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.5, ease: 'easeIn' }}
                className="absolute top-[44%] right-[34%] w-1.5 h-3 bg-cyan-300/80 rounded-full blur-[0.5px] shadow-[0_0_8px_cyan]"
              />
            </div>
          )}

          {emotion === 'happy' && (
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-[49%] left-[50%] -translate-x-[50%] w-[68%] flex justify-between px-3"
            >
              <div className="w-6 h-3 bg-pink-500/30 rounded-full blur-[5px]" />
              <div className="w-6 h-3 bg-pink-500/30 rounded-full blur-[5px]" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Floating HUD Badges & Vision Status Overlays */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
        <div className={`w-2 h-2 rounded-full ${
          state === 'connected' ? 'bg-pink-500 animate-pulse glow-pink' : 'bg-white/30'
        }`} />
        <span className="text-[10px] font-mono tracking-wider uppercase font-semibold text-white/80">
          {state === 'connected' ? (isSpeaking ? 'Rishu Speaking' : isListening ? 'Listening' : 'Observing') : 'Offline'}
        </span>
      </div>

      {/* Camera Vision Indicator */}
      {cameraActive && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Eye className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-cyan-300 tracking-widest uppercase">
            Vision Active
          </span>
        </div>
      )}

      {/* Switch 3D Avatar Render Mode Button */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1 bg-black/75 backdrop-blur-xl px-2 py-1 rounded-full border border-white/15 shadow-2xl">
        <button
          onClick={() => setActiveAvatarMode('3d-hybrid')}
          className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase font-bold transition-all ${
            activeAvatarMode === '3d-hybrid'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Cinematic 3D
        </button>
        <button
          onClick={() => setActiveAvatarMode('3d-mesh')}
          className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase font-bold transition-all ${
            activeAvatarMode === '3d-mesh'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Interactive WebGL
        </button>
      </div>

      {/* Emotion Aura Glow effect */}
      <motion.div
        animate={{
          boxShadow: emotion === 'happy'
            ? '0 0 50px rgba(236,72,153,0.5)'
            : emotion === 'crying'
            ? '0 0 50px rgba(56,189,248,0.5)'
            : emotion === 'sassy'
            ? '0 0 50px rgba(168,85,247,0.5)'
            : '0 0 35px rgba(236,72,153,0.3)',
        }}
        transition={{ duration: 1 }}
        className="absolute inset-0 rounded-[3rem] pointer-events-none"
      />
    </div>
  );
}
