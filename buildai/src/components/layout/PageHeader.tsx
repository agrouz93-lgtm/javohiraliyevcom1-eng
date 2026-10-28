import React from 'react';

interface PageHeaderProps {
  currentPage: string;
  onBack: () => void;
  onHome: () => void;
}

export function PageHeader({ currentPage, onBack, onHome }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <span className="text-[16px] font-medium text-[#F5F8FF]">
          USTAPRO
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#102943] border border-[#174D78] hover:text-[#F5F8FF] hover:bg-[#1677FF]/20"
        >
          <span className="text-[12px]">← Orqaga</span>
        </button>
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#102943] border border-[#174D78] hover:text-[#F5F8FF] hover:bg-[#1677FF]/20"
        >
          <span className="text-[12px]">⌂ Bosh sahifa</span>
        </button>
      </div>
    </div>
  );
}