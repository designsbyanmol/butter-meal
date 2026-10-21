// assets/svgs/LocationIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const LocationIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_30194)">
        <rect
          x="12"
          y="11"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 16.5L12 22L6.5 16.5C3.46244 13.4624 3.46244 8.53757 6.5 5.5C9.53757 2.46244 14.4624 2.46244 17.5 5.5C20.5376 8.53757 20.5376 13.4624 17.5 16.5Z"
          stroke={fill}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default LocationIcon;