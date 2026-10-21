// src/components/Admin/BadgeSelector.tsx
import React from 'react';
import { MenuItem, BadgeDefinition } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { Toggle } from '../ui';
import local from './BadgeSelector.module.scss';

interface BadgeSelectorProps {
  value: MenuItem['attributes'] | undefined;
  onChange: (next: MenuItem['attributes']) => void;
}

/**
 * Toggle each badge that is currently enabled in the tenant's form schema.
 * Labels and icons come from the schema, so renaming a badge in
 * FormBuilder updates it here too. Disabled badges are not rendered.
 *
 * The section header ("Badges" by default) is also editable via the
 * schema's `badgesLabel`.
 */
const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  value = {},
  onChange,
}) => {
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  const activeBadges: BadgeDefinition[] = (schema.badges ?? []).filter(
    (b) => b.enabled,
  );

  if (activeBadges.length === 0) {
    return null;
  }

  const sectionLabel = schema.badgesLabel ?? 'Badges';

  const toggle = (key: string) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className={local.wrap}>
      <label className={local.label}>{sectionLabel}</label>
      <div className={local.grid}>
        {activeBadges.map((badge) => (
          <div key={badge.key} className={local.item}>
            <Toggle
              checked={!!value[badge.key]}
              onChange={() => toggle(badge.key)}
              label={
                <span className={local.toggleLabel}>
                  {badge.image ? (
                    <img
                      src={badge.image}
                      alt=""
                      className={local.badgeIcon}
                    />
                  ) : null}
                  {badge.label}
                </span>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeSelector;