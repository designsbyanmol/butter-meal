import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const MinusIcon: React.FC<SVGProps> = ({ 
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
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
};

export default MinusIcon;