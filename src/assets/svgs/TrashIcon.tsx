import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const TrashIcon: React.FC<SVGProps> = ({ 
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
};

export default TrashIcon;