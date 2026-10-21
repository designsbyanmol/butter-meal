import React from 'react';
import { RightArrow } from '../../assets/svgs';
import styles from './FloatingCart.module.scss';

interface FloatingCartProps {
  itemCount: number;
  onClick: () => void;
}

const FloatingCart: React.FC<FloatingCartProps> = ({ itemCount, onClick }) => {
  return (
    <button className={styles.floatingCart} onClick={onClick}>
      <span className={styles.main}>
        <span className={styles.label}>{itemCount} Item Added!</span>
        <span className={styles.wrap}>
          <span className={styles.wrap_in}>View</span>
          <RightArrow width={16} height={16} fill="#fff" />
        </span>
      </span>
    </button>
  );
};

export default FloatingCart;