import { App, Modal, Setting } from 'obsidian';
import { t } from 'src/lang/helpers';

export class TagsModal extends Modal {
  private tags: string[];
  private readonly onSubmit: (tags: string[]) => void;
  private listEl: HTMLElement;

  constructor(app: App, initialTags: string[], onSubmit: (tags: string[]) => void) {
    super(app);
    this.tags = [...initialTags];
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
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(t('Save'))
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.tags.map((t) => t.trim()).filter(Boolean));
          })
      )
      .addButton((btn) =>
        btn.setButtonText(t('Cancel')).onClick(() => this.close())
      );

    contentEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.close();
        this.onSubmit(this.tags.map((t) => t.trim()).filter(Boolean));
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
      });

      const removeBtn = row.createEl('button', { text: '×' });
      removeBtn.style.cssText =
        'flex-shrink: 0; font-size: 1.2em; line-height: 1; padding: 0 6px; cursor: pointer;';
      removeBtn.addEventListener('click', () => {
        this.tags.splice(i, 1);
        this.renderList();
      });

      if (isNew) setTimeout(() => input.focus(), 50);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
