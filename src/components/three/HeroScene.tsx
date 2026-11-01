import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      arr[i*3] = (Math.random()-0.5)*8;
      arr[i*3+1] = (Math.random()-0.5)*8;
      arr[i*3+2] = (Math.random()-0.5)*8;
    }
    return arr;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#00B8FF" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) { ref.current.rotation.x += delta*0.3; ref.current.rotation.y += delta*0.4; }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial color="#1677FF" wireframe emissive="#00B8FF" emissiveIntensity={0.6} />
      </mesh>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <Canvas camera={{ position: [0,0,5], fov: 60 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[5,5,5]} intensity={1.2} color="#00B8FF" />
      <pointLight position={[-5,-5,-5]} intensity={0.8} color="#1677FF" />
      <Core />
      <Particles />
      <Stars radius={50} depth={50} count={1500} factor={3} saturation={0} fade speed={0.5} />
    </Canvas>
  );
}