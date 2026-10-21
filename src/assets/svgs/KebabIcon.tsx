// assets/svgs/KebabIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const KebabIcon: React.FC<SVGProps> = ({
  width = 24,
  height = 24,
  fill = 'currentColor',
  className,
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
      <g clipPath="url(#clip0_78_29363)">
        <rect
          x="12"
          y="11.9991"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect
          x="12"
          y="4.99908"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect
          x="12"
          y="18.9991"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default KebabIcon;