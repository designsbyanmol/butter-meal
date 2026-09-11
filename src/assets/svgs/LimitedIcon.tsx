import React from "react";
interface LimitedIconProps {
  width?: number;
  height?: number;
}

const LimitedIcon: React.FC<LimitedIconProps> = ({ width, height }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 65 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="33" cy="33" r="25.5" fill="#DFDFDF" stroke="white" />
      <path
        d="M57.9999 33C57.9999 46.8071 46.807 58 32.9999 58C23.8405 58 15.8315 53.0743 11.4775 45.7272C14.8182 46.6364 25.2727 48.9091 40.2727 40.2727C46.1815 36.8707 48.9089 33 57.9999 33Z"
        fill="#00C3D0"
      />
    </svg>
  );
};

export default LimitedIcon;
