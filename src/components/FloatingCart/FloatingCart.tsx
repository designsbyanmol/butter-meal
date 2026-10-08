// components/FloatingCart/FloatingCart.tsx
import React from 'react';
import { RightArrow } from '../../assets/svgs';
import local from './FloatingCart.module.scss';

interface FloatingCartProps {
  itemCount: number;
  onClick: () => void;
}

const FloatingCart: React.FC<FloatingCartProps> = ({ itemCount, onClick }) => {
  return (
    <button className={local.floatingCart} onClick={onClick}>
      <span className={local.main}>
        <span className={local.label}>{itemCount} Item Added!</span>
        <span className={local.wrap}>
          <span className={local.wrap_in}>View</span>
          <RightArrow width={16} height={16} fill="#fff" />
        </span>
      </span>
    </button>
  );
};

export default FloatingCart;