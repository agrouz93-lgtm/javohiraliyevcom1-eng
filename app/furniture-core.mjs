import catalog from "../public/furniture-catalog.json" with { type: "json" };
import { wallSegments, floorOf } from "./house-model.mjs";
const rooms = ["Yotoqxona", "Oshxona", "Zal", "Hammom", "Koridor"];
export const furnitureCatalog = catalog;
export function furnitureBounds(element) {
  const angle = ((element.furniture?.rotation ?? 0) * Math.PI) / 180;
  const width =
    Math.abs(Math.cos(angle)) * element.w +
    Math.abs(Math.sin(angle)) * element.d;
  const depth =
    Math.abs(Math.sin(angle)) * element.w +
    Math.abs(Math.cos(angle)) * element.d;
  return {
    x: element.x + element.w / 2 - width / 2,
    y: element.y + element.d / 2 - depth / 2,
    w: width,
    d: depth,
  };
}
const intersects = (a, b) =>
  a.x < b.x + b.w - 0.005 &&
  a.x + a.w > b.x + 0.005 &&
  a.y < b.y + b.d - 0.005 &&
  a.y + a.d > b.y + 0.005;
export function furniturePlacementError(plan, element) {
  if (!element.furniture) return null;
  const ratios = [
    element.w / element.furniture.dimensions.width,
    element.d / element.furniture.dimensions.depth,
    (element.height ?? element.furniture.dimensions.height) /
      element.furniture.dimensions.height,
  ];
  if (ratios.some((value) => value < 0.5 - 1e-8 || value > 1.5 + 1e-8))
    return "O‘lcham modelning 50–150% chegarasida bo‘lsin.";
  const bounds = furnitureBounds(element),
    height = element.height ?? element.furniture.dimensions.height;
  if (!Number.isFinite(height) || height <= 0 || height > plan.height)
    return "Mebel balandligi qavatga sig‘maydi.";
  if (
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.w > plan.width + 0.001 ||
    bounds.y + bounds.d > plan.depth + 0.001
  )
    return "Mebel uy chegarasidan chiqmoqda.";
  const room = element.furniture.roomId
    ? plan.elements.find(
        (e) =>
          e.id === element.furniture.roomId &&
          floorOf(e) === floorOf(element) &&
          rooms.includes(e.type),
      )
    : null;
  if (element.furniture.roomId && !room) return "Tanlangan xona topilmadi.";
  if (
    room &&
    (bounds.x < room.x + 0.06 ||
      bounds.y < room.y + 0.06 ||
      bounds.x + bounds.w > room.x + room.w - 0.06 ||
      bounds.y + bounds.d > room.y + room.d - 0.06)
  )
    return "Mebel tanlangan xonaga sig‘maydi.";
  for (const wall of wallSegments(plan)) {
    if (
      wall.floor === floorOf(element) &&
      intersects(bounds, { x: wall.x, y: wall.z, w: wall.w, d: wall.d })
    )
      return "Mebel devor ichiga kirmasligi kerak.";
  }
  for (const other of plan.elements) {
    if (
      other.id !== element.id &&
      other.furniture &&
      floorOf(other) === floorOf(element) &&
      intersects(bounds, furnitureBounds(other))
    )
      return "Bu joyda boshqa mebel bor.";
  }
  return null;
}
export function placeFurniture(plan, product, roomId, floor = 0) {
  if (!product.available) throw new Error("Bu mebel katalogda mavjud emas.");
  const room = roomId
    ? plan.elements.find(
        (e) =>
          e.id === roomId && rooms.includes(e.type) && floorOf(e) === floor,
      )
    : null;
  if (roomId && !room) throw new Error("Xonani tanlang.");
  const { width: w, depth: d, height } = product.dimensions;
  const base = {
    id: crypto.randomUUID(),
    type: "Mebel",
    floor,
    x: 0,
    y: 0,
    w,
    d,
    height,
    color: product.colors[0],
    furniture: {
      id: product.id,
      version: product.version,
      name: product.name,
      category: product.category,
      modelUrl: product.modelUrl,
      dimensions: { ...product.dimensions },
      material: product.material,
      price: product.price,
      rotation: 0,
      ...(room ? { roomId: room.id } : {}),
    },
  };
  return searchPlacement(plan, base, room);
}
function searchPlacement(plan, base, room) {
  const w = base.w,
    d = base.d;
  const left = room?.x ?? 0,
    top = room?.y ?? 0,
    width = room?.w ?? plan.width,
    depth = room?.d ?? plan.depth;
  for (let y = top + 0.25; y + d <= top + depth - 0.1; y += 0.25)
    for (let x = left + 0.25; x + w <= left + width - 0.1; x += 0.25) {
      const candidate = { ...base, x, y };
      if (!furniturePlacementError(plan, candidate))
        return { ...plan, elements: [...plan.elements, candidate] };
    }
  throw new Error(
    "Bo‘sh joy topilmadi. Kattaroq xona tanlang yoki mavjud mebelni suring.",
  );
}
export function duplicateFurniture(plan, source) {
  if (!source.furniture) throw new Error("Mebel tanlanmagan.");
  const room = source.furniture.roomId
    ? plan.elements.find((e) => e.id === source.furniture.roomId)
    : null;
  return searchPlacement(
    plan,
    {
      ...source,
      id: crypto.randomUUID(),
      furniture: structuredClone(source.furniture),
    },
    room,
  );
}

