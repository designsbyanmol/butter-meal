// src/components/Menu/WishlistPanel.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { Drawer, IconButton, EmptyState, Button } from '../ui';
import { useWishlist } from '../../hooks/useWishlist';
import { CloseIcon } from '../../assets/svgs';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import { formatRupees } from '../../utils/subscription';
import local from './WishlistPanel.module.scss';

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

  const handleClearAll = () => {
    if (count === 0) return;
    if (!window.confirm(`Remove all ${count} item${count === 1 ? '' : 's'} from your wishlist?`)) {
      return;
    }
    clear();
  };

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
            onClick={handleClearAll}
          >
            Clear all
          </button>
        ) : undefined
      }
      footer={
        count > 0 ? (
          <Button block variant="ghost" onClick={onClose}>
            Continue browsing
          </Button>
        ) : undefined
      }
    >
      {count === 0 ? (
        <EmptyState
          icon={<WishlistFilledIcon width={42} height={42} fill="#dcdcdc" />}
          title="Your wishlist is empty"
          description="Tap the heart on any item to save it here for later."
        />
      ) : (
        <ul className={local.list}>
          {items.map((item) => {
            const discount = Number(item.discount ?? 0);
            const hasDiscount = discount > 0 && discount <= 100;
            const finalPrice = hasDiscount
              ? Math.round(item.price * (1 - discount / 100))
              : item.price;

            return (
              <li key={item.id} className={local.row}>
                <button
                  type="button"
                  className={local.rowMain}
                  onClick={() => {
                    onItemClick(item);
                    onClose();
                  }}
                >
                  <div className={local.thumbWrap}>
                    <img
                      src={item.img}
                      alt={item.name}
                      className={local.thumb}
                      loading="lazy"
                    />
                    {!item.inStock && (
                      <span className={local.outOfStockPill}>
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className={local.info}>
                    <div className={local.name}>{item.name}</div>

                    {item.category && (
                      <div className={local.category}>{item.category}</div>
                    )}

                    <div className={local.priceRow}>
                      <span className={local.price}>
                        {formatRupees(finalPrice)}
                      </span>
                      {hasDiscount && (
                        <del className={local.priceStrike}>
                          {formatRupees(item.price)}
                        </del>
                      )}
                    </div>
                  </div>
                </button>

                <IconButton
                  variant="danger"
                  size="sm"
                  shape="circle"
                  className={local.removeBtn}
                  aria-label={`Remove ${item.name} from wishlist`}
                  tooltip="Remove from wishlist"
                  onClick={() => remove(item.id)}
                >
                  <CloseIcon width={14} height={14} fill="#a62d2d" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
};

export default WishlistPanel;