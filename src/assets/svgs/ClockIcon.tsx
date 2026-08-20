import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const ClockIcon: React.FC<SVGProps> = ({ 
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

export default ClockIcon;