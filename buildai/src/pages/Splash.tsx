import { useState, useEffect } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    let timer: any;
    let start = Date.now();
    const run = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.floor((elapsed / 3000) * 100));
      setProgress(p);
      if (p < 100) {
        raf = window.requestAnimationFrame(run);
      } else {
        timer = setTimeout(() => onFinish(), 400);
      }
    };
    run();
    return () => {
      window.cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []); // empty deps — run once on mount

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#061426] text-[#F5F8FF] overflow-hidden">
      {/* Cosmic neon background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#1677FF]/20 rounded-full blur-[120px] -mt-32 animate-pulse" />
        <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/20 rounded-full blur-[100px] -mb-24" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#22C99A]/15 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        {/* Logo container */}
        <div className="relative w-40 h-40 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 rounded-full border-2 border-[#1677FF]/40 animate-pulse" />
          <div className="relative z-10 w-28 h-28 bg-gradient-to-br from-[#E040FB] to-[#FF4D9D] rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(224,64,251,0.55)]">
            <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3.5l9 7" />
              <path d="M6.5 11.5V20" />
              <path d="M17.5 11.5V20" />
              <path d="M6.5 20h11" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">USTAPRO</h2>
          <p className="mt-2 text-[#9EB7D3] text-sm">Qurilish texnologiyalari</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mt-10">
          <div className="flex justify-between text-xs text-[#6B7C93] mb-2">
            <span>Yuklanmoqda...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-[#0A1D33] rounded-full overflow-hidden border border-[#174D78]">
            <div
              className="h-full bg-gradient-to-r from-[#1677FF] via-[#29B6FF] to-[#8B5CF6] shadow-[0_0_15px_rgba(22,119,255,0.6)] transition-all duration-300"
              style={{ width: progress + '%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}