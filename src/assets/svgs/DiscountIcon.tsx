import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const DiscountIcon: React.FC<SVGProps> = ({ 
  width = 24, 
  height = 24, 
  fill = 'currentColor',
  className 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
};

export default DiscountIcon;