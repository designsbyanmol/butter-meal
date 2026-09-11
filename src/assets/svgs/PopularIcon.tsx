import React from "react";
interface PopularIconProps {
  width?: number;
  height?: number;
}

const PopularIcon: React.FC<PopularIconProps> = ({ width, height }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 65 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M34.7544 59.0452C43.2204 57.3482 54.1667 51.2579 54.1667 35.5095C54.1667 21.1781 43.6765 11.6348 36.1332 7.24982C34.4595 6.27677 32.5 7.55643 32.5 9.49251V14.4446C32.5 18.3497 30.8582 25.4776 26.2961 28.4424C23.9669 29.9561 21.4514 27.6906 21.1683 24.9272L20.9359 22.658C20.6657 20.0201 17.979 18.4187 15.8707 20.0271C12.0831 22.9164 8.125 27.976 8.125 35.5095C8.125 54.7687 22.4491 59.5836 29.611 59.5836C30.0276 59.5836 30.4655 59.5712 30.9213 59.5449C32.129 59.3927 30.9213 59.8136 34.7544 59.0452Z"
        fill="url(#paint0_linear_14_24)"
      />
      <path
        d="M21.6667 49.953C21.6667 57.0483 27.3848 59.2426 30.9213 59.5448C32.129 59.3926 30.9213 59.8135 34.7544 59.0452C37.5673 58.0512 40.625 55.4997 40.625 49.953C40.625 46.4384 38.408 44.2701 36.6711 43.255C36.1397 42.9444 35.5228 43.3355 35.4751 43.9489C35.3245 45.8938 33.4571 47.4429 32.1848 45.9642C31.0605 44.6574 30.5882 42.7483 30.5882 41.5271V39.9314C30.5882 38.9694 29.6197 38.3318 28.7923 38.8228C25.7158 40.648 21.6667 44.4028 21.6667 49.953Z"
        fill="url(#paint1_radial_14_24)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_14_24"
          x1="31.1458"
          y1="6.91632"
          x2="31.1458"
          y2="59.5836"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#F2D249" />
          <stop offset="1" stop-color="#F05926" />
        </linearGradient>
        <radialGradient
          id="paint1_radial_14_24"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(31 49.5) rotate(88.3634) scale(17.5071 15.887)"
        >
          <stop stop-color="white" />
          <stop offset="1" stop-color="#FFCD12" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default PopularIcon;
