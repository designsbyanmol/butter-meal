// components/Admin/CustomizationEditor.tsx
import React from 'react';
import { CustomizationOption } from '../../types';
import { Button, IconButton, Input, FormField, Select } from '../ui';
import { CloseIcon } from '../../assets/svgs';
import local from './CustomizationEditor.module.scss';

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

  // -------- Default option picker --------
  const buildDefaultOptions = (option: CustomizationOption) => [
    { value: '', label: '- None -' },
    ...option.choices
      .filter((c) => c.name.trim() !== '')
      .map((c) => ({
        value: c.name,
        label: c.price > 0 ? `${c.name} (+Rs${c.price})` : c.name,
      })),
  ];

  return (
    <div className={local.section}>
      <div className={local.header}>
        <h4>Customization</h4>
        <Button size="sm" variant="secondary" onClick={addOption}>
          + Add
        </Button>
      </div>

      {options.length === 0 ? (
        <p className={local.empty}>
          No customization options yet. Click "+ Add" to create one.
        </p>
      ) : (
        <div className={local.list}>
          {options.map((option, optIdx) => (
            <div key={optIdx} className={local.item}>
              <div className={local.itemHeader}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label="Remove option"
                  onClick={() => removeOption(optIdx)}
                >
                  <CloseIcon width={18} height={18} fill="#4d4d4d" />
                </IconButton>
              </div>

              <FormField label={`Option #${optIdx + 1} Name`}>
                <Input
                  value={option.name}
                  onChange={(e) => updateOptionName(optIdx, e.target.value)}
                  placeholder="e.g., Sauce, Size, Add-ons"
                  inputSize="sm"
                />
              </FormField>

              <FormField label="Choices">
                <div className={local.choices}>
                  {option.choices.map((choice, choiceIdx) => (
                    <div key={choiceIdx} className={local.choiceRow}>
                      <Input
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
                        inputSize="sm"
                      />
                      <Input
                        type="number"
                        value={choice.price || ''}
                        onFocus={(e) => {
                          // Blank the visible "0" so the user can type
                          // straight in. Model value stays 0 until typing.
                          if (choice.price === 0) {
                            e.currentTarget.value = '';
                          }
                        }}
                        onBlur={(e) => {
                          // If left empty, snap back to 0 in the model.
                          if (e.currentTarget.value.trim() === '') {
                            updateChoice(optIdx, choiceIdx, 'price', 0);
                          }
                        }}
                        onChange={(e) =>
                          updateChoice(
                            optIdx,
                            choiceIdx,
                            'price',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="+Rs"
                        min={0}
                        step={1}
                        inputSize="sm"
                        className={local.priceInput}
                      />
                      <IconButton
                        variant="danger"
                        size="sm"
                        aria-label="Remove choice"
                        disabled={option.choices.length <= 1}
                        onClick={() => removeChoice(optIdx, choiceIdx)}
                      >
                        <CloseIcon width={16} height={16} fill="#a62d2d" />
                      </IconButton>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  block
                  onClick={() => addChoice(optIdx)}
                  style={{ marginTop: 8 }}
                >
                  + Add Option
                </Button>
              </FormField>

              <FormField label="Default Option">
                <Select
                  value={option.default || ''}
                  onChange={(e) => setDefault(optIdx, e.target.value)}
                  options={buildDefaultOptions(option)}
                />
              </FormField>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomizationEditor;