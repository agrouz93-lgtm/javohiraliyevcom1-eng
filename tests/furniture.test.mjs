import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  furnitureCatalog,
  placeFurniture,
  furniturePlacementError,
  furnitureEstimate,
  applyFurnitureVoice,
} from "../app/furniture-core.mjs";
import { validPlan } from "../app/domain.mjs";
const plan = {
  width: 12,
  depth: 8,
  lotWidth: 14,
  lotDepth: 10,
  height: 2.8,
  style: "Modern",
  roof: false,
  floors: 2,
  elements: [{ id: "living", type: "Zal", floor: 0, x: 0, y: 0, w: 8, d: 6 }],
};
const product = furnitureCatalog.products.find(
  (row) => row.id === "sofa-white",
);
test("Original catalog contains valid GLB 2.0 geometry and PBR materials", async () => {
  for (const item of furnitureCatalog.products) {
    const data = await readFile("public" + item.modelUrl);
    assert.equal(data.subarray(0, 4).toString(), "glTF");
    assert.equal(data.readUInt32LE(4), 2);
    assert.equal(data.readUInt32LE(8), data.length);
    const json = JSON.parse(
      data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
    );
    assert.ok(json.meshes.length > 0);
    assert.ok(json.materials.length > 0);
    assert.equal(item.price, null);
  }
});
test("Furniture placement persists complete immutable snapshot and reopens", () => {
  const next = placeFurniture(plan, product, "living", 0);
  const item = next.elements.at(-1);
  assert.equal(item.floor, 0);
  assert.equal(item.furniture.roomId, "living");
  assert.equal(item.furniture.modelUrl, product.modelUrl);
  assert.equal(item.furniture.version, 1);
  assert.ok(validPlan(next));
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
  assert.equal(furniturePlacementError(next, item), null);
  assert.equal(plan.elements.length, 1);
});
test("Wall, furniture, rotation and room bounds prevent invalid placement", () => {
  const next = placeFurniture(plan, product, "living", 0),
    item = next.elements.at(-1);
  assert.ok(furniturePlacementError(next, { ...item, x: 0 }));
  assert.ok(furniturePlacementError(next, { ...item, id: "other" }));
  assert.ok(furniturePlacementError(next, { ...item, w: 20 }));
  assert.ok(
    furniturePlacementError(next, {
      ...item,
      furniture: { ...item.furniture, roomId: "absent" },
    }),
  );
  const centered = {
    ...item,
    x: 2,
    y: 2,
    furniture: { ...item.furniture, rotation: 90 },
  };
  assert.equal(
    furniturePlacementError(
      { ...next, elements: [plan.elements[0], centered] },
      centered,
    ),
    null,
  );
});
test("Estimate marks missing prices and computes provided prices without invention", () => {
  const next = placeFurniture(
    plan,
    { ...product, price: 2000000 },
    "living",
    0,
  );
  const other = placeFurniture(next, { ...product, price: null }, "living", 0);
  const result = furnitureEstimate(other);
  assert.equal(result.total, 2000000);
  assert.equal(result.complete, false);
  assert.equal(
    result.rows.reduce((sum, row) => sum + row.quantity, 0),
    2,
  );
});
test("Limited furniture voice actions are atomic and require an unambiguous room", () => {
  const next = applyFurnitureVoice(plan, "Zalga oq divan qo‘y", "", 0);
  assert.equal(next.elements.at(-1).furniture.id, "sofa-white");
  assert.equal(next.elements.at(-1).color, "#eeeae2");
  assert.throws(() =>
    applyFurnitureVoice(
      {
        ...plan,
        elements: [...plan.elements, { ...plan.elements[0], id: "other" }],
      },
      "Zalga divan qo‘y",
      "",
      0,
    ),
  );
  assert.throws(() =>
    applyFurnitureVoice(plan, "Zalga divan qo‘y va tushunarsiz buyruq", "", 0),
  );
  assert.equal(plan.elements.length, 1);
});

test("Rotated furniture copies preserve dimensions and find a separate valid spot", async () => {
  const { duplicateFurniture } = await import("../app/furniture-core.mjs");
  const next = placeFurniture(plan, product, "living", 0);
  const item = next.elements.at(-1);
  item.x = 2;
  item.y = 2;
  item.furniture.rotation = 90;
  const copied = duplicateFurniture(next, item),
    copy = copied.elements.at(-1);
  assert.notEqual(copy.id, item.id);
  assert.equal(copy.furniture.rotation, 90);
  assert.equal(copy.w, item.w);
  assert.equal(furniturePlacementError(copied, copy), null);
});
test("Catalog rejects foreign model URLs and malicious cached product data", async () => {
  const { validCatalogProduct } = await import("../app/furniture-core.mjs");
  assert.ok(validCatalogProduct(product));
  assert.equal(
    validCatalogProduct({
      ...product,
      modelUrl: "https://foreign.example/model.glb",
    }),
    false,
  );
  assert.equal(validCatalogProduct({ ...product, price: -1 }), false);
  assert.equal(
    validCatalogProduct({
      ...product,
      dimensions: { width: Infinity, height: 1, depth: 1 },
    }),
    false,
  );
});

test("All four wall alignments respect rotated furniture and collision constraints", async () => {
  const { alignFurniture, furnitureBounds } =
    await import("../app/furniture-core.mjs");
  const next = placeFurniture(plan, product, "living", 0),
    source = next.elements.at(-1);
  const centered = {
    ...source,
    x: 2,
    y: 2,
    furniture: { ...source.furniture, rotation: 45 },
  };
  const scene = { ...next, elements: [plan.elements[0], centered] };
  for (const direction of ["left", "right", "back", "front"]) {
    const aligned = alignFurniture(scene, centered, direction),
      item = aligned.elements.at(-1),
      bounds = furnitureBounds(item);
    assert.equal(furniturePlacementError(aligned, item), null);
    if (direction === "left") assert.ok(Math.abs(bounds.x - 0.18) < 0.001);
    if (direction === "right")
      assert.ok(Math.abs(bounds.x + bounds.w - (8 - 0.18)) < 0.001);
    if (direction === "back") assert.ok(Math.abs(bounds.y - 0.18) < 0.001);
    if (direction === "front")
      assert.ok(Math.abs(bounds.y + bounds.d - (6 - 0.18)) < 0.001);
  }
});

test('Voice color changes require the selected object to match the requested furniture',()=>{
 const next=placeFurniture(plan,product,'living',0),sofa=next.elements.at(-1);
 assert.throws(()=>applyFurnitureVoice(next,'Shkaf rangini qora qil',sofa.id,0));
 assert.equal(sofa.color,product.colors[0]);
 const changed=applyFurnitureVoice(next,'Divanni qora qil',sofa.id,0);
 assert.equal(changed.elements.at(-1).color,'#242428');
});

test('Exact 150 percent size is accepted despite binary floating point rounding',()=>{
 const coffee=furnitureCatalog.products.find(item=>item.id==='coffee-table');
 const next=placeFurniture(plan,coffee,'living',0);
 const item=next.elements.at(-1);
 assert.equal(furniturePlacementError(next,{...item,d:.9}),null);
});
