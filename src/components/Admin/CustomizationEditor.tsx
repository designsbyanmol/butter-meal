// components/Admin/CustomizationEditor.tsx
import React from 'react';
import { CustomizationOption } from '../../types';
import styles from './CustomizationEditor.module.scss';
import { CloseIcon } from '../../assets/svgs';

interface CustomizationEditorProps {
  options: CustomizationOption[];
  onChange: (next: CustomizationOption[]) => void;
}

const CustomizationEditor: React.FC<CustomizationEditorProps> = ({
  options,
  onChange,
}) => {
  const addOption = () => {
    onChange([
      ...options,
      { name: '', choices: [{ name: '', price: 0 }], default: undefined },
    ]);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const updateOptionName = (idx: number, name: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], name };
    onChange(next);
  };

  const addChoice = (idx: number) => {
    const next = [...options];
    next[idx] = {
      ...next[idx],
      choices: [...next[idx].choices, { name: '', price: 0 }],
    };
    onChange(next);
  };

  const removeChoice = (optIdx: number, choiceIdx: number) => {
    const next = [...options];
    const removedName = next[optIdx].choices[choiceIdx].name;
    next[optIdx] = {
      ...next[optIdx],
      choices: next[optIdx].choices.filter((_, i) => i !== choiceIdx),
      default:
        next[optIdx].default === removedName
          ? undefined
          : next[optIdx].default,
    };
    onChange(next);
  };

  const updateChoice = (
    optIdx: number,
    choiceIdx: number,
    field: 'name' | 'price',
    value: string | number,
  ) => {
    const next = [...options];
    const choices = [...next[optIdx].choices];
    const oldName = choices[choiceIdx].name;
    choices[choiceIdx] = { ...choices[choiceIdx], [field]: value };

    let newDefault = next[optIdx].default;
    if (field === 'name' && newDefault === oldName) {
      newDefault = String(value);
    }

    next[optIdx] = { ...next[optIdx], choices, default: newDefault };
    onChange(next);
  };

  const setDefault = (optIdx: number, choiceName: string) => {
    const next = [...options];
    next[optIdx] = { ...next[optIdx], default: choiceName || undefined };
    onChange(next);
  };

  return (
    <div className={styles.customizationSection}>
      <div className={styles.sectionHeader}>
        <h4>Customization</h4>
        <button
          type="button"
          className={styles.addCustomizationBtn}
          onClick={addOption}
        >
          + Add
        </button>
      </div>

      {options.length === 0 ? (
        <p className={styles.emptyCustomization}>
          No customization options yet. Click "+ Add" to create one.
        </p>
      ) : (
        <div className={styles.customizationList}>
          {options.map((option, optIdx) => (
            <div key={optIdx} className={styles.customizationItem}>
              <div className={styles.customizationHeader}>
                <button
                  type="button"
                  className={styles.removeCustomizationBtn}
                  onClick={() => removeOption(optIdx)}
                  aria-label="Remove option"
                >
                  <CloseIcon width={18} height={18} fill="#4d4d4d" />
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Option #{optIdx + 1} Name</label>
                <input
                  type="text"
                  value={option.name}
                  onChange={(e) => updateOptionName(optIdx, e.target.value)}
                  placeholder="e.g., Sauce, Size, Add-ons"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Choices</label>
                <div className={styles.choicesList}>
                  {option.choices.map((choice, choiceIdx) => (
                    <div key={choiceIdx} className={styles.choiceRow}>
                      <input
                        type="text"
                        value={choice.name}
                        onChange={(e) =>
                          updateChoice(
                            optIdx,
                            choiceIdx,
                            'name',
                            e.target.value,
                          )
                        }
                        placeholder={`Option ${choiceIdx + 1} name`}
                        className={styles.choiceNameInput}
                      />
                      <input
                        type="number"
                        value={choice.price || ''}
                        onChange={(e) =>
                          updateChoice(
                            optIdx,
                            choiceIdx,
                            'price',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="+Rs"
                        min="0"
                        step="1"
                        className={styles.choicePriceInput}
                      />
                      <button
                        type="button"
                        className={styles.removeChoiceBtn}
                        onClick={() => removeChoice(optIdx, choiceIdx)}
                        disabled={option.choices.length <= 1}
                        aria-label="Remove choice"
                      >
                        <CloseIcon width={18} height={18} fill="#a62d2d" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.addChoiceBtn}
                  onClick={() => addChoice(optIdx)}
                >
                  + Add Option
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Default Option</label>
                <select
                  value={option.default || ''}
                  onChange={(e) => setDefault(optIdx, e.target.value)}
                  className={styles.defaultSelect}
                >
                  <option value="">— None —</option>
                  {option.choices
                    .filter((c) => c.name.trim() !== '')
                    .map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                        {c.price > 0 ? ` (+Rs${c.price})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomizationEditor;