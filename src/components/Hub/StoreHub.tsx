// src/components/Hub/StoreHub.tsx
import React, { useEffect, useState } from 'react';
import {
  listHubStores,
  removeHubStore,
  HubEntry,
} from '../../pwa/hubStorage';
import { HUB_ICON_URL, HUB_APP_NAME } from '../../pwa/manifest';
import { Button, Card, EmptyState, Input } from '../ui';
import { TrashIcon } from '../../assets/svgs';
import local from './StoreHub.module.scss';

const StoreHub: React.FC = () => {
  const [stores, setStores] = useState<HubEntry[]>([]);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState('');

  const refresh = () => setStores(listHubStores());
  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'butter_hub:stores:v1') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const openStore = (url: string) => {
    window.location.href = url;
  };

  const handleRemove = (slug: string) => {
    if (!window.confirm('Remove this store from your hub?')) return;
    removeHubStore(slug);
    refresh();
  };

  const handleAddByUrl = () => {
    setError('');
    try {
      const u = new URL(manualUrl);
      const t = u.searchParams.get('t') || '';
      const slug = t.replace(/_admin$/, '');
      if (!slug) {
        setError(
          'That URL does not contain a store parameter (?t=...).',
        );
        return;
      }
      // We don't know the displayName without hitting the tenant row;
      // fetch is optional. For simplicity just use the slug.
      const entry: HubEntry = {
        slug,
        displayName: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        url: u.toString(),
        iconUrl: HUB_ICON_URL,
        addedAt: new Date().toISOString(),
      };
      // Reuse addHubStore
      import('../../pwa/hubStorage').then((m) => {
        m.addHubStore(entry);
        refresh();
        setManualUrl('');
      });
    } catch {
      setError('That is not a valid URL.');
    }
  };

  return (
    <div className={local.page}>
      <header className={local.header}>
        <img src={HUB_ICON_URL} alt="" className={local.logo} />
        <div>
          <h1 className={local.title}>{HUB_APP_NAME}</h1>
          <p className={local.subtitle}>
            Your saved stores, one tap away.
          </p>
        </div>
      </header>

      {stores.length === 0 ? (
        <EmptyState
          title="No stores yet"
          description="Visit any store and tap the download icon in the header to add it here."
        />
      ) : (
        <div className={local.grid}>
          {stores.map((s) => (
            <Card key={s.slug} padding="md" className={local.card}>
              <div className={local.cardBody} onClick={() => openStore(s.url)}>
                <img src={s.iconUrl} alt="" className={local.cardIcon} />
                <div className={local.cardText}>
                  <div className={local.cardName}>{s.displayName}</div>
                  <div className={local.cardSlug}>{s.slug}</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(s.slug)}
                leftIcon={<TrashIcon width={14} height={14} fill="#a62d2d" />}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className={local.addRow}>
        <Input
          value={manualUrl}
          onChange={(e) => {
            setManualUrl(e.target.value);
            setError('');
          }}
          placeholder="Paste a store URL (…?t=store-slug)"
          invalid={!!error}
        />
        <Button onClick={handleAddByUrl}>Add</Button>
      </div>
      {error && <div className={local.error}>{error}</div>}
    </div>
  );
};

export default StoreHub;