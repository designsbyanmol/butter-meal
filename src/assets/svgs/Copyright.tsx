// assets/svgs/Copyright.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const Copyright: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_2018_1037)">
        <circle
          cx="12"
          cy="11.999"
          r="9"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 10.4181C14.9385 9.93451 14.78 9.51133 14.5246 9.14861C14.2692 8.78589 13.9415 8.50378 13.5415 8.30227C13.1415 8.10076 12.6923 8 12.1938 8C11.5538 8 10.9938 8.17128 10.5138 8.51385C10.0369 8.85306 9.66462 9.32494 9.39692 9.92947C9.13231 10.5306 9 11.2242 9 12.0101C9 12.7825 9.12923 13.4694 9.38769 14.0705C9.64615 14.6717 10.0154 15.1436 10.4954 15.4861C10.9754 15.8287 11.5477 16 12.2123 16C12.7354 16 13.1938 15.8942 13.5877 15.6826C13.9846 15.4677 14.3031 15.1788 14.5431 14.8161C14.7862 14.45 14.9385 14.0386 15 13.5819"
          stroke={fill}
          strokeWidth="2"
        />
      </g>

    </svg>
  );
};

export default Copyright;