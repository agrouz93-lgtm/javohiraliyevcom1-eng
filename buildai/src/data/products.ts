// Haqiqiy fotosuratlar (Wikimedia Commons, erkin litsenziya)
import brickImg from '@/assets/photos/brick.jpg';
import brickSilmatImg from '@/assets/photos/brick-silmat.jpg';
import cementImg from '@/assets/photos/cement.jpg';
import sandImg from '@/assets/photos/sand.jpg';
import gravelImg from '@/assets/photos/gravel.jpg';
import woodImg from '@/assets/photos/wood.jpg';
import rebarImg from '@/assets/photos/rebar.jpg';
import roofImg from '@/assets/photos/roof.jpg';
import paintImg from '@/assets/photos/paint.jpg';
import electricImg from '@/assets/photos/electric.jpg';
import lampImg from '@/assets/photos/lamp.jpg';
import toolImg from '@/assets/photos/tool.jpg';
import tileImg from '@/assets/photos/tile.jpg';
import concreteImg from '@/assets/photos/concrete.jpg';
import treeArchaImg from '@/assets/photos/tree-archa.jpg';
import treeAppleImg from '@/assets/photos/tree-apple.jpg';
import treePoplarImg from '@/assets/photos/tree-poplar.jpg';
import treeOakImg from '@/assets/photos/tree-oak.jpg';
import landImg from '@/assets/photos/grass.jpg';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // so'm
  unit: string;
  image: string;
  stock: number;
  desc: string;
  // Moshinalar uchun 3D ma'lumot
  carBody?: 'sedan' | 'suv' | 'van';
  carColor?: string;
  // Tayyor buyumlar (yer, devor, tom, mebel, chiroq) — Uy loyihasiga joylashtiriladi
  propKind?: 'land' | 'wall' | 'roof' | 'lamp' | 'sofa' | 'table' | 'bed' | 'wardrobe' | 'chair' | 'crate';
  propColor?: string;
}

export const SHOP_CATEGORIES = [
  'Hammasi',
  "G'isht",
  'Sement',
  'Qum',
  "Shag'al",
  "Yog'och",
  'Armatura',
  'Tom',
  "Bo'yoq",
  'Elektr',
  'Daraxtlar',
  'Moshinalar',
  'Yer',
  'Tayyor devor',
  'Tayyor tom',
  'Chiroqlar',
  'Mebel',
  'Boshqa',
];

export const SHOP_ITEMS: Product[] = [
  { id: 'brick-1', name: "G'isht qizil (250×120×65)", category: "G'isht", price: 800, unit: 'ta', image: brickImg, stock: 5000, desc: 'Klassik qizil g\'isht, 1 dona' },
  { id: 'brick-2', name: "G'isht silikat (250×120×88)", category: "G'isht", price: 950, unit: 'ta', image: brickSilmatImg, stock: 4000, desc: 'Oq silikat g\'isht' },
  { id: 'cement-1', name: 'Sement M400 (50 kg)', category: 'Sement', price: 45000, unit: 'qop', image: cementImg, stock: 600, desc: 'Portland sement M400' },
  { id: 'cement-2', name: 'Sement TSB-40 (50 kg)', category: 'Sement', price: 52000, unit: 'qop', image: cementImg, stock: 400, desc: 'Tsement shlak beton TSB-40' },
  { id: 'sand-1', name: 'Qum (qariz)', category: 'Qum', price: 120000, unit: 'm³', image: sandImg, stock: 200, desc: 'Toza qurilish qumi' },
  { id: 'gravel-1', name: "Shag'al 5-20", category: "Shag'al", price: 140000, unit: 'm³', image: gravelImg, stock: 180, desc: 'Beton uchun shag\'al' },
  { id: 'gravel-2', name: "Shag'al 20-40", category: "Shag'al", price: 135000, unit: 'm³', image: gravelImg, stock: 150, desc: 'Yostiq qatlami uchun' },
  { id: 'wood-1', name: 'Lag 50×100 (4 m)', category: "Yog'och", price: 45000, unit: 'ta', image: woodImg, stock: 320, desc: "Qurilish lag'i, quruq" },
  { id: 'wood-2', name: 'Doska terma (4 m)', category: "Yog'och", price: 38000, unit: 'ta', image: woodImg, stock: 400, desc: 'Opalubka doskasi' },
  { id: 'rebar-1', name: 'Armatura Ø12 A500 (6 m)', category: 'Armatura', price: 55000, unit: 'ta', image: rebarImg, stock: 260, desc: 'Qayta karlangan armatura' },
  { id: 'rebar-2', name: 'Armatura Ø8 A500 (6 m)', category: 'Armatura', price: 32000, unit: 'ta', image: rebarImg, stock: 300, desc: 'Yengil armatura' },
  { id: 'roof-1', name: 'Metall cherepitsa (m²)', category: 'Tom', price: 65000, unit: 'm²', image: roofImg, stock: 500, desc: 'Polyester qoplamali' },
  { id: 'roof-2', name: 'Ondulin varaq (2000×950)', category: 'Tom', price: 58000, unit: 'ta', image: roofImg, stock: 350, desc: 'Yengil tom materiali' },
  { id: 'paint-1', name: 'Akril bo\'yoq 10 l', category: "Bo'yoq", price: 185000, unit: 'dona', image: paintImg, stock: 120, desc: 'Tashqi va ichki ishlar uchun' },
  { id: 'paint-2', name: 'Emal bo\'yoq 2.5 l', category: "Bo'yoq", price: 95000, unit: 'dona', image: paintImg, stock: 90, desc: "Metall va yog'och uchun" },
  { id: 'electric-1', name: 'Kabel NYM 3×2.5 (100 m)', category: 'Elektr', price: 420000, unit: 'rol', image: electricImg, stock: 40, desc: 'Uy elektr tarmog\'i uchun' },
  { id: 'electric-2', name: 'Lyustra LED 24W', category: 'Elektr', price: 150000, unit: 'dona', image: lampImg, stock: 70, desc: 'Xona yoritgichi' },
  { id: 'tool-1', name: 'Qurilish burg\'ilagich', category: 'Boshqa', price: 850000, unit: 'dona', image: toolImg, stock: 15, desc: 'Perforator, 850W' },
  { id: 'tile-1', name: 'Kafel 30×30 (m²)', category: 'Boshqa', price: 65000, unit: 'm²', image: tileImg, stock: 300, desc: 'Hammom va oshxona uchun' },
  { id: 'concrete-1', name: 'Beton B25 (m³)', category: 'Boshqa', price: 480000, unit: 'm³', image: concreteImg, stock: 60, desc: 'Tayyor beton aralashmasi' },
  { id: 'tree-1', name: 'Archa (2 yosh)', category: 'Daraxtlar', price: 90000, unit: 'dona', image: treeArchaImg, stock: 50, desc: 'Manzarali ekish uchun' },
  { id: 'tree-2', name: 'Olma daraxti (2 yosh)', category: 'Daraxtlar', price: 120000, unit: 'dona', image: treeAppleImg, stock: 40, desc: 'Mevali daraxt' },
  { id: 'tree-3', name: 'Terak (2 yosh)', category: 'Daraxtlar', price: 70000, unit: 'dona', image: treePoplarImg, stock: 60, desc: 'Tez o\'suvchi daraxt' },
  { id: 'tree-4', name: "Qayrag'och (2 yosh)", category: 'Daraxtlar', price: 85000, unit: 'dona', image: treeOakImg, stock: 45, desc: 'Botanika daraxti' },
  // ---- O'zbekiston mashinalari (UzAuto) — 3D ko'rinish bilan ----
  { id: 'car-cobalt', name: 'Chevrolet Cobalt', category: 'Moshinalar', price: 225000000, unit: 'dona', image: '', stock: 10, desc: "Sedan, 1.5L — O'zbekistonda ishlab chiqarilgan", carBody: 'sedan', carColor: '#E8ECF2' },
  { id: 'car-nexia', name: 'Chevrolet Nexia 3', category: 'Moshinalar', price: 168000000, unit: 'dona', image: '', stock: 12, desc: 'Sedan, 1.5L — ixcham oilaviy avtomobil', carBody: 'sedan', carColor: '#C9CFD8' },
  { id: 'car-lacetti', name: 'Chevrolet Lacetti', category: 'Moshinalar', price: 210000000, unit: 'dona', image: '', stock: 8, desc: 'Sedan, 1.6L — klassik model', carBody: 'sedan', carColor: '#1F3A6E' },
  { id: 'car-gentra', name: 'Chevrolet Gentra', category: 'Moshinalar', price: 235000000, unit: 'dona', image: '', stock: 9, desc: 'Sedan, 1.5L — zamonaviy dizayn', carBody: 'sedan', carColor: '#20242B' },
  { id: 'car-damas', name: 'Chevrolet Damas', category: 'Moshinalar', price: 145000000, unit: 'dona', image: '', stock: 15, desc: 'Furgon — yuk tashish uchun', carBody: 'van', carColor: '#F2F4F7' },
  { id: 'car-labo', name: 'Chevrolet Labo', category: 'Moshinalar', price: 138000000, unit: 'dona', image: '', stock: 14, desc: 'Yuk furgoni — kichik biznes uchun', carBody: 'van', carColor: '#DDE2E9' },
  { id: 'car-tracker', name: 'Chevrolet Tracker', category: 'Moshinalar', price: 385000000, unit: 'dona', image: '', stock: 6, desc: 'Krossover, 1.2T Turbo — premium', carBody: 'suv', carColor: '#A62B2B' },
  { id: 'car-equinox', name: 'Chevrolet Equinox', category: 'Moshinalar', price: 520000000, unit: 'dona', image: '', stock: 4, desc: 'Krossover, 1.5T — keng salon', carBody: 'suv', carColor: '#2B4A3F' },
  // ---- Yer ----
  { id: 'land-1', name: "Hovli yeri (100 m²)", category: 'Yer', price: 3500000, unit: 'uchastka', image: landImg, stock: 20, desc: 'Yashil maysazor bilan hovli yeri', propKind: 'land', propColor: '#3E7C4F' },
  { id: 'land-2', name: 'Betonli hovli yeri (100 m²)', category: 'Yer', price: 4200000, unit: 'uchastka', image: landImg, stock: 15, desc: 'Beton plitali yaltiroq hovli', propKind: 'land', propColor: '#9AA3AD' },
  { id: 'land-3', name: 'Qumli hovli yeri (100 m²)', category: 'Yer', price: 2800000, unit: 'uchastka', image: landImg, stock: 18, desc: 'Qumli teritorya — bolalar maydonchasi uchun', propKind: 'land', propColor: '#D8C79A' },
  // ---- Tayyor devor ----
  { id: 'wall-1', name: 'Tayyor g\'isht devor (4 m)', category: 'Tayyor devor', price: 950000, unit: 'panel', image: brickImg, stock: 40, desc: 'Tayyor g\'ishtli devor paneli', propKind: 'wall', propColor: '#B4653F' },
  { id: 'wall-2', name: 'Tayyor oq devor (4 m)', category: 'Tayyor devor', price: 1050000, unit: 'panel', image: concreteImg, stock: 35, desc: 'Suvga chidamli oq devor paneli', propKind: 'wall', propColor: '#E8EEF7' },
  { id: 'wall-3', name: 'Tayyor panjara devori (4 m)', category: 'Tayyor devor', price: 780000, unit: 'panel', image: brickImg, stock: 30, desc: 'Hovli chegarasi uchun panjara', propKind: 'wall', propColor: '#A9743F' },
  // ---- Tayyor tom ----
  { id: 'roof-3', name: 'Tayyor qizil tom (20 m²)', category: 'Tayyor tom', price: 2400000, unit: 'komplekt', image: roofImg, stock: 25, desc: 'Metall cherepitsali tom konstruktsiyasi', propKind: 'roof', propColor: '#B03A4B' },
  { id: 'roof-4', name: 'Tayyor ko\'k tom (20 m²)', category: 'Tayyor tom', price: 2600000, unit: 'komplekt', image: roofImg, stock: 22, desc: 'Zamonaviy ko\'k tom konstruktsiyasi', propKind: 'roof', propColor: '#2F4A6B' },
  // ---- Chiroqlar ----
  { id: 'lamp-1', name: 'Tashqi yoritgich', category: 'Chiroqlar', price: 320000, unit: 'dona', image: lampImg, stock: 50, desc: 'Hovli uchun tashqi ustun chiroq', propKind: 'lamp', propColor: '#3F4A5A' },
  { id: 'lamp-2', name: 'Ichki plafon chiroq', category: 'Chiroqlar', price: 180000, unit: 'dona', image: lampImg, stock: 60, desc: 'Xona uchun plafonchali yoritgich', propKind: 'lamp', propColor: '#C9CFD8' },
  { id: 'lamp-3', name: 'Bog\' chiroqlari (4 dona)', category: 'Chiroqlar', price: 650000, unit: 'komplekt', image: lampImg, stock: 30, desc: 'Yo\'lak uchun bog\' chiroqlari', propKind: 'lamp', propColor: '#2F4A6B' },
  // ---- Mebel ----
  { id: 'sofa-1', name: 'Divan (3 kishilik)', category: 'Mebel', price: 4500000, unit: 'dona', image: woodImg, stock: 20, desc: 'Mehmonxona uchun yumshoq divan', propKind: 'sofa', propColor: '#3F6B8A' },
  { id: 'table-1', name: 'Oshxona stoli', category: 'Mebel', price: 2100000, unit: 'dona', image: woodImg, stock: 25, desc: 'Yog\'och oshxona stoli', propKind: 'table', propColor: '#8A6242' },
  { id: 'bed-1', name: 'Katta karavot', category: 'Mebel', price: 3800000, unit: 'dona', image: woodImg, stock: 18, desc: 'Yotoqxona uchun 180×200 karavot', propKind: 'bed', propColor: '#6E7E9A' },
  { id: 'wardrobe-1', name: 'Shkaf (2 eshikli)', category: 'Mebel', price: 2900000, unit: 'dona', image: woodImg, stock: 22, desc: 'Yotoq xona shkafi', propKind: 'wardrobe', propColor: '#5C4037' },
  { id: 'chair-1', name: 'Stul', category: 'Mebel', price: 450000, unit: 'dona', image: woodImg, stock: 80, desc: 'Yog\'och stul', propKind: 'chair', propColor: '#A9743F' },
  { id: 'crate-1', name: 'Yuk qutisi', category: 'Mebel', price: 150000, unit: 'dona', image: woodImg, stock: 100, desc: 'Saqlash uchun daraxt qutisi', propKind: 'crate', propColor: '#8A6242' },
];
