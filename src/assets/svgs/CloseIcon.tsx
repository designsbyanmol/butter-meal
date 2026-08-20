import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const CloseIcon: React.FC<SVGProps> = ({ 
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
};

export default CloseIcon;