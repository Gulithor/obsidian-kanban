import update from 'immutability-helper';
import {
  render,
  unmountComponentAtNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'preact/compat';
import { RgbaStringColorPicker } from 'react-colorful';
import useOnclickOutside from 'react-cool-onclickoutside';

import { Icon } from '../components/Icon/Icon';
import { c, generateInstanceId } from '../components/helpers';
import { LaneColor, LaneColorSetting, LaneColorSettingTemplate } from '../components/types';
import { t } from '../lang/helpers';
import { colorToRgbaString } from './TagColorSettings';

interface SwatchProps {
  color: string;
  setColor: (c: string) => void;
}

function LaneColorSwatch({ color, setColor }: SwatchProps) {
  const init = useMemo(() => colorToRgbaString(color || '#ff0000'), []);
  const [localRGB, setLocalRGB] = useState(init?.rgba || 'rgba(255,0,0,1)');
  const [localHEX, setLocalHEX] = useState(init?.hexa || '#ff0000');
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Sync with external prop changes (e.g., settings reload)
  useEffect(() => {
    const n = colorToRgbaString(color || '#ff0000');
    if (n) {
      setLocalRGB(n.rgba);
      setLocalHEX(n.hexa);
    }
  }, [color]);

  const onChange = useCallback(
    (newColor: string) => {
      const n = colorToRgbaString(newColor);
      if (n) {
        setLocalRGB(n.rgba);
        setLocalHEX(n.hexa);
        setColor(n.hexa); // Store as hex to avoid YAML comma-parsing issues with rgba()
      }
    },
    [setColor]
  );

  const clickOutsideRef = useOnclickOutside(() => setIsPickerVisible(false));

  return (
    <div ref={clickOutsideRef} className={c('lane-color-swatch-wrapper')}>
      {isPickerVisible && (
        <div className={c('color-picker')}>
          <RgbaStringColorPicker color={localRGB} onChange={onChange} />
        </div>
      )}
      <div
        className={c('lane-color-swatch')}
        style={{ backgroundColor: localRGB }}
        onClick={() => setIsPickerVisible((v) => !v)}
        title={localHEX}
      >
        <span className={c('lane-color-swatch-hex')}>{localHEX}</span>
      </div>
    </div>
  );
}

interface ItemProps {
  entry: LaneColor;
  onDelete: () => void;
  onUpdate: (name: string, color: string) => void;
}

function Item({ entry, onDelete, onUpdate }: ItemProps) {
  return (
    <div className={c('setting-item-wrapper')}>
      <div className={c('setting-item')} style={{ alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          placeholder={t('Color name')}
          value={entry.name}
          style={{ flex: 1 }}
          onChange={(e) => onUpdate((e.target as HTMLInputElement).value, entry.color)}
        />
        <LaneColorSwatch
          color={entry.color}
          setColor={(color) => onUpdate(entry.name, color)}
        />
        <div className="clickable-icon" onClick={onDelete} aria-label={t('Delete')}>
          <Icon name="lucide-trash-2" />
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
            data: { name: '', color: '#ff0000' },
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
          {t(
            'Define colors available for lane borders. The name is used to identify the color in the lane menu.'
          )}
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
