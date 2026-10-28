import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm text-[#9EB7D3] mb-1">{label}</label>}
      <input
        className={`bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] placeholder-[#6B7C93] focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF] transition-all duration-200 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
    </div>
  );
}
