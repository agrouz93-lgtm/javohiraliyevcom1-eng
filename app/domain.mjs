export function rectangle(length, width) {
  return { area: length * width, perimeter: 2 * (length + width) };
}

export function polygon(points, metersPerPixel) {
  if (points.length < 3 || !(metersPerPixel > 0)) return null;
  let cross = 0;
  let perimeter = 0;
  const sides = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    cross += point.x * next.y - next.x * point.y;
    const length = Math.hypot(next.x - point.x, next.y - point.y) * metersPerPixel;
    perimeter += length;
    return length;
  });
  return { area: Math.abs(cross) * metersPerPixel ** 2 / 2, perimeter, sides };
}

export function countMaterials(items) {
  const groups = new Map();
  for (const item of items) {
    groups.set(item.type, (groups.get(item.type) ?? 0) + item.pieces);
  }
  return Object.fromEntries(groups);
}

export const roomTypes = ['Yotoqxona', 'Oshxona', 'Zal', 'Hammom', 'Koridor'];
export const objectTypes = ['Devor', 'Eshik', 'Deraza', 'Zinapoya', 'Mebel', 'Pol', 'Shift', 'Panoramali oyna', 'Balkon', 'Ustun'];
export const palettes = {
  Modern: ['#e9e7de', '#7d8994', '#28456c'],
  Classic: ['#ead2a9', '#997d56', '#7a3b30'],
  Minimal: ['#f2f4f6', '#a0a9b5', '#414957'],
  Luxury: ['#eed9ac', '#676073', '#47316e'],
};

export function estimate(kind, l, w, h, coverage, waste, price, markup, labor) {
  const formulas = {
    area: [l * w, 'm²', 'Uzunlik × kenglik'],
    volume: [l * w * h, 'm³', 'Uzunlik × kenglik × balandlik'],
    perimeter: [2 * (l + w), 'm', '2 × (uzunlik + kenglik)'],
    wall: [2 * (l + w) * h, 'm²', 'Perimetr × balandlik'],
    roof: [2 * l * Math.hypot(w / 2, h), 'm²', 'Ikki nishab: 2 × uzunlik × √((kenglik ÷ 2)² + tom ko‘tarilishi²)'],
    brick: [Math.ceil(2 * (l + w) * h / coverage), 'dona', 'Devor maydoni ÷ bitta g‘ishtning chokli yuzasi'],
    tile: [Math.ceil(l * w / coverage), 'dona', 'Pol maydoni ÷ bitta plitka yuzasi'],
    slate: [Math.ceil(2 * l * Math.hypot(w / 2, h) / coverage), 'dona', 'Tom maydoni ÷ bir varaqning foydali yuzasi'],
    board: [Math.ceil(l * w / coverage), 'dona', 'Qoplanadigan maydon ÷ bitta taxta yuzasi'],
    paint: [2 * (l + w) * h / coverage, 'l', 'Devor maydoni ÷ bo‘yoq qoplamasi (m²/l), bir qatlam'],
    concrete: [l * w * h, 'm³', 'Uzunlik × kenglik × qatlam qalinligi'],
    cement: [l * w * h * coverage, 'kg', 'Beton hajmi × sement dozasi (kg/m³)'],
  };
  const [base, unit, formula] = formulas[kind];
  const adjusted = base * (1 + waste / 100);
  const quantity = unit === 'dona' ? Math.ceil(adjusted) : adjusted;
  const materials = quantity * price;
  return { base, unit, formula, quantity, materials, total: materials * (1 + markup / 100) + labor };
}

