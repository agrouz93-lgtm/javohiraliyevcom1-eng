import * as THREE from 'three';
import type { PropKind, PropKind as K } from '@/types';

export interface PropModelProps {
  kind: K;
  color?: string;
  night?: boolean;
  /** tashqi teksturalar (HouseScene dan uzatiladi) */
  tex?: { brick?: THREE.Texture; concrete?: THREE.Texture; grass?: THREE.Texture };
}

/**
 * Do'kondan sotib olinadigan tayyor buyumlarning 3D modeli:
 * yer, devor, tom, chiroq, mebel (divan, stol, karavot, shkaf, stul, quti).
 */
export function PropModel({ kind, color, night = false, tex }: PropModelProps) {
  switch (kind as PropKind) {
    case 'land': {
      const c = color || '#3E7C4F';
      const isGrass = c === '#3E7C4F';
      return (
        <group>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[8, 0.1, 8]} />
            <meshStandardMaterial map={isGrass ? tex?.grass : undefined} color={c} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[8.1, 0.03, 8.1]} />
            <meshStandardMaterial color={night ? '#1E3326' : '#2F5E3C'} roughness={1} />
          </mesh>
        </group>
      );
    }

    case 'wall': {
      const c = color || '#B4653F';
      const isBrick = tex?.brick && c === '#B4653F';
      return (
        <group>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[4, 3, 0.3]} />
            <meshStandardMaterial map={isBrick ? tex!.brick : undefined} color={c} roughness={0.85} />
          </mesh>
          {/* ustunlar */}
          <mesh position={[-2.05, 1.5, 0]}>
            <boxGeometry args={[0.18, 3, 0.42]} />
            <meshStandardMaterial color="#9AA3AD" roughness={0.8} />
          </mesh>
          <mesh position={[2.05, 1.5, 0]}>
            <boxGeometry args={[0.18, 3, 0.42]} />
            <meshStandardMaterial color="#9AA3AD" roughness={0.8} />
          </mesh>
        </group>
      );
    }

    case 'roof': {
      const c = color || '#B03A4B';
      return (
        <group>
          <mesh position={[0, 3.6, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[3.4, 2.2, 4, 1]} />
            <meshStandardMaterial color={c} roughness={0.55} metalness={0.25} />
          </mesh>
          {/* qo'llab-quvvatlovchi 4 ta ustun */}
          {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([px, pz]) => (
            <mesh key={`${px}:${pz}`} position={[px, 1.5, pz]}>
              <boxGeometry args={[0.24, 3, 0.24]} />
              <meshStandardMaterial color="#7C7166" roughness={0.9} />
            </mesh>
          ))}
          {/* pol */}
          <mesh position={[0, 3.05, 0]}>
            <boxGeometry args={[4.6, 0.16, 4.6]} />
            <meshStandardMaterial color="#8A94A3" roughness={0.9} />
          </mesh>
        </group>
      );
    }

    case 'lamp': {
      const c = color || '#3F4A5A';
      const on = night;
      return (
        <group>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.08, 0.13, 2.8, 10]} />
            <meshStandardMaterial color={c} roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 2.95, 0]}>
            <sphereGeometry args={[0.32, 14, 14]} />
            <meshStandardMaterial
              color={on ? '#FFE9A8' : '#DCE6F2'}
              emissive={on ? '#FFD54F' : '#000000'}
              emissiveIntensity={on ? 1.6 : 0}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <coneGeometry args={[0.42, 0.3, 12]} />
            <meshStandardMaterial color={c} roughness={0.6} metalness={0.3} />
          </mesh>
          {on && <pointLight position={[0, 2.9, 0]} intensity={18} distance={16} color="#FFD54F" />}
        </group>
      );
    }

    case 'sofa': {
      const c = color || '#3F6B8A';
      return (
        <group>
          {/* o'tirish qismi */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.2, 0.35, 1]} />
            <meshStandardMaterial color={c} roughness={0.95} />
          </mesh>
          {/* orqa */}
          <mesh position={[0, 0.75, -0.42]}>
            <boxGeometry args={[2.2, 0.6, 0.22]} />
            <meshStandardMaterial color={c} roughness={0.95} />
          </mesh>
          {/* qo'llar */}
          <mesh position={[-1.02, 0.6, 0]}>
            <boxGeometry args={[0.2, 0.5, 1]} />
            <meshStandardMaterial color={c} roughness={0.95} />
          </mesh>
          <mesh position={[1.02, 0.6, 0]}>
            <boxGeometry args={[0.2, 0.5, 1]} />
            <meshStandardMaterial color={c} roughness={0.95} />
          </mesh>
          {/* yostiqchalari */}
          <mesh position={[-0.5, 0.62, -0.25]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.55, 0.4, 0.14]} />
            <meshStandardMaterial color="#DCE6F2" roughness={1} />
          </mesh>
          <mesh position={[0.5, 0.62, -0.25]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.55, 0.4, 0.14]} />
            <meshStandardMaterial color="#DCE6F2" roughness={1} />
          </mesh>
          {/* oyoqlari */}
          {[[-0.95, 0.4], [0.95, 0.4], [-0.95, -0.4], [0.95, -0.4]].map(([px, pz]) => (
            <mesh key={`${px}:${pz}`} position={[px, 0.05, pz]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial color="#3A2E26" />
            </mesh>
          ))}
        </group>
      );
    }

    case 'table': {
      const c = color || '#8A6242';
      return (
        <group>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[1.7, 0.08, 0.95]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
          {[[-0.75, 0.4], [0.75, 0.4], [-0.75, -0.4], [0.75, -0.4]].map(([px, pz]) => (
            <mesh key={`${px}:${pz}`} position={[px, 0.36, pz]}>
              <boxGeometry args={[0.09, 0.72, 0.09]} />
              <meshStandardMaterial color={c} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'bed': {
      const c = color || '#6E7E9A';
      return (
        <group>
          {/* karkas */}
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[1.7, 0.3, 2.05]} />
            <meshStandardMaterial color="#4A3A2E" roughness={0.8} />
          </mesh>
          {/* matras */}
          <mesh position={[0, 0.5, 0.05]}>
            <boxGeometry args={[1.6, 0.2, 1.9]} />
            <meshStandardMaterial color={c} roughness={1} />
          </mesh>
          {/* yostiq */}
          <mesh position={[0, 0.66, -0.7]}>
            <boxGeometry args={[1.2, 0.16, 0.4]} />
            <meshStandardMaterial color="#E8EEF7" roughness={1} />
          </mesh>
          {/* boshi */}
          <mesh position={[0, 0.65, -1.05]}>
            <boxGeometry args={[1.75, 0.7, 0.1]} />
            <meshStandardMaterial color="#5C4037" roughness={0.7} />
          </mesh>
        </group>
      );
    }

    case 'wardrobe': {
      const c = color || '#5C4037';
      return (
        <group>
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[1.7, 2.1, 0.6]} />
            <meshStandardMaterial color={c} roughness={0.65} />
          </mesh>
          {/* eshiklar */}
          <mesh position={[-0.42, 1.05, 0.31]}>
            <boxGeometry args={[0.78, 1.95, 0.03]} />
            <meshStandardMaterial color={c} roughness={0.55} />
          </mesh>
          <mesh position={[0.42, 1.05, 0.31]}>
            <boxGeometry args={[0.78, 1.95, 0.03]} />
            <meshStandardMaterial color={c} roughness={0.55} />
          </mesh>
          {/* tutqichlar */}
          <mesh position={[-0.08, 1.05, 0.35]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#C9CFD8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.08, 1.05, 0.35]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#C9CFD8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );
    }

    case 'chair': {
      const c = color || '#A9743F';
      return (
        <group>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.45, 0.06, 0.45]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, -0.2]}>
            <boxGeometry args={[0.42, 0.55, 0.06]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
          {[[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]].map(([px, pz]) => (
            <mesh key={`${px}:${pz}`} position={[px, 0.21, pz]}>
              <boxGeometry args={[0.05, 0.42, 0.05]} />
              <meshStandardMaterial color={c} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'crate':
    default: {
      const c = color || '#8A6242';
      return (
        <group>
          {/* palet */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[1.3, 0.16, 1.3]} />
            <meshStandardMaterial color="#6B4A2B" roughness={0.9} />
          </mesh>
          {/* qutilar */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1, 0.7, 1]} />
            <meshStandardMaterial color={c} roughness={0.85} />
          </mesh>
          <mesh position={[0.15, 1.05, -0.1]}>
            <boxGeometry args={[0.7, 0.45, 0.7]} />
            <meshStandardMaterial color={c} roughness={0.85} />
          </mesh>
          {/* polentasi */}
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[1.04, 0.05, 1.04]} />
            <meshStandardMaterial color="#3A2E26" roughness={1} />
          </mesh>
        </group>
      );
    }
  }
}