export function furnitureEstimate(plan) {
  const map = new Map();
  for (const item of plan.elements.filter((e) => e.furniture)) {
    const product = item.furniture,
      key = product.id + ":" + product.version + ":" + product.price;
    const row = map.get(key) ?? {
      id: product.id,
      name: product.name,
      quantity: 0,
      price: product.price,
      total: product.price === null ? null : 0,
    };
    row.quantity++;
    row.total = row.price === null ? null : row.price * row.quantity;
    map.set(key, row);
  }
  const rows = [...map.values()];
  return {
    rows,
    total: rows.reduce((sum, row) => sum + (row.total ?? 0), 0),
    complete: rows.every((row) => row.price !== null),
  };
}
export function applyFurnitureVoice(
  plan,
  text,
  selectedId,
  activeFloor = 0,
  products = catalog.products,
) {
  const normalized = text.toLowerCase(),
    clauses = normalized.split(/\s+(?:va|keyin)\s+/);
  let next = plan;
  for (const clause of clauses) {
    if (/(shkaf|divan|stol|stul|karavot).*(qora|oq).*(qil|bo.ya)/.test(clause)) {
      const selected = next.elements.find(
        (e) => e.id === selectedId && e.furniture,
      );
      if (!selected)
        throw new Error("Rangini o‘zgartirish uchun mebelni tanlang.");
      const expected=/shkaf/.test(clause)?'wardrobe':/divan/.test(clause)?'sofa':/karavot/.test(clause)?'bed':/stul/.test(clause)?'chair':'table';
      const actual=products.find(product=>product.id===selected.furniture.id)?.modelKind??catalog.products.find(product=>product.id===selected.furniture.id)?.modelKind;
      if(actual&&actual!==expected&&!(expected==='table'&&actual==='desk'))throw new Error('Buyruqda aytilgan mebelni tanlang.');
      if(!actual){
        const name=selected.furniture.name.toLowerCase();
        const expression=expected==='wardrobe'?/shkaf|garderob/:new RegExp(expected==='sofa'?'divan':expected==='bed'?'karavot':expected==='chair'?'stul':'stol');
        if(!expression.test(name))throw new Error('Buyruqda aytilgan mebel aniqlanmadi.');
      }
      next = {
        ...next,
        elements: next.elements.map((e) =>
          e.id === selectedId
            ? { ...e, color: clause.includes("qora") ? "#242428" : "#eeeae2" }
            : e,
        ),
      };
      continue;
    }
    if (/oldiga|orqasiga|uzoqroqqa|uslubda/.test(clause))
      throw new Error(
        "Bu joylashuvni 3D muharrirda tanlang. Murakkab ovozli boshqaruv uchun AI xizmati kerak.",
      );
    const kind = /divan/.test(clause)
      ? "sofa"
      : /karavot/.test(clause)
        ? "bed"
        : /shkaf/.test(clause)
          ? "wardrobe"
          : /stul/.test(clause)
            ? "chair"
            : /stol/.test(clause)
              ? "table"
              : null;
    if (!kind || !/(qo.y|qo.sh|joylashtir)/.test(clause))
      throw new Error("Mebel buyrug‘i aniqlanmadi.");
    const requestedFloor = /ikkinchi|2.?qavat/.test(clause)
      ? 1
      : /uchinchi|3.?qavat/.test(clause)
        ? 2
        : activeFloor;
    if (requestedFloor >= (next.floors ?? 1))
      throw new Error("Bu qavat hali yaratilmagan.");
    const wantedRoom = /zal|mehmonxona/.test(clause)
      ? "Zal"
      : /yotoq/.test(clause)
        ? "Yotoqxona"
        : /oshxona/.test(clause)
          ? "Oshxona"
          : null;
    const choices = next.elements.filter(
      (e) =>
        rooms.includes(e.type) &&
        floorOf(e) === requestedFloor &&
        (!wantedRoom || e.type === wantedRoom),
    );
    const target =
      choices.find((room) => room.id === selectedId) ??
      (choices.length === 1 ? choices[0] : null);
    if (!target)
      throw new Error(
        "Qaysi xonani nazarda tutdingiz? Muharrirda bitta xonani tanlang.",
      );
    const candidates = products.filter(
      (product) =>
        (product.modelKind ??
          catalog.products.find((item) => item.id === product.id)
            ?.modelKind) === kind && product.available,
    );
    const product = candidates.find(
      (product) =>
        kind !== "table" ||
        (clause.includes("jurnal")
          ? product.name.toLowerCase().includes("jurnal")
          : !product.name.toLowerCase().includes("jurnal")),
    );
    if (!product) throw new Error("Mos mebel katalogda yo‘q.");
    next = placeFurniture(next, product, target.id, requestedFloor);
    if (clause.includes("oq"))
      next.elements[next.elements.length - 1].color = "#eeeae2";
  }
  return next;
}
export function validCatalogProduct(product) {
  return (
    !!product &&
    typeof product.id === "string" &&
    /^[a-zA-Z0-9_-]{1,80}$/.test(product.id) &&
    typeof product.name === "string" &&
    product.name.length > 0 &&
    product.name.length <= 100 &&
    Number.isInteger(product.version) &&
    product.version > 0 &&
    typeof product.available === "boolean" &&
    product.dimensions &&
    ["width", "height", "depth"].every(
      (key) =>
        Number.isFinite(product.dimensions[key]) &&
        product.dimensions[key] > 0.05 &&
        product.dimensions[key] <= 15,
    ) &&
    typeof product.modelUrl === "string" &&
    /^\/(furniture-models\/v[0-9]+\/[a-zA-Z0-9_-]+\.glb|api\/furniture\/assets\/[a-f0-9]{64}\.(glb|gltf))$/.test(
      product.modelUrl,
    ) &&
    typeof product.imageUrl === "string" &&
    /^\/(furniture-thumbs\/v[0-9]+\/[a-zA-Z0-9_-]+\.png|api\/furniture\/assets\/[a-f0-9]{64}\.(png|jpg|webp))$/.test(
      product.imageUrl,
    ) &&
    Array.isArray(product.colors) &&
    product.colors.length > 0 &&
    product.colors.length <= 12 &&
    product.colors.every((color) => /^#[a-f0-9]{6}$/i.test(color)) &&
    categoriesValid(product.category) &&
    typeof product.material === "string" &&
    (product.price === null ||
      (Number.isFinite(product.price) &&
        product.price >= 0 &&
        product.price <= 1e12))
  );
}
function categoriesValid(category) {
  return catalog.categories.some((item) => item.id === category);
}

export function alignFurniture(plan, element, direction) {
  if (!element.furniture) throw new Error("Mebel tanlang.");
  const room = element.furniture.roomId
    ? plan.elements.find((row) => row.id === element.furniture.roomId)
    : null;
  const margin = (room?.thickness ?? 0.15) + 0.03;
  const left = (room?.x ?? 0) + margin,
    top = (room?.y ?? 0) + margin;
  const right = (room ? room.x + room.w : plan.width) - margin,
    bottom = (room ? room.y + room.d : plan.depth) - margin;
  const bounds = furnitureBounds(element);
  let x = element.x,
    y = element.y;
  if (direction === "left") x += left - bounds.x;
  else if (direction === "right") x += right - bounds.x - bounds.w;
  else if (direction === "back") y += top - bounds.y;
  else if (direction === "front") y += bottom - bounds.y - bounds.d;
  else throw new Error("Tekislash tomoni yaroqsiz.");
  const moved = {
    ...element,
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
  };
  const error = furniturePlacementError(plan, moved);
  if (error) throw new Error(error);
  return {
    ...plan,
    elements: plan.elements.map((row) => (row.id === element.id ? moved : row)),
  };
}

