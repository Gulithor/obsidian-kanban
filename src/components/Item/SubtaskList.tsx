import { TFile, TFolder } from 'obsidian';
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks';

import { Icon } from '../Icon/Icon';
import { StateManager } from 'src/StateManager';
import { useNestedEntityPath } from 'src/dnd/components/Droppable';

import { KanbanContext } from '../context';
import { c } from '../helpers';
import { Item } from '../types';

interface Subtask {
  text: string;
  checked: boolean;
  lineIndex: number;
}

const SUBTASKS_HEADING_RE = /^#{1,6}\s+Subtasks\s*$/im;

function parseSubtasks(content: string): Subtask[] {
  const lines = content.split('\n');
  let inSection = false;
  const result: Subtask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s+Subtasks\s*$/i.test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && /^#{1,6}\s/.test(line)) break;

    if (inSection) {
      const m = line.match(/^\s*-\s+\[([x ]?)\]\s+(.+)/i);
      if (m) {
        result.push({
          checked: m[1].toLowerCase() === 'x',
          text: m[2].trim(),
          lineIndex: i,
        });
      }
    }
  }

  return result;
}

async function toggleSubtaskInFile(app: any, file: TFile, lineIndex: number, checked: boolean) {
  const content = await app.vault.read(file);
  const lines = content.split('\n');
  lines[lineIndex] = checked
    ? lines[lineIndex].replace(/\[x\]/i, '[ ]')
    : lines[lineIndex].replace(/\[ \]/, '[x]');
  await app.vault.modify(file, lines.join('\n'));
}

async function deleteSubtaskFromFile(app: any, file: TFile, lineIndex: number) {
  const content = await app.vault.read(file);
  const lines = content.split('\n');
  lines.splice(lineIndex, 1);
  await app.vault.modify(file, lines.join('\n'));
}

async function addSubtaskToFile(app: any, file: TFile, taskText: string) {
  let content = await app.vault.read(file);
  const newTask = `- [ ] ${taskText}`;

  if (SUBTASKS_HEADING_RE.test(content)) {
    const lines = content.split('\n');
    let insertIndex = lines.length;
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s+Subtasks\s*$/i.test(lines[i])) {
        inSection = true;
        continue;
      }
      if (inSection && /^#{1,6}\s/.test(lines[i])) {
        insertIndex = i;
        break;
      }
    }

    lines.splice(insertIndex, 0, newTask);
    content = lines.join('\n');
  } else {
    content = content.trimEnd() + '\n\n## Subtasks\n\n' + newTask + '\n';
  }

  await app.vault.modify(file, content);
}

function TrashButton({ onClick }: { onClick: () => void }) {
  return (
    <a
      className={`${c('item-subtask-delete')} clickable-icon`}
      aria-label="Delete subtask"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name="lucide-trash-2" />
    </a>
  );
}

export interface SubtaskListProps {
  item: Item;
  stateManager: StateManager;
  showAddInput: boolean;
  onAddComplete: () => void;
}

export function SubtaskList({ item, stateManager, showAddInput, onAddComplete }: SubtaskListProps) {
  const { boardModifiers } = useContext(KanbanContext);
  const path = useNestedEntityPath();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const app = stateManager.app as any;

  const file = item.data.metadata.file;

  useEffect(() => {
    if (!file) {
      setSubtasks([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const content = await app.vault.read(file);
        if (!cancelled) setSubtasks(parseSubtasks(content));
      } catch {
        if (!cancelled) setSubtasks([]);
      }
    };

    load();

    const handler = app.vault.on('modify', (modified: TFile) => {
      if (modified === file) load();
    });

    return () => {
      cancelled = true;
      app.vault.offref(handler);
    };
  }, [file]);

  useEffect(() => {
    if (showAddInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showAddInput]);

  const handleToggle = useCallback(
    async (subtask: Subtask) => {
      if (!file) return;
      await toggleSubtaskInFile(app, file, subtask.lineIndex, subtask.checked);
    },
    [file, app]
  );

  const handleDelete = useCallback(
    async (subtask: Subtask) => {
      if (!file) return;
      await deleteSubtaskFromFile(app, file, subtask.lineIndex);
    },
    [file, app]
  );

  const handleSubmit = useCallback(async () => {
    const text = inputValue.trim();

    if (!text) {
      setInputValue('');
      onAddComplete();
      return;
    }

    let targetFile = file;

    if (!targetFile) {
      const dateTrigger = (stateManager.getSetting('date-trigger') as string) ?? '@';
      const timeTrigger = (stateManager.getSetting('time-trigger') as string) ?? '@@';
      const escapedTime = timeTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedDate = dateTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const timeTriggerRe = new RegExp(escapedTime + '\\{[^}]*\\}', 'g');
      const dateTriggerRe = new RegExp(escapedDate + '\\{[^}]*\\}', 'g');

      const raw = item.data.titleRaw;

      // Collect the parts that need to stay outside the wikilink
      const timeMatches = raw.match(timeTriggerRe) ?? [];
      const dateMatches = raw.match(dateTriggerRe) ?? [];
      // Remove time matches before date matches to avoid double-stripping (@@  contains @)
      const preservedSuffix = [...timeMatches, ...dateMatches].join(' ');

      const noteName = raw
        .replace(timeTriggerRe, '')
        .replace(dateTriggerRe, '')
        .replace(/!?\[\[.*?\]\]/g, '')
        .replace(/\[kanban-done::[^\]]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const sanitized = (noteName || 'Untitled').replace(/[\\/:*?"<>|]/g, '').trim();

      const newNoteFolder = stateManager.getSetting('new-note-folder') as string | undefined;
      const folder: TFolder = newNoteFolder
        ? (app.vault.getAbstractFileByPath(newNoteFolder) as TFolder)
        : (app.fileManager as any).getNewFileParent(stateManager.file.path);

      const newFile = (await (app.fileManager as any).createNewMarkdownFile(
        folder,
        sanitized
      )) as TFile;

      targetFile = newFile;

      const link = (app.fileManager as any).generateMarkdownLink(newFile, stateManager.file.path);
      const newTitleRaw = preservedSuffix ? `${link} ${preservedSuffix}` : link;
      boardModifiers.updateItem(path, stateManager.updateItemContent(item, newTitleRaw));
    }

    await addSubtaskToFile(app, targetFile, text);
    setInputValue('');
    onAddComplete();
  }, [inputValue, file, item, app, stateManager, boardModifiers, path, onAddComplete]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Escape') {
        setInputValue('');
        onAddComplete();
      }
    },
    [handleSubmit, onAddComplete]
  );

  if (!subtasks.length && !showAddInput) return null;

  return (
    <div className={c('item-subtasks')}>
      {subtasks.map((subtask, i) => (
        <div key={i} className={c('item-subtask')}>
          <label className={c('item-subtask-label')}>
            <input
              type="checkbox"
              className="task-list-item-checkbox"
              checked={subtask.checked}
              onChange={() => handleToggle(subtask)}
            />
            <span
              className={
                subtask.checked ? c('item-subtask-text--done') : c('item-subtask-text')
              }
            >
              {subtask.text}
            </span>
          </label>
          <TrashButton onClick={() => handleDelete(subtask)} />
        </div>
      ))}
      {showAddInput && (
        <div className={c('item-subtask-input-wrapper')}>
          <input
            ref={inputRef}
            type="text"
            className={c('item-subtask-input')}
            placeholder="New subtask…"
            value={inputValue}
            onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!inputValue.trim()) {
                setInputValue('');
                onAddComplete();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
