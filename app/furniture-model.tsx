"use client";
import { furnitureTexture } from "./furniture-texture";
import { useEffect, useMemo, Suspense, Component } from "react";
import { useLoader } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh, MeshStandardMaterial, Group, Box3, Vector3 } from "three";
export class ModelBoundary extends Component<
  { children: React.ReactNode; onError?: (message: string) => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.("3D model yuklanmadi: " + error.message);
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
export function FurnitureObject({
  url,
  color,
  material,
  dimensions,
  onReady,
}: {
  url: string;
  color?: string;
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  onReady?: () => void;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const texture = useMemo(() => furnitureTexture(material), [material]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const names = new Set<string>();
    clone.traverse((child) => {
      if (child instanceof Mesh)
        (Array.isArray(child.material)
          ? child.material
          : [child.material]
        ).forEach((value) => names.add(value.name));
    });
    const finishName = ["FurnitureFinish", "WoodFrame", "MetalFrame"].find(
      (name) => names.has(name),
    );
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const source = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const next = source.map((value) => {
          const result = value.clone();
          if (result instanceof MeshStandardMaterial) {
            if (
              texture &&
              !result.map &&
              (!finishName || result.name === finishName)
            )
              result.map = texture;
            if (color && (!finishName || result.name === finishName))
              result.color.set(color);
            if (
              material === "Metall" &&
              (!finishName || result.name === finishName)
            ) {
              result.metalness = 0.7;
              result.roughness = 0.3;
            } else if (
              material &&
              (!finishName || result.name === finishName)
            ) {
              result.metalness = 0.04;
              result.roughness = material === "Mato" ? 0.85 : 0.5;
            }
          }
          return result;
        });
        child.material = Array.isArray(child.material) ? next : next[0];
      }
    });
    const bounds = new Box3().setFromObject(clone),
      size = bounds.getSize(new Vector3()),
      center = bounds.getCenter(new Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0)
      throw new Error("3D model o‘lchami yaroqsiz.");
    clone.position.sub(new Vector3(center.x, bounds.min.y, center.z));
    const normalized = new Group();
    normalized.add(clone);
    if (dimensions)
      normalized.scale.set(
        dimensions.width / size.x,
        dimensions.height / size.y,
        dimensions.depth / size.z,
      );
    return normalized;
  }, [
    gltf.scene,
    color,
    material,
    dimensions?.width,
    dimensions?.height,
    dimensions?.depth,
    texture,
  ]);
  useEffect(
    () => () =>
      object.traverse((child) => {
        if (child instanceof Mesh)
          (Array.isArray(child.material)
            ? child.material
            : [child.material]
          ).forEach((value) => value.dispose());
      }),
    [object],
  );
  useEffect(() => {
    onReady?.();
  }, [object, onReady]);
  return <primitive object={object} dispose={null} />;
}
export function LoadedFurniture(props: {
  url: string;
  color?: string;
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  onReady?: () => void;
  onError?: (message: string) => void;
}) {
  return (
    <ModelBoundary key={props.url} onError={props.onError}>
      <Suspense fallback={null}>
        <FurnitureObject {...props} />
      </Suspense>
    </ModelBoundary>
  );
}

export function ModelLoading({ urls }: { urls: string[] }) {
  const { active, errors } = useProgress();
  const failed = errors.some((url) => urls.some((path) => url.endsWith(path)));
  return failed ? (
    <span className="model-error" role="alert">
      3D model yuklanmadi
    </span>
  ) : active ? (
    <span className="model-loading" role="status">
      Model yuklanmoqda…
    </span>
  ) : null;
}
