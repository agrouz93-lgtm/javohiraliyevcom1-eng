import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNav } from '@/context/NavContext';
import {
  Camera, Cpu, Calculator, LayoutGrid, Package, ShoppingCart,
  ArrowRight, HardHat,
} from 'lucide-react';

import ustaImg from '@/assets/usta.svg';
import houseImg from '@/assets/photos/banner-house.jpg';
import cameraImg from '@/assets/photos/card-camera.jpg';
import counterImg from '@/assets/photos/card-counter.jpg';
import calculatorImg from '@/assets/photos/card-calculator.jpg';
import plannerImg from '@/assets/photos/card-planner.jpg';
import materialsImg from '@/assets/photos/card-materials.jpg';
import shopImg from '@/assets/photos/card-shop.jpg';

interface FeatureCard {
  icon: React.ComponentType<any>;
  title: string;
  desc: string;
  page: string;
  badge: string;
  image: string;
  alt: string;
}

const features: FeatureCard[] = [
  {
    icon: Camera,
    title: 'AI Kamera',
    desc: "Kamera bilan o'lchash va obyektlarni aniqlash",
    page: 'camera',
    badge: 'from-[#1677FF] to-[#29B6FF]',
    image: cameraImg,
    alt: "Kamera bilan o'lchash tasviri",
  },
  {
    icon: Cpu,
    title: 'AI Sanash',
    desc: 'Rasmga obyektlarni sanash va tahlil qilish',
    page: 'counter',
    badge: 'from-[#7C5CFF] to-[#1677FF]',
    image: counterImg,
    alt: 'Obyektlarni sanash tasviri',
  },
  {
    icon: Calculator,
    title: 'Kalkulyator',
    desc: 'Oddiy va maxfiy hisob-kitoblar',
    page: 'calculator',
    badge: 'from-[#22C99A] to-[#29B6FF]',
    image: calculatorImg,
    alt: 'Kalkulyator tasviri',
  },
  {
    icon: LayoutGrid,
    title: 'Uy loyihasi',
    desc: '2D/3D uy chizimi va dizayn yaratish',
    page: 'planner',
    badge: 'from-[#F5A524] to-[#FF6B4A]',
    image: plannerImg,
    alt: 'Uy loyihasi chizimi tasviri',
  },
  {
    icon: Package,
    title: 'Materiallar',
    desc: 'Qurilish materiallari va hisob-kitoblar',
    page: 'materials',
    badge: 'from-[#9C5CFF] to-[#7C4DFF]',
    image: materialsImg,
    alt: 'Qurilish materiallari tasviri',
  },
  {
    icon: ShoppingCart,
    title: "Do'kon",
    desc: 'Mahsulotlar va xarid qilish',
    page: 'shop',
    badge: 'from-[#FF5C8A] to-[#FF3D6E]',
    image: shopImg,
    alt: 'Qurilish mahsulotlari savatchasi',
  },
];

const badges = ['Tezkor yechimlar', 'Aniq hisob-kitoblar', 'Zamonaviy texnologiyalar'];

