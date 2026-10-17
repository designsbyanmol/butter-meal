// assets/svgs/UsersIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const UsersIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_29981)">
        <path
          d="M5.99988 20H17.9999C19.1044 20 19.9999 19.1046 19.9999 18C19.9999 15.7909 18.209 14 15.9999 14H7.99988C5.79074 14 3.99988 15.7909 3.99988 18C3.99988 19.1046 4.89531 20 5.99988 20Z"
          stroke={fill}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="11.9999" cy="7" r="3" stroke={fill} strokeWidth="2" />
      </g>

    </svg>
  );
};

export default UsersIcon;