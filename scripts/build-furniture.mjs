import { mkdir, writeFile, readFile } from "node:fs/promises";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { makeFurnitureModel, categories } from "../app/furniture-builder.mjs";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result =
        "data:" +
        blob.type +
        ";base64," +
        Buffer.from(value).toString("base64");
      this.onloadend?.();
    });
  }
};
const definitions = [
  [
    "sofa-white",
    "Zamonaviy oq divan",
    "sofas",
    "sofa",
    2.4,
    0.9,
    0.95,
    "Mato",
    ["#e6e1d9", "#665c73", "#34383e"],
  ],
  [
    "sofa-violet",
    "Binafsha yumshoq divan",
    "sofas",
    "sofa",
    2.1,
    0.86,
    0.9,
    "Mato",
    ["#766184", "#c4b49f", "#e8e5df"],
  ],
  [
    "dining-table",
    "Olti kishilik ovqatlanish stoli",
    "dining",
    "table",
    1.8,
    0.76,
    0.9,
    "Yog‘och",
    ["#a57a51", "#e2d4be", "#363433"],
  ],
  [
    "coffee-table",
    "Jurnal stoli",
    "dining",
    "table",
    1.1,
    0.42,
    0.6,
    "Yog‘och",
    ["#b28b61", "#e4ddcf", "#353638"],
  ],
  [
    "chair-soft",
    "Yumshoq ovqatlanish stuli",
    "dining",
    "chair",
    0.5,
    0.85,
    0.55,
    "Mato",
    ["#c8b89c", "#666e72", "#dedbd0"],
  ],
  [
    "bed-double",
    "Ikki kishilik karavot",
    "bedroom",
    "bed",
    1.8,
    1.05,
    2.1,
    "Mato",
    ["#b5a691", "#6c6372", "#e2ddd4"],
  ],
  [
    "wardrobe-oak",
    "Ikki eshikli garderob",
    "wardrobe",
    "wardrobe",
    1.6,
    2.2,
    0.6,
    "Yog‘och",
    ["#c7b28b", "#454442", "#ede8dd"],
  ],
  [
    "kitchen-set",
    "Oshxona moduli",
    "kitchen",
    "kitchen",
    2.4,
    0.9,
    0.65,
    "Yog‘och",
    ["#d8d3c7", "#565e61", "#a88464"],
  ],
  [
    "bathroom-vanity",
    "Hammom shkafi va rakovina",
    "bathroom",
    "vanity",
    1,
    0.95,
    0.55,
    "Yog‘och",
    ["#d8cec0", "#605b56", "#f3f0e8"],
  ],
  [
    "tv-console",
    "Televizor tokchasi",
    "tv",
    "tv",
    1.8,
    0.55,
    0.45,
    "Yog‘och",
    ["#b08c64", "#444844", "#e7e0d4"],
  ],
  [
    "office-desk",
    "Ish stoli",
    "office",
    "desk",
    1.4,
    0.76,
    0.7,
    "Yog‘och",
    ["#c1a178", "#424851", "#ebe5d9"],
  ],
  [
    "floor-lamp",
    "Zamonaviy pol chirog‘i",
    "lighting",
    "lamp",
    0.5,
    1.65,
    0.5,
    "Metall",
    ["#e0c78d", "#494a4d", "#e6e1d8"],
  ],
  [
    "indoor-plant",
    "Dekorativ yashil o‘simlik",
    "decor",
    "plant",
    0.55,
    1,
    0.55,
    "Keramika",
    ["#b99876", "#414646", "#ddd3c2"],
  ],
];
const products = definitions.map(
  ([
    id,
    name,
    category,
    modelKind,
    width,
    height,
    depth,
    material,
    colors,
  ]) => ({
    id,
    name,
    category,
    modelKind,
    dimensions: { width, height, depth },
    material,
    colors,
    price: null,
    available: true,
    description:
      "USTA PRO uchun yaratilgan, o‘lchami va rangi tahrirlanadigan 3D interyer modeli.",
    modelUrl: "/furniture-models/v1/" + id + ".glb",
    imageUrl: "/furniture-thumbs/v1/" + id + ".png",
    version: 1,
    createdAt: "2026-11-23T00:00:00Z",
    origin: "original",
  }),
);
await mkdir("public/furniture-models/v1", { recursive: true });
for (const product of products) {
  const model = makeFurnitureModel(product);
  const binary = await new GLTFExporter().parseAsync(model, { binary: true });
  const destination = "public" + product.modelUrl;
  const next = Buffer.from(binary);
  let previous;
  try {
    previous = await readFile(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (previous && !previous.equals(next))
    throw new Error(
      "Model o‘zgargan. Yangi versiya papkasini yarating: " + product.id,
    );
  if (!previous) await writeFile(destination, next);
}
await writeFile(
  "public/furniture-catalog.json",
  JSON.stringify({ categories, products }, null, 2),
);
console.log(products.length + " original GLB models generated.");
