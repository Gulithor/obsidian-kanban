import { TFile, TFolder } from 'obsidian';
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks';

import { Icon } from '../Icon/Icon';
import { StateManager } from 'src/StateManager';
import { useNestedEntityPath } from 'src/dnd/components/Droppable';
import { t } from 'src/lang/helpers';

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

function parseDescription(content: string): string {
  const lines = content.split('\n');
  let inSection = false;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s+Description\s*$/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,6}\s/.test(line)) break;
    if (inSection) result.push(line);
  }

  return result.join('\n').trim();
}

async function saveDescriptionToFile(app: any, file: TFile, newDesc: string) {
  let content = await app.vault.read(file);
  const hasSection = /^#{1,6}\s+Description\s*$/im.test(content);

  if (hasSection) {
    const lines = content.split('\n');
    let start = -1;
    let end = -1;
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s+Description\s*$/i.test(lines[i])) {
        start = i + 1;
        inSection = true;
        continue;
      }
      if (inSection && /^#{1,6}\s/.test(lines[i])) {
        end = i;
        break;
      }
    }
    if (end === -1) end = lines.length;

    const replacement = newDesc ? ['', newDesc, ''] : [''];
    lines.splice(start, end - start, ...replacement);
    content = lines.join('\n');
  } else {
    if (/^#{1,6}\s+Subtasks\s*$/im.test(content)) {
      content = content.replace(
        /^(#{1,6}\s+Subtasks\s*$)/im,
        `## Description\n\n${newDesc}\n\n$1`
      );
    } else {
      content = `## Description\n\n${newDesc}\n\n` + content.trimStart();
    }
  }

  await app.vault.modify(file, content);
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
  showAddDescription: boolean;
  onAddDescriptionComplete: () => void;
}

export function SubtaskList({
  item,
  stateManager,
  showAddInput,
  onAddComplete,
  showAddDescription,
  onAddDescriptionComplete,
}: SubtaskListProps) {
  const { boardModifiers } = useContext(KanbanContext);
  const path = useNestedEntityPath();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [description, setDescription] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descEditValue, setDescEditValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descCancelRef = useRef(false);
  const pendingDescEdit = useRef(false);
  const app = stateManager.app as any;

  const file = item.data.metadata.file;

  useEffect(() => {
    if (!file) {
      setSubtasks([]);
      setDescription('');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const content = await app.vault.read(file);
        if (!cancelled) {
          setSubtasks(parseSubtasks(content));
          setDescription(parseDescription(content));
        }
      } catch {
        if (!cancelled) {
          setSubtasks([]);
          setDescription('');
        }
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

  // When file becomes available and description edit was pending (after file creation)
  useEffect(() => {
    if (file && pendingDescEdit.current) {
      pendingDescEdit.current = false;
      setDescEditValue('');
      setIsEditingDesc(true);
    }
  }, [file]);

  useEffect(() => {
    if (!showAddDescription) return;
    if (file) {
      setDescEditValue(description);
      setIsEditingDesc(true);
      onAddDescriptionComplete();
    } else {
      pendingDescEdit.current = true;
      createFileForItem().then(() => {
        onAddDescriptionComplete();
      });
    }
  }, [showAddDescription]);

  useEffect(() => {
    if (isEditingDesc) {
      setTimeout(() => descTextareaRef.current?.focus(), 50);
    }
  }, [isEditingDesc]);

  useEffect(() => {
    if (showAddInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showAddInput]);

  const createFileForItem = useCallback(async (): Promise<TFile | null> => {
    const dateTrigger = (stateManager.getSetting('date-trigger') as string) ?? '@';
    const timeTrigger = (stateManager.getSetting('time-trigger') as string) ?? '@@';
    const escapedTime = timeTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedDate = dateTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const timeTriggerRe = new RegExp(escapedTime + '\\{[^}]*\\}', 'g');
    const dateTriggerRe = new RegExp(escapedDate + '\\{[^}]*\\}', 'g');

    const raw = item.data.titleRaw;
    const timeMatches = raw.match(timeTriggerRe) ?? [];
    const dateMatches = raw.match(dateTriggerRe) ?? [];
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

    const link = (app.fileManager as any).generateMarkdownLink(newFile, stateManager.file.path);
    const newTitleRaw = preservedSuffix ? `${link} ${preservedSuffix}` : link;
    boardModifiers.updateItem(path, stateManager.updateItemContent(item, newTitleRaw));

    return newFile;
  }, [item, app, stateManager, boardModifiers, path]);

  const handleDescSave = useCallback(async () => {
    if (!file) {
      setIsEditingDesc(false);
      return;
    }
    await saveDescriptionToFile(app, file, descEditValue.trim());
    setIsEditingDesc(false);
  }, [file, app, descEditValue]);

  const handleDescBlur = useCallback(() => {
    if (descCancelRef.current) {
      descCancelRef.current = false;
      return;
    }
    handleDescSave();
  }, [handleDescSave]);

  const handleDescKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        descCancelRef.current = true;
        setIsEditingDesc(false);
        setDescEditValue(description);
        onAddDescriptionComplete();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleDescSave();
      }
    },
    [handleDescSave, description, onAddDescriptionComplete]
  );

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
      targetFile = await createFileForItem();
    }

    await addSubtaskToFile(app, targetFile, text);
    setInputValue('');
    onAddComplete();
  }, [inputValue, file, item, app, stateManager, boardModifiers, path, onAddComplete, createFileForItem]);

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

  const hasSubtaskContent = subtasks.length > 0 || showAddInput;

  if (!file && !subtasks.length && !showAddInput && !showAddDescription) return null;

  return (
    <div className={c('item-subtasks')}>
      {file && (
        <div
          className={c('item-description')}
          onClick={
            !isEditingDesc
              ? () => {
                  setDescEditValue(description);
                  setIsEditingDesc(true);
                }
              : undefined
          }
        >
          {isEditingDesc ? (
            <textarea
              ref={descTextareaRef}
              className={c('item-description-edit')}
              value={descEditValue}
              onInput={(e) => setDescEditValue((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleDescKeyDown}
              onBlur={handleDescBlur}
              rows={2}
              placeholder={t('Add a description…')}
            />
          ) : (
            <span
              className={
                description ? c('item-description-text') : c('item-description-placeholder')
              }
            >
              {description || t('Add a description…')}
            </span>
          )}
        </div>
      )}
      {hasSubtaskContent && (
        <>
          <div className={c('item-subtasks-header')}>{t('Subtasks')}</div>
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
        </>
      )}
    </div>
  );
}
