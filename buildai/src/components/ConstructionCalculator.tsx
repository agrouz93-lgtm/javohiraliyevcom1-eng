import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useNav } from '@/context/NavContext';
import { useAppStore } from '@/store';

type Unit = 'm' | 'm²' | 'm³' | 'kg' | 'l' | 'dona' | 'qop' | 'paket' | 'rulon' | 'karta';
type Item = { name: string; unit: Unit; quantity: number };
type Field = { label: string; initial: number; optional?: boolean; integer?: boolean; options?: string[] };
type Job = { name: string; fields?: Field[]; materials: (area: number, values: number[], reserve: number) => Item[] };

const discreteUnits: Unit[] = ['dona', 'qop', 'paket', 'rulon', 'karta'];
const item = (name: string, unit: Unit, value: number): Item => {
  const quantity = Number(value.toPrecision(12));
  return { name, unit, quantity: discreteUnits.includes(unit) ? Math.ceil(quantity) : Math.ceil(quantity * 1000) / 1000 };
};
const primer = (area: number) => item('Gruntovka', 'l', area * 0.2);
const perimeter = { label: 'Perimetr (m), ixtiyoriy', initial: 0, optional: true };
const layers = { label: 'Qatlam soni', initial: 2, integer: true };

const groups: { name: string; jobs: Job[] }[] = [
  { name: 'Pol ishlari', jobs: [
    {
      name: 'Styashka',
      fields: [{ label: 'Qalinlik (mm)', initial: 50 }],
      materials: (area, [depth], reserve) => {
        const volume = area * depth / 1000 * reserve;
        return [item('Sement (50 kg)', 'qop', volume * 400 / 50), item('Qum', 'm³', volume * 1.1), item('Mayoq profil', 'dona', area / 4)];
      },
    },
    {
      name: 'Suvli issiq pol',
      fields: [{ label: 'Quvur oralig‘i (sm)', initial: 15 }, { label: 'Setka kartasi (m²)', initial: 6 }],
      materials: (area, [spacing, mesh], reserve) => {
        const pipe = area * reserve * 100 / spacing;
        return [item('Quvur', 'm', pipe), item('Setka', 'karta', area * reserve / mesh), item('Izolyatsiya', 'm²', area * reserve), item('Klipsa', 'dona', pipe * 2)];
      },
    },
    {
      name: 'Laminat yoki parket',
      fields: [{ label: 'Paket qoplami (m²)', initial: 2 }, perimeter],
      materials: (area, [pack, edge], reserve) => [
        item('Pol qoplamasi', 'paket', area * reserve / pack), item('Taglik', 'm²', area * reserve),
        item('Bug‘ to‘sig‘i', 'm²', area * reserve), item('Plintus', 'm', edge * reserve),
      ],
    },
    {
      name: 'Plitka yotqizish',
      fields: [{ label: 'Plitka uzunligi (sm)', initial: 60 }, { label: 'Plitka eni (sm)', initial: 60 }],
      materials: (area, [length, width], reserve) => {
        const count = area * reserve * 10000 / (length * width);
        return [item('Plitka', 'dona', count), item('Yelim (25 kg)', 'qop', area * reserve * 5 / 25),
          item('Chok to‘ldirgich', 'kg', area * reserve * 0.3), item('Xochcha', 'dona', count * 4), primer(area)];
      },
    },
  ] },
  { name: 'Devor va shift', jobs: [
    {
      name: 'Suvoq',
      fields: [{ label: 'Qalinlik (mm)', initial: 15 }, { label: 'Sarf (kg/m², 10 mm qatlamga)', initial: 9 }],
      materials: (area, [depth, rate], reserve) => [
        item('Suvoq aralashmasi (30 kg)', 'qop', area * depth / 10 * rate * reserve / 30), primer(area), item('Mayoq profil', 'dona', area / 3),
      ],
    },
    {
      name: 'Shpaklyovka', fields: [layers, { label: 'Bir qatlam sarfi (kg/m²)', initial: 1 }],
      materials: (area, [coats, rate], reserve) => [
        item('Shpaklyovka (25 kg)', 'qop', area * coats * rate * reserve / 25), primer(area), item('Jilvir qog‘oz', 'dona', area / 10),
      ],
    },
    {
      name: 'Bo‘yash', fields: [layers, { label: 'Bir litrning qoplami (m²)', initial: 8 }],
      materials: (area, [coats, coverage], reserve) => [
        item('Bo‘yoq', 'l', area * coats * reserve / coverage), primer(area), item('Bo‘yoqchi lentasi', 'rulon', area / 10), item('Valik', 'dona', 1),
      ],
    },
    {
      name: 'Gulqog‘oz yopishtirish',
      fields: [{ label: 'Devor balandligi (m)', initial: 2.7 }, { label: 'Rulon uzunligi (m)', initial: 10 },
        { label: 'Rulon eni (m)', initial: 0.53 }, { label: 'Naqsh va kesish qo‘shimchasi (sm)', initial: 10, optional: true }],
      materials: (area, [height, length, width, extra], reserve) => {
        const strips = Math.floor(length / (height + extra / 100));
        return [item('Gulqog‘oz', 'rulon', area * reserve / (height * width * strips)),
          item('Yelim', 'paket', area * reserve / 25), primer(area)];
      },
    },
    {
      name: 'Gipsokarton',
      fields: [{ label: 'Varaq maydoni (m²)', initial: 3 }],
      materials: (area, [sheet], reserve) => [
        item('Gipsokarton', 'dona', area * reserve / sheet), item('Profil (3 m)', 'dona', area * reserve),
        item('Shurup', 'dona', area * reserve * 20), item('Dyubel', 'dona', area * reserve * 2),
        item('Chok lentasi', 'm', area * reserve * 1.2), item('Shpaklyovka (25 kg)', 'qop', area * reserve / 25),
      ],
    },
    {
      name: 'Armatura setkasi',
      fields: [{ label: 'Kartadan foydalaniladigan maydon (m²)', initial: 6 }],
      materials: (area, [mesh], reserve) => [item('Armatura setkasi', 'karta', area * reserve / mesh)],
    },
  ] },
  { name: 'Qurilish ishlari', jobs: [
    {
      name: 'Beton va poydevor',
      fields: [{ label: 'Qalinlik yoki chuqurlik (sm)', initial: 10 },
        { label: 'Beton turi', initial: 0, options: ['Tayyor beton', 'Loyiha tarkibi bo‘yicha aralashtirish'] },
        { label: 'Sement (kg/m³)', initial: 0, optional: true },
        { label: 'Qum (kg/m³)', initial: 0, optional: true },
        { label: 'Chaqiq tosh (kg/m³)', initial: 0, optional: true }],
      materials: (area, [depth, mix, cement, sand, gravel], reserve) => {
        const volume = area * depth / 100 * reserve;
        if (!mix) return [item('Tayyor beton', 'm³', volume)];
        if (cement <= 0 || sand <= 0 || gravel <= 0) return [];
        return [item('Sement (50 kg)', 'qop', volume * cement / 50), item('Qum', 'kg', volume * sand), item('Chaqiq tosh', 'kg', volume * gravel)];
      },
    },
    {
      name: 'G‘isht terish',
      fields: [{ label: 'Loyihadagi sarf (dona/m²)', initial: 51 }, { label: 'Qorishma sarfi (l/m²)', initial: 20 }],
      materials: (area, [bricks, mortar], reserve) => [
        item('G‘isht', 'dona', area * reserve * bricks), item('Tayyor qorishma', 'm³', area * reserve * mortar / 1000),
      ],
    },
    {
      name: 'Fasad izolyatsiyasi',
      fields: [{ label: 'Plita qoplami (m²)', initial: 0.5 }, { label: 'Yelim sarfi (kg/m²)', initial: 5 },
        { label: 'Mahkamlagich sarfi (dona/m²)', initial: 6 }],
      materials: (area, [board, glue, anchors], reserve) => [
        item('Izolyatsiya plitasi', 'dona', area * reserve / board), item('Yelim (25 kg)', 'qop', area * reserve * glue / 25),
        item('Dyubel', 'dona', area * reserve * anchors), item('Shisha tolali setka', 'm²', area * reserve),
      ],
    },
  ] },
];

