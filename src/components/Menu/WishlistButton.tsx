// components/Menu/WishlistButton.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { IconButton } from '../ui';
import WishlistIcon from '../../assets/svgs/WishlistIcon';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import local from './WishlistButton.module.scss';

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
    <IconButton
      variant="ghost"
      size="md"
      shape="circle"
      className={`${local.btn} ${isWishlisted ? local.active : ''}`}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      tooltip={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={handleClick}
    >
      {isWishlisted ? (
        <WishlistFilledIcon width={18} height={18} fill="#e23744" />
      ) : (
        <WishlistIcon width={18} height={18} fill="#4d4d4d" />
      )}
    </IconButton>
  );
};

export default WishlistButton;