export function validPlan(plan) {
  const size = value => Number.isFinite(value) && value > 0 && value <= 200;
  return !!plan && size(plan.width) && size(plan.depth) && size(plan.height) &&
    size(plan.lotWidth) && size(plan.lotDepth) && plan.width <= plan.lotWidth && plan.depth <= plan.lotDepth &&
    (plan.wallFinish===undefined||['plaster','brick','wood','concrete'].includes(plan.wallFinish)) &&
    (plan.floors===undefined||(Number.isInteger(plan.floors)&&plan.floors>=1&&plan.floors<=20)) &&
    (plan.roofShape===undefined||['flat','gable','hip'].includes(plan.roofShape)) &&
    (plan.roofHeight===undefined||size(plan.roofHeight)) &&
    (plan.roofMaterial===undefined||['tile','metal','concrete'].includes(plan.roofMaterial)) &&
    Object.hasOwn(palettes, plan.style) && typeof plan.roof === 'boolean' &&
    (plan.ceiling === undefined || typeof plan.ceiling === 'boolean') &&
    (plan.materials === undefined || (plan.materials && ['wall','floor','roof','ceiling'].every(key=>/^#[0-9a-f]{6}$/i.test(plan.materials[key])))) &&
    Array.isArray(plan.elements) && plan.elements.length <= 150 &&
    new Set(plan.elements.map(element => element?.id)).size === plan.elements.length &&
    plan.elements.every(element => element && typeof element.id === 'string' && element.id.length <= 100 &&
      [...roomTypes, ...objectTypes].includes(element.type) && size(element.w) && size(element.d) &&
      Number.isFinite(element.x) && Number.isFinite(element.y) && element.x >= 0 && element.y >= 0 &&
      (element.floor===undefined||(Number.isInteger(element.floor)&&element.floor>=0&&element.floor<(plan.floors??1))) &&
      (element.height===undefined||size(element.height)) &&
      (element.sill===undefined||(Number.isFinite(element.sill)&&element.sill>=0&&element.sill<=plan.height)) &&
      (element.thickness===undefined||size(element.thickness)) &&
      (element.color===undefined||/^#[0-9a-f]{6}$/i.test(element.color)) &&
      (element.furniture===undefined||(
        typeof element.furniture.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(element.furniture.id)&&
        Number.isInteger(element.furniture.version)&&element.furniture.version>0&&
        typeof element.furniture.name==='string'&&element.furniture.name.length<=100&&
        typeof element.furniture.material==='string'&&element.furniture.material.length<=60&&
        typeof element.furniture.category==='string'&&
        typeof element.furniture.modelUrl==='string'&&/^\/(furniture-models\/v[0-9]+\/[a-zA-Z0-9_-]+\.glb|api\/furniture\/assets\/[a-f0-9]{64}\.(glb|gltf))$/.test(element.furniture.modelUrl)&&
        (element.furniture.price===null||(Number.isFinite(element.furniture.price)&&element.furniture.price>=0))&&
        Number.isFinite(element.furniture.rotation)&&Math.abs(element.furniture.rotation)<=360&&
        element.furniture.dimensions&&['width','height','depth'].every(key=>size(element.furniture.dimensions[key]))&&
        (element.furniture.roomId===undefined||typeof element.furniture.roomId==='string')
      )) &&
      element.x + element.w <= plan.width + 1e-8 && element.y + element.d <= plan.depth + 1e-8);
}

export function suggestPlan(prompt) {
  const dimensions = prompt.match(/(\d+(?:[.,]\d+)?)\s*[x×х*]\s*(\d+(?:[.,]\d+)?)/i);
  if (!dimensions) throw new Error('O‘lchamni 12×8 shaklida yozing.');
  const [width, depth] = dimensions.slice(1).map(value => Number(value.replace(',', '.')));
  const rooms = Number(prompt.match(/(\d+)\s*(?:ta\s*)?xona/i)?.[1] ?? 2);
  if (rooms < 1 || rooms > 12 || width < 4 || depth < 4) throw new Error('Taklif uchun kamida 4×4 m va 1–12 xona kiriting.');
  const types = [...Array.from({ length: rooms }, (_, index) => index ? 'Yotoqxona' : 'Zal')];
  if (/oshxona/i.test(prompt)) types.push('Oshxona');
  if (/hammom/i.test(prompt)) types.push('Hammom');
  const cols = Math.ceil(Math.sqrt(types.length));
  const rows = Math.ceil(types.length / cols);
  const plan = {
    width, depth, lotWidth: width + 2, lotDepth: depth + 2, height: 2.8, roof: false,
    style: /luxury/i.test(prompt) ? 'Luxury' : /klassik|classic/i.test(prompt) ? 'Classic' : /minimal/i.test(prompt) ? 'Minimal' : 'Modern',
    elements: types.map((type, index) => ({
      id: String(index + 1), type, x: index % cols * width / cols, y: Math.floor(index / cols) * depth / rows,
      w: width / cols, d: depth / rows,
    })),
  };
  if (!validPlan(plan)) throw new Error('Berilgan o‘lchamlar qo‘llab-quvvatlanadigan chegaradan tashqarida.');
  return plan;
}
