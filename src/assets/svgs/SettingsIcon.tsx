// src/assets/svgs/SettingsIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const SettingsIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_29125)">
        <circle cx="12" cy="12" r="2" stroke={fill} strokeWidth="2" />
        <path
          d="M3.40061 9.3446C3.79371 8.07052 4.46882 6.88131 5.39856 5.87922L6.99994 6.80377C8.33328 7.57357 9.99995 6.61132 9.99995 5.07172L9.99994 3.2226C11.3327 2.91847 12.7001 2.92841 14 3.22501L14 5.07175C14 6.61135 15.6667 7.5736 17 6.8038L18.6011 5.87944C19.0491 6.36352 19.4505 6.9047 19.7942 7.50001C20.1379 8.0953 20.4059 8.71353 20.6011 9.34354L19 10.2679C17.6667 11.0377 17.6667 12.9622 19 13.732L20.5994 14.6554C20.2063 15.9295 19.5312 17.1187 18.6014 18.1208L17 17.1962C15.6667 16.4264 14 17.3887 14 18.9283L14 20.7774C12.6673 21.0816 11.2999 21.0716 9.99994 20.775L9.99994 18.9282C9.99994 17.3886 8.33328 16.4264 6.99994 17.1962L5.39889 18.1205C4.95089 17.6365 4.54946 17.0953 4.20577 16.5C3.86207 15.9047 3.59411 15.2865 3.3989 14.6564L4.99992 13.7321C6.33325 12.9623 6.33325 11.0378 4.99992 10.268L3.40061 9.3446Z"
          stroke={fill}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>

    </svg>
  );
};

export default SettingsIcon;