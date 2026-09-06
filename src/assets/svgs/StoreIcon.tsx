import React from "react";

interface StoreIconProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
}
const StoreIcon: React.FC<StoreIconProps> = ({
  width = 20,
  height = 20,
  fill = "currentColor",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 9H21V7L19 4H5L3 7V9ZM4 10V20H20V10H4ZM10 14H14V16H10V14Z"
        fill={fill}
      />
      <path d="M4 10V20H20V10H4ZM8 14H16V16H8V14Z" fill={fill} opacity="0.5" />
    </svg>
  );
};
export default StoreIcon;