export function HomePage() {
  const { language } = useAppStore();
  const { setActivePage } = useNav();
  const [visible, setVisible] = useState<boolean[]>([]);

  useEffect(() => {
    const first = setTimeout(() => setVisible(features.map((_, i) => i < 3)), 250);
    const second = setTimeout(() => setVisible(features.map(() => true)), 550);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  const goTo = (page: string) => setActivePage(page);

  return (
    <div className="min-h-screen">
      {/* ---------- Banner ---------- */}
      <header className="pt-6 md:pt-10 pb-6">
        <div className="relative rounded-3xl overflow-hidden border border-[#1677FF]/25 bg-gradient-to-br from-[#0A1D33] via-[#08203C] to-[#061426] shadow-[0_0_40px_rgba(22,119,255,0.12)]">
          <div className="absolute -top-24 -left-16 w-72 h-72 bg-[#1677FF]/20 blur-3xl rounded-full" aria-hidden="true" />
          <div className="absolute -bottom-28 -right-12 w-80 h-80 bg-[#29B6FF]/15 blur-3xl rounded-full" aria-hidden="true" />

          <div className="relative grid gap-6 lg:gap-8 lg:grid-cols-12 items-center p-5 md:p-8 lg:p-10">
            {/* character */}
            <div className="order-2 lg:order-1 lg:col-span-4 flex justify-center">
              <img
                src={ustaImg}
                alt="Oq kaskali, ko'k kiyimli usta personaji"
                className="w-full max-w-[300px] lg:max-w-none drop-shadow-[0_12px_30px_rgba(22,119,255,0.35)]"
              />
            </div>

            {/* text */}
            <div className="order-1 lg:order-2 lg:col-span-4 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3 text-[#29B6FF]">
                <HardHat className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase">USTAPRO</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F8FF] leading-tight tracking-tight">
                {t(language, 'welcome')}, 👑
              </h1>
              <p className="mt-3 text-sm sm:text-base md:text-lg text-[#9EB7D3] leading-relaxed">
                {t(language, 'subtitle')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                {badges.map((label, i) => (
                  <span
                    key={label}
                    className={`text-xs font-medium px-3 py-1 rounded-full border ${
                      i === 0
                        ? 'bg-[#1677FF]/10 text-[#1677FF] border-[#1677FF]/25'
                        : i === 1
                        ? 'bg-[#29B6FF]/10 text-[#29B6FF] border-[#29B6FF]/25'
                        : 'bg-[#22C99A]/10 text-[#22C99A] border-[#22C99A]/25'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Button variant="primary" size="lg" onClick={() => setActivePage('camera')}>
                  AI Kamera bilan boshlash
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setActivePage('planner')}>
                  Loyihani yaratish
                </Button>
              </div>
            </div>

            {/* house scene */}
            <div className="order-3 lg:col-span-4">
              <img
                src={houseImg}
                alt="Zamonaviy uy qurilishi manzarasi"
                className="w-full rounded-2xl border border-[#174D78] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Functional cards ---------- */}
      <main className="pb-16">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl md:text-2xl font-bold text-[#F5F8FF]">Imkoniyatlar</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-[#1677FF]/60 to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {features.map((feature, index) => (
            <Card
              key={feature.page}
              hoverable
              padded={false}
              className={`cursor-pointer group p-0 transition-all duration-500 ${
                visible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              onClick={() => goTo(feature.page)}
            >
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.badge} flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]`}
                  >
                    <feature.icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <span className="w-10 h-10 shrink-0 rounded-full border border-[#1677FF]/40 bg-[#1677FF]/10 flex items-center justify-center text-[#1677FF] transition-all duration-300 group-hover:bg-[#1677FF] group-hover:text-white group-hover:shadow-[0_0_16px_rgba(22,119,255,0.5)]">
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#F5F8FF] mb-1">{feature.title}</h3>
                <p className="text-sm text-[#9EB7D3] leading-relaxed">{feature.desc}</p>
              </div>

              <div className="px-5 md:px-6 pb-5 md:pb-6">
                <div className="rounded-xl overflow-hidden border border-[#174D78] transition-colors duration-300 group-hover:border-[#1677FF]/60">
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    loading="lazy"
                    className="w-full h-36 md:h-40 object-cover"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ---------- Two big panels ---------- */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <button
            onClick={() => setActivePage('planner')}
            className="group relative overflow-hidden rounded-3xl border border-[#1677FF]/30 bg-gradient-to-br from-[#0A1D33] via-[#08203C] to-[#061426] p-6 text-left transition-all duration-300 hover:border-[#1677FF] hover:shadow-[0_0_30px_rgba(22,119,255,0.2)]"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#F5A524] to-[#FF6B4A] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                <LayoutGrid className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-[#F5F8FF]">3D uy loyihasi</h3>
                  <span className="w-9 h-9 shrink-0 rounded-full border border-[#1677FF]/40 bg-[#1677FF]/10 flex items-center justify-center text-[#1677FF] group-hover:bg-[#1677FF] group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#9EB7D3]">
                  Uyni 360° aylantiring, 2D/3D rejada quring, xona va hovli elementlarini joylashtiring
                </p>
              </div>
            </div>
            <img
              src={houseImg}
              alt="3D uy loyihasi"
              loading="lazy"
              className="mt-4 w-full h-40 object-cover rounded-2xl border border-[#174D78] group-hover:border-[#1677FF]/60 transition-colors"
            />
          </button>

          <button
            onClick={() => setActivePage('shop')}
            className="group relative overflow-hidden rounded-3xl border border-[#1677FF]/30 bg-gradient-to-br from-[#0A1D33] via-[#08203C] to-[#061426] p-6 text-left transition-all duration-300 hover:border-[#1677FF] hover:shadow-[0_0_30px_rgba(22,119,255,0.2)]"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#FF5C8A] to-[#FF3D6E] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-[#F5F8FF]">Qurilish materiallari do'koni</h3>
                  <span className="w-9 h-9 shrink-0 rounded-full border border-[#1677FF]/40 bg-[#1677FF]/10 flex items-center justify-center text-[#1677FF] group-hover:bg-[#1677FF] group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#9EB7D3]">
                  G'isht, sement, qum, armatura va boshqa materiallar — balansdan xarid qilish bilan
                </p>
              </div>
            </div>
            <img
              src={shopImg}
              alt="Qurilish materiallari do'koni"
              loading="lazy"
              className="mt-4 w-full h-40 object-cover rounded-2xl border border-[#174D78] group-hover:border-[#1677FF]/60 transition-colors"
            />
          </button>
        </div>
      </main>
    </div>
  );
}
