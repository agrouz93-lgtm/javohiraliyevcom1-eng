import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Box3,
  Vector3,
  CylinderGeometry,
  SphereGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export const categories = [
  { id: "sofas", name: "Divan va yumshoq mebellar" },
  { id: "dining", name: "Stol va stullar" },
  { id: "bedroom", name: "Yotoqxona mebellari" },
  { id: "wardrobe", name: "Shkaf va garderob" },
  { id: "kitchen", name: "Oshxona mebellari" },
  { id: "bathroom", name: "Hammom jihozlari" },
  { id: "tv", name: "Televizor tokchalari" },
  { id: "office", name: "Ofis mebellari" },
  { id: "lighting", name: "Yoritish jihozlari" },
  { id: "decor", name: "Dekoratsiyalar" },
];
export function makeFurnitureModel(product) {
  const group = new Group();
  const surface = new MeshStandardMaterial({
    color: product.colors[0],
    roughness: product.material === "Metall" ? 0.28 : 0.68,
    metalness: product.material === "Metall" ? 0.65 : 0.04,
  });
  const wood = new MeshStandardMaterial({ color: "#9e7553", roughness: 0.55 });
  const dark = new MeshStandardMaterial({
    color: "#292b32",
    roughness: 0.4,
    metalness: 0.2,
  });
  const white = new MeshStandardMaterial({ color: "#eee9df", roughness: 0.8 });
  surface.name = "FurnitureFinish";
  wood.name = "WoodFrame";
  dark.name = "MetalFrame";
  white.name = "Lining";
  function box(x, y, z, w, h, d, material = surface, r = 0.025) {
    const mesh = new Mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
      material,
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function cylinder(x, y, z, r, h, material = surface) {
    const mesh = new Mesh(new CylinderGeometry(r, r, h, 24), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function legs(height = 0.23) {
    for (const x of [-0.39, 0.39])
      for (const z of [-0.34, 0.34])
        box(x, height / 2, z, 0.065, height, 0.065, wood);
  }
  switch (product.modelKind) {
    case "sofa":
      legs(0.16);
      box(0, 0.28, 0, 0.98, 0.23, 0.9);
      box(0, 0.65, -0.37, 0.94, 0.56, 0.2);
      for (const x of [-0.25, 0.25]) {
        box(x, 0.45, 0.03, 0.46, 0.17, 0.64, surface, 0.065);
        box(x, 0.73, -0.23, 0.43, 0.36, 0.14, white, 0.06);
      }
      for (const x of [-0.46, 0.46])
        box(x, 0.5, 0, 0.13, 0.43, 0.94, surface, 0.055);
      break;
    case "chair":
      legs(0.43);
      box(0, 0.48, 0, 0.95, 0.13, 0.86);
      box(0, 0.77, -0.36, 0.9, 0.46, 0.12, surface, 0.05);
      break;
    case "table":
      box(0, 0.93, 0, 1, 0.12, 1, wood, 0.045);
      for (const x of [-0.4, 0.4])
        for (const z of [-0.4, 0.4]) box(x, 0.45, z, 0.07, 0.9, 0.07, dark);
      break;
    case "bed":
      legs(0.15);
      box(0, 0.3, 0, 1, 0.25, 0.95, wood);
      box(0, 0.52, 0.06, 0.96, 0.22, 0.85, white, 0.07);
      box(0, 0.78, -0.43, 1, 0.44, 0.1, surface, 0.04);
      for (const x of [-0.24, 0.24])
        box(x, 0.69, -0.19, 0.4, 0.1, 0.25, white, 0.06);
      box(0, 0.66, 0.24, 0.95, 0.05, 0.44, surface, 0.04);
      break;
    case "wardrobe":
      box(0, 0.5, 0, 1, 1, 1, wood, 0.025);
      for (const x of [-0.25, 0.25])
        box(x, 0.51, 0.508, 0.485, 0.95, 0.035, surface, 0.01);
      for (const x of [-0.035, 0.035])
        box(x, 0.51, 0.54, 0.018, 0.13, 0.025, dark, 0.005);
      break;
    case "kitchen":
      box(0, 0.36, 0, 1, 0.66, 0.94);
      box(0, 0.73, 0, 1.04, 0.08, 1.02, dark);
      for (const x of [-0.33, 0, 0.33]) {
        box(x, 0.38, 0.487, 0.31, 0.59, 0.025, white, 0.008);
        box(x, 0.55, 0.51, 0.12, 0.02, 0.02, dark, 0.005);
      }
      for (const x of [-0.32, 0.32]) {
        cylinder(x, 0.778, -0.12, 0.1, 0.01, dark);
        cylinder(x, 0.778, 0.17, 0.1, 0.01, dark);
      }
      break;
    case "vanity":
      box(0, 0.35, 0, 0.95, 0.6, 0.9, wood);
      box(0, 0.68, 0, 1, 0.07, 1, white);
      cylinder(0, 0.73, 0, 0.32, 0.12, white);
      box(0, 0.86, -0.36, 0.035, 0.23, 0.035, dark);
      box(0, 0.98, -0.27, 0.035, 0.035, 0.2, dark);
      break;
    case "tv":
      legs(0.18);
      box(0, 0.45, 0, 1, 0.48, 1, wood);
      for (const x of [-0.33, 0, 0.33])
        box(x, 0.45, 0.51, 0.31, 0.38, 0.025, surface, 0.01);
      break;
    case "desk":
      box(0, 0.9, 0, 1, 0.1, 1, wood);
      box(-0.36, 0.45, 0, 0.25, 0.85, 0.9);
      for (const z of [-0.37, 0.37]) box(0.4, 0.45, z, 0.06, 0.9, 0.06, dark);
      for (const y of [0.23, 0.46, 0.69])
        box(-0.36, y, 0.47, 0.2, 0.025, 0.03, dark, 0.005);
      break;
    case "lamp":
      cylinder(0, 0.025, 0, 0.38, 0.05, dark);
      cylinder(0, 0.53, 0, 0.027, 1, dark);
      {
        const shade = new Mesh(
          new CylinderGeometry(0.25, 0.43, 0.32, 32, 1, true),
          white,
        );
        shade.position.y = 1;
        group.add(shade);
      }
      break;
    case "plant":
      cylinder(0, 0.19, 0, 0.28, 0.38, wood);
      for (let i = 0; i < 9; i++) {
        const leaf = new Mesh(
          new SphereGeometry(0.16, 12, 12),
          new MeshStandardMaterial({
            color: i % 2 ? "#446846" : "#77915f",
            roughness: 0.9,
          }),
        );
        leaf.scale.set(0.6, 2.4, 0.6);
        leaf.position.set(
          Math.sin(i * 2.4) * 0.18,
          0.5 + i * 0.045,
          Math.cos(i * 2.4) * 0.18,
        );
        leaf.rotation.z = Math.sin(i) * 0.5;
        group.add(leaf);
      }
      break;
    default:
      throw new Error("Model turi qo‘llab-quvvatlanmaydi.");
  }
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const bounds = new Box3().setFromObject(group),
    size = bounds.getSize(new Vector3()),
    center = bounds.getCenter(new Vector3());
  group.position.set(-center.x, -bounds.min.y, -center.z);
  const normalized = new Group();
  normalized.add(group);
  normalized.scale.set(
    product.dimensions.width / size.x,
    product.dimensions.height / size.y,
    product.dimensions.depth / size.z,
  );
  return normalized;
}
