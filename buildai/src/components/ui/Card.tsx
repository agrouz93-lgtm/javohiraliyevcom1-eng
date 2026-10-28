import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

export function Card({ children, hoverable = false, padded = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-[#102943] border border-[#174D78] rounded-xl ${padded ? 'p-6' : 'p-4'} ${hoverable ? 'glass-card-hover transition-all duration-300 hover:-translate-y-1 hover:border-[#1677FF] hover:shadow-glow' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
