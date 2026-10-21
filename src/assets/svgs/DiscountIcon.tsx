// assets/svgs/DiscountIcon.tsx
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
      <g clipPath="url(#clip0_78_30467)">
        <path
          d="M8.20861 5.11024L7.1596 5.05225C5.96956 4.98646 4.98646 5.96956 5.05225 7.1596L5.11024 8.20861C5.14377 8.81511 4.89986 9.40398 4.44729 9.80913L3.66452 10.5099C2.77651 11.3048 2.77651 12.6952 3.66452 13.4901L4.44729 14.1909C4.89986 14.596 5.14377 15.1849 5.11024 15.7914L5.05225 16.8404C4.98646 18.0304 5.96956 19.0135 7.1596 18.9477L8.20861 18.8898C8.81511 18.8562 9.40398 19.1001 9.80913 19.5527L10.5099 20.3355C11.3048 21.2235 12.6952 21.2235 13.4901 20.3355L14.1909 19.5527C14.596 19.1001 15.1849 18.8562 15.7914 18.8898L16.8404 18.9477C18.0304 19.0135 19.0135 18.0304 18.9477 16.8404L18.8898 15.7914C18.8562 15.1849 19.1001 14.596 19.5527 14.1909L20.3355 13.4901C21.2235 12.6952 21.2235 11.3048 20.3355 10.5099L19.5527 9.80913C19.1001 9.40398 18.8562 8.81511 18.8898 8.20861L18.9477 7.1596C19.0135 5.96956 18.0304 4.98646 16.8404 5.05225L15.7914 5.11024C15.1849 5.14377 14.596 4.89986 14.1909 4.44729L13.4901 3.66452C12.6952 2.77651 11.3048 2.77651 10.5099 3.66452L9.80913 4.44729C9.40398 4.89986 8.81511 5.14377 8.20861 5.11024Z"
          stroke={fill}
          strokeWidth="2"
        />
        <rect
          x="9.5"
          y="9.5"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect
          x="14.5"
          y="14.5"
          width="0.01"
          height="0.01"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M15 9L9 15"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default DiscountIcon;