import update from 'immutability-helper';
import { render, unmountComponentAtNode, useState } from 'preact/compat';

import { Icon } from '../components/Icon/Icon';
import { c, generateInstanceId } from '../components/helpers';
import { LaneColor, LaneColorSetting, LaneColorSettingTemplate } from '../components/types';
import { t } from '../lang/helpers';
import { ColorPickerInput } from './TagColorSettings';

interface ItemProps {
  entry: LaneColor;
  onDelete: () => void;
  onUpdate: (name: string, color: string) => void;
}

function Item({ entry, onDelete, onUpdate }: ItemProps) {
  return (
    <div className={c('setting-item-wrapper')}>
      <div className={c('setting-item')}>
        <div className={c('setting-controls-wrapper')}>
          <div className={c('setting-input-wrapper')}>
            <div>
              <div className={c('setting-item-label')}>{t('Lane color name')}</div>
              <input
                type="text"
                placeholder={t('Color name')}
                value={entry.name}
                onChange={(e) => onUpdate((e.target as HTMLInputElement).value, entry.color)}
              />
            </div>
            <div>
              <div className={c('setting-item-label')}>{t('Color')}</div>
              <ColorPickerInput
                color={entry.color}
                setColor={(color) => onUpdate(entry.name, color)}
                defaultColor="rgba(255,0,0,1)"
              />
            </div>
          </div>
        </div>
        <div className={c('setting-button-wrapper')}>
          <div className="clickable-icon" onClick={onDelete} aria-label={t('Delete')}>
            <Icon name="lucide-trash-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface LaneColorSettingsProps {
  dataKeys: LaneColorSetting[];
  onChange: (settings: LaneColorSetting[]) => void;
}

function LaneColorSettings({ dataKeys, onChange }: LaneColorSettingsProps) {
  const [keys, setKeys] = useState(dataKeys);

  const updateKeys = (next: LaneColorSetting[]) => {
    onChange(next);
    setKeys(next);
  };

  const addKey = () => {
    updateKeys(
      update(keys, {
        $push: [
          {
            ...LaneColorSettingTemplate,
            id: generateInstanceId(),
            data: { name: '', color: 'rgba(255,0,0,1)' },
          },
        ],
      })
    );
  };

  const deleteKey = (i: number) => updateKeys(update(keys, { $splice: [[i, 1]] }));

  const updateKey = (i: number) => (name: string, color: string) => {
    updateKeys(update(keys, { [i]: { data: { name: { $set: name }, color: { $set: color } } } }));
  };

  return (
    <div className={c('tag-color-input-wrapper')}>
      <div className="setting-item-info">
        <div className="setting-item-name">{t('Lane colors')}</div>
        <div className="setting-item-description">
          {t('Define colors available for lane borders. The name is used to identify the color in the lane menu.')}
        </div>
      </div>
      <div>
        {keys.map((key, i) => (
          <Item
            key={key.id}
            entry={key.data}
            onDelete={() => deleteKey(i)}
            onUpdate={updateKey(i)}
          />
        ))}
      </div>
      <button className={c('add-tag-color-button')} onClick={addKey}>
        {t('Add lane color')}
      </button>
    </div>
  );
}

export function renderLaneColorSettings(
  containerEl: HTMLElement,
  keys: LaneColorSetting[],
  onChange: (keys: LaneColorSetting[]) => void
) {
  render(<LaneColorSettings dataKeys={keys} onChange={onChange} />, containerEl);
}

export function cleanUpLaneColorSettings(containerEl: HTMLElement) {
  unmountComponentAtNode(containerEl);
}