const format = new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 3 });
const inputStyle = 'block w-full rounded-lg border border-[#174D78] bg-[#0A1D33] px-3 py-2 text-[#F5F8FF]';

export function ConstructionCalculator() {
  const [job, setJob] = useState<Job>(groups[0].jobs[0]);
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[16rem_1fr]">
      <Card className="p-4">
        <label htmlFor="construction-job" className="mb-2 block text-sm font-semibold text-[#F5F8FF]">Ish turi</label>
        <select id="construction-job" className={inputStyle} value={job.name}
          onChange={(event) => {
            const next = groups.flatMap((group) => group.jobs).find((entry) => entry.name === event.target.value);
            if (next) setJob(next);
          }}>
          {groups.map((group) => (
            <optgroup key={group.name} label={group.name}>
              {group.jobs.map((entry) => <option key={entry.name}>{entry.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Card>
      <Estimate key={job.name} job={job} />
    </div>
  );
}

function Estimate({ job }: { job: Job }) {
  const [area, setArea] = useState('');
  const [waste, setWaste] = useState('10');
  const [values, setValues] = useState(() => (job.fields ?? []).map((field) => String(field.initial)));
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const { currentProject, projects, setCurrentProject, updateProject } = useAppStore();
  const { setActivePage } = useNav();
  const valid = Number.isFinite(Number(area)) && Number(area) > 0 && values.every((text, index) => {
    const value = Number(text);
    const field = job.fields?.[index];
    if (field?.options) return !!field.options[value];
    return Number.isFinite(value) && (field?.optional ? value >= 0 : value > 0) && (!field?.integer || Number.isInteger(value));
  });
  const items = valid ? job.materials(Number(area), values.map(Number), 1 + Number(waste) / 100) : [];
  const quantitiesValid = items.every((material) => Number.isFinite(material.quantity));
  const lines = quantitiesValid ? items.filter((material) => material.quantity > 0).map((material) => {
    const price = Number(prices[material.name] ?? '');
    return { ...material, price, total: Math.round(price * material.quantity) };
  }) : [];
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const invalidPrice = !Number.isSafeInteger(total) || lines.some((line) => !Number.isSafeInteger(line.total) || line.price < 0);
  const missingPrice = lines.some((line) => !prices[line.name]?.trim());
  const changeField = (index: number, next: string) => {
    setValues((previous) => previous.map((value, fieldIndex) => fieldIndex === index ? next : value));
    setSaved(false);
  };
  const save = () => {
    if (!currentProject || !lines.length || invalidPrice || saved) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    updateProject({
      ...currentProject,
      updatedAt: new Date(),
      materials: [
        ...(currentProject.materials ?? []),
        ...lines.map((line, index) => ({
          id: `${id}-${index}`, projectId: currentProject.id, type: 'other' as const, name: line.name,
          quantity: line.quantity, unit: line.unit, pricePerUnit: line.price, totalPrice: line.total, wasteFactor: Number(waste),
        })),
      ],
    });
    setSaved(true);
  };

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-[#F5F8FF]">{job.name}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#9EB7D3]">Maydon (m²)
          <input className={inputStyle} type="number" inputMode="decimal" min="0" step="any" value={area}
            onChange={(event) => { setArea(event.target.value); setSaved(false); }} />
        </label>
        <label className="text-sm text-[#9EB7D3]">Zaxira
          <select className={inputStyle} value={waste} onChange={(event) => { setWaste(event.target.value); setSaved(false); }}>
            {[0, 5, 10, 15, 20].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
        </label>
        {job.fields?.map((field, index) => (
          <label key={field.label} className="text-sm text-[#9EB7D3]">{field.label}
            {field.options ? (
              <select className={inputStyle} value={values[index]} onChange={(event) => changeField(index, event.target.value)}>
                {field.options.map((label, option) => <option key={label} value={option}>{label}</option>)}
              </select>
            ) : (
              <input className={inputStyle} type="number" inputMode={field.integer ? 'numeric' : 'decimal'} min="0"
                step={field.integer ? '1' : 'any'} value={values[index]} onChange={(event) => changeField(index, event.target.value)} />
            )}
          </label>
        ))}
      </div>

      {lines.length > 0 ? (
        <div className="mt-5">
          <ul className="divide-y divide-[#174D78]">
            {lines.map((line) => (
              <li key={line.name} className="grid grid-cols-2 items-center gap-2 py-3 text-sm sm:grid-cols-3">
                <div className="font-medium text-[#F5F8FF]">{line.name}<span className="block text-[#9EB7D3]">{format.format(line.quantity)} {line.unit}</span></div>
                <label className="text-xs text-[#9EB7D3]">Birlik narxi (so‘m)
                  <input aria-label={`${line.name} narxi`} className={inputStyle} type="number" inputMode="decimal" min="0" step="any"
                    value={prices[line.name] ?? ''} onChange={(event) => {
                      setPrices({ ...prices, [line.name]: event.target.value });
                      setSaved(false);
                    }} />
                </label>
                <span className="col-span-2 text-right text-[#9EB7D3] sm:col-span-1">{prices[line.name] && !invalidPrice ? `${format.format(line.total)} so‘m` : '—'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right font-semibold text-[#29B6FF]" aria-live="polite">
            {invalidPrice ? 'Narxlarni tekshiring' : `${missingPrice ? 'Kiritilgan narxlar jami' : 'Jami'}: ${format.format(total)} so‘m`}
          </p>
          <p className="my-4 text-sm text-[#9EB7D3]">Miqdorlar taxminiy. Sarf me’yorini loyiha va material qadoqlaridan tekshiring. Narxi kiritilmagan material jami narxga qo‘shilmaydi.</p>
          {currentProject ? (
            <Button onClick={save} disabled={invalidPrice || saved}>{saved ? 'Smeta saqlandi' : `${currentProject.name} loyihasiga saqlash`}</Button>
          ) : projects.length ? (
            <label className="block max-w-xs text-sm text-[#9EB7D3]">Saqlash uchun loyiha tanlang
              <select className={inputStyle} value="" onChange={(event) => {
                setCurrentProject(projects.find((project) => project.id === event.target.value) ?? null);
              }}>
                <option value="">Loyiha</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          ) : (
            <Button variant="outline" onClick={() => setActivePage('newProject')}>Smeta saqlash uchun loyiha yarating</Button>
          )}
        </div>
      ) : <p className="mt-4 text-sm text-[#9EB7D3]" role="status">{area ? 'O‘lcham va sarf qiymatlarini tekshiring.' : 'Hisoblash uchun maydonni kiriting.'}</p>}
    </Card>
  );
}
