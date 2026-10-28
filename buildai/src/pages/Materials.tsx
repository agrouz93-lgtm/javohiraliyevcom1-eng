import { useState } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Package, Save } from 'lucide-react';
import { useNav } from '@/context/NavContext';


const MATERIAL_TYPES = [
  { label: "G'sht", color: 'bg-[#1677FF]/20' },
  { label: 'Sement', color: 'bg-[#29B6FF]/20' },
  { label: 'Qum', color: 'bg-[#22C99A]/20' },
  { label: 'Beton', color: 'bg-[#9EB7D3]/20' },
  { label: 'Kafel', color: 'bg-[#1677FF]/20' },
  { label: "Bo'yoq", color: 'bg-[#29B6FF]/20' },
];

const MATERIAL_TYPE_MAP: Record<string, 'brick' | 'cement' | 'sand' | 'concrete' | 'tile' | 'paint'> = {
  "G'sht": 'brick',
  Sement: 'cement',
  Qum: 'sand',
  Beton: 'concrete',
  Kafel: 'tile',
  "Bo'yoq": 'paint',
};

export function MaterialsPage() {
  const { language, currentProject, updateProject } = useAppStore();
  const { setActivePage } = useNav();
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [wasteFactor, setWasteFactor] = useState('10');
  const [pricePerUnit, setPricePerUnit] = useState('');

  const area = (parseFloat(length) || 0) * (parseFloat(width) || 0);
  const total = area * (1 + (parseFloat(wasteFactor) || 0) / 100);
  const price = Math.round(total * (parseFloat(pricePerUnit) || 0));
  const showResult = length !== '' && width !== '';

  const saveToProject = () => {
    if (!currentProject) {
      setSavedMsg(t(language, 'needProject'));
      return;
    }
    if (!selectedMaterial || !showResult) {
      setSavedMsg('Material va o\'lchamlarni kiriting');
      return;
    }
    const calc = {
      id: Date.now().toString(),
      projectId: currentProject.id,
      type: MATERIAL_TYPE_MAP[selectedMaterial] || 'brick',
      name: selectedMaterial,
      quantity: Number(total.toFixed(2)),
      unit: 'm' as const,
      pricePerUnit: parseFloat(pricePerUnit) || 0,
      totalPrice: price,
      wasteFactor: parseFloat(wasteFactor) || 0,
    };
    updateProject({
      ...currentProject,
      materials: [...(currentProject.materials || []), calc],
      updatedAt: new Date(),
    });
    setSavedMsg(`${t(language, 'savedToProject')}: ${selectedMaterial} — ${total.toFixed(2)} m²`);
  };

  const buttonClass = (mat: any) => {
    return 'w-full py-8 text-left flex flex-col items-center gap-3' + (selectedMaterial === mat.label ? ' border-[#1677FF] bg-[#1677FF]/10' : '');
  };

  const iconClass = (color: string) => {
    return 'w-10 h-10 rounded-lg flex items-center justify-center ' + color;
  };

  const smallIconClass = (color: string) => {
    return 'w-6 h-6 rounded-lg ' + color;
  };

  return (
    <div className="min-h-screen bg-[#061426]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'materials')}</h1>
            <p className="text-[#9EB7D3]">{t(language, 'materialCalcDesc')}</p>
          </div>
          <Button variant="outline" onClick={() => setActivePage('newProject')}>
            {t(language, 'newProject')}
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-[#F5F8FF] font-semibold mb-6">Material turini tanlang</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {MATERIAL_TYPES.map((mat) => (
                  <Button key={mat.label} variant="outline" className={buttonClass(mat)} onClick={() => setSelectedMaterial(mat.label)}>
                    <div className={iconClass(mat.color)}><Package className="w-5 h-5" /></div>
                    <span className="text-sm font-medium">{mat.label}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {selectedMaterial && (
              <Card className="p-6">
                <h3 className="text-[#F5F8FF] font-semibold mb-6">Hisoblash</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-[#9EB7D3] mb-2">Uzunlik (m)</label>
                    <input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9EB7D3] mb-2">Eni (m)</label>
                    <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9EB7D3] mb-2">Qalinlik (sm)</label>
                    <input type="number" value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9EB7D3] mb-2">Zaxira (%)</label>
                    <input type="number" value={wasteFactor} onChange={(e) => setWasteFactor(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm text-[#9EB7D3] mb-2">1 ta narxi (so'm)</label>
                  <input type="number" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 text-sm text-[#9EB7D3] flex items-center">
                    {showResult ? (
                      <span>
                        {t(language, 'calculate')}: <b className="text-[#F5F8FF]">{total.toFixed(2)} m²</b> ·{' '}
                        <b className="text-[#29B6FF]">{price.toLocaleString()} so'm</b>
                      </span>
                    ) : (
                      <span>Uzunlik va eni kiriting</span>
                    )}
                  </div>
                  <Button onClick={saveToProject}>
                    <Save className="w-4 h-4 mr-2" /> {t(language, 'saveToProject')}
                  </Button>
                </div>
                {savedMsg && <p className="mt-3 text-sm text-[#22C99A]">{savedMsg}</p>}
              </Card>
            )}

            {showResult && (
              <div className="bg-[#1677FF]/10 border-[#1677FF]/20 rounded-xl p-6">
                <h3 className="text-[#F5F8FF] font-semibold mb-4">Natija</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-[#9EB7D3]">Maydon</span><span className="text-[#F5F8FF] font-bold">{area.toFixed(2)} m2</span></div>
                  <div className="flex justify-between"><span className="text-[#9EB7D3]">Zaxira bilan</span><span className="text-[#F5F8FF] font-bold">{total.toFixed(2)} m2</span></div>
                  <div className="flex justify-between pt-4 border-t border-[#174D78]"><span className="text-[#9EB7D3]">Umumiy xarajat</span><span className="text-[#29B6FF] font-bold text-lg">{Math.round(total * (parseFloat(pricePerUnit) || 0)).toLocaleString()} so'm</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="p-5">
              <h3 className="text-[#F5F8FF] font-semibold mb-4">Loyihadagi hisoblar</h3>
              {!currentProject || !currentProject.materials?.length ? (
                <p className="text-sm text-[#6B7C93]">
                  {currentProject ? 'Hali hisob saqlanmagan' : t(language, 'needProject')}
                </p>
              ) : (
                <div className="space-y-3">
                  {currentProject.materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-[#0A1D33] rounded border border-[#174D78]">
                      <div className="flex items-center gap-3">
                        <div className={smallIconClass('bg-[#1677FF]/20')} />
                        <div>
                          <span className="block text-sm text-[#F5F8FF]">{m.name}</span>
                          <span className="block text-[11px] text-[#6B7C93]">{m.totalPrice.toLocaleString()} so'm</span>
                        </div>
                      </div>
                      <span className="text-sm text-[#9EB7D3]">{m.quantity.toFixed(2)} m²</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5 bg-[#1677FF]/10 border-[#1677FF]/20">
              <h3 className="text-[#29B6FF] font-semibold mb-4">Umumiy xarajat</h3>
              <div className="text-3xl font-bold text-[#F5F8FF] mb-4">0 so'm</div>
              <p className="text-xs text-[#9EB7D3]">Taxminiy narx</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
