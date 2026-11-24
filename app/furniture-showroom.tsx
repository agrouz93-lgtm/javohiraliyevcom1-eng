"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import { StudioEnvironment } from "./furniture-lighting";
import { PerspectiveCamera, Vector3 } from "three";
import { LoadedFurniture, ModelLoading } from "./furniture-model";
import type { FurnitureProduct } from "./furniture-core.mjs";
import { Walk } from "./walk";
const zones = [
  { name: "Mehmonxona", x: -8, z: -6, categories: ["sofas", "tv", "lighting"] },
  { name: "Ovqatlanish xonasi", x: 0, z: -6, categories: ["dining"] },
  { name: "Yotoqxona", x: 8, z: -6, categories: ["bedroom"] },
  { name: "Oshxona", x: -8, z: 2, categories: ["kitchen"] },
  { name: "Hammom", x: 0, z: 2, categories: ["bathroom"] },
  { name: "Garderob", x: 8, z: 2, categories: ["wardrobe"] },
  { name: "Ofis", x: 0, z: 10, categories: ["office", "decor"] },
];
function Camera({ inside }: { inside: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(inside ? 0 : 24, inside ? 1.65 : 22, inside ? 14 : 28);
    camera.lookAt(0, inside ? 1.65 : 0, 1);
  }, [inside, camera]);
  return null;
}
function SoloCamera({ product }: { product: FurnitureProduct }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    const direction = new Vector3(1, 0.65, 1.3).normalize(),
      right = new Vector3(0, 1, 0).cross(direction).normalize(),
      up = direction.clone().cross(right).normalize();
    const tanV = Math.tan((perspective.fov * Math.PI) / 360),
      tanH = (tanV * size.width) / size.height;
    const dimensions = product.dimensions;
    let distance = 0;
    for (const x of [-dimensions.width / 2, dimensions.width / 2])
      for (const y of [-dimensions.height / 2, dimensions.height / 2])
        for (const z of [-dimensions.depth / 2, dimensions.depth / 2]) {
          const corner = new Vector3(x, y, z),
            depth = corner.dot(direction);
          distance = Math.max(
            distance,
            depth + Math.abs(corner.dot(right)) / tanH,
            depth + Math.abs(corner.dot(up)) / tanV,
          );
        }
    const center = new Vector3(0, dimensions.height / 2, 0);
    camera.position.copy(center).addScaledVector(direction, distance * 1.14);
    camera.lookAt(center);
  }, [camera, size.width, size.height, product]);
  return null;
}
export default function FurnitureShowroom({
  products,
  onSelect,
  selected,
  solo = false,
  color,
}: {
  products: FurnitureProduct[];
  onSelect: (product: FurnitureProduct) => void;
  selected?: string;
  solo?: boolean;
  color?: string;
}) {
  const [inside, setInside] = useState(false),
    [direction, setDirection] = useState("");
  const [readyModels, setReadyModels] = useState<string[]>([]);
  const markReady = (url: string) =>
    setReadyModels((previous) =>
      previous.includes(url) ? previous : [...previous, url],
    );
  const [modelError, setModelError] = useState("");
  const first = products[0];
  const size = solo && first ? Math.max(...Object.values(first.dimensions)) : 1;
  return (
    <div className="furniture-showroom">
      <div
        className="furniture-scene"
        data-models-ready={products.every((product) =>
          readyModels.includes(product.modelUrl),
        )}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{
            position: solo ? [size * 1.8, size * 1.3, size * 2] : [24, 22, 28],
            fov: 42,
            near: 0.05,
            far: 200,
          }}
        >
          <StudioEnvironment />
          <color attach="background" args={["#181b23"]} />
          <ambientLight intensity={0.45} />
          <hemisphereLight args={["#f7eedc", "#5c625f", 0.7]} />
          <directionalLight
            position={[8, 16, 8]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
          />
          {solo && first ? (
            <SoloCamera product={first} />
          ) : (
            <Camera inside={inside} />
          )}
          <OrbitControls
            key={String(inside) + solo}
            target={[
              0,
              solo && first ? first.dimensions.height / 2 : inside ? 1.65 : 0,
              solo ? 0 : 1,
            ]}
            makeDefault
            maxPolarAngle={Math.PI / 2 - 0.03}
            minDistance={0.5}
            maxDistance={70}
          />
          <Walk inside={inside} direction={direction} />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.03, 0]}
            receiveShadow
          >
            <planeGeometry args={solo ? [12, 12] : [28, 30]} />
            <meshStandardMaterial color="#9a9489" roughness={0.55} />
          </mesh>
          {solo && first ? (
            <LoadedFurniture
              onError={setModelError}
              onReady={() => markReady(first.modelUrl)}
              url={first.modelUrl}
              dimensions={first.dimensions}
              color={color}
              material={first.material}
            />
          ) : (
            zones.map((zone) => (
              <group key={zone.name} position={[zone.x, 0, zone.z]}>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[7.6, 7.4]} />
                  <meshStandardMaterial
                    color={zone.name === "Hammom" ? "#777f85" : "#c1b49f"}
                    roughness={0.7}
                  />
                </mesh>
                <mesh position={[0, 1.45, -3.7]} receiveShadow>
                  <boxGeometry args={[7.6, 2.9, 0.12]} />
                  <meshStandardMaterial color="#d9d2c3" roughness={0.8} />
                </mesh>
                <Html position={[0, 3, -3.6]} center distanceFactor={12}>
                  <span className="salon-zone-name">{zone.name}</span>
                </Html>
                {products
                  .filter((product) =>
                    zone.categories.includes(product.category),
                  )
                  .map((product, index) => (
                    <group
                      key={product.id}
                      position={[
                        ((index % 2) - 0.5) * 3.6,
                        0,
                        Math.floor(index / 2) * 3 - 0.6,
                      ]}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(product);
                      }}
                    >
                      <LoadedFurniture
                        onError={setModelError}
                        onReady={() => markReady(product.modelUrl)}
                        url={product.modelUrl} material={product.material}
                        dimensions={product.dimensions}
                        color={selected === product.id ? color : undefined}
                      />
                      {selected === product.id && (
                        <mesh
                          rotation={[-Math.PI / 2, 0, 0]}
                          position={[0, 0.02, 0]}
                        >
                          <ringGeometry args={[0.8, 1, 40]} />
                          <meshBasicMaterial
                            color="#e5b65c"
                            transparent
                            opacity={0.8}
                          />
                        </mesh>
                      )}
                    </group>
                  ))}
              </group>
            ))
          )}
        </Canvas>
        <ModelLoading urls={products.map((product) => product.modelUrl)} />
        {modelError && (
          <span className="model-error" role="alert">
            {modelError}
          </span>
        )}
      </div>
      {!solo && (
        <div className="toolbar">
          <button onClick={() => setInside(!inside)}>
            {inside ? "Salonni tashqaridan ko‘rish" : "Salon ichida yurish"}
          </button>
          {inside &&
            [
              ["left", "←"],
              ["forward", "↑"],
              ["back", "↓"],
              ["right", "→"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-label={value}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDirection(value);
                }}
                onPointerUp={() => setDirection("")}
                onPointerCancel={() => setDirection("")}
                onBlur={() => setDirection("")}
              >
                {label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

