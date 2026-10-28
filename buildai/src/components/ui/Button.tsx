import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export function Button({ variant = 'primary', size = 'md', className = '', disabled, active, ...props }: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#061426] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#1677FF] text-white focus:ring-[#1677FF] hover:bg-[#29B6FF]',
    secondary: 'bg-[#102943] text-[#F5F8FF] border border-[#174D78] focus:ring-[#1677FF] hover:bg-[#174D78] hover:border-[#1677FF]',
    outline: 'bg-transparent text-[#F5F8FF] border border-[#174D78] focus:ring-[#1677FF] hover:bg-[#174D78]',
    ghost: 'bg-transparent text-[#9EB7D3] focus:ring-[#1677FF] hover:text-[#F5F8FF]',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${active ? 'bg-[#1677FF] text-white border-[#1677FF]' : ''}`}
      disabled={disabled}
      {...props}
    />
  );
}
