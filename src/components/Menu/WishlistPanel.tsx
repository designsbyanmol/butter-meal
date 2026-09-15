// components/Menu/WishlistPanel.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { useWishlist } from '../../hooks/useWishlist';
import { CloseIcon } from '../../assets/svgs';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import styles from './WishlistPanel.module.scss';

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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wishlist"
      >
        <div className={styles.header}>
          <h2>
            <WishlistFilledIcon width={18} height={18} fill="#e23744" />
            Wishlist
            {count > 0 && <span className={styles.count}>{count}</span>}
          </h2>
          <div className={styles.headerActions}>
            {count > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={clear}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon width={18} height={18} fill="#4d4d4d" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {count === 0 ? (
            <div className={styles.empty}>
              <WishlistFilledIcon width={42} height={42} fill="#e6ded7" />
              <p>Your wishlist is empty</p>
              <span>Tap the ♡ on any dish to save it here.</span>
            </div>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id} className={styles.row}>
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => {
                      onItemClick(item);
                      onClose();
                    }}
                  >
                    <img
                      src={item.img}
                      alt={item.name}
                      className={styles.thumb}
                      loading="lazy"
                    />
                    <div className={styles.info}>
                      <div className={styles.name}>{item.name}</div>
                      {item.category && (
                        <div className={styles.meta}>{item.category}</div>
                      )}
                      <div className={styles.price}>Rs{item.price}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => remove(item.id)}
                    aria-label="Remove from wishlist"
                  >
                    <CloseIcon width={14} height={14} fill="#a62d2d" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default WishlistPanel;