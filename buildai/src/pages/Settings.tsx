import { useState } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { User as UserType } from '@/types';
import { Input } from '@/components/ui/Input';
import { Sun, Moon, Lock, User, Crown, Info } from 'lucide-react';

function Ruler(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 1h16v1H4zM4 5h16v1H4zM4 9h16v1H4zM4 13h16v1H4zM4 17h16v1H4zM4 21h16v1H4z" />
    </svg>
  );
}

export function SettingsPage() {
  const { language, theme, unit, user, projects, measurements, orders, balance, setLanguage, setTheme, setUnit, setUser } = useAppStore();
  const [activeSection, setActiveSection] = useState('general');

  const exportData = () => {
    const payload = JSON.stringify(
      { user, projects, measurements, orders, balance, exportedAt: new Date().toISOString() },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ustapro-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const updateUser = (updates: Partial<UserType>) => {
    if (!user) return;
    setUser({ ...user, ...updates } as UserType | null);
  };

  const sections = [
    { id: 'general', label: 'Umumiy', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: "Ko'rinish", icon: <Sun className="w-4 h-4" /> },
    { id: 'units', label: t(language, 'units'), icon: <Ruler className="w-4 h-4" /> },
    { id: 'privacy', label: t(language, 'privacy'), icon: <Lock className="w-4 h-4" /> },
    { id: 'about', label: t(language, 'about'), icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#061426]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'settings')}</h1>
            <p className="text-[#9EB7D3]">Foydalanuvchi va ilova sozlamalari</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <div className="space-y-2">
              {sections.map((section) => (
                <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-[#1677FF]/10 text-[#1677FF] border border-[#1677FF]/20' : 'text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943]'}`}>
                  {section.icon} {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-9">
            <Card className="p-8">
              {activeSection === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F8FF] mb-2">Profil</h2>
                    <Input label="Ism" value={user?.name || ''} onChange={(e) => updateUser({ name: e.target.value })} />
                    <Input label="Email" value={user?.email || ''} onChange={(e) => updateUser({ email: e.target.value })} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F8FF] mb-2">Til</h2>
                    <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2">
                      <option value="uz">OК»zbekcha</option>
                      <option value="ru">Р СѓСЃСЃРєРёР№</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F8FF] mb-2">Mavzu</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setTheme('dark')} className={`p-4 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-[#1677FF]/20 text-[#1677FF] border-[#1677FF]' : 'bg-[#102943] text-[#9EB7D3] border-[#174D78] hover:border-[#1677FF]'}`}>
                        <Moon className="w-5 h-5 mb-2" /><span className="text-sm font-medium">Qorong'i</span>
                      </button>
                      <button onClick={() => setTheme('light')} className={`p-4 rounded-lg border transition-colors ${theme === 'light' ? 'bg-[#1677FF]/20 text-[#1677FF] border-[#1677FF]' : 'bg-[#102943] text-[#9EB7D3] border-[#174D78] hover:border-[#1677FF]'}`}>
                        <Sun className="w-5 h-5 mb-2" /><span className="text-sm font-medium">Yorug'</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'units' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-[#F5F8FF] mb-4">O'lchov birligi</h2>
                  <div className="space-y-3">
                    {['m', 'cm', 'mm'].map((u) => (
                      <button key={u} onClick={() => setUnit(u as any)} className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border transition-colors ${unit === u ? 'bg-[#1677FF]/20 text-[#1677FF] border-[#1677FF]' : 'bg-[#102943] text-[#9EB7D3] border-[#174D78] hover:border-[#1677FF]'}`}>
                        <span>{u === 'm' ? 'Metr' : u === 'cm' ? 'Santimetr' : 'Millimetr'}</span>
                        <span className="text-xs text-[#6B7C93]">{unit === u ? 'Tanlangan' : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-[#F5F8FF] mb-4">Maxfiyliyat</h2>
                  <div className="bg-[#102943] border border-[#174D78] rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4"><div><h3 className="text-[#F5F8FF] font-medium">Ma'lumotlar saqlash</h3><p className="text-[#9EB7D3] text-sm">Loyihalariz localStorage-da saqlanadi</p></div></div>
                    <Button variant="outline" className="w-full" onClick={exportData}>Ma'lumotlarni eksport qiling</Button>
                  </div>
                </div>
              )}

              {activeSection === 'about' && (
                <div className="space-y-6">
                  <div className="text-center py-8"><div className="w-16 h-16 bg-[#1677FF] rounded-lg flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8 text-white" /></div><h2 className="text-xl font-bold text-[#F5F8FF]">USTAPRO</h2><p className="text-[#9EB7D3]">Professional Construction Platform v1.0.0</p></div>
                  <div className="bg-[#102943] border border-[#174D78] rounded-lg p-6"><h3 className="text-[#F5F8FF] font-medium mb-4">Texnologiyalar</h3><ul className="space-y-2 text-[#9EB7D3] text-sm"><li>React + TypeScript</li><li>Tailwind CSS</li><li>Three.js (3D)</li><li>Lucide React</li></ul></div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
