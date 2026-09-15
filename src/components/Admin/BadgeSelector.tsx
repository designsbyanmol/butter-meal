// components/Admin/BadgeSelector.tsx
import React from 'react';
import { MenuItem } from '../../types';
import styles from './BadgeSelector.module.scss';

interface BadgeSelectorProps {
  value: MenuItem['attributes'] | undefined;
  onChange: (next: MenuItem['attributes']) => void;
}

const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  value = {},
  onChange,
}) => {
  const toggle = (key: keyof NonNullable<MenuItem['attributes']>) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className={styles.formGroup}>
      <label>Badges</label>
      <div className={styles.badgeSelector}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isPopular}
            onChange={() => toggle('isPopular')}
          />
          Popular
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isNew}
            onChange={() => toggle('isNew')}
          />
          New
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isChefSpecial}
            onChange={() => toggle('isChefSpecial')}
          />
          Chef's Special
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isLimited}
            onChange={() => toggle('isLimited')}
          />
          Limited
        </label>
      </div>
    </div>
  );
};

export default BadgeSelector;