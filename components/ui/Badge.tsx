import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export default function Badge({ children, variant = 'badge-gray', style, className, onClick }: BadgeProps) {
  return (
    <span
      className={`badge ${variant} ${className ?? ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
