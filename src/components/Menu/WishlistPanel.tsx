// components/Menu/WishlistPanel.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { Drawer, IconButton, EmptyState } from '../ui';
import { useWishlist } from '../../hooks/useWishlist';
import { CloseIcon, WishlistIcon } from '../../assets/svgs';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import local from './WishlistPanel.module.scss';
import { formatRupees } from '../../utils/subscription';

interface WishlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: MenuItem) => void;
}

const WishlistPanel: React.FC<WishlistPanelProps> = ({
  isOpen,
  onClose,
  onItemClick,
}) => {
  const { items, count, remove, clear } = useWishlist();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      title={
        <>
          Wishlist
          {count > 0 && <span className={local.count}>{count}</span>}
        </>
      }
      headerActions={
        count > 0 ? (
          <button
            type="button"
            className={local.clearBtn}
            onClick={clear}
          >
            Clear all
          </button>
        ) : undefined
      }
    >
      {count === 0 ? (
        <EmptyState
          icon={<WishlistFilledIcon width={42} height={42} fill="#e6ded7" />}
          title="Your wishlist is empty"
        />
      ) : (
        <ul className={local.list}>
          {items.map((item) => (
            <li key={item.id} className={local.row}>
              <button
                type="button"
                className={local.rowMain}
                onClick={() => {
                  onItemClick(item);
                  onClose();
                }}
              >
                <img
                  src={item.img}
                  alt={item.name}
                  className={local.thumb}
                  loading="lazy"
                />
                <div className={local.info}>
                  <div className={local.name}>{item.name}</div>
                  <div className={local.price}>{formatRupees(item.price)}</div>
                </div>
              </button>
              <IconButton
                variant="danger"
                size="sm"
                shape="circle"
                className={local.removeBtn}
                aria-label="Remove from wishlist"
                onClick={() => remove(item.id)}
              >
                <CloseIcon width={14} height={14} fill="#a62d2d" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
};

export default WishlistPanel;