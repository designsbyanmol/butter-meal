// components/Menu/WishlistButton.tsx
import React from 'react';
import { MenuItem } from '../../types';
import WishlistIcon from '../../assets/svgs/WishlistIcon';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import styles from './WishlistButton.module.scss';

interface WishlistButtonProps {
  item: MenuItem;
  isWishlisted: boolean;
  onToggle: (item: MenuItem) => void;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({
  item,
  isWishlisted,
  onToggle,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (typeof onToggle !== 'function') {
      console.error(
        '[WishlistButton] onToggle prop is missing. Check that <Menu /> passes `onToggleWishlist`.',
      );
      return;
    }

    onToggle(item);
  };

  return (
    <button
      type="button"
      className={`${styles.btn} ${isWishlisted ? styles.active : ''}`}
      onClick={handleClick}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isWishlisted ? (
        <WishlistFilledIcon width={18} height={18} fill="#e23744" />
      ) : (
        <WishlistIcon width={18} height={18} fill="#4d4d4d" />
      )}
    </button>
  );
};

export default WishlistButton;