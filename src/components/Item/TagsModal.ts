import { App, Modal, Setting } from 'obsidian';
import { StateManager } from 'src/StateManager';
import { t } from 'src/lang/helpers';

export class TagsModal extends Modal {
  private tags: string[];
  private readonly boardTags: string[];
  private readonly onSubmit: (tags: string[]) => void;
  private listEl: HTMLElement;
  private suggestionsEl: HTMLElement;

  constructor(
    app: App,
    initialTags: string[],
    stateManager: StateManager,
    onSubmit: (tags: string[]) => void
  ) {
    super(app);
    this.tags = [...initialTags];
    this.boardTags = collectBoardTags(stateManager);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: t('Manage tags') });

    this.listEl = contentEl.createDiv();
    this.renderList();

    const addBtn = contentEl.createEl('button', { text: '+ ' + t('Add tag') });
    addBtn.style.cssText = 'margin: 10px 0 4px; display: block;';
    addBtn.addEventListener('click', () => {
      this.tags.push('');
      this.renderList();
      this.renderSuggestions();
    });

    this.suggestionsEl = contentEl.createDiv();
    this.renderSuggestions();

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(t('Save'))
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit([...new Set(this.tags.map((s) => s.trim()).filter(Boolean))]);
          })
      )
      .addButton((btn) =>
        btn.setButtonText(t('Cancel')).onClick(() => this.close())
      );

    contentEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.close();
        this.onSubmit([...new Set(this.tags.map((s) => s.trim()).filter(Boolean))]);
      }
    });

    if (this.tags.length === 0) addBtn.click();
  }

  private renderList() {
    this.listEl.empty();
    this.tags.forEach((tag, i) => {
      const isNew = !tag && i === this.tags.length - 1;

      const row = this.listEl.createDiv();
      row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 6px 0;';

      const input = row.createEl('input');
      input.type = 'text';
      input.value = tag;
      input.placeholder = t('tag name');
      input.style.cssText = 'flex: 1; min-width: 0;';
      input.addEventListener('input', () => {
        this.tags[i] = input.value;
        this.renderSuggestions();
      });

      const removeBtn = row.createEl('button', { text: '×' });
      removeBtn.style.cssText =
        'flex-shrink: 0; font-size: 1.2em; line-height: 1; padding: 0 6px; cursor: pointer;';
      removeBtn.addEventListener('click', () => {
        this.tags.splice(i, 1);
        this.renderList();
        this.renderSuggestions();
      });

      if (isNew) setTimeout(() => input.focus(), 50);
    });
  }

  private renderSuggestions() {
    this.suggestionsEl.empty();
    const currentTags = new Set(this.tags.map((s) => s.trim()).filter(Boolean));
    const available = this.boardTags.filter((t) => !currentTags.has(t));
    if (!available.length) return;

    this.suggestionsEl.style.cssText = 'margin: 12px 0 4px;';
    this.suggestionsEl.createEl('small', {
      text: t('Existing tags on this board'),
    }).style.cssText = 'color: var(--text-muted); display: block; margin-bottom: 6px;';

    const chipsRow = this.suggestionsEl.createDiv();
    chipsRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';

    for (const tag of available) {
      const chip = chipsRow.createEl('button', { text: tag });
      chip.style.cssText =
        'padding: 2px 10px; border-radius: 12px; font-size: 0.85em; cursor: pointer; ' +
        'background: var(--tag-background); color: var(--tag-color); border: 1px solid var(--background-modifier-border);';
      chip.addEventListener('click', () => {
        const current = this.tags.map((s) => s.trim());
        if (!current.includes(tag)) {
          this.tags.push(tag);
          this.renderList();
          this.renderSuggestions();
        }
      });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

function collectBoardTags(stateManager: StateManager): string[] {
  const seen = new Set<string>();
  for (const lane of stateManager.state.children) {
    for (const item of lane.children) {
      for (const tag of item.data.metadata.kanbanTags ?? []) {
        seen.add(tag);
      }
    }
  }
  return Array.from(seen).sort();
}
