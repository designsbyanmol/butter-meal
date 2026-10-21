// src/components/Auth/StoreLoginModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Input, Banner, EmptyState, Avatar } from '../ui';
import { SearchIcon, RightArrow } from '../../assets/svgs';
import { supabaseService } from '../../services/supabase.service';
import { Tenant } from '../../contexts/TenantContext';
import local from './Auth.module.scss';

interface StoreLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StoreLoginModal: React.FC<StoreLoginModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setError('');
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    supabaseService
      .getAllTenants()
      .then((list) => {
        if (cancelled) return;
        const stores = list.filter((t) => t.slug !== 'main');
        setTenants(stores);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[StoreLoginModal] Failed to load stores:', err);
        setError('Failed to load stores. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const trimmedQuery = query.trim();
  const hasMinChars = trimmedQuery.length >= 3;

  const filtered = hasMinChars
    ? tenants.filter((t) => {
        const q = trimmedQuery.toLowerCase();
        return (
          t.displayName.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSelectStore = (slug: string) => {
    const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
    window.location.href = `${window.location.origin}${dir}p/admin.html?t=${slug}_admin`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Login"
      size="md"
      mobileFullScreen
      disableBackdropClose={true}
    >
      <div className={local.storeLoginBody}>
        {error && (
          <Banner variant="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        <div className={local.searchWrap}>
          <Input
            placeholder="Search your store by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={
              <SearchIcon
                width={20}
                height={20}
                fill="#b8c4d4"
                aria-hidden
              />
            }
            autoFocus
            inputSize="lg"
          />
        </div>

        {isLoading ? (
          <div className={local.loadingState}>
            <span className={local.spinner} />
            Loading...
          </div>
        ) : !hasMinChars ? (
          <div className={local.emptySearch}>
            <SearchIcon width={36} height={36} fill="#e2e8f0" />
            <p>
              If you already have a store, just search and get yourself
              logged in.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No stores found"
            description={`We couldn't find a store matching "${trimmedQuery}".`}
          />
        ) : (
          <ul className={local.storeList}>
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={local.storeItem}
                  onClick={() => handleSelectStore(t.slug)}
                >
                  <Avatar
                    name={t.displayName}
                    src={t.avatarUrl || undefined}
                    role="admin"
                    size="md"
                  />
                  <strong className={local.storeName}>{t.displayName}</strong>
                  <span className={local.redirectIcon}>
                    <RightArrow width={18} height={18} fill="#b3b3b3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default StoreLoginModal